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
  TableFooter,
  Alert,
  LinearProgress,
} from '@mui/material'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Receipt } from 'lucide-react'
import { Button, Drawer, Select, StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { financeApi } from '@/api/financeApi'
import { unwrapApiData, unwrapApiList } from '@/modules/system-settings/shared/api'
import type {
  GlobalGstEntry,
  GstChartPoint,
  GstListType,
  GstMonthRow,
  GstPeriodBreakdown,
  GstProjectRow,
  GstSummary,
} from '@/slices/finance/types'
import { formatDate, formatInr } from '@/utils/formatters'

const CHART_GST = '#1D9E75'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: '10px',
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: '12px',
  px: 2,
}

type PeriodMode = 'monthly' | 'quarterly'

function parseChartPeriod(period: string): Date | null {
  const match = period.trim().match(/^([A-Za-z]{3})\s+(\d{2})$/)
  if (!match) return null
  const parsed = new Date(`${match[1]} 1, 20${match[2]}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function groupGstChartByQuarter(rows: GstChartPoint[]): GstChartPoint[] {
  const map = new Map<string, GstChartPoint>()
  for (const row of rows) {
    const parsed = parseChartPeriod(row.period)
    const label = parsed
      ? `Q${Math.floor(parsed.getMonth() / 3) + 1} ${parsed.getFullYear()}`
      : row.period
    const prev = map.get(label) ?? { period: label, gst: 0 }
    prev.gst += row.gst
    map.set(label, prev)
  }
  return [...map.values()]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function filenameFromDisposition(header: unknown, fallback: string) {
  if (typeof header !== 'string') return fallback
  const match = header.match(/filename="?([^";]+)"?/i)
  return match?.[1]?.trim() || fallback
}

function axisTickInr(v: number) {
  return `₹${formatInr(v)}`
}

function gstEntryStatusToBadge(status: string): StatusType {
  const s = status.replace(/-/g, '_').toLowerCase()
  if (s === 'paid') return 'paid'
  if (s === 'overdue') return 'overdue'
  if (s === 'draft') return 'invoice_draft'
  if (s === 'sent') return 'sent'
  if (s === 'partially_paid') return 'partially_paid'
  return 'pending'
}

export default function GSTPage() {
  const [filterProjectId, setFilterProjectId] = useState('')
  const [projectOptions, setProjectOptions] = useState<Array<{ label: string; value: string }>>([])
  const [kpis, setKpis] = useState<GstSummary | null>(null)
  const [monthlyChart, setMonthlyChart] = useState<GstChartPoint[]>([])
  const [breakdown, setBreakdown] = useState<GstPeriodBreakdown | null>(null)
  const [invoiceRows, setInvoiceRows] = useState<GlobalGstEntry[]>([])
  const [projectRows, setProjectRows] = useState<GstProjectRow[]>([])
  const [monthRows, setMonthRows] = useState<GstMonthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly')
  const [tableTab, setTableTab] = useState<GstListType>('invoice')
  const [drawerEntry, setDrawerEntry] = useState<GlobalGstEntry | null>(null)

  const scopeParams = useMemo(() => {
    const p: Record<string, string | undefined> = {}
    if (filterProjectId) p.projectId = filterProjectId
    return p
  }, [filterProjectId])

  useEffect(() => {
    void (async () => {
      try {
        const res = await financeApi.getProjectDropdown()
        const items = unwrapApiList<{ value: string; label: string }>(res.data)
        setProjectOptions(items.map((item) => ({ value: item.value, label: item.label })))
      } catch {
        setProjectOptions([])
      }
    })()
  }, [])

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, chartRes, breakdownRes] = await Promise.all([
        financeApi.getGstSummary(scopeParams),
        financeApi.getGstChart(scopeParams),
        financeApi.getGstPeriodBreakdown(scopeParams),
      ])
      setKpis(unwrapApiData<GstSummary>(summaryRes.data))
      setMonthlyChart(unwrapApiList<GstChartPoint>(chartRes.data))
      setBreakdown(unwrapApiData<GstPeriodBreakdown>(breakdownRes.data))
    } catch {
      setError('Could not load GST data.')
      setKpis(null)
      setMonthlyChart([])
      setBreakdown(null)
    } finally {
      setLoading(false)
    }
  }, [scopeParams])

  const loadTable = useCallback(async () => {
    try {
      const listParams = { ...scopeParams, limit: 100, type: tableTab }
      const res = await financeApi.getGstList(listParams)
      if (tableTab === 'invoice') {
        setInvoiceRows(unwrapApiList<GlobalGstEntry>(res.data))
        setProjectRows([])
        setMonthRows([])
        return
      }
      if (tableTab === 'project') {
        setProjectRows(unwrapApiList<GstProjectRow>(res.data))
        setInvoiceRows([])
        setMonthRows([])
        return
      }
      setMonthRows(unwrapApiList<GstMonthRow>(res.data))
      setInvoiceRows([])
      setProjectRows([])
    } catch {
      setError('Could not load GST data.')
      setInvoiceRows([])
      setProjectRows([])
      setMonthRows([])
    }
  }, [scopeParams, tableTab])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadTable()
  }, [loadTable])

  const chartData = useMemo(
    () => (periodMode === 'monthly' ? monthlyChart : groupGstChartByQuarter(monthlyChart)),
    [monthlyChart, periodMode],
  )

  const byProjectSorted = useMemo(() => {
    const rows = [...(breakdown?.byProject ?? [])]
    rows.sort((a, b) => b.gstAmount - a.gstAmount)
    return rows
  }, [breakdown?.byProject])

  const footerInvoice = useMemo(() => {
    const base = invoiceRows.reduce((s, e) => s + e.baseAmount, 0)
    const gst = invoiceRows.reduce((s, e) => s + e.gstAmount, 0)
    return { base, gst }
  }, [invoiceRows])

  const footerProject = useMemo(() => {
    const invoiceCount = projectRows.reduce((s, r) => s + r.invoiceCount, 0)
    const totalBase = projectRows.reduce((s, r) => s + r.baseAmount, 0)
    const totalGst = projectRows.reduce((s, r) => s + r.gstAmount, 0)
    return { invoiceCount, totalBase, totalGst }
  }, [projectRows])

  const footerMonth = useMemo(() => {
    const invoiceCount = monthRows.reduce((s, r) => s + r.invoiceCount, 0)
    const totalBase = monthRows.reduce((s, r) => s + r.baseAmount, 0)
    const totalGst = monthRows.reduce((s, r) => s + r.gstAmount, 0)
    return { invoiceCount, totalBase, totalGst }
  }, [monthRows])

  async function exportCurrentTab() {
    try {
      const res = await financeApi.exportGst({
        type: tableTab,
        ...(filterProjectId ? { projectId: filterProjectId } : {}),
      })
      downloadBlob(
        res.data as Blob,
        filenameFromDisposition(res.headers['content-disposition'], `gst-${tableTab}.csv`),
      )
    } catch {
      setError('Could not export GST data.')
    }
  }

  const pillSx = (active: boolean) => ({
    border: '1px solid',
    borderColor: active ? tokens.color.primary[500] : tokens.color.neutral[200],
    bgcolor: active ? tokens.color.primary[50] : 'background.paper',
    color: 'text.primary',
    px: 2,
    py: 0.75,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  })

  const tabIds: { id: GstListType; label: string }[] = [
    { id: 'invoice', label: 'By Invoice' },
    { id: 'project', label: 'By Project' },
    { id: 'month', label: 'By Month' },
  ]

  return (
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
          <Receipt size={20} strokeWidth={1.75} color={tokens.color.primary[600]} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 22 } }}>
            GST
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            GST collected on all client invoices
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: 'Total GST Collected',
            value: kpis?.totalGst ?? 0,
          },
          {
            label: 'This Month',
            value: kpis?.thisMonth ?? 0,
          },
          {
            label: 'Invoice Count',
            value: kpis?.invoiceCount ?? 0,
          },
        ].map((m) => (
          <Box
            key={m.label}
            sx={{
              p: 2,
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
            >
              {m.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, mt: 0.5 }}>
              {m.label === 'Invoice Count' ? (
                m.value
              ) : (
                <>₹{formatInr(typeof m.value === 'number' ? m.value : 0)}</>
              )}
            </Typography>
          </Box>
        ))}
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} gap={2} sx={{ mb: 3 }} alignItems="stretch">
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: 2,
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              GST by Month
            </Typography>
            <Stack direction="row" gap={0.75}>
              <Box
                component="button"
                type="button"
                onClick={() => setPeriodMode('monthly')}
                sx={pillSx(periodMode === 'monthly')}
              >
                Monthly
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => setPeriodMode('quarterly')}
                sx={pillSx(periodMode === 'quarterly')}
              >
                Quarterly
              </Box>
            </Stack>
          </Stack>
          <Box sx={{ width: 1, height: 320 }}>
            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Loading chart…
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.color.neutral[200]} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={axisTickInr} width={56} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v) => [`₹${formatInr(Number(v ?? 0))}`, 'GST']}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="gst" name="GST" fill={CHART_GST} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: 2,
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            By Project
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Select
              placeholder="All"
              size="sm"
              fullWidth
              clearable
              value={filterProjectId}
              onChange={(v) => setFilterProjectId(v ? String(v) : '')}
              options={projectOptions}
            />
          </Box>

          <Stack spacing={2}>
            {loading && (
              <Typography variant="body2" color="text.secondary">
                Loading…
              </Typography>
            )}
            {!loading &&
              byProjectSorted.map((row) => (
                <Box key={row.projectId}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }} noWrap>
                      {row.projectName}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      ₹{formatInr(row.gstAmount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {row.percentage.toFixed(0)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, row.percentage)}
                    sx={{
                      mt: 1,
                      height: 8,
                      borderRadius: 1,
                      bgcolor: tokens.color.neutral[100],
                      '& .MuiLinearProgress-bar': { bgcolor: CHART_GST },
                    }}
                  />
                </Box>
              ))}
            {!loading && byProjectSorted.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No GST data for this filter.
              </Typography>
            )}
          </Stack>

          <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[100]}`, mt: 2, pt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                This FY Total ({breakdown?.fy.label ?? '—'})
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ₹{formatInr(breakdown?.fy.gstTotal ?? 0)}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Stack>

      <Box
        sx={{
          p: 2,
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} sx={{ mb: 2 }}>
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {tabIds.map(({ id, label }) => (
              <Box
                key={id}
                component="button"
                type="button"
                onClick={() => setTableTab(id)}
                sx={pillSx(tableTab === id)}
              >
                {label}
              </Box>
            ))}
          </Stack>
          <Button variant="outlined" color="secondary" size="sm" onClick={() => void exportCurrentTab()}>
            Export CSV
          </Button>
        </Stack>

        <Table size="small">
          {tableTab === 'invoice' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice no.</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Project</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Client</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice date</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Base amount</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>GST rate</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>GST amount</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TABLE_CELL_SX, py: 4 }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : invoiceRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No invoices.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoiceRows.map((e) => (
                    <TableRow key={e.invoiceId} hover>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Button
                          variant="text"
                          color="primary"
                          size="sm"
                          onClick={() => setDrawerEntry(e)}
                          sx={{ color: CHART_GST, fontWeight: 600, p: 0, minWidth: 0 }}
                        >
                          {e.invoiceNumber}
                        </Button>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{e.projectName}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{e.clientName}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{formatDate(e.invoiceDate)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(e.baseAmount)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>{e.gstRate}%</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(e.gstAmount)}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <StatusBadge status={gstEntryStatusToBadge(e.status)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    TOTAL
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    ₹{formatInr(footerInvoice.base)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    ₹{formatInr(footerInvoice.gst)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableFooter>
            </>
          )}

          {tableTab === 'project' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Project</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Client</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Invoice count</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Total base</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Total GST</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Avg GST rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, py: 4 }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : projectRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No data.
                    </TableCell>
                  </TableRow>
                ) : (
                  projectRows.map((r) => (
                    <TableRow key={r.projectId} hover>
                      <TableCell sx={TABLE_CELL_SX}>{r.projectName}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{r.clientName}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>{r.invoiceCount}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.baseAmount)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.gstAmount)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>
                        {r.baseAmount > 0 ? `${Math.round((100 * r.gstAmount) / r.baseAmount)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    TOTAL
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    {footerProject.invoiceCount}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    ₹{formatInr(footerProject.totalBase)}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    ₹{formatInr(footerProject.totalGst)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableFooter>
            </>
          )}

          {tableTab === 'month' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Month</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Invoice count</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Total base</TableCell>
                  <TableCell sx={{ ...TABLE_HEADER_SX, textAlign: 'right' }}>Total GST</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, py: 4 }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : monthRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No data.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthRows.map((r) => (
                    <TableRow key={`${r.year}-${r.month}`} hover>
                      <TableCell sx={TABLE_CELL_SX}>{r.period}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>{r.invoiceCount}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.baseAmount)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.gstAmount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>TOTAL</TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    {footerMonth.invoiceCount}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    ₹{formatInr(footerMonth.totalBase)}
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, textAlign: 'right' }}>
                    ₹{formatInr(footerMonth.totalGst)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </>
          )}
        </Table>
      </Box>

      <Drawer
        open={Boolean(drawerEntry)}
        onClose={() => setDrawerEntry(null)}
        title="Invoice"
        subtitle={drawerEntry?.invoiceNumber}
        width={440}
        footer={
          <Stack direction="row" justifyContent="flex-end" sx={{ width: 1 }}>
            <Button variant="outlined" color="secondary" size="sm" onClick={() => setDrawerEntry(null)}>
              Close
            </Button>
          </Stack>
        }
      >
        {drawerEntry && (
          <Stack spacing={2} sx={{ p: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Project
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {drawerEntry.projectName}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Client
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {drawerEntry.clientName}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Invoice date
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatDate(drawerEntry.invoiceDate)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Base amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(drawerEntry.baseAmount)}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  GST rate
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {drawerEntry.gstRate}%
                </Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                GST amount
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{formatInr(drawerEntry.gstAmount)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Status
              </Typography>
              <StatusBadge status={gstEntryStatusToBadge(drawerEntry.status)} />
            </Box>
          </Stack>
        )}
      </Drawer>
    </Box>
  )
}
