import { Box, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatusBadge } from '@/design-system/components'
import type { Invoice as ClientInvoice } from '@/slices/receivables/reducer'
import type { VendorInvoice } from '@/slices/live/reducer'
import { formatDate } from '@/utils/formatters'
import { collectionsTrend, receivablesTrend } from '../dashboardMetrics'
import type { DashboardFilters } from '../types'
import type { ChartDataSource } from '../hooks/useChartFilterScope'
import { DashboardSection } from '../components/DashboardSection'
import { DashboardMiniCard } from '../components/DashboardMiniCard'
import {
  BillingTableCell,
  BillingTableStatusCell,
  DashboardDataTable,
  billingTableRowSx,
} from '../components/DashboardDataTable'
import {
  PAYABLES_TABLE_COLUMNS,
  RECEIVABLES_TABLE_COLUMNS,
} from '../components/billingTableLayout'
import { ScopedChartPanel } from '../components/ScopedChartPanel'
import { useDashboardChartTheme } from '../components/charts/useDashboardChartTheme'
import { CHART_MARGIN, SECTION_CHART_ROW_SX } from '../components/chartLayout'
import { yAxisCurrencyTick } from '../components/charts/chartFormatters'

function receivableStatusToType(s: ClientInvoice['status']) {
  switch (s) {
    case 'draft':
      return 'invoice_draft' as const
    case 'sent':
      return 'sent' as const
    case 'unpaid':
      return 'unpaid' as const
    case 'partially_paid':
      return 'partially_paid' as const
    case 'overdue':
      return 'overdue' as const
    case 'paid':
      return 'paid' as const
    default:
      return 'inactive' as const
  }
}

function vendorStatusToType(s: VendorInvoice['status']) {
  switch (s) {
    case 'pending':
      return 'pending' as const
    case 'approved':
      return 'in_progress' as const
    case 'paid':
      return 'active' as const
  }
}

interface BillingCashflowProps {
  theme: Theme
  chartHeight: number
  loading?: boolean
  globalFilters: DashboardFilters
  chartData: ChartDataSource
  amountBilled: number
  amountCollected: number
  outstandingInvoices: number
  poValue: number
  receivableRows: ClientInvoice[]
  payableRows: VendorInvoice[]
  ru: (n: number) => string
  tableHeaderBg: string
  onNavigate: (path: string) => void
}

