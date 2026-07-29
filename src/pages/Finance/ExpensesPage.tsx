import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  FormControl,
  Select,
  MenuItem,
  Divider,
  IconButton as MuiIconButton,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useTheme, alpha } from '@mui/material/styles'
import { Receipt, Plus, Wallet, Layers, Link2, Users, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ListingTemplate } from '@/components/templates'
import type { FilterField, ColumnItem } from '@/components/templates/ListingTemplate'
import { StatusBadge, Modal, Button, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchExpenses, deleteExpense } from '@/slices/live/thunk'
import type { Expense, ExpenseType } from '@/slices/live/types'
import { formatCurrency, formatDate, toSlug } from '@/utils/formatters'
import { GlobalExpenseDrawer } from '@/components/expenses/GlobalExpenseDrawer'
import {
  ExpenseTypeBadge,
  ViewExpenseModal,
  expenseServiceCell,
  expenseStatusDisplay,
  expenseVendorCell,
} from '@/components/expenses/expenseShared'

type StatusFilter = 'all' | 'pending' | 'included_in_payment'
type TypeTab = 'all' | ExpenseType

type VisibleCols = {
  type: boolean
  description: boolean
  project: boolean
  vendor: boolean
  service: boolean
  amount: boolean
  date: boolean
  status: boolean
}

/** Mirrors VendorsPage TABLE_HEADER_CELL_SX / TABLE_CELL_SX. */
const EXP_ACTION_WIDTH_PX = 44
const EXP_CELL_PAD_X = '14px'
const LISTING_EDGE_PAD = EXP_CELL_PAD_X

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

const STICKY_ACTION_SX = {
  position: 'sticky' as const,
  right: 0,
  zIndex: 1,
}

const HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: '8px',
  px: EXP_CELL_PAD_X,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  boxSizing: 'border-box' as const,
}

const HEADER_ACTION_SX = {
  ...HEADER_SX,
  ...STICKY_ACTION_SX,
  width: EXP_ACTION_WIDTH_PX,
  minWidth: EXP_ACTION_WIDTH_PX,
  maxWidth: EXP_ACTION_WIDTH_PX,
  whiteSpace: 'nowrap' as const,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  pl: 0,
  pr: LISTING_EDGE_PAD,
  bgcolor: 'background.default',
  zIndex: 2,
}

const CELL_SX = {
  fontSize: 12,
  py: '7px',
  px: EXP_CELL_PAD_X,
  verticalAlign: 'top' as const,
  boxSizing: 'border-box' as const,
}

