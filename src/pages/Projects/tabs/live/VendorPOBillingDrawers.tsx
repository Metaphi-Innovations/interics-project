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
import {
  PODocumentLinkField,
  poDocumentOpenUrl,
} from '@/components/documents/PODocumentLinkField'
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import { READONLY_DISABLED_TEXTFIELD_SX } from './readOnlyFieldStyles'
import { Button, Checkbox, DatePicker, dateFromIso, isoFromDate, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { uploadProjectDocumentFile } from '@/api/uploadFileApi'
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
  buildVendorPOExecutedValueUpdatePayload,
  canUpdateExecutedValue,
  effectiveExecutedValue,
  recalculateVendorPOMilestonesForExecutedValue,
} from './poExecutedValueRules'
import {
  vendorMilestonePaymentStatus,
  type MilestonePaymentStatusLabel,
} from './milestonePaymentStatus'
import {
  resolveVendorPOMilestoneKind,
  vendorPOCategoryLabel,
  vendorPOLinkedServiceLabel,
} from './vendorPOHelpers'
import {
  VendorPOMilestoneEditor,
  buildVendorPOMilestonePayload,
  vendorPOMilestoneEditorStateFromPo,
  type VendorPOMilestoneRow,
  type VendorPORetentionRow,
} from './VendorPOMilestoneEditor'

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

function MilestoneStatusCell({ status }: { status: MilestonePaymentStatusLabel }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontSize: 12,
        fontWeight: 600,
        color: status === 'Paid' ? 'success.main' : 'text.secondary',
      }}
    >
      {status}
    </Typography>
  )
}

