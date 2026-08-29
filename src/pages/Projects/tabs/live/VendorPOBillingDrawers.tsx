import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Select as MuiSelect,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button as MuiButton,
} from '@mui/material'
import { Upload } from '@mui/icons-material'
import { PODocumentLinkField } from '@/components/documents/PODocumentLinkField'
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import { Button, Checkbox, DatePicker, dateFromIso, isoFromDate, StatusBadge, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { uploadProjectDocumentFile } from '@/api/uploadFileApi'
import { dropdownsApi } from '@/api/dropdownsApi'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import {
  createVendorPO,
  deleteVendorPO,
  fetchVendorPOs,
  updateVendorPO,
} from '../../../../slices/baseline/thunk'
import { fetchVendorInvoices } from '../../../../slices/live/thunk'
import type { VendorInvoice } from '../../../../slices/live/types'
import { fetchVendors } from '../../../../slices/vendors/thunk'
import type { Baseline, VendorPO } from '../../../../slices/baseline/reducer'
import { formatFullAddress } from '../../../workspace/recordDetailTabUtils'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import type { VendorOption } from './vendorPOHelpers'
import {
  canDeleteVendorPO,
  effectiveExecutedValue,
  mergeVendorPOUpdate,
  recalculateVendorPOMilestonesForExecutedValue,
  vendorPOHasBilledMilestone,
} from './poExecutedValueRules'
import {
  findVendorInvoicesForMilestone,
  vendorMilestonePaymentStatus,
  type MilestonePaymentStatusLabel,
} from './milestonePaymentStatus'
import {
  vendorMilestoneBillingPhase,
  vendorMilestoneBillingStatusBadge,
  vendorMilestonePaymentPhase,
  vendorMilestonePaymentStatusBadge,
} from './vendorMilestoneBillingStatus'
import { validateVendorMilestonePercents } from '@/utils/vendorMilestones'
import {
  resolveVendorPOMilestoneKind,
  vendorPOCategoryLabel,
  vendorPOLinkedServiceLabel,
  buildVendorServiceNameCatalog,
  type VendorMasterCatalogLabels,
  type VendorServiceNameCatalogEntry,
} from './vendorPOHelpers'
import { dropdownCategoryOptions, dropdownServiceOptions } from './clientPOServiceOptions'
import {
  VendorOfferMilestoneCardEditor,
  VendorOfferRetentionCardEditor,
  type VendorOfferMilestoneCard,
  type VendorOfferRetentionCard,
} from './VendorOfferMilestoneCards'
import {
  vendorPOCardsFromMilestones,
  flattenVendorPOCardsForEditor,
  mergeExecutedValueIntoVendorPOCards,
} from './vendorPOCardHydration'
import {
  VendorPOMilestoneEditor,
  buildVendorPOMilestonePayload,
  buildVendorPOMilestonePayloadForUpdate,
  type VendorPOMilestoneRow,
  type VendorPORetentionRow,
} from './VendorPOMilestoneEditor'
import { applyVendorEditorExecutedValue } from './applyVendorEditorExecutedValue'

const PO_VENDOR_SUMMARY_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: tokens.borderRadius.lg,
  bgcolor: tokens.color.neutral[50],
  p: 1.5,
  mb: 1.5,
} as const

const PO_SECTION_TITLE_SX = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
}

const MILESTONE_TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  py: 1,
  px: 1.5,
} as const

const MILESTONE_TABLE_CELL_SX = {
  fontSize: 12,
  py: 1,
  px: 1.5,
  boxSizing: 'border-box' as const,
} as const

const VENDOR_PO_MILESTONE_COL_COUNT = 5
const VENDOR_PO_MILESTONE_COL_WIDTH = `${100 / VENDOR_PO_MILESTONE_COL_COUNT}%`

