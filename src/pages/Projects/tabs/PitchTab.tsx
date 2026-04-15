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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
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
  ExpandMore,
  Description as DescriptionIcon,
  Download as DownloadIcon,
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

// ─── Service master list (SAC codes + GST rates) ─────────────────────────────

interface ServiceMaster {
  id: string
  name: string
  sacCode: string
  gstRate: number
  categoryId: string
}

const SERVICE_MASTER: ServiceMaster[] = [
  { id: 'svc-001', name: 'Interior Design', sacCode: '998391', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-002', name: 'Engineering Services', sacCode: '998392', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-003', name: 'Due Diligence', sacCode: '998393', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-004', name: 'Acoustic Consultancy', sacCode: '998312', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-005', name: 'Lighting Consultancy', sacCode: '998312', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-006', name: 'LEED Consultancy', sacCode: '998312', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-007', name: 'Local Approvals', sacCode: '999799', gstRate: 18, categoryId: 'cat-001' },
  { id: 'svc-008', name: 'Civil Works', sacCode: '995411', gstRate: 18, categoryId: 'cat-002' },
  { id: 'svc-009', name: 'Furniture & Fixtures Supply', sacCode: '995481', gstRate: 18, categoryId: 'cat-003' },
  { id: 'svc-010', name: 'MEP Works', sacCode: '995422', gstRate: 18, categoryId: 'cat-004' },
  { id: 'svc-011', name: 'AV & IT Installation', sacCode: '998841', gstRate: 18, categoryId: 'cat-005' },
  { id: 'svc-012', name: 'Signage & Branding', sacCode: '998395', gstRate: 18, categoryId: 'cat-006' },
  { id: 'svc-013', name: 'Landscaping', sacCode: '998531', gstRate: 18, categoryId: 'cat-007' },
  { id: 'svc-014', name: 'Project Management', sacCode: '998319', gstRate: 18, categoryId: 'cat-008' },
  { id: 'svc-015', name: 'Management Consultancy', sacCode: '998311', gstRate: 18, categoryId: 'cat-008' },
  { id: 'svc-016', name: 'Travel & Expenses', sacCode: '996412', gstRate: 5, categoryId: 'cat-001' },
  { id: 'svc-017', name: 'Other', sacCode: '999999', gstRate: 18, categoryId: 'cat-001' },
]

function formatLakh(value: number): string {
  return (value / 100000).toFixed(1) + ' L'
}

// ─── Version Management Bar ───────────────────────────────────────────────────

interface VersionBarProps {
  versions: PitchVersion[]
  activeVersionId: string | null
  onVersionChange: (id: string) => void
  onNewVersion: () => void
  onUploadQuotation: () => void
}

