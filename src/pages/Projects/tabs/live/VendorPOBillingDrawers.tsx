import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Divider,
  MenuItem,
  Select as MuiSelect,
  Stack,
  TextField,
  Typography,
  Button as MuiButton,
} from '@mui/material'
import { Download, Upload } from '@mui/icons-material'
import { Button, useToast } from '@/design-system/components'
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
} from './VendorPOMilestoneEditor'

const PO_SECTION_TITLE_SX = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
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
  initialVendorName,
  initialCategoryName,
  initialServiceName,
  initialPoValue,
}: AddVendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const toast = useToast((s) => s.showToast)
  const [form, setForm] = useState({
    vendorId: '',
    poDate: '',
    poValue: '',
    file: null as File | null,
  })
  const [milestones, setMilestones] = useState<VendorPOMilestoneRow[]>([])
  const [retention, setRetention] = useState<VendorPORetentionRow | null>(null)

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendors({ pageSize: 500 }))
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!open) {
      setForm({ vendorId: '', poDate: '', poValue: '', file: null })
      setMilestones([])
      setRetention(null)
      return
    }
    if (initialVendorId) {
      setForm((prev) => ({ ...prev, vendorId: initialVendorId }))
    }
    if (initialPoValue && initialPoValue > 0) {
      setForm((prev) => ({ ...prev, poValue: String(initialPoValue) }))
    }
  }, [open, initialVendorId, initialPoValue])

  const poValueNumber = Number(form.poValue) || 0
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
    () => isVendorPOMilestoneBreakdownValid(poValueNumber, milestones, retention),
    [poValueNumber, milestones, retention],
  )

  useEffect(() => {
    if (poValueNumber <= 0) return
    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        value: Math.round((m.percentage / 100) * poValueNumber),
      })),
    )
    setRetention((prev) =>
      prev
        ? { ...prev, amount: Math.round((prev.percentage / 100) * poValueNumber) }
        : null,
    )
  }, [poValueNumber])

  function setField(key: keyof typeof form, value: string | File | null) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      toast({ title: 'Milestone and retention percentages must equal 100%', variant: 'error' })
      return
    }
    const vendor = vendors.find((v) => v.vendorId === form.vendorId)
    const documentUrl = form.file ? URL.createObjectURL(form.file) : null
    const milestonePayload = buildVendorPOMilestonePayload(milestones, retention)
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
            milestones: milestonePayload,
            linkedBaselineServiceIds: initialServiceId ? [initialServiceId] : undefined,
            status: 'Draft',
            documentUrl,
            fileName: form.file?.name ?? null,
          },
        }),
      ).unwrap()
      void dispatch(fetchVendorPOs(projectId))
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
          ) : (
            <>
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
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 0.5 }} />
              </Box>
            </>
          )}
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
              onChange={(e) => setField('poValue', e.target.value)}
              placeholder="0"
            />
          </FormField>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <VendorPOMilestoneEditor
        poValue={poValueNumber}
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
}

export function ViewVendorPODrawer({ open, onClose, projectId, po }: ViewVendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const toast = useToast((s) => s.showToast)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ poNumber: '', poDate: '', poValue: '' })
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
    })
    setEditing(false)
    setNewFile(null)
  }, [open, po])

  async function handleSave() {
    if (!po || !form.poNumber || !form.poDate || !form.poValue) {
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
            poValue: Number(form.poValue),
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
                  <FormField label="PO Value (₹)" required>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={form.poValue}
                      onChange={(e) => setForm((p) => ({ ...p, poValue: e.target.value }))}
                    />
                  </FormField>
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
                {po.fileName ? (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <ReadOnlyField label="Uploaded PO Document" value={po.fileName} />
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>
          <Divider />
        </Stack>
      ) : null}
    </DrawerForm>
  )
}
