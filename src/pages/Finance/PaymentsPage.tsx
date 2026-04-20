import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Menu,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import axios from 'axios'
import { ArrowLeft, Banknote } from 'lucide-react'
import client from '@/api/client'
import { ListingTemplate } from '@/components/templates'
import type { FilterField } from '@/components/templates/ListingTemplate'
import { Avatar, Badge, Button, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import {
  fetchExpenses,
  fetchPayments,
  fetchReimbursements,
  fetchVendorInvoices,
} from '@/slices/live/thunk'
import type { Baseline } from '@/slices/baseline/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  baselineVendorServiceRows,
  computeVendorCardCounts,
  globalVendorContextKey,
  invoiceMatchesRow,
  rowSettlementStatus,
  SettlementRightPanel,
  SettlementSummaryStrip,
  type RowSettlementStatus,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement'

type StatusTab = 'all' | 'payment_pending' | 'partially_paid' | 'settled'
type PageMode = 'listing' | 'settlement'

interface CardEntry {
  projectId: string
  projectName: string
  row: VendorServiceRow
}

const PAY_HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  py: 1,
  px: 1.75,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
}

const PAY_CELL_SX = {
  fontSize: 12,
  py: 1,
  px: 1.75,
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }

async function fetchBaselineForProject(projectId: string): Promise<Baseline | null> {
  try {
    const res = await client.get<Baseline>(`/projects/${projectId}/baseline`)
    return res.data
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null
    throw e
  }
}

function statusBadgeColor(st: RowSettlementStatus): 'warning' | 'info' | 'success' {
  if (st === 'settled') return 'success'
  if (st === 'partially_paid') return 'info'
  return 'warning'
}

function statusLabel(st: RowSettlementStatus): string {
  if (st === 'settled') return 'Settled'
  if (st === 'partially_paid') return 'Partially Paid'
  return 'Payment Pending'
}

