import { useState, useEffect } from 'react'
import {
  Box, Typography, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Drawer, TextField, MenuItem, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import { Edit, ToggleOff, ToggleOn, DeleteOutline } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button } from '@/design-system/components'
import { StatusBadge } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchCategories, createCategory, updateCategory, toggleCategoryStatus,
} from '@/slices/settings/thunk'
import { settingsApi } from '@/api/settingsApi'
import type { Category } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'

type CategoryForm = { name: string; description: string; status: 'active' | 'inactive' }
const defaultForm: CategoryForm = { name: '', description: '', status: 'active' }

export default function CategoriesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { categories, saving } = useAppSelector(s => s.settings)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(defaultForm)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setDrawerOpen(true)
  }

  const openEdit = (row: Category) => {
    setEditingRow(row)
    setForm({ name: row.name, description: row.description, status: row.status })
    setDrawerOpen(true)
  }

  const handleSave = () => {
    const action = editingRow
      ? dispatch(updateCategory({ id: editingRow.id, servicesCount: editingRow.servicesCount, ...form }))
      : dispatch(createCategory(form))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Category updated' : 'Category added')
      })
      .catch(() => error('Failed to save category'))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await settingsApi.deleteCategory(deleteTarget.id)
      dispatch(fetchCategories())
      success('Category deleted')
    } catch {
      error('Failed to delete category')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Service Categories (SOW)</Typography>
          <Typography variant="caption" color="text.secondary">High-level groupings used in Pitch builder</Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add Category
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFB' }}>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Category Name</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Description</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>Services</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 100 }}>Status</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', width: 80 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(row => (
            <TableRow key={row.id} sx={{ height: 44 }}>
              <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{row.name}</TableCell>
              <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{row.description}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={`${row.servicesCount} services`}
                  sx={{
                    fontSize: 11,
                    height: 20,
                    bgcolor: row.servicesCount > 0 ? '#E8F5F2' : '#F3F4F6',
                    color: row.servicesCount > 0 ? '#107E68' : '#9CA3AF',
                  }}
                />
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <Edit sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton size="small" onClick={() => dispatch(toggleCategoryStatus(row.id))}>
                  {row.status === 'active'
                    ? <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                    : <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />}
                </IconButton>
                <Tooltip title={row.servicesCount > 0 ? 'Cannot delete — has services linked' : 'Delete'}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={row.servicesCount > 0}
                      onClick={() => setDeleteTarget(row)}
                      sx={{ color: 'error.main', '&.Mui-disabled': { opacity: 0.3 } }}
                    >
                      <DeleteOutline sx={{ fontSize: 14 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add/Edit Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={3}>
            {editingRow ? 'Edit Category' : 'Add Category'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              label="Category Name"
              required
              placeholder="e.g. Design & Diligence"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              size="small"
              label="Description"
              multiline
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Category['status'] }))}
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button size="sm" variant="outlined" color="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button size="sm" variant="contained" color="primary" onClick={handleDelete}
            sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
