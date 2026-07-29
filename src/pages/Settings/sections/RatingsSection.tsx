import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  IconButton, Chip,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { useTheme } from '@mui/material/styles'
import { Button, Modal, StatusBadge, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchRatings, createRating, updateRating, toggleRatingStatus,
} from '@/slices/settings/thunk'
import type { RatingMaster } from '@/slices/settings/reducer'
import { getRatingMasterChipColors } from '@/utils/masterChipStyles'
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

type RatingForm = { name: string; status: 'active' | 'inactive' }
const defaultForm: RatingForm = { name: '', status: 'active' }

export default function RatingsSection() {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { ratings, saving } = useAppSelector(s => s.settings)
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<RatingMaster | null>(null)
  const [form, setForm] = useState<RatingForm>(defaultForm)

  useEffect(() => {
    dispatch(fetchRatings())
  }, [dispatch])

  const filtered = ratings.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setDrawerOpen(true)
  }

  const openEdit = (row: RatingMaster) => {
    setEditingRow(row)
    setForm({ name: row.name, status: row.status })
    setDrawerOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      error('Rating name is required')
      return
    }
    const action = editingRow
      ? dispatch(updateRating({ id: editingRow.id, ...form, name: form.name.trim() }))
      : dispatch(createRating({ ...form, name: form.name.trim() }))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Rating updated' : 'Rating added')
      })
      .catch(() => error('Failed to save rating'))
  }

  const chipMode = theme.palette.mode === 'dark' ? 'dark' : 'light'

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Rating Master</Typography>
          <Typography variant="caption" color="text.secondary">
            Vendor rating values shown as colored chips across the app
          </Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add Rating
        </Button>
      </Box>

      <TextField
        size="small"
        placeholder="Search ratings..."
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
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Rating Name</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(row => {
              const colors = getRatingMasterChipColors(row.name, chipMode)
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
                  <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                    <IconButton size="small" onClick={() => openEdit(row)}>
                      <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => dispatch(toggleRatingStatus(row.id))}>
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
        title={editingRow ? 'Edit Rating' : 'Add Rating'}
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
            label="Rating Name"
            required
            fullWidth
            placeholder="e.g. Premium"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <TextField
            select
            size="small"
            label="Status"
            fullWidth
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as RatingForm['status'] }))}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Box>
      </Modal>
    </Box>
  )
}
