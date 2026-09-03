import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { tokens } from '@/design-system/tokens'
import { liveApi } from '@/api/liveApi'
import type {
  LiveOverviewDto,
  LiveOverviewMetrics,
  LiveOverviewWorkstreamRow,
} from '@/api/liveApi'
import { formatCurrency, formatCurrencyCompact, formatDate } from '../../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './vendorSettlement/utils'
import {
  sortWorkstreamRows,
  buildFinancialSummaryTotal,
  type FinancialSummarySortField,
} from './financialSummaryAggregates'
import { WorkspaceSection } from '@/components/templates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses } from '@/slices/live/thunk'
import { ExpenseTypeBadge } from '@/components/expenses/expenseShared'

const COLUMN_DEFS: { key: FinancialSummarySortField; label: string }[] = [
  { key: 'workstream', label: 'Category / Workstream' },
  { key: 'clientPOAmount', label: 'Client PO Amount (₹)' },
  { key: 'clientReceived', label: 'Client Received (₹)' },
  { key: 'pendingReceived', label: 'Pending Received (₹)' },
  { key: 'vendorPOAmount', label: 'Vendor PO Amount (₹)' },
  { key: 'vendorPaid', label: 'Vendor Paid (₹)' },
  { key: 'pendingPaid', label: 'Pending Paid (₹)' },
  { key: 'projectedProfitPct', label: 'Projected Profit (%)' },
  { key: 'actualProfitPct', label: 'Actual Profit (%)' },
]

function fmtInr(amount: number): string {
  return formatCurrencyCompact(amount, 2)
}

function profitColor(value: number | null): string {
  if (value == null || Math.abs(value) < 0.05) return 'text.secondary'
  return value > 0 ? tokens.color.success[600] : tokens.color.error[600]
}

function fmtProfitPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

function MetricCells({ metrics }: { metrics: LiveOverviewMetrics }) {
  return (
    <>
      <TableCell align="left" sx={NUM_CELL_SX}>
        {fmtInr(metrics.clientPOAmount)}
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        {fmtInr(metrics.clientReceived)}
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        {fmtInr(metrics.pendingReceived)}
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        {fmtInr(metrics.vendorPOAmount)}
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        {fmtInr(metrics.vendorPaid)}
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        {fmtInr(metrics.pendingPaid)}
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        <Typography
          component="span"
          sx={{ fontSize: 12, fontWeight: 600, color: profitColor(metrics.projectedProfitPct) }}
        >
          {fmtProfitPct(metrics.projectedProfitPct)}
        </Typography>
      </TableCell>
      <TableCell align="left" sx={NUM_CELL_SX}>
        <Typography
          component="span"
          sx={{ fontSize: 12, fontWeight: 600, color: profitColor(metrics.actualProfitPct) }}
        >
          {fmtProfitPct(metrics.actualProfitPct)}
        </Typography>
      </TableCell>
    </>
  )
}

const NUM_CELL_SX = {
  ...TABLE_CELL_SX,
  fontVariantNumeric: 'tabular-nums',
} as const

interface FinancialSummaryTabProps {
  projectId: string
}

