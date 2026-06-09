import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react'
import {
  Box,
  Stack,
  Typography,
  Drawer,
  Divider,
  TextField,
  IconButton as MuiIconButton,
  Button as MuiButton,
  Chip as MuiChip,
  Autocomplete,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { Add, Delete, Close, Edit as EditIcon, Upload, Visibility, InsertDriveFile } from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendors } from '@/slices/vendors/thunk'
import type { PitchService, VendorMapping } from '@/slices/pitch/reducer'
import { VendorMilestoneEditor } from '@/components/vendor/VendorMilestoneEditor'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import {
  normalizeVendorMapping,
  reapplyVendorAmountsFromPercentages,
  vendorMappingMilestoneBlockInvalid,
} from '@/utils/vendorMilestones'

export interface VendorMappingDrawerProps {
  open: boolean
  onClose: () => void
  service: PitchService | null
  onSave: (mappings: VendorMapping[]) => void
  initialMode?: 'view' | 'edit'
  /** When true, changing vendor clears milestones, retention, and measurable (PO Transition). */
  resetMilestonesOnVendorChange?: boolean
  /** PO Transition: persist quotation on the mapping immediately (parent updates draft). */
  onVendorQuotationChange?: (
    serviceId: string,
    mappingId: string,
    quotation: VendorMapping['quotation'] | undefined,
  ) => void
}

interface VendorOption {
  id: string
  name: string
}

