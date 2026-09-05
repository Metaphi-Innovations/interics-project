import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Skeleton,
} from '@mui/material'
import { Plus } from 'lucide-react'
import { useTheme } from '@mui/material/styles'
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
  fetchRatings, createRating, updateRating, toggleRatingStatus,
} from '@/slices/settings/thunk'
import type { RatingMaster } from '@/slices/settings/reducer'
import { ratingsService } from '@/modules/system-settings/rating/rating.service'
import { getRatingMasterChipColors } from '@/utils/masterChipStyles'
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
import {
  requiredAlphabeticName,
  collectErrors,
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'
import { LISTING_DEFAULT_PAGE_SIZE } from '@/components/listing/listingStandards'
import { SettingsListingPagination } from '../components/SettingsListingPagination'
import { SettingsStatusSelect } from '../components/SettingsStatusSelect'

const DATA_COL_COUNT = 2
const dataColWidth = settingsDataColWidth(DATA_COL_COUNT)

type RatingForm = { name: string; status: 'active' | 'inactive' }
const defaultForm: RatingForm = { name: '', status: 'active' }
type RatingFilterOptions = {
  name: ColumnFilterOption[]
  isActive: ColumnFilterOption[]
}

export default function RatingsSection() {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { ratings, ratingsTotal, saving, loading } = useAppSelector(s => s.settings)
  const listing = useListingQuery({ pageSize: LISTING_DEFAULT_PAGE_SIZE })
  const [sortField, setSortField] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<RatingMaster | null>(null)
  const [form, setForm] = useState<RatingForm>(defaultForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toggleTarget, setToggleTarget] = useState<RatingMaster | null>(null)
  const [toggling, setToggling] = useState(false)
  const [filterOptions, setFilterOptions] = useState<RatingFilterOptions>({
    name: [],
    isActive: [],
  })
  const search = listing.search.trim()
  const isSearchPending = search.length > 0 && search !== listing.debouncedSearch

  useEffect(() => {
    void ratingsService.getFilters()
      .then((data) => {
        setFilterOptions({
          name: data.name ?? [],
          isActive: data.isActive ?? [],
        })
      })
      .catch(() => undefined)
  }, [])

  const buildListParams = () => ({
    force: true as const,
    page: listing.apiPage,
    limit: listing.pageSize,
    search: listing.debouncedSearch || undefined,
    name: listing.filters.name,
    isActive: listing.filters.isActive,
    sortBy: sortField,
    sortOrder: sortField ? sortDirection : undefined,
  })

  useEffect(() => {
    if (isSearchPending) return
    void dispatch(fetchRatings(buildListParams()))
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

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setFieldErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (row: RatingMaster) => {
    setEditingRow(row)
    setForm({ name: row.name, status: row.status })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  const handleSave = () => {
    const next = collectErrors([
      ['name', requiredAlphabeticName(form.name, 'Rating Name', 100)],
    ])
    setFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
      return
    }
    const action = editingRow
      ? dispatch(updateRating({ id: editingRow.id, ...form, name: form.name.trim() }))
      : dispatch(createRating({ ...form, name: form.name.trim() }))
    action.unwrap()
      .then(() => {
        setDrawerOpen(false)
        if (!editingRow) {
          listing.setPage(0)
          setSortField(undefined)
          setSortDirection('asc')
        }
        void dispatch(
          fetchRatings({
            ...buildListParams(),
            page: editingRow ? listing.apiPage : 1,
            sortBy: editingRow ? sortField : undefined,
            sortOrder: editingRow && sortField ? sortDirection : undefined,
          }),
        )
        success(editingRow ? 'Rating updated' : 'Rating added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save rating')
        if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await dispatch(toggleRatingStatus(toggleTarget.id)).unwrap()
      void dispatch(fetchRatings(buildListParams()))
      success(
        toggleTarget.status === 'active'
          ? 'Rating deactivated'
          : 'Rating activated',
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

      <SettingsSearchBar
        placeholder="Search ratings..."
        value={listing.search}
        onChange={listing.setSearch}
        onReset={handleReset}
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
              <FilterableSortHeader
                label="Rating Name"
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
            {loading && ratings.length === 0
              ? [...Array(6)].map((_, i) => (
                  <TableRow key={i} sx={{ height: 44 }}>
                    {[...Array(DATA_COL_COUNT + 1)].map((__, j) => (
                      <TableCell key={j} sx={SETTINGS_TABLE_CELL_SX}>
                        <Skeleton height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : ratings.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={DATA_COL_COUNT + 1} sx={{ ...SETTINGS_TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No records found
                    </TableCell>
                  </TableRow>
                )
                : ratings.map(row => {
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
                        <StatusColumnToggle
                          active={row.status === 'active'}
                          onToggle={() => setToggleTarget(row)}
                        />
                      </TableCell>
                      <SettingsTableActionsCell>
                        <SettingsEditAction onClick={() => openEdit(row)} />
                      </SettingsTableActionsCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </TableContainer>

      <SettingsListingPagination
        page={listing.page}
        pageSize={listing.pageSize}
        totalCount={ratingsTotal}
        onPageChange={listing.setPage}
        onPageSizeChange={listing.setPageSize}
      />

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
            onChange={e => {
              setForm(f => ({ ...f, name: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'name'))
            }}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
          />
          <SettingsStatusSelect
            label="Status"
            fullWidth
            value={form.status}
            onChange={(status) =>
              setForm((f) => ({ ...f, status: status as RatingForm['status'] }))
            }
          />
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