function VersionBar({ versions, activeVersionId, onVersionChange, onNewVersion, onUploadQuotation }: VersionBarProps) {
  const theme = useTheme()
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
              bgcolor: alpha(theme.palette.success.main, 0.12),
              color: 'success.main',
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

// ─── Financial Sidebar ────────────────────────────────────────────────────────

interface FinancialSidebarProps {
  version: PitchVersion
}

function FinancialSidebar({ version }: FinancialSidebarProps) {
  const margin =
    version.totalRevenue > 0
      ? ((version.profitability / version.totalRevenue) * 100)
      : 0

  const gstRate = 0.18
  const estGst = version.totalRevenue * gstRate
  const totalBilling = version.totalRevenue + estGst

  const theme = useTheme()
  const health =
    margin > 50 ? { label: 'Excellent', color: theme.palette.success.main } :
    margin > 30 ? { label: 'Good', color: theme.palette.warning.main } :
    margin > 10 ? { label: 'At Risk', color: '#EA580C' } :
    { label: 'Critical', color: theme.palette.error.main }

  // Expense summary (approx from vendor cost)
  const expenseTotal = version.totalCost

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 80,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Section 1 — Revenue Breakdown */}
      <Box>
        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}>
          Financial Summary
        </Typography>
        <Stack gap={0.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Base Revenue</Typography>
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, color: '#0D9488' }}>
              ₹{formatLakh(version.totalRevenue)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>Est. GST (18%)</Typography>
            <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
              +₹{formatLakh(estGst)}
            </Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>Total Billing</Typography>
            <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 700, color: 'primary.main' }}>
              ₹{formatLakh(totalBilling)}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5 }}>
            GST is a pass-through liability, not your revenue
          </Typography>
        </Stack>
      </Box>

      {/* Section 2 — Cost & Profit */}
      <Box>
        <Stack gap={0.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Total Cost</Typography>
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, color: '#EA580C' }}>
              ₹{formatLakh(version.totalCost)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Profitability</Typography>
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, color: 'success.main' }}>
              ₹{formatLakh(Math.abs(version.profitability))}
            </Typography>
          </Stack>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Margin</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'success.main' }}>
                {margin.toFixed(1)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(margin, 100)}
              color="success"
              sx={{ height: 5, borderRadius: 3 }}
            />
          </Box>
        </Stack>
      </Box>

      {/* Section 3 — Cash Flow Preview */}
      <Box>
        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 0.75 }}>
          Cash Flow Preview
        </Typography>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography variant="body2" sx={{ fontSize: 12, color: 'success.main', fontWeight: 600 }}>Positive</Typography>
        </Stack>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
          Based on milestone values
        </Typography>
      </Box>

      {/* Section 4 — Project Health */}
      <Box>
        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 0.75 }}>
          Project Health
        </Typography>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: health.color }} />
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: health.color }}>
            {health.label}
          </Typography>
        </Stack>
      </Box>

      {/* Section 5 — Expense Planning */}
      <Box>
        <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 0.75 }}>
          Expense Planning
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>Vendor Costs</Typography>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>₹{formatLakh(expenseTotal)}</Typography>
        </Stack>
      </Box>
    </Box>
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
      { id: `cm-${Date.now()}`, name: '', percentage: 0, value: 0 },
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
              <TableCell sx={{ ...cellSx, fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 44 }}>Actions</TableCell>
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
  const theme = useTheme()
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
                { id: `vml-${Date.now()}`, name: '', percentage: 0, value: 0 },
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
                            gridTemplateColumns: '1fr 80px 140px',
                            gap: '8px',
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
                        {mapping.milestones.map((vm) => (
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
                              gap: '8px',
                              alignItems: 'center',
                            }}
                          >
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.name}</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">{vm.percentage}%</Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">₹{formatCurrency(vm.value)}</Typography>
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
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px',
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
                        ? alpha(theme.palette.success.main, 0.12)
                        : alpha(theme.palette.warning.main, 0.12),
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
                      bgcolor: 'background.default',
                      borderRadius: '8px',
                      padding: '10px',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {/* Header row */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 130px 36px',
                        gap: 1,
                        px: 1,
                        py: 0.5,
                        mb: 0.5,
                      }}
                    >
                      {['NAME', '%', '₹ VALUE', 'ACTIONS'].map((h) => (
                        <Typography
                          key={h}
                          variant="caption"
                          sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                          {h}
                        </Typography>
                      ))}
                    </Box>

                    {/* Milestone rows */}
                    {mapping.milestones.map((vm, vIdx) => (
                      <Box
                        key={vm.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 130px 36px',
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
                      color: 'primary.main',
                      padding: '4px 8px',
                      mt: 1,
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
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
  const [value, setValue] = useState(service.value)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')

  // Try to find the matching master service by name
  const resolvedMaster = SERVICE_MASTER.find((s) => s.name === service.name)
  const sacCode = service.sacCode ?? resolvedMaster?.sacCode ?? '—'
  const gstRate = service.gstRate ?? resolvedMaster?.gstRate ?? 18

  const milestoneTotal = service.clientMilestones.reduce((sum, m) => sum + m.value, 0)
  const milestoneBalanced = milestoneTotal === service.value
  const milestoneDiff = service.value - milestoneTotal
  const vendorTotal = service.vendorMappings.reduce((sum, m) => sum + m.value, 0)

  const gstAmt = value * (gstRate / 100)
  const totalWithGst = value + gstAmt

  const cellSx = { py: '10px', px: '10px', fontSize: 12, borderBottom: `1px solid ${tokens.color.neutral[50]}`, verticalAlign: 'top' }

  function handleServiceSelect(svcId: string) {
    setSelectedServiceId(svcId)
    const master = SERVICE_MASTER.find((s) => s.id === svcId)
    if (master) {
      void dispatch(updateService({
        projectId, versionId, categoryId, serviceId: service.id,
        data: { name: master.name, sacCode: master.sacCode, gstRate: master.gstRate },
      }))
    }
  }

  function saveValue() {
    if (value !== service.value) {
      void dispatch(updateService({ projectId, versionId, categoryId, serviceId: service.id, data: { value } }))
    }
  }

  return (
    <TableRow sx={{ '&:hover': { bgcolor: tokens.color.neutral[50] }, '& td': { borderBottom: `1px solid ${tokens.color.neutral[50]}` } }}>
      {/* Service Name Dropdown */}
      <TableCell sx={cellSx}>
        <FormControl size="small" fullWidth>
          <MuiSelect
            value={selectedServiceId || (resolvedMaster?.id ?? '__custom__')}
            onChange={(e) => handleServiceSelect(e.target.value)}
            displayEmpty
            sx={{ fontSize: 12 }}
            renderValue={(val) => {
              if (val === '__custom__') return service.name || 'Select service...'
              const found = SERVICE_MASTER.find((s) => s.id === val)
              return found?.name ?? service.name
            }}
          >
            <MenuItem value="" disabled sx={{ fontSize: 12 }}>Select service...</MenuItem>
            {SERVICE_MASTER.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>{s.name}</MenuItem>
            ))}
          </MuiSelect>
        </FormControl>
      </TableCell>

      {/* SAC Code */}
      <TableCell sx={{ ...cellSx, width: 100 }}>
        <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>
          {sacCode}
        </Typography>
      </TableCell>

      {/* GST % */}
      <TableCell sx={{ ...cellSx, width: 80 }}>
        <MuiChip
          label={`${gstRate}%`}
          size="small"
          sx={{ fontSize: 11, height: 20, '& .MuiChip-label': { px: '6px' } }}
        />
      </TableCell>

      {/* Value + GST breakdown */}
      <TableCell sx={{ ...cellSx, width: 170 }}>
        <TextField
          size="small"
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onBlur={saveValue}
          InputProps={{
            startAdornment: <InputAdornment position="start" sx={{ '& p': { fontSize: 12 } }}>₹</InputAdornment>,
          }}
          sx={{ width: '150px', '& input': { fontSize: 12, textAlign: 'right' } }}
          inputProps={{ style: { textAlign: 'right' } }}
        />
        {value > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
              GST: +₹{formatCurrency(Math.round(gstAmt))}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block' }}>
              Total: ₹{formatCurrency(Math.round(totalWithGst))}
            </Typography>
          </Box>
        )}
      </TableCell>

      {/* Milestones */}
      <TableCell sx={{ ...cellSx, width: 130 }}>
        <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
          {service.clientMilestones.length > 0 ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              {milestoneBalanced
                ? <CheckCircle sx={{ fontSize: 12, color: theme.palette.success.main }} />
                : <Warning sx={{ fontSize: 12, color: theme.palette.warning.main }} />}
              <Typography variant="caption" sx={{ fontSize: 10, color: milestoneBalanced ? 'success.main' : 'warning.main' }}>
                {milestoneBalanced ? `${service.clientMilestones.length} set` : `₹${formatCurrency(milestoneDiff)} left`}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>None</Typography>
          )}
          <MuiButton size="small" variant="text" startIcon={<Visibility sx={{ fontSize: 11 }} />}
            sx={{ fontSize: 11, p: '2px 4px', minWidth: 0, height: 20 }}
            onClick={() => onEditMilestones(service)}>View</MuiButton>
        </Box>
      </TableCell>

      {/* Vendors */}
      <TableCell sx={{ ...cellSx, width: 130 }}>
        <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
          {service.vendorMappings.length > 0 ? (
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500 }}>
              ₹{formatCurrency(vendorTotal)} · {service.vendorMappings.length}v
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>None</Typography>
          )}
          <MuiButton size="small" variant="text" startIcon={<Visibility sx={{ fontSize: 11 }} />}
            sx={{ fontSize: 11, p: '2px 4px', minWidth: 0, height: 20 }}
            onClick={() => onEditVendors(service)}>View</MuiButton>
        </Box>
      </TableCell>

      {/* Delete */}
      <TableCell sx={{ ...cellSx, width: 36 }} align="center">
        <MuiIconButton size="small" onClick={onDelete}
          sx={{ color: tokens.color.neutral[300], '&:hover': { color: 'error.main' } }}>
          <Delete sx={{ fontSize: 15 }} />
        </MuiIconButton>
      </TableCell>
    </TableRow>
  )
}