export function BillingCashflow({
  theme,
  chartHeight,
  loading,
  globalFilters,
  chartData,
  amountBilled,
  amountCollected,
  outstandingInvoices,
  poValue,
  receivableRows,
  payableRows,
  ru,
  tableHeaderBg,
  onNavigate,
}: BillingCashflowProps) {
  const { ct } = useDashboardChartTheme()

  const receivableTableRows = receivableRows.map((inv, idx) => {
    const received = inv.totalReceived ?? 0
    const outstanding = inv.balance ?? Math.max(0, (inv.baseAmount ?? 0) - received)
    const isLast = idx === receivableRows.length - 1
    return (
      <Box
        key={inv.id}
        onClick={() => onNavigate('/finance/receivables')}
        sx={{
          ...billingTableRowSx(isLast),
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
        }}
      >
        <BillingTableCell align="left">
          <Typography variant="caption" noWrap title={inv.clientName}>
            {inv.clientName}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left">
          <Typography variant="caption" noWrap title={inv.projectName}>
            {inv.projectName}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left">
          <Typography variant="caption" noWrap title={inv.invoiceNo}>
            {inv.invoiceNo}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left" variant="body2">
          {ru(inv.baseAmount ?? 0)}
        </BillingTableCell>
        <BillingTableCell align="left" variant="body2">
          {ru(received)}
        </BillingTableCell>
        <BillingTableCell align="left" variant="body2">
          <Typography variant="body2" color="warning.main" component="span">
            {ru(outstanding)}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left">
          <Typography variant="caption" color="text.secondary" component="span">
            {formatDate(inv.dueDate)}
          </Typography>
        </BillingTableCell>
        <BillingTableStatusCell>
          <StatusBadge status={receivableStatusToType(inv.status)} size="small" />
        </BillingTableStatusCell>
      </Box>
    )
  })

  const payableTableRows = payableRows.map((v, idx) => {
    const paid = v.status === 'paid' ? v.netPayable ?? 0 : 0
    const outstanding = v.status === 'paid' ? 0 : v.netPayable ?? v.baseAmount ?? 0
    const isLast = idx === payableRows.length - 1
    return (
      <Box
        key={v.id}
        onClick={() => onNavigate('/finance/payables')}
        sx={{
          ...billingTableRowSx(isLast),
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
        }}
      >
        <BillingTableCell align="left">
          <Typography variant="caption" noWrap title={v.vendorName}>
            {v.vendorName}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left">
          <Typography variant="caption" noWrap title={v.projectName ?? '—'}>
            {v.projectName ?? '—'}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left">
          <Typography variant="caption" noWrap title={v.invoiceNumber}>
            {v.invoiceNumber}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left" variant="body2">
          {ru(v.baseAmount ?? 0)}
        </BillingTableCell>
        <BillingTableCell align="left" variant="body2">
          {ru(paid)}
        </BillingTableCell>
        <BillingTableCell align="left" variant="body2">
          <Typography variant="body2" color="warning.main" component="span">
            {ru(outstanding)}
          </Typography>
        </BillingTableCell>
        <BillingTableCell align="left">
          <Typography variant="caption" color="text.secondary" component="span">
            {v.dueDate ? formatDate(v.dueDate) : formatDate(v.invoiceDate)}
          </Typography>
        </BillingTableCell>
        <BillingTableStatusCell>
          <StatusBadge status={vendorStatusToType(v.status)} size="small" />
        </BillingTableStatusCell>
      </Box>
    )
  })

  return (
    <DashboardSection title="Billing & Cashflow">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <DashboardMiniCard label="Amount Billed" value={ru(amountBilled)} />
        <DashboardMiniCard label="Amount Collected" value={ru(amountCollected)} />
        <DashboardMiniCard label="Outstanding Invoices" value={ru(outstandingInvoices)} />
        <DashboardMiniCard label="PO Value" value={ru(poValue)} />
      </Box>

      <Box
        sx={{
          ...SECTION_CHART_ROW_SX,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          mb: 2.5,
        }}
      >
        <ScopedChartPanel
          title="Receivables Trend"
          subtitle="Outstanding balance by month"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets, chartHeight: h }) => (
            <ResponsiveContainer width="100%" height="100%" minHeight={h}>
              <LineChart data={receivablesTrend(monthBuckets, scope.scopedInvoices)} margin={CHART_MARGIN}>
                <CartesianGrid {...ct.gridProps} vertical={false} />
                <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={ct.axisStyle}
                  tickFormatter={yAxisCurrencyTick}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Outstanding']} />
                <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke={theme.palette.warning.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ScopedChartPanel>

        <ScopedChartPanel
          title="Collections Trend"
          subtitle="Cash collected by month"
          chartHeight={chartHeight}
          loading={loading}
          showStatus={false}
          globalFilters={globalFilters}
          data={chartData}
        >
          {({ scope, monthBuckets, chartHeight: h }) => (
            <ResponsiveContainer width="100%" height="100%" minHeight={h}>
              <LineChart data={collectionsTrend(monthBuckets, scope.scopedInvoices)} margin={CHART_MARGIN}>
                <CartesianGrid {...ct.gridProps} vertical={false} />
                <XAxis dataKey="month" tick={ct.axisStyle} axisLine={false} tickLine={false} />
                <YAxis
                  tick={ct.axisStyle}
                  tickFormatter={yAxisCurrencyTick}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip contentStyle={ct.tooltipStyle} formatter={(v) => [ru(Number(v ?? 0)), 'Collected']} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ScopedChartPanel>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mb: 2.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
          Receivables
        </Typography>
        <DashboardDataTable
          columns={RECEIVABLES_TABLE_COLUMNS}
          rows={receivableTableRows}
          emptyMessage="No outstanding receivables for selected filters"
          tableHeaderBg={tableHeaderBg}
        />
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
          Payables
        </Typography>
        <DashboardDataTable
          columns={PAYABLES_TABLE_COLUMNS}
          rows={payableTableRows}
          emptyMessage="No outstanding payables for selected filters"
          tableHeaderBg={tableHeaderBg}
        />
      </Paper>
    </DashboardSection>
  )
}
