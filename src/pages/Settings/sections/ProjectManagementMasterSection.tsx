/**
 * Settings → Project Management Master
 * Admin manages reusable categories and checkpoints (not project-specific).
 */
import { useEffect, useState } from 'react'
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
} from '@mui/material'
import { Add, Delete as DeleteIcon } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button, useToast } from '@/design-system/components'
import { DrawerForm, FormField } from '@/components/templates/DrawerForm'
import {
  FilterableSortHeader,
  SettingsSearchBar,
  StatusColumnToggle,
  useListingQuery,
  type ColumnFilterOption,
} from '@/components/listing'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  createProjectManagementCategory,
  fetchProjectManagementCategories,
  toggleProjectManagementCategoryStatus,
  updateProjectManagementCategory,
} from '@/slices/settings/thunk'
import type {
  ProjectManagementCheckpoint,
  ProjectManagementMasterCategory,
} from '@/slices/settings/reducer'
import { projectManagementService } from '@/modules/project-management'
import {
  validateProjectManagementForm,
} from '@/modules/project-management'
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import { LISTING_DEFAULT_PAGE_SIZE } from '@/components/listing/listingStandards'
import { SettingsListingPagination } from '../components/SettingsListingPagination'
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
} from '../components/SettingsTableActions'

const DATA_COL_COUNT = 3
const dataColWidth = settingsDataColWidth(DATA_COL_COUNT)

type CheckpointDraft = { key: string; id?: string; name: string }

type CategoryForm = {
  name: string
  checkpoints: CheckpointDraft[]
}

function newCheckpointDraft(name = ''): CheckpointDraft {
  return { key: crypto.randomUUID(), name }
}

const defaultForm = (): CategoryForm => ({
  name: '',
  checkpoints: [newCheckpointDraft()],
})

type ProjectManagementFilterOptions = {
  category: ColumnFilterOption[]
  totalCheckpoints: ColumnFilterOption[]
  status: ColumnFilterOption[]
}

