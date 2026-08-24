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
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchBaseline, fetchClientPO, fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { fetchVersions } from '../../../../slices/pitch/thunk'
import { resolvePitchVersionForProject } from '@/store/selectors/pitchSelectors'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './vendorSettlement/utils'
import {
  buildFinancialSummaryGroups,
  buildFinancialSummaryTotal,
  buildOfficeExpenseRows,
  officeExpensesFromPitch,
  sortWorkstreamRows,
  type FinancialSummaryMetrics,
  type FinancialSummarySortField,
  type FinancialSummaryWorkstreamRow,
  type OfficeExpenseRow,
} from './financialSummaryAggregates'

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
  return `₹${formatCurrency(amount)}`
}

function profitColor(value: number | null): string {
  if (value == null || Math.abs(value) < 0.05) return 'text.secondary'
  return value > 0 ? tokens.color.success[600] : tokens.color.error[600]
}

function fmtProfitPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}%`
}

const NUM_CELL_SX = {
  ...TABLE_CELL_SX,
  fontVariantNumeric: 'tabular-nums',
} as const

const TABLE_SHELL_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  overflow: 'auto',
} as const

const OFFICE_EXPENSE_COLUMNS: { key: keyof OfficeExpenseRow; label: string }[] = [
  { key: 'name', label: 'Expense' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount (₹)' },
]

function MetricCells({ metrics }: { metrics: FinancialSummaryMetrics }) {
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

interface FinancialSummaryTabProps {
  projectId: string
}

export default function FinancialSummaryTab({ projectId }: FinancialSummaryTabProps) {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const { baseline, clientPOs, vendorPOs } = useAppSelector((s) => s.baseline)
  const { invoices, vendorInvoices } = useAppSelector((s) => s.live)
  const { activeVersion, versions } = useAppSelector((s) => s.pitch)

  const [sortField, setSortField] = useState<FinancialSummarySortField>('workstream')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    void dispatch(fetchBaseline(projectId))
    void dispatch(fetchClientPO(projectId))
    void dispatch(fetchVendorPOs(projectId))
    void dispatch(fetchVersions(projectId))
  }, [dispatch, projectId])

  const baselineForProject = baseline?.projectId === projectId ? baseline : null

  const pitchVersion = useMemo(
    () => resolvePitchVersionForProject(projectId, activeVersion, versions),
    [projectId, activeVersion, versions],
  )

  /** Prefer live Pitch → Expenses; fall back to baseline snapshot only if pitch is not loaded. */
  const pitchOfficeExpenses = useMemo(() => {
    if (pitchVersion) {
      return officeExpensesFromPitch(pitchVersion.plannedExpenses)
    }
    return officeExpensesFromPitch(baselineForProject?.plannedExpenses)
  }, [pitchVersion, baselineForProject])

  const allGroups = useMemo(
    () =>
      buildFinancialSummaryGroups(
        baselineForProject,
        projectId,
        clientPOs,
        vendorPOs,
        invoices,
        vendorInvoices,
      ),
    [baselineForProject, projectId, clientPOs, vendorPOs, invoices, vendorInvoices],
  )

  const officeExpenseRows = useMemo(
    () => buildOfficeExpenseRows(pitchOfficeExpenses),
    [pitchOfficeExpenses],
  )

  const officeExpenseTotal = useMemo(
    () => officeExpenseRows.reduce((sum, row) => sum + row.amount, 0),
    [officeExpenseRows],
  )

  const displayGroups = useMemo(
    () =>
      allGroups.map((group) => ({
        ...group,
        children: sortWorkstreamRows(group.children, sortField, sortDirection),
      })),
    [allGroups, sortField, sortDirection],
  )

  const total = useMemo(() => buildFinancialSummaryTotal(allGroups), [allGroups])

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

  const hasData = allGroups.length > 0

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
          Financial Summary
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Category-wise profitability and collections vs payables at a glance.
        </Typography>
      </Box>

      {!hasData ? (
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
            Lock a project baseline to view the financial summary by category and workstream.
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            ...TABLE_SHELL_SX,
            maxHeight: { xs: 'none', md: 'calc(100vh - 320px)' },
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
              {displayGroups.map((group) => {
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
                <TableCell align="left" sx={{ ...TABLE_CELL_SX, fontSize: 13 }}>Total</TableCell>
                <MetricCells metrics={total} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
          Expenses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          Office expenses absorbed internally, separate from client and vendor financials.
        </Typography>
      </Box>

      {officeExpenseRows.length === 0 ? (
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
            No office expenses recorded for this project yet.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={TABLE_SHELL_SX}>
          <Table
            size="small"
            stickyHeader
            sx={{
              tableLayout: 'fixed',
              minWidth: 480,
              '& .MuiTableCell-root': { verticalAlign: 'middle' },
            }}
          >
            <TableHead>
              <TableRow>
                {OFFICE_EXPENSE_COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    align="left"
                    sx={{
                      ...TABLE_HEADER_SX,
                      width: col.key === 'name' ? '50%' : '25%',
                      bgcolor: tokens.color.neutral[50],
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {officeExpenseRows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  sx={{
                    bgcolor: idx % 2 === 0 ? 'background.paper' : tokens.color.neutral[50],
                  }}
                >
                  <TableCell align="left" sx={TABLE_CELL_SX}>
                    {row.name}
                  </TableCell>
                  <TableCell align="left" sx={TABLE_CELL_SX}>
                    {formatDate(row.date ?? null)}
                  </TableCell>
                  <TableCell align="left" sx={NUM_CELL_SX}>
                    {fmtInr(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
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
                <TableCell align="left" sx={TABLE_CELL_SX}>
                  —
                </TableCell>
                <TableCell align="left" sx={NUM_CELL_SX}>
                  {fmtInr(officeExpenseTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box
        sx={{
          ...TABLE_SHELL_SX,
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2,
          py: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
        }}
      >
        <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
          Total Expenses
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtInr(officeExpenseTotal)}
        </Typography>
      </Box>
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
  subtotal: FinancialSummaryMetrics
  workstreams: FinancialSummaryWorkstreamRow[]
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
