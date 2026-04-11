import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Drawer,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton as MuiIconButton,
  Autocomplete,
  Button as MuiButton,
  InputAdornment,
  Grid,
} from '@mui/material'
import {
  Add,
  Upload,
  CheckCircle,
  Warning,
  Delete,
  Close,
  Visibility,
  Edit as EditIcon,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { fetchVersions, createVersion, addCategory, addService, updateService, deleteService, updateMilestones, updateVendorMapping } from '../../../slices/pitch/thunk'
import { fetchVendors } from '../../../slices/vendors/thunk'
import { setActiveVersionId } from '../../../slices/pitch/reducer'
import type { PitchVersion, PitchCategory, PitchService, ClientMilestone, VendorMapping, VendorMilestone } from '../../../slices/pitch/reducer'
import type { Project } from '../../../slices/projects/reducer'
import { WorkspaceSection } from '../../../components/templates'
import { useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '../../../utils/formatters'

// ─── Default categories ───────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: 'cat-001', name: 'Design & Diligence' },
  { id: 'cat-002', name: 'Build Services' },
  { id: 'cat-003', name: 'Furniture & Fixtures' },
  { id: 'cat-004', name: 'MEP Works' },
  { id: 'cat-005', name: 'AV & IT' },
  { id: 'cat-006', name: 'Signage & Branding' },
  { id: 'cat-007', name: 'Landscaping' },
  { id: 'cat-008', name: 'Project Management' },
]

// ─── Version Management Bar ───────────────────────────────────────────────────

interface VersionBarProps {
  versions: PitchVersion[]
  activeVersionId: string | null
  onVersionChange: (id: string) => void
  onNewVersion: () => void
  onUploadQuotation: () => void
}

function VersionBar({ versions, activeVersionId, onVersionChange, onNewVersion, onUploadQuotation }: VersionBarProps) {
  const activeVersion = versions.find((v) => v.id === activeVersionId)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        bgcolor: tokens.color.neutral[50],
        p: '10px 16px',
        borderRadius: 2,
        mb: 2,
        border: `1px solid ${tokens.color.neutral[100]}`,
      }}
    >
      {/* Left: version selector */}
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="caption" sx={{ color: tokens.color.neutral[400], fontWeight: 600, letterSpacing: '0.6px', fontSize: 10 }}>
          VERSION
        </Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <MuiSelect
            value={activeVersionId ?? ''}
            onChange={(e) => onVersionChange(e.target.value)}
            displayEmpty
            sx={{ fontSize: 13 }}
            renderValue={(val) => {
              const v = versions.find((ver) => ver.id === val)
              if (!v) return ''
              const defaultLabel = `Version ${v.versionNumber}`
              return v.label !== defaultLabel ? `${defaultLabel} — ${v.label}` : defaultLabel
            }}
          >
            {versions.map((v) => {
              const defaultLabel = `Version ${v.versionNumber}`
              const display = v.label !== defaultLabel ? `${defaultLabel} — ${v.label}` : defaultLabel
              return (
                <MenuItem key={v.id} value={v.id} sx={{ fontSize: 13 }}>
                  {display}
                </MenuItem>
              )
            })}
          </MuiSelect>
        </FormControl>
        {activeVersion?.isActive && (
          <MuiChip
            label="Active"
            size="small"
            sx={{
              height: 20,
              fontSize: 10,
              bgcolor: tokens.color.success?.[50] ?? '#F0FDF4',
              color: tokens.color.success?.[700] ?? '#15803D',
              fontWeight: 600,
              '& .MuiChip-label': { px: '8px' },
            }}
          />
        )}
      </Stack>

      {/* Right: actions */}
      <Stack direction="row" alignItems="center" gap={1}>
        <MuiButton
          variant="outlined"
          size="small"
          startIcon={<Add fontSize="small" />}
          onClick={onNewVersion}
          sx={{ fontSize: 12, height: 32 }}
        >
          New Version
        </MuiButton>
        <MuiButton
          variant="outlined"
          size="small"
          startIcon={<Upload fontSize="small" />}
          onClick={onUploadQuotation}
          sx={{ fontSize: 12, height: 32 }}
        >
          Upload Quotation
        </MuiButton>
      </Stack>
    </Box>
  )
}

// ─── Financial Summary Strip ──────────────────────────────────────────────────

interface SummaryStripProps {
  version: PitchVersion
}