function VendorPOMilestoneDetailTable({
  milestones,
  serviceLabel,
  projectVendorInvoices,
}: {
  milestones: VendorPO['milestones']
  serviceLabel: string
  projectVendorInvoices: VendorInvoice[]
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
                <MilestoneStatusCell
                  status={vendorMilestonePaymentStatus(projectVendorInvoices, m.id)}
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
}: {
  milestones: VendorPO['milestones']
  serviceLabel: string
  projectVendorInvoices: VendorInvoice[]
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

  const vendorShippingAddress = useMemo(() => {
    if (!vendorRecord) return '—'
    const formatted = formatFullAddress(
      vendorRecord.shippingAddress ?? null,
      vendorRecord.shippingCity ?? '',
      vendorRecord.shippingState ?? '',
      vendorRecord.shippingPincode,
    )
    return formatted || vendorAddress
  }, [vendorRecord, vendorAddress])

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
                <ReadOnlyField label="Shipping Address" value={vendorShippingAddress} multiline />
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

interface ViewVendorPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  po: VendorPO | null
  baseline?: Baseline | null
}

export function ViewVendorPODrawer({
  open,
  onClose,
  projectId,
  po,
  baseline = null,
}: ViewVendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving, vendorPOs } = useAppSelector((s) => s.baseline)
  const { vendorInvoices } = useAppSelector((s) => s.live)
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const toast = useToast((s) => s.showToast)

  const resolvedPo = useMemo(
    () => (po ? vendorPOs.find((p) => p.id === po.id) ?? po : null),
    [po, vendorPOs],
  )
  const [updatingExecutedValue, setUpdatingExecutedValue] = useState(false)
  const [executedValueDraft, setExecutedValueDraft] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [milestoneOverrides, setMilestoneOverrides] = useState<VendorPOMilestoneRow[] | null>(null)
  const [retentionOverride, setRetentionOverride] = useState<VendorPORetentionRow | null | undefined>(
    undefined,
  )

  const projectVendorInvoices = useMemo(
    () => vendorInvoices.filter((i) => i.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const serviceLabel = useMemo(
    () => (resolvedPo ? vendorPOLinkedServiceLabel(resolvedPo, baseline) : '—'),
    [resolvedPo, baseline],
  )

  const categoryLabel = useMemo(
    () => (resolvedPo ? vendorPOCategoryLabel(resolvedPo, baseline) : '—'),
    [resolvedPo, baseline],
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

  const vendorShippingAddress = useMemo(() => {
    if (!vendorRecord) return '—'
    const formatted = formatFullAddress(
      vendorRecord.shippingAddress ?? null,
      vendorRecord.shippingCity ?? '',
      vendorRecord.shippingState ?? '',
      vendorRecord.shippingPincode,
    )
    return formatted || vendorAddress
  }, [vendorRecord, vendorAddress])

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendorInvoices(projectId))
      void dispatch(fetchVendors({ pageSize: 100, status: 'Active' }))
    }
  }, [open, projectId, dispatch])

  useEffect(() => {
    if (!open || !resolvedPo) {
      setUpdatingExecutedValue(false)
      setDeleteOpen(false)
      setMilestoneOverrides(null)
      setRetentionOverride(undefined)
      return
    }
    setExecutedValueDraft(String(effectiveExecutedValue(resolvedPo)))
  }, [open, resolvedPo?.id])

  useEffect(() => {
    setMilestoneOverrides(null)
    setRetentionOverride(undefined)
  }, [updatingExecutedValue, executedValueDraft, resolvedPo?.id])

  const recalculatedEditorState = useMemo(() => {
    if (!updatingExecutedValue || !resolvedPo) {
      return { milestones: [] as VendorPOMilestoneRow[], retention: null as VendorPORetentionRow | null }
    }
    const nextValue = Number(executedValueDraft)
    const milestones =
      !Number.isFinite(nextValue) || nextValue <= 0
        ? resolvedPo.milestones
        : recalculateVendorPOMilestonesForExecutedValue(
            resolvedPo.milestones,
            nextValue,
            projectVendorInvoices,
          )
    return vendorPOMilestoneEditorStateFromPo({ milestones })
  }, [updatingExecutedValue, executedValueDraft, resolvedPo, projectVendorInvoices])

  const editMilestones = milestoneOverrides ?? recalculatedEditorState.milestones
  const editRetention =
    retentionOverride === undefined ? recalculatedEditorState.retention : retentionOverride

  const editMilestoneStatuses = useMemo(() => {
    const statuses: Record<string, MilestonePaymentStatusLabel> = {}
    if (!resolvedPo) return statuses
    for (const m of resolvedPo.milestones) {
      const kind = m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
      if (kind === 'retention') continue
      statuses[m.id] =
        m.status === 'Paid' || vendorMilestonePaymentStatus(projectVendorInvoices, m.id) === 'Paid'
          ? 'Paid'
          : 'Unpaid'
    }
    return statuses
  }, [resolvedPo, projectVendorInvoices])

  const editRetentionStatus = useMemo((): MilestonePaymentStatusLabel | undefined => {
    if (!resolvedPo) return undefined
    const retention = resolvedPo.milestones.find(
      (m) => m.kind === 'retention' || m.name.trim().toLowerCase() === 'retention',
    )
    if (!retention) return undefined
    return retention.status === 'Paid' ||
      vendorMilestonePaymentStatus(projectVendorInvoices, retention.id) === 'Paid'
      ? 'Paid'
      : 'Unpaid'
  }, [resolvedPo, projectVendorInvoices])

  function resetExecutedValueEdit() {
    if (!resolvedPo) return
    setExecutedValueDraft(String(effectiveExecutedValue(resolvedPo)))
    setUpdatingExecutedValue(false)
    setMilestoneOverrides(null)
    setRetentionOverride(undefined)
  }

  function mergeVendorMilestoneEdits(
    base: import('@/slices/baseline/reducer').VendorPOMilestone[],
  ): import('@/slices/baseline/reducer').VendorPOMilestone[] {
    const editsById = new Map(editMilestones.map((m) => [m.id, m]))
    return base.map((m) => {
      const kind = m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
      const isPaid =
        m.status === 'Paid' || vendorMilestonePaymentStatus(projectVendorInvoices, m.id) === 'Paid'
      if (isPaid) return m
      if (kind === 'retention') {
        if (!editRetention) return m
        return {
          ...m,
          percentage: editRetention.percentage,
          value: editRetention.amount,
        }
      }
      const edit = editsById.get(m.id)
      if (!edit) return m
      return {
        ...m,
        percentage: edit.percentage,
        value: edit.value,
      }
    })
  }

  async function handleSaveExecutedValue() {
    if (!resolvedPo) return
    if (!canUpdateExecutedValue(resolvedPo)) {
      toast({ title: 'Executed value can no longer be updated', variant: 'error' })
      return
    }
    const nextValue = Number(executedValueDraft)
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      toast({ title: 'Enter a valid executed value', variant: 'error' })
      return
    }
    try {
      const recalculated = recalculateVendorPOMilestonesForExecutedValue(
        resolvedPo.milestones,
        nextValue,
        projectVendorInvoices,
      )
      const nextMilestones = mergeVendorMilestoneEdits(recalculated)
      await dispatch(
        updateVendorPO({
          projectId,
          poId: resolvedPo.id,
          data: buildVendorPOExecutedValueUpdatePayload(nextValue, nextMilestones),
        }),
      ).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({ title: 'Executed value updated', variant: 'success' })
      setUpdatingExecutedValue(false)
      setMilestoneOverrides(null)
      setRetentionOverride(undefined)
    } catch (err) {
      toast({
        title: typeof err === 'string' ? err : 'Failed to update executed value',
        variant: 'error',
      })
    }
  }

  async function handleDelete() {
    if (!resolvedPo) return
    try {
      await dispatch(deleteVendorPO({ projectId, poId: resolvedPo.id })).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({ title: 'Vendor PO deleted', variant: 'success' })
      setDeleteOpen(false)
      onClose()
    } catch {
      toast({ title: 'Failed to delete vendor PO', variant: 'error' })
    }
  }

  const showExecutedValueUpdated = Boolean(resolvedPo?.executedValueLocked)

  function handlePoDocumentOpenFailed() {
    toast({
      title: 'Unable to open document',
      description: 'The PO file is no longer available in this session.',
      variant: 'error',
    })
  }

  return (
    <>
      <DrawerForm
        open={open}
        onClose={onClose}
        title={resolvedPo?.poNumber ?? 'Vendor PO'}
        subtitle={
          updatingExecutedValue
            ? 'Update the executed value (one-time change)'
            : 'Vendor purchase order details'
        }
        footer={
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{ px: 2.5, py: 1.75, width: '100%' }}
          >
            {!updatingExecutedValue && showExecutedValueUpdated ? (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontSize: 11, mr: 'auto' }}
              >
                Executed Value Updated
              </Typography>
            ) : null}
            {updatingExecutedValue ? (
              <>
                <Button variant="text" size="sm" label="Cancel" onClick={resetExecutedValueEdit} />
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label={saving ? 'Saving…' : 'Save'}
                  onClick={() => void handleSaveExecutedValue()}
                  disabled={saving}
                />
              </>
            ) : (
              <>
                {resolvedPo && canUpdateExecutedValue(resolvedPo) ? (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="primary"
                    label="Updated"
                    onClick={() => setUpdatingExecutedValue(true)}
                  />
                ) : null}
                <Button
                  size="sm"
                  variant="outlined"
                  color="error"
                  label="Delete"
                  onClick={() => setDeleteOpen(true)}
                />
              </>
            )}
          </Stack>
        }
      >
        {resolvedPo ? (
          <Stack spacing={2.5}>
            {updatingExecutedValue ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    component="span"
                    variant="overline"
                    sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
                  >
                    PO Details
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
                      <ReadOnlyField label="Shipping Address" value={vendorShippingAddress} multiline />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 1.5,
                      ...READONLY_DISABLED_TEXTFIELD_SX,
                    }}
                  >
                    <FormField label="PO Number">
                      <TextField
                        fullWidth
                        size="small"
                        value={resolvedPo.poNumber}
                        disabled
                      />
                    </FormField>
                    <FormField label="PO Date" required>
                      <DatePicker
                        value={dateFromIso(resolvedPo.poDate)}
                        onChange={() => undefined}
                        fullWidth
                        size="sm"
                        disabled
                      />
                    </FormField>
                    <FormField label="PO Value (₹)" required>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={executedValueDraft}
                        onChange={(e) => setExecutedValueDraft(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Executed Value (₹)" required>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={executedValueDraft}
                        onChange={(e) => setExecutedValueDraft(e.target.value)}
                      />
                    </FormField>
                    {resolvedPo.fileName && poDocumentOpenUrl(resolvedPo.documentUrl) ? (
                      <PODocumentLinkField
                        fileName={resolvedPo.fileName}
                        documentUrl={resolvedPo.documentUrl}
                        onOpenFailed={handlePoDocumentOpenFailed}
                        alignWithInput
                      />
                    ) : null}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <VendorPOMilestoneEditor
                  structureLocked
                  poValue={Number(executedValueDraft) || effectiveExecutedValue(resolvedPo)}
                  milestones={editMilestones}
                  retention={editRetention}
                  milestoneStatuses={editMilestoneStatuses}
                  retentionStatus={editRetentionStatus}
                  onMilestonesChange={setMilestoneOverrides}
                  onRetentionChange={setRetentionOverride}
                />
              </>
            ) : (
              <>
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
                  <ReadOnlyField label="Shipping Address" value={vendorShippingAddress} multiline />
                </Box>
              </Box>
            </Box>
            <Divider sx={{ my: 0.5 }} />
              <VendorPOMilestonesReadOnlySections
                milestones={resolvedPo.milestones}
                serviceLabel={serviceLabel}
                projectVendorInvoices={projectVendorInvoices}
              />
              </>
            )}
          </Stack>
        ) : null}
      </DrawerForm>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete vendor PO?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            This will permanently remove {resolvedPo?.poNumber}. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setDeleteOpen(false)}>
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
    </>
  )
}
