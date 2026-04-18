import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Drawer, MenuItem, IconButton,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Button } from '@/design-system/components'
import { StatusBadge } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSACCodes, createSACCode, updateSACCode, toggleSACCodeStatus,
  fetchGSTRates,
} from '@/slices/settings/thunk'
import type { SACCode } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'

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
        <Button variant="contained" color="primary" size="sm" onClick={openAdd}>+ Add SAC Code</Button>
      </Box>

      <TextField
        size="small"
        placeholder="Search SAC codes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ width: 280, mb: 2 }}
      />

      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFB' }}>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 120 }}>SAC Code</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 160 }}>GST Rate (linked)</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>Status</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 80 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map(row => {
            const linkedGST = gstRates.find(g => g.id === row.gstRateId)
            return (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{row.code}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{row.description}</TableCell>
                <TableCell>
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
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
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

      {/* Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 440, p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            {editingRow ? 'Edit SAC Code' : 'Add SAC Code'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              label="SAC Code"
              required
              placeholder="e.g. 998391"
              inputProps={{ maxLength: 6 }}
              value={form.code}
              onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setCodeError('') }}
              error={!!codeError}
              helperText={codeError}
            />
            <TextField
              size="small"
              label="Description"
              required
              placeholder="e.g. Interior Design Services"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              select
              size="small"
              label="GST Rate"
              required
              value={form.gstRateId}
              onChange={e => setForm(f => ({ ...f, gstRateId: e.target.value }))}
            >
              {activeGST.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.slabName} ({g.rate}%)</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as SACCode['status'] }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 4 }}>
            <Button size="sm" variant="outlined" color="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button size="sm" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
