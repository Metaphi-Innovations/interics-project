import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  IconButton,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button, Modal, StatusBadge, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSectors, createSector, updateSector, toggleSectorStatus,
} from '@/slices/settings/thunk'
import type { SectorMaster } from '@/slices/settings/reducer'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'

const DATA_COL_COUNT = 2
const dataColWidth = settingsDataColWidth(DATA_COL_COUNT)

type SectorForm = { name: string; status: 'active' | 'inactive' }
const defaultForm: SectorForm = { name: '', status: 'active' }

export default function SectorsSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { sectors, saving } = useAppSelector(s => s.settings)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<SectorMaster | null>(null)
  const [form, setForm] = useState<SectorForm>(defaultForm)

  useEffect(() => {
    dispatch(fetchSectors())
  }, [dispatch])

  const filtered = sectors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setDrawerOpen(true)
  }

  const openEdit = (row: SectorMaster) => {
    setEditingRow(row)
    setForm({ name: row.name, status: row.status })
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      error('Sector name is required')
      return
    }
    const action = editingRow
      ? dispatch(updateSector({ id: editingRow.id, ...form, name: form.name.trim() }))
      : dispatch(createSector({ ...form, name: form.name.trim() }))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Sector updated' : 'Sector added')
      })
      .catch(() => error('Failed to save sector'))
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Sector Master</Typography>
          <Typography variant="caption" color="text.secondary">
            Customer sector values used in forms and listings
          </Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add Sector
        </Button>
      </Box>

      <TextField
        size="small"
        placeholder="Search sectors..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ width: 280, mb: 2 }}
      />

      <TableContainer sx={{ width: '100%' }}>
        <Table size="small" sx={SETTINGS_TABLE_SX}>
          <colgroup>
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
          </colgroup>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFB' }}>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Sector Name</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(row => (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 500 }}>{row.name}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                  <IconButton size="small" onClick={() => openEdit(row)}>
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => dispatch(toggleSectorStatus(row.id))}>
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

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRow ? 'Edit Sector' : 'Add Sector'}
        size="xs"
        footer={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="sm" variant="outlined" color="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            size="small"
            label="Sector Name"
            required
            fullWidth
            placeholder="e.g. Banking"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextField
            select
            size="small"
            label="Status"
            fullWidth
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as SectorForm['status'] }))}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Box>
      </Modal>
    </Box>
  )
}
