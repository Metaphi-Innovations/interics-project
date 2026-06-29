import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
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
import { Download, Upload } from '@mui/icons-material'
import { Button, Checkbox, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import {
  createVendorPO,
  fetchVendorPOs,
  updateVendorPO,
} from '../../../../slices/baseline/thunk'
import { fetchVendors } from '../../../../slices/vendors/thunk'
import type { VendorPO } from '../../../../slices/baseline/reducer'
import { formatFullAddress } from '../../../workspace/recordDetailTabUtils'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import type { VendorOption } from './vendorPOHelpers'
import {
  VendorPOMilestoneEditor,
  buildVendorPOMilestonePayload,
  isVendorPOMilestoneBreakdownValid,
  type VendorPOMilestoneRow,
  type VendorPORetentionRow,
  type VendorPOFinalMilestoneRow,
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
} as const

function VendorPOMilestonesTable({ milestones }: { milestones: VendorPO['milestones'] }) {
  if (milestones.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, textAlign: 'center' }}>
        No milestones recorded for this PO.
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
        <TableHead>
          <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
            <TableCell sx={{ ...MILESTONE_TABLE_HEADER_SX, width: '36%' }}>Name</TableCell>
            <TableCell align="right" sx={{ ...MILESTONE_TABLE_HEADER_SX, width: '22%' }}>
              Percentage (%)
            </TableCell>
            <TableCell align="right" sx={{ ...MILESTONE_TABLE_HEADER_SX, width: '42%' }}>
              Value (₹)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {milestones.map((m) => (
            <TableRow key={m.id} hover>
              <TableCell sx={MILESTONE_TABLE_CELL_SX}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                  {m.name || '—'}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={MILESTONE_TABLE_CELL_SX}>
                {m.percentage}%
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
  const [finalMilestone, setFinalMilestone] = useState<VendorPOFinalMilestoneRow | null>(null)

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendors({ pageSize: 500 }))
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
      setFinalMilestone(null)
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

  const milestonesValid = useMemo(
    () => isVendorPOMilestoneBreakdownValid(milestoneBaseValue, milestones, retention, finalMilestone),
    [milestoneBaseValue, milestones, retention, finalMilestone],
  )

  useEffect(() => {
    if (milestoneBaseValue <= 0) return
    setFinalMilestone((prev) =>
      prev ? { ...prev, amount: Math.round((prev.percentage / 100) * milestoneBaseValue) } : null,
    )
  }, [milestoneBaseValue])

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
    if (!milestonesValid) {
      toast({ title: 'Milestone, retention, and final milestone percentages must equal 100%', variant: 'error' })
      return
    }
    const vendor = vendors.find((v) => v.vendorId === form.vendorId)
    const documentUrl = form.file ? URL.createObjectURL(form.file) : null
    const milestonePayload = buildVendorPOMilestonePayload(milestones, retention, finalMilestone)
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
            fileName: form.file?.name ?? null,
            insurance: form.insurance,
            contractSigned: form.contractSigned,
            requiredDocumentsSubmitted: form.requiredDocumentsSubmitted,
          },
        }),
      ).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({ title: 'Vendor PO saved successfully', variant: 'success' })
      onClose()
    } catch {
      toast({ title: 'Failed to save vendor PO', variant: 'error' })
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
            <TextField
              fullWidth
              size="small"
              type="date"
              value={form.poDate}
              onChange={(e) => setField('poDate', e.target.value)}
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
        finalMilestone={finalMilestone}
        onMilestonesChange={setMilestones}
        onRetentionChange={setRetention}
        onFinalMilestoneChange={setFinalMilestone}
      />
    </DrawerForm>
  )
}

function formatExecutedValueLabel(poValue: number, executedValue?: number | null): string {
  if (executedValue != null) return `₹${formatCurrency(executedValue)}`
  return `₹${formatCurrency(poValue)}`
}

interface ViewVendorPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  po: VendorPO | null
}

