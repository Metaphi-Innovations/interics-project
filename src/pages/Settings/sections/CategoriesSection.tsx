import { useEffect, useState } from 'react'
import {
  Box, Typography, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, MenuItem, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material'
import { Edit, DeleteOutline } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button, Modal, useToast } from '@/design-system/components'
import {
  FilterableSortHeader,
  SettingsSearchBar,
  StatusColumnToggle,
  useListingQuery,
  type ColumnFilterOption,
} from '@/components/listing'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchCategories, createCategory, updateCategory, toggleCategoryStatus,
} from '@/slices/settings/thunk'
import { categoriesService } from '@/modules/system-settings/category/category.service'
import type { Category } from '@/slices/settings/reducer'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'
import {
  requiredAlphabeticName,
  optionalMaxLength,
  collectErrors,
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'

const CATEGORY_DATA_COL_COUNT = 4
const categoryDataColWidth = settingsDataColWidth(CATEGORY_DATA_COL_COUNT)

type CategoryForm = { name: string; description: string; status: 'active' | 'inactive' }
const defaultForm: CategoryForm = { name: '', description: '', status: 'active' }
type CategoryFilterOptions = {
  name: ColumnFilterOption[]
  description: ColumnFilterOption[]
  isActive: ColumnFilterOption[]
}

export default function CategoriesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { categories, saving } = useAppSelector(s => s.settings)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(defaultForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null)
  const [toggling, setToggling] = useState(false)
  const listing = useListingQuery({ pageSize: 100 })
  const [sortField, setSortField] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterOptions, setFilterOptions] = useState<CategoryFilterOptions>({
    name: [],
    description: [],
    isActive: [],
  })
  const search = listing.search.trim()
  const isSearchPending = search.length > 0 && search !== listing.debouncedSearch

  useEffect(() => {
    void categoriesService.getFilters()
      .then((data) => {
        setFilterOptions({
          name: data.name ?? [],
          description: data.description ?? [],
          isActive: data.isActive ?? [],
        })
      })
      .catch(() => undefined)
  }, [dispatch])

  useEffect(() => {
    if (isSearchPending) return
    void dispatch(fetchCategories({
      force: true,
      search: listing.debouncedSearch || undefined,
      name: listing.filters.name,
      description: listing.filters.description,
      isActive: listing.filters.isActive,
      sortBy: sortField,
      sortOrder: sortField ? sortDirection : undefined,
    }))
  }, [dispatch, isSearchPending, listing.debouncedSearch, listing.filters, search, sortDirection, sortField])

  const applyColumnFilter = (key: string) => (value: string) => {
    listing.setFilter(key, value)
  }

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field)
    setSortDirection(direction)
  }

  const handleReset = () => {
    listing.setSearch('')
    listing.setFilters({})
    setSortField(undefined)
    setSortDirection('asc')
  }

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setFieldErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (row: Category) => {
    setEditingRow(row)
    setForm({ name: row.name, description: row.description, status: row.status })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  const handleSave = () => {
    const next = collectErrors([
      ['name', requiredAlphabeticName(form.name, 'Category Name', 100)],
      ['description', optionalMaxLength(form.description, 'Description', 500)],
    ])
    setFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
      return
    }
    const action = editingRow
      ? dispatch(updateCategory({ id: editingRow.id, servicesCount: editingRow.servicesCount, ...form }))
      : dispatch(createCategory(form))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Category updated' : 'Category added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save category')
        if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await categoriesService.remove(deleteTarget.id)
      void dispatch(fetchCategories({
        force: true,
        search: listing.debouncedSearch || undefined,
        name: listing.filters.name,
        description: listing.filters.description,
        isActive: listing.filters.isActive,
        sortBy: sortField,
        sortOrder: sortField ? sortDirection : undefined,
      }))
      success('Category deleted')
    } catch (err) {
      const parsed = parseSettingsApiError(err, 'Failed to delete category')
      error(parsed.message)
    } finally {
      setDeleteTarget(null)
    }
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await dispatch(toggleCategoryStatus(toggleTarget.id)).unwrap()
      void dispatch(fetchCategories({
        force: true,
        search: listing.debouncedSearch || undefined,
        name: listing.filters.name,
        description: listing.filters.description,
        isActive: listing.filters.isActive,
        sortBy: sortField,
        sortOrder: sortField ? sortDirection : undefined,
      }))
      success(
        toggleTarget.status === 'active'
          ? 'Category deactivated'
          : 'Category activated',
      )
      setToggleTarget(null)
    } catch (err) {
      const parsed = parseSettingsApiError(err, 'Failed to update status')
      error(parsed.message)
    } finally {
      setToggling(false)
    }
  }

  const toggleNextActive = toggleTarget?.status !== 'active'

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

      <SettingsSearchBar
        placeholder="Search categories..."
        value={listing.search}
        onChange={listing.setSearch}
        onReset={handleReset}
      />

      <TableContainer sx={{ width: '100%' }}>
      <Table size="small" sx={SETTINGS_TABLE_SX}>
        <colgroup>
          <col style={{ width: categoryDataColWidth }} />
          <col style={{ width: categoryDataColWidth }} />
          <col style={{ width: categoryDataColWidth }} />
          <col style={{ width: categoryDataColWidth }} />
          <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFB' }}>
            <FilterableSortHeader
              label="Category Name"
              field="name"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.name ?? ''}
              filterOptions={filterOptions.name}
              onFilter={applyColumnFilter('name')}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
            <FilterableSortHeader
              label="Description"
              field="description"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.description ?? ''}
              filterOptions={filterOptions.description}
              onFilter={applyColumnFilter('description')}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
            <FilterableSortHeader
              label="Services"
              sortable={false}
              filterValue=""
              filterOptions={[]}
              onFilter={() => undefined}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
            <FilterableSortHeader
              label="Status"
              field="isActive"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.isActive ?? ''}
              filterOptions={filterOptions.isActive}
              onFilter={applyColumnFilter('isActive')}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
            <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map(row => (
            <TableRow key={row.id} sx={{ height: 44 }}>
              <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 500 }}>{row.name}</TableCell>
              <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, color: 'text.secondary' }}>{row.description}</TableCell>
              <TableCell sx={SETTINGS_TABLE_CELL_SX}>
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
              <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                <StatusColumnToggle
                  active={row.status === 'active'}
                  onToggle={() => setToggleTarget(row)}
                />
              </TableCell>
              <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <Edit sx={{ fontSize: 14 }} />
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
      </TableContainer>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRow ? 'Edit Category' : 'Add Category'}
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
            label="Category Name"
            required
            fullWidth
            placeholder="e.g. Design & Diligence"
            value={form.name}
            onChange={e => {
              setForm(f => ({ ...f, name: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'name'))
            }}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
          />
          <TextField
            size="small"
            label="Description"
            multiline
            rows={2}
            fullWidth
            value={form.description}
            onChange={e => {
              setForm(f => ({ ...f, description: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'description'))
            }}
            error={!!fieldErrors.description}
            helperText={fieldErrors.description}
          />
          <TextField
            select
            size="small"
            label="Status"
            fullWidth
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as Category['status'] }))}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Box>
      </Modal>

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