const MILESTONE_STATUS_HEADER_SX = {
  ...MILESTONE_TABLE_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const MILESTONE_STATUS_CELL_SX = {
  ...MILESTONE_TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

function VendorMilestoneStatusBadges({
  milestoneInvoices,
  milestoneId,
  milestoneName,
  serviceId,
}: {
  milestoneInvoices: VendorInvoice[]
  milestoneId: string
  milestoneName: string
  serviceId: string
}) {
  const covering = findVendorInvoicesForMilestone(
    milestoneInvoices,
    milestoneId,
    serviceId,
    milestoneName,
  )
  const billingPhase = vendorMilestoneBillingPhase(covering)
  const paymentPhase = vendorMilestonePaymentPhase(covering)
  const billingBadge = vendorMilestoneBillingStatusBadge(billingPhase)
  const paymentBadge = vendorMilestonePaymentStatusBadge(paymentPhase)

  return (
    <Stack direction="column" gap={0.5} alignItems="center">
      <StatusBadge status={billingBadge.type} label={billingBadge.label} size="small" />
      <StatusBadge status={paymentBadge.type} label={paymentBadge.label} size="small" />
    </Stack>
  )
}

function VendorPOMilestoneDetailTable({
  milestones,
  serviceLabel,
  projectVendorInvoices,
  serviceId,
}: {
  milestones: VendorPO['milestones']
  serviceLabel: string
  projectVendorInvoices: VendorInvoice[]
  serviceId: string
}) {
  if (milestones.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, textAlign: 'center' }}>
        No entries recorded.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          {Array.from({ length: VENDOR_PO_MILESTONE_COL_COUNT }, (_, index) => (
            <col key={index} style={{ width: VENDOR_PO_MILESTONE_COL_WIDTH }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
            <TableCell sx={MILESTONE_TABLE_HEADER_SX}>Service</TableCell>
            <TableCell sx={MILESTONE_TABLE_HEADER_SX}>Milestone Name</TableCell>
            <TableCell align="right" sx={MILESTONE_TABLE_HEADER_SX}>
              Percentage (%)
            </TableCell>
            <TableCell sx={MILESTONE_STATUS_HEADER_SX}>Status</TableCell>
            <TableCell align="right" sx={MILESTONE_TABLE_HEADER_SX}>
              Value (₹)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {milestones.map((m) => (
            <TableRow key={m.id} hover>
              <TableCell sx={MILESTONE_TABLE_CELL_SX}>
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {serviceLabel}
                </Typography>
              </TableCell>
              <TableCell sx={MILESTONE_TABLE_CELL_SX}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                  {m.name || '—'}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={MILESTONE_TABLE_CELL_SX}>
                {m.percentage}%
              </TableCell>
              <TableCell sx={MILESTONE_STATUS_CELL_SX}>
                <VendorMilestoneStatusBadges
                  milestoneInvoices={projectVendorInvoices}
                  milestoneId={m.id}
                  milestoneName={m.name || '—'}
                  serviceId={serviceId}
                />
              </TableCell>
              <TableCell align="right" sx={{ ...MILESTONE_TABLE_CELL_SX, fontWeight: 600 }}>
                ₹{formatCurrency(m.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function VendorPOMilestonesReadOnlySections({
  milestones,
  serviceLabel,
  projectVendorInvoices,
  serviceId,
}: {
  milestones: VendorPO['milestones']
  serviceLabel: string
  projectVendorInvoices: VendorInvoice[]
  serviceId: string
}) {
  const regularMilestones = milestones.filter(
    (m) => resolveVendorPOMilestoneKind(m) === 'regular',
  )
  const retentionMilestones = milestones.filter(
    (m) => resolveVendorPOMilestoneKind(m) === 'retention',
  )

  if (milestones.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, textAlign: 'center' }}>
        No milestones recorded for this PO.
      </Typography>
    )
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          component="span"
          variant="overline"
          sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
        >
          Milestones
        </Typography>
        <VendorPOMilestoneDetailTable
          milestones={regularMilestones}
          serviceLabel={serviceLabel}
          projectVendorInvoices={projectVendorInvoices}
          serviceId={serviceId}
        />
      </Box>
      {retentionMilestones.length > 0 ? (
        <Box>
          <Typography
            component="span"
            variant="overline"
            sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
          >
            Retention
          </Typography>
          <VendorPOMilestoneDetailTable
            milestones={retentionMilestones}
            serviceLabel={serviceLabel}
            projectVendorInvoices={projectVendorInvoices}
            serviceId={serviceId}
          />
        </Box>
      ) : null}
    </Stack>
  )
}

function ReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontSize: 13,
          fontWeight: 500,
          mt: 0.25,
          ...(multiline ? { whiteSpace: 'pre-wrap' as const } : {}),
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

interface AddVendorPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  vendors: VendorOption[]
  initialVendorId?: string
  initialServiceId?: string
  /** All service ids for this offer (pitch + baseline) — stored on the PO for reliable matching. */
  linkedServiceIds?: string[]
  linkedVendorMappingId?: string
  /** Pre-filled from vendor offer row — shown read-only above PO fields. */
  initialVendorName?: string
  initialCategoryName?: string
  initialServiceName?: string
  /** Vendor offer amount — pre-fills PO value when adding from an offer row. */
  initialPoValue?: number
}

export function AddVendorPODrawer({
  open,
  onClose,
  projectId,
  vendors,
  initialVendorId,
  initialServiceId,
  linkedServiceIds,
  linkedVendorMappingId,
  initialVendorName,
  initialCategoryName,
  initialServiceName,
  initialPoValue,
}: AddVendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const toast = useToast((s) => s.showToast)
  const offerLinkRef = useRef<{
    serviceIds: string[]
    vendorMappingId?: string
  } | null>(null)
  const [form, setForm] = useState({
    vendorId: '',
    poDate: '',
    poValue: '',
    executedValue: '',
    file: null as File | null,
    insurance: false,
    contractSigned: false,
    requiredDocumentsSubmitted: false,
  })
  const [milestones, setMilestones] = useState<VendorPOMilestoneRow[]>([])
  const [retention, setRetention] = useState<VendorPORetentionRow | null>(null)

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendors({ pageSize: 100, status: 'Active' }))
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!open) {
      setForm({
        vendorId: '',
        poDate: '',
        poValue: '',
        executedValue: '',
        file: null,
        insurance: false,
        contractSigned: false,
        requiredDocumentsSubmitted: false,
      })
      setMilestones([])
      setRetention(null)
      offerLinkRef.current = null
      return
    }
    const serviceIds =
      linkedServiceIds?.length
        ? linkedServiceIds
        : initialServiceId
          ? [initialServiceId]
          : []
    if (serviceIds.length > 0 || linkedVendorMappingId) {
      offerLinkRef.current = {
        serviceIds,
        vendorMappingId: linkedVendorMappingId,
      }
    }
    if (initialVendorId) {
      setForm((prev) => ({ ...prev, vendorId: initialVendorId }))
    }
    if (initialPoValue && initialPoValue > 0) {
      setForm((prev) => ({
        ...prev,
        poValue: String(initialPoValue),
        executedValue: String(initialPoValue),
      }))
    }
  }, [
    open,
    initialVendorId,
    initialServiceId,
    initialPoValue,
    linkedServiceIds,
    linkedVendorMappingId,
  ])

  const poValueNumber = Number(form.poValue) || 0
  const executedValueNumber = Number(form.executedValue) || poValueNumber
  const milestoneBaseValue = executedValueNumber
  const selectedVendor = vendors.find((v) => v.vendorId === form.vendorId)
  const fromOfferRow = Boolean(initialVendorId && initialServiceId)

  useEffect(() => {
    if (milestoneBaseValue <= 0) return
    setMilestones((prev) => {
      let changed = false
      const next = prev.map((m) => {
        const value = Math.round((m.percentage / 100) * milestoneBaseValue)
        if (m.value === value) return m
        changed = true
        return { ...m, value }
      })
      return changed ? next : prev
    })
    setRetention((prev) => {
      if (!prev) return prev
      const amount = Math.round((prev.percentage / 100) * milestoneBaseValue)
      if (prev.amount === amount) return prev
      return { ...prev, amount }
    })
  }, [milestoneBaseValue])

  const vendorRecord = useMemo(
    () => vendorItems.find((v) => v.id === (initialVendorId ?? form.vendorId)),
    [vendorItems, initialVendorId, form.vendorId],
  )

  const vendorAddress = useMemo(() => {
    if (!vendorRecord) return '—'
    const formatted = formatFullAddress(
      vendorRecord.address,
      vendorRecord.city,
      vendorRecord.state,
      vendorRecord.pincode,
    )
    return formatted || '—'
  }, [vendorRecord])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePoValueChange(value: string) {
    setForm((prev) => {
      const oldPo = Number(prev.poValue) || 0
      const oldExec = prev.executedValue ? Number(prev.executedValue) : oldPo
      const syncExec = !prev.executedValue || oldExec === oldPo
      return {
        ...prev,
        poValue: value,
        executedValue: syncExec ? value : prev.executedValue,
      }
    })
  }

  function generatePoNumber(): string {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `PO-VND-${stamp}-${String(Date.now()).slice(-4)}`
  }

  async function handleSubmit() {
    if (!form.vendorId || !form.poDate || !form.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    const vendor = vendors.find((v) => v.vendorId === form.vendorId)
    let documentUrl: string | null = null
    let fileName: string | null = null
    if (form.file) {
      try {
        const uploaded = await uploadProjectDocumentFile(form.file)
        documentUrl = uploaded.viewUrl
        fileName = uploaded.originalName || form.file.name
      } catch (err) {
        const parsed = parseSettingsApiError(err, 'Failed to upload PO document')
        toast({ title: parsed.message, variant: 'error' })
        return
      }
    }
    const milestonePayload = buildVendorPOMilestonePayload(milestones, retention)
    const pctValidation = validateVendorMilestonePercents({
      id: '',
      vendorId: form.vendorId,
      vendorName: '',
      value: poValueNumber,
      percentage: 0,
      isMeasurable: false,
      milestones: milestones.filter((m) => m.name.trim()).map((m) => ({
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        value: m.value,
      })),
      retention: retention
        ? { percentage: retention.percentage, amount: retention.amount }
        : undefined,
    })
    if (!pctValidation.valid) {
      toast({
        title: pctValidation.pctMessage ?? pctValidation.structureMessage ?? 'Percentages must not exceed 100%',
        variant: 'error',
      })
      return
    }
    const link = offerLinkRef.current
    const linkedIds = link?.serviceIds?.length ? link.serviceIds : undefined
    try {
      await dispatch(
        createVendorPO({
          projectId,
          data: {
            vendorId: form.vendorId,
            vendorName: vendor?.vendorName ?? '',
            poNumber: generatePoNumber(),
            poDate: form.poDate,
            poValue: poValueNumber,
            executedValue: executedValueNumber,
            milestones: milestonePayload,
            linkedBaselineServiceIds: linkedIds,
            linkedVendorMappingId: link?.vendorMappingId,
            status: 'Draft',
            documentUrl,
            fileName,
            insurance: form.insurance,
            contractSigned: form.contractSigned,
            requiredDocumentsSubmitted: form.requiredDocumentsSubmitted,
          },
        }),
      ).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({ title: 'Vendor PO saved successfully', variant: 'success' })
      onClose()
    } catch (err) {
      const parsed = parseSettingsApiError(err, 'Failed to save vendor PO')
      toast({ title: parsed.message, variant: 'error' })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Vendor PO"
      subtitle="Record vendor purchase order details"
      onSubmit={handleSubmit}
      submitLoading={saving}
      submitLabel="Save PO"
    >
      <Box sx={{ mb: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: form.file ? 0.5 : 1.5 }}
        >
          <Typography component="span" variant="overline" sx={PO_SECTION_TITLE_SX}>
            PO Details
          </Typography>
          <MuiButton
            variant="outlined"
            component="label"
            size="small"
            startIcon={<Upload />}
            sx={{ fontSize: 12 }}
          >
            Upload PO Document
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx"
              onChange={(e) => setField('file', e.target.files?.[0] ?? null)}
            />
          </MuiButton>
        </Stack>
        {form.file ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1.5, textAlign: 'right', fontSize: 11 }}
          >
            {form.file.name}
          </Typography>
        ) : null}
        {fromOfferRow ? (
          <>
            <Box sx={PO_VENDOR_SUMMARY_SX}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                }}
              >
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <ReadOnlyField
                    label="Vendor Name"
                    value={initialVendorName ?? selectedVendor?.vendorName ?? '—'}
                  />
                </Box>
                <ReadOnlyField label="Category" value={initialCategoryName ?? '—'} />
                <ReadOnlyField label="Service" value={initialServiceName ?? '—'} />
                <ReadOnlyField label="Billing Address" value={vendorAddress} multiline />
              </Box>
            </Box>
            <Stack
              direction="row"
              flexWrap="wrap"
              alignItems="center"
              sx={{ mb: 0, columnGap: 1, rowGap: 0.5 }}
            >
              <Checkbox
                size="sm"
                label="Insurance"
                checked={form.insurance}
                onChange={(checked) => setField('insurance', checked)}
                sx={{ mr: 2 }}
              />
              <Checkbox
                size="sm"
                label="Contract Signed"
                checked={form.contractSigned}
                onChange={(checked) => setField('contractSigned', checked)}
              />
              <Checkbox
                size="sm"
                label="Required Documents Submitted"
                checked={form.requiredDocumentsSubmitted}
                onChange={(checked) => setField('requiredDocumentsSubmitted', checked)}
              />
            </Stack>
            <Divider sx={{ my: 1.5 }} />
          </>
        ) : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1.5,
          }}
        >
          {!fromOfferRow ? (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <FormField label="Vendor" required>
                <MuiSelect
                  value={form.vendorId}
                  onChange={(e) => setField('vendorId', e.target.value)}
                  size="small"
                  fullWidth
                  displayEmpty
                  sx={{ fontSize: 12 }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: 12 }}>
                    Select vendor…
                  </MenuItem>
                  {vendors.map((v) => (
                    <MenuItem key={v.vendorId} value={v.vendorId} sx={{ fontSize: 12 }}>
                      {v.vendorName}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </FormField>
            </Box>
          ) : null}
          <FormField label="PO Date" required>
            <DatePicker
              value={dateFromIso(form.poDate)}
              onChange={(d) => setField('poDate', isoFromDate(d))}
              fullWidth
              size="sm"
            />
          </FormField>
          <FormField
            label="PO Value (₹)"
            required
            hint={
              selectedVendor
                ? `Allocated: ₹${formatCurrency(selectedVendor.allocatedValue)}`
                : undefined
            }
          >
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.poValue}
              onChange={(e) => handlePoValueChange(e.target.value)}
              placeholder="0"
            />
          </FormField>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormField label="Executed Value (₹)">
              <TextField
                fullWidth
                size="small"
                type="number"
                value={form.executedValue}
                onChange={(e) => setField('executedValue', e.target.value)}
                placeholder="0"
              />
            </FormField>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <VendorPOMilestoneEditor
        poValue={milestoneBaseValue}
        milestones={milestones}
        retention={retention}
        onMilestonesChange={setMilestones}
        onRetentionChange={setRetention}
      />
    </DrawerForm>
  )
}

