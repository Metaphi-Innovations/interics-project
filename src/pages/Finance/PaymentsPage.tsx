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
import { ArrowLeft, Banknote, ChevronLeft, ChevronRight } from 'lucide-react'
import client from '@/api/client'
import { ListingTemplate } from '@/components/templates'
import type { FilterField } from '@/components/templates/ListingTemplate'
import { Avatar, Badge, Button, useToast } from '@/design-system/components'
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
import type { Baseline } from '@/slices/baseline/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  baselineVendorMilestoneEntries,
  baselineVendorServiceRows,
  mergeMilestoneEntries,
  vendorInvoiceMilestoneEntries,
  clientPaymentLabel,
  complianceDisplayLabel,
  computeMilestonePayableStatus,
  computePayablePaymentStatus,
  computeVendorCardCounts,
  findInvoiceForMilestone,
  getPayableControl,
  globalVendorContextKey,
  invoiceMatchesRow,
  invoiceUploadedLabel,
  payableStatusBadgeColor,
  payableStatusLabel,
  SettlementRightPanel,
  SettlementSummaryStrip,
  type PayablePaymentStatus,
  type VendorMilestoneEntry,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement'

type StatusTab =
  | 'all'
  | 'waiting_for_client_payment'
  | 'pending_compliance'
  | 'ready_for_payment'
  | 'settled'
type PageMode = 'listing' | 'settlement'

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
  complianceLabel: string
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

/** Equal-width data columns; action column fixed. Horizontal padding matches listing toolbar (14px). */
const PAY_DATA_COL_COUNT = 7
const PAY_ACTION_WIDTH_PX = 56
const PAY_COL_WIDTH = `calc((100% - ${PAY_ACTION_WIDTH_PX}px) / ${PAY_DATA_COL_COUNT})`
const PAY_CELL_PAD_X = '14px'

const PAY_HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: '8px',
  px: PAY_CELL_PAD_X,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  lineHeight: 1.35,
  boxSizing: 'border-box' as const,
  width: PAY_COL_WIDTH,
}

const PAY_HEADER_ACTION_SX = {
  width: PAY_ACTION_WIDTH_PX,
  minWidth: PAY_ACTION_WIDTH_PX,
  maxWidth: PAY_ACTION_WIDTH_PX,
  py: '8px',
  px: PAY_CELL_PAD_X,
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  whiteSpace: 'nowrap' as const,
  boxSizing: 'border-box' as const,
}

const PAY_CELL_SX = {
  fontSize: 12,
  py: '7px',
  px: PAY_CELL_PAD_X,
  verticalAlign: 'top' as const,
  boxSizing: 'border-box' as const,
  width: PAY_COL_WIDTH,
}

const PAY_CELL_CHIP_SX = {
  ...PAY_CELL_SX,
  verticalAlign: 'middle' as const,
}