// ─── Category Accordion ───────────────────────────────────────────────────────

interface CategoryAccordionProps {
  category: PitchCategory
  index: number
  projectId: string
  versionId: string
  onEditMilestones: (service: PitchService) => void
  onEditVendors: (service: PitchService) => void
}

function CategoryAccordion({ category, index, projectId, versionId, onEditMilestones, onEditVendors }: CategoryAccordionProps) {
  const dispatch = useAppDispatch()

  const categoryGstEstimate = category.totalValue * 0.18

  function handleAddService(e: React.MouseEvent) {
    e.stopPropagation()
    void dispatch(addService({
      projectId, versionId, categoryId: category.id,
      service: { name: '', value: 0, clientMilestones: [], vendorMappings: [] },
    }))
  }

  function handleDeleteService(serviceId: string) {
    void dispatch(deleteService({ projectId, versionId, categoryId: category.id, serviceId }))
  }

  const headCellSx = {
    py: '7px', px: '10px', fontSize: 10, fontWeight: 700,
    color: tokens.color.neutral[500], letterSpacing: 0.5, textTransform: 'uppercase' as const,
    borderBottom: `1px solid ${tokens.color.neutral[100]}`,
    bgcolor: tokens.color.neutral[50],
  }

  return (
    <Accordion
      defaultExpanded={index === 0}
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        boxShadow: 'none',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: 13 }}>
              {category.categoryName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {category.services.length} service{category.services.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: 13 }}>
              ₹{formatLakh(category.totalValue)}
            </Typography>
            <Typography variant="caption"
              sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1, fontSize: 10 }}>
              +GST est. ₹{formatLakh(categoryGstEstimate)}
            </Typography>
            <MuiIconButton size="small" onClick={handleAddService}>
              <Add sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0, px: 0, pb: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headCellSx, minWidth: 180 }}>Service Name</TableCell>
                <TableCell sx={{ ...headCellSx, width: 100 }}>SAC Code</TableCell>
                <TableCell sx={{ ...headCellSx, width: 70 }}>GST %</TableCell>
                <TableCell sx={{ ...headCellSx, width: 170 }}>Value (₹)</TableCell>
                <TableCell sx={{ ...headCellSx, width: 130 }}>Milestones</TableCell>
                <TableCell sx={{ ...headCellSx, width: 130 }}>Vendors</TableCell>
                <TableCell sx={{ ...headCellSx, width: 36 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {category.services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 3, textAlign: 'center', color: 'text.disabled', fontSize: 12 }}>
                    Click + to add a service
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
        <Stack direction="row" justifyContent="flex-end"
          sx={{ px: 2, py: 1, bgcolor: tokens.color.neutral[50], borderTop: `1px solid ${tokens.color.neutral[100]}` }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
            Category Total: ₹{formatCurrency(category.totalValue)}
          </Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>
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

  // Mock: no quotation uploaded yet (would come from version data in real impl)
  const hasQuotation = false
  const quotationMock = { fileName: 'Quotation_v1.pdf', uploadedDate: '15 Jan 2024' }

  return (
    <>
      {/* Version bar — full width above grid */}
      <VersionBar
        versions={versions}
        activeVersionId={activeVersionId}
        onVersionChange={handleVersionChange}
        onNewVersion={() => setNewVersionDialogOpen(true)}
        onUploadQuotation={() => setUploadQuotationOpen(true)}
      />

      {/* 2-column grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ── LEFT COLUMN ─────────────────────────────────────── */}
        <Box>
          {/* Uploaded Quotation Pill */}
          {hasQuotation && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, mb: 2,
              p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2,
            }}>
              <DescriptionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ flex: 1, fontSize: 13 }}>{quotationMock.fileName}</Typography>
              <Typography variant="caption" color="text.secondary">{quotationMock.uploadedDate}</Typography>
              <MuiIconButton size="small"><Visibility sx={{ fontSize: 15 }} /></MuiIconButton>
              <MuiIconButton size="small"><DownloadIcon sx={{ fontSize: 15 }} /></MuiIconButton>
            </Box>
          )}

          {/* Category Accordions */}
          {activeVersion?.categories.map((cat, idx) => (
            <CategoryAccordion
              key={cat.id}
              category={cat}
              index={idx}
              projectId={project.id}
              versionId={activeVersion.id}
              onEditMilestones={setMilestoneDrawerService}
              onEditVendors={setVendorDrawerService}
            />
          ))}

          {/* Add Category */}
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
        </Box>

        {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
        {activeVersion && <FinancialSidebar version={activeVersion} />}
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
