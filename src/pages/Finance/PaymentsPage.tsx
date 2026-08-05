import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Menu,
  CircularProgress,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import axios from 'axios'
import { Banknote, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import client from '@/api/client'
import { ListingTemplate } from '@/components/templates'
import type { FilterField, TabItem } from '@/components/templates/ListingTemplate'
import { Avatar, Badge, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { AppDispatch } from '@/store'
import { formatDate, formatInr } from '@/utils/formatters'
import { fetchProjects } from '@/slices/projects/thunk'
import {
  fetchExpenses,
  fetchPayments,
  fetchReimbursements,
  fetchVendorInvoices,
  fetchVendorPayableControls,
} from '@/slices/live/thunk'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import {
  baselineVendorMilestoneEntries,
  baselineVendorServiceRows,
  mergeMilestoneEntriesWithVendorPO,
  vendorInvoiceMilestoneEntries,
  vendorPOVendorMilestoneEntries,
  computeMilestonePayableStatus,
  findInvoiceForMilestone,
  globalVendorContextKey,
  invoiceMatchesRow,
  payableStatusBadgeColor,
  payableStatusLabel,
  SettlementSummaryStrip,
  UploadVendorInvoiceDrawer,
  buildEligibleVendorInvoiceUploadEntries,
  buildProjectVendorOptionsFromVendorPOs,
  VendorPayableWorkflowDrawer,
  type PayablePaymentStatus,
  type UploadVendorInvoiceInitialSelection,
  type VendorMilestoneEntry,
  type VendorServiceRow,
  type VendorPayableDrawerFocus,
} from '@/pages/Projects/tabs/live/vendorSettlement'

interface CardEntry {
  projectId: string
  projectName: string
  row: VendorServiceRow
}

interface PaymentTableRow {
  key: string
  vendorKey: string
  entry: VendorMilestoneEntry
  payableSt: PayablePaymentStatus
  invoiceNumber: string
  invoiceDate: string
  invoiceAmount: number
}

async function loadFinanceForAllProjects(dispatch: AppDispatch, projectIds: string[]): Promise<void> {
  await Promise.all(
    projectIds.flatMap((id) => [
      dispatch(fetchVendorInvoices(id)).unwrap(),
      dispatch(fetchPayments(id)).unwrap(),
      dispatch(fetchExpenses(id)).unwrap(),
      dispatch(fetchReimbursements(id)).unwrap(),
      dispatch(fetchVendorPayableControls(id)).unwrap(),
    ]),
  )
}

/** Equal-width data columns + fixed Action; padding matches listing toolbar (14px). */
const PAY_DATA_COLUMN_COUNT = 7
const PAY_ACTION_WIDTH_PX = 60
const PAY_CELL_PAD_X = '14px'
const PAY_DATA_COL_WIDTH = `calc((100% - ${PAY_ACTION_WIDTH_PX}px) / ${PAY_DATA_COLUMN_COUNT})`
const PAY_TABLE_COL_SPAN = PAY_DATA_COLUMN_COUNT + 1

const PAY_HEADER_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: PAY_CELL_PAD_X,
    paddingRight: PAY_CELL_PAD_X,
  },
} as const

const PAY_BODY_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: PAY_CELL_PAD_X,
    paddingRight: PAY_CELL_PAD_X,
  },
} as const

const PAY_HEADER_ACTION_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: 0,
    paddingRight: PAY_CELL_PAD_X,
  },
} as const

const PAY_BODY_ACTION_PADDING = {
  '&.MuiTableCell-sizeSmall': {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: 0,
    paddingRight: PAY_CELL_PAD_X,
  },
} as const

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

const PAY_HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'middle' as const,
  lineHeight: 1.35,
  boxSizing: 'border-box' as const,
  width: PAY_DATA_COL_WIDTH,
  minWidth: 0,
  whiteSpace: 'nowrap' as const,
  ...PAY_HEADER_PADDING,
}

const PAY_HEADER_ACTION_SX = {
  ...PAY_HEADER_SX,
  width: PAY_ACTION_WIDTH_PX,
  minWidth: PAY_ACTION_WIDTH_PX,
  maxWidth: PAY_ACTION_WIDTH_PX,
  whiteSpace: 'nowrap' as const,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  ...PAY_HEADER_ACTION_PADDING,
}