const PAY_CELL_ACTION_SX = {
  py: '7px',
  px: PAY_CELL_PAD_X,
  width: PAY_ACTION_WIDTH_PX,
  minWidth: PAY_ACTION_WIDTH_PX,
  maxWidth: PAY_ACTION_WIDTH_PX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
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
  ready_for_payment: ['View Details', 'Release Payment', 'Upload Invoice', 'View Compliance'],
  waiting_for_client_payment: ['View Details', 'View Client Payment'],
  pending_compliance: ['View Details', 'View Compliance'],
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

export default function PaymentsPage() {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { showToast } = useToast()
  const { items: projects, loading: projectsLoading } = useAppSelector((s) => s.projects)
  const { vendorInvoices, payments, expenses, reimbursements, vendorPayableControls } =
    useAppSelector((s) => s.live)

  const [baselinesByProject, setBaselinesByProject] = useState<Record<string, Baseline | null>>({})
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

  const [mode, setMode] = useState<PageMode>('listing')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuContext, setMenuContext] = useState<{
    vendorKey: string
    status: PayablePaymentStatus
  } | null>(null)

  useEffect(() => {
    void dispatch(fetchProjects({ pageSize: 100 }))
  }, [dispatch])

  useEffect(() => {
    if (projects.length === 0) {
      setBaselinesByProject({})
      return
    }
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        projects.map(async (p) => [p.id, await fetchBaselineForProject(p.id)] as const),
      )
      if (!cancelled) {
        setBaselinesByProject(Object.fromEntries(entries))
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

  const projectNameById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of projects) m[p.id] = p.name
    return m
  }, [projects])

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
      const fromBaseline = baselineVendorMilestoneEntries(
        p.id,
        p.name,
        baselinesByProject[p.id] ?? null,
      )
      const fromInvoices = vendorInvoiceMilestoneEntries(
        p.id,
        p.name,
        vendorInvoices,
      )
      out.push(...mergeMilestoneEntries(fromBaseline, fromInvoices))
    }
    return out
  }, [projects, baselinesByProject, vendorInvoices])

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
        complianceLabel: complianceDisplayLabel(control),
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
        row.complianceLabel,
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

  const selectedEntry = useMemo(() => {
    if (!selectedKey) return null
    return allCards.find((c) => globalVendorContextKey(c.projectId, c.row) === selectedKey) ?? null
  }, [selectedKey, allCards])

  useEffect(() => {
    if (mode !== 'settlement' || !selectedKey) return
    const entry = allCards.find((c) => globalVendorContextKey(c.projectId, c.row) === selectedKey)
    if (!entry) {
      setMode('listing')
      setSelectedKey(null)
      return
    }
    const rail = allCards.filter(
      (c) =>
        c.projectId === entry.projectId &&
        (!filterVendorId || c.row.vendorId === filterVendorId),
    )
    if (rail.length === 0) return
    const stillValid = rail.some((c) => globalVendorContextKey(c.projectId, c.row) === selectedKey)
    if (!stillValid) {
      setSelectedKey(globalVendorContextKey(rail[0].projectId, rail[0].row))
    }
  }, [mode, selectedKey, allCards, filterVendorId])

  const settlementRailCards = useMemo(() => {
    if (!selectedEntry) return []
    return allCards.filter(
      (c) =>
        c.projectId === selectedEntry.projectId &&
        (!filterVendorId || c.row.vendorId === filterVendorId),
    )
  }, [allCards, selectedEntry, filterVendorId])

  const settlementGroupedByProject = useMemo(() => {
    const map = new Map<string, CardEntry[]>()
    for (const c of settlementRailCards) {
      const list = map.get(c.projectId) ?? []
      list.push(c)
      map.set(c.projectId, list)
    }
    return [...map.entries()].sort((a, b) =>
      projectNameById[a[0]].localeCompare(projectNameById[b[0]]),
    )
  }, [settlementRailCards, projectNameById])

  const filterConfig: FilterField[] = useMemo(
    () => [
      { field: 'dateFrom', label: 'Date from (YYYY-MM-DD)', type: 'text' },
      { field: 'dateTo', label: 'Date to (YYYY-MM-DD)', type: 'text' },
    ],
    [],
  )

  const goToSettlement = useCallback((key: string) => {
    setSelectedKey(key)
    setMode('settlement')
  }, [])

  function openActionMenu(
    e: React.MouseEvent<HTMLElement>,
    vendorKey: string,
    status: PayablePaymentStatus,
  ) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuContext({ vendorKey, status })
  }

  function closeActionMenu() {
    setMenuAnchor(null)
    setMenuContext(null)
  }

  function handleActionMenuItem(label: string) {
    if (!menuContext) return
    closeActionMenu()
    goToSettlement(menuContext.vendorKey)
    if (label !== 'View Details') {
      showToast({ title: `${label} — open in settlement view`, variant: 'info' })
    }
  }

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
  }, [])

  const backToListing = useCallback(() => {
    setMode('listing')
    setSelectedKey(null)
  }, [])

  const handlePaymentCreated = useCallback(() => {
    setMode('listing')
    setSelectedKey(null)
  }, [])

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

  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  return (
    <>
      {mode === 'listing' && (
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
        >
          <>
              <TableContainer sx={{ overflow: 'visible', width: '100%' }}>
                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                      <TableCell sx={PAY_HEADER_SX}>Vendor</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Project</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Milestone</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>
                        Invoice Uploaded
                      </TableCell>
                      <TableCell sx={PAY_HEADER_SX}>
                        Client Payment
                      </TableCell>
                      <TableCell sx={PAY_HEADER_SX}>Compliance</TableCell>
                      <TableCell sx={PAY_HEADER_SX}>
                        Payment Status
                      </TableCell>
                      <TableCell sx={PAY_HEADER_ACTION_SX}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isDataLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ ...PAY_CELL_SX, color: 'text.secondary', py: 4 }}>
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
                        <TableCell colSpan={8} sx={{ ...PAY_CELL_SX, color: 'text.secondary', py: 4 }}>
                          No vendor milestones match the filters. Finalize baselines or adjust filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row) => (
                        <TableRow
                          key={row.key}
                          hover
                          sx={{ '&:hover': { bgcolor: hoverBg }, '&:last-child td': { border: 0 } }}
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
                            <Badge
                              label={row.invLabel}
                              variant="soft"
                              color={row.invLabel === 'Uploaded' ? 'success' : 'warning'}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
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
                          </TableCell>
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography
                              variant="body2"
                              sx={{
                                ...PAY_TEXT_BODY_SX,
                                fontWeight: 600,
                                color:
                                  row.complianceLabel === 'Complete'
                                    ? 'success.main'
                                    : 'text.secondary',
                              }}
                            >
                              {row.complianceLabel}
                            </Typography>
                          </TableCell>
                          <TableCell sx={PAY_CELL_CHIP_SX}>
                            <Badge
                              label={payableStatusLabel(row.payableSt)}
                              variant="soft"
                              color={payableStatusBadgeColor(row.payableSt)}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell sx={PAY_CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              aria-label="Row actions"
                              onClick={(e) => openActionMenu(e, row.vendorKey, row.payableSt)}
                              sx={{ p: 0.5 }}
                            >
                              <MoreVertIcon sx={{ fontSize: 16 }} />
                            </IconButton>
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
          {(menuContext ? ACTION_MENU_BY_STATUS[menuContext.status] : []).map((label) => (
            <MenuItem key={label} sx={menuItemSx} onClick={() => handleActionMenuItem(label)}>
              {label}
            </MenuItem>
          ))}
        </Menu>
        </>
      )}

      {mode === 'settlement' && (
        <Box sx={{ p: { xs: 2, md: 3, lg: 4 }, maxWidth: 1920, mx: 'auto' }}>
          <Stack direction="row" alignItems="flex-start" gap={2} sx={{ mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: tokens.color.primary[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Banknote size={20} strokeWidth={1.75} color={tokens.color.primary[600]} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 22 } }}>
                Payable
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Cross-project vendor payments and settlement workflow
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="text"
            size="sm"
            label="Back to payments"
            startIcon={<ArrowLeft size={16} strokeWidth={1.75} />}
            onClick={backToListing}
            sx={{ mb: 2 }}
          />

          {selectedEntry && (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              alignItems="stretch"
              gap={2}
              sx={{ mb: 3, minHeight: { md: 480 } }}
            >
              <Box
                sx={{
                  width: { xs: 1, md: 280 },
                  flexShrink: 0,
                  border: `1px solid ${tokens.color.neutral[100]}`,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  maxHeight: { md: '70vh' },
                  overflow: 'auto',
                }}
              >
                <Typography variant="overline" sx={{ px: 2, pt: 2, fontSize: 10, letterSpacing: 0.6 }}>
                  Vendors by project
                </Typography>
                {!financeLoaded && (
                  <Typography variant="body2" sx={{ p: 2, fontSize: 12, color: 'text.secondary' }}>
                    Loading…
                  </Typography>
                )}
                {financeLoaded && settlementGroupedByProject.length === 0 && (
                  <Typography variant="body2" sx={{ p: 2, fontSize: 12, color: 'text.secondary' }}>
                    No vendor mappings for this project.
                  </Typography>
                )}
                {financeLoaded &&
                  settlementGroupedByProject.map(([projectId, cards]) => (
                    <Box key={projectId} sx={{ px: 2, pb: 1 }}>
                      <Typography
                        variant="overline"
                        sx={{
                          fontSize: 10,
                          letterSpacing: 0.8,
                          color: 'text.secondary',
                          display: 'block',
                          pt: 1,
                          pb: 0.5,
                        }}
                      >
                        {projectNameById[projectId]?.toUpperCase() ?? projectId}
                      </Typography>
                      <Stack gap={1}>
                        {cards.map((c) => {
                          const key = globalVendorContextKey(c.projectId, c.row)
                          const selected = key === selectedKey
                          const bl = baselinesByProject[c.projectId] ?? null
                          const inv = vendorInvoices.filter((v) => v.projectId === c.projectId)
                          const ex = expenses.filter((e) => e.projectId === c.projectId)
                          const rb = reimbursements.filter((r) => r.projectId === c.projectId)
                          const counts = computeVendorCardCounts(bl, inv, ex, rb, c.row)
                          const controlRail = getPayableControl(vendorPayableControls, c.projectId, c.row)
                          const railPayableSt = computePayablePaymentStatus(counts, controlRail)
                          return (
                            <Box
                              key={key}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedKey(key)}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedKey(key)}
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: '2px solid',
                                borderColor: selected ? tokens.color.primary[500] : tokens.color.neutral[100],
                                bgcolor: selected ? tokens.color.primary[50] : 'background.paper',
                                cursor: 'pointer',
                                transition: 'border-color 0.15s, background-color 0.15s',
                              }}
                            >
                              <Stack direction="row" gap={1.5} alignItems="flex-start">
                                <Avatar name={c.row.vendorName} size="sm" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                                    {c.row.vendorName}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                                    {c.projectName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}
                                  >
                                    {c.row.serviceName}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, mt: 0.75 }}>
                                    ₹{formatCurrency(counts.outstanding)}
                                  </Typography>
                                  <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                                    {counts.pendingInv > 0 && (
                                      <Badge label={String(counts.pendingInv)} variant="soft" color="info" size="sm" />
                                    )}
                                    {counts.pendingExp > 0 && (
                                      <Badge label={String(counts.pendingExp)} variant="soft" color="warning" size="sm" />
                                    )}
                                    {counts.pendingRmb > 0 && (
                                      <Badge label={String(counts.pendingRmb)} variant="soft" color="primary" size="sm" />
                                    )}
                                  </Stack>
                                  <Box sx={{ mt: 0.75 }}>
                                    <Badge
                                      label={payableStatusLabel(railPayableSt)}
                                      variant="soft"
                                      color={payableStatusBadgeColor(railPayableSt)}
                                      size="sm"
                                    />
                                  </Box>
                                </Box>
                              </Stack>
                            </Box>
                          )
                        })}
                      </Stack>
                    </Box>
                  ))}
              </Box>

              <SettlementRightPanel
                projectId={selectedEntry.projectId}
                projectName={selectedEntry.projectName}
                baseline={baselinesByProject[selectedEntry.projectId] ?? null}
                selectedRow={selectedEntry.row}
                showProjectCaption
                onPaymentCreated={handlePaymentCreated}
              />
            </Stack>
          )}
        </Box>
      )}
    </>
  )
}