function SummaryStrip({ version }: SummaryStripProps) {
  const margin =
    version.totalRevenue > 0
      ? ((version.profitability / version.totalRevenue) * 100).toFixed(1)
      : '0.0'

  const cards = [
    {
      label: 'TOTAL REVENUE',
      value: `₹${formatCurrency(version.totalRevenue)}`,
      color: tokens.color.success?.[600] ?? '#16A34A',
      bg: tokens.color.success?.[50] ?? '#F0FDF4',
    },
    {
      label: 'TOTAL COST',
      value: `₹${formatCurrency(version.totalCost)}`,
      color: tokens.color.warning?.[600] ?? '#D97706',
      bg: tokens.color.warning?.[50] ?? '#FFFBEB',
    },
    {
      label: 'PROFITABILITY',
      value: `₹${formatCurrency(Math.abs(version.profitability))}`,
      color:
        version.profitability >= 0
          ? (tokens.color.success?.[600] ?? '#16A34A')
          : (tokens.color.error?.[600] ?? '#DC2626'),
      bg:
        version.profitability >= 0
          ? (tokens.color.success?.[50] ?? '#F0FDF4')
          : (tokens.color.error?.[50] ?? '#FEF2F2'),
    },
    {
      label: 'MARGIN %',
      value: `${margin}%`,
      color: tokens.color.info?.[600] ?? '#2563EB',
      bg: tokens.color.info?.[50] ?? '#EFF6FF',
    },
  ]

  return (
    <Grid
      container
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' },
        gap: '12px',
        mb: 2,
      }}
    >
      {cards.map((card) => (
        <Box
          key={card.label}
          sx={{
            p: '14px 16px',
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: card.bg,
          }}
        >
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: '0.8px', display: 'block' }}>
            {card.label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: '2px', color: card.color, fontSize: 16 }}>
            {card.value}
          </Typography>
        </Box>
      ))}
    </Grid>
  )
}

// ─── Milestone Drawer ─────────────────────────────────────────────────────────

interface MilestoneDrawerProps {
  open: boolean
  onClose: () => void
  service: PitchService | null
  onSave: (milestones: ClientMilestone[]) => void
  initialMode?: 'view' | 'edit'
}

