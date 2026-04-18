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
import dayjs from 'dayjs'
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
import type { GlobalGstEntry, GlobalGstResponse } from '@/slices/finance/types'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { formatCurrency, formatDate, formatInr } from '@/utils/formatters'

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
type TableTab = 'invoice' | 'project' | 'month'

function startOfCalendarQuarter(d: dayjs.Dayjs) {
  const qStartM = Math.floor(d.month() / 3) * 3
  return d.month(qStartM).date(1).startOf('day')
}

function indianFyLabelAndRange(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const startYear = m >= 4 ? y : y - 1
  const startStr = `${startYear}-04-01`
  const endStr = `${startYear + 1}-03-31`
  const label = `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
  return { startStr, endStr, label, startYear }
}

function inDateRange(iso: string, startStr: string, endStr: string) {
  return iso >= startStr && iso <= endStr
}

function sumGstInClosedRange(entries: GlobalGstEntry[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const s = start.format('YYYY-MM-DD')
  const e = end.format('YYYY-MM-DD')
  return entries.reduce((acc, x) => acc + (x.invoiceDate >= s && x.invoiceDate <= e ? x.gstAmount : 0), 0)
}

function buildGstMonthlyChartSeries(entries: GlobalGstEntry[]): { period: string; gst: number }[] {
  const rows: { period: string; gst: number }[] = []
  const end = dayjs()
  for (let i = 5; i >= 0; i--) {
    const d = end.subtract(i, 'month')
    const y = d.year()
    const mo = d.month() + 1
    let gstSum = 0
    for (const e of entries) {
      const ed = dayjs(e.invoiceDate)
      if (ed.year() === y && ed.month() + 1 === mo) gstSum += e.gstAmount
    }
    rows.push({ period: d.format('MMM YY'), gst: gstSum })
  }
  return rows
}

function buildGstQuarterlyChartSeries(entries: GlobalGstEntry[]): { period: string; gst: number }[] {
  const rows: { period: string; gst: number }[] = []
  const oldestQStart = startOfCalendarQuarter(startOfCalendarQuarter(dayjs()).subtract(15, 'month'))
  for (let i = 0; i < 6; i++) {
    const qStart = oldestQStart.add(i * 3, 'month')
    const qEnd = qStart.add(3, 'month').subtract(1, 'day').endOf('day')
    const qn = Math.floor(qStart.month() / 3) + 1
    const yy = qStart.format('YY')
    const label = `Q${qn} '${yy}`
    const gstSum = sumGstInClosedRange(entries, qStart, qEnd)
    rows.push({ period: label, gst: gstSum })
  }
  return rows
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (c: string | number) => {
    const s = String(c)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const body = rows.map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function axisTickInr(v: number) {
  return `₹${formatCurrency(v)}`
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
  const dispatch = useAppDispatch()
  const projects = useAppSelector((s) => s.projects.items)

  const [filterProjectId, setFilterProjectId] = useState('')
  const [gstData, setGstData] = useState<GlobalGstResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly')
  const [tableTab, setTableTab] = useState<TableTab>('invoice')
  const [drawerEntry, setDrawerEntry] = useState<GlobalGstEntry | null>(null)

  const params = useMemo(() => {
    const p: Record<string, string | undefined> = {}
    if (filterProjectId) p.projectId = filterProjectId
    return p
  }, [filterProjectId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const g = await financeApi.getGstData(params)
      setGstData(g.data)
    } catch {
      setError('Could not load GST data.')
      setGstData(null)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    void dispatch(fetchProjects({}))
  }, [dispatch])

  useEffect(() => {
    void load()
  }, [load])

  const entries = gstData?.entries ?? []
  const summary = gstData?.summary

  const fy = useMemo(() => indianFyLabelAndRange(), [])
  const fyGstTotal = useMemo(
    () =>
      entries.reduce(
        (s, e) => s + (inDateRange(e.invoiceDate, fy.startStr, fy.endStr) ? e.gstAmount : 0),
        0,
      ),
    [entries, fy.startStr, fy.endStr],
  )

  const chartData = useMemo(() => {
    if (periodMode === 'monthly') return buildGstMonthlyChartSeries(entries)
    return buildGstQuarterlyChartSeries(entries)
  }, [entries, periodMode])

  const projectOptions = useMemo(
    () => projects.map((p) => ({ label: p.name, value: p.id })),
    [projects],
  )

  const byProjectSorted = useMemo(() => {
    const rows = [...(summary?.byProject ?? [])]
    rows.sort((a, b) => b.gstAmount - a.gstAmount)
    return rows
  }, [summary?.byProject])

  const projectAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        projectId: string
        projectName: string
        clientName: string
        invoiceCount: number
        totalBase: number
        totalGst: number
      }
    >()
    for (const e of entries) {
      const prev =
        map.get(e.projectId) ?? {
          projectId: e.projectId,
          projectName: e.projectName,
          clientName: e.clientName,
          invoiceCount: 0,
          totalBase: 0,
          totalGst: 0,
        }
      prev.invoiceCount += 1
      prev.totalBase += e.baseAmount
      prev.totalGst += e.gstAmount
      if (!prev.clientName && e.clientName) prev.clientName = e.clientName
      map.set(e.projectId, prev)
    }
    return [...map.values()].sort((a, b) => b.totalGst - a.totalGst)
  }, [entries])

  const monthAggregates = useMemo(() => {
    const map = new Map<
      string,
      { key: string; month: number; year: number; invoiceCount: number; totalBase: number; totalGst: number }
    >()
    for (const e of entries) {
      const d = dayjs(e.invoiceDate)
      const mk = `${d.year()}-${d.month() + 1}`
      const prev =
        map.get(mk) ?? {
          key: mk,
          month: d.month() + 1,
          year: d.year(),
          invoiceCount: 0,
          totalBase: 0,
          totalGst: 0,
        }
      prev.invoiceCount += 1
      prev.totalBase += e.baseAmount
      prev.totalGst += e.gstAmount
      map.set(mk, prev)
    }
    return [...map.values()].sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month,
    )
  }, [entries])

  const footerInvoice = useMemo(() => {
    const base = entries.reduce((s, e) => s + e.baseAmount, 0)
    const gst = entries.reduce((s, e) => s + e.gstAmount, 0)
    return { base, gst }
  }, [entries])

  const footerProject = useMemo(() => {
    const ic = projectAggregates.reduce((s, r) => s + r.invoiceCount, 0)
    const tb = projectAggregates.reduce((s, r) => s + r.totalBase, 0)
    const tg = projectAggregates.reduce((s, r) => s + r.totalGst, 0)
    return { invoiceCount: ic, totalBase: tb, totalGst: tg }
  }, [projectAggregates])

  const footerMonth = useMemo(() => {
    const ic = monthAggregates.reduce((s, r) => s + r.invoiceCount, 0)
    const tb = monthAggregates.reduce((s, r) => s + r.totalBase, 0)
    const tg = monthAggregates.reduce((s, r) => s + r.totalGst, 0)
    return { invoiceCount: ic, totalBase: tb, totalGst: tg }
  }, [monthAggregates])

  function exportCurrentTab() {
    const stamp = dayjs().format('YYYY-MM-DD')
    if (tableTab === 'invoice') {
      downloadCsv(`gst-by-invoice-${stamp}.csv`, [
        ['Invoice no.', 'Project', 'Client', 'Invoice date', 'Base amount', 'GST rate %', 'GST amount', 'Status'],
        ...entries.map((e) => [
          e.invoiceNumber,
          e.projectName,
          e.clientName,
          e.invoiceDate,
          e.baseAmount,
          e.gstRate,
          e.gstAmount,
          e.status,
        ]),
      ])
    } else if (tableTab === 'project') {
      downloadCsv(`gst-by-project-${stamp}.csv`, [
        ['Project', 'Client', 'Invoice count', 'Total base', 'Total GST', 'Avg GST rate %'],
        ...projectAggregates.map((r) => [
          r.projectName,
          r.clientName,
          r.invoiceCount,
          r.totalBase,
          r.totalGst,
          r.totalBase > 0 ? Math.round((100 * r.totalGst) / r.totalBase) : 0,
        ]),
      ])
    } else {
      downloadCsv(`gst-by-month-${stamp}.csv`, [
        ['Month', 'Invoice count', 'Total base', 'Total GST'],
        ...monthAggregates.map((r) => [
          dayjs(`${r.year}-${String(r.month).padStart(2, '0')}-01`).format('MMM YYYY'),
          r.invoiceCount,
          r.totalBase,
          r.totalGst,
        ]),
      ])
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

  const tabIds: { id: TableTab; label: string }[] = [
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
            value: summary?.totalGst ?? 0,
          },
          {
            label: 'This Month',
            value: summary?.thisMonth ?? 0,
          },
          {
            label: 'Invoice Count',
            value: summary?.invoiceCount ?? 0,
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
                <>
                  ₹{formatInr(typeof m.value === 'number' ? m.value : 0)}
                </>
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
              label="Project"
              placeholder="All projects"
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
                      ₹{formatCurrency(row.gstAmount)}
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
                This FY Total ({fy.label})
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ₹{formatInr(fyGstTotal)}
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
          <Button variant="outlined" color="secondary" size="sm" onClick={exportCurrentTab}>
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
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No invoices.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((e) => (
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
                ) : projectAggregates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No data.
                    </TableCell>
                  </TableRow>
                ) : (
                  projectAggregates.map((r) => (
                    <TableRow key={r.projectId} hover>
                      <TableCell sx={TABLE_CELL_SX}>{r.projectName}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{r.clientName}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>{r.invoiceCount}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.totalBase)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.totalGst)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>
                        {r.totalBase > 0 ? `${Math.round((100 * r.totalGst) / r.totalBase)}%` : '—'}
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
                ) : monthAggregates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No data.
                    </TableCell>
                  </TableRow>
                ) : (
                  monthAggregates.map((r) => (
                    <TableRow key={r.key} hover>
                      <TableCell sx={TABLE_CELL_SX}>
                        {dayjs(`${r.year}-${String(r.month).padStart(2, '0')}-01`).format('MMM YYYY')}
                      </TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>{r.invoiceCount}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.totalBase)}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, textAlign: 'right' }}>₹{formatInr(r.totalGst)}</TableCell>
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