interface VendorPODrawerBaseProps {
  open: boolean
  onClose: () => void
  projectId: string
  po: VendorPO | null
  baseline?: Baseline | null
}

function useVendorPODetail(
  open: boolean,
  projectId: string,
  poSeed: VendorPO | null,
  baseline: Baseline | null,
) {
  const dispatch = useAppDispatch()
  const { vendorPOs } = useAppSelector((s) => s.baseline)
  const { vendorInvoices } = useAppSelector((s) => s.live)
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const [masterCatalog, setMasterCatalog] = useState<VendorMasterCatalogLabels>({
    categories: [],
    services: [],
  })

  const resolvedPo = useMemo(
    () => (poSeed ? vendorPOs.find((p) => p.id === poSeed.id) ?? poSeed : null),
    [poSeed, vendorPOs],
  )

  const projectVendorInvoices = useMemo(() => {
    const forProject = vendorInvoices.filter((i) => i.projectId === projectId)
    if (!resolvedPo?.vendorId) return forProject
    return forProject.filter((i) => i.vendorId === resolvedPo.vendorId)
  }, [vendorInvoices, projectId, resolvedPo?.vendorId])

  const serviceNameCatalog = useMemo((): VendorServiceNameCatalogEntry[] => {
    return buildVendorServiceNameCatalog(
      masterCatalog.services.map((s) => ({ id: s.value, name: s.label })),
      baseline,
    )
  }, [masterCatalog.services, baseline])

  const serviceLabel = useMemo(
    () =>
      resolvedPo
        ? vendorPOLinkedServiceLabel(resolvedPo, baseline, serviceNameCatalog)
        : '—',
    [resolvedPo, baseline, serviceNameCatalog],
  )

  const categoryLabel = useMemo(
    () => (resolvedPo ? vendorPOCategoryLabel(resolvedPo, baseline, masterCatalog) : '—'),
    [resolvedPo, baseline, masterCatalog],
  )

  const vendorRecord = useMemo(
    () => (resolvedPo ? vendorItems.find((v) => v.id === resolvedPo.vendorId) : undefined),
    [resolvedPo, vendorItems],
  )

  const vendorAddress = useMemo(() => {
    if (!vendorRecord) return '—'
    const formatted = formatFullAddress(
      vendorRecord.address,
      vendorRecord.city,
      vendorRecord.state,
      vendorRecord.pincode,
    )
    return formatted || '—'
  }, [vendorRecord])

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendorInvoices(projectId))
      void dispatch(fetchVendors({ pageSize: 100, status: 'Active' }))
    }
  }, [open, projectId, dispatch])

  useEffect(() => {
    if (!open) {
      setMasterCatalog({ categories: [], services: [] })
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [categories, services] = await Promise.all([
          dropdownsApi.getCategories(),
          dropdownsApi.getServices(),
        ])
        if (cancelled) return
        setMasterCatalog({ categories, services })
      } catch {
        if (!cancelled) setMasterCatalog({ categories: [], services: [] })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  return {
    resolvedPo,
    projectVendorInvoices,
    serviceLabel,
    categoryLabel,
    vendorAddress,
    masterCatalog,
  }
}

export function ViewVendorPODrawer({
  open,
  onClose,
  projectId,
  po,
  baseline = null,
}: VendorPODrawerBaseProps) {
  const toast = useToast((s) => s.showToast)
  const {
    resolvedPo,
    projectVendorInvoices,
    serviceLabel,
    categoryLabel,
    vendorAddress,
  } = useVendorPODetail(open, projectId, po, baseline)

  function handlePoDocumentOpenFailed() {
    toast({
      title: 'Unable to open document',
      description: 'The PO file is no longer available in this session.',
      variant: 'error',
    })
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={resolvedPo?.poNumber ?? 'Vendor PO'}
      subtitle="Vendor purchase order details"
    >
      {resolvedPo ? (
        <Stack spacing={2.5}>
          <Box>
            <Typography
              component="span"
              variant="overline"
              sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
            >
              PO Details
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
              }}
            >
              <ReadOnlyField label="PO Number" value={resolvedPo.poNumber} />
              <ReadOnlyField label="PO Date" value={formatDate(resolvedPo.poDate)} />
              <Box sx={{ gridColumn: '1 / -1' }}>
                <ReadOnlyField label="PO Value" value={`₹${formatCurrency(resolvedPo.poValue)}`} />
              </Box>
              <ReadOnlyField
                label="Executed Value"
                value={`₹${formatCurrency(effectiveExecutedValue(resolvedPo))}`}
              />
              <PODocumentLinkField
                fileName={resolvedPo.fileName}
                documentUrl={resolvedPo.documentUrl}
                onOpenFailed={handlePoDocumentOpenFailed}
                emptyLabel="No document uploaded"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 0.5 }} />
          <Box>
            <Typography
              component="span"
              variant="overline"
              sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
            >
              Vendor Information
            </Typography>
            <Box sx={PO_VENDOR_SUMMARY_SX}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                }}
              >
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <ReadOnlyField label="Vendor Name" value={resolvedPo.vendorName} />
                </Box>
                <ReadOnlyField label="Category" value={categoryLabel} />
                <ReadOnlyField label="Service" value={serviceLabel} />
                <ReadOnlyField label="Billing Address" value={vendorAddress} multiline />
              </Box>
            </Box>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <VendorPOMilestonesReadOnlySections
            milestones={resolvedPo.milestones}
            serviceLabel={serviceLabel}
            projectVendorInvoices={projectVendorInvoices}
            serviceId={resolvedPo.linkedBaselineServiceIds?.[0]?.trim() || ''}
          />
        </Stack>
      ) : null}
    </DrawerForm>
  )
}