function MilestoneDrawer({ open, onClose, service, onSave, initialMode = 'view' }: MilestoneDrawerProps) {
  const [milestones, setMilestones] = useState<ClientMilestone[]>([])
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)

  useEffect(() => {
    if (service) setMilestones(service.clientMilestones.map((m) => ({ ...m })))
  }, [service])

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  if (!service) return null

  const total = milestones.reduce((sum, m) => sum + m.value, 0)
  const remaining = service.value - total
  const balanced = total === service.value

  function updateMilestone(idx: number, field: keyof ClientMilestone, val: string | number | null) {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'percentage') {
        updated[idx].value = Math.round((Number(val) / 100) * service!.value)
      } else if (field === 'value') {
        updated[idx].percentage = service!.value > 0
          ? Math.round((Number(val) / service!.value) * 100)
          : 0
      }
      return updated
    })
  }

  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { id: `cm-${Date.now()}`, name: '', percentage: 0, value: 0, dueDate: null },
    ])
  }

  function removeMilestone(idx: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== idx))
  }

  const cellSx = { py: '6px', px: '8px', border: 'none' }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', lg: '620px' },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px 0 0 12px',
          borderLeft: `1px solid ${tokens.color.neutral[100]}`,
        },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: 15 }}>
            {mode === 'view' ? 'Client Milestones' : 'Edit Milestones'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: '2px' }}>
            {service.name} — ₹{formatCurrency(service.value)}
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
              Edit Milestones
            </MuiButton>
          )}
          <MuiIconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </MuiIconButton>
        </Stack>
      </Stack>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {/* Info */}
        <Stack direction="row" gap={3} sx={{ mb: 2, p: '10px 14px', bgcolor: tokens.color.neutral[50], borderRadius: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>SERVICE VALUE</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>₹{formatCurrency(service.value)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>ALLOCATED</Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, fontSize: 13, color: balanced ? 'success.main' : 'warning.main' }}
            >
              ₹{formatCurrency(total)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>REMAINING</Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, fontSize: 13, color: remaining === 0 ? 'success.main' : 'error.main' }}
            >
              ₹{formatCurrency(remaining)}
            </Typography>
          </Box>
        </Stack>

        {/* Validation banner */}
        {!balanced && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
            Milestone total must equal service value. ₹{formatCurrency(Math.abs(remaining))} {remaining > 0 ? 'remaining to allocate' : 'over-allocated'}.
          </Alert>
        )}

        {/* Milestones table */}
        <Table size="small" sx={{ mb: 1 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
              <TableCell sx={{ ...cellSx, fontSize: 11, fontWeight: 600, color: 'text.secondary', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ ...cellSx, fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 90 }}>%</TableCell>
              <TableCell sx={{ ...cellSx, fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 140 }}>₹ Value</TableCell>
              <TableCell sx={{ ...cellSx, fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 160 }}>Due Date</TableCell>
              <TableCell sx={{ ...cellSx, width: 36 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {milestones.map((m, idx) => (
              <TableRow key={m.id}>
                <TableCell sx={cellSx}>
                  <TextField
                    size="small"
                    value={m.name}
                    onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                    placeholder="Milestone name"
                    sx={{ '& input': { fontSize: 12 } }}
                    fullWidth
                    disabled={mode === 'view'}
                  />
                </TableCell>
                <TableCell sx={cellSx}>
                  <TextField
                    size="small"
                    type="number"
                    value={m.percentage}
                    onChange={(e) => updateMilestone(idx, 'percentage', Number(e.target.value))}
                    sx={{ width: 90, '& input': { fontSize: 12, textAlign: 'right' } }}
                    inputProps={{ min: 0, max: 100 }}
                    disabled={mode === 'view'}
                  />
                </TableCell>
                <TableCell sx={cellSx}>
                  <TextField
                    size="small"
                    type="number"
                    value={m.value}
                    onChange={(e) => updateMilestone(idx, 'value', Number(e.target.value))}
                    sx={{
                      width: 140,
                      '& input': {
                        fontSize: 12,
                        textAlign: 'right',
                        color: total > service.value ? 'error.main' : 'inherit',
                      },
                    }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start" sx={{ '& p': { fontSize: 12 } }}>₹</InputAdornment>,
                    }}
                    disabled={mode === 'view'}
                  />
                </TableCell>
                <TableCell sx={cellSx}>
                  <TextField
                    size="small"
                    type="date"
                    value={m.dueDate ?? ''}
                    onChange={(e) => updateMilestone(idx, 'dueDate', e.target.value || null)}
                    sx={{ width: 160, '& input': { fontSize: 12 } }}
                    disabled={mode === 'view'}
                  />
                </TableCell>
                <TableCell sx={cellSx}>
                  {mode === 'edit' && (
                    <MuiIconButton size="small" onClick={() => removeMilestone(idx)} sx={{ color: 'error.main' }}>
                      <Delete sx={{ fontSize: 16 }} />
                    </MuiIconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {mode === 'edit' && (
          <MuiButton
            size="small"
            startIcon={<Add fontSize="small" />}
            onClick={addMilestone}
            sx={{ fontSize: 12 }}
          >
            + Add Milestone
          </MuiButton>
        )}
      </Box>

      {/* Footer */}
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
              disabled={!balanced}
              onClick={() => { onSave(milestones); onClose() }}
              sx={{ height: 32 }}
            >
              Save Milestones
            </MuiButton>
          </>
        )}
      </Stack>
    </Drawer>
  )
}

// ─── Vendor Mapping Drawer ────────────────────────────────────────────────────

interface VendorMappingDrawerProps {
  open: boolean
  onClose: () => void
  service: PitchService | null
  onSave: (mappings: VendorMapping[]) => void
  initialMode?: 'view' | 'edit'
}

interface VendorOption {
  id: string
  name: string
  type: string
}

function VendorMappingDrawer({ open, onClose, service, onSave, initialMode = 'view' }: VendorMappingDrawerProps) {
  const [mappings, setMappings] = useState<VendorMapping[]>([])
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const dispatch = useAppDispatch()
  const vendorItems = useAppSelector((s) => s.vendors.items)

  useEffect(() => {
    if (!vendorItems || vendorItems.length === 0) {
      dispatch(fetchVendors({}))
    }
  }, [])

  const vendorOptions: VendorOption[] = vendorItems
    .filter((v) => v.status === 'Active')
    .map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
    }))

  useEffect(() => {
    if (service) setMappings(service.vendorMappings.map((m) => ({ ...m, milestones: [...m.milestones] })))
  }, [service])

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  if (!service) return null

  const totalMapped = mappings.reduce((sum, m) => sum + m.value, 0)
  const remaining = service.value - totalMapped

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
      },
    ])
  }

  function removeMapping(idx: number) {
    setMappings((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateMapping(idx: number, field: keyof VendorMapping, val: unknown) {
    setMappings((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'value') {
        updated[idx].percentage = service!.value > 0
          ? Math.round((Number(val) / service!.value) * 100)
          : 0
      }
      return updated
    })
  }

  function updateVendorMilestone(mIdx: number, vIdx: number, field: keyof VendorMilestone, val: string | number | null) {
    setMappings((prev) => {
      const updated = prev.map((m, i) => {
        if (i !== mIdx) return m
        const newMilestones = m.milestones.map((vm, vi) => {
          if (vi !== vIdx) return vm
          const updated2 = { ...vm, [field]: val }
          if (field === 'percentage') {
            updated2.value = Math.round((Number(val) / 100) * m.value)
          } else if (field === 'value') {
            updated2.percentage = m.value > 0
              ? Math.round((Number(val) / m.value) * 100)
              : 0
          }
          return updated2
        })
        return { ...m, milestones: newMilestones }
      })
      return updated
    })
  }

  function addVendorMilestone(mIdx: number) {
    setMappings((prev) =>
      prev.map((m, i) =>
        i !== mIdx
          ? m
          : {
              ...m,
              milestones: [
                ...m.milestones,
                { id: `vml-${Date.now()}`, name: '', percentage: 0, value: 0, dueDate: null },
              ],
            }
      )
    )
  }

  function removeVendorMilestone(mIdx: number, vIdx: number) {
    setMappings((prev) =>
      prev.map((m, i) =>
        i !== mIdx ? m : { ...m, milestones: m.milestones.filter((_, vi) => vi !== vIdx) }
      )
    )
  }

  const cellSx = { py: '4px', px: '6px', border: 'none', fontSize: 12 }

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
      {/* Header */}
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

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {/* Summary */}
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

        {/* Vendor cards */}
        {mappings.map((mapping, mIdx) => {
          const vendorMilestoneTotal = mapping.milestones.reduce((sum, m) => sum + m.value, 0)
          const isExpanded = expandedVendor === mapping.id

          if (mode === 'view') {
            return (
              <Box
                key={mapping.id}
                sx={{
                  backgroundColor: '#F8FAFB',
                  border: '1px solid #E2E8E6',
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
                      bgcolor: '#F3F3F5',
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

                {mapping.milestones.length > 0 && (
                  <>
                    <MuiButton
                      size="small"
                      variant="text"
                      onClick={() => setExpandedVendor(isExpanded ? null : mapping.id)}
                      sx={{ fontSize: 12, p: 0, mb: isExpanded ? 1 : 0 }}
                    >
                      {isExpanded ? '▲ Hide Milestones' : `▼ Vendor Milestones (${mapping.milestones.length})`}
                    </MuiButton>

                    {isExpanded && (
                      <Box sx={{ mt: 1 }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 80px 140px 150px',
                            gap: '8px',
                            mb: 1,
                            px: '10px',
                          }}
                        >
                          {['NAME', '%', '₹ VALUE', 'DUE DATE'].map((h) => (
                            <Typography
                              key={h}
                              variant="overline"
                              sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.5px' }}
                            >
                              {h}
                            </Typography>
                          ))}
                        </Box>
                        {mapping.milestones.map((vm) => (
                          <Box
                            key={vm.id}
                            sx={{
                              bgcolor: '#FAFAFA',
                              border: '1px solid #EEEEEE',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              marginBottom: '6px',
                              display: 'grid',
                              gridTemplateColumns: '1fr 80px 140px 150px',
                              gap: '8px',
                              alignItems: 'center',
                            }}
                          >
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.name}</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.percentage}%</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">₹{formatCurrency(vm.value)}</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.dueDate || '—'}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )
          }

          // Edit mode
          return (
            <Box
              key={mapping.id}
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8E6',
                borderRadius: '10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                padding: '14px',
                marginBottom: '12px',
              }}
            >
              {/* Vendor selector */}
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                <Autocomplete
                  options={vendorOptions}
                  getOptionLabel={(o) => o.name}
                  value={vendorOptions.find((v) => v.id === mapping.vendorId) ?? null}
                  onChange={(_, val) => {
                    updateMapping(mIdx, 'vendorId', val?.id ?? '')
                    updateMapping(mIdx, 'vendorName', val?.name ?? '')
                  }}
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

              {/* Value */}
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
                      backgroundColor: '#F3F3F5',
                      borderRadius: '6px',
                    },
                    width: '180px',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                  {mapping.percentage}% of service value
                </Typography>
              </Stack>

              {/* Vendor milestones toggle */}
              <MuiButton
                size="small"
                variant="text"
                onClick={() => setExpandedVendor(isExpanded ? null : mapping.id)}
                sx={{ mt: 1, fontSize: 12, p: 0 }}
              >
                {isExpanded ? '▲ Hide' : '▼ Vendor Milestones'}
                {mapping.milestones.length > 0 && (
                  <MuiChip
                    label={vendorMilestoneTotal === mapping.value ? '✓' : `₹${formatCurrency(mapping.value - vendorMilestoneTotal)} unalloc.`}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 16,
                      fontSize: 10,
                      bgcolor: vendorMilestoneTotal === mapping.value
                        ? (tokens.color.success?.[100] ?? '#DCFCE7')
                        : (tokens.color.warning?.[100] ?? '#FEF3C7'),
                      '& .MuiChip-label': { px: '6px' },
                    }}
                  />
                )}
              </MuiButton>

              {/* Vendor milestones (expandable) */}
              {isExpanded && (
                <Box sx={{ mt: 1.5 }}>
                  <Box
                    sx={{
                      backgroundColor: '#F8FAFB',
                      borderRadius: '8px',
                      padding: '10px',
                      border: '1px solid #EEEEEE',
                    }}
                  >
                    {/* Header row */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 130px 150px 36px',
                        gap: 1,
                        px: 1,
                        py: 0.5,
                        mb: 0.5,
                      }}
                    >
                      {['NAME', '%', '₹ VALUE', 'DUE DATE'].map((h) => (
                        <Typography
                          key={h}
                          variant="caption"
                          sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                          {h}
                        </Typography>
                      ))}
                      <Box />
                    </Box>

                    {/* Milestone rows */}
                    {mapping.milestones.map((vm, vIdx) => (
                      <Box
                        key={vm.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 130px 150px 36px',
                          gap: 1,
                          alignItems: 'center',
                          mb: 0.75,
                        }}
                      >
                        <TextField
                          size="small"
                          value={vm.name}
                          onChange={(e) => updateVendorMilestone(mIdx, vIdx, 'name', e.target.value)}
                          placeholder="Milestone name"
                          sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          value={vm.percentage}
                          onChange={(e) => updateVendorMilestone(mIdx, vIdx, 'percentage', Number(e.target.value))}
                          sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          value={vm.value}
                          onChange={(e) => updateVendorMilestone(mIdx, vIdx, 'value', Number(e.target.value))}
                          sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
                        />
                        <TextField
                          size="small"
                          type="date"
                          value={vm.dueDate ?? ''}
                          onChange={(e) => updateVendorMilestone(mIdx, vIdx, 'dueDate', e.target.value || null)}
                          sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
                        />
                        <MuiIconButton size="small" onClick={() => removeVendorMilestone(mIdx, vIdx)} sx={{ color: 'error.main' }}>
                          <Delete sx={{ fontSize: 14 }} />
                        </MuiIconButton>
                      </Box>
                    ))}
                  </Box>
                  <MuiButton
                    size="small"
                    variant="text"
                    startIcon={<Add sx={{ fontSize: 16 }} />}
                    onClick={() => addVendorMilestone(mIdx)}
                    sx={{
                      fontSize: 12,
                      color: '#107E68',
                      padding: '4px 8px',
                      mt: 1,
                      '&:hover': { backgroundColor: '#F0FDF9' },
                    }}
                  >
                    Add Milestone
                  </MuiButton>
                </Box>
              )}
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
              color: '#107E68',
              borderColor: '#107E68',
              padding: '6px 14px',
              mt: 2,
              '&:hover': { backgroundColor: '#F0FDF9' },
            }}
          >
            Add Vendor
          </MuiButton>
        )}
      </Box>

      {/* Footer */}
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

// ─── New Version Dialog ───────────────────────────────────────────────────────

interface NewVersionDialogProps {
  open: boolean
  onClose: () => void
  versions: PitchVersion[]
  onCreate: (label: string, copyFromVersionId?: string) => void
  saving: boolean
}

function NewVersionDialog({ open, onClose, versions, onCreate, saving }: NewVersionDialogProps) {
  const [label, setLabel] = useState('')
  const [baseOn, setBaseOn] = useState<string>('blank')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  useEffect(() => {
    if (open) { setLabel(''); setBaseOn('blank'); setAttachedFile(null) }
  }, [open])

  function handleCreate() {
    if (!label.trim()) return
    onCreate(label.trim(), baseOn === 'blank' ? undefined : baseOn)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>Create New Version</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: 12, display: 'block', mb: '4px' }}>
              Version Label
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Revised Proposal, Client V2"
              sx={{ '& input': { fontSize: 13 } }}
            />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: 12, display: 'block', mb: '4px' }}>
              Base On
            </Typography>
            <FormControl size="small" fullWidth>
              <MuiSelect value={baseOn} onChange={(e) => setBaseOn(e.target.value)} sx={{ fontSize: 13 }}>
                <MenuItem value="blank" sx={{ fontSize: 13 }}>Blank version</MenuItem>
                {versions.map((v) => (
                  <MenuItem key={v.id} value={v.id} sx={{ fontSize: 13 }}>
                    Copy from Version {v.versionNumber} — {v.label}
                  </MenuItem>
                ))}
              </MuiSelect>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: 12, display: 'block', mb: '4px' }}>
              Attach Document (optional)
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <MuiButton
                variant="outlined"
                component="label"
                startIcon={<Upload fontSize="small" />}
                size="small"
                sx={{ fontSize: 12 }}
              >
                Upload Document
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx"
                  hidden
                  onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                />
              </MuiButton>
              {attachedFile && (
                <MuiChip
                  label={attachedFile.name}
                  size="small"
                  onDelete={() => setAttachedFile(null)}
                  sx={{ maxWidth: 200, fontSize: 11 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose}>Cancel</MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          disabled={!label.trim() || saving}
          onClick={handleCreate}
        >
          Create Version
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── Add Category Dialog ──────────────────────────────────────────────────────

interface AddCategoryDialogProps {
  open: boolean
  onClose: () => void
  existingCategoryIds: string[]
  onAdd: (categoryId: string, categoryName: string) => void
}

function AddCategoryDialog({ open, onClose, existingCategoryIds, onAdd }: AddCategoryDialogProps) {
  const [selected, setSelected] = useState('')
  const available = DEFAULT_CATEGORIES.filter((c) => !existingCategoryIds.includes(c.id))

  useEffect(() => {
    if (open) setSelected('')
  }, [open])

  function handleAdd() {
    const cat = DEFAULT_CATEGORIES.find((c) => c.id === selected)
    if (cat) { onAdd(cat.id, cat.name); onClose() }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>Add Category</DialogTitle>
      <DialogContent>
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <MuiSelect
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            displayEmpty
            sx={{ fontSize: 13 }}
          >
            <MenuItem value="" sx={{ fontSize: 13 }}>Select category…</MenuItem>
            {available.map((c) => (
              <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13 }}>{c.name}</MenuItem>
            ))}
          </MuiSelect>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose}>Cancel</MuiButton>
        <MuiButton size="small" variant="contained" disabled={!selected} onClick={handleAdd}>
          Add Category
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── Service Row ──────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: PitchService
  projectId: string
  versionId: string
  categoryId: string
  onEditMilestones: (service: PitchService) => void
  onEditVendors: (service: PitchService) => void
  onDelete: () => void
}

function ServiceRow({ service, projectId, versionId, categoryId, onEditMilestones, onEditVendors, onDelete }: ServiceRowProps) {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(service.name)
  const [value, setValue] = useState(service.value)

  const milestoneTotal = service.clientMilestones.reduce((sum, m) => sum + m.value, 0)
  const milestoneBalanced = milestoneTotal === service.value
  const milestoneDiff = service.value - milestoneTotal
  const vendorTotal = service.vendorMappings.reduce((sum, m) => sum + m.value, 0)

  const cellSx = { py: '10px', px: '16px', fontSize: 12, borderBottom: `1px solid ${tokens.color.neutral[50]}` }

  function saveName() {
    setEditingName(false)
    if (name !== service.name) {
      void dispatch(updateService({ projectId, versionId, categoryId, serviceId: service.id, data: { name } }))
    }
  }

  function saveValue() {
    if (value !== service.value) {
      void dispatch(updateService({ projectId, versionId, categoryId, serviceId: service.id, data: { value } }))
    }
  }

  return (
    <TableRow
      sx={{
        '&:hover': { bgcolor: tokens.color.neutral[50] },
        '& td': { borderBottom: `1px solid ${tokens.color.neutral[50]}` },
      }}
    >
      {/* Name + subcategory caption */}
      <TableCell sx={cellSx}>
        {editingName ? (
          <TextField
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            autoFocus
            sx={{ '& input': { fontSize: 12 } }}
            fullWidth
          />
        ) : (
          <Box onClick={() => setEditingName(true)} sx={{ cursor: 'text' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>
              {service.name}
            </Typography>
            {(service.subcategoryName ?? service.customName) && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                {service.subcategoryName ?? service.customName}
              </Typography>
            )}
          </Box>
        )}
      </TableCell>

      {/* Value */}
      <TableCell sx={{ ...cellSx, width: 180 }} align="right">
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onBlur={saveValue}
          InputProps={{
            startAdornment: <InputAdornment position="start" sx={{ '& p': { fontSize: 12 } }}>₹</InputAdornment>,
          }}
          sx={{ width: '160px', '& input': { fontSize: 12, textAlign: 'right' } }}
          inputProps={{ style: { textAlign: 'right' } }}
        />
      </TableCell>

      {/* Milestones — View/Edit pattern */}
      <TableCell sx={{ ...cellSx, width: 180 }} align="center">
        <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
          {service.clientMilestones.length > 0 ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              {milestoneBalanced
                ? <CheckCircle sx={{ fontSize: 14, color: theme.palette.success.main }} />
                : <Warning sx={{ fontSize: 14, color: theme.palette.warning.main }} />
              }
              <Typography variant="caption" sx={{ fontSize: 10, color: milestoneBalanced ? 'success.main' : 'warning.main' }}>
                {milestoneBalanced
                  ? `${service.clientMilestones.length} milestones`
                  : `₹${formatCurrency(milestoneDiff)} unallocated`
                }
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>No milestones</Typography>
          )}
          <MuiButton
            size="small"
            variant="text"
            startIcon={<Visibility sx={{ fontSize: 12 }} />}
            sx={{ fontSize: 11, padding: '2px 6px', minWidth: 0, height: 22 }}
            onClick={() => onEditMilestones(service)}
          >
            View
          </MuiButton>
        </Box>
      </TableCell>

      {/* Vendors — View/Edit pattern */}
      <TableCell sx={{ ...cellSx, width: 180 }} align="center">
        <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
          {service.vendorMappings.length > 0 ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500 }}>
                ₹{formatCurrency(vendorTotal)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                · {service.vendorMappings.length} vendor{service.vendorMappings.length > 1 ? 's' : ''}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>No vendors</Typography>
          )}
          <MuiButton
            size="small"
            variant="text"
            startIcon={<Visibility sx={{ fontSize: 12 }} />}
            sx={{ fontSize: 11, padding: '2px 6px', minWidth: 0, height: 22 }}
            onClick={() => onEditVendors(service)}
          >
            View
          </MuiButton>
        </Box>
      </TableCell>

      {/* Actions */}
      <TableCell sx={{ ...cellSx, width: 48 }} align="center">
        <MuiIconButton
          size="small"
          onClick={onDelete}
          sx={{ color: tokens.color.neutral[300], '&:hover': { color: 'error.main' } }}
        >
          <Delete sx={{ fontSize: 16 }} />
        </MuiIconButton>
      </TableCell>
    </TableRow>
  )
}

