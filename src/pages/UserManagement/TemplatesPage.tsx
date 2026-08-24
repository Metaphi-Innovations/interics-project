import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button as MuiButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import { FileText, MoreVertical, Plus } from 'lucide-react'
import { permissionTemplatesApi, type PermissionTemplate } from '@/api/permissionTemplatesApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import { useToast } from '@/design-system/components'
import { ListingTemplate, type FilterField, type TabItem } from '@/components/templates'
import {
  FilterableSortHeader,
  StatusColumnToggle,
  useListingQuery,
  type ColumnFilterOption,
} from '@/components/listing'
import { tokens } from '@/design-system/tokens'
import { normalizeArrayResponse } from '@/utils/normalizeListResponse'
import { usePermission } from '@/hooks/usePermission'

const LISTING_EDGE_PAD = '14px'
const TEMPLATE_ACTION_WIDTH_PX = 60

const TABLE_HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'middle' as const,
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: LISTING_EDGE_PAD,
    paddingRight: LISTING_EDGE_PAD,
  },
}

const TABLE_CELL_SX = {
  verticalAlign: 'middle' as const,
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: LISTING_EDGE_PAD,
    paddingRight: LISTING_EDGE_PAD,
  },
}

const TABLE_ACTION_SX = {
  ...TABLE_CELL_SX,
  width: TEMPLATE_ACTION_WIDTH_PX,
  minWidth: TEMPLATE_ACTION_WIDTH_PX,
  maxWidth: TEMPLATE_ACTION_WIDTH_PX,
  textAlign: 'center' as const,
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: 0,
    paddingRight: LISTING_EDGE_PAD,
  },
}

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

