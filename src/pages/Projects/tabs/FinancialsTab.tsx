import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Box,
  Card,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { WorkspaceSection } from '../../../components/templates'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  fetchInvoices,
  fetchVendorInvoices,
  fetchPayments,
  fetchExpenses,
  fetchReimbursements,
} from '../../../slices/live/thunk'
import { fetchBaseline, fetchClientPO } from '../../../slices/baseline/thunk'
import type { Project } from '../../../slices/projects/reducer'
import { formatCurrency } from '../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './live/vendorSettlement/utils'
import { usePermission } from '@/hooks/usePermission'
import { RecordDetailSectionTitle } from '@/pages/workspace/recordDetailTabUtils'
import {
  PROJECT_DETAILS_GRID_SX,
  METADATA_BODY_SX,
  formatSqftRate,
} from '../projectOverviewHelpers'
import {
  baselineForProject,
  buildCostBreakdown,
  buildRevenueBreakdown,
  buildVarianceRows,
  sumExpensesAmount,
  sumPlannedExpensesBaseline,
  sumVendorPaymentsNetPaid,
  varianceColorKey,
  type RevenueServiceRow,
} from './financialsAggregates'
import { balancePending, totalReceivedBank } from './live/clientInvoiceUtils'
import { TaxComplianceSection } from './live/TaxComplianceSection'

const SUMMARY_COUNT = 4

const VARIANCE_NOTE_LINES = [
  'Actual figures based on recorded invoices and payments.',
  'Baseline from locked project baseline.',
] as const
const TRACKING_METRIC_COUNT = 6

type FinancialSubTab = 'overview' | 'compliance'

const FINANCIAL_SUB_TAB_SX = {
  minHeight: 36,
  '& .MuiTab-root': {
    minHeight: 36,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'none' as const,
    px: 2,
    py: 0,
  },
  '& .MuiTabs-indicator': {
    height: 2,
  },
} as const

function FinancialModuleSectionHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
        {title}
      </Typography>
      {description != null && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          {description}
        </Typography>
      )}
    </Box>
  )
}

const METRIC_CELL_ALIGN_SX = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  height: '100%',
} as const

const SUMMARY_CELL_SX = {
  px: '20px',
  py: '4px',
  minWidth: 0,
  ...METRIC_CELL_ALIGN_SX,
} as const

const DURATION_CELL_SX = {
  px: '20px',
  py: 0,
  minWidth: 0,
  ...METRIC_CELL_ALIGN_SX,
} as const

const TRACKING_CELL_SX = {
  px: '20px',
  py: '6px',
  minWidth: 0,
  ...METRIC_CELL_ALIGN_SX,
} as const