export default function FinancialSummaryTab({ projectId }: FinancialSummaryTabProps) {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const expenses = useAppSelector((s) => s.live.expenses)

  const [data, setData] = useState<LiveOverviewDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sortField, setSortField] = useState<FinancialSummarySortField>('workstream')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    liveApi
      .getLiveOverview(projectId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load overview')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Same listing source as Project Live → Expenses tab (already loaded by LiveTab; refresh for safety).
  useEffect(() => {
    void dispatch(fetchExpenses({ projectId }))
  }, [dispatch, projectId])

  const displayGroups = useMemo(
    () =>
      (data?.groups ?? []).map((group) => ({
        ...group,
        children: sortWorkstreamRows(group.children, sortField, sortDirection),
      })),
    [data, sortField, sortDirection],
  )

  const serviceGroups = useMemo(
    () => displayGroups.filter((group) => group.kind !== 'expenses'),
    [displayGroups],
  )

  const officeExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.projectId === projectId && e.type === 'office_expenses')
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses, projectId],
  )

  const serviceTotal = useMemo(
    () => buildFinancialSummaryTotal(serviceGroups),
    [serviceGroups],
  )

  // Persisted Project summary fields from Live Overview DTO (not frontend reduce).
  const officeExpenseTotal = data?.officeExpenseTotal ?? 0
  const clientPoMinusOfficeExpense = data?.clientPoMinusOfficeExpense ?? 0

  const total = serviceTotal

  function toggleCategory(categoryId: string): void {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function handleSort(field: FinancialSummarySortField): void {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection(field === 'workstream' ? 'asc' : 'desc')
    }
  }

  const hasServiceData = serviceGroups.length > 0
  const hasOfficeExpenses = officeExpenses.length > 0

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
          Financial Summary
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Live client PO and collections vs payables by service.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            Loading financial summary…
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="error" sx={{ fontSize: 13 }}>
            {error}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {hasServiceData ? (
            <TableContainer
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                maxHeight: { xs: 'none', md: 'calc(100vh - 320px)' },
                overflow: 'auto',
              }}
            >
              <Table
                size="small"
                stickyHeader
                sx={{
                  tableLayout: 'fixed',
                  minWidth: 1200,
                  '& .MuiTableCell-root': { verticalAlign: 'middle' },
                }}
              >
                <TableHead>
                  <TableRow>
                    {COLUMN_DEFS.map((col) => (
                      <TableCell
                        key={col.key}
                        align="left"
                        sx={{
                          ...TABLE_HEADER_SX,
                          cursor: col.key === 'workstream' ? 'default' : 'pointer',
                          userSelect: 'none',
                          width: col.key === 'workstream' ? '18%' : '10.25%',
                          bgcolor: tokens.color.neutral[50],
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => handleSort(col.key)}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="flex-start"
                          gap={0.5}
                        >
                          <span>{col.label}</span>
                          {sortField === col.key ? (
                            <Typography component="span" sx={{ fontSize: 10, color: 'primary.main' }}>
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {serviceGroups.map((group) => {
                    const isCollapsed = collapsed.has(group.id)
                    return (
                      <CategorySection
                        key={group.id}
                        groupId={group.id}
                        groupName={group.name}
                        subtotal={group.subtotal}
                        workstreams={group.children}
                        isCollapsed={isCollapsed}
                        onToggle={() => toggleCategory(group.id)}
                        theme={theme}
                      />
                    )
                  })}
                </TableBody>

                <TableBody
                  sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 2,
                    '& .MuiTableCell-root': {
                      borderTop: `2px solid ${tokens.color.neutral[200]}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      fontWeight: 700,
                    },
                  }}
                >
                  <TableRow>
                    <TableCell align="left" sx={{ ...TABLE_CELL_SX, fontSize: 13 }}>
                      Total
                    </TableCell>
                    <MetricCells metrics={total} />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box
              sx={{
                py: 6,
                px: 3,
                textAlign: 'center',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                No financial summary yet. Add live client POs to see service-wise collections.
              </Typography>
            </Box>
          )}

          <WorkspaceSection title="Office Expenses" noPadding>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: '18%' }}>Type</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: '42%' }}>Description</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: '20%' }} align="right">
                    Amount
                  </TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, width: '20%' }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!hasOfficeExpenses ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      sx={{ ...TABLE_CELL_SX, textAlign: 'center', py: 4, color: 'text.secondary' }}
                    >
                      No office expenses yet
                    </TableCell>
                  </TableRow>
                ) : (
                  officeExpenses.map((exp, idx) => (
                    <TableRow
                      key={exp.id}
                      sx={{
                        bgcolor: idx % 2 === 0 ? 'background.paper' : tokens.color.neutral[50],
                      }}
                    >
                      <TableCell sx={TABLE_CELL_SX}>
                        <ExpenseTypeBadge type={exp.type} />
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {exp.description}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ ...TABLE_CELL_SX, fontVariantNumeric: 'tabular-nums' }}
                      >
                        ₹{formatCurrency(exp.amount)}
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{formatDate(exp.date)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow
                  sx={{
                    '& .MuiTableCell-root': {
                      borderTop: `1px solid ${tokens.color.neutral[200]}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      fontWeight: 700,
                    },
                  }}
                >
                  <TableCell sx={{ ...TABLE_CELL_SX, fontSize: 12, fontWeight: 700 }} colSpan={2}>
                    Total Expense
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...TABLE_CELL_SX, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
                  >
                    ₹{formatCurrency(officeExpenseTotal)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
                <TableRow
                  sx={{
                    '& .MuiTableCell-root': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      fontWeight: 700,
                    },
                  }}
                >
                  <TableCell sx={{ ...TABLE_CELL_SX, fontSize: 12, fontWeight: 700 }} colSpan={2}>
                    Total Client PO - Total Expense
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...TABLE_CELL_SX, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
                  >
                    ₹{formatCurrency(clientPoMinusOfficeExpense)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableBody>
            </Table>
          </WorkspaceSection>
        </Stack>
      )}
    </Box>
  )
}

function CategorySection({
  groupId,
  groupName,
  subtotal,
  workstreams,
  isCollapsed,
  onToggle,
  theme,
}: {
  groupId: string
  groupName: string
  subtotal: LiveOverviewMetrics
  workstreams: LiveOverviewWorkstreamRow[]
  isCollapsed: boolean
  onToggle: () => void
  theme: Theme
}) {
  return (
    <>
      <TableRow
        sx={{
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          '& .MuiTableCell-root': { fontWeight: 700, borderBottom: `1px solid ${tokens.color.neutral[100]}` },
        }}
      >
        <TableCell align="left" sx={TABLE_CELL_SX}>
          <Stack direction="row" alignItems="center" justifyContent="flex-start" gap={0.5}>
            <IconButton
              size="small"
              aria-label={isCollapsed ? `Expand ${groupName}` : `Collapse ${groupName}`}
              onClick={onToggle}
              sx={{ p: 0.25 }}
            >
              {isCollapsed ? (
                <ChevronRight size={16} strokeWidth={1.75} />
              ) : (
                <ChevronDown size={16} strokeWidth={1.75} />
              )}
            </IconButton>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>
              {groupName}
            </Typography>
          </Stack>
        </TableCell>
        <MetricCells metrics={subtotal} />
      </TableRow>

      {!isCollapsed
        ? workstreams.map((row, idx) => (
            <TableRow
              key={`${groupId}-${row.id}`}
              sx={{
                bgcolor: idx % 2 === 0 ? 'background.paper' : tokens.color.neutral[50],
              }}
            >
              <TableCell align="left" sx={{ ...TABLE_CELL_SX, pl: 5 }}>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {row.workstreamName}
                </Typography>
              </TableCell>
              <MetricCells metrics={row} />
            </TableRow>
          ))
        : null}
    </>
  )
}