export default function PaymentsPage() {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const { showToast } = useToast()
  const { items: projects } = useAppSelector((s) => s.projects)
  const { vendorInvoices, payments, expenses, reimbursements } = useAppSelector((s) => s.live)

  const [baselinesByProject, setBaselinesByProject] = useState<Record<string, Baseline | null>>({})
  const [loadingBaselines, setLoadingBaselines] = useState(true)
  const [financeLoaded, setFinanceLoaded] = useState(false)

  const [filterProjectId, setFilterProjectId] = useState('')
  const [filterVendorId, setFilterVendorId] = useState('')
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({
    dateFrom: '',
    dateTo: '',
  })

  const [mode, setMode] = useState<PageMode>('listing')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuRowKey, setMenuRowKey] = useState<string | null>(null)

  useEffect(() => {
    void dispatch(fetchProjects({}))
  }, [dispatch])

  useEffect(() => {
    if (projects.length === 0) return
    let cancelled = false
    setLoadingBaselines(true)
    void (async () => {
      const next: Record<string, Baseline | null> = {}
      for (const p of projects) {
        next[p.id] = await fetchBaselineForProject(p.id)
        if (cancelled) return
      }
      if (!cancelled) {
        setBaselinesByProject(next)
        setLoadingBaselines(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projects])

  useEffect(() => {
    if (projects.length === 0) return
    let cancelled = false
    setFinanceLoaded(false)
    void (async () => {
      for (const p of projects) {
        await Promise.all([
          dispatch(fetchVendorInvoices(p.id)).unwrap(),
          dispatch(fetchPayments(p.id)).unwrap(),
          dispatch(fetchExpenses(p.id)).unwrap(),
          dispatch(fetchReimbursements(p.id)).unwrap(),
        ])
        if (cancelled) return
      }
      if (!cancelled) setFinanceLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, projects])

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

  const cardsAfterProjectVendor = useMemo(() => {
    return allCards.filter((c) => {
      if (filterProjectId && c.projectId !== filterProjectId) return false
      if (filterVendorId && c.row.vendorId !== filterVendorId) return false
      return true
    })
  }, [allCards, filterProjectId, filterVendorId])

  const rowStatus = useCallback(
    (c: CardEntry): RowSettlementStatus => {
      const bl = baselinesByProject[c.projectId] ?? null
      const inv = vendorInvoices.filter((v) => v.projectId === c.projectId)
      const ex = expenses.filter((e) => e.projectId === c.projectId)
      const rb = reimbursements.filter((r) => r.projectId === c.projectId)
      const counts = computeVendorCardCounts(bl, inv, ex, rb, c.row)
      return rowSettlementStatus(counts, c.projectId, c.row, payments, vendorInvoices, expenses, reimbursements)
    },
    [baselinesByProject, vendorInvoices, expenses, reimbursements, payments],
  )

  const statusCounts = useMemo(() => {
    let payment_pending = 0
    let partially_paid = 0
    let settled = 0
    for (const c of cardsAfterProjectVendor) {
      const st = rowStatus(c)
      if (st === 'payment_pending') payment_pending += 1
      else if (st === 'partially_paid') partially_paid += 1
      else settled += 1
    }
    return {
      all: cardsAfterProjectVendor.length,
      payment_pending,
      partially_paid,
      settled,
    }
  }, [cardsAfterProjectVendor, rowStatus])

  const listingCards = useMemo(() => {
    return cardsAfterProjectVendor.filter((c) => {
      if (statusTab === 'all') return true
      const st = rowStatus(c)
      return st === statusTab
    })
  }, [cardsAfterProjectVendor, statusTab, rowStatus])

  const summaryInvoices = useMemo(() => {
    return vendorInvoices.filter((inv) =>
      listingCards.some((c) => c.projectId === inv.projectId && invoiceMatchesRow(inv, c.row)),
    )
  }, [vendorInvoices, listingCards])

  const summaryPayments = useMemo(() => {
    const keys = new Set(listingCards.map((c) => `${c.projectId}::${c.row.vendorId}`))
    return payments.filter((p) => keys.has(`${p.projectId}::${p.vendorId}`))
  }, [payments, listingCards])

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

  function openSettlementMenu(e: React.MouseEvent<HTMLElement>, key: string) {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setMenuRowKey(key)
  }

  function closeSettlementMenu() {
    setMenuAnchor(null)
    setMenuRowKey(null)
  }

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
    { label: 'Payment Pending', value: 'payment_pending', count: statusCounts.payment_pending },
    { label: 'Partially Paid', value: 'partially_paid', count: statusCounts.partially_paid },
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
          title="Payments"
          subtitle="Cross-project vendor payments and settlements"
          customSummary={
            <SettlementSummaryStrip vendorInvoices={summaryInvoices} payments={summaryPayments} />
          }
          tabs={tabs}
          activeTab={statusTab}
          onTabChange={(v) => setStatusTab(v as StatusTab)}
          hideSearch
          toolbarAfterSearch={toolbarAfterSearch}
          filterConfig={filterConfig}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onFilterReset={() => setActiveFilters({ dateFrom: '', dateTo: '' })}
          showExport
          onExport={() => showToast({ title: 'Export started (placeholder)', variant: 'success' })}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 2, pt: 1.5, pb: 1 }}>
            Vendor Settlements
          </Typography>
          {(loadingBaselines || !financeLoaded) && (
            <Typography variant="body2" sx={{ px: 2, py: 2, fontSize: 12, color: 'text.secondary' }}>
              Loading…
            </Typography>
          )}
          {!loadingBaselines && financeLoaded && listingCards.length === 0 && (
            <Typography variant="body2" sx={{ px: 2, py: 2, fontSize: 12, color: 'text.secondary' }}>
              No vendor mappings match the filters. Finalize baselines or adjust filters.
            </Typography>
          )}
          {!loadingBaselines && financeLoaded && listingCards.length > 0 && (
            <Table size="small" sx={{ mb: 1 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableCell sx={PAY_HEADER_SX}>Vendor</TableCell>
                  <TableCell sx={PAY_HEADER_SX}>Project</TableCell>
                  <TableCell sx={PAY_HEADER_SX}>Service</TableCell>
                  <TableCell sx={PAY_HEADER_SX}>Pending Invoices</TableCell>
                  <TableCell sx={PAY_HEADER_SX}>Expenses</TableCell>
                  <TableCell sx={PAY_HEADER_SX}>Reimbursements</TableCell>
                  <TableCell sx={PAY_HEADER_SX} align="right">
                    Outstanding
                  </TableCell>
                  <TableCell sx={PAY_HEADER_SX}>Status</TableCell>
                  <TableCell sx={PAY_HEADER_SX} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listingCards.map((c) => {
                  const key = globalVendorContextKey(c.projectId, c.row)
                  const bl = baselinesByProject[c.projectId] ?? null
                  const inv = vendorInvoices.filter((v) => v.projectId === c.projectId)
                  const ex = expenses.filter((e) => e.projectId === c.projectId)
                  const rb = reimbursements.filter((r) => r.projectId === c.projectId)
                  const counts = computeVendorCardCounts(bl, inv, ex, rb, c.row)
                  const st = rowStatus(c)
                  const isSettled = st === 'settled'
                  return (
                    <TableRow
                      key={key}
                      hover
                      sx={{
                        '& td': { height: 44 },
                        '&:hover': { bgcolor: hoverBg },
                      }}
                    >
                      <TableCell sx={PAY_CELL_SX}>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Avatar name={c.row.vendorName} size="sm" />
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                            {c.row.vendorName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={PAY_CELL_SX}>{c.projectName}</TableCell>
                      <TableCell sx={PAY_CELL_SX}>{c.row.serviceName}</TableCell>
                      <TableCell sx={PAY_CELL_SX}>
                        {counts.pendingInv > 0 ? (
                          <Badge label={String(counts.pendingInv)} variant="soft" color="info" size="sm" />
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={PAY_CELL_SX}>
                        {counts.pendingExp > 0 ? (
                          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                            <Badge label={String(counts.pendingExp)} variant="soft" color="warning" size="sm" />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              ₹{formatCurrency(counts.pendingExpAmount)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={PAY_CELL_SX}>
                        {counts.pendingRmb > 0 ? (
                          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                            <Badge label={String(counts.pendingRmb)} variant="soft" color="success" size="sm" />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              ₹{formatCurrency(counts.pendingRmbAmount)}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={PAY_CELL_SX} align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: counts.outstanding > 0 ? 'error.main' : 'text.primary',
                          }}
                        >
                          ₹{formatCurrency(counts.outstanding)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={PAY_CELL_SX}>
                        <Badge
                          label={statusLabel(st)}
                          variant="soft"
                          color={statusBadgeColor(st)}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell sx={PAY_CELL_SX} align="right">
                        {isSettled ? (
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                            Settled
                          </Typography>
                        ) : (
                          <IconButton
                            size="small"
                            aria-label="More actions"
                            onClick={(e) => openSettlementMenu(e, key)}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </ListingTemplate>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor) && menuRowKey != null}
          onClose={closeSettlementMenu}
          onClick={(e) => e.stopPropagation()}
          slotProps={{ paper: { elevation: 2 } }}
        >
          <MenuItem
            sx={menuItemSx}
            onClick={() => {
              if (menuRowKey) goToSettlement(menuRowKey)
              closeSettlementMenu()
            }}
          >
            Settle
          </MenuItem>
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
                Payments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Cross-project vendor payments and settlements
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="text"
            size="sm"
            label="Back to Payments"
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
                {(loadingBaselines || !financeLoaded) && (
                  <Typography variant="body2" sx={{ p: 2, fontSize: 12, color: 'text.secondary' }}>
                    Loading…
                  </Typography>
                )}
                {!loadingBaselines && financeLoaded && settlementGroupedByProject.length === 0 && (
                  <Typography variant="body2" sx={{ p: 2, fontSize: 12, color: 'text.secondary' }}>
                    No vendor mappings for this project.
                  </Typography>
                )}
                {!loadingBaselines &&
                  financeLoaded &&
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
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      mt: 0.75,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: counts.allSettled ? 'success.main' : 'warning.main',
                                    }}
                                  >
                                    {counts.allSettled ? 'Settled' : 'Payment pending'}
                                  </Typography>
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
