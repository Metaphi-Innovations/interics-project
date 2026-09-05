import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Skeleton,
} from '@mui/material'
import { Plus } from 'lucide-react'
import { Button, Modal, useToast } from '@/design-system/components'
import {
  FilterableSortHeader,
  SearchableSelect,
  SettingsSearchBar,
  StatusColumnToggle,
  useListingQuery,
  type ColumnFilterOption,
} from '@/components/listing'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSACCodes, createSACCode, updateSACCode, toggleSACCodeStatus,
  fetchGSTRates,
} from '@/slices/settings/thunk'
import type { SACCode } from '@/slices/settings/reducer'
import { sacCodesService } from '@/modules/system-settings/sac/sac-codes.service'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'
import SettingsDescriptionCell from '../components/SettingsDescriptionCell'
import { SettingsEditAction, SettingsTableActionsCell } from '../components/SettingsTableActions'
import {
  sacCode,
  optionalMaxLength,
  requiredEntityId,
  collectErrors,
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'
import { LISTING_DEFAULT_PAGE_SIZE } from '@/components/listing/listingStandards'
import { SettingsListingPagination } from '../components/SettingsListingPagination'
import { SettingsStatusSelect } from '../components/SettingsStatusSelect'

const SAC_DATA_COL_COUNT = 4
const sacDataColWidth = settingsDataColWidth(SAC_DATA_COL_COUNT)

type SACForm = Omit<SACCode, 'id' | 'gstRate'>

const defaultForm: SACForm = { code: '', description: '', gstRateId: '', status: 'active' }
type SacFilterOptions = {
  sacCode: ColumnFilterOption[]
  description: ColumnFilterOption[]
  gstSlabId: ColumnFilterOption[]
  status: ColumnFilterOption[]
}

export default function SACCodesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { sacCodes, sacCodesTotal, gstRates, saving, loading } = useAppSelector(s => s.settings)
  const listing = useListingQuery({ pageSize: LISTING_DEFAULT_PAGE_SIZE })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<SACCode | null>(null)
  const [form, setForm] = useState<SACForm>(defaultForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toggleTarget, setToggleTarget] = useState<SACCode | null>(null)
  const [toggling, setToggling] = useState(false)
  const [sortField, setSortField] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterOptions, setFilterOptions] = useState<SacFilterOptions>({
    sacCode: [],
    description: [],
    gstSlabId: [],
    status: [],
  })
  const search = listing.search.trim()
  const isSearchPending = search.length > 0 && search !== listing.debouncedSearch

  useEffect(() => {
    void sacCodesService.getFilters()
      .then((data) => {
        setFilterOptions({
          sacCode: data.sacCode ?? [],
          description: data.description ?? [],
          gstSlabId: data.gstSlabId ?? [],
          status: data.status ?? [],
        })
      })
      .catch(() => undefined)
    void dispatch(fetchGSTRates({ force: true, page: 1, limit: 100 }))
  }, [dispatch])

  const loadFilterOptions = () => {
    void sacCodesService.getFilters()
      .then((data) => {
        setFilterOptions({
          sacCode: data.sacCode ?? [],
          description: data.description ?? [],
          gstSlabId: data.gstSlabId ?? [],
          status: data.status ?? [],
        })
      })
      .catch(() => undefined)
  }

  const buildListParams = () => ({
    force: true as const,
    page: listing.apiPage,
    limit: listing.pageSize,
    search: listing.debouncedSearch || undefined,
    sacCode: listing.filters.sacCode,
    gstSlabId: listing.filters.gstSlabId,
    status: listing.filters.status,
    sortBy: sortField,
    sortOrder: sortField ? sortDirection : undefined,
  })

  useEffect(() => {
    if (isSearchPending) return
    void dispatch(fetchSACCodes(buildListParams()))
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

  const activeGST = gstRates.filter(g => g.status === 'active')

  const openAdd = () => {
    setEditingRow(null)
    setForm(defaultForm)
    setFieldErrors({})
    setDrawerOpen(true)
  }

  const openEdit = (row: SACCode) => {
    setEditingRow(row)
    setForm({ code: row.code, description: row.description, gstRateId: row.gstRateId, status: row.status })
    setFieldErrors({})
    setDrawerOpen(true)
  }

  const handleSave = () => {
    const next = collectErrors([
      ['code', sacCode(form.code)],
      ['description', optionalMaxLength(form.description, 'Description', 500)],
      ['gstRateId', requiredEntityId(form.gstRateId, 'GST rate')],
    ])
    
    // Client-side uniqueness check as extra UX
    const duplicate = sacCodes.find(s => s.code === form.code && s.id !== editingRow?.id)
    if (duplicate) {
      next.code = 'SAC code must be unique'
    }
    
    setFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
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
        if (!editingRow) {
          listing.setPage(0)
          setSortField(undefined)
          setSortDirection('asc')
        }
        loadFilterOptions()
        void dispatch(
          fetchSACCodes({
            force: true,
            page: editingRow ? listing.apiPage : 1,
            limit: listing.pageSize,
            search: listing.debouncedSearch || undefined,
            sacCode: listing.filters.sacCode,
            gstSlabId: listing.filters.gstSlabId,
            status: listing.filters.status,
            sortBy: editingRow ? sortField : undefined,
            sortOrder: editingRow && sortField ? sortDirection : undefined,
          }),
        )
        success(editingRow ? 'SAC code updated' : 'SAC code added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save SAC code')
        if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await dispatch(toggleSACCodeStatus(toggleTarget.id)).unwrap()
      void dispatch(fetchSACCodes(buildListParams()))
      success(
        toggleTarget.status === 'active'
          ? 'SAC code deactivated'
          : 'SAC code activated',
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
          <Typography variant="h6" fontWeight={600}>SAC Code Master</Typography>
          <Typography variant="caption" color="text.secondary">Service Accounting Codes linked to GST rates</Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add SAC Code
        </Button>
      </Box>

      <SettingsSearchBar
        placeholder="Search SAC codes..."
        value={listing.search}
        onChange={listing.setSearch}
        onReset={handleReset}
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
            <FilterableSortHeader
              label="SAC Code"
              field="sacCode"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.sacCode ?? ''}
              filterOptions={filterOptions.sacCode}
              onFilter={applyColumnFilter('sacCode')}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
            <FilterableSortHeader
              label="Description"
              field="description"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterable={false}
              filterValue=""
              filterOptions={[]}
              onFilter={() => undefined}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
            <FilterableSortHeader
              label="GST Rate (linked)"
              field="gstSlabId"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.gstSlabId ?? ''}
              filterOptions={filterOptions.gstSlabId}
              onFilter={applyColumnFilter('gstSlabId')}
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
          {loading && sacCodes.length === 0
            ? [...Array(6)].map((_, i) => (
                <TableRow key={i} sx={{ height: 44 }}>
                  {[...Array(SAC_DATA_COL_COUNT + 1)].map((__, j) => (
                    <TableCell key={j} sx={SETTINGS_TABLE_CELL_SX}>
                      <Skeleton height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : sacCodes.map(row => {
            const linkedGST = gstRates.find(g => g.id === row.gstRateId)
            return (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 600, fontFamily: 'monospace' }}>{row.code}</TableCell>
                <SettingsDescriptionCell value={row.description} />
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
        totalCount={sacCodesTotal}
        onPageChange={listing.setPage}
        onPageSizeChange={listing.setPageSize}
      />

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
            onChange={e => {
              setForm(f => ({ ...f, code: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'code'))
            }}
            error={!!fieldErrors.code}
            helperText={fieldErrors.code}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <SearchableSelect
              label="GST Rate"
              required
              fullWidth
              value={form.gstRateId}
              onChange={(gstRateId) => {
                setForm((f) => ({ ...f, gstRateId }))
                setFieldErrors((errors) => clearFieldError(errors, 'gstRateId'))
              }}
              options={activeGST.map((g) => ({
                value: g.id,
                label: `${g.slabName} (${g.rate}%)`,
              }))}
              error={!!fieldErrors.gstRateId}
              helperText={fieldErrors.gstRateId}
            />
            <SettingsStatusSelect
              label="Status"
              fullWidth
              value={form.status}
              onChange={(status) =>
                setForm((f) => ({ ...f, status: status as SACCode['status'] }))
              }
            />
          </Box>
          <TextField
            size="small"
            label="Description"
            fullWidth
            placeholder="e.g. Interior Design Services"
            value={form.description}
            onChange={e => {
              setForm(f => ({ ...f, description: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'description'))
            }}
            error={!!fieldErrors.description}
            helperText={fieldErrors.description}
          />
        </Box>
      </Modal>

      <Dialog open={!!toggleTarget} onClose={() => !toggling && setToggleTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{toggleNextActive ? 'Activate' : 'Deactivate'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleNextActive
              ? `Activate "${toggleTarget?.code}"?`
              : `Deactivate "${toggleTarget?.code}"? It will no longer be available for new records.`}
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
