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
import { Banknote, ChevronLeft, ChevronRight } from 'lucide-react'
import client from '@/api/client'
import { ListingTemplate } from '@/components/templates'
import type { FilterField } from '@/components/templates/ListingTemplate'
import { Avatar, Badge, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import type { AppDispatch } from '@/store'
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
  clientPaymentLabel,
  computeMilestonePayableStatus,
  findInvoiceForMilestone,
  getPayableControl,
  globalVendorContextKey,
  invoiceMatchesRow,
  invoiceUploadedLabel,
  payableStatusBadgeColor,
  payableStatusLabel,
  SettlementSummaryStrip,
  AddVendorInvoiceDrawer,
  VendorPayableWorkflowDrawer,
  type PayablePaymentStatus,
  type VendorMilestoneEntry,
  type VendorServiceRow,
  type VendorPayableDrawerFocus,
} from '@/pages/Projects/tabs/live/vendorSettlement'

type StatusTab =
  | 'all'
  | 'waiting_for_client_payment'
  | 'pending_compliance'
  | 'ready_for_payment'
  | 'settled'

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
  invLabel: string
  clientLabel: string
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
const PAY_DATA_COLUMN_COUNT = 6
const PAY_ACTION_WIDTH_PX = 60
const PAY_CELL_PAD_X = '14px'
const PAY_DATA_COL_WIDTH = `calc((100% - ${PAY_ACTION_WIDTH_PX}px) / ${PAY_DATA_COLUMN_COUNT})`

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
  verticalAlign: 'bottom' as const,
  lineHeight: 1.35,
  boxSizing: 'border-box' as const,
  width: PAY_DATA_COL_WIDTH,
  minWidth: 0,
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

