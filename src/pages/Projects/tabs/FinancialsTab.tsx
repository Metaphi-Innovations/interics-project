import { Fragment, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  Box,
  Card,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
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
import { fetchBaseline } from '../../../slices/baseline/thunk'
import type { Project } from '../../../slices/projects/reducer'
import { formatCurrency } from '../../../utils/formatters'
import {
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
} from './live/vendorSettlement/utils'
import {
  baselineForProject,
  buildCostBreakdown,
  buildRevenueBreakdown,
  buildVarianceRows,
  varianceColorKey,
} from './financialsAggregates'

const SUMMARY_COUNT = 4

const VARIANCE_NOTE_LINES = [
  'Actual figures based on recorded invoices and payments.',
  'Baseline from locked project baseline.',
] as const

function fmtInr(amount: number): string {
  return `₹${formatCurrency(amount)}`
}

function fmtSignedInr(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}₹${formatCurrency(Math.abs(amount))}`
}

interface FinancialsTabProps {
  project: Project
}

export default function FinancialsTab({ project }: FinancialsTabProps) {
  const dispatch = useAppDispatch()
  const selected = useAppSelector((s) => s.projects.selectedItem)
  const baselineState = useAppSelector((s) => s.baseline.baseline)
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

  const summaryMetrics: Array<{
    label: string
    highlight: boolean
    renderValue: () => ReactNode
  }> = [
    {
      label: 'REVENUE',
      highlight: false,
      renderValue: () => formatCurrency(revenue),
    },
    {
      label: 'COST',
      highlight: false,
      renderValue: () => formatCurrency(cost),
    },
    {
      label: 'GROSS PROFIT',
      highlight: grossProfit < 0,
      renderValue: () => formatCurrency(grossProfit),
    },
    {
      label: 'MARGIN %',
      highlight: false,
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

  return (
    <Stack gap={2}>
      {/* Section 1 — Summary strip */}
      <Card
        sx={{
          mb: 0,
          p: '10px 0',
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            lg: `repeat(${SUMMARY_COUNT}, 1fr)`,
          },
        }}
      >
        {summaryMetrics.map((metric) => (
          <Box
            key={metric.label}
            sx={(t) => ({
              px: '20px',
              py: '4px',
              borderRight: '1px solid',
              borderRightColor: 'divider',
              '&:nth-of-type(2n)': { borderRight: 'none' },
              '&:nth-of-type(-n+2)': { borderBottom: '1px solid', borderBottomColor: 'divider' },
              [t.breakpoints.up('lg')]: {
                '&:nth-of-type(2n)': { borderRight: '1px solid', borderRightColor: 'divider' },
                '&:last-of-type': { borderRight: 'none' },
                '&:nth-of-type(-n+2)': { borderBottom: 'none' },
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
                color: metric.highlight ? 'error.main' : 'text.primary',
              }}
            >
              {metric.label === 'MARGIN %' ? (
                metric.renderValue()
              ) : (
                <>
                  <Box component="span" sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}>
                    ₹
                  </Box>
                  {metric.renderValue()}
                </>
              )}
            </Typography>
          </Box>
        ))}
      </Card>

      {/* Section 2 — Two columns */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <WorkspaceSection title="Revenue breakdown">
            {!baseline ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Revenue breakdown requires a locked baseline for this project.
              </Typography>
            ) : (
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    {['Category / service', 'Baseline value', 'Invoiced', 'Received', 'Status'].map(
                      (h) => (
                        <TableCell key={h} sx={{ ...TABLE_HEADER_SX, width: h.includes('Category') ? '28%' : undefined }}>
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
                      <Fragment key={cat.id}>
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={(t) => ({
                              ...TABLE_CELL_SX,
                              fontWeight: 600,
                              bgcolor:
                                t.palette.mode === 'dark'
                                  ? alpha(t.palette.common.white, 0.08)
                                  : tokens.color.neutral[50],
                              color: 'text.secondary',
                              borderBottom: `1px solid ${tokens.color.neutral[100]}`,
                            })}
                          >
                            {cat.categoryName}
                          </TableCell>
                        </TableRow>
                        {catRows.map((r) => (
                          <TableRow key={`${cat.id}-${r.serviceId}`}>
                            <TableCell sx={{ ...TABLE_CELL_SX, pl: 3 }}>{r.serviceName}</TableCell>
                            <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.baseline)}</TableCell>
                            <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.invoiced)}</TableCell>
                            <TableCell sx={TABLE_CELL_SX}>{fmtInr(r.received)}</TableCell>
                            <TableCell sx={TABLE_CELL_SX}>{r.status}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                            Total {cat.categoryName}
                          </TableCell>
                          <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                            {fmtInr(catSub.baseline)}
                          </TableCell>
                          <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                            {fmtInr(catSub.invoiced)}
                          </TableCell>
                          <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                            {fmtInr(catSub.received)}
                          </TableCell>
                          <TableCell sx={TABLE_CELL_SX} />
                        </TableRow>
                      </Fragment>
                    )
                  })}
                  <TableRow>
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
            )}
          </WorkspaceSection>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <WorkspaceSection title="Cost breakdown">
            {!baseline ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Cost breakdown requires a locked baseline for this project.
              </Typography>
            ) : costRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No vendor mappings in the baseline.
              </Typography>
            ) : (
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    {['Vendor', 'Service', 'Baseline value', 'Invoiced', 'Paid', 'Status'].map((h) => (
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
                      <TableCell sx={TABLE_CELL_SX}>{r.status}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
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
                    <TableCell sx={TABLE_CELL_SX} />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </WorkspaceSection>
        </Grid>
      </Grid>

      {/* Section 3 — Variance */}
      <WorkspaceSection title="Variance analysis">
        {varianceRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Variance analysis requires a locked baseline for this project.
          </Typography>
        ) : (
          <>
            <Table size="small">
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
            <Box component="footer" sx={{ mt: 2 }}>
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
  )
}