// ─── Category Section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: PitchCategory
  projectId: string
  versionId: string
  onEditMilestones: (service: PitchService) => void
  onEditVendors: (service: PitchService) => void
}

function CategorySection({ category, projectId, versionId, onEditMilestones, onEditVendors }: CategorySectionProps) {
  const dispatch = useAppDispatch()

  function handleAddService() {
    void dispatch(
      addService({
        projectId,
        versionId,
        categoryId: category.id,
        service: {
          name: 'New Service',
          value: 0,
          clientMilestones: [],
          vendorMappings: [],
        },
      })
    )
  }

  function handleDeleteService(serviceId: string) {
    void dispatch(deleteService({ projectId, versionId, categoryId: category.id, serviceId }))
  }

  const headCellSx = {
    py: '8px',
    px: '16px',
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    bgcolor: tokens.color.neutral[50],
    borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  }

  return (
    <WorkspaceSection
      title={category.categoryName}
      noPadding
      action={
        <Stack direction="row" alignItems="center" gap={0.5}>
          <MuiButton
            size="small"
            variant="text"
            startIcon={<Add sx={{ fontSize: 14 }} />}
            onClick={handleAddService}
            sx={{ fontSize: 12 }}
          >
            Add Service
          </MuiButton>
        </Stack>
      }
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, minWidth: 200 }}>SERVICE NAME</TableCell>
              <TableCell sx={{ ...headCellSx, width: 180 }} align="right">VALUE (₹)</TableCell>
              <TableCell sx={{ ...headCellSx, width: 180 }} align="center">MILESTONES</TableCell>
              <TableCell sx={{ ...headCellSx, width: 180 }} align="center">VENDORS</TableCell>
              <TableCell sx={{ ...headCellSx, width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {category.services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
                  No services yet. Click "Add Service" to get started.
                </TableCell>
              </TableRow>
            ) : (
              category.services.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  projectId={projectId}
                  versionId={versionId}
                  categoryId={category.id}
                  onEditMilestones={onEditMilestones}
                  onEditVendors={onEditVendors}
                  onDelete={() => handleDeleteService(service.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Category total */}
      <Stack
        direction="row"
        justifyContent="flex-end"
        sx={{ px: 2, py: 1, bgcolor: tokens.color.neutral[50], borderTop: `1px solid ${tokens.color.neutral[100]}` }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
          Category Total: ₹{formatCurrency(category.totalValue)}
        </Typography>
      </Stack>
    </WorkspaceSection>
  )
}

// ─── PitchTab ─────────────────────────────────────────────────────────────────

interface PitchTabProps {
  project: Project
}

export default function PitchTab({ project }: PitchTabProps) {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { showToast } = useToast()

  const { versions, activeVersionId, activeVersion, loading, saving } = useAppSelector((s) => s.pitch)

  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false)
  const [milestoneDrawerService, setMilestoneDrawerService] = useState<PitchService | null>(null)
  const [vendorDrawerService, setVendorDrawerService] = useState<PitchService | null>(null)
  const [uploadQuotationOpen, setUploadQuotationOpen] = useState(false)
  const [quotationFile, setQuotationFile] = useState<File | null>(null)
  const [quotationNotes, setQuotationNotes] = useState('')

  useEffect(() => {
    void dispatch(fetchVersions(project.id))
  }, [dispatch, project.id])

  function handleVersionChange(id: string) {
    dispatch(setActiveVersionId(id))
  }

  function handleCreateVersion(label: string, copyFromVersionId?: string) {
    void dispatch(createVersion({ projectId: project.id, data: { label, copyFromVersionId } }))
    setNewVersionDialogOpen(false)
  }

  function handleAddCategory(categoryId: string, categoryName: string) {
    if (!activeVersionId) return
    void dispatch(
      addCategory({
        projectId: project.id,
        versionId: activeVersionId,
        category: {
          id: `pc-${Date.now()}`,
          categoryId,
          categoryName,
        },
      })
    )
  }

  function handleSaveMilestones(milestones: ClientMilestone[]) {
    if (!activeVersionId || !milestoneDrawerService) return
    void dispatch(
      updateMilestones({
        projectId: project.id,
        versionId: activeVersionId,
        serviceId: milestoneDrawerService.id,
        milestones,
      })
    )
  }

  function handleSaveVendorMapping(mappings: VendorMapping[]) {
    if (!activeVersionId || !vendorDrawerService) return
    void dispatch(
      updateVendorMapping({
        projectId: project.id,
        versionId: activeVersionId,
        serviceId: vendorDrawerService.id,
        mappings,
      })
    )
  }

  // Loading state
  if (loading && versions.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">Loading pitch data…</Typography>
      </Box>
    )
  }

  // No versions yet
  if (!loading && versions.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>No pitch versions yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create a version to start building the financial model.
        </Typography>
        <MuiButton
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => setNewVersionDialogOpen(true)}
        >
          + Start Planning
        </MuiButton>
        <NewVersionDialog
          open={newVersionDialogOpen}
          onClose={() => setNewVersionDialogOpen(false)}
          versions={versions}
          onCreate={handleCreateVersion}
          saving={saving}
        />
      </Box>
    )
  }

  const existingCategoryIds = activeVersion?.categories.map((c) => c.categoryId) ?? []

  return (
    <>
      {/* Version bar */}
      <VersionBar
        versions={versions}
        activeVersionId={activeVersionId}
        onVersionChange={handleVersionChange}
        onNewVersion={() => setNewVersionDialogOpen(true)}
        onUploadQuotation={() => setUploadQuotationOpen(true)}
      />

      {/* Financial summary */}
      {activeVersion && <SummaryStrip version={activeVersion} />}

      {/* Categories */}
      {activeVersion?.categories.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          projectId={project.id}
          versionId={activeVersion.id}
          onEditMilestones={setMilestoneDrawerService}
          onEditVendors={setVendorDrawerService}
        />
      ))}

      {/* Add category */}
      <Box sx={{ mt: 1 }}>
        <MuiButton
          variant="outlined"
          size="small"
          startIcon={<Add fontSize="small" />}
          onClick={() => setAddCategoryDialogOpen(true)}
          disabled={existingCategoryIds.length >= DEFAULT_CATEGORIES.length}
          sx={{ fontSize: 12 }}
        >
          + Add Category
        </MuiButton>
      </Box>

      {/* Dialogs & Drawers */}
      <NewVersionDialog
        open={newVersionDialogOpen}
        onClose={() => setNewVersionDialogOpen(false)}
        versions={versions}
        onCreate={handleCreateVersion}
        saving={saving}
      />

      <AddCategoryDialog
        open={addCategoryDialogOpen}
        onClose={() => setAddCategoryDialogOpen(false)}
        existingCategoryIds={existingCategoryIds}
        onAdd={handleAddCategory}
      />

      <MilestoneDrawer
        open={Boolean(milestoneDrawerService)}
        onClose={() => setMilestoneDrawerService(null)}
        service={milestoneDrawerService}
        onSave={handleSaveMilestones}
      />

      <VendorMappingDrawer
        open={Boolean(vendorDrawerService)}
        onClose={() => setVendorDrawerService(null)}
        service={vendorDrawerService}
        onSave={handleSaveVendorMapping}
      />

      {/* Upload Quotation Drawer */}
      <Drawer
        anchor="right"
        open={uploadQuotationOpen}
        onClose={() => setUploadQuotationOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', lg: '480px' },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px 0 0 12px',
            borderLeft: `1px solid ${tokens.color.neutral[100]}`,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ px: 3, py: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: 15 }}>Upload Quotation</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: '2px' }}>
              Attach reference quotation for this version
            </Typography>
          </Box>
          <MuiIconButton size="small" onClick={() => setUploadQuotationOpen(false)}>
            <Close fontSize="small" />
          </MuiIconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
              Version
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={activeVersion ? `Version ${activeVersion.versionNumber}${activeVersion.label !== `Version ${activeVersion.versionNumber}` ? ` — ${activeVersion.label}` : ''}` : ''}
              InputProps={{ readOnly: true }}
              sx={{ '& input': { fontSize: 13 } }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
              Quotation Document <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: 11 }}>
              PDF, Word or Excel, max 20MB
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <MuiButton
                variant="outlined"
                component="label"
                startIcon={<Upload fontSize="small" />}
                size="small"
                sx={{ fontSize: 13 }}
              >
                Upload Document
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx"
                  hidden
                  onChange={(e) => setQuotationFile(e.target.files?.[0] ?? null)}
                />
              </MuiButton>
              {quotationFile && (
                <MuiChip
                  label={quotationFile.name}
                  size="small"
                  onDelete={() => setQuotationFile(null)}
                  sx={{ maxWidth: 220, fontSize: 11 }}
                />
              )}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
              Notes <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>(optional)</Box>
            </Typography>
            <TextField
              multiline
              rows={2}
              fullWidth
              size="small"
              value={quotationNotes}
              onChange={(e) => setQuotationNotes(e.target.value)}
              placeholder="Any notes about this quotation..."
              sx={{ '& textarea': { fontSize: 13 } }}
            />
          </Box>
        </Box>

        <Stack
          direction="row"
          justifyContent="flex-end"
          gap={1}
          sx={{ px: 3, py: 2, borderTop: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
        >
          <MuiButton variant="outlined" size="small" onClick={() => setUploadQuotationOpen(false)} sx={{ height: 32 }}>
            Cancel
          </MuiButton>
          <MuiButton
            variant="contained"
            size="small"
            disabled={!quotationFile}
            onClick={() => {
              showToast({ title: 'Quotation uploaded', variant: 'success' })
              setUploadQuotationOpen(false)
              setQuotationFile(null)
              setQuotationNotes('')
            }}
            sx={{ height: 32 }}
          >
            Upload
          </MuiButton>
        </Stack>
      </Drawer>
    </>
  )
}
