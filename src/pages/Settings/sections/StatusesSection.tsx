import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import { Plus } from 'lucide-react'
import { useTheme } from '@mui/material/styles'
import { Button, Modal, StatusBadge, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchStatuses, createStatus, updateStatus, toggleStatusMaster,
} from '@/slices/settings/thunk'
import type { StatusMaster } from '@/slices/settings/reducer'
import { getStatusMasterChipColors } from '@/utils/masterChipStyles'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'
import {
  SettingsEditAction,
  SettingsTableActionsCell,
  SettingsToggleAction,
} from '../components/SettingsTableActions'

const DATA_COL_COUNT = 2
const dataColWidth = settingsDataColWidth(DATA_COL_COUNT)

type StatusForm = { name: string; status: 'active' | 'inactive' }
const defaultForm: StatusForm = { name: '', status: 'active' }

export default function StatusesSection() {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { statuses, saving } = useAppSelector(s => s.settings)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<StatusMaster | null>(null)
  const [form, setForm] = useState<StatusForm>(defaultForm)
  const [toggleTarget, setToggleTarget] = useState<StatusMaster | null>(null)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    dispatch(fetchStatuses())
  }, [dispatch])

  const filtered = statuses.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setDrawerOpen(true)
  }

  const openEdit = (row: StatusMaster) => {
    setEditingRow(row)
    setForm({ name: row.name, status: row.status })
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      error('Status name is required')
      return
    }
    const action = editingRow
      ? dispatch(updateStatus({ id: editingRow.id, ...form, name: form.name.trim() }))
      : dispatch(createStatus({ ...form, name: form.name.trim() }))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Status updated' : 'Status added')
      })
      .catch(() => error('Failed to save status'))
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await dispatch(toggleStatusMaster(toggleTarget.id)).unwrap()
      success(
        toggleTarget.status === 'active'
          ? 'Status deactivated'
          : 'Status activated',
      )
      setToggleTarget(null)
    } catch {
      error('Failed to update status')
    } finally {
      setToggling(false)
    }
  }

  const toggleNextActive = toggleTarget?.status !== 'active'

  const chipMode = theme.palette.mode === 'dark' ? 'dark' : 'light'

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Status Master</Typography>
          <Typography variant="caption" color="text.secondary">
            Project status values shown as colored chips across the app
          </Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add Status
        </Button>
      </Box>

      <TextField
        size="small"
        placeholder="Search statuses..."
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
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status Name</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(row => {
              const colors = getStatusMasterChipColors(row.name, chipMode)
              return (
                <TableRow key={row.id} sx={{ height: 44 }}>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                    <Chip
                      size="small"
                      label={row.name}
                      sx={{
                        height: 22,
                        fontSize: 11,
                        fontWeight: 600,
                        bgcolor: colors.bg,
                        color: colors.color,
                        border: 'none',
                        borderRadius: '20px',
                        '& .MuiChip-label': { px: '10px' },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <SettingsTableActionsCell>
                    <SettingsEditAction onClick={() => openEdit(row)} />
                    <SettingsToggleAction
                      active={row.status === 'active'}
                      onClick={() => setToggleTarget(row)}
                    />
                  </SettingsTableActionsCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRow ? 'Edit Status' : 'Add Status'}
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
            label="Status Name"
            required
            fullWidth
            placeholder="e.g. Execution Ongoing"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextField
            select
            size="small"
            label="Status"
            fullWidth
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusForm['status'] }))}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Box>
      </Modal>

      <Dialog open={!!toggleTarget} onClose={() => !toggling && setToggleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{toggleNextActive ? 'Activate' : 'Deactivate'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleNextActive
              ? `Activate "${toggleTarget?.name}"?`
              : `Deactivate "${toggleTarget?.name}"? It will no longer be available for new records.`}
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