const PAY_CELL_SX = {
  fontSize: 12,
  verticalAlign: 'top' as const,
  boxSizing: 'border-box' as const,
  width: PAY_DATA_COL_WIDTH,
  minWidth: 0,
  overflow: 'hidden',
  ...PAY_BODY_PADDING,
}

const PAY_CELL_CHIP_SX = {
  ...PAY_CELL_SX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
}

const PAY_HEADER_CHIP_SX = {
  ...PAY_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const PAY_HEADER_STATUS_SX = {
  ...PAY_HEADER_CHIP_SX,
}

const PAY_CELL_STATUS_SX = {
  ...PAY_CELL_CHIP_SX,
}

const PAY_CELL_ACTION_SX = {
  ...PAY_CELL_SX,
  width: PAY_ACTION_WIDTH_PX,
  minWidth: PAY_ACTION_WIDTH_PX,
  maxWidth: PAY_ACTION_WIDTH_PX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
  overflow: 'visible',
  ...PAY_BODY_ACTION_PADDING,
}

/** Vendor / Project — wrap like Vendors name column (wordBreak, no single-line ellipsis). */
const PAY_TEXT_WRAP_SX = {
  fontSize: 12,
  lineHeight: 1.35,
  wordBreak: 'break-word',
} as const

const PAY_TEXT_BODY_SX = {
  fontSize: 12,
  lineHeight: 1.35,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
}

const PAY_PAGE_SIZE = 10

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }

type PayableStatusTab = 'pending' | 'completed'

function isPayableCompleted(status: PayablePaymentStatus): boolean {
  return status === 'settled'
}

function actionMenuItemsForStatus(status: PayablePaymentStatus): readonly string[] {
  if (status === 'settled') return ['View Details']
  return ['View Details', 'Release Payment']
}

interface SimplePaginationProps {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}

function SimplePagination({ page, pageSize, total, onPage }: SimplePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      gap={1}
      sx={{ p: '10px 14px', borderTop: `1px solid ${tokens.color.neutral[100]}` }}
    >
      <Typography variant="caption" color="text.secondary">
        {total === 0 ? '0' : `${from}–${to}`} of {total}
      </Typography>
      <IconButton size="small" disabled={page <= 1} onClick={() => onPage(page - 1)} sx={{ p: '4px' }}>
        <ChevronLeft size={16} />
      </IconButton>
      <IconButton size="small" disabled={page >= totalPages} onClick={() => onPage(page + 1)} sx={{ p: '4px' }}>
        <ChevronRight size={16} />
      </IconButton>
    </Stack>
  )
}

async function fetchBaselineForProject(projectId: string): Promise<Baseline | null> {
  try {
    const res = await client.get<Baseline>(`/projects/${projectId}/baseline`)
    return res.data
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null
    throw e
  }
}

async function fetchVendorPOsForProject(projectId: string): Promise<VendorPO[]> {
  try {
    const res = await client.get<VendorPO[]>(`/projects/${projectId}/vendor-pos`)
    return res.data
  } catch {
    return []
  }
}