const ACTION_MENU_BY_STATUS: Record<PayablePaymentStatus, string[]> = {
  ready_for_payment: ['View Details', 'Release Payment', 'Upload Invoice'],
  waiting_for_client_payment: ['View Details', 'View Client Payment'],
  pending_compliance: ['View Details'],
  settled: ['View Details', 'View Settlement History'],
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
  const vendorPayableControls = useAppSelector((s) => s.live.vendorPayableControls ?? [])

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
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
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
  const [uploadInvoiceDrawer, setUploadInvoiceDrawer] = useState<{
    projectId: string
    context: VendorServiceRow
    milestoneId: string
    baseline: Baseline | null
    vendorPOs: VendorPO[]
    editInvoiceId?: string
  } | null>(null)

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
    (m: VendorMilestoneEntry): PaymentTableRow => {
      const scopedInv = invoicesByProject.get(m.projectId) ?? []
      const rowInvoices = scopedInv.filter((v) => invoiceMatchesRow(v, m.row))
      const milestoneInv = findInvoiceForMilestone(rowInvoices, m.milestone)
      const control = getPayableControl(vendorPayableControls, m.projectId, m.row)
      const payableSt = computeMilestonePayableStatus(milestoneInv, control)
      return {
        key: `${globalVendorContextKey(m.projectId, m.row)}::${m.milestone.id}`,
        vendorKey: globalVendorContextKey(m.projectId, m.row),
        entry: m,
        payableSt,
        invLabel: invoiceUploadedLabel(milestoneInv),
        clientLabel: clientPaymentLabel(control),
      }
    },
    [invoicesByProject, vendorPayableControls],
  )

  const enrichedMilestones = useMemo(
    () => milestonesAfterProjectVendor.map(enrichMilestone),
    [milestonesAfterProjectVendor, enrichMilestone],
  )

  const milestonesAfterSearch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return enrichedMilestones
    return enrichedMilestones.filter((row) => {
      const haystack = [
        row.entry.row.vendorName,
        row.entry.projectName,
        row.entry.milestone.name,
        row.invLabel,
        row.clientLabel,
        payableStatusLabel(row.payableSt),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [enrichedMilestones, search])

  const statusCounts = useMemo(() => {
    const counts = {
      all: milestonesAfterSearch.length,
      waiting_for_client_payment: 0,
      pending_compliance: 0,
      ready_for_payment: 0,
      settled: 0,
    }
    for (const row of milestonesAfterSearch) {
      counts[row.payableSt] += 1
    }
    return counts
  }, [milestonesAfterSearch])

  const listingRows = useMemo(() => {
    if (statusTab === 'all') return milestonesAfterSearch
    return milestonesAfterSearch.filter((row) => row.payableSt === statusTab)
  }, [milestonesAfterSearch, statusTab])

  const isDataLoading =
    projectsLoading ||
    (projects.length > 0 && !financeLoaded && vendorInvoices.length === 0 && payments.length === 0)

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAY_PAGE_SIZE
    return listingRows.slice(start, start + PAY_PAGE_SIZE)
  }, [listingRows, page])

  useEffect(() => {
    setPage(1)
  }, [statusTab, filterProjectId, filterVendorId, search])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(listingRows.length / PAY_PAGE_SIZE))
    if (page > maxPage) setPage(maxPage)
  }, [listingRows.length, page])

  const summaryInvoices = useMemo(() => {
    return vendorInvoices.filter((inv) =>
      listingRows.some(
        (row) =>
          row.entry.projectId === inv.projectId &&
          invoiceMatchesRow(inv, row.entry.row) &&
          (inv.milestoneId === row.entry.milestone.id ||
            inv.milestoneName === row.entry.milestone.name),
      ),
    )
  }, [vendorInvoices, listingRows])

  const summaryPayments = useMemo(() => {
    const keys = new Set(listingRows.map((row) => `${row.entry.projectId}::${row.entry.row.vendorId}`))
    return payments.filter((p) => keys.has(`${p.projectId}::${p.vendorId}`))
  }, [payments, listingRows])

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

  function handleActionMenuItem(label: string) {
    if (!menuContext) return
    const { entry } = menuContext
    const projectId = entry.projectId
    const baseline = baselinesByProject[projectId] ?? null
    const vendorPOs = vendorPOsByProject[projectId] ?? []
    const scopedInv = (invoicesByProject.get(projectId) ?? []).filter((inv) =>
      invoiceMatchesRow(inv, entry.row),
    )
    const milestoneInv = findInvoiceForMilestone(scopedInv, entry.milestone)

    closeActionMenu()

    switch (label) {
      case 'Upload Invoice':
        setUploadInvoiceDrawer({
          projectId,
          context: entry.row,
          milestoneId: entry.milestone.id,
          baseline,
          vendorPOs,
          editInvoiceId: milestoneInv?.id,
        })
        break
      case 'Release Payment':
        setWorkflowDrawer({ entry, focus: 'payment', readOnly: false })
        break
      case 'View Client Payment':
        setWorkflowDrawer({ entry, focus: 'client-payment', readOnly: false })
        break
      case 'View Settlement History':
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
    setUploadInvoiceDrawer({
      projectId: entry.projectId,
      context: entry.row,
      milestoneId,
      baseline: baselinesByProject[entry.projectId] ?? null,
      vendorPOs: vendorPOsByProject[entry.projectId] ?? [],
    })
  }

  const tabs = [
    { label: 'All', value: 'all', count: statusCounts.all },
    {
      label: 'Waiting for Client',
      value: 'waiting_for_client_payment',
      count: statusCounts.waiting_for_client_payment,
    },
    {
      label: 'Pending Compliance',
      value: 'pending_compliance',
      count: statusCounts.pending_compliance,
    },
    { label: 'Ready for Payment', value: 'ready_for_payment', count: statusCounts.ready_for_payment },
    { label: 'Settled', value: 'settled', count: statusCounts.settled },
  ]

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
          customSummary={
            <SettlementSummaryStrip vendorInvoices={summaryInvoices} payments={summaryPayments} />
          }
          tabs={tabs}
          activeTab={statusTab}
          onTabChange={(v) => setStatusTab(v as StatusTab)}
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
                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
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
                      <TableCell sx={PAY_HEADER_CHIP_SX}>
                        Invoice Uploaded
                      </TableCell>
                      <TableCell sx={PAY_HEADER_CHIP_SX}>
                        Client Payment
                      </TableCell>
                      <TableCell sx={PAY_HEADER_STATUS_SX}>
                        Payment Status
                      </TableCell>
                      <TableCell sx={PAY_HEADER_ACTION_SX}>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isDataLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ ...PAY_CELL_SX, color: 'text.secondary', py: 4 }}>
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
                        <TableCell colSpan={7} sx={{ ...PAY_CELL_SX, color: 'text.secondary', py: 4 }}>
                          No vendor milestones match the filters. Finalize baselines or adjust filters.
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
                          <TableCell sx={PAY_CELL_CHIP_SX}>
                            <Box sx={CENTER_CELL_CONTENT_SX}>
                            <Badge
                              label={row.invLabel}
                              variant="soft"
                              color={row.invLabel === 'Uploaded' ? 'success' : 'warning'}
                              size="sm"
                            />
                            </Box>
                          </TableCell>
                          <TableCell sx={PAY_CELL_CHIP_SX}>
                            <Box sx={CENTER_CELL_CONTENT_SX}>
                            <Typography
                              variant="body2"
                              sx={{
                                ...PAY_TEXT_BODY_SX,
                                fontWeight: 600,
                                color: row.clientLabel === 'Received' ? 'success.main' : 'warning.main',
                              }}
                            >
                              {row.clientLabel}
                            </Typography>
                            </Box>
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
          {(menuContext ? ACTION_MENU_BY_STATUS[menuContext.payableSt] : []).map((label) => (
            <MenuItem key={label} sx={menuItemSx} onClick={() => handleActionMenuItem(label)}>
              {label}
            </MenuItem>
          ))}
        </Menu>

        <VendorPayableWorkflowDrawer
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

        <AddVendorInvoiceDrawer
          open={uploadInvoiceDrawer != null}
          onClose={() => setUploadInvoiceDrawer(null)}
          projectId={uploadInvoiceDrawer?.projectId ?? ''}
          context={uploadInvoiceDrawer?.context ?? null}
          presetMilestoneId={uploadInvoiceDrawer?.milestoneId}
          baseline={uploadInvoiceDrawer?.baseline ?? null}
          vendorPOs={uploadInvoiceDrawer?.vendorPOs ?? []}
          editInvoiceId={uploadInvoiceDrawer?.editInvoiceId}
        />
    </>
  )
}
