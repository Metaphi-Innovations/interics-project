import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button as MuiButton,
  Divider,
  FormControlLabel,
  IconButton as MuiIconButton,
  InputAdornment,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete, Upload } from '@mui/icons-material'
import { DrawerForm, FormField } from '@/components/templates'
import { tokens } from '@/design-system/tokens'
import { formatCurrency, formatInr } from '@/utils/formatters'

export interface VendorOfferServiceOption {
  id: string
  label: string
  value: number
  pitchServiceId: string
}

export interface VendorAllocationRow {
  id: string
  vendorId: string
  amount: string
  file: File | null
  existingFileName?: string
  isMeasurable: boolean
}

export interface VendorOfferDraft {
  categoryId: string
  serviceId: string
  rows: VendorAllocationRow[]
  notesTags: string
}

const EMPTY_DRAFT: VendorOfferDraft = {
  categoryId: '',
  serviceId: '',
  rows: [],
  notesTags: '',
}

const ALLOCATION_COL_WIDTH = {
  vendor: '25%',
  amount: '25%',
  upload: '25%',
  delete: '25%',
} as const

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  bgcolor: tokens.color.neutral[50],
  py: 1,
  px: 1.5,
} as const

const TABLE_CELL_SX = {
  fontSize: 12,
  py: 1,
  px: 1.5,
  verticalAlign: 'middle' as const,
}

const ALLOCATION_TABLE_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  overflow: 'hidden',
} as const

function newAllocationRow(amount = ''): VendorAllocationRow {
  return { id: `new-${Date.now()}`, vendorId: '', amount, file: null, isMeasurable: false }
}

function suggestedAllocationAmount(
  rows: VendorAllocationRow[],
  serviceAmount: number,
): string {
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const remaining = Math.max(0, serviceAmount - total)
  return remaining > 0 ? String(remaining) : ''
}

function hasDuplicateVendorIds(rows: VendorAllocationRow[]): boolean {
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row.vendorId) continue
    if (seen.has(row.vendorId)) return true
    seen.add(row.vendorId)
  }
  return false
}

export interface VendorOfferDrawerProps {
  open: boolean
  onClose: () => void
  vendorOptions: { id: string; label: string }[]
  categoryOptions: { id: string; label: string }[]
  getServiceOptions: (categoryId: string) => VendorOfferServiceOption[]
  existingRowsForService?: (categoryId: string, serviceId: string) => VendorAllocationRow[]
  getNotesForService?: (categoryId: string, serviceId: string) => string
  onSave: (draft: VendorOfferDraft) => void
}