function TemplateRowActions({
  onView,
  onEdit,
  onDelete,
  canView,
  canEdit,
  canDelete,
}: {
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const hasItems = canView || canEdit || canDelete
  if (!hasItems) return null

  function open(e: MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }

  function close() {
    setAnchor(null)
  }

  return (
    <>
      <MuiIconButton size="small" onClick={open} aria-label="Row actions" sx={{ color: tokens.color.neutral[400], p: 0.5, mx: 'auto' }}>
        <MoreVertical size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={(e) => e.stopPropagation()}>
        {canView ? (
          <MenuItem dense onClick={() => { onView(); close() }} sx={{ fontSize: 13 }}>
            View
          </MenuItem>
        ) : null}
        {canEdit ? (
          <MenuItem dense onClick={() => { onEdit(); close() }} sx={{ fontSize: 13 }}>
            Edit
          </MenuItem>
        ) : null}
        {canDelete ? (
          <MenuItem dense onClick={() => { onDelete(); close() }} sx={{ fontSize: 13, color: 'error.main' }}>
            Delete
          </MenuItem>
        ) : null}
      </Menu>
    </>
  )
}

function DeleteDialog({
  open,
  template,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean
  template: PermissionTemplate | null
  saving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete Template</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Delete <strong>{template?.templateName}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton size="small" variant="contained" color="error" onClick={onConfirm} disabled={saving}>
          Delete
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

function exportTemplatesCsv(templates: PermissionTemplate[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const rows = [
    ['Template Name', 'Status', 'Created At', 'Updated At'],
    ...templates.map((template) => [
      template.templateName,
      template.status,
      template.createdAt,
      template.updatedAt,
    ]),
  ]
  const csv = rows.map((row) => row.map((cell) => escape(String(cell ?? ''))).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `permission-templates-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const { showToast } = useToast()
  const listing = useListingQuery({ pageSize: 20 })
  const canView = usePermission('userManagementTemplates', 'view') || usePermission('userManagement', 'view')
  const canCreate = usePermission('userManagementTemplates', 'create') || usePermission('userManagement', 'create')
  const canEdit = usePermission('userManagementTemplates', 'edit') || usePermission('userManagement', 'edit')
  const canDelete = usePermission('userManagementTemplates', 'delete') || usePermission('userManagement', 'delete')

  const [items, setItems] = useState<PermissionTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggleSavingId, setToggleSavingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [sortField, setSortField] = useState<'templateName' | 'status' | 'updatedAt'>('templateName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  function loadTemplates() {
    setLoading(true)
    permissionTemplatesApi
      .getAll({ limit: 100 })
      .then((res) => {
        const raw = normalizeArrayResponse<PermissionTemplate>(unwrapApiData(res.data) ?? res.data)
        setItems(raw)
      })
      .catch(() => showToast({ title: 'Failed to load templates', variant: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const searchedItems = useMemo(() => {
    const query = listing.debouncedSearch.trim().toLowerCase()
    return items.filter((template) => {
      if (query && !template.templateName.toLowerCase().includes(query)) return false
      if (nameFilter && template.templateName !== nameFilter) return false
      if (statusFilter && template.status !== statusFilter) return false
      return true
    })
  }, [items, listing.debouncedSearch, nameFilter, statusFilter])

  const sortedItems = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    return [...searchedItems].sort((a, b) => {
      const aValue = String(a[sortField] ?? '').toLowerCase()
      const bValue = String(b[sortField] ?? '').toLowerCase()
      return aValue.localeCompare(bValue) * direction
    })
  }, [searchedItems, sortDirection, sortField])

  const pageStart = listing.page * listing.pageSize
  const pagedItems = sortedItems.slice(pageStart, pageStart + listing.pageSize)
  const activeCount = items.filter((template) => template.status === 'active').length
  const inactiveCount = items.filter((template) => template.status === 'inactive').length
  const activeListTab = statusFilter === '' ? 'all' : statusFilter

  const listTabs: TabItem[] = [
    { label: 'All', value: 'all', count: items.length },
    { label: 'Active', value: 'active', count: activeCount },
    { label: 'Inactive', value: 'inactive', count: inactiveCount },
  ]

  const nameFilterOptions: ColumnFilterOption[] = useMemo(
    () => items.map((template) => ({ label: template.templateName, value: template.templateName })),
    [items],
  )
  const statusFilterOptions: ColumnFilterOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]
  const filterConfig: FilterField[] = [
    {
      field: 'status',
      label: 'Status',
      type: 'select',
      options: [{ label: 'All Status', value: '' }, ...statusFilterOptions],
    },
  ]

  function handleSort(field: string, direction: 'asc' | 'desc') {
    if (field === 'templateName' || field === 'status' || field === 'updatedAt') {
      setSortField(field)
      setSortDirection(direction)
    }
  }

  function handleResetAll() {
    listing.setSearch('')
    listing.setPage(0)
    setStatusFilter('')
    setNameFilter('')
    setSortField('templateName')
    setSortDirection('asc')
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    permissionTemplatesApi
      .remove(deleteTarget.id)
      .then(() => {
        showToast({ title: 'Template deleted', variant: 'success' })
        setDeleteTarget(null)
        loadTemplates()
      })
      .catch(() => showToast({ title: 'Failed to delete template', variant: 'error' }))
      .finally(() => setSaving(false))
  }

  function handleToggleStatus(template: PermissionTemplate) {
    if (!canEdit || toggleSavingId) return
    const nextActive = template.status !== 'active'
    setToggleSavingId(template.id)
    permissionTemplatesApi
      .update(template.id, { isActive: nextActive })
      .then(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === template.id
              ? { ...item, status: nextActive ? 'active' : 'inactive' }
              : item,
          ),
        )
        showToast({ title: nextActive ? 'Template activated' : 'Template deactivated', variant: 'success' })
      })
      .catch(() => showToast({ title: 'Failed to update template status', variant: 'error' }))
      .finally(() => setToggleSavingId(null))
  }

  return (
    <>
      <ListingTemplate
        icon={<FileText size={22} strokeWidth={1.75} />}
        title="Templates"
        subtitle="Manage reusable permission templates"
        tabs={listTabs}
        activeTab={activeListTab}
        onTabChange={(value) => {
          listing.setPage(0)
          setStatusFilter(value === 'all' ? '' : value)
        }}
        searchPlaceholder="Search by template name..."
        searchValue={listing.search}
        onSearchChange={(value) => {
          listing.setSearch(value)
          listing.setPage(0)
        }}
        filterConfig={filterConfig}
        activeFilters={{ status: statusFilter }}
        onFilterChange={(next) => {
          listing.setPage(0)
          setStatusFilter((next.status as string) ?? '')
        }}
        onFilterReset={() => {
          listing.setPage(0)
          setStatusFilter('')
        }}
        onResetAll={handleResetAll}
        showExport
        onExport={() => exportTemplatesCsv(sortedItems)}
        clipCardContent={false}
        primaryAction={
          canCreate
            ? {
                label: 'Create Template',
                onClick: () => navigate('/user-management/templates/create'),
                startIcon: <Plus size={16} strokeWidth={2} />,
              }
            : undefined
        }
        pageSize={listing.pageSize}
        onPageSizeChange={listing.setPageSize}
        page={listing.page}
        totalCount={sortedItems.length}
        onPageChange={listing.setPage}
      >
        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
            <colgroup>
              <col style={{ width: `calc(100% - ${TEMPLATE_ACTION_WIDTH_PX + 190}px)` }} />
              <col style={{ width: 190 }} />
              <col style={{ width: TEMPLATE_ACTION_WIDTH_PX }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <FilterableSortHeader
                  label="Template Name"
                  field="templateName"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={nameFilter}
                  filterOptions={nameFilterOptions}
                  onFilter={(value) => {
                    listing.setPage(0)
                    setNameFilter(value)
                  }}
                  sx={TABLE_HEADER_CELL_SX}
                />
                <FilterableSortHeader
                  label="Status"
                  field="status"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  filterValue={statusFilter}
                  filterOptions={statusFilterOptions}
                  onFilter={(value) => {
                    listing.setPage(0)
                    setStatusFilter(value)
                  }}
                  sx={{ ...TABLE_HEADER_CELL_SX, textAlign: 'center' }}
                />
                <TableCell sx={{ ...TABLE_HEADER_CELL_SX, width: TEMPLATE_ACTION_WIDTH_PX, textAlign: 'center' }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading &&
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(3)].map((__, j) => (
                      <TableCell key={j} sx={{ py: '10px', px: LISTING_EDGE_PAD }}>
                        <Skeleton variant="text" width="80%" height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && pagedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ border: 0 }}>
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <FileText size={32} color={tokens.color.neutral[300]} strokeWidth={1.75} />
                      <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                        No templates found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading &&
                pagedItems.map((template) => (
                  <TableRow
                    key={template.id}
                    onClick={() => canView && navigate(`/user-management/templates/${template.id}`)}
                    sx={{
                      '&:hover': { bgcolor: hoverBg },
                      '&:last-child td': { border: 0 },
                      cursor: canView ? 'pointer' : 'default',
                    }}
                  >
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.3 }}>
                        {template.templateName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <Box sx={CENTER_CELL_CONTENT_SX}>
                        <StatusColumnToggle
                          active={template.status === 'active'}
                          disabled={!canEdit || toggleSavingId === template.id}
                          onToggle={() => handleToggleStatus(template)}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={TABLE_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                      <Box sx={CENTER_CELL_CONTENT_SX}>
                        <TemplateRowActions
                          canView={canView}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onView={() => navigate(`/user-management/templates/${template.id}`)}
                          onEdit={() => navigate(`/user-management/templates/${template.id}/edit`)}
                          onDelete={() => setDeleteTarget(template)}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ListingTemplate>

      <DeleteDialog
        open={Boolean(deleteTarget)}
        template={deleteTarget}
        saving={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