export function EditVendorPODrawer({
  open,
  onClose,
  projectId,
  po,
  baseline = null,
}: VendorPODrawerBaseProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const toast = useToast((s) => s.showToast)
  const {
    resolvedPo,
    projectVendorInvoices,
    serviceLabel,
    categoryLabel,
    vendorAddress,
    masterCatalog,
  } = useVendorPODetail(open, projectId, po, baseline)

  const [poNumber, setPoNumber] = useState('')
  const [poDate, setPoDate] = useState('')
  const [poValue, setPoValue] = useState('')
  const [executedValue, setExecutedValue] = useState('')
  const [milestoneCards, setMilestoneCards] = useState<VendorOfferMilestoneCard[]>([])
  const [retentionCards, setRetentionCards] = useState<VendorOfferRetentionCard[]>([])
  const [newFile, setNewFile] = useState<File | null>(null)

  const categoryOptions = useMemo(
    () => dropdownCategoryOptions(masterCatalog.categories),
    [masterCatalog.categories],
  )
  const serviceOptions = useMemo(
    () => dropdownServiceOptions(masterCatalog.services),
    [masterCatalog.services],
  )

  const serviceCatalog = useMemo(
    () => (baseline?.categories?.length ? { categories: baseline.categories } : null),
    [baseline],
  )

  const hasBilled = useMemo(
    () =>
      resolvedPo
        ? vendorPOHasBilledMilestone(resolvedPo.milestones ?? [], projectVendorInvoices)
        : false,
    [resolvedPo, projectVendorInvoices],
  )

  useEffect(() => {
    if (!open || !resolvedPo) return
    setPoNumber(resolvedPo.poNumber)
    setPoDate(resolvedPo.poDate)
    setPoValue(String(resolvedPo.poValue))
    setExecutedValue(String(effectiveExecutedValue(resolvedPo)))
    setNewFile(null)
  }, [open, resolvedPo?.id, resolvedPo])

  useEffect(() => {
    if (!open || !resolvedPo || categoryOptions.length === 0) return
    const { milestoneCards: nextMilestoneCards, retentionCards: nextRetentionCards } =
      vendorPOCardsFromMilestones(resolvedPo, categoryOptions, serviceOptions, serviceCatalog)
    setMilestoneCards(nextMilestoneCards)
    setRetentionCards(nextRetentionCards)
  }, [open, resolvedPo, categoryOptions, serviceOptions, serviceCatalog])

  const milestoneCardsRef = useRef(milestoneCards)
  const retentionCardsRef = useRef(retentionCards)
  milestoneCardsRef.current = milestoneCards
  retentionCardsRef.current = retentionCards

  const milestoneBaseValue = useMemo(() => {
    const n = Number(executedValue)
    return Number.isFinite(n) && n > 0 ? n : resolvedPo ? effectiveExecutedValue(resolvedPo) : 0
  }, [executedValue, resolvedPo])

  function handleExecutedValueChange(raw: string) {
    setExecutedValue(raw)
    if (!resolvedPo) return
    const ev = Number(raw)
    if (!Number.isFinite(ev) || ev <= 0) return
    const flat = flattenVendorPOCardsForEditor(
      milestoneCardsRef.current,
      retentionCardsRef.current,
    )
    const next = applyVendorEditorExecutedValue(
      flat.milestones,
      flat.retention,
      ev,
      projectVendorInvoices,
      resolvedPo.milestones,
    )
    const merged = mergeExecutedValueIntoVendorPOCards(
      milestoneCardsRef.current,
      retentionCardsRef.current,
      next,
    )
    setMilestoneCards(merged.milestoneCards)
    setRetentionCards(merged.retentionCards)
  }

  const milestoneStatuses = useMemo(() => {
    const statuses: Record<string, MilestonePaymentStatusLabel> = {}
    if (!resolvedPo) return statuses
    const serviceId = resolvedPo.linkedBaselineServiceIds?.[0]?.trim() || ''
    for (const m of resolvedPo.milestones) {
      const kind = m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
      if (kind === 'retention') continue
      statuses[m.id] = vendorMilestonePaymentStatus(
        projectVendorInvoices,
        m.id,
        serviceId,
        m.name,
      )
    }
    return statuses
  }, [resolvedPo, projectVendorInvoices])

  const retentionStatus = useMemo((): MilestonePaymentStatusLabel | undefined => {
    if (!resolvedPo) return undefined
    const serviceId = resolvedPo.linkedBaselineServiceIds?.[0]?.trim() || ''
    const retentionRow = resolvedPo.milestones.find(
      (m) => m.kind === 'retention' || m.name.trim().toLowerCase() === 'retention',
    )
    if (!retentionRow) return undefined
    return vendorMilestonePaymentStatus(
      projectVendorInvoices,
      retentionRow.id,
      serviceId,
      retentionRow.name,
    )
  }, [resolvedPo, projectVendorInvoices])

  async function handleSave() {
    if (!resolvedPo) return
    const poValueNum = Number(poValue)
    const executedValueNum = Number(executedValue)
    if (!poNumber.trim() || !poDate) {
      toast({ title: 'Enter valid PO number and date', variant: 'error' })
      return
    }
    if (!Number.isFinite(poValueNum) || poValueNum <= 0) {
      toast({ title: 'Enter a valid PO value', variant: 'error' })
      return
    }
    if (!Number.isFinite(executedValueNum) || executedValueNum <= 0) {
      toast({ title: 'Enter a valid executed value', variant: 'error' })
      return
    }

    const flat = flattenVendorPOCardsForEditor(milestoneCards, retentionCards)
    const pctValidation = validateVendorMilestonePercents({
      id: '',
      vendorId: resolvedPo.vendorId,
      vendorName: resolvedPo.vendorName,
      value: milestoneBaseValue,
      percentage: 0,
      isMeasurable: false,
      milestones: flat.milestones.filter((m) => m.name.trim()).map((m) => ({
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        value: m.value,
      })),
      retention: flat.retention
        ? { percentage: flat.retention.percentage, amount: flat.retention.amount }
        : undefined,
    })
    if (!pctValidation.valid) {
      toast({
        title: pctValidation.pctMessage ?? pctValidation.structureMessage ?? 'Percentages must not exceed 100%',
        variant: 'error',
      })
      return
    }

    const editorPayload = buildVendorPOMilestonePayloadForUpdate(
      flat.milestones,
      flat.retention,
      resolvedPo.milestones,
    )
    const nextMilestones = recalculateVendorPOMilestonesForExecutedValue(
      editorPayload,
      executedValueNum,
      projectVendorInvoices,
    )

    let documentUrl = resolvedPo.documentUrl
    let fileName = resolvedPo.fileName
    if (newFile) {
      try {
        const uploaded = await uploadProjectDocumentFile(newFile)
        documentUrl = uploaded.viewUrl
        fileName = uploaded.originalName || newFile.name
      } catch (err) {
        const parsed = parseSettingsApiError(err, 'Failed to upload PO document')
        toast({ title: parsed.message, variant: 'error' })
        return
      }
    }

    const body: Partial<VendorPO> = {
      poNumber: poNumber.trim(),
      poDate,
      poValue: hasBilled ? resolvedPo.poValue : poValueNum,
      executedValue: executedValueNum,
      milestones: nextMilestones,
      documentUrl,
      fileName,
    }

    const merged = mergeVendorPOUpdate(resolvedPo, body, { invoices: projectVendorInvoices })
    if (!merged.ok) {
      toast({ title: merged.message, variant: 'error' })
      return
    }

    try {
      await dispatch(
        updateVendorPO({ projectId, poId: resolvedPo.id, data: merged.po }),
      ).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({ title: 'Vendor PO updated', variant: 'success' })
      onClose()
    } catch (err) {
      toast({
        title: typeof err === 'string' ? err : 'Failed to update vendor PO',
        variant: 'error',
      })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={resolvedPo?.poNumber ? `Edit ${resolvedPo.poNumber}` : 'Edit Vendor PO'}
      subtitle={
        hasBilled
          ? 'Milestone structure is locked; Executed Value updates non-invoiced amounts only'
          : 'Update vendor purchase order details'
      }
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 2.5, py: 1.75, width: '100%' }}>
          <Button variant="text" size="sm" label="Cancel" onClick={onClose} />
          <Button
            size="sm"
            variant="contained"
            color="primary"
            label={saving ? 'Saving…' : 'Save'}
            onClick={() => void handleSave()}
            disabled={saving}
          />
        </Stack>
      }
    >
      {resolvedPo ? (
        <Stack spacing={2.5}>
          <Box sx={PO_VENDOR_SUMMARY_SX}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
              }}
            >
              <Box sx={{ gridColumn: '1 / -1' }}>
                <ReadOnlyField label="Vendor Name" value={resolvedPo.vendorName} />
              </Box>
              <ReadOnlyField label="Category" value={categoryLabel} />
              <ReadOnlyField label="Service" value={serviceLabel} />
              <ReadOnlyField label="Billing Address" value={vendorAddress} multiline />
            </Box>
          </Box>
          <Divider />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1.5,
            }}
          >
            <FormField label="PO Number" required>
              <TextField fullWidth size="small" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </FormField>
            <FormField label="PO Date" required>
              <DatePicker
                value={dateFromIso(poDate)}
                onChange={(d) => setPoDate(isoFromDate(d))}
                fullWidth
                size="sm"
              />
            </FormField>
            <FormField label="PO Value (₹)" required>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={poValue}
                onChange={(e) => setPoValue(e.target.value)}
                disabled={hasBilled}
              />
            </FormField>
            <FormField label="Executed Value (₹)" required>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={executedValue}
                onChange={(e) => handleExecutedValueChange(e.target.value)}
              />
            </FormField>
            <FormField label="PO Document">
              <MuiButton variant="outlined" component="label" size="small" startIcon={<Upload />} sx={{ fontSize: 12 }}>
                {newFile ? newFile.name : resolvedPo.fileName ? 'Replace document' : 'Upload document'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                />
              </MuiButton>
            </FormField>
          </Box>
          <Divider />
          <Typography
            variant="caption"
            sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}
          >
            MILESTONES
          </Typography>
          <Stack gap={1.5}>
            {milestoneCards.map((card) => (
              <VendorOfferMilestoneCardEditor
                key={card.id}
                card={card}
                categoryOptions={categoryOptions}
                serviceOptions={serviceOptions}
                milestoneBaseValue={milestoneBaseValue}
                structureLocked={hasBilled}
                milestoneStatuses={milestoneStatuses}
                retentionStatus={retentionStatus}
                onChange={(patch) =>
                  setMilestoneCards((prev) =>
                    prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
                  )
                }
                onRemove={() =>
                  setMilestoneCards((prev) => prev.filter((c) => c.id !== card.id))
                }
              />
            ))}
          </Stack>
          {retentionCards.length > 0 ? (
            <>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'text.secondary',
                  letterSpacing: 0.5,
                  display: 'block',
                  mt: 2,
                  mb: 1,
                }}
              >
                RETENTION
              </Typography>
              <Stack gap={1.5}>
                {retentionCards.map((card) => (
                  <VendorOfferRetentionCardEditor
                    key={card.id}
                    card={card}
                    categoryOptions={categoryOptions}
                    serviceOptions={serviceOptions}
                    milestoneBaseValue={milestoneBaseValue}
                    readOnly={hasBilled}
                    onChange={(patch) =>
                      setRetentionCards((prev) =>
                        prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
                      )
                    }
                    onRemove={() =>
                      setRetentionCards((prev) => prev.filter((c) => c.id !== card.id))
                    }
                  />
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      ) : null}
    </DrawerForm>
  )
}

export function DeleteVendorPODialog({
  open,
  po,
  projectId,
  onClose,
  onDeleted,
}: {
  open: boolean
  po: VendorPO | null
  projectId: string
  onClose: () => void
  onDeleted?: () => void
}) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const toast = useToast((s) => s.showToast)

  async function handleDelete() {
    if (!po) return
    try {
      await dispatch(deleteVendorPO({ projectId, poId: po.id })).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({ title: 'Vendor PO deleted', variant: 'success' })
      onDeleted?.()
      onClose()
    } catch {
      toast({ title: 'Failed to delete vendor PO', variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete vendor PO?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ fontSize: 13 }}>
          This will permanently remove {po?.poNumber}. This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose}>
          Cancel
        </MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          color="error"
          disabled={saving}
          onClick={() => void handleDelete()}
        >
          Delete
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

export { canDeleteVendorPO }