export default function ProjectManagementMasterSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { projectManagementCategories, projectManagementCategoriesTotal, saving, loading } = useAppSelector((s) => s.settings)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ProjectManagementMasterCategory | null>(null)
  const [form, setForm] = useState<CategoryForm>(defaultForm)
  const [nameError, setNameError] = useState<string | undefined>()
  const [checkpointsError, setCheckpointsError] = useState<string | undefined>()
  const [checkpointErrors, setCheckpointErrors] = useState<Array<{ name?: string }>>([])
  const [toggleTarget, setToggleTarget] = useState<ProjectManagementMasterCategory | null>(null)
  const [toggling, setToggling] = useState(false)
  const listing = useListingQuery({ pageSize: LISTING_DEFAULT_PAGE_SIZE })
  const [sortField, setSortField] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterOptions, setFilterOptions] = useState<ProjectManagementFilterOptions>({
    category: [],
    totalCheckpoints: [],
    status: [],
  })
  const search = listing.search.trim()
  const isSearchPending = search.length > 0 && search !== listing.debouncedSearch

  const loadFilterOptions = () => {
    void projectManagementService.getFilters()
      .then((data) => {
        setFilterOptions({
          category: data.category ?? [],
          totalCheckpoints: [...(data.totalCheckpoints ?? [])].sort(
            (a, b) => Number(a.value) - Number(b.value),
          ),
          status: data.status ?? [],
        })
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    loadFilterOptions()
  }, [dispatch])

  const buildListParams = () => ({
    force: true as const,
    page: listing.apiPage,
    limit: listing.pageSize,
    search: listing.debouncedSearch || undefined,
    category: listing.filters.category,
    totalCheckpoints: listing.filters.totalCheckpoints,
    status: listing.filters.status,
    sortBy: sortField,
    sortOrder: sortField ? sortDirection : undefined,
  })

  useEffect(() => {
    if (isSearchPending) return
    void dispatch(fetchProjectManagementCategories(buildListParams()))
  }, [dispatch, isSearchPending, listing.debouncedSearch, listing.filters, listing.page, listing.pageSize, search, sortDirection, sortField])

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

  function openAdd() {
    setEditingRow(null)
    setForm(defaultForm())
    setNameError(undefined)
    setCheckpointsError(undefined)
    setCheckpointErrors([])
    setDrawerOpen(true)
  }

  function openEdit(row: ProjectManagementMasterCategory) {
    setEditingRow(row)
    setForm({
      name: row.name,
      checkpoints:
        row.checkpoints.length > 0
          ? row.checkpoints.map((cp) => ({
              key: cp.id,
              id: cp.id,
              name: cp.name,
            }))
          : [newCheckpointDraft()],
    })
    setNameError(undefined)
    setCheckpointsError(undefined)
    setCheckpointErrors([])
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingRow(null)
  }

  function updateCheckpoint(key: string, name: string) {
    setForm((prev) => ({
      ...prev,
      checkpoints: prev.checkpoints.map((cp) =>
        cp.key === key ? { ...cp, name } : cp,
      ),
    }))
  }

  function removeCheckpoint(key: string) {
    setForm((prev) => {
      const next = prev.checkpoints.filter((cp) => cp.key !== key)
      return {
        ...prev,
        checkpoints: next.length > 0 ? next : [newCheckpointDraft()],
      }
    })
  }

  function addCheckpoint() {
    setForm((prev) => ({
      ...prev,
      checkpoints: [...prev.checkpoints, newCheckpointDraft()],
    }))
  }

  function handleSave() {
    const validation = validateProjectManagementForm({
      name: form.name,
      checkpoints: form.checkpoints.map((cp) => ({ name: cp.name })),
    })
    setNameError(validation.name)
    setCheckpointsError(validation.checkpoints)
    setCheckpointErrors(validation.checkpointErrors ?? [])
    if (validation.name || validation.checkpoints || validation.checkpointErrors?.some((r) => r.name)) {
      return
    }

    const checkpoints: ProjectManagementCheckpoint[] = form.checkpoints
      .map((cp) => ({
        id: cp.id ?? crypto.randomUUID(),
        name: cp.name.trim(),
      }))
      .filter((cp) => cp.name.length > 0)

    const payload = {
      name: form.name.trim(),
      checkpoints,
      totalCheckpoints: checkpoints.length,
      status: editingRow?.status ?? ('active' as const),
    }

    const action = editingRow
      ? dispatch(updateProjectManagementCategory({ id: editingRow.id, ...payload }))
      : dispatch(createProjectManagementCategory(payload))

    action
      .unwrap()
      .then(() => {
        closeDrawer()
        if (!editingRow) {
          listing.setPage(0)
          setSortField(undefined)
          setSortDirection('asc')
        }
        loadFilterOptions()
        void dispatch(
          fetchProjectManagementCategories({
            ...buildListParams(),
            page: editingRow ? listing.apiPage : 1,
            sortBy: editingRow ? sortField : undefined,
            sortOrder: editingRow && sortField ? sortDirection : undefined,
          }),
        )
        success(editingRow ? 'Category updated' : 'Category added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save category')
        if (parsed.fieldErrors.category || parsed.fieldErrors.name) {
          setNameError(parsed.fieldErrors.category ?? parsed.fieldErrors.name)
        }
        error(parsed.message)
      })
  }

  const confirmToggle = async () => {
    if (!toggleTarget || toggling) return
    const nextStatus = toggleTarget.status === 'active' ? 'inactive' : 'active'
    setToggling(true)
    try {
      await dispatch(
        toggleProjectManagementCategoryStatus({ id: toggleTarget.id, status: nextStatus }),
      ).unwrap()
      void dispatch(fetchProjectManagementCategories(buildListParams()))
      success(nextStatus === 'active' ? 'Category activated' : 'Category deactivated')
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Project Management Master
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reusable categories and checkpoints for project tracking
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="sm"
          startIcon={<Plus size={14} strokeWidth={2} />}
          onClick={openAdd}
        >
          Add Category
        </Button>
      </Box>

      <SettingsSearchBar
        placeholder="Search project management categories..."
        value={listing.search}
        onChange={listing.setSearch}
        onReset={handleReset}
      />

      <TableContainer sx={{ width: '100%' }}>
        <Table size="small" sx={SETTINGS_TABLE_SX}>
          <colgroup>
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
          </colgroup>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFB' }}>
              <FilterableSortHeader
                label="Category"
                field="category"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                filterValue={listing.filters.category ?? ''}
                filterOptions={filterOptions.category}
                onFilter={applyColumnFilter('category')}
                sx={SETTINGS_TABLE_HEADER_CELL_SX}
              />
              <FilterableSortHeader
                label="Total Checkpoints"
                field="totalCheckpoints"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                filterValue={listing.filters.totalCheckpoints ?? ''}
                filterOptions={filterOptions.totalCheckpoints}
                onFilter={applyColumnFilter('totalCheckpoints')}
                sx={SETTINGS_TABLE_HEADER_CELL_SX}
              />
              <FilterableSortHeader
                label="Status"
                field="status"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                filterValue={listing.filters.status ?? ''}
                filterOptions={filterOptions.status}
                onFilter={applyColumnFilter('status')}
                sx={SETTINGS_TABLE_HEADER_CELL_SX}
              />
              <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && projectManagementCategories.length === 0
              ? [...Array(6)].map((_, i) => (
                  <TableRow key={i} sx={{ height: 44 }}>
                    {[...Array(DATA_COL_COUNT + 1)].map((__, j) => (
                      <TableCell key={j} sx={SETTINGS_TABLE_CELL_SX}>
                        <Skeleton height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : projectManagementCategories.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={DATA_COL_COUNT + 1} sx={{ ...SETTINGS_TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No records found
                    </TableCell>
                  </TableRow>
                )
                : projectManagementCategories.map((row) => (
                  <TableRow key={row.id} sx={{ height: 44 }}>
                    <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 500 }}>{row.name}</TableCell>
                    <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                      {row.totalCheckpoints ?? row.checkpoints.length}
                    </TableCell>
                    <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                      <StatusColumnToggle
                        active={row.status === 'active'}
                        onToggle={() => setToggleTarget(row)}
                      />
                    </TableCell>
                    <SettingsTableActionsCell>
                      <SettingsEditAction onClick={() => openEdit(row)} />
                    </SettingsTableActionsCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      <SettingsListingPagination
        page={listing.page}
        pageSize={listing.pageSize}
        totalCount={projectManagementCategoriesTotal}
        onPageChange={listing.setPage}
        onPageSizeChange={listing.setPageSize}
      />

      <DrawerForm
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingRow ? 'Edit Category' : 'Add Category'}
        width={480}
        submitLoading={saving}
        footer={
          <Stack
            direction="row"
            justifyContent="flex-end"
            gap={1}
            sx={{ px: '20px', py: '14px' }}
          >
            <Button
              size="sm"
              variant="outlined"
              color="secondary"
              label="Cancel"
              onClick={closeDrawer}
              disabled={saving}
            />
            <Button
              size="sm"
              variant="contained"
              color="primary"
              label={saving ? 'Saving...' : 'Save'}
              onClick={handleSave}
              disabled={saving}
            />
          </Stack>
        }
      >
        <Stack gap={3}>
          <FormField label="Category Name" required error={nameError}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. Design"
              value={form.name}
              error={Boolean(nameError)}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                setNameError(undefined)
              }}
            />
          </FormField>

          <Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: tokens.color.neutral[500],
                mb: 1.5,
              }}
            >
              Checkpoint List
            </Typography>
            {checkpointsError ? (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                {checkpointsError}
              </Typography>
            ) : null}

            <Stack gap={1.25}>
              {form.checkpoints.map((cp, index) => (
                <Stack key={cp.key} direction="row" alignItems="flex-start" gap={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Checkpoint name"
                    value={cp.name}
                    error={Boolean(checkpointErrors[index]?.name)}
                    helperText={checkpointErrors[index]?.name}
                    onChange={(e) => updateCheckpoint(cp.key, e.target.value)}
                    inputProps={{ style: { fontSize: 13 } }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeCheckpoint(cp.key)}
                    aria-label="Delete checkpoint"
                    sx={{ color: 'error.main', flexShrink: 0, mt: 0.5 }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              ))}

              <Button
                size="sm"
                variant="outlined"
                color="primary"
                label="Add another Checkpoint"
                startIcon={<Add sx={{ fontSize: 14 }} />}
                onClick={addCheckpoint}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              />
            </Stack>
          </Box>
        </Stack>
      </DrawerForm>

      <Dialog open={!!toggleTarget} onClose={() => !toggling && setToggleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{toggleNextActive ? 'Activate' : 'Deactivate'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleNextActive
              ? `Are you sure you want to activate "${toggleTarget?.name}"?`
              : `Are you sure you want to deactivate "${toggleTarget?.name}"? It will no longer be available for new records.`}
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