export function ViewVendorPODrawer({ open, onClose, projectId, po }: ViewVendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const toast = useToast((s) => s.showToast)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ poNumber: '', poDate: '', poValue: '', executedValue: '' })
  const [newFile, setNewFile] = useState<File | null>(null)

  useEffect(() => {
    if (!open || !po) {
      setEditing(false)
      setNewFile(null)
      return
    }
    setForm({
      poNumber: po.poNumber,
      poDate: po.poDate,
      poValue: String(po.poValue),
      executedValue: po.executedValue != null ? String(po.executedValue) : String(po.poValue),
    })
    setEditing(false)
    setNewFile(null)
  }, [open, po])

  async function handleSave() {
    if (!po || !form.poNumber || !form.poDate) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    const documentUrl = newFile ? URL.createObjectURL(newFile) : po.documentUrl
    try {
      await dispatch(
        updateVendorPO({
          projectId,
          poId: po.id,
          data: {
            poNumber: form.poNumber,
            poDate: form.poDate,
            documentUrl,
            fileName: newFile?.name ?? po.fileName,
          },
        }),
      ).unwrap()
      void dispatch(fetchVendorPOs(projectId))
      toast({ title: 'Vendor PO updated successfully', variant: 'success' })
      setEditing(false)
      setNewFile(null)
    } catch {
      toast({ title: 'Failed to update vendor PO', variant: 'error' })
    }
  }

  const documentUrl = newFile ? URL.createObjectURL(newFile) : po?.documentUrl ?? null
  const documentLabel = newFile?.name ?? po?.fileName

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={po?.poNumber ?? 'Vendor PO'}
      subtitle={editing ? 'Edit vendor purchase order' : 'Vendor purchase order details'}
      footer={
        <Stack
          direction="row"
          justifyContent="flex-end"
          flexWrap="wrap"
          gap={1}
          sx={{ px: 2.5, py: 1.75 }}
        >
          {editing ? (
            <>
              <Button
                variant="text"
                size="sm"
                label="Cancel"
                onClick={() => {
                  if (po) {
                    setForm({
                      poNumber: po.poNumber,
                      poDate: po.poDate,
                      poValue: String(po.poValue),
                      executedValue:
                        po.executedValue != null ? String(po.executedValue) : String(po.poValue),
                    })
                  }
                  setNewFile(null)
                  setEditing(false)
                }}
              />
              <Button
                size="sm"
                variant="contained"
                color="primary"
                label={saving ? 'Saving…' : 'Save'}
                onClick={() => void handleSave()}
                disabled={saving}
              />
            </>
          ) : (
            <>
              <Button variant="text" size="sm" label="Close" onClick={onClose} />
              {documentUrl ? (
                <Button
                  size="sm"
                  variant="outlined"
                  color="primary"
                  label="View"
                  onClick={() => window.open(documentUrl, '_blank')}
                />
              ) : null}
              <Button
                size="sm"
                variant="outlined"
                color="primary"
                label="Edit"
                onClick={() => setEditing(true)}
              />
            </>
          )}
        </Stack>
      }
    >
      {po ? (
        <Stack spacing={2.5}>
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography component="span" variant="overline" sx={PO_SECTION_TITLE_SX}>
                PO Details
              </Typography>
              {(documentUrl || po.documentUrl) && !editing ? (
                <Button
                  size="sm"
                  variant="outlined"
                  color="primary"
                  label="Download Document"
                  startIcon={<Download sx={{ fontSize: 16 }} />}
                  onClick={() => window.open(documentUrl ?? po.documentUrl!, '_blank')}
                />
              ) : null}
              {editing ? (
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
                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                  />
                </MuiButton>
              ) : null}
            </Stack>
            {editing ? (
              <>
                {documentLabel ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1, textAlign: 'right', fontSize: 11 }}
                  >
                    {documentLabel}
                  </Typography>
                ) : null}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1.5,
                  }}
                >
                  <ReadOnlyField label="Vendor Name" value={po.vendorName} />
                  <FormField label="PO Number" required>
                    <TextField
                      fullWidth
                      size="small"
                      value={form.poNumber}
                      onChange={(e) => setForm((p) => ({ ...p, poNumber: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="PO Date" required>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={form.poDate}
                      onChange={(e) => setForm((p) => ({ ...p, poDate: e.target.value }))}
                    />
                  </FormField>
                  <ReadOnlyField label="PO Value (₹)" value={`₹${formatCurrency(po.poValue)}`} />
                  <ReadOnlyField
                    label="Executed Value (₹)"
                    value={formatExecutedValueLabel(po.poValue, po.executedValue)}
                  />
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                }}
              >
                <ReadOnlyField label="Vendor Name" value={po.vendorName} />
                <ReadOnlyField label="PO Number" value={po.poNumber} />
                <ReadOnlyField label="PO Date" value={formatDate(po.poDate)} />
                <ReadOnlyField label="PO Value" value={`₹${formatCurrency(po.poValue)}`} />
                <ReadOnlyField
                  label="Executed Value"
                  value={
                    po.executedValue != null
                      ? `₹${formatCurrency(po.executedValue)}`
                      : `₹${formatCurrency(po.poValue)}`
                  }
                />
                {po.fileName ? (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <ReadOnlyField label="Uploaded PO Document" value={po.fileName} />
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
          <Divider />
          {!editing ? (
            <Box>
              <Typography
                component="span"
                variant="overline"
                sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
              >
                Milestones
              </Typography>
              <VendorPOMilestonesTable milestones={po.milestones} />
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </DrawerForm>
  )
}