export function VendorOfferDrawer({
  open,
  onClose,
  vendorOptions,
  categoryOptions,
  getServiceOptions,
  existingRowsForService,
  getNotesForService,
  onSave,
}: VendorOfferDrawerProps) {
  const [draft, setDraft] = useState<VendorOfferDraft>(EMPTY_DRAFT)
  const [duplicateVendorMessage, setDuplicateVendorMessage] = useState('')

  useEffect(() => {
    if (!open) {
      setDraft(EMPTY_DRAFT)
      setDuplicateVendorMessage('')
    }
  }, [open])

  const serviceOptions = useMemo(
    () => (draft.categoryId ? getServiceOptions(draft.categoryId) : []),
    [draft.categoryId, getServiceOptions],
  )

  const selectedService = useMemo(
    () => serviceOptions.find((s) => s.id === draft.serviceId) ?? null,
    [serviceOptions, draft.serviceId],
  )

  const serviceAmount = selectedService?.value ?? 0
  const hasAllocationRows = draft.rows.length > 0

  const totalAllocated = useMemo(
    () => draft.rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [draft.rows],
  )

  const remaining = serviceAmount - totalAllocated
  const overAllocated = totalAllocated > serviceAmount
  const duplicateVendors = hasDuplicateVendorIds(draft.rows)

  useEffect(() => {
    if (!open || !draft.categoryId || !draft.serviceId || !existingRowsForService) return
    const existing = existingRowsForService(draft.categoryId, draft.serviceId)
    const notesTags = getNotesForService?.(draft.categoryId, draft.serviceId) ?? ''
    if (existing.length > 0) {
      setDraft((prev) => ({ ...prev, rows: existing, notesTags }))
    } else if (notesTags) {
      setDraft((prev) => ({ ...prev, notesTags }))
    }
  }, [open, draft.categoryId, draft.serviceId, existingRowsForService, getNotesForService])

  useEffect(() => {
    if (!duplicateVendors) {
      setDuplicateVendorMessage('')
    }
  }, [duplicateVendors])

  const canSave =
    Boolean(draft.categoryId) &&
    Boolean(draft.serviceId) &&
    draft.rows.length > 0 &&
    draft.rows.every((r) => r.vendorId && Number(r.amount) > 0) &&
    totalAllocated > 0 &&
    !overAllocated &&
    !duplicateVendors

  function handleSubmit() {
    if (!canSave) return
    onSave(draft)
    onClose()
  }

  function handleCategoryChange(categoryId: string) {
    setDraft({ categoryId, serviceId: '', rows: [], notesTags: '' })
    setDuplicateVendorMessage('')
  }

  function handleServiceChange(serviceId: string) {
    setDraft((prev) => ({ ...prev, serviceId, rows: [], notesTags: '' }))
    setDuplicateVendorMessage('')
  }

  function handleAddVendor() {
    setDraft((prev) => ({
      ...prev,
      rows:
        prev.rows.length > 0
          ? prev.rows
          : [newAllocationRow(serviceAmount > 0 ? String(serviceAmount) : '')],
    }))
  }

  function vendorOptionsForRow(rowId: string): { id: string; label: string }[] {
    const usedByOthers = new Set(
      draft.rows.filter((r) => r.id !== rowId && r.vendorId).map((r) => r.vendorId),
    )
    return vendorOptions.filter((v) => !usedByOthers.has(v.id))
  }

  function handleVendorChange(rowId: string, vendorId: string) {
    if (vendorId) {
      const alreadyUsed = draft.rows.some((r) => r.id !== rowId && r.vendorId === vendorId)
      if (alreadyUsed) {
        setDuplicateVendorMessage('This vendor is already allocated to this service.')
        return
      }
    }
    setDuplicateVendorMessage('')
    updateRow(rowId, { vendorId })
  }

  function updateRow(rowId: string, patch: Partial<VendorAllocationRow>) {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }))
  }

  function removeRow(rowId: string) {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => r.id !== rowId),
    }))
    setDuplicateVendorMessage('')
  }

  function addRow() {
    setDraft((prev) => ({
      ...prev,
      rows: [...prev.rows, newAllocationRow(suggestedAllocationAmount(prev.rows, serviceAmount))],
    }))
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Vendor Offer"
      subtitle="Allocate vendors to a client offer service"
      onSubmit={handleSubmit}
      submitLabel="Save"
      submitDisabled={!canSave}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1.5,
          }}
        >
          <FormField label="Category" required>
            <Autocomplete
              size="small"
              fullWidth
              options={categoryOptions}
              value={categoryOptions.find((c) => c.id === draft.categoryId) ?? null}
              onChange={(_, next) => handleCategoryChange(next?.id ?? '')}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select category" sx={{ '& input': { fontSize: 12 } }} />
              )}
            />
          </FormField>
          <FormField label="Service" required>
            <Autocomplete
              size="small"
              fullWidth
              disabled={!draft.categoryId}
              options={serviceOptions}
              getOptionLabel={(opt) => opt.label}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              noOptionsText={draft.categoryId ? 'No services in this category' : 'Select a category first'}
              value={serviceOptions.find((s) => s.id === draft.serviceId) ?? null}
              onChange={(_, next) => handleServiceChange(next?.id ?? '')}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select service" sx={{ '& input': { fontSize: 12 } }} />
              )}
            />
          </FormField>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mb: 0.5 }}>
            Service Amount
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 600 }}>
            {draft.serviceId ? `₹${formatCurrency(serviceAmount)}` : '—'}
          </Typography>
          {draft.serviceId && serviceAmount > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              ₹{formatInr(serviceAmount)} from Client Offer
            </Typography>
          ) : null}
        </Box>

        <Divider />

        <Stack direction="row" gap={3} sx={{ p: 1.5, bgcolor: tokens.color.neutral[50], borderRadius: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
              ALLOCATED
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: 13,
                color: overAllocated ? 'error.main' : 'primary.main',
              }}
            >
              ₹{formatInr(totalAllocated)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
              REMAINING
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: 13,
                color: remaining < 0 ? 'error.main' : remaining === 0 ? 'success.main' : 'text.primary',
              }}
            >
              ₹{formatInr(Math.max(0, remaining))}
            </Typography>
          </Box>
        </Stack>

        {overAllocated ? (
          <Typography variant="caption" sx={{ fontSize: 11, color: 'error.main' }}>
            Total vendor allocation cannot exceed the service amount.
          </Typography>
        ) : null}

        {duplicateVendorMessage ? (
          <Typography variant="caption" sx={{ fontSize: 11, color: 'error.main' }}>
            {duplicateVendorMessage}
          </Typography>
        ) : null}

        {!hasAllocationRows ? (
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<Add sx={{ fontSize: 14 }} />}
            onClick={handleAddVendor}
            disabled={!draft.serviceId}
            sx={{ fontSize: 12, alignSelf: 'flex-start' }}
          >
            Add Vendor
          </MuiButton>
        ) : null}

        {hasAllocationRows ? (
          <Box sx={ALLOCATION_TABLE_SX}>
            <Table
              size="small"
              sx={{
                width: '100%',
                tableLayout: 'fixed',
                '& .MuiTableCell-root': { overflow: 'hidden' },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: ALLOCATION_COL_WIDTH.vendor }}>
                    Vendor
                  </TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: ALLOCATION_COL_WIDTH.amount }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: ALLOCATION_COL_WIDTH.upload }}>
                    Upload Quotation
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...TABLE_HEADER_SX, width: ALLOCATION_COL_WIDTH.delete }}
                  >
                    Delete
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {draft.rows.map((row) => {
                  const fileLabel = row.file?.name ?? row.existingFileName
                  const rowVendorOptions = vendorOptionsForRow(row.id)
                  const selectedVendor =
                    vendorOptions.find((v) => v.id === row.vendorId) ?? null
                  const autocompleteOptions =
                    selectedVendor && !rowVendorOptions.some((v) => v.id === selectedVendor.id)
                      ? [selectedVendor, ...rowVendorOptions]
                      : rowVendorOptions

                  return (
                    <TableRow key={row.id}>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Autocomplete
                          size="small"
                          fullWidth
                          options={autocompleteOptions}
                          value={selectedVendor}
                          onChange={(_, v) => handleVendorChange(row.id, v?.id ?? '')}
                          getOptionDisabled={(opt) =>
                            draft.rows.some((r) => r.id !== row.id && r.vendorId === opt.id)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Select vendor"
                              sx={{ '& input': { fontSize: 12 } }}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Stack gap={0.75}>
                          <TextField
                            size="small"
                            fullWidth
                            type="number"
                            value={row.amount}
                            onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }}
                            sx={{ '& input': { fontSize: 12, textAlign: 'right' } }}
                          />
                          <FormControlLabel
                            control={(
                              <Switch
                                checked={row.isMeasurable}
                                onChange={(e) =>
                                  updateRow(row.id, { isMeasurable: e.target.checked })
                                }
                                size="small"
                              />
                            )}
                            label="Measurable"
                            sx={{
                              m: 0,
                              alignItems: 'center',
                              '& .MuiFormControlLabel-label': { fontSize: 11 },
                            }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            gap: 0.25,
                            minHeight: 32,
                          }}
                        >
                          <MuiButton
                            size="small"
                            variant="outlined"
                            component="label"
                            startIcon={<Upload sx={{ fontSize: 14 }} />}
                            sx={{ fontSize: 11, height: 28, minWidth: 88 }}
                          >
                            Upload
                            <input
                              type="file"
                              hidden
                              accept=".pdf,.doc,.docx,.xlsx"
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null
                                updateRow(row.id, { file: f })
                                e.target.value = ''
                              }}
                            />
                          </MuiButton>
                          {fileLabel ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }} noWrap>
                              {fileLabel}
                            </Typography>
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={TABLE_CELL_SX}>
                        <MuiIconButton
                          size="small"
                          aria-label="Remove vendor row"
                          onClick={() => removeRow(row.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </MuiIconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <Box sx={{ p: 1, borderTop: `1px solid ${tokens.color.neutral[100]}` }}>
              <MuiButton
                size="small"
                variant="text"
                startIcon={<Add sx={{ fontSize: 14 }} />}
                onClick={addRow}
                sx={{ fontSize: 11 }}
              >
                Add another vendor
              </MuiButton>
            </Box>
          </Box>
        ) : null}

        <FormField label="Notes / Tags">
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={3}
            value={draft.notesTags}
            onChange={(e) => setDraft((prev) => ({ ...prev, notesTags: e.target.value }))}
            placeholder="Notes, remarks, tags, or references"
            sx={{ '& textarea': { fontSize: 12 } }}
          />
        </FormField>
      </Stack>
    </DrawerForm>
  )
}