export function VendorMappingDrawer({
  open,
  onClose,
  service,
  onSave,
  initialMode = 'view',
  resetMilestonesOnVendorChange = false,
  onVendorQuotationChange,
}: VendorMappingDrawerProps) {
  const theme = useTheme()
  const [mappings, setMappings] = useState<VendorMapping[]>([])
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const quoteFileInputRef = useRef<HTMLInputElement>(null)
  const [quotePickMappingId, setQuotePickMappingId] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])

  useEffect(() => {
    if (!vendorItems || vendorItems.length === 0) {
      void dispatch(fetchVendors({}))
    }
  }, [dispatch, vendorItems?.length])

  const vendorOptions: VendorOption[] = vendorItems
    .filter((v) => v.status === 'Active')
    .map((v) => ({
      id: v.id,
      name: v.name,
    }))

  useEffect(() => {
    if (service) {
      const rows = service.vendorMappings ?? []
      setMappings(
        rows.map((m) =>
          normalizeVendorMapping({
            ...m,
            milestones: m.milestones ?? [],
          }),
        ),
      )
    } else {
      setMappings([])
    }
  }, [service])

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  if (!service) return null

  /** Narrowed for callbacks — TS does not propagate null-narrowing into nested functions. */
  const activeService = service

  const totalMapped = mappings.reduce((sum, m) => sum + m.value, 0)
  const remaining = activeService.value - totalMapped

  function openQuoteFilePicker(mappingId: string) {
    setQuotePickMappingId(mappingId)
    requestAnimationFrame(() => quoteFileInputRef.current?.click())
  }

  function handleQuotationFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const mid = quotePickMappingId
    e.target.value = ''
    if (!file || !mid || !onVendorQuotationChange) return
    onVendorQuotationChange(activeService.id, mid, {
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    })
    setQuotePickMappingId(null)
  }

  function renderVendorQuotationBlock(mapping: VendorMapping) {
    const showInteractive = Boolean(onVendorQuotationChange)
    const q = mapping.quotation
    const uploaded = Boolean(q?.fileUrl && q?.fileName)
    const valueGtZero = mapping.value > 0
    if (!showInteractive && !uploaded) return null

    const statusLabel = uploaded ? 'Uploaded' : 'Pending'
    const statusColor = uploaded ? tokens.color.success[600] : tokens.color.warning[700]

    return (
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${tokens.color.neutral[100]}` }}>
        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
          Quotation
        </Typography>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: statusColor }}>
            {statusLabel}
          </Typography>
          {showInteractive && !valueGtZero && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
              Set a positive allocation to upload a quote.
            </Typography>
          )}
        </Stack>
        {uploaded && (
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
            <MuiChip
              icon={<InsertDriveFile sx={{ fontSize: 14 }} />}
              label={q!.fileName}
              size="small"
              sx={{ fontSize: 11, maxWidth: '100%' }}
            />
            <MuiButton
              size="small"
              variant="text"
              startIcon={<Visibility sx={{ fontSize: 14 }} />}
              onClick={() => window.open(q!.fileUrl, '_blank', 'noopener,noreferrer')}
              sx={{ fontSize: 11, minWidth: 0 }}
            >
              View
            </MuiButton>
            {showInteractive && valueGtZero && (
              <MuiButton
                size="small"
                variant="text"
                onClick={() => {
                  onVendorQuotationChange!(activeService.id, mapping.id, undefined)
                  openQuoteFilePicker(mapping.id)
                }}
                sx={{ fontSize: 11, minWidth: 0 }}
              >
                Replace
              </MuiButton>
            )}
          </Stack>
        )}
        {showInteractive && valueGtZero && !uploaded && (
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<Upload sx={{ fontSize: 14 }} />}
            onClick={() => openQuoteFilePicker(mapping.id)}
            sx={{ fontSize: 11, height: 28 }}
          >
            Upload
          </MuiButton>
        )}
      </Box>
    )
  }

  function addVendorMapping() {
    setMappings((prev) => [
      ...prev,
      {
        id: `vm-${Date.now()}`,
        vendorId: '',
        vendorName: '',
        value: 0,
        percentage: 0,
        milestones: [],
        isMeasurable: false,
      },
    ])
  }

  function removeMapping(idx: number) {
    setMappings((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateMapping(idx: number, field: keyof VendorMapping, val: unknown) {
    setMappings((prev) => {
      const updated = [...prev]
      let next: VendorMapping = { ...updated[idx], [field]: val } as VendorMapping
      if (field === 'value') {
        next.percentage = activeService.value > 0 ? Math.round((Number(val) / activeService.value) * 100) : 0
        next = reapplyVendorAmountsFromPercentages(next)
      }
      updated[idx] = next
      return updated
    })
  }

  function replaceMappingAt(mIdx: number, next: VendorMapping) {
    setMappings((prev) => prev.map((m, i) => (i === mIdx ? next : m)))
  }

  function setVendorAtIndex(mIdx: number, val: VendorOption | null) {
    const newId = val?.id ?? ''
    const newName = val?.name ?? ''
    setMappings((prev) => {
      const updated = [...prev]
      const cur = updated[mIdx]
      const prevVendorId = cur.vendorId
      if (resetMilestonesOnVendorChange && prevVendorId !== '' && newId !== prevVendorId) {
        updated[mIdx] = {
          ...cur,
          vendorId: newId,
          vendorName: newName,
          milestones: [],
          retention: undefined,
          isMeasurable: false,
          quotation: undefined,
        }
      } else {
        updated[mIdx] = { ...cur, vendorId: newId, vendorName: newName }
      }
      return updated
    })
  }

  const vendorPctSaveBlocked = useMemo(() => mappings.some((m) => vendorMappingMilestoneBlockInvalid(m)), [mappings])

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', lg: '560px' },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px 0 0 12px',
          borderLeft: `1px solid ${tokens.color.neutral[100]}`,
        },
      }}
    >
      <input
        ref={quoteFileInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.xlsx"
        onChange={handleQuotationFileInputChange}
      />
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: 15 }}>
            {mode === 'view' ? 'Vendor Mapping' : 'Edit Vendor Mapping'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: '2px' }}>
            {service.name}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1}>
          {mode === 'view' && (
            <MuiButton
              variant="outlined"
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => setMode('edit')}
              sx={{ height: 30, fontSize: 12 }}
            >
              Edit Vendor Mapping
            </MuiButton>
          )}
          <MuiIconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </MuiIconButton>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Stack direction="row" gap={3} sx={{ mb: 2, p: '10px 14px', bgcolor: tokens.color.neutral[50], borderRadius: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>SERVICE VALUE</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>₹{formatCurrency(service.value)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>MAPPED</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, color: 'primary.main' }}>₹{formatCurrency(totalMapped)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>REMAINING</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, color: remaining === 0 ? 'success.main' : 'text.secondary' }}>
              ₹{formatCurrency(remaining)}
            </Typography>
          </Box>
        </Stack>

        {mappings.map((mapping, mIdx) => {
          const ms = mapping.milestones ?? []
          const vendorMilestoneTotal =
            ms.reduce((sum, m) => sum + m.value, 0) + (mapping.retention?.amount ?? 0)
          const isExpanded = expandedVendor === mapping.id
          const hasMilestoneBreakdown = ms.length > 0 || Boolean(mapping.retention)

          if (mode === 'view') {
            return (
              <Box
                key={mapping.id}
                sx={{
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  padding: '12px',
                  mb: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: 13, mb: 1 }}>
                  {mapping.vendorName || '—'}
                </Typography>

                <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
                  <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.5px' }}>
                    ₹ VALUE
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: 13,
                      color: 'text.primary',
                      fontWeight: 500,
                    }}
                  >
                    ₹{formatCurrency(mapping.value)}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {mapping.percentage}% of service value
                  </Typography>
                </Stack>

                {hasMilestoneBreakdown && (
                  <>
                    <MuiButton
                      size="small"
                      variant="text"
                      onClick={() => setExpandedVendor(isExpanded ? null : mapping.id)}
                      sx={{ fontSize: 12, p: 0, mb: isExpanded ? 1 : 0 }}
                    >
                      {isExpanded
                        ? '▲ Hide Milestones'
                        : `▼ Vendor Milestones (${ms.length}${mapping.retention ? ' + retention' : ''})`}
                    </MuiButton>

                    {isExpanded && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                          Milestones
                        </Typography>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 80px 140px',
                            gap: 1,
                            mb: 1,
                            px: '10px',
                          }}
                        >
                          {['NAME', '%', '₹ VALUE'].map((h) => (
                            <Typography
                              key={h}
                              variant="overline"
                              sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.5px' }}
                            >
                              {h}
                            </Typography>
                          ))}
                        </Box>
                        {ms.map((vm) => (
                          <Box
                            key={vm.id}
                            sx={{
                              bgcolor: 'background.default',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              marginBottom: '6px',
                              display: 'grid',
                              gridTemplateColumns: '1fr 80px 140px',
                              gap: 1,
                              alignItems: 'center',
                            }}
                          >
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.name}</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.percentage}%</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">₹{formatCurrency(vm.value)}</Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                          Retention
                        </Typography>
                        {mapping.retention ? (
                          <Box
                            sx={{
                              bgcolor: 'action.hover',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              display: 'grid',
                              gridTemplateColumns: '1fr 80px 140px',
                              gap: 1,
                              alignItems: 'center',
                            }}
                          >
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <MuiChip label="Retention" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 600 }} />
                              <Typography variant="body2" fontWeight={500}>Retention</Typography>
                            </Stack>
                            <Typography variant="body2" fontWeight={500}>{mapping.retention.percentage}%</Typography>
                            <Typography variant="body2" fontWeight={500}>₹{formatCurrency(mapping.retention.amount)}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                            No retention defined
                          </Typography>
                        )}
                      </Box>
                    )}
                  </>
                )}
                {renderVendorQuotationBlock(mapping)}
              </Box>
            )
          }

          return (
            <Box
              key={mapping.id}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '12px',
              }}
            >
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                <Autocomplete
                  options={vendorOptions}
                  getOptionLabel={(o) => o.name}
                  value={vendorOptions.find((v) => v.id === mapping.vendorId) ?? null}
                  onChange={(_, val) => setVendorAtIndex(mIdx, val)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Select vendor..." sx={{ '& input': { fontSize: 12 } }} />
                  )}
                  sx={{ flex: 1 }}
                  size="small"
                />
                <MuiIconButton size="small" onClick={() => removeMapping(mIdx)} sx={{ color: 'error.main' }}>
                  <Delete sx={{ fontSize: 16 }} />
                </MuiIconButton>
              </Stack>

              <Stack direction="row" alignItems="center" gap={1.5}>
                <TextField
                  size="small"
                  type="number"
                  value={mapping.value}
                  onChange={(e) => updateMapping(mIdx, 'value', Number(e.target.value))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>₹</Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'action.hover',
                      borderRadius: '6px',
                    },
                    width: '180px',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                  {mapping.percentage}% of service value
                </Typography>
              </Stack>

              <FormControlLabel
                control={(
                  <Switch
                    checked={Boolean(mapping.isMeasurable)}
                    onChange={(e) => updateMapping(mIdx, 'isMeasurable', e.target.checked)}
                    size="small"
                  />
                )}
                label="Measurable"
                sx={{ mt: 1, display: 'flex', alignItems: 'center', '& .MuiFormControlLabel-label': { fontSize: 12 } }}
              />

              <MuiButton
                size="small"
                variant="text"
                onClick={() => setExpandedVendor(isExpanded ? null : mapping.id)}
                sx={{ mt: 1, fontSize: 12, p: 0 }}
              >
                {isExpanded ? '▲ Hide' : '▼ Vendor Milestones'}
                {hasMilestoneBreakdown && (
                  <MuiChip
                    label={vendorMilestoneTotal === mapping.value ? '✓' : `₹${formatCurrency(mapping.value - vendorMilestoneTotal)} unalloc.`}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 16,
                      fontSize: 10,
                      bgcolor: vendorMilestoneTotal === mapping.value
                        ? alpha(theme.palette.success.main, 0.12)
                        : alpha(theme.palette.warning.main, 0.12),
                      '& .MuiChip-label': { px: '6px' },
                    }}
                  />
                )}
              </MuiButton>

              {isExpanded && (
                <Box sx={{ mt: 1.5 }}>
                  <VendorMilestoneEditor mapping={mapping} onChange={(next) => replaceMappingAt(mIdx, next)} />
                </Box>
              )}
              {renderVendorQuotationBlock(mapping)}
            </Box>
          )
        })}

        {mode === 'edit' && (
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={addVendorMapping}
            sx={{
              fontSize: 12,
              color: 'primary.main',
              borderColor: 'primary.main',
              padding: '6px 14px',
              mt: 2,
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
            }}
          >
            Add Vendor
          </MuiButton>
        )}
      </Box>

      <Stack
        direction="row"
        justifyContent="flex-end"
        gap={1}
        sx={{ px: 3, py: 2, borderTop: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
      >
        {mode === 'view' ? (
          <MuiButton variant="outlined" size="small" onClick={onClose} sx={{ height: 32 }}>
            Close
          </MuiButton>
        ) : (
          <>
            <MuiButton variant="outlined" size="small" onClick={() => setMode('view')} sx={{ height: 32 }}>
              Cancel
            </MuiButton>
            <MuiButton
              variant="contained"
              size="small"
              disabled={vendorPctSaveBlocked}
              onClick={() => { onSave(mappings); onClose() }}
              sx={{ height: 32 }}
            >
              Save Vendor Mapping
            </MuiButton>
          </>
        )}
      </Stack>
    </Drawer>
  )
}