export default function PaymentsPage() {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { showToast } = useToast()
  const { items: rawProjects, loading: projectsLoading } = useAppSelector((s) => s.projects)
  const projects = rawProjects ?? []
  const vendorInvoices = useAppSelector((s) => s.live.vendorInvoices ?? [])
  const payments = useAppSelector((s) => s.live.payments ?? [])

  const [baselinesByProject, setBaselinesByProject] = useState<Record<string, Baseline | null>>({})
  const [vendorPOsByProject, setVendorPOsByProject] = useState<Record<string, VendorPO[]>>({})
  const [financeLoaded, setFinanceLoaded] = useState(false)

  const projectIdsKey = useMemo(
    () => projects.map((p) => p.id).sort().join(','),
    [projects],
  )

  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterVendorId, setFilterVendorId] = useState('')
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<PayableStatusTab>('pending')
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({
    dateFrom: '',
    dateTo: '',
  })

  const [page, setPage] = useState(1)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuContext, setMenuContext] = useState<PaymentTableRow | null>(null)
  const [workflowDrawer, setWorkflowDrawer] = useState<{
    entry: VendorMilestoneEntry
    focus: VendorPayableDrawerFocus
    readOnly: boolean
  } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadInitialSelection, setUploadInitialSelection] =
    useState<UploadVendorInvoiceInitialSelection | null>(null)

  useEffect(() => {
    void dispatch(fetchProjects({ pageSize: 100 }))
  }, [dispatch])

  useEffect(() => {
    if (projects.length === 0) {
      setBaselinesByProject({})
      setVendorPOsByProject({})
      return
    }
    let cancelled = false
    void (async () => {
      const baselineEntries = await Promise.all(
        projects.map(async (p) => [p.id, await fetchBaselineForProject(p.id)] as const),
      )
      const vendorPOEntries = await Promise.all(
        projects.map(async (p) => [p.id, await fetchVendorPOsForProject(p.id)] as const),
      )
      if (!cancelled) {
        setBaselinesByProject(Object.fromEntries(baselineEntries))
        setVendorPOsByProject(Object.fromEntries(vendorPOEntries))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectIdsKey, projects])

  useEffect(() => {
    if (projects.length === 0) {
      setFinanceLoaded(true)
      return
    }
    const hadStoreData = vendorInvoices.length > 0 || payments.length > 0
    let cancelled = false
    if (!hadStoreData) setFinanceLoaded(false)

    void (async () => {
      try {
        await loadFinanceForAllProjects(
          dispatch,
          projects.map((p) => p.id),
        )
      } finally {
        if (!cancelled) setFinanceLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, projectIdsKey, projects])

  const allCards = useMemo((): CardEntry[] => {
    const out: CardEntry[] = []
    for (const p of projects) {
      const bl = baselinesByProject[p.id] ?? null
      const rows = baselineVendorServiceRows(bl)
      for (const row of rows) {
        out.push({ projectId: p.id, projectName: p.name, row })
      }
    }
    return out
  }, [projects, baselinesByProject])

  const allMilestones = useMemo((): VendorMilestoneEntry[] => {
    const out: VendorMilestoneEntry[] = []
    for (const p of projects) {
      const bl = baselinesByProject[p.id] ?? null
      const vpos = vendorPOsByProject[p.id] ?? []
      const fromVendorPO = vendorPOVendorMilestoneEntries(p.id, p.name, vpos, bl)
      const fromBaseline = baselineVendorMilestoneEntries(p.id, p.name, bl)
      const fromInvoices = vendorInvoiceMilestoneEntries(p.id, p.name, vendorInvoices)
      out.push(...mergeMilestoneEntriesWithVendorPO(fromVendorPO, fromBaseline, fromInvoices))
    }
    return out
  }, [projects, baselinesByProject, vendorPOsByProject, vendorInvoices])

  const milestonesAfterProjectVendor = useMemo(() => {
    return allMilestones.filter((m) => {
      if (filterProjectId && m.projectId !== filterProjectId) return false
      if (filterVendorId && m.row.vendorId !== filterVendorId) return false
      return true
    })
  }, [allMilestones, filterProjectId, filterVendorId])

  const invoicesByProject = useMemo(() => {
    const map = new Map<string, typeof vendorInvoices>()
    for (const inv of vendorInvoices) {
      const list = map.get(inv.projectId)
      if (list) list.push(inv)
      else map.set(inv.projectId, [inv])
    }
    return map
  }, [vendorInvoices])

  const enrichMilestone = useCallback(
    (m: VendorMilestoneEntry): PaymentTableRow | null => {
      const scopedInv = invoicesByProject.get(m.projectId) ?? []
      const rowInvoices = scopedInv.filter((v) => invoiceMatchesRow(v, m.row))
      const milestoneInv = findInvoiceForMilestone(rowInvoices, m.milestone)
      if (!milestoneInv) return null
      const payableSt = computeMilestonePayableStatus(milestoneInv)
      return {
        key: `${globalVendorContextKey(m.projectId, m.row)}::${m.milestone.id}`,
        vendorKey: globalVendorContextKey(m.projectId, m.row),
        entry: m,
        payableSt,
        invoiceNumber: milestoneInv.invoiceNumber,
        invoiceDate: milestoneInv.invoiceDate,
        invoiceAmount: milestoneInv.baseAmount,
      }
    },
    [invoicesByProject],
  )

  const enrichedMilestones = useMemo(
    () =>
      milestonesAfterProjectVendor
        .map(enrichMilestone)
        .filter((row): row is PaymentTableRow => row != null),
    [milestonesAfterProjectVendor, enrichMilestone],
  )

  const searchedRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return enrichedMilestones
    return enrichedMilestones.filter((row) => {
      const haystack = [
        row.entry.row.vendorName,
        row.entry.projectName,
        row.entry.milestone.name,
        row.invoiceNumber,
        payableStatusLabel(row.payableSt),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [enrichedMilestones, search])

  const tabCounts = useMemo(() => {
    let pending = 0
    let completed = 0
    for (const row of searchedRows) {
      if (isPayableCompleted(row.payableSt)) completed += 1
      else pending += 1
    }
    return { pending, completed }
  }, [searchedRows])

  const listingRows = useMemo(() => {
    return searchedRows.filter((row) =>
      statusTab === 'completed'
        ? isPayableCompleted(row.payableSt)
        : !isPayableCompleted(row.payableSt),
    )
  }, [searchedRows, statusTab])

  const statusTabs: TabItem[] = useMemo(
    () => [
      { label: 'Pending', value: 'pending', count: tabCounts.pending },
      { label: 'Completed', value: 'completed', count: tabCounts.completed },
    ],
    [tabCounts],
  )

  const isDataLoading =
    projectsLoading ||
    (projects.length > 0 && !financeLoaded && vendorInvoices.length === 0 && payments.length === 0)

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAY_PAGE_SIZE
    return listingRows.slice(start, start + PAY_PAGE_SIZE)
  }, [listingRows, page])

  useEffect(() => {
    setPage(1)
  }, [filterProjectId, filterVendorId, search, statusTab])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(listingRows.length / PAY_PAGE_SIZE))
    if (page > maxPage) setPage(maxPage)
  }, [listingRows.length, page])

  const summaryVendorPOs = useMemo(() => {
    const all = Object.values(vendorPOsByProject).flat()
    return all.filter((po) => {
      if (filterProjectId && po.projectId !== filterProjectId) return false
      if (filterVendorId && po.vendorId !== filterVendorId) return false
      return true
    })
  }, [vendorPOsByProject, filterProjectId, filterVendorId])

  const summaryPayments = useMemo(() => {
    return payments.filter((p) => {
      if (filterProjectId && p.projectId !== filterProjectId) return false
      if (filterVendorId && p.vendorId !== filterVendorId) return false
      return true
    })
  }, [payments, filterProjectId, filterVendorId])

  const vendorOptions = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const c of allCards) {
      labels[c.row.vendorId] = c.row.vendorName
    }
    return Object.keys(labels).sort((a, b) => labels[a].localeCompare(labels[b]))
  }, [allCards])

  const vendorNameById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of allCards) m[c.row.vendorId] = c.row.vendorName
    return m
  }, [allCards])

  const filterConfig: FilterField[] = useMemo(
    () => [
      { field: 'dateFrom', label: 'Date from (YYYY-MM-DD)', type: 'text' },
      { field: 'dateTo', label: 'Date to (YYYY-MM-DD)', type: 'text' },
    ],
    [],
  )

  function openActionMenu(e: React.MouseEvent<HTMLElement>, row: PaymentTableRow) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuContext(row)
  }

  function closeActionMenu() {
    setMenuAnchor(null)
    setMenuContext(null)
  }

  const eligibleUploadEntries = useMemo(
    () =>
      buildEligibleVendorInvoiceUploadEntries(
        projects.map((p) => ({ id: p.id, name: p.name })),
        vendorPOsByProject,
        baselinesByProject,
        vendorInvoices,
      ),
    [projects, vendorPOsByProject, baselinesByProject, vendorInvoices],
  )

  const projectVendorOptions = useMemo(
    () =>
      buildProjectVendorOptionsFromVendorPOs(
        projects.map((p) => ({ id: p.id, name: p.name })),
        vendorPOsByProject,
      ),
    [projects, vendorPOsByProject],
  )

  function openUploadInvoice(selection?: UploadVendorInvoiceInitialSelection | null) {
    setUploadInitialSelection(selection ?? null)
    setUploadOpen(true)
  }

  function closeUploadInvoice() {
    setUploadOpen(false)
    setUploadInitialSelection(null)
  }

  function handleActionMenuItem(label: string) {
    if (!menuContext) return
    const { entry } = menuContext

    closeActionMenu()

    switch (label) {
      case 'Release Payment':
        setWorkflowDrawer({ entry, focus: 'payment', readOnly: false })
        break
      case 'View Details':
      default:
        setWorkflowDrawer({ entry, focus: 'details', readOnly: true })
        break
    }
  }

  function openUploadInvoiceFromWorkflow(milestoneId: string) {
    if (!workflowDrawer) return
    const { entry } = workflowDrawer
    setWorkflowDrawer(null)
    openUploadInvoice({
      projectId: entry.projectId,
      vendorId: entry.row.vendorId,
      serviceId: entry.row.serviceId,
      milestoneId,
    })
  }

  const toolbarAfterSearch = (
    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
      <FormControl size="small" sx={{ minWidth: { xs: 1, sm: 180 } }}>
        <Select
          displayEmpty
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(String(e.target.value))}
          sx={{ fontSize: 12, height: 32 }}
        >
          <MenuItem value="" sx={{ fontSize: 12 }}>
            All Projects
          </MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: { xs: 1, sm: 180 } }}>
        <Select
          displayEmpty
          value={filterVendorId}
          onChange={(e) => setFilterVendorId(String(e.target.value))}
          sx={{ fontSize: 12, height: 32 }}
        >
          <MenuItem value="" sx={{ fontSize: 12 }}>
            All Vendors
          </MenuItem>
          {vendorOptions.map((vid) => (
            <MenuItem key={vid} value={vid} sx={{ fontSize: 12 }}>
              {vendorNameById[vid] ?? vid}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  )

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
  }, [])

  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <>
        <ListingTemplate
          icon={<Banknote size={20} strokeWidth={1.75} />}
          title="Payable"
          subtitle="Cross-project vendor payments and settlement workflow"
          primaryAction={{
            label: 'Upload Invoice',
            onClick: () => openUploadInvoice(),
            startIcon: <Upload size={16} strokeWidth={1.75} />,
          }}
          customSummary={
            <SettlementSummaryStrip vendorPOs={summaryVendorPOs} payments={summaryPayments} />
          }
          tabs={statusTabs}
          activeTab={statusTab}
          onTabChange={(v) => setStatusTab(v as PayableStatusTab)}
          searchValue={search}
          onSearchChange={handleSearchChange}
          toolbarAfterSearch={toolbarAfterSearch}
          filterConfig={filterConfig}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onFilterReset={() => setActiveFilters({ dateFrom: '', dateTo: '' })}
          showExport
          onExport={() => showToast({ title: 'Export started (placeholder)', variant: 'success' })}
          clipCardContent={false}
        >
          <>
              <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 1080 }}>
                  <colgroup>
                    {Array.from({ length: PAY_DATA_COLUMN_COUNT }, (_, index) => (
                      <col key={index} style={{ width: PAY_DATA_COL_WIDTH }} />
                    ))}
                    <col style={{ width: `${PAY_ACTION_WIDTH_PX}px` }} />
                  </colgroup>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                      <TableCell sx={PAY_HEADER_SX}>Vendor</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Project</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Milestone</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Invoice No.</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Invoice date</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Invoice Amount</TableCell>
                      <TableCell sx={PAY_HEADER_STATUS_SX}>Payment Status</TableCell>
                      <TableCell sx={PAY_HEADER_ACTION_SX}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isDataLoading ? (
                      <TableRow>
                        <TableCell colSpan={PAY_TABLE_COL_SPAN} sx={{ ...PAY_CELL_SX, color: 'text.secondary', py: 4 }}>
                          <Stack direction="row" alignItems="center" justifyContent="center" gap={1}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              Loading payments…
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : listingRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={PAY_TABLE_COL_SPAN} sx={{ ...PAY_CELL_SX, color: 'text.secondary', py: 4 }}>
                          {searchedRows.length === 0
                            ? 'No vendor invoices yet. Upload an invoice to get started.'
                            : statusTab === 'completed'
                              ? 'No completed payments for this filter.'
                              : 'No pending payments for this filter.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row) => (
                        <TableRow
                          key={row.key}
                          hover
                          sx={{
                            '&:hover': { bgcolor: hoverBg },
                            '&:hover td': { bgcolor: hoverBg },
                            '&:last-child td': { border: 0 },
                          }}
                        >
                          <TableCell sx={PAY_CELL_SX}>
                            <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
                              <Box sx={{ flexShrink: 0 }}>
                                <Avatar name={row.entry.row.vendorName} size="sm" />
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ ...PAY_TEXT_WRAP_SX, fontWeight: 600, flex: 1, minWidth: 0 }}
                              >
                                {row.entry.row.vendorName}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography variant="body2" sx={PAY_TEXT_WRAP_SX}>
                              {row.entry.projectName}
                            </Typography>
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography variant="body2" sx={PAY_TEXT_BODY_SX}>
                              {row.entry.milestone.name}
                            </Typography>
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography variant="body2" sx={PAY_TEXT_BODY_SX}>
                              {row.invoiceNumber || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography variant="body2" sx={PAY_TEXT_BODY_SX}>
                              {row.invoiceDate ? formatDate(row.invoiceDate) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography variant="body2" sx={PAY_TEXT_BODY_SX}>
                              ₹{formatInr(row.invoiceAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={PAY_CELL_STATUS_SX}>
                            <Box sx={CENTER_CELL_CONTENT_SX}>
                              <Badge
                                label={payableStatusLabel(row.payableSt)}
                                variant="soft"
                                color={payableStatusBadgeColor(row.payableSt)}
                                size="sm"
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={PAY_CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                            <Box sx={CENTER_CELL_CONTENT_SX}>
                              <IconButton
                                size="small"
                                aria-label="Row actions"
                                onClick={(e) => openActionMenu(e, row)}
                              sx={{ p: 0.25 }}
                            >
                              <MoreVertIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {listingRows.length > 0 && (
                <SimplePagination
                  page={page}
                  pageSize={PAY_PAGE_SIZE}
                  total={listingRows.length}
                  onPage={setPage}
                />
              )}
          </>
        </ListingTemplate>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor) && menuContext != null}
          onClose={closeActionMenu}
          onClick={(e) => e.stopPropagation()}
          slotProps={{ paper: { elevation: 2 } }}
        >
          {(menuContext ? actionMenuItemsForStatus(menuContext.payableSt) : []).map((label) => (
            <MenuItem key={label} sx={menuItemSx} onClick={() => handleActionMenuItem(label)}>
              {label}
            </MenuItem>
          ))}
        </Menu>

        <VendorPayableWorkflowDrawer
          key={workflowDrawer ? `${workflowDrawer.entry.milestone.id}-${workflowDrawer.focus}` : 'closed'}
          open={workflowDrawer != null}
          onClose={() => setWorkflowDrawer(null)}
          entry={workflowDrawer?.entry ?? null}
          baseline={
            workflowDrawer ? baselinesByProject[workflowDrawer.entry.projectId] ?? null : null
          }
          focus={workflowDrawer?.focus}
          readOnly={workflowDrawer?.readOnly}
          onUploadInvoice={openUploadInvoiceFromWorkflow}
        />

        <UploadVendorInvoiceDrawer
          open={uploadOpen}
          onClose={closeUploadInvoice}
          eligibleEntries={eligibleUploadEntries}
          projectVendors={projectVendorOptions}
          initialSelection={uploadInitialSelection}
        />
    </>
  )
}
