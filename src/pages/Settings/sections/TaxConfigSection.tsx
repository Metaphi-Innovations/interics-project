import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, MenuItem, IconButton,
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
import { useEffect } from 'react'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'

type GSTForm = Omit<GSTRate, 'id'>
type TDSForm = Omit<TDSSection, 'id'>

const defaultGSTForm: GSTForm = { slabName: '', rate: 0, description: '', status: 'active' }
const defaultTDSForm: TDSForm = { section: '', description: '', defaultRate: 0, appliesTo: 'both', status: 'active' }
const GST_DATA_COL_COUNT = 4
const TDS_DATA_COL_COUNT = 5
const gstDataColWidth = settingsDataColWidth(GST_DATA_COL_COUNT)
const tdsDataColWidth = settingsDataColWidth(TDS_DATA_COL_COUNT)

export default function TaxConfigSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { gstRates, tdsSections, saving } = useAppSelector(s => s.settings)
  const [tab, setTab] = useState(0)

  // GST drawer state
  const [gstDrawerOpen, setGstDrawerOpen] = useState(false)
  const [editingGST, setEditingGST] = useState<GSTRate | null>(null)
  const [gstForm, setGstForm] = useState<GSTForm>(defaultGSTForm)

  // TDS drawer state
  const [tdsDrawerOpen, setTdsDrawerOpen] = useState(false)
  const [editingTDS, setEditingTDS] = useState<TDSSection | null>(null)
  const [tdsForm, setTdsForm] = useState<TDSForm>(defaultTDSForm)

  useEffect(() => {
    dispatch(fetchGSTRates())
    dispatch(fetchTDSSections())
  }, [dispatch])

  // --- GST handlers ---
  const openAddGST = () => {
    setEditingGST(null)
    setGstForm(defaultGSTForm)
    setGstDrawerOpen(true)
  }
  const openEditGST = (row: GSTRate) => {
    setEditingGST(row)
    setGstForm({ slabName: row.slabName, rate: row.rate, description: row.description, status: row.status })
    setGstDrawerOpen(true)
  }
  const handleSaveGST = () => {
    const action = editingGST
      ? dispatch(updateGSTRate({ id: editingGST.id, ...gstForm }))
      : dispatch(createGSTRate(gstForm))
    action.unwrap()
      .then(() => {
        setGstDrawerOpen(false)
        success(editingGST ? 'GST rate updated' : 'GST rate added')
      })
      .catch(() => error('Failed to save GST rate'))
  }
  const handleToggleGST = (row: GSTRate) => {
    dispatch(toggleGSTRateStatus(row.id))
  }

  // --- TDS handlers ---
  const openAddTDS = () => {
    setEditingTDS(null)
    setTdsForm(defaultTDSForm)
    setTdsDrawerOpen(true)
  }
  const openEditTDS = (row: TDSSection) => {
    setEditingTDS(row)
    setTdsForm({ section: row.section, description: row.description, defaultRate: row.defaultRate, appliesTo: row.appliesTo, status: row.status })
    setTdsDrawerOpen(true)
  }
  const handleSaveTDS = () => {
    const action = editingTDS
      ? dispatch(updateTDSSection({ id: editingTDS.id, ...tdsForm }))
      : dispatch(createTDSSection(tdsForm))
    action.unwrap()
      .then(() => {
        setTdsDrawerOpen(false)
        success(editingTDS ? 'TDS section updated' : 'TDS section added')
      })
      .catch(() => error('Failed to save TDS section'))
  }
  const handleToggleTDS = (row: TDSSection) => {
    dispatch(toggleTDSSectionStatus(row.id))
  }

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

      {/* GST Rates Tab */}
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
                    <IconButton size="small" onClick={() => handleToggleGST(row)}>
                      {row.status === 'active'
                        ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                        : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Box>
      )}

      {/* TDS Sections Tab */}
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
                    <IconButton size="small" onClick={() => handleToggleTDS(row)}>
                      {row.status === 'active'
                        ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                        : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Box>
      )}

      {/* GST Modal */}
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
            onChange={e => setGstForm(f => ({ ...f, slabName: e.target.value }))}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Rate (%)"
              type="number"
              required
              fullWidth
              placeholder="18"
              value={gstForm.rate}
              onChange={e => setGstForm(f => ({ ...f, rate: Number(e.target.value) }))}
              sx={{ flex: 1, minWidth: 0 }}
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
            onChange={e => setGstForm(f => ({ ...f, description: e.target.value }))}
          />
        </Box>
      </Modal>

      {/* TDS Modal */}
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
            onChange={e => setTdsForm(f => ({ ...f, section: e.target.value }))}
          />
          <TextField
            size="small"
            label="Default Rate (%)"
            type="number"
            required
            fullWidth
            value={tdsForm.defaultRate}
            onChange={e => setTdsForm(f => ({ ...f, defaultRate: Number(e.target.value) }))}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              size="small"
              label="Applies To"
              required
              fullWidth
              value={tdsForm.appliesTo}
              onChange={e => setTdsForm(f => ({ ...f, appliesTo: e.target.value as TDSSection['appliesTo'] }))}
              sx={{ flex: 1, minWidth: 0 }}
            >
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
            required
            fullWidth
            value={tdsForm.description}
            onChange={e => setTdsForm(f => ({ ...f, description: e.target.value }))}
          />
        </Box>
      </Modal>
    </Box>
  )
}
