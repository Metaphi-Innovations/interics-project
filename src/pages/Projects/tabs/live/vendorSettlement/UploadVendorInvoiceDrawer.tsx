import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Chip, IconButton, MenuItem, Select, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { DrawerForm, FormField } from '@/components/templates/DrawerForm'
import {
  AutocompleteField,
  Button,
  Checkbox,
  DatePicker,
  dateFromIso,
  FileUpload,
  Input,
  isoFromDate,
  Select as DsSelect,
  useToast,
} from '@/design-system/components'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendorInvoices, uploadVendorInvoice } from '@/slices/live/thunk'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { baselineService } from '@/modules/projects/baseline.service'
import { payablesService } from '@/modules/finance/payables.service'
import { formatInr } from '@/utils/formatters'
import {
  flattenVendorPoMilestones,
  remainingVendorMilestoneValue,
  vendorBilledAmountForMilestone,
  vendorHasCoveringInvoice,
  vendorMilestoneIsSelectable,
  vendorPoHasPendingInvoiceWork,
} from '@/pages/Finance/utils/vendorBillable'
import {
  DEFAULT_TDS_PERCENT,
  calcVendorInvoiceNetPayable,
  calcVendorInvoiceTdsAmount,
  TDS_RATE_OPTIONS,
} from './utils'
import type { ProjectVendorOption } from './eligibleInvoiceUpload'
import {
  buildMilestoneUploadOptions,
  buildVendorInvoiceUploadLineItems,
  sumVendorInvoiceLineItemAmounts,
  toggleSelectedMilestoneIds,
} from './uploadVendorInvoiceUtils'

export type { ProjectVendorOption }

export interface UploadVendorInvoiceInitialSelection {
  projectId: string
  vendorId: string
  vendorPoId?: string
  serviceId?: string
  milestoneId?: string
}

interface VendorOption {
  vendorId: string
  vendorName: string
}

interface FormErrors {
  vendor?: string
  vendorPo?: string
  milestone?: string
  invoiceNumber?: string
  invoiceDate?: string
  baseAmount?: string
  tdsRate?: string
}

const SECTION_HEADER_SX = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'text.secondary',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
}

function SectionHeader({ children }: { children: string }) {
  return (
    <Typography variant="caption" component="div" sx={SECTION_HEADER_SX}>
      {children}
    </Typography>
  )
}

function gstOnBase(base: number, rate: number): number {
  return Math.round((base * rate) / 100)
}

function buildVendorOptionsFromPos(
  vendorPOs: VendorPO[],
  vendorInvoices: VendorInvoice[],
  projectId?: string,
): VendorOption[] {
  const map = new Map<string, string>()
  for (const po of vendorPOs) {
    if (projectId && po.projectId !== projectId) continue
    if (!po.vendorId) continue
    if (!vendorPoHasPendingInvoiceWork(po, vendorInvoices)) continue
    if (!map.has(po.vendorId)) {
      map.set(po.vendorId, po.vendorName || po.vendorId)
    }
  }
  return [...map.entries()]
    .map(([vendorId, vendorName]) => ({ vendorId, vendorName }))
    .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
}

