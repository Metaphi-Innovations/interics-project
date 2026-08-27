import { useState, useEffect } from 'react'
import {
  Box, Typography, Chip, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Divider,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Skeleton,
} from '@mui/material'
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
  fetchServices, createService, updateService, toggleServiceStatus,
  fetchCategories, fetchSACCodes, fetchGSTRates,
} from '@/slices/settings/thunk'
import type { Service } from '@/slices/settings/reducer'
import { servicesService } from '@/modules/system-settings/service/services.service'
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
  requiredEntityId,
  serviceGstRate,
  collectErrors,
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'
import { LISTING_DEFAULT_PAGE_SIZE } from '@/components/listing/listingStandards'
import { SettingsListingPagination } from '../components/SettingsListingPagination'

const SERVICE_DATA_COL_COUNT = 5
const serviceDataColWidth = settingsDataColWidth(SERVICE_DATA_COL_COUNT)

type ServiceForm = Omit<Service, 'id'>
type ServiceFilterOptions = {
  name: ColumnFilterOption[]
  categoryId: ColumnFilterOption[]
  sacCode: ColumnFilterOption[]
  gstRate: ColumnFilterOption[]
  isActive: ColumnFilterOption[]
}

const defaultForm: ServiceForm = {
  name: '',
  categoryId: '',
  sacCodeId: null,
  gstRate: 0,
  allowGSTOverride: false,
  allowVendorMapping: false,
  tags: [],
  status: 'active',
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#107E68', textTransform: 'uppercase', display: 'block', mb: 1 }}>
        {label}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {children}
      </Box>
    </Box>
  )
}