const REVENUE_TABLE_COLGROUP = (
  <colgroup>
    <col style={{ width: '28%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
  </colgroup>
)

const COST_TABLE_COLGROUP = (
  <colgroup>
    <col style={{ width: '22%' }} />
    <col style={{ width: '22%' }} />
    <col style={{ width: '19%' }} />
    <col style={{ width: '19%' }} />
    <col style={{ width: '18%' }} />
  </colgroup>
)

const VARIANCE_TABLE_COLGROUP = (
  <colgroup>
    <col style={{ width: '28%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
    <col style={{ width: '18%' }} />
  </colgroup>
)

function fmtInr(amount: number): string {
  return `₹${formatCurrency(amount)}`
}

function fmtSignedInr(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}₹${formatCurrency(Math.abs(amount))}`
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function activeDurationLabel(startRaw: string | null | undefined, endRaw: string | null | undefined): string {
  if (!startRaw) return '—'
  const start = new Date(startRaw)
  if (Number.isNaN(start.getTime())) return '—'

  const candidateEnd = endRaw ? new Date(endRaw) : new Date()
  if (Number.isNaN(candidateEnd.getTime())) return '—'

  const ms = candidateEnd.getTime() - start.getTime()
  if (ms <= 0) return '0 days'

  const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24))
  const months = Math.floor(totalDays / 30)
  const days = totalDays % 30
  if (months <= 0) return `${days} day${days === 1 ? '' : 's'}`
  return `${months} mo ${days} day${days === 1 ? '' : 's'}`
}

interface FinancialsTabProps {
  project: Project
}

function RateField({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="overline"
        sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.6, display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: '4px', ...METADATA_BODY_SX, fontWeight: 600 }}>
        {formatSqftRate(value)}
      </Typography>
    </Box>
  )
}

function CommercialRatesSection({ project }: { project: Project }) {
  return (
    <WorkspaceSection title="Commercial rates">
      <RecordDetailSectionTitle>Per sqft values</RecordDetailSectionTitle>
      <Box sx={PROJECT_DETAILS_GRID_SX}>
        <RateField label="Build Value per sqft (Level 1)" value={project.buildValuePerSqft} />
        <RateField label="Build Value per sqft (Level 2)" value={project.buildValuePerSqftLevel2} />
        <RateField label="Design Fee per sqft (Level 1)" value={project.designFeePerSqft} />
        <RateField label="Design Fee per sqft (Level 2)" value={project.designFeePerSqftLevel2} />
      </Box>
    </WorkspaceSection>
  )
}

interface RevenueCategorySubtotal {
  baseline: number
  invoiced: number
  received: number
}

function RevenueCategorySection({
  categoryName,
  catRows,
  subtotal,
  isCollapsed,
  onToggle,
  theme,
}: {
  categoryName: string
  catRows: RevenueServiceRow[]
  subtotal: RevenueCategorySubtotal
  isCollapsed: boolean
  onToggle: () => void
  theme: Theme
}) {
  return (
    <>
      <TableRow
        sx={{
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          '& .MuiTableCell-root': {
            fontWeight: 700,
            borderBottom: `1px solid ${tokens.color.neutral[100]}`,
          },
        }}
      >
        <TableCell sx={TABLE_CELL_SX}>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <IconButton
              size="small"
              aria-label={isCollapsed ? `Expand ${categoryName}` : `Collapse ${categoryName}`}
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
              {categoryName}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell sx={TABLE_CELL_SX}>{fmtInr(subtotal.baseline)}</TableCell>
        <TableCell sx={TABLE_CELL_SX}>{fmtInr(subtotal.invoiced)}</TableCell>
        <TableCell sx={TABLE_CELL_SX}>{fmtInr(subtotal.received)}</TableCell>
        <TableCell sx={TABLE_CELL_SX} />
      </TableRow>

      {!isCollapsed
        ? catRows.map((r, idx) => (
            <TableRow
              key={`${r.categoryId}-${r.serviceId}`}
              sx={{
                bgcolor: idx % 2 === 0 ? 'background.paper' : tokens.color.neutral[50],
              }}
            >
              <TableCell sx={{ ...TABLE_CELL_SX, pl: 5 }}>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {r.serviceName}
                </Typography>
              </TableCell>
              <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.baseline)}</TableCell>
              <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.invoiced)}</TableCell>
              <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.received)}</TableCell>
              <TableCell sx={TABLE_CELL_SX}>{r.status}</TableCell>
            </TableRow>
          ))
        : null}
    </>
  )
}

export default function FinancialsTab({ project }: FinancialsTabProps) {
  const theme = useTheme()
  const [activeSubTab, setActiveSubTab] = useState<FinancialSubTab>('overview')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const dispatch = useAppDispatch()
  const canViewFinancialMetrics = usePermission('financial', 'view')
  const canViewCompliance = usePermission('compliance', 'view')
  const selected = useAppSelector((s) => s.projects.selectedItem)
  const { baseline: baselineState, clientPOs } = useAppSelector((s) => s.baseline)
  const { invoices, vendorInvoices, payments, expenses } = useAppSelector((s) => s.live)

  const projectId = project.id
  const projectForSummary = selected?.id === projectId ? selected : project

  useEffect(() => {
    void dispatch(fetchInvoices(projectId))
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchPayments(projectId))
    void dispatch(fetchExpenses(projectId))
    void dispatch(fetchReimbursements(projectId))
    void dispatch(fetchBaseline(projectId))
    void dispatch(fetchClientPO(projectId))
  }, [dispatch, projectId])

  const baseline = useMemo(
    () => baselineForProject(baselineState, projectId),
    [baselineState, projectId],
  )

  const revenueRows = useMemo(() => {
    if (!baseline) return []
    return buildRevenueBreakdown(baseline, invoices, projectId)
  }, [baseline, invoices, projectId])

  const costRows = useMemo(() => {
    if (!baseline) return []
    return buildCostBreakdown(baseline, vendorInvoices)
  }, [baseline, vendorInvoices])

  const varianceRows = useMemo(
    () => buildVarianceRows(baseline, projectId, invoices, payments, expenses),
    [baseline, projectId, invoices, payments, expenses],
  )

  const revenue = projectForSummary.totalClientPOValue
  const cost = projectForSummary.totalVendorPOValue
  const grossProfit = revenue - cost
  const marginPct = revenue > 0 ? (100 * grossProfit) / revenue : 0

  const selectedClientPO = useMemo(() => {
    return clientPOs.find((po) => po.projectId === projectId) ?? null
  }, [clientPOs, projectId])

  const projectStartDate = selectedClientPO?.startDate ?? projectForSummary.startDate
  const projectEndDate = selectedClientPO?.endDate ?? projectForSummary.expectedEndDate

  const amountReceived = useMemo(
    () =>
      invoices
        .filter((i) => i.projectId === projectId)
        .reduce((sum, inv) => sum + totalReceivedBank(inv.payments), 0),
    [invoices, projectId],
  )

  const invoicesUnderProcess = useMemo(
    () =>
      invoices
        .filter((i) => i.projectId === projectId && balancePending(i) > 0.01)
        .reduce((sum, inv) => sum + inv.grossAmount, 0),
    [invoices, projectId],
  )

  const vendorPaymentAmount = useMemo(
    () => sumVendorPaymentsNetPaid(payments, projectId),
    [payments, projectId],
  )

  const softExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.projectId === projectId && e.type !== 'vendor_linked')
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, projectId],
  )

  const summaryMetrics: Array<{
    label: string
    valueColor: string
    renderValue: () => ReactNode
  }> = [
    {
      label: 'REVENUE',
      valueColor: 'primary.main',
      renderValue: () => formatCurrency(revenue),
    },
    {
      label: 'COST',
      valueColor: 'warning.main',
      renderValue: () => formatCurrency(cost),
    },
    {
      label: 'GROSS PROFIT',
      valueColor: grossProfit < 0 ? 'error.main' : 'success.main',
      renderValue: () => formatCurrency(grossProfit),
    },
    {
      label: 'MARGIN %',
      valueColor: marginPct < 0 ? 'error.main' : 'success.main',
      renderValue: () => `${marginPct.toFixed(1)}%`,
    },
  ]

  const revenueGrand = useMemo(() => {
    return revenueRows.reduce(
      (acc, r) => ({
        baseline: acc.baseline + r.baseline,
        invoiced: acc.invoiced + r.invoiced,
        received: acc.received + r.received,
      }),
      { baseline: 0, invoiced: 0, received: 0 },
    )
  }, [revenueRows])

  const costGrand = useMemo(() => {
    return costRows.reduce(
      (acc, r) => ({
        baseline: acc.baseline + r.baseline,
        invoiced: acc.invoiced + r.invoiced,
        paid: acc.paid + r.paid,
      }),
      { baseline: 0, invoiced: 0, paid: 0 },
    )
  }, [costRows])

  const unbilledAmount = Math.max(0, revenueGrand.baseline - revenueGrand.invoiced)
  const unbilledVendorPayments = Math.max(0, costGrand.baseline - costGrand.invoiced)
  const plannedSoftExpenses = baseline ? sumPlannedExpensesBaseline(baseline) : 0
  const totalSoftExpenses = Math.max(softExpenses, plannedSoftExpenses, sumExpensesAmount(expenses, projectId))

  const trackingMetrics = [
    { label: 'Amount Received', value: fmtInr(amountReceived) },
    { label: 'Invoices Under Process', value: fmtInr(invoicesUnderProcess) },
    { label: 'Unbilled Amount', value: fmtInr(unbilledAmount) },
    { label: 'Vendor Payment Amount', value: fmtInr(vendorPaymentAmount) },
    { label: 'Unbilled Vendor Payments', value: fmtInr(unbilledVendorPayments) },
    { label: 'Soft Expenses', value: fmtInr(totalSoftExpenses) },
  ]

  function toggleCategory(categoryId: string): void {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const subTabs = useMemo(() => {
    const tabs: { label: string; value: FinancialSubTab }[] = [
      { label: 'Financial Overview', value: 'overview' },
    ]
    if (canViewCompliance) {
      tabs.push({ label: 'Tax & Compliance', value: 'compliance' })
    }
    return tabs
  }, [canViewCompliance])

  useEffect(() => {
    if (!canViewCompliance && activeSubTab === 'compliance') {
      setActiveSubTab('overview')
    }
  }, [canViewCompliance, activeSubTab])

  return (
    <Box>
      <Box
        sx={{
          borderBottom: `1px solid ${tokens.color.neutral[100]}`,
          mb: 2,
        }}
      >
        <Tabs
          value={activeSubTab}
          onChange={(_, value: FinancialSubTab) => setActiveSubTab(value)}
          sx={FINANCIAL_SUB_TAB_SX}
        >
          {subTabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {activeSubTab === 'overview' ? (
        <Stack gap={2}>
          <FinancialModuleSectionHeading
            title="Financial Overview"
            description="Project revenue, cost, collections, and variance against baseline."
          />

      {canViewFinancialMetrics ? <CommercialRatesSection project={projectForSummary} /> : null}

      {/* Section 1 — Summary strip */}
      <Card
        sx={{
          mb: 0,
          p: '10px 0',
          display: 'grid',
          alignItems: 'stretch',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            lg: `repeat(${SUMMARY_COUNT}, 1fr)`,
          },
        }}
      >
        {summaryMetrics.map((metric, idx) => (
          <Box
            key={metric.label}
            sx={(t) => ({
              ...SUMMARY_CELL_SX,
              borderRight: idx < summaryMetrics.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              [t.breakpoints.down('lg')]: {
                borderRight:
                  idx < summaryMetrics.length - 1 && idx % 2 === 0 ? '1px solid' : 'none',
                borderBottom: idx < summaryMetrics.length - 2 ? '1px solid' : 'none',
              },
            })}
          >
            <Typography
              variant="overline"
              sx={{
                fontSize: 10,
                color: 'text.secondary',
                letterSpacing: 0.6,
                display: 'block',
              }}
            >
              {metric.label}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: 15,
                mt: '1px',
                color: metric.valueColor,
              }}
            >
              {metric.label === 'MARGIN %' ? (
                metric.renderValue()
              ) : (
                <>
                  <Box component="span" sx={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>
                    ₹
                  </Box>
                  {metric.renderValue()}
                </>
              )}
            </Typography>
          </Box>
        ))}
      </Card>

      <Card
        sx={{
          mb: 0,
          py: '12px',
          px: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: 2,
        }}
      >
        <Box
          sx={(t) => ({
            px: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderColor: 'divider',
            [t.breakpoints.up('md')]: {
              minWidth: 148,
              borderRight: '1px solid',
            },
            [t.breakpoints.down('md')]: {
              borderBottom: '1px solid',
              pb: 1,
              mb: 0.5,
            },
          })}
        >
          <Typography
            variant="overline"
            sx={{
              fontSize: 10,
              color: 'text.secondary',
              letterSpacing: 0.6,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            PROJECT DURATION
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'grid',
            alignItems: 'stretch',
            gridTemplateColumns: { xs: '1fr', md: `repeat(3, minmax(0, 1fr))` },
          }}
        >
          {[
            { label: 'Project Start Date', value: fmtDate(projectStartDate) },
            { label: 'Project End Date', value: fmtDate(projectEndDate) },
            {
              label: 'Active Duration / Timeline',
              value: activeDurationLabel(projectStartDate, projectEndDate),
            },
          ].map((item, idx) => (
            <Box
              key={item.label}
              sx={(t) => ({
                ...DURATION_CELL_SX,
                borderRight: idx < 2 ? '1px solid' : 'none',
                borderColor: 'divider',
                [t.breakpoints.down('md')]: {
                  borderRight: 'none',
                  borderBottom: idx < 2 ? '1px solid' : 'none',
                  py: idx === 0 ? 0 : 1.5,
                  pb: idx === 2 ? 0 : undefined,
                },
              })}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontSize: 13, fontWeight: 600 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      <Card
        sx={{
          mb: 0,
          p: '10px 0',
          display: 'grid',
          alignItems: 'stretch',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            lg: `repeat(${TRACKING_METRIC_COUNT}, 1fr)`,
          },
        }}
      >
        {trackingMetrics.map((metric, idx) => (
          <Box
            key={metric.label}
            sx={(t) => ({
              ...TRACKING_CELL_SX,
              borderColor: 'divider',
              [t.breakpoints.up('lg')]: {
                borderRight: idx < trackingMetrics.length - 1 ? '1px solid' : 'none',
                borderBottom: 'none',
              },
              [t.breakpoints.between('sm', 'lg')]: {
                borderRight: idx % 2 === 0 && idx < trackingMetrics.length - 1 ? '1px solid' : 'none',
                borderBottom: idx < trackingMetrics.length - 2 ? '1px solid' : 'none',
              },
              [t.breakpoints.down('sm')]: {
                borderRight: 'none',
                borderBottom: idx < trackingMetrics.length - 1 ? '1px solid' : 'none',
              },
            })}
          >
            <Typography
              variant="overline"
              sx={{ fontSize: 10, color: 'text.secondary', letterSpacing: 0.5, display: 'block' }}
            >
              {metric.label}
            </Typography>
            <Typography variant="body2" sx={{ mt: '2px', fontSize: 13, fontWeight: 700 }}>
              {metric.value}
            </Typography>
          </Box>
        ))}
      </Card>

      <WorkspaceSection title="Revenue breakdown" noPadding>
        {!baseline ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
            Revenue breakdown requires a locked baseline for this project.
          </Typography>
        ) : (
          <TableContainer>
            <Table
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                '& .MuiTableCell-root': { verticalAlign: 'middle' },
              }}
            >
              {REVENUE_TABLE_COLGROUP}
              <TableHead>
                <TableRow>
                  {['Category / service', 'Baseline value', 'Invoiced', 'Received', 'Status'].map(
                    (h) => (
                      <TableCell key={h} sx={TABLE_HEADER_SX}>
                        {h}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {baseline.categories.map((cat) => {
                  const catRows = revenueRows.filter((r) => r.categoryId === cat.id)
                  const catSub = catRows.reduce(
                    (acc, r) => ({
                      baseline: acc.baseline + r.baseline,
                      invoiced: acc.invoiced + r.invoiced,
                      received: acc.received + r.received,
                    }),
                    { baseline: 0, invoiced: 0, received: 0 },
                  )
                  return (
                    <RevenueCategorySection
                      key={cat.id}
                      categoryName={cat.categoryName}
                      catRows={catRows}
                      subtotal={catSub}
                      isCollapsed={collapsedCategories.has(cat.id)}
                      onToggle={() => toggleCategory(cat.id)}
                      theme={theme}
                    />
                  )
                })}
                <TableRow
                  sx={{
                    '& .MuiTableCell-root': {
                      borderTop: `2px solid ${tokens.color.neutral[200]}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      fontWeight: 700,
                    },
                  }}
                >
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>Grand total</TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    {fmtInr(revenueGrand.baseline)}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    {fmtInr(revenueGrand.invoiced)}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    {fmtInr(revenueGrand.received)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </WorkspaceSection>

      <WorkspaceSection title="Cost breakdown" noPadding>
        {!baseline ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
            Cost breakdown requires a locked baseline for this project.
          </Typography>
        ) : costRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
            No vendor mappings in the baseline.
          </Typography>
        ) : (
          <TableContainer>
            <Table
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                '& .MuiTableCell-root': { verticalAlign: 'middle' },
              }}
            >
              {COST_TABLE_COLGROUP}
              <TableHead>
                <TableRow>
                  {['Vendor', 'Service', 'Baseline value', 'Invoiced', 'Paid'].map((h) => (
                    <TableCell key={h} sx={TABLE_HEADER_SX}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {costRows.map((r) => (
                  <TableRow key={`${r.vendorId}-${r.serviceId}`}>
                    <TableCell sx={TABLE_CELL_SX}>{r.vendorName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{r.serviceName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.baseline)}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.invoiced)}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.paid)}</TableCell>
                  </TableRow>
                ))}
                <TableRow
                  sx={{
                    '& .MuiTableCell-root': {
                      borderTop: `2px solid ${tokens.color.neutral[200]}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                      fontWeight: 700,
                    },
                  }}
                >
                  <TableCell colSpan={2} sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    Grand total
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    {fmtInr(costGrand.baseline)}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    {fmtInr(costGrand.invoiced)}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    {fmtInr(costGrand.paid)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </WorkspaceSection>

      <WorkspaceSection title="Variance analysis" noPadding>
        {varianceRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 2 }}>
            Variance analysis requires a locked baseline for this project.
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table
                size="small"
                sx={{
                  tableLayout: 'fixed',
                  width: '100%',
                  '& .MuiTableCell-root': { verticalAlign: 'middle' },
                }}
              >
                {VARIANCE_TABLE_COLGROUP}
                <TableHead>
                  <TableRow>
                    {['Item', 'Baseline', 'Actual', 'Variance', 'Variance %'].map((h) => (
                      <TableCell key={h} sx={TABLE_HEADER_SX}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {varianceRows.map((row) => {
                    const tone = varianceColorKey(row)
                    const varColor =
                      tone === 'success'
                        ? 'success.main'
                        : tone === 'error'
                          ? 'error.main'
                          : 'text.primary'
                    return (
                      <TableRow key={row.item}>
                        <TableCell sx={TABLE_CELL_SX}>{row.item}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>{fmtInr(row.baseline)}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>{fmtInr(row.actual)}</TableCell>
                        <TableCell sx={{ ...TABLE_CELL_SX, color: varColor, fontWeight: 600 }}>
                          {fmtSignedInr(row.variance)}
                        </TableCell>
                        <TableCell sx={{ ...TABLE_CELL_SX, color: varColor, fontWeight: 600 }}>
                          {row.variancePctLabel}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box component="footer" sx={{ mt: 2, px: 2 }}>
              {VARIANCE_NOTE_LINES.map((line) => (
                <Typography
                  key={line}
                  variant="caption"
                  component="p"
                  sx={{
                    m: 0,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  {line}
                </Typography>
              ))}
            </Box>
          </>
        )}
      </WorkspaceSection>
        </Stack>
      ) : null}

      {activeSubTab === 'compliance' && canViewCompliance ? (
        <Stack gap={2}>
          <FinancialModuleSectionHeading
            title="Tax & Compliance"
            description="GST, labour cess, and TDS position for this project."
          />
          <TaxComplianceSection
            projectId={projectId}
            clientName={projectForSummary.customerName}
          />
        </Stack>
      ) : null}
    </Box>
  )
}
