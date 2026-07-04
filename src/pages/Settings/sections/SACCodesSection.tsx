import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  MenuItem, IconButton,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button, Modal, StatusBadge, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSACCodes, createSACCode, updateSACCode, toggleSACCodeStatus,
  fetchGSTRates,
} from '@/slices/settings/thunk'
import type { SACCode } from '@/slices/settings/reducer'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'

const SAC_DATA_COL_COUNT = 4
const sacDataColWidth = settingsDataColWidth(SAC_DATA_COL_COUNT)

type SACForm = Omit<SACCode, 'id' | 'gstRate'>

const defaultForm: SACForm = { code: '', description: '', gstRateId: '', status: 'active' }

export default function SACCodesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { sacCodes, gstRates, saving } = useAppSelector(s => s.settings)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<SACCode | null>(null)
  const [form, setForm] = useState<SACForm>(defaultForm)
  const [codeError, setCodeError] = useState('')

  useEffect(() => {
    dispatch(fetchSACCodes())
    dispatch(fetchGSTRates())
  }, [dispatch])

  const activeGST = gstRates.filter(g => g.status === 'active')

  const filtered = sacCodes.filter(s =>
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setCodeError('')
    setDrawerOpen(true)
  }

  const openEdit = (row: SACCode) => {
    setEditingRow(row)
    setForm({ code: row.code, description: row.description, gstRateId: row.gstRateId, status: row.status })
    setCodeError('')
    setDrawerOpen(true)
  }

  const handleSave = () => {
    // Validate uniqueness
    const duplicate = sacCodes.find(s => s.code === form.code && s.id !== editingRow?.id)
    if (duplicate) {
      setCodeError('SAC code must be unique')
      return
    }
    const linkedGST = gstRates.find(g => g.id === form.gstRateId)
    const payload = { ...form, gstRate: linkedGST?.rate }

    const action = editingRow
      ? dispatch(updateSACCode({ id: editingRow.id, ...payload }))
      : dispatch(createSACCode(payload))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'SAC code updated' : 'SAC code added')
      })
      .catch(() => error('Failed to save SAC code'))
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>SAC Code Master</Typography>
          <Typography variant="caption" color="text.secondary">Service Accounting Codes linked to GST rates</Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add SAC Code
        </Button>
      </Box>

      <TextField
        size="small"
        placeholder="Search SAC codes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ width: 280, mb: 2 }}
      />

      <TableContainer sx={{ width: '100%' }}>
      <Table size="small" sx={SETTINGS_TABLE_SX}>
        <colgroup>
          <col style={{ width: sacDataColWidth }} />
          <col style={{ width: sacDataColWidth }} />
          <col style={{ width: sacDataColWidth }} />
          <col style={{ width: sacDataColWidth }} />
          <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFB' }}>
            <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>SAC Code</TableCell>
            <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Description</TableCell>
            <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>GST Rate (linked)</TableCell>
            <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
            <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map(row => {
            const linkedGST = gstRates.find(g => g.id === row.gstRateId)
            return (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 600, fontFamily: 'monospace' }}>{row.code}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.description}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Chip
                      label={`${row.gstRate ?? linkedGST?.rate ?? 0}%`}
                      size="small"
                      sx={{ fontSize: 11, height: 20, bgcolor: '#E8F5F2', color: '#107E68' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {linkedGST?.slabName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                  <IconButton size="small" onClick={() => openEdit(row)}>
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => dispatch(toggleSACCodeStatus(row.id))}>
                    {row.status === 'active'
                      ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                      : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </TableContainer>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRow ? 'Edit SAC Code' : 'Add SAC Code'}
        size="sm"
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
            label="SAC Code"
            required
            fullWidth
            placeholder="e.g. 998391"
            inputProps={{ maxLength: 6 }}
            value={form.code}
            onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setCodeError('') }}
            error={!!codeError}
            helperText={codeError}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              size="small"
              label="GST Rate"
              required
              fullWidth
              value={form.gstRateId}
              onChange={e => setForm(f => ({ ...f, gstRateId: e.target.value }))}
              sx={{ flex: 1, minWidth: 0 }}
            >
              {activeGST.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.slabName} ({g.rate}%)</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as SACCode['status'] }))}
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
            placeholder="e.g. Interior Design Services"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </Box>
      </Modal>
    </Box>
  )
}