const HEADER_STATUS_SX = {
  ...HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const CELL_STATUS_SX = {
  ...CELL_SX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
}

const CELL_ACTION_SX = {
  py: '7px',
  pl: 0,
  pr: LISTING_EDGE_PAD,
  width: EXP_ACTION_WIDTH_PX,
  minWidth: EXP_ACTION_WIDTH_PX,
  maxWidth: EXP_ACTION_WIDTH_PX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
  bgcolor: 'background.paper',
  ...STICKY_ACTION_SX,
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }

function expenseSearchHaystack(e: Expense, projectLabel: string): string {
  const vendorStr = expenseVendorCell(e)
  const parts = [e.description, projectLabel, vendorStr, expenseServiceCell(e)]
  if (e.vendorName) parts.push(e.vendorName)
  if (e.vendorAllocations?.length) {
    for (const a of e.vendorAllocations) parts.push(a.vendorName)
  }
  return parts.join(' ').toLowerCase()
}

function visibleColCount(v: VisibleCols): number {
  return Object.values(v).filter(Boolean).length + 1
}

export default function ExpensesPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const theme = useTheme()
  const { showToast } = useToast()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  const projects = useAppSelector((s) => s.projects.items ?? [])
  const expenses = useAppSelector((s) => s.live.expenses ?? [])
  const saving = useAppSelector((s) => s.live.saving)

  const [financeLoaded, setFinanceLoaded] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewExpense, setViewExpense] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const [search, setSearch] = useState('')
  const [typeTab, setTypeTab] = useState<TypeTab>('all')
  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({
    dateFrom: '',
    dateTo: '',
  })
  const [visibleColumns, setVisibleColumns] = useState<VisibleCols>({
    type: true,
    description: true,
    project: true,
    vendor: true,
    service: true,
    amount: true,
    date: true,
    status: true,
  })

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuExpense, setMenuExpense] = useState<Expense | null>(null)

  const projectIdsKey = useMemo(
    () => projects.map((p) => p.id).sort().join(','),
    [projects],
  )

  useEffect(() => {
    void dispatch(fetchProjects({ pageSize: 100 }))
  }, [dispatch])

  const refetchAllExpenses = useCallback(async () => {
    if (projects.length === 0) return
    await Promise.all(projects.map((p) => dispatch(fetchExpenses(p.id)).unwrap()))
  }, [dispatch, projects])

  useEffect(() => {
    if (projects.length === 0) {
      setFinanceLoaded(true)
      return
    }
    const hadStoreData = expenses.length > 0
    let cancelled = false
    if (!hadStoreData) setFinanceLoaded(false)

    void (async () => {
      try {
        await Promise.all(projects.map((p) => dispatch(fetchExpenses(p.id)).unwrap()))
      } finally {
        if (!cancelled) setFinanceLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, projectIdsKey, projects])

  const projectNameById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of projects) m[p.id] = p.name
    return m
  }, [projects])

  const handleSearchChange = (v: string) => {
    setSearch(v)
    setPage(0)
  }

  const filterConfig: FilterField[] = useMemo(
    () => [
      { field: 'dateFrom', label: 'Date from (YYYY-MM-DD)', type: 'text' },
      { field: 'dateTo', label: 'Date to (YYYY-MM-DD)', type: 'text' },
    ],
    [],
  )

  const baseFiltered = useMemo(() => {
    const dateFrom = String(activeFilters.dateFrom ?? '')
    const dateTo = String(activeFilters.dateTo ?? '')
    const q = search.trim().toLowerCase()
    let rows = [...expenses]

    if (filterProjectId) rows = rows.filter((e) => e.projectId === filterProjectId)
    if (filterStatus !== 'all') rows = rows.filter((e) => e.status === filterStatus)
    if (dateFrom) rows = rows.filter((e) => e.date >= dateFrom)
    if (dateTo) rows = rows.filter((e) => e.date <= dateTo)
    if (q) {
      rows = rows.filter((e) => {
        const pl = e.projectName ?? projectNameById[e.projectId] ?? e.projectId
        return expenseSearchHaystack(e, pl).includes(q)
      })
    }
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return rows
  }, [expenses, search, filterProjectId, filterStatus, activeFilters, projectNameById])

  const tabFiltered = useMemo(() => {
    if (typeTab === 'all') return baseFiltered
    return baseFiltered.filter((e) => e.type === typeTab)
  }, [baseFiltered, typeTab])

  const tabCounts = useMemo(() => {
    return {
      all: baseFiltered.length,
      additional: baseFiltered.filter((e) => e.type === 'additional').length,
      vendor_linked: baseFiltered.filter((e) => e.type === 'vendor_linked').length,
      common: baseFiltered.filter((e) => e.type === 'common').length,
      office_expenses: baseFiltered.filter((e) => e.type === 'office_expenses').length,
    }
  }, [baseFiltered])

  const kpis = useMemo(() => {
    const list = tabFiltered
    const total = list.reduce((s, e) => s + e.amount, 0)
    const additional = list.filter((e) => e.type === 'additional').reduce((s, e) => s + e.amount, 0)
    const vendorLinked = list
      .filter((e) => e.type === 'vendor_linked')
      .reduce((s, e) => s + e.amount, 0)
    const common = list.filter((e) => e.type === 'common').reduce((s, e) => s + e.amount, 0)
    const officeExpenses = list
      .filter((e) => e.type === 'office_expenses')
      .reduce((s, e) => s + e.amount, 0)
    return { total, additional, vendorLinked, common, officeExpenses }
  }, [tabFiltered])

  const statCards = [
    {
      label: 'Total Expenses',
      value: `₹${formatCurrency(kpis.total)}`,
      variant: 'default' as const,
      icon: <Wallet size={24} strokeWidth={1.75} />,
    },
    {
      label: 'Additional',
      value: `₹${formatCurrency(kpis.additional)}`,
      variant: 'purple' as const,
      icon: <Layers size={24} strokeWidth={1.75} />,
    },
    {
      label: 'Vendor Linked',
      value: `₹${formatCurrency(kpis.vendorLinked)}`,
      variant: 'info' as const,
      icon: <Link2 size={24} strokeWidth={1.75} />,
    },
    {
      label: 'Common',
      value: `₹${formatCurrency(kpis.common)}`,
      variant: 'teal' as const,
      icon: <Users size={24} strokeWidth={1.75} />,
    },
    {
      label: 'Office Expenses',
      value: `₹${formatCurrency(kpis.officeExpenses)}`,
      variant: 'warning' as const,
      icon: <Building2 size={24} strokeWidth={1.75} />,
    },
  ]

  const tabs = [
    { label: 'All', value: 'all', count: tabCounts.all },
    { label: 'Additional', value: 'additional', count: tabCounts.additional },
    { label: 'Vendor Linked', value: 'vendor_linked', count: tabCounts.vendor_linked },
    { label: 'Common', value: 'common', count: tabCounts.common },
    { label: 'Office Expenses', value: 'office_expenses', count: tabCounts.office_expenses },
  ]

  const columnsConfig: ColumnItem[] = useMemo(
    () => [
      { field: 'type', label: 'Type', visible: visibleColumns.type },
      { field: 'description', label: 'Description', visible: visibleColumns.description },
      { field: 'project', label: 'Project', visible: visibleColumns.project },
      { field: 'vendor', label: 'Vendor', visible: visibleColumns.vendor },
      { field: 'service', label: 'Service', visible: visibleColumns.service },
      { field: 'amount', label: 'Amount', visible: visibleColumns.amount },
      { field: 'date', label: 'Date', visible: visibleColumns.date },
      { field: 'status', label: 'Status', visible: visibleColumns.status },
    ],
    [visibleColumns],
  )

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    const k = field as keyof VisibleCols
    if (k in visibleColumns) setVisibleColumns((prev) => ({ ...prev, [k]: visible }))
  }

  const pagedRows = useMemo(() => {
    const start = page * pageSize
    return tabFiltered.slice(start, start + pageSize)
  }, [tabFiltered, page, pageSize])

  const mainColCount = useMemo(() => visibleColCount(visibleColumns), [visibleColumns])

  const visibleDataColCount = useMemo(
    () => Object.values(visibleColumns).filter(Boolean).length,
    [visibleColumns],
  )

  const dataColWidth = useMemo(
    () => `calc((100% - ${EXP_ACTION_WIDTH_PX}px) / ${Math.max(visibleDataColCount, 1)})`,
    [visibleDataColCount],
  )

  const loading = !financeLoaded && projects.length > 0 && expenses.length === 0

  function handleTabChange(v: string) {
    setTypeTab(v as TypeTab)
    setPage(0)
  }

  function handleFilterChange(next: Record<string, unknown>) {
    setActiveFilters(next)
    setPage(0)
  }

  function handleFilterReset() {
    setActiveFilters({ dateFrom: '', dateTo: '' })
    setPage(0)
  }

  function openMenu(e: React.MouseEvent<HTMLElement>, exp: Expense) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuExpense(exp)
  }

  function closeMenu() {
    setMenuAnchor(null)
    setMenuExpense(null)
  }

  function goEditProject(exp: Expense) {
    const name = projectNameById[exp.projectId]
    if (!name) {
      showToast({ title: 'Project not found', variant: 'error' })
      return
    }
    navigate(`/projects/${toSlug(name)}#live`, { state: { liveSubTab: 'expenses' } })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await dispatch(
        deleteExpense({ projectId: deleteTarget.projectId, expenseId: deleteTarget.id }),
      ).unwrap()
      showToast({ title: 'Expense deleted', variant: 'success' })
      await refetchAllExpenses()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
    setDeleteTarget(null)
  }

  const viewModalProjectName =
    viewExpense != null
      ? (viewExpense.projectName ?? projectNameById[viewExpense.projectId] ?? viewExpense.projectId)
      : undefined

  const toolbarAfterSearch = (
    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
      <FormControl size="small" sx={{ minWidth: { xs: 1, sm: 160 } }}>
        <Select
          displayEmpty
          value={filterProjectId}
          onChange={(e) => {
            setFilterProjectId(String(e.target.value))
            setPage(0)
          }}
          sx={{ fontSize: 12, height: 32 }}
        >
          <MenuItem value="" sx={{ fontSize: 12 }}>
            All projects
          </MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: { xs: 1, sm: 200 } }}>
        <Select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as StatusFilter)
            setPage(0)
          }}
          sx={{ fontSize: 12, height: 32 }}
        >
          <MenuItem value="all" sx={{ fontSize: 12 }}>
            All
          </MenuItem>
          <MenuItem value="pending" sx={{ fontSize: 12 }}>
            Pending
          </MenuItem>
          <MenuItem value="included_in_payment" sx={{ fontSize: 12 }}>
            Included in Payment
          </MenuItem>
        </Select>
      </FormControl>
    </Stack>
  )

  return (
    <>
      <ListingTemplate
        icon={<Receipt size={20} strokeWidth={1.75} />}
        title="Expenses"
        subtitle="Cross-project expense tracking"
        primaryAction={{
          label: 'Add Expense',
          onClick: () => setDrawerOpen(true),
          startIcon: <Plus size={16} strokeWidth={2} />,
        }}
        statCards={statCards}
        tabs={tabs}
        activeTab={typeTab}
        onTabChange={handleTabChange}
        searchPlaceholder="Search description, project, vendor…"
        searchValue={search}
        onSearchChange={handleSearchChange}
        toolbarAfterSearch={toolbarAfterSearch}
        filterConfig={filterConfig}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
        columns={columnsConfig}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        showExport
        onExport={() => showToast({ title: 'Export started (placeholder)', variant: 'success' })}
        pageSize={pageSize}
        totalCount={tabFiltered.length}
        page={page}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s)
          setPage(0)
        }}
      >
        <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
            <colgroup>
              {visibleColumns.type && <col style={{ width: dataColWidth }} />}
              {visibleColumns.description && <col style={{ width: dataColWidth }} />}
              {visibleColumns.project && <col style={{ width: dataColWidth }} />}
              {visibleColumns.vendor && <col style={{ width: dataColWidth }} />}
              {visibleColumns.service && <col style={{ width: dataColWidth }} />}
              {visibleColumns.amount && <col style={{ width: dataColWidth }} />}
              {visibleColumns.date && <col style={{ width: dataColWidth }} />}
              {visibleColumns.status && <col style={{ width: dataColWidth }} />}
              <col style={{ width: EXP_ACTION_WIDTH_PX }} />
            </colgroup>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                {visibleColumns.type && <TableCell sx={HEADER_SX}>Type</TableCell>}
                {visibleColumns.description && <TableCell sx={HEADER_SX}>Description</TableCell>}
                {visibleColumns.project && <TableCell sx={HEADER_SX}>Project</TableCell>}
                {visibleColumns.vendor && <TableCell sx={HEADER_SX}>Vendor</TableCell>}
                {visibleColumns.service && <TableCell sx={HEADER_SX}>Service</TableCell>}
                {visibleColumns.amount && <TableCell sx={HEADER_SX}>Amount</TableCell>}
                {visibleColumns.date && <TableCell sx={HEADER_SX}>Date</TableCell>}
                {visibleColumns.status && <TableCell sx={HEADER_STATUS_SX}>Status</TableCell>}
                <TableCell sx={HEADER_ACTION_SX}>
                  <Box sx={CENTER_CELL_CONTENT_SX}>Action</Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading &&
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(mainColCount + 1)].map((__, j) => (
                      <TableCell key={j} sx={CELL_SX}>
                        <Skeleton height={20} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={mainColCount + 1} sx={{ ...CELL_SX, textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No projects loaded
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!loading && projects.length > 0 && tabFiltered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={mainColCount + 1} sx={{ ...CELL_SX, textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {expenses.length === 0 ? 'No expenses yet' : 'No expenses match the filters'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                pagedRows.map((exp) => {
                  const st = expenseStatusDisplay(exp.status)
                  const projectLabel = exp.projectName ?? projectNameById[exp.projectId] ?? exp.projectId
                  return (
                    <TableRow
                      key={exp.id}
                      hover
                      sx={{
                        '& td': { height: 44 },
                        '&:hover': { bgcolor: hoverBg },
                        '&:hover td': { bgcolor: hoverBg },
                      }}
                    >
                      {visibleColumns.type && (
                        <TableCell sx={CELL_SX}>
                          <ExpenseTypeBadge type={exp.type} />
                        </TableCell>
                      )}
                      {visibleColumns.description && (
                        <TableCell sx={CELL_SX}>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                            {exp.description}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleColumns.project && (
                        <TableCell sx={CELL_SX}>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {projectLabel}
                          </Typography>
                        </TableCell>
                      )}
                      {visibleColumns.vendor && (
                        <TableCell sx={CELL_SX}>{expenseVendorCell(exp)}</TableCell>
                      )}
                      {visibleColumns.service && (
                        <TableCell sx={CELL_SX}>{expenseServiceCell(exp)}</TableCell>
                      )}
                      {visibleColumns.amount && (
                        <TableCell sx={CELL_SX}>₹{formatCurrency(exp.amount)}</TableCell>
                      )}
                      {visibleColumns.date && (
                        <TableCell sx={CELL_SX}>{formatDate(exp.date)}</TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell sx={CELL_STATUS_SX}>
                          <Box sx={CENTER_CELL_CONTENT_SX}>
                            <StatusBadge status={st.status} label={st.label} size="small" />
                          </Box>
                        </TableCell>
                      )}
                      <TableCell sx={CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                        <Box sx={CENTER_CELL_CONTENT_SX}>
                          <MuiIconButton size="small" aria-label="More" onClick={(e) => openMenu(e, exp)} sx={{ p: 0.25 }}>
                            <MoreVertIcon sx={{ fontSize: 14 }} />
                          </MuiIconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </ListingTemplate>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && menuExpense != null}
        onClose={closeMenu}
        slotProps={{ paper: { elevation: 2 } }}
      >
        <MuiMenuItem
          sx={menuItemSx}
          onClick={() => {
            if (menuExpense) setViewExpense(menuExpense)
            closeMenu()
          }}
        >
          View
        </MuiMenuItem>
        {menuExpense?.status === 'pending' && (
          <>
            <Divider />
            <MuiMenuItem
              sx={menuItemSx}
              onClick={() => {
                if (menuExpense) goEditProject(menuExpense)
                closeMenu()
              }}
            >
              Edit
            </MuiMenuItem>
            <MuiMenuItem
              sx={{ ...menuItemSx, color: 'error.main' }}
              onClick={() => {
                if (menuExpense) setDeleteTarget(menuExpense)
                closeMenu()
              }}
            >
              Delete
            </MuiMenuItem>
          </>
        )}
      </Menu>

      <GlobalExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void refetchAllExpenses()}
      />

      <ViewExpenseModal
        open={!!viewExpense}
        expense={viewExpense}
        onClose={() => setViewExpense(null)}
        projectName={viewModalProjectName}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete expense?"
        size="xs"
        footer={
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button variant="outlined" size="sm" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" color="error" size="sm" onClick={confirmDelete} loading={saving}>
              Delete
            </Button>
          </Stack>
        }
      >
        <Typography variant="body2">
          Remove <strong>{deleteTarget?.description}</strong>? This cannot be undone.
        </Typography>
      </Modal>
    </>
  )
}
