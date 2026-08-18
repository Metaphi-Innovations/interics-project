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
import { Banknote, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { ListingTemplate } from '@/components/templates'
import type { FilterField, TabItem } from '@/components/templates/ListingTemplate'
import { FilterableSortHeader, type ColumnFilterOption } from '@/components/listing'
import { Avatar, Badge, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { formatDate, formatInr } from '@/utils/formatters'
import { downloadCsv } from '@/api/downloadCsv'
import { fetchProjects } from '@/slices/projects/thunk'
import { dropdownsApi } from '@/api/dropdownsApi'
import {
  payablesService,
  toPayableSummaryKpis,
  type PayablesListItem,
} from '@/modules/finance/payables.service'
import type { PayableSummaryKpis } from '@/pages/Finance/utils/payableSummary'
import {
  fetchExpenses,
  fetchPayments,
  fetchReimbursements,
  fetchVendorInvoices,
  fetchVendorPayableControls,
} from '@/slices/live/thunk'
import { hydrateVendorInvoices } from '@/slices/live/reducer'
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
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  invoiceAmount: number
  tdsAmount: number
}

/** Equal-width data columns + fixed Action; padding matches listing toolbar (14px). */
const PAY_DATA_COLUMN_COUNT = 8
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
type PayablesSortField =
  | 'vendorName'
  | 'projectName'
  | 'milestone'
  | 'invoiceNo'
  | 'invoiceDate'
  | 'invoiceAmount'
  | 'tdsAmount'
  | 'paymentStatus'

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

export default function PaymentsPage() {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { showToast } = useToast()
  const { items: rawProjects, loading: projectsLoading } = useAppSelector((s) => s.projects)
  const [liveProjectIds, setLiveProjectIds] = useState<string[] | null>(null)
  const liveProjectIdSet = useMemo(() => new Set(liveProjectIds ?? []), [liveProjectIds])
  const projects = useMemo(
    () => (rawProjects ?? []).filter((p) => liveProjectIdSet.has(p.id)),
    [rawProjects, liveProjectIdSet],
  )
  const vendorInvoices = useAppSelector((s) => s.live.vendorInvoices ?? [])

  const [baselinesByProject, setBaselinesByProject] = useState<Record<string, Baseline | null>>({})
  const [vendorPOsByProject, setVendorPOsByProject] = useState<Record<string, VendorPO[]>>({})
  const [financeLoaded, setFinanceLoaded] = useState(false)
  const [summaryKpis, setSummaryKpis] = useState<PayableSummaryKpis | null>(null)

  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterVendorId, setFilterVendorId] = useState('')
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<PayableStatusTab>('pending')
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({
    dateFrom: '',
    dateTo: '',
  })

  const [page, setPage] = useState(1)
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [sortConfig, setSortConfig] = useState<{
    field: PayablesSortField | null
    direction: 'asc' | 'desc'
  }>({ field: null, direction: 'asc' })
  const [payableFilterOptions, setPayableFilterOptions] = useState<Record<string, ColumnFilterOption[]>>({})
  const [listItems, setListItems] = useState<PayablesListItem[]>([])
  const [listTotal, setListTotal] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuContext, setMenuContext] = useState<PaymentTableRow | null>(null)
  const [workflowDrawer, setWorkflowDrawer] = useState<{
    entry: VendorMilestoneEntry
    focus: VendorPayableDrawerFocus
    readOnly: boolean
    invoiceId: string
    paymentStatus: PayablePaymentStatus
  } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadInitialSelection, setUploadInitialSelection] =
    useState<UploadVendorInvoiceInitialSelection | null>(null)

  useEffect(() => {
    void dispatch(fetchProjects({ pageSize: 100 }))
    void dropdownsApi
      .getLiveProjects()
      .then((options) => setLiveProjectIds(options.map((o) => o.value)))
      .catch(() => setLiveProjectIds([]))
    void payablesService.getFilters().then((data) => {
      setPayableFilterOptions({
        vendorId: data.vendors ?? [],
        projectId: data.projects ?? [],
        milestone: data.milestones ?? [],
        invoiceNo: data.invoiceNos ?? [],
        invoiceDate: data.invoiceDates ?? [],
        invoiceAmount: data.invoiceAmounts ?? [],
        tdsAmount: data.tdsAmounts ?? [],
        paymentStatus: data.paymentStatuses ?? [],
      })
    }).catch(() => undefined)
  }, [dispatch])

  // One workspace call replaces N× baseline + vendor-PO + invoice + payments + expenses…
  useEffect(() => {
    let cancelled = false
    setFinanceLoaded(false)
    void (async () => {
      try {
        const workspace = await payablesService.getWorkspace()
        if (cancelled) return

        const poByProject: Record<string, VendorPO[]> = {}
        for (const po of workspace.vendorPOs) {
          const list = poByProject[po.projectId] ?? []
          list.push(po)
          poByProject[po.projectId] = list
        }

        const blByProject: Record<string, Baseline | null> = {}
        for (const bl of workspace.baselines) {
          if (bl?.projectId) blByProject[bl.projectId] = bl
        }

        setVendorPOsByProject(poByProject)
        setBaselinesByProject(blByProject)
        dispatch(hydrateVendorInvoices(workspace.vendorInvoices))
      } catch {
        if (!cancelled) {
          showToast({ title: 'Failed to load payables workspace', variant: 'error' })
        }
      } finally {
        if (!cancelled) setFinanceLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, showToast])

  // Summary KPIs from dedicated API (refetch when project/vendor filters change)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const summary = await payablesService.getSummary({
          projectId: filterProjectId || undefined,
          vendorId: filterVendorId || undefined,
        })
        if (!cancelled) setSummaryKpis(toPayableSummaryKpis(summary))
      } catch {
        if (!cancelled) setSummaryKpis(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filterProjectId, filterVendorId])

  // Lazy-load drawer-only finance for the selected project
  useEffect(() => {
    if (!workflowDrawer) return
    const projectId = workflowDrawer.entry.projectId
    void dispatch(fetchPayments(projectId))
    void dispatch(fetchExpenses({ projectId }))
    void dispatch(fetchReimbursements(projectId))
    void dispatch(fetchVendorPayableControls(projectId))
  }, [dispatch, workflowDrawer?.entry.projectId, workflowDrawer?.entry.milestone.id])

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
        invoiceId: milestoneInv.id,
        invoiceNumber: milestoneInv.invoiceNumber,
        invoiceDate: milestoneInv.invoiceDate,
        invoiceAmount: milestoneInv.baseAmount,
        tdsAmount: milestoneInv.tdsAmount ?? 0,
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
        String(row.tdsAmount),
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

  useEffect(() => {
    let cancelled = false
    setListLoading(true)
    void payablesService
      .getList({
        page,
        limit: PAY_PAGE_SIZE,
        search: search.trim() || undefined,
        vendorId: colFilters.vendorId || filterVendorId || undefined,
        projectId: colFilters.projectId || filterProjectId || undefined,
        milestone: colFilters.milestone || undefined,
        invoiceNo: colFilters.invoiceNo || undefined,
        invoiceDate: colFilters.invoiceDate || undefined,
        invoiceAmount: colFilters.invoiceAmount ? Number(colFilters.invoiceAmount) : undefined,
        tdsAmount: colFilters.tdsAmount ? Number(colFilters.tdsAmount) : undefined,
        paymentStatus: colFilters.paymentStatus || statusTab,
        sortBy: sortConfig.field || undefined,
        sortOrder: sortConfig.field ? sortConfig.direction : undefined,
      })
      .then((result) => {
        if (cancelled) return
        setListItems(result.items)
        setListTotal(result.total)
      })
      .catch(() => {
        if (cancelled) return
        setListItems([])
        setListTotal(0)
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, search, colFilters, filterVendorId, filterProjectId, statusTab, sortConfig.field, sortConfig.direction])

  const listingRows = useMemo((): PaymentTableRow[] => {
    return listItems.map((item) => {
      const match = allMilestones.find((m) => {
        if (m.projectId !== item.projectId || m.row.vendorId !== item.vendorId) return false
        const milestoneOk =
          (item.milestoneId != null && m.milestone.id === item.milestoneId) ||
          m.milestone.name === item.milestone
        if (!milestoneOk) return false
        if (!item.service) return true
        return m.row.serviceId === item.service || m.row.serviceName === item.service
      })
      const payableSt = (item.paymentStatus === 'settled' || item.paymentStatus === 'partial_payment' || item.paymentStatus === 'not_paid'
        ? item.paymentStatus
        : 'not_paid') as PayablePaymentStatus
      if (match) {
        return {
          key: item.id,
          vendorKey: globalVendorContextKey(item.projectId, match.row),
          entry: match,
          payableSt,
          invoiceId: item.id,
          invoiceNumber: item.invoiceNo,
          invoiceDate: item.invoiceDate,
          invoiceAmount: item.invoiceAmount,
          tdsAmount: item.tdsAmount,
        }
      }
      return {
        key: item.id,
        vendorKey: `${item.projectId}::${item.vendorId}`,
        entry: {
          projectId: item.projectId,
          projectName: item.projectName,
          milestone: {
            id: item.milestoneId ?? item.id,
            name: item.milestone,
            percentage: 0,
            value: 0,
          },
          row: {
            vendorId: item.vendorId,
            vendorName: item.vendorName,
            serviceId: item.service ?? '',
            serviceName: item.service ?? '',
          },
        },
        payableSt,
        invoiceId: item.id,
        invoiceNumber: item.invoiceNo,
        invoiceDate: item.invoiceDate,
        invoiceAmount: item.invoiceAmount,
        tdsAmount: item.tdsAmount,
      }
    })
  }, [listItems, allMilestones])

  const statusTabs: TabItem[] = useMemo(
    () => [
      { label: 'Pending', value: 'pending', count: tabCounts.pending },
      { label: 'Completed', value: 'completed', count: tabCounts.completed },
    ],
    [tabCounts],
  )

  const isDataLoading = projectsLoading || liveProjectIds === null || !financeLoaded || listLoading

  const paginatedRows = listingRows

  useEffect(() => {
    setPage(1)
  }, [filterProjectId, filterVendorId, search, statusTab, colFilters, sortConfig.field, sortConfig.direction])

  const vendorOptions = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const c of allCards) {
      labels[c.row.vendorId] = c.row.vendorName
    }
    for (const list of Object.values(vendorPOsByProject)) {
      for (const po of list) {
        if (po.vendorId) labels[po.vendorId] = po.vendorName || po.vendorId
      }
    }
    return Object.keys(labels).sort((a, b) => labels[a].localeCompare(labels[b]))
  }, [allCards, vendorPOsByProject])

  const vendorNameById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of allCards) m[c.row.vendorId] = c.row.vendorName
    for (const list of Object.values(vendorPOsByProject)) {
      for (const po of list) {
        if (po.vendorId) m[po.vendorId] = po.vendorName || po.vendorId
      }
    }
    return m
  }, [allCards, vendorPOsByProject])

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

  async function handleInvoiceUploaded(projectId: string) {
    try {
      await dispatch(fetchVendorInvoices(projectId)).unwrap()
      const [summary, list] = await Promise.all([
        payablesService.getSummary({
          projectId: filterProjectId || undefined,
          vendorId: filterVendorId || undefined,
        }),
        payablesService.getList({
          page,
          limit: PAY_PAGE_SIZE,
          search: search.trim() || undefined,
          vendorId: colFilters.vendorId || filterVendorId || undefined,
          projectId: colFilters.projectId || filterProjectId || undefined,
          milestone: colFilters.milestone || undefined,
          invoiceNo: colFilters.invoiceNo || undefined,
          invoiceDate: colFilters.invoiceDate || undefined,
          invoiceAmount: colFilters.invoiceAmount ? Number(colFilters.invoiceAmount) : undefined,
          tdsAmount: colFilters.tdsAmount ? Number(colFilters.tdsAmount) : undefined,
          paymentStatus: colFilters.paymentStatus || statusTab,
          sortBy: sortConfig.field || undefined,
          sortOrder: sortConfig.field ? sortConfig.direction : undefined,
        }),
      ])
      setSummaryKpis(toPayableSummaryKpis(summary))
      setListItems(list.items)
      setListTotal(list.total)
    } catch {
      // list already refreshed by drawer; summary can stay stale until next filter change
    }
  }

  function handleActionMenuItem(label: string) {
    if (!menuContext) return
    const { entry } = menuContext

    closeActionMenu()

    switch (label) {
      case 'Release Payment':
        setWorkflowDrawer({
          entry,
          focus: 'payment',
          readOnly: false,
          invoiceId: menuContext.invoiceId,
          paymentStatus: menuContext.payableSt,
        })
        break
      case 'View Details':
      default:
        setWorkflowDrawer({
          entry,
          focus: 'details',
          readOnly: true,
          invoiceId: menuContext.invoiceId,
          paymentStatus: menuContext.payableSt,
        })
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

  function handleSort(field: string, direction: 'asc' | 'desc') {
    setSortConfig({ field: field as PayablesSortField, direction })
    setPage(1)
  }

  function handleResetAll() {
    setSearch('')
    setActiveFilters({ dateFrom: '', dateTo: '' })
    setFilterProjectId('')
    setFilterVendorId('')
    setColFilters({})
    setSortConfig({ field: null, direction: 'asc' })
    setPage(1)
  }

  const hoverBg = alpha(theme.palette.primary.main, 0.04)

  async function handleExport() {
    try {
      await downloadCsv(
        '/finance/payables/export',
        {
          search: search.trim() || undefined,
          vendorId: colFilters.vendorId || filterVendorId || undefined,
          projectId: colFilters.projectId || filterProjectId || undefined,
          milestone: colFilters.milestone || undefined,
          invoiceNo: colFilters.invoiceNo || undefined,
          invoiceDate: colFilters.invoiceDate || undefined,
          invoiceAmount: colFilters.invoiceAmount ? Number(colFilters.invoiceAmount) : undefined,
          tdsAmount: colFilters.tdsAmount ? Number(colFilters.tdsAmount) : undefined,
          paymentStatus: colFilters.paymentStatus || statusTab,
          sortBy: sortConfig.field || undefined,
          sortOrder: sortConfig.field ? sortConfig.direction : undefined,
        },
        `payables-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      showToast({ title: 'Export started', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to export payables', variant: 'error' })
    }
  }

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
          customSummary={<SettlementSummaryStrip kpis={summaryKpis} />}
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
          onResetAll={handleResetAll}
          showExport
          onExport={handleExport}
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
                      <FilterableSortHeader label="Vendor" field="vendorName" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.vendorId ?? ''} filterOptions={payableFilterOptions.vendorId ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, vendorId: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="Project" field="projectName" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.projectId ?? ''} filterOptions={payableFilterOptions.projectId ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, projectId: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="Milestone" field="milestone" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.milestone ?? ''} filterOptions={payableFilterOptions.milestone ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, milestone: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="Invoice No." field="invoiceNo" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.invoiceNo ?? ''} filterOptions={payableFilterOptions.invoiceNo ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, invoiceNo: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="Invoice date" field="invoiceDate" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.invoiceDate ?? ''} filterOptions={payableFilterOptions.invoiceDate ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, invoiceDate: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="Invoice Amount" field="invoiceAmount" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.invoiceAmount ?? ''} filterOptions={payableFilterOptions.invoiceAmount ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, invoiceAmount: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="TDS Amount" field="tdsAmount" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.tdsAmount ?? ''} filterOptions={payableFilterOptions.tdsAmount ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, tdsAmount: v }))} sx={PAY_HEADER_SX} />
                      <FilterableSortHeader label="Payment Status" field="paymentStatus" sortField={sortConfig.field ?? undefined} sortDirection={sortConfig.direction} onSort={handleSort} filterValue={colFilters.paymentStatus ?? ''} filterOptions={payableFilterOptions.paymentStatus ?? []} onFilter={(v) => setColFilters((p) => ({ ...p, paymentStatus: v }))} sx={PAY_HEADER_STATUS_SX} />
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
                          {listTotal === 0
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
                          <TableCell sx={PAY_CELL_SX}>
                            <Typography variant="body2" sx={PAY_TEXT_BODY_SX}>
                              ₹{formatInr(row.tdsAmount)}
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
              {listTotal > 0 && (
                <SimplePagination
                  page={page}
                  pageSize={PAY_PAGE_SIZE}
                  total={listTotal}
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
          key={
            workflowDrawer
              ? `${workflowDrawer.invoiceId}-${workflowDrawer.entry.milestone.id}-${workflowDrawer.focus}`
              : 'closed'
          }
          open={workflowDrawer != null}
          onClose={() => {
            setWorkflowDrawer(null)
            void payablesService
              .getSummary({
                projectId: filterProjectId || undefined,
                vendorId: filterVendorId || undefined,
              })
              .then((summary) => setSummaryKpis(toPayableSummaryKpis(summary)))
              .catch(() => undefined)
          }}
          entry={workflowDrawer?.entry ?? null}
          baseline={
            workflowDrawer ? baselinesByProject[workflowDrawer.entry.projectId] ?? null : null
          }
          focus={workflowDrawer?.focus}
          readOnly={workflowDrawer?.readOnly}
          invoiceId={workflowDrawer?.invoiceId}
          paymentStatus={workflowDrawer?.paymentStatus}
          onUploadInvoice={openUploadInvoiceFromWorkflow}
        />

        <UploadVendorInvoiceDrawer
          open={uploadOpen}
          onClose={closeUploadInvoice}
          eligibleEntries={eligibleUploadEntries}
          projectVendors={projectVendorOptions}
          initialSelection={uploadInitialSelection}
          onUploaded={(projectId) => void handleInvoiceUploaded(projectId)}
        />
    </>
  )
}