export function UploadVendorInvoiceDrawer({
  open,
  onClose,
  vendorInvoices,
  allVendorPOs = [],
  projects = [],
  projectVendors,
  projectId: lockedProjectId,
  projectName: lockedProjectName,
  initialSelection,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  vendorInvoices: VendorInvoice[]
  /** All vendor POs (Finance workspace) for vendor dropdown derivation. */
  allVendorPOs?: VendorPO[]
  projects?: Array<{ id: string; name: string }>
  projectVendors?: ProjectVendorOption[]
  projectId?: string
  projectName?: string
  initialSelection?: UploadVendorInvoiceInitialSelection | null
  onUploaded?: (projectId: string) => void
}) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const isProjectScoped = Boolean(lockedProjectId)

  const [vendor, setVendor] = useState<VendorOption | null>(null)
  const [selectedPoId, setSelectedPoId] = useState('')
  const [billablePos, setBillablePos] = useState<VendorPO[]>([])
  const [posLoading, setPosLoading] = useState(false)
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [tdsRate, setTdsRate] = useState(DEFAULT_TDS_PERCENT)
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)
  const [documentFileName, setDocumentFileName] = useState<string | undefined>(undefined)
  const [errors, setErrors] = useState<FormErrors>({})
  const initializedRef = useRef(false)

  const vendorOptions = useMemo((): VendorOption[] => {
    if (isProjectScoped && lockedProjectId) {
      if (projectVendors && projectVendors.length > 0) {
        const scopedPos = allVendorPOs.filter((po) => po.projectId === lockedProjectId)
        return buildVendorOptionsFromPos(scopedPos, vendorInvoices, lockedProjectId)
      }
      return buildVendorOptionsFromPos(allVendorPOs, vendorInvoices, lockedProjectId)
    }
    return buildVendorOptionsFromPos(allVendorPOs, vendorInvoices)
  }, [allVendorPOs, vendorInvoices, isProjectScoped, lockedProjectId, projectVendors])

  const selectedPo = useMemo(
    () => billablePos.find((p) => p.id === selectedPoId) ?? null,
    [billablePos, selectedPoId],
  )

  const poMilestones = useMemo(() => flattenVendorPoMilestones(selectedPo), [selectedPo])

  const serviceId = selectedPo?.linkedBaselineServiceIds?.[0]?.trim() || ''

  const milestoneUploadOptions = useMemo(() => {
    if (!selectedPo) return []
    return buildMilestoneUploadOptions(
      poMilestones,
      (milestoneId) => {
        const milestone = poMilestones.find((m) => m.milestoneId === milestoneId)
        if (!milestone) return 0
        const billed = vendorBilledAmountForMilestone(
          vendorInvoices,
          selectedPo.projectId,
          selectedPo.id,
          selectedPo.vendorId,
          serviceId,
          milestone,
        )
        return remainingVendorMilestoneValue(billed, milestone.value)
      },
      (milestoneId) => {
        const milestone = poMilestones.find((m) => m.milestoneId === milestoneId)
        if (!milestone) return true
        if (
          vendorHasCoveringInvoice(
            vendorInvoices,
            selectedPo.projectId,
            selectedPo.id,
            selectedPo.vendorId,
            serviceId,
            milestone,
          )
        ) {
          return true
        }
        const billed = vendorBilledAmountForMilestone(
          vendorInvoices,
          selectedPo.projectId,
          selectedPo.id,
          selectedPo.vendorId,
          serviceId,
          milestone,
        )
        return !vendorMilestoneIsSelectable(billed, milestone.value)
      },
    )
  }, [poMilestones, selectedPo, vendorInvoices, serviceId])

  const lineItems = useMemo(() => {
    if (!selectedPo) return []
    return buildVendorInvoiceUploadLineItems(
      selectedMilestoneIds,
      milestoneUploadOptions,
      serviceId,
    )
  }, [selectedMilestoneIds, milestoneUploadOptions, selectedPo, serviceId])

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of projects) map.set(p.id, p.name)
    if (lockedProjectId && lockedProjectName) map.set(lockedProjectId, lockedProjectName)
    return map
  }, [projects, lockedProjectId, lockedProjectName])

  const poSelectOptions = useMemo(
    () => [
      { label: 'Select a vendor PO', value: '' },
      ...billablePos.map((po) => ({
        label: `${po.poNumber} — ₹${formatInr(po.poValue)}${
          isProjectScoped ? '' : ` (${projectNameById.get(po.projectId) ?? 'Project'})`
        }`,
        value: po.id,
      })),
    ],
    [billablePos, isProjectScoped, projectNameById],
  )

  const combinedBaseAmount = useMemo(() => sumVendorInvoiceLineItemAmounts(lineItems), [lineItems])

  const tdsAmount = useMemo(
    () => calcVendorInvoiceTdsAmount(combinedBaseAmount, tdsRate),
    [combinedBaseAmount, tdsRate],
  )

  const netPayable = useMemo(
    () => calcVendorInvoiceNetPayable(combinedBaseAmount, 0, tdsRate, 0),
    [combinedBaseAmount, tdsRate],
  )

  const firstSelectedMilestone = useMemo(() => {
    const firstId = selectedMilestoneIds[0]
    if (!firstId) return null
    return poMilestones.find((m) => m.milestoneId === firstId) ?? null
  }, [selectedMilestoneIds, poMilestones])

  const resetForm = useCallback(() => {
    setVendor(null)
    setSelectedPoId('')
    setBillablePos([])
    setSelectedMilestoneIds([])
    setInvoiceNumber('')
    setInvoiceDate('')
    setTdsRate(DEFAULT_TDS_PERCENT)
    setDocumentUrl(undefined)
    setDocumentFileName(undefined)
    setErrors({})
  }, [])

  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      resetForm()
      return
    }
    if (initializedRef.current) return

    if (!initialSelection) {
      initializedRef.current = true
      resetForm()
      return
    }

    initializedRef.current = true
    const vendorOpt = vendorOptions.find((v) => v.vendorId === initialSelection.vendorId)
    if (vendorOpt) setVendor(vendorOpt)
    if (initialSelection.vendorPoId) setSelectedPoId(initialSelection.vendorPoId)
    if (initialSelection.milestoneId) {
      setSelectedMilestoneIds([initialSelection.milestoneId])
    }
  }, [open, initialSelection, vendorOptions, resetForm])

  const vendorChangeRef = useRef(false)

  useEffect(() => {
    if (!open || !vendor) {
      setBillablePos([])
      setPosLoading(false)
      return
    }

    let cancelled = false
    setPosLoading(true)

    if (vendorChangeRef.current) {
      setSelectedPoId('')
      setSelectedMilestoneIds([])
      vendorChangeRef.current = false
    }

    const load = isProjectScoped && lockedProjectId
      ? baselineService.listVendorPos(lockedProjectId, {
          pendingInvoiceOnly: true,
          vendorId: vendor.vendorId,
        })
      : payablesService.listVendorPos({
          vendorId: vendor.vendorId,
          pendingInvoiceOnly: true,
        })

    void load
      .then((pos) => {
        if (!cancelled) setBillablePos(pos)
      })
      .catch(() => {
        if (!cancelled) setBillablePos([])
      })
      .finally(() => {
        if (!cancelled) setPosLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, vendor?.vendorId, isProjectScoped, lockedProjectId])

  useEffect(() => {
    if (!open || !initialSelection?.vendorPoId || billablePos.length === 0) return
    const po = billablePos.find((p) => p.id === initialSelection.vendorPoId)
    if (po) setSelectedPoId(po.id)
  }, [open, initialSelection?.vendorPoId, billablePos])

  useEffect(() => {
    if (!open || !initialSelection?.milestoneId || !selectedPo) return
    setSelectedMilestoneIds([initialSelection.milestoneId])
  }, [open, initialSelection?.milestoneId, selectedPo?.id])

  const onVendorChange = useCallback((next: VendorOption | null) => {
    vendorChangeRef.current = true
    setVendor(next)
    setSelectedPoId('')
    setBillablePos([])
    setSelectedMilestoneIds([])
    setErrors((prev) => ({ ...prev, vendor: undefined, vendorPo: undefined, milestone: undefined }))
  }, [])

  const onPoChange = useCallback((value: string) => {
    setSelectedPoId(value)
    setSelectedMilestoneIds([])
    setErrors((prev) => ({ ...prev, milestone: undefined }))
  }, [])

  const clearError = useCallback((key: keyof FormErrors) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }, [])

  const toggleMilestone = useCallback((milestoneId: string) => {
    setSelectedMilestoneIds((prev) => toggleSelectedMilestoneIds(prev, milestoneId))
    clearError('milestone')
  }, [clearError])

  const removeMilestone = useCallback((milestoneId: string) => {
    setSelectedMilestoneIds((prev) => prev.filter((id) => id !== milestoneId))
  }, [])

  function validate(): boolean {
    const next: FormErrors = {}
    if (!vendor) next.vendor = 'Vendor is required'
    if (!selectedPoId) next.vendorPo = 'Vendor PO is required'
    if (selectedMilestoneIds.length === 0) next.milestone = 'Select at least one milestone or retention'
    if (lineItems.length === 0) next.milestone = 'Select at least one billable milestone or retention'
    if (!invoiceNumber.trim()) next.invoiceNumber = 'Invoice number is required'
    if (!(combinedBaseAmount > 0)) next.baseAmount = 'Invoice amount is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate() || !vendor || !selectedPo || lineItems.length === 0) return

    const base = combinedBaseAmount
    const gstRate = DEFAULT_GST_RATE
    const gstAmount = gstOnBase(base, gstRate)
    const headerMilestone = firstSelectedMilestone ?? poMilestones.find((m) => m.milestoneId === lineItems[0]?.milestoneId)

    try {
      await dispatch(
        uploadVendorInvoice({
          projectId: selectedPo.projectId,
          data: {
            vendorId: selectedPo.vendorId,
            vendorName: selectedPo.vendorName,
            vendorPoId: selectedPo.id,
            serviceId,
            serviceName: serviceId,
            milestoneId: headerMilestone?.milestoneId ?? lineItems[0]!.milestoneId,
            milestoneName: headerMilestone?.milestoneName ?? lineItems[0]!.milestoneName,
            lineItems,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate,
            baseAmount: base,
            gstRate,
            gstAmount,
            tdsRate,
            tdsAmount: calcVendorInvoiceTdsAmount(base, tdsRate),
            linkedExpenseIds: [],
            expenseDeductions: 0,
            linkedAdditionExpenseIds: [],
            expenseAdditions: 0,
            netPayable: calcVendorInvoiceNetPayable(base, 0, tdsRate, 0),
            status: 'not_paid',
            documentUrl,
            fileName: documentFileName,
            projectName: lockedProjectName,
          },
        }),
      ).unwrap()
      await dispatch(fetchVendorInvoices(selectedPo.projectId)).unwrap()
      onUploaded?.(selectedPo.projectId)
      toast.success('Vendor invoice uploaded')
      onClose()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to upload vendor invoice')
    }
  }

  const subtitle =
    selectedPo && lineItems.length > 0 ? (
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
        {lineItems.map((li) => (
          <Chip
            key={li.milestoneId}
            label={li.milestoneName}
            size="small"
            variant="outlined"
            sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 500 }}
          />
        ))}
        <Chip
          label={selectedPo.poNumber}
          size="small"
          variant="outlined"
          sx={{ borderColor: 'primary.main', color: 'primary.main', fontWeight: 500 }}
        />
      </Stack>
    ) : undefined

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Upload Invoice"
      subtitle={subtitle}
      width={680}
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 2.5, py: 1.75 }}>
          <Button size="sm" variant="outlined" label="Cancel" onClick={onClose} disabled={saving} />
          <Button
            variant="contained"
            color="primary"
            size="sm"
            label="Save Invoice"
            onClick={() => void handleSubmit()}
            loading={saving}
          />
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Box>
          <SectionHeader>Vendor & PO</SectionHeader>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormField label="Vendor" required error={errors.vendor}>
              <AutocompleteField
                options={vendorOptions}
                value={vendor}
                onChange={onVendorChange}
                getOptionLabel={(o) => o.vendorName}
                isOptionEqualToValue={(a, b) => a.vendorId === b.vendorId}
                placeholder={
                  vendorOptions.length === 0 ? 'No vendors with invoiceable POs' : 'Search vendor…'
                }
                disabled={vendorOptions.length === 0}
                error={Boolean(errors.vendor)}
                size="sm"
              />
            </FormField>
            <FormField label="Vendor PO" required error={errors.vendorPo}>
              <DsSelect
                size="sm"
                placeholder="Select a vendor PO"
                value={selectedPoId}
                onChange={(v) => onPoChange(String(v))}
                options={poSelectOptions}
                fullWidth
                disabled={!vendor || posLoading || billablePos.length === 0}
              />
              {posLoading ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                  Loading vendor POs…
                </Typography>
              ) : null}
              {vendor && !posLoading && billablePos.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                  No vendor POs with uninvoiced milestones
                </Typography>
              ) : null}
            </FormField>
          </Stack>
        </Box>

        <Box>
          <SectionHeader>Milestones & retentions</SectionHeader>
          <Box sx={{ mt: 1 }}>
            <FormField label="Select items" required error={errors.milestone}>
              {!vendor || !selectedPoId ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  Select a vendor and PO first
                </Typography>
              ) : poMilestones.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  No milestones on this PO
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {milestoneUploadOptions.map((m) => {
                    const typeLabel = m.isRetention ? 'Retention' : 'Milestone'
                    return (
                      <Checkbox
                        key={m.milestoneId}
                        size="sm"
                        label={`${m.milestoneName} (${typeLabel}) · ₹${formatInr(m.value)} · Billable ₹${formatInr(m.billableAmount)}`}
                        checked={selectedMilestoneIds.includes(m.milestoneId)}
                        onChange={() => toggleMilestone(m.milestoneId)}
                        disabled={m.disabled}
                      />
                    )
                  })}
                </Stack>
              )}
            </FormField>
          </Box>
        </Box>

        {lineItems.length > 0 ? (
          <Box>
            <SectionHeader>Selected items</SectionHeader>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {lineItems.map((li) => (
                <Stack
                  key={li.milestoneId}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {li.milestoneName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{formatInr(li.amount)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label={`Remove ${li.milestoneName}`}
                    onClick={() => removeMilestone(li.milestoneId)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Typography variant="caption" color="text.secondary">
                Selected items: {lineItems.length}
              </Typography>
            </Stack>
          </Box>
        ) : null}

        <Box>
          <SectionHeader>Invoice details</SectionHeader>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormField label="Invoice Number" required error={errors.invoiceNumber}>
              <Input
                value={invoiceNumber}
                onChange={(v) => {
                  setInvoiceNumber(v)
                  clearError('invoiceNumber')
                }}
                placeholder="e.g. VINV-2026-001"
                size="sm"
                error={Boolean(errors.invoiceNumber)}
              />
            </FormField>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormField label="Invoice Date" error={errors.invoiceDate}>
                  <DatePicker
                    value={dateFromIso(invoiceDate)}
                    onChange={(d) => {
                      setInvoiceDate(isoFromDate(d))
                      clearError('invoiceDate')
                    }}
                    fullWidth
                    size="sm"
                    error={Boolean(errors.invoiceDate)}
                  />
                </FormField>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormField label="Invoice Amount (pre-TDS base)" required error={errors.baseAmount}>
                  <Input
                    type="number"
                    value={combinedBaseAmount > 0 ? String(combinedBaseAmount) : ''}
                    onChange={() => undefined}
                    size="sm"
                    disabled
                    error={Boolean(errors.baseAmount)}
                    startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
                  />
                </FormField>
              </Box>
            </Stack>
            <FormField label="TDS" error={errors.tdsRate}>
              <Select
                size="small"
                fullWidth
                value={tdsRate}
                onChange={(e) => {
                  setTdsRate(Number(e.target.value))
                  clearError('tdsRate')
                }}
                error={Boolean(errors.tdsRate)}
                sx={{ fontSize: 12 }}
              >
                {TDS_RATE_OPTIONS.map((rate) => (
                  <MenuItem key={rate} value={rate} sx={{ fontSize: 12 }}>
                    {rate}%
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField label="Upload Invoice Document" hint="Optional">
              <FileUpload
                accept="application/pdf,.pdf"
                maxFiles={1}
                label="Upload Invoice"
                onUpload={(files) => {
                  const f = files[0]
                  if (f) {
                    setDocumentUrl(URL.createObjectURL(f))
                    setDocumentFileName(f.name)
                  } else {
                    setDocumentUrl(undefined)
                    setDocumentFileName(undefined)
                  }
                }}
              />
            </FormField>
          </Stack>
        </Box>

        {combinedBaseAmount > 0 ? (
          <Box>
            <SectionHeader>Summary</SectionHeader>
            <Box
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 1,
                bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Base amount
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    ₹{formatInr(combinedBaseAmount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    TDS ({tdsRate}%)
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    −₹{formatInr(tdsAmount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Net payable
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    ₹{formatInr(netPayable)}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </Box>
        ) : null}
      </Stack>
    </DrawerForm>
  )
}
