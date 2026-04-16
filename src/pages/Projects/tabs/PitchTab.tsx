import { useState, useEffect, useMemo } from 'react'
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
  Switch,
  FormControlLabel,
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
import { selectPitchFinancials, sumPlannedExpensesOnVersion } from '../../../store/selectors/pitchSelectors'
import { fetchVersions, createVersion, addCategory, deleteCategory, addService, updateService, deleteService, updateMilestones, updateVendorMapping, updatePlannedExpenses } from '../../../slices/pitch/thunk'
import { fetchCategories } from '../../../slices/categories/thunk'
import { fetchVendors } from '../../../slices/vendors/thunk'
import { setActiveVersionId } from '../../../slices/pitch/reducer'
import type { PitchVersion, PitchCategory, PitchService, ClientMilestone, VendorMapping, PlannedExpense } from '../../../slices/pitch/reducer'
import type { Project } from '../../../slices/projects/reducer'
import { WorkspaceSection } from '../../../components/templates'
import { useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency, formatInr } from '../../../utils/formatters'
import { AddExpenseDrawer } from '@/components/expenses/AddExpenseDrawer'
import { VendorMappingDrawer } from '@/components/vendor/VendorMappingDrawer'
import { PitchFinancialSidebar } from '@/components/projects/PitchFinancialSidebar'
import type { Category } from '@/config/categories'
import { Trash2 } from 'lucide-react'

// ─── Service master rows (from category master list) ──────────────────────────

interface PitchServiceMasterRow {
  id: string
  name: string
  sacCode: string
  gstRate: number
  categoryId: string
}

function buildPitchServiceMaster(categories: Category[]): PitchServiceMasterRow[] {
  return categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      sacCode: sub.sacCode,
      gstRate: sub.gstRate,
      categoryId: cat.id,
    })),
  )
}

const ZERO_PITCH_VERSION: PitchVersion = {
  id: '__none__',
  projectId: '',
  versionNumber: 0,
  label: '',
  isActive: false,
  createdAt: '',
  categories: [],
  plannedExpenses: [],
  totalRevenue: 0,
  totalCost: 0,
  profitability: 0,
}

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
  const hasVersions = versions.length > 0
  const selectValue = hasVersions && activeVersionId && versions.some((v) => v.id === activeVersionId)
    ? activeVersionId
    : ''

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
            value={selectValue}
            onChange={(e) => onVersionChange(e.target.value)}
            displayEmpty
            disabled={!hasVersions}
            sx={{ fontSize: 13 }}
            renderValue={(val) => {
              if (!hasVersions || !val) return 'No versions yet'
              const v = versions.find((ver) => ver.id === val)
              if (!v) return 'No versions yet'
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
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Add fontSize="small" />}
          onClick={onNewVersion}
          sx={{ fontSize: 12, height: 32, fontWeight: 600 }}
        >
          + New Version
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
    if (service) setMilestones((service.clientMilestones ?? []).map((m) => ({ ...m })))
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
  masterCategories: Category[]
  existingCategoryIds: string[]
  onAdd: (categoryId: string, categoryName: string) => void
}

