import { useState, useEffect } from 'react'
import {
  Box, Typography, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, MenuItem, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button, Modal, StatusBadge, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchGSTRates, createGSTRate, updateGSTRate, toggleGSTRateStatus,
  fetchTDSSections, createTDSSection, updateTDSSection, toggleTDSSectionStatus,
} from '@/slices/settings/thunk'
import type { GSTRate, TDSSection } from '@/slices/settings/reducer'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'
import {
  requiredText,
  optionalMaxLength,
  requiredRateInput,
  requiredSelect,
  collectErrors,
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'

type GSTForm = Omit<GSTRate, 'id'>
type TDSForm = Omit<TDSSection, 'id'> & { appliesTo: TDSSection['appliesTo'] | '' }

const defaultGSTForm: GSTForm = { slabName: '', rate: 0, description: '', status: 'active' }
const defaultTDSForm: TDSForm = { section: '', description: '', defaultRate: 0, appliesTo: '', status: 'active' }
const GST_DATA_COL_COUNT = 4
const TDS_DATA_COL_COUNT = 5
const gstDataColWidth = settingsDataColWidth(GST_DATA_COL_COUNT)
const tdsDataColWidth = settingsDataColWidth(TDS_DATA_COL_COUNT)

function parseRateInput(raw: string): number {
  if (raw.trim() === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

type ToggleTarget =
  | { kind: 'gst'; row: GSTRate }
  | { kind: 'tds'; row: TDSSection }

export default function TaxConfigSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { gstRates, tdsSections, saving } = useAppSelector(s => s.settings)
  const [tab, setTab] = useState(0)

  const [gstDrawerOpen, setGstDrawerOpen] = useState(false)
  const [editingGST, setEditingGST] = useState<GSTRate | null>(null)
  const [gstForm, setGstForm] = useState<GSTForm>(defaultGSTForm)
  const [gstRateInput, setGstRateInput] = useState('')
  const [gstFieldErrors, setGstFieldErrors] = useState<Record<string, string>>({})

  const [tdsDrawerOpen, setTdsDrawerOpen] = useState(false)
  const [editingTDS, setEditingTDS] = useState<TDSSection | null>(null)
  const [tdsForm, setTdsForm] = useState<TDSForm>(defaultTDSForm)
  const [tdsRateInput, setTdsRateInput] = useState('')
  const [tdsFieldErrors, setTdsFieldErrors] = useState<Record<string, string>>({})

  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    dispatch(fetchGSTRates())
    dispatch(fetchTDSSections())
  }, [dispatch])

  const openAddGST = () => {
    setEditingGST(null)
    setGstForm(defaultGSTForm)
    setGstRateInput('')
    setGstFieldErrors({})
    setGstDrawerOpen(true)
  }
  const openEditGST = (row: GSTRate) => {
    setEditingGST(row)
    setGstForm({ slabName: row.slabName, rate: row.rate, description: row.description, status: row.status })
    setGstRateInput(String(row.rate))
    setGstFieldErrors({})
    setGstDrawerOpen(true)
  }
  const handleSaveGST = () => {
    const next = collectErrors([
      ['slabName', requiredText(gstForm.slabName, 'Slab Name', 100)],
      ['rate', requiredRateInput(gstRateInput, 'Rate')],
      ['description', optionalMaxLength(gstForm.description, 'Description', 500)],
    ])
    setGstFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
      return
    }
    const payload: GSTForm = {
      ...gstForm,
      slabName: gstForm.slabName.trim(),
      rate: parseRateInput(gstRateInput),
    }
    const action = editingGST
      ? dispatch(updateGSTRate({ id: editingGST.id, ...payload }))
      : dispatch(createGSTRate(payload))
    action.unwrap()
      .then(() => {
        setGstDrawerOpen(false)
        success(editingGST ? 'GST rate updated' : 'GST rate added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save GST rate')
        if (Object.keys(parsed.fieldErrors).length) setGstFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const openAddTDS = () => {
    setEditingTDS(null)
    setTdsForm(defaultTDSForm)
    setTdsRateInput('')
    setTdsFieldErrors({})
    setTdsDrawerOpen(true)
  }
  const openEditTDS = (row: TDSSection) => {
    setEditingTDS(row)
    setTdsForm({
      section: row.section,
      description: row.description,
      defaultRate: row.defaultRate,
      appliesTo: row.appliesTo,
      status: row.status,
    })
    setTdsRateInput(String(row.defaultRate))
    setTdsFieldErrors({})
    setTdsDrawerOpen(true)
  }
  const handleSaveTDS = () => {
    const next = collectErrors([
      ['section', requiredText(tdsForm.section, 'Section', 50)],
      ['defaultRate', requiredRateInput(tdsRateInput, 'Default Rate')],
      ['appliesTo', requiredSelect(tdsForm.appliesTo, 'Applies To')],
      ['description', optionalMaxLength(tdsForm.description, 'Description', 500)],
    ])
    setTdsFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
      return
    }
    const payload: Omit<TDSSection, 'id'> = {
      section: tdsForm.section.trim(),
      description: tdsForm.description,
      defaultRate: parseRateInput(tdsRateInput),
      appliesTo: tdsForm.appliesTo as TDSSection['appliesTo'],
      status: tdsForm.status,
    }
    const action = editingTDS
      ? dispatch(updateTDSSection({ id: editingTDS.id, ...payload }))
      : dispatch(createTDSSection(payload))
    action.unwrap()
      .then(() => {
        setTdsDrawerOpen(false)
        success(editingTDS ? 'TDS section updated' : 'TDS section added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save TDS section')
        if (Object.keys(parsed.fieldErrors).length) setTdsFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      if (toggleTarget.kind === 'gst') {
        await dispatch(toggleGSTRateStatus(toggleTarget.row.id)).unwrap()
        success(
          toggleTarget.row.status === 'active'
            ? 'GST rate deactivated'
            : 'GST rate activated',
        )
      } else {
        await dispatch(toggleTDSSectionStatus(toggleTarget.row.id)).unwrap()
        success(
          toggleTarget.row.status === 'active'
            ? 'TDS section deactivated'
            : 'TDS section activated',
        )
      }
      setToggleTarget(null)
    } catch (err) {
      const parsed = parseSettingsApiError(err, 'Failed to update status')
      error(parsed.message)
    } finally {
      setToggling(false)
    }
  }

  const toggleLabel = toggleTarget
    ? toggleTarget.kind === 'gst'
      ? toggleTarget.row.slabName
      : toggleTarget.row.section
    : ''
  const toggleNextActive = toggleTarget?.row.status !== 'active'

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={0.5}>Tax Configuration</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        GST slabs and TDS sections used across invoicing
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E8EEEC', mb: 3 }}>
        <Tab label="GST Rates" sx={{ textTransform: 'none', fontSize: 13 }} />
        <Tab label="TDS Sections" sx={{ textTransform: 'none', fontSize: 13 }} />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>Goods & Services Tax (GST) Slabs</Typography>
            <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAddGST}>
              Add Rate
            </Button>
          </Box>
          <TableContainer sx={{ width: '100%' }}>
          <Table size="small" sx={SETTINGS_TABLE_SX}>
            <colgroup>
              <col style={{ width: gstDataColWidth }} />
              <col style={{ width: gstDataColWidth }} />
              <col style={{ width: gstDataColWidth }} />
              <col style={{ width: gstDataColWidth }} />
              <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFB' }}>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Slab Name</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Rate %</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Description</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gstRates.map(row => (
                <TableRow key={row.id} sx={{ height: 44 }}>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.slabName}</TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.rate}%</TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.description}</TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                    <IconButton size="small" onClick={() => openEditGST(row)}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setToggleTarget({ kind: 'gst', row })}>
                      {row.status === 'active'
                        ? <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />
                        : <ToggleOff sx={{ fontSize: 14, color: 'error.main' }} />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>TDS Sections</Typography>
            <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAddTDS}>
              Add Section
            </Button>
          </Box>
          <TableContainer sx={{ width: '100%' }}>
          <Table size="small" sx={SETTINGS_TABLE_SX}>
            <colgroup>
              <col style={{ width: tdsDataColWidth }} />
              <col style={{ width: tdsDataColWidth }} />
              <col style={{ width: tdsDataColWidth }} />
              <col style={{ width: tdsDataColWidth }} />
              <col style={{ width: tdsDataColWidth }} />
              <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFB' }}>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Section</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Description</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Default Rate %</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Applies To</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
                <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tdsSections.map(row => (
                <TableRow key={row.id} sx={{ height: 44 }}>
                  <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 600 }}>{row.section}</TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.description}</TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.defaultRate}%</TableCell>
                  <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, textTransform: 'capitalize' }}>{row.appliesTo}</TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                    <IconButton size="small" onClick={() => openEditTDS(row)}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setToggleTarget({ kind: 'tds', row })}>
                      {row.status === 'active'
                        ? <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />
                        : <ToggleOff sx={{ fontSize: 14, color: 'error.main' }} />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Box>
      )}

      <Modal
        open={gstDrawerOpen}
        onClose={() => setGstDrawerOpen(false)}
        title={editingGST ? 'Edit GST Rate' : 'Add GST Rate'}
        size="xs"
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="sm" variant="outlined" color="secondary" onClick={() => setGstDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="contained" color="primary" onClick={handleSaveGST} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size="small"
            label="Slab Name"
            required
            fullWidth
            placeholder="e.g. GST 18%"
            value={gstForm.slabName}
            onChange={e => {
              setGstForm(f => ({ ...f, slabName: e.target.value }))
              setGstFieldErrors(errors => clearFieldError(errors, 'slabName'))
            }}
            error={!!gstFieldErrors.slabName}
            helperText={gstFieldErrors.slabName}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Rate (%)"
              type="number"
              required
              fullWidth
              placeholder="e.g. 18"
              value={gstRateInput}
              onChange={e => {
                setGstRateInput(e.target.value)
                setGstFieldErrors(errors => clearFieldError(errors, 'rate'))
              }}
              inputProps={{ min: 0, max: 100, step: 'any' }}
              sx={{ flex: 1, minWidth: 0 }}
              error={!!gstFieldErrors.rate}
              helperText={gstFieldErrors.rate}
            />
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={gstForm.status}
              onChange={e => setGstForm(f => ({ ...f, status: e.target.value as GSTRate['status'] }))}
              sx={{ flex: 1, minWidth: 0 }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
          <TextField
            size="small"
            label="Description"
            fullWidth
            placeholder="e.g. Standard Services Rate"
            value={gstForm.description}
            onChange={e => {
              setGstForm(f => ({ ...f, description: e.target.value }))
              setGstFieldErrors(errors => clearFieldError(errors, 'description'))
            }}
            error={!!gstFieldErrors.description}
            helperText={gstFieldErrors.description}
          />
        </Box>
      </Modal>

      <Modal
        open={tdsDrawerOpen}
        onClose={() => setTdsDrawerOpen(false)}
        title={editingTDS ? 'Edit TDS Section' : 'Add TDS Section'}
        size="xs"
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="sm" variant="outlined" color="secondary" onClick={() => setTdsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="contained" color="primary" onClick={handleSaveTDS} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size="small"
            label="Section"
            required
            fullWidth
            placeholder="e.g. 194C"
            value={tdsForm.section}
            onChange={e => {
              setTdsForm(f => ({ ...f, section: e.target.value }))
              setTdsFieldErrors(errors => clearFieldError(errors, 'section'))
            }}
            error={!!tdsFieldErrors.section}
            helperText={tdsFieldErrors.section}
          />
          <TextField
            size="small"
            label="Default Rate (%)"
            type="number"
            required
            fullWidth
            placeholder="e.g. 10"
            value={tdsRateInput}
            onChange={e => {
              setTdsRateInput(e.target.value)
              setTdsFieldErrors(errors => clearFieldError(errors, 'defaultRate'))
            }}
            inputProps={{ min: 0, max: 100, step: 'any' }}
            error={!!tdsFieldErrors.defaultRate}
            helperText={tdsFieldErrors.defaultRate}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              size="small"
              label="Applies To"
              required
              fullWidth
              value={tdsForm.appliesTo}
              onChange={e => {
                setTdsForm(f => ({ ...f, appliesTo: e.target.value as TDSForm['appliesTo'] }))
                setTdsFieldErrors(errors => clearFieldError(errors, 'appliesTo'))
              }}
              sx={{ flex: 1, minWidth: 0 }}
              error={!!tdsFieldErrors.appliesTo}
              helperText={tdsFieldErrors.appliesTo}
            >
              <MenuItem value="" disabled>
                Select
              </MenuItem>
              <MenuItem value="vendors">Vendors</MenuItem>
              <MenuItem value="clients">Clients</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={tdsForm.status}
              onChange={e => setTdsForm(f => ({ ...f, status: e.target.value as TDSSection['status'] }))}
              sx={{ flex: 1, minWidth: 0 }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
          <TextField
            size="small"
            label="Description"
            fullWidth
            value={tdsForm.description}
            onChange={e => {
              setTdsForm(f => ({ ...f, description: e.target.value }))
              setTdsFieldErrors(errors => clearFieldError(errors, 'description'))
            }}
            error={!!tdsFieldErrors.description}
            helperText={tdsFieldErrors.description}
          />
        </Box>
      </Modal>

      <Dialog open={!!toggleTarget} onClose={() => !toggling && setToggleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{toggleNextActive ? 'Activate' : 'Deactivate'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleNextActive
              ? `Activate "${toggleLabel}"?`
              : `Deactivate "${toggleLabel}"? It will no longer be available for new records.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button size="sm" variant="outlined" color="secondary" onClick={() => setToggleTarget(null)} disabled={toggling}>
            Cancel
          </Button>
          <Button size="sm" variant="contained" color="primary" onClick={() => void confirmToggle()} disabled={toggling}>
            {toggling ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
