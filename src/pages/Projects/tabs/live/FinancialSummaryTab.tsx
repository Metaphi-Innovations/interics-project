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
import { formatCurrency } from '../../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './vendorSettlement/utils'
import {
  buildFinancialSummaryGroups,
  buildFinancialSummaryTotal,
  sortWorkstreamRows,
  type FinancialSummaryMetrics,
  type FinancialSummarySortField,
  type FinancialSummaryWorkstreamRow,
} from './financialSummaryAggregates'

const COLUMN_DEFS: { key: FinancialSummarySortField; label: string; align: 'left' | 'right' }[] = [
  { key: 'workstream', label: 'Category / Workstream', align: 'left' },
  { key: 'clientPOAmount', label: 'Client PO Amount (₹)', align: 'right' },
  { key: 'clientReceived', label: 'Client Received (₹)', align: 'right' },
  { key: 'vendorPOAmount', label: 'Vendor PO Amount (₹)', align: 'right' },
  { key: 'vendorPaid', label: 'Vendor Paid (₹)', align: 'right' },
  { key: 'projectedProfitPct', label: 'Projected Profit (%)', align: 'right' },
  { key: 'actualProfitPct', label: 'Actual Profit (%)', align: 'right' },
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

function MetricCells({ metrics }: { metrics: FinancialSummaryMetrics }) {
  return (
    <>
      <TableCell align="right" sx={NUM_CELL_SX}>
        {fmtInr(metrics.clientPOAmount)}
      </TableCell>
      <TableCell align="right" sx={NUM_CELL_SX}>
        {fmtInr(metrics.clientReceived)}
      </TableCell>
      <TableCell align="right" sx={NUM_CELL_SX}>
        {fmtInr(metrics.vendorPOAmount)}
      </TableCell>
      <TableCell align="right" sx={NUM_CELL_SX}>
        {fmtInr(metrics.vendorPaid)}
      </TableCell>
      <TableCell align="right" sx={NUM_CELL_SX}>
        <Typography
          component="span"
          sx={{ fontSize: 12, fontWeight: 600, color: profitColor(metrics.projectedProfitPct) }}
        >
          {fmtProfitPct(metrics.projectedProfitPct)}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={NUM_CELL_SX}>
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
  const { baseline, clientPOs, vendorPOs } = useAppSelector((s) => s.baseline)
  const { invoices, vendorInvoices, expenses } = useAppSelector((s) => s.live)

  const [sortField, setSortField] = useState<FinancialSummarySortField>('workstream')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    void dispatch(fetchBaseline(projectId))
    void dispatch(fetchClientPO(projectId))
    void dispatch(fetchVendorPOs(projectId))
  }, [dispatch, projectId])

  const baselineForProject = baseline?.projectId === projectId ? baseline : null

  const allGroups = useMemo(
    () =>
      buildFinancialSummaryGroups(
        baselineForProject,
        projectId,
        clientPOs,
        vendorPOs,
        invoices,
        vendorInvoices,
        expenses,
      ),
    [
      baselineForProject,
      projectId,
      clientPOs,
      vendorPOs,
      invoices,
      vendorInvoices,
      expenses,
    ],
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
              minWidth: 960,
              '& .MuiTableCell-root': { verticalAlign: 'middle' },
            }}
          >
            <TableHead>
              <TableRow>
                {COLUMN_DEFS.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.align}
                    sx={{
                      ...TABLE_HEADER_SX,
                      cursor: col.key === 'workstream' ? 'default' : 'pointer',
                      userSelect: 'none',
                      width: col.key === 'workstream' ? '22%' : '11%',
                      bgcolor: tokens.color.neutral[50],
                    }}
                    onClick={() => handleSort(col.key)}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent={col.align === 'right' ? 'flex-end' : 'flex-start'}
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
                <TableCell sx={{ ...TABLE_CELL_SX, fontSize: 13 }}>Total</TableCell>
                <MetricCells metrics={total} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
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
        <TableCell sx={TABLE_CELL_SX}>
          <Stack direction="row" alignItems="center" gap={0.5}>
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
              <TableCell sx={{ ...TABLE_CELL_SX, pl: 5 }}>
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