function AddCategoryDialog({ open, onClose, masterCategories, existingCategoryIds, onAdd }: AddCategoryDialogProps) {
  const [selected, setSelected] = useState('')
  const available = masterCategories.filter((c) => !existingCategoryIds.includes(c.id))

  useEffect(() => {
    if (open) setSelected('')
  }, [open])

  function handleAdd() {
    const cat = masterCategories.find((c) => c.id === selected)
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
  masterCategoryId: string
  pitchServiceMaster: PitchServiceMasterRow[]
  onEditMilestones: (service: PitchService) => void
  onEditVendors: (service: PitchService) => void
  onDelete: () => void
}

function ServiceRow({ service, projectId, versionId, categoryId, masterCategoryId, pitchServiceMaster, onEditMilestones, onEditVendors, onDelete }: ServiceRowProps) {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const [value, setValue] = useState(service.value)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')

  const servicesForCategory = pitchServiceMaster.filter((s) => s.categoryId === masterCategoryId)
  // Try to find the matching master service by name (within this category)
  const resolvedMaster = servicesForCategory.find((s) => s.name === service.name)
  const sacCode = service.sacCode ?? resolvedMaster?.sacCode ?? '—'
  const gstRate = service.gstRate ?? resolvedMaster?.gstRate ?? 18

  const clientMilestones = service.clientMilestones ?? []
  const vendorMappings = service.vendorMappings ?? []
  const milestoneTotal = clientMilestones.reduce((sum, m) => sum + m.value, 0)
  const milestoneBalanced = milestoneTotal === service.value
  const milestoneDiff = service.value - milestoneTotal
  const vendorTotal = vendorMappings.reduce((sum, m) => sum + m.value, 0)

  const gstAmt = value * (gstRate / 100)
  const totalWithGst = value + gstAmt

  const cellSx = { py: '10px', px: '10px', fontSize: 12, borderBottom: `1px solid ${tokens.color.neutral[50]}`, verticalAlign: 'top' }

  function handleServiceSelect(svcId: string) {
    setSelectedServiceId(svcId)
    const master = servicesForCategory.find((s) => s.id === svcId)
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
              const found = servicesForCategory.find((s) => s.id === val)
              return found?.name ?? service.name
            }}
          >
            <MenuItem value="" disabled sx={{ fontSize: 12 }}>Select service...</MenuItem>
            {servicesForCategory.map((s) => (
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
          {clientMilestones.length > 0 ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              {milestoneBalanced
                ? <CheckCircle sx={{ fontSize: 12, color: theme.palette.success.main }} />
                : <Warning sx={{ fontSize: 12, color: theme.palette.warning.main }} />}
              <Typography variant="caption" sx={{ fontSize: 10, color: milestoneBalanced ? 'success.main' : 'warning.main' }}>
                {milestoneBalanced ? `${clientMilestones.length} set` : `₹${formatCurrency(milestoneDiff)} left`}
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
          {vendorMappings.length > 0 ? (
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500 }}>
              ₹{formatCurrency(vendorTotal)} · {vendorMappings.length}v
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
  pitchServiceMaster: PitchServiceMasterRow[]
  onEditMilestones: (service: PitchService) => void
  onEditVendors: (service: PitchService) => void
}

function CategoryAccordion({ category, index, projectId, versionId, pitchServiceMaster, onEditMilestones, onEditVendors }: CategoryAccordionProps) {
  const dispatch = useAppDispatch()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const categoryGstEstimate = category.totalValue * 0.18

  function handleAddService() {
    void dispatch(addService({
      projectId, versionId, categoryId: category.id,
      service: { name: '', value: 0, clientMilestones: [], vendorMappings: [] },
    }))
  }

  function handleDeleteService(serviceId: string) {
    void dispatch(deleteService({ projectId, versionId, categoryId: category.id, serviceId }))
  }

  function confirmDeleteCategory() {
    void dispatch(deleteCategory({ projectId, versionId, categoryId: category.id }))
    setDeleteDialogOpen(false)
  }

  const headCellSx = {
    py: '7px', px: '10px', fontSize: 10, fontWeight: 700,
    color: tokens.color.neutral[500], letterSpacing: 0.5, textTransform: 'uppercase' as const,
    borderBottom: `1px solid ${tokens.color.neutral[100]}`,
    bgcolor: tokens.color.neutral[50],
  }

  return (
    <>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: 13 }}>
              ₹{formatLakh(category.totalValue)}
            </Typography>
            <Typography variant="caption"
              sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1, fontSize: 10 }}>
              +GST est. ₹{formatLakh(categoryGstEstimate)}
            </Typography>
            <MuiIconButton
              size="small"
              aria-label={`Delete category ${category.categoryName}`}
              onClick={(e) => {
                e.stopPropagation()
                setDeleteDialogOpen(true)
              }}
              sx={{ color: 'text.secondary' }}
            >
              <Trash2 size={14} strokeWidth={1.75} />
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
                    Use the &quot;+ Add Service&quot; button below to add a service to this category.
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
                    masterCategoryId={category.categoryId}
                    pitchServiceMaster={pitchServiceMaster}
                    onEditMilestones={onEditMilestones}
                    onEditVendors={onEditVendors}
                    onDelete={() => handleDeleteService(service.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Box>
        <MuiButton
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={handleAddService}
          sx={{
            mt: 1,
            mb: 1,
            ml: 1,
            borderStyle: 'dashed',
            color: 'primary.main',
            borderColor: 'primary.main',
            fontSize: 12,
            '&:hover': {
              borderStyle: 'dashed',
              backgroundColor: 'primary.main',
              color: 'white',
            },
          }}
        >
          + Add Service
        </MuiButton>
        <Stack direction="row" justifyContent="flex-end"
          sx={{ px: 2, py: 1, bgcolor: tokens.color.neutral[50], borderTop: `1px solid ${tokens.color.neutral[100]}` }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
            Category Total: ₹{formatCurrency(category.totalValue)}
          </Typography>
        </Stack>
      </AccordionDetails>
    </Accordion>

    <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>Delete category</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ fontSize: 13, pt: 0.5 }}>
          Delete {category.categoryName}? All services inside will also be removed.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={() => setDeleteDialogOpen(false)}>Cancel</MuiButton>
        <MuiButton size="small" variant="contained" color="error" onClick={confirmDeleteCategory}>
          Delete
        </MuiButton>
      </DialogActions>
    </Dialog>
    </>
  )
}

// ─── PitchTab ─────────────────────────────────────────────────────────────────

interface PitchTabProps {
  project: Project
}

export default function PitchTab({ project }: PitchTabProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()

  const { versions, activeVersionId, activeVersion, loading, saving } = useAppSelector((s) => s.pitch)
  const masterCategories = useAppSelector((s) => s.categories.items)
  const categoriesLoading = useAppSelector((s) => s.categories.loading)

  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false)
  const [milestoneDrawerService, setMilestoneDrawerService] = useState<PitchService | null>(null)
  const [vendorDrawerService, setVendorDrawerService] = useState<PitchService | null>(null)
  const [uploadQuotationOpen, setUploadQuotationOpen] = useState(false)
  const [quotationFile, setQuotationFile] = useState<File | null>(null)
  const [quotationNotes, setQuotationNotes] = useState('')
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false)
  const [expenseEditing, setExpenseEditing] = useState<PlannedExpense | null>(null)
  const [expenseDeleteTarget, setExpenseDeleteTarget] = useState<PlannedExpense | null>(null)

  const vendorItems = useAppSelector((s) => s.vendors.items)

  useEffect(() => {
    void dispatch(fetchVersions(project.id))
  }, [dispatch, project.id])

  useEffect(() => {
    void dispatch(fetchCategories())
  }, [dispatch])

  useEffect(() => {
    if (!vendorItems?.length) {
      void dispatch(fetchVendors({}))
    }
  }, [dispatch, vendorItems?.length])

  const existingCategoryIds = useMemo(
    () => activeVersion?.categories.map((c) => c.categoryId) ?? [],
    [activeVersion],
  )

  const pitchServiceMasterRows = useMemo(
    () => buildPitchServiceMaster(masterCategories),
    [masterCategories],
  )

  const availableMasterToAdd = useMemo(
    () => masterCategories.filter((c) => !existingCategoryIds.includes(c.id)),
    [masterCategories, existingCategoryIds],
  )

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vendorItems ?? []) {
      m.set(v.id, v.name)
    }
    return m
  }, [vendorItems])

  const versionForFinances = activeVersion ?? ZERO_PITCH_VERSION
  const finVersionId = versionForFinances.id === '__none__' ? null : versionForFinances.id
  const pitchFinMetrics = useAppSelector((s) => selectPitchFinancials(s, finVersionId))

  function handleVersionChange(id: string) {
    dispatch(setActiveVersionId(id))
  }

  function handleCreateVersion(label: string, copyFromVersionId?: string) {
    void dispatch(createVersion({ projectId: project.id, data: { label, copyFromVersionId } }))
    setNewVersionDialogOpen(false)
  }

  function handleAddCategory(categoryId: string, categoryName: string) {
    if (!activeVersion) return
    void dispatch(
      addCategory({
        projectId: project.id,
        versionId: activeVersion.id,
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
          {!activeVersion && (
            <Box
              sx={{
                py: 4,
                px: 2,
                mb: 2,
                textAlign: 'center',
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: tokens.color.neutral[50],
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                No version selected. Create a version to start building.
              </Typography>
            </Box>
          )}

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
          {activeVersion &&
            activeVersion.categories.map((cat, idx) => (
              <CategoryAccordion
                key={cat.id}
                category={cat}
                index={idx}
                projectId={project.id}
                versionId={activeVersion.id}
                pitchServiceMaster={pitchServiceMasterRows}
                onEditMilestones={setMilestoneDrawerService}
                onEditVendors={setVendorDrawerService}
              />
            ))}

          {/* Add Category */}
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <MuiButton
                variant="outlined"
                size="small"
                startIcon={<Add fontSize="small" />}
                onClick={() => setAddCategoryDialogOpen(true)}
                disabled={!activeVersion || categoriesLoading || availableMasterToAdd.length === 0}
                sx={{ fontSize: 12 }}
              >
                + Add Category
              </MuiButton>
              {activeVersion && !categoriesLoading && masterCategories.length > 0 && availableMasterToAdd.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
                  All categories have been added
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Expense Planning */}
          {activeVersion && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: 15 }}>
                  Expense Planning
                </Typography>
                <MuiButton
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<Add fontSize="small" />}
                  onClick={() => {
                    setExpenseEditing(null)
                    setExpenseDrawerOpen(true)
                  }}
                  sx={{ fontSize: 12, fontWeight: 600 }}
                >
                  + Add Expense
                </MuiButton>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                      <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Type</TableCell>
                      <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Name</TableCell>
                      <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Amount</TableCell>
                      <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Vendor(s)</TableCell>
                      <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500], width: 88 }} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(activeVersion.plannedExpenses ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 2, color: 'text.disabled', fontSize: 12 }}>
                          No planned expenses yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (activeVersion.plannedExpenses ?? []).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.type === 'additional'
                              ? 'Additional'
                              : row.type === 'vendor'
                                ? 'Vendor'
                                : 'Common'}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{row.name}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>₹{formatInr(row.amount)}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.type === 'additional' && '—'}
                            {row.type === 'vendor' &&
                              (vendorNameById.get(row.vendorId ?? '') ?? row.vendorId ?? '—')}
                            {row.type === 'common' &&
                              row.vendorSplits?.length &&
                              row.vendorSplits
                                .map(
                                  (s) =>
                                    `${vendorNameById.get(s.vendorId) ?? s.vendorId} (${s.percentage}%)`,
                                )
                                .join(', ')}
                            {row.type === 'common' && !row.vendorSplits?.length && '—'}
                          </TableCell>
                          <TableCell align="right">
                            <MuiIconButton
                              size="small"
                              aria-label="Edit expense"
                              onClick={() => {
                                setExpenseEditing(row)
                                setExpenseDrawerOpen(true)
                              }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </MuiIconButton>
                            <MuiIconButton
                              size="small"
                              aria-label="Delete expense"
                              onClick={() => setExpenseDeleteTarget(row)}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </MuiIconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Stack
                direction="row"
                justifyContent="flex-end"
                sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${tokens.color.neutral[100]}` }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                  Total Planned Expenses: ₹{formatInr(sumPlannedExpensesOnVersion(activeVersion))}
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>

        {/* ── RIGHT COLUMN ─────────────────────────────────────── */}
        <PitchFinancialSidebar version={versionForFinances} metrics={pitchFinMetrics} />
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
        masterCategories={masterCategories}
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
        key={vendorDrawerService?.id ?? 'closed'}
        open={Boolean(vendorDrawerService)}
        onClose={() => setVendorDrawerService(null)}
        service={vendorDrawerService}
        onSave={handleSaveVendorMapping}
      />

      <AddExpenseDrawer
        open={expenseDrawerOpen}
        onClose={() => {
          setExpenseDrawerOpen(false)
          setExpenseEditing(null)
        }}
        version={activeVersion}
        projectId={project.id}
        editingExpense={expenseEditing}
      />

      <Dialog open={Boolean(expenseDeleteTarget)} onClose={() => setExpenseDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>Delete expense</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 13, pt: 0.5 }}>
            Delete this expense?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setExpenseDeleteTarget(null)}>Cancel</MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              if (!activeVersion || !expenseDeleteTarget) return
              const next = (activeVersion.plannedExpenses ?? []).filter((e) => e.id !== expenseDeleteTarget.id)
              void dispatch(
                updatePlannedExpenses({
                  projectId: project.id,
                  versionId: activeVersion.id,
                  expenses: next,
                }),
              )
              setExpenseDeleteTarget(null)
            }}
          >
            Delete
          </MuiButton>
        </DialogActions>
      </Dialog>

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