export default function ServicesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { services, servicesTotal, categories, sacCodes, gstRates, saving, loading } = useAppSelector(s => s.settings)
  const listing = useListingQuery({ pageSize: LISTING_DEFAULT_PAGE_SIZE })
  const [sortField, setSortField] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(defaultForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [resolvedGSTRate, setResolvedGSTRate] = useState(0)
  const [toggleTarget, setToggleTarget] = useState<Service | null>(null)
  const [toggling, setToggling] = useState(false)
  const [filterOptions, setFilterOptions] = useState<ServiceFilterOptions>({
    name: [],
    categoryId: [],
    sacCode: [],
    gstRate: [],
    isActive: [],
  })
  const search = listing.search.trim()
  const isSearchPending = search.length > 0 && search !== listing.debouncedSearch

  useEffect(() => {
    void Promise.all([
      dispatch(fetchCategories({ force: true, page: 1, limit: 100 })),
      dispatch(fetchSACCodes({ force: true, page: 1, limit: 100 })),
      dispatch(fetchGSTRates({ force: true, page: 1, limit: 100 })),
    ])
    void servicesService.getFilters()
      .then((data) => {
        setFilterOptions({
          name: data.name ?? [],
          categoryId: data.categoryId ?? [],
          sacCode: data.sacCode ?? [],
          gstRate: data.gstRate ?? [],
          isActive: data.isActive ?? [],
        })
      })
      .catch(() => undefined)
  }, [dispatch])

  const buildListParams = () => ({
    force: true as const,
    page: listing.apiPage,
    limit: listing.pageSize,
    search: listing.debouncedSearch || undefined,
    name: listing.filters.name,
    categoryId: listing.filters.categoryId,
    sacCode: listing.filters.sacCode,
    gstRate: listing.filters.gstRate,
    isActive: listing.filters.isActive,
    sortBy: sortField,
    sortOrder: sortField ? sortDirection : undefined,
  })

  useEffect(() => {
    if (isSearchPending) return
    void dispatch(fetchServices(buildListParams()))
  }, [dispatch, isSearchPending, listing.debouncedSearch, listing.filters, listing.page, listing.pageSize, search, sortDirection, sortField])

  const activeCategories = categories.filter(c => c.status === 'active')
  const activeSACCodes = sacCodes.filter(s => s.status === 'active')

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
    setResolvedGSTRate(0)
    setDrawerOpen(true)
  }

  const openEdit = (row: Service) => {
    setEditingRow(row)
    const sac = sacCodes.find(s => s.id === row.sacCodeId)
    const linked = gstRates.find(g => g.id === sac?.gstRateId)
    const rateFromSac = linked?.rate ?? row.gstRate
    setForm({
      name: row.name,
      categoryId: row.categoryId,
      sacCodeId: row.sacCodeId,
      gstRate: rateFromSac,
      allowGSTOverride: false,
      allowVendorMapping: false,
      tags: row.tags,
      status: row.status,
    })
    setFieldErrors({})
    setResolvedGSTRate(rateFromSac)
    setDrawerOpen(true)
  }

  const handleSACChange = (sacId: string) => {
    const sac = sacCodes.find(s => s.id === sacId)
    const linked = gstRates.find(g => g.id === sac?.gstRateId)
    const rate = linked?.rate ?? 0
    setResolvedGSTRate(rate)
    setForm(f => ({
      ...f,
      sacCodeId: sacId,
      gstRate: rate,
    }))
    setFieldErrors(errors => clearFieldError(errors, 'sacCodeId'))
  }

  const handleSave = () => {
    const sac = sacCodes.find(s => s.id === form.sacCodeId)
    const linked = gstRates.find(g => g.id === sac?.gstRateId)
    const gstRate = linked?.rate ?? form.gstRate
    
    const next = collectErrors([
      ['name', requiredAlphabeticName(form.name, 'Service Name', 150)],
      ['categoryId', requiredEntityId(form.categoryId, 'Category')],
      ['sacCodeId', requiredEntityId(form.sacCodeId, 'SAC code')],
      ['gstRate', serviceGstRate(gstRate)],
    ])
    setFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
      return
    }
    
    const payload: ServiceForm = {
      ...form,
      allowGSTOverride: false,
      allowVendorMapping: false,
      gstRate,
    }
    dispatch(editingRow
      ? updateService({ id: editingRow.id, ...payload })
      : createService(payload)
    ).unwrap()
      .then(() => {
        setDrawerOpen(false)
        success(editingRow ? 'Service updated' : 'Service added')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save service', {
          sacCode: 'sacCodeId',
        })
        if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const confirmToggle = async () => {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await dispatch(toggleServiceStatus(toggleTarget.id)).unwrap()
      void dispatch(fetchServices(buildListParams()))
      success(
        toggleTarget.status === 'active'
          ? 'Service deactivated'
          : 'Service activated',
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
          <Typography variant="h6" fontWeight={600}>Services Master</Typography>
          <Typography variant="caption" color="text.secondary">Atomic units used in Pitch builder and invoicing</Typography>
        </Box>
        <Button variant="contained" color="primary" size="sm" startIcon={<Plus size={14} strokeWidth={2} />} onClick={openAdd}>
          Add Service
        </Button>
      </Box>

      <SettingsSearchBar
        placeholder="Search services..."
        value={listing.search}
        onChange={listing.setSearch}
        onReset={handleReset}
      />

      <TableContainer sx={{ width: '100%' }}>
      <Table size="small" sx={SETTINGS_TABLE_SX}>
        <colgroup>
          <col style={{ width: serviceDataColWidth }} />
          <col style={{ width: serviceDataColWidth }} />
          <col style={{ width: serviceDataColWidth }} />
          <col style={{ width: serviceDataColWidth }} />
          <col style={{ width: serviceDataColWidth }} />
          <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: '#F8FAFB' }}>
            <FilterableSortHeader
              label="Service Name"
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
              label="Category"
              field="categoryId"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.categoryId ?? ''}
              filterOptions={filterOptions.categoryId}
              onFilter={applyColumnFilter('categoryId')}
              sx={SETTINGS_TABLE_HEADER_CELL_SX}
            />
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
              label="GST Rate"
              field="gstRate"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              filterValue={listing.filters.gstRate ?? ''}
              filterOptions={filterOptions.gstRate}
              onFilter={applyColumnFilter('gstRate')}
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
          {loading && services.length === 0
            ? [...Array(6)].map((_, i) => (
                <TableRow key={i} sx={{ height: 44 }}>
                  {[...Array(SERVICE_DATA_COL_COUNT + 1)].map((__, j) => (
                    <TableCell key={j} sx={SETTINGS_TABLE_CELL_SX}>
                      <Skeleton height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : services.map(row => {
            const cat = categories.find(c => c.id === row.categoryId)
            const sac = sacCodes.find(s => s.id === row.sacCodeId)
            return (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 500 }}>{row.name}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                  <Chip size="small" label={cat?.name ?? '—'} sx={{ fontSize: 11, height: 20, bgcolor: '#F3F4F6', color: '#374151' }} />
                </TableCell>
                <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontFamily: 'monospace' }}>{sac?.code ?? '—'}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                  <Chip size="small" label={`${row.gstRate}%`} sx={{ fontSize: 11, height: 20, bgcolor: '#E8F5F2', color: '#107E68' }} />
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
        totalCount={servicesTotal}
        onPageChange={listing.setPage}
        onPageSizeChange={listing.setPageSize}
      />

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRow ? 'Edit Service' : 'Add Service'}
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
        <FormSection label="Service Details">
          <TextField
            size="small"
            label="Service Name"
            required
            fullWidth
            placeholder="e.g. Interior Design"
            value={form.name}
            onChange={e => {
              setForm(f => ({ ...f, name: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'name'))
            }}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
          />
          <TextField
            select
            size="small"
            label="Category"
            required
            fullWidth
            value={form.categoryId}
            onChange={e => {
              setForm(f => ({ ...f, categoryId: e.target.value }))
              setFieldErrors(errors => clearFieldError(errors, 'categoryId'))
            }}
            error={!!fieldErrors.categoryId}
            helperText={fieldErrors.categoryId}
          >
            {activeCategories.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </FormSection>

        <FormSection label="Tax Configuration">
          <TextField
            select
            size="small"
            label="SAC Code"
            required
            fullWidth
            value={form.sacCodeId ?? ''}
            onChange={e => handleSACChange(e.target.value)}
            error={!!fieldErrors.sacCodeId}
            helperText={fieldErrors.sacCodeId}
          >
            {activeSACCodes.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.code} — {s.description}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ p: 1.5, bgcolor: '#F8FAFB', borderRadius: '8px', border: '1px solid #E8EEEC', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">GST Rate (from SAC):</Typography>
            <Chip size="small" label={`${resolvedGSTRate}%`} sx={{ bgcolor: '#E8F5F2', color: '#107E68', fontSize: 11, height: 20 }} />
            <Typography variant="caption" color="text.disabled">Auto-applied</Typography>
          </Box>
          {fieldErrors.gstRate && (
            <Typography variant="caption" color="error" sx={{ mt: -1 }}>
              {fieldErrors.gstRate}
            </Typography>
          )}
        </FormSection>

        <TextField
          select
          size="small"
          label="Status"
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value as Service['status'] }))}
          fullWidth
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
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
