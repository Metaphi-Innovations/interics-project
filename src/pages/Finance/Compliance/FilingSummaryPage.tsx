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
} from '@mui/material'
import dayjs from 'dayjs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { FileSpreadsheet, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Select, StatusBadge, Tag } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { financeApi } from '@/api/financeApi'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type {
  GlobalGstEntry,
  GlobalGstResponse,
  GlobalTdsClientEntry,
  GlobalTdsResponse,
  GlobalTdsVendorEntry,
} from '@/slices/finance/types'
import type { ClientInvoice } from '@/slices/live/types'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { formatCurrency, formatDate, formatInr } from '@/utils/formatters'
import { invoiceStatusToBadgeType } from '@/pages/Finance/invoiceStatus'

const CHART_GST = '#1D9E75'
const CHART_TDS = '#EF9F27'

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
type TableTab = 'all' | 'gst' | 'clientTds' | 'vendorTds'

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

function sumClientTdsInRange(entries: GlobalTdsClientEntry[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const s = start.format('YYYY-MM-DD')
  const e = end.format('YYYY-MM-DD')
  return entries.reduce((acc, x) => acc + (x.invoiceDate >= s && x.invoiceDate <= e ? x.tdsAmount : 0), 0)
}

function sumVendorTdsInRange(entries: GlobalTdsVendorEntry[], start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const s = start.format('YYYY-MM-DD')
  const e = end.format('YYYY-MM-DD')
  return entries.reduce((acc, x) => acc + (x.paymentDate >= s && x.paymentDate <= e ? x.tdsAmount : 0), 0)
}

function buildMonthlyChartSeries(
  gst: GlobalGstResponse | null,
  tds: GlobalTdsResponse | null,
): { period: string; gst: number; tds: number }[] {
  const rows: { period: string; gst: number; tds: number }[] = []
  const end = dayjs()
  for (let i = 5; i >= 0; i--) {
    const d = end.subtract(i, 'month')
    const y = d.year()
    const mo = d.month() + 1
    let gstSum = 0
    for (const e of gst?.entries ?? []) {
      const ed = dayjs(e.invoiceDate)
      if (ed.year() === y && ed.month() + 1 === mo) gstSum += e.gstAmount
    }
    let tdsSum = 0
    for (const e of tds?.clientEntries ?? []) {
      const ed = dayjs(e.invoiceDate)
      if (ed.year() === y && ed.month() + 1 === mo) tdsSum += e.tdsAmount
    }
    for (const e of tds?.vendorEntries ?? []) {
      const ed = dayjs(e.paymentDate)
      if (ed.year() === y && ed.month() + 1 === mo) tdsSum += e.tdsAmount
    }
    rows.push({ period: d.format('MMM YY'), gst: gstSum, tds: tdsSum })
  }
  return rows
}

function buildQuarterlyChartSeries(
  gst: GlobalGstResponse | null,
  tds: GlobalTdsResponse | null,
): { period: string; gst: number; tds: number }[] {
  const rows: { period: string; gst: number; tds: number }[] = []
  const oldestQStart = startOfCalendarQuarter(startOfCalendarQuarter(dayjs()).subtract(15, 'month'))
  for (let i = 0; i < 6; i++) {
    const qStart = oldestQStart.add(i * 3, 'month')
    const qEnd = qStart.add(3, 'month').subtract(1, 'day').endOf('day')
    const qn = Math.floor(qStart.month() / 3) + 1
    const label = `Q${qn} ${qStart.year()}`
    const gstSum = sumGstInClosedRange(gst?.entries ?? [], qStart, qEnd)
    const tdsSum =
      sumClientTdsInRange(tds?.clientEntries ?? [], qStart, qEnd) +
      sumVendorTdsInRange(tds?.vendorEntries ?? [], qStart, qEnd)
    rows.push({ period: label, gst: gstSum, tds: tdsSum })
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

export default function FilingSummaryPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const projects = useAppSelector((s) => s.projects.items ?? [])

  const [filterProjectId, setFilterProjectId] = useState('')
  const [gstData, setGstData] = useState<GlobalGstResponse | null>(null)
  const [tdsData, setTdsData] = useState<GlobalTdsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly')
  const [tableTab, setTableTab] = useState<TableTab>('all')

  const params = useMemo(() => {
    const p: Record<string, string | undefined> = {}
    if (filterProjectId) p.projectId = filterProjectId
    return p
  }, [filterProjectId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [g, t] = await Promise.all([
        financeApi.getGstData(params),
        financeApi.getTdsData({ ...params, type: 'all' }),
      ])
      setGstData(unwrapApiData<GlobalGstResponse>(g.data))
      setTdsData(unwrapApiData<GlobalTdsResponse>(t.data))
    } catch {
      setError('Could not load compliance data.')
      setGstData(null)
      setTdsData(null)
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

  const gstCollected = gstData?.summary.totalGst ?? 0
  const clientTds = tdsData?.summary.clientTdsTotal ?? 0
  const vendorTds = tdsData?.summary.vendorTdsTotal ?? 0
  const netTax = gstCollected - clientTds - vendorTds
  const netPositive = netTax >= 0

  const fy = useMemo(() => indianFyLabelAndRange(), [])
  const fyGst = useMemo(
    () =>
      (gstData?.entries ?? []).reduce(
        (s, e) => s + (inDateRange(e.invoiceDate, fy.startStr, fy.endStr) ? e.gstAmount : 0),
        0,
      ),
    [gstData, fy.startStr, fy.endStr],
  )
  const fyClientTds = useMemo(
    () =>
      (tdsData?.clientEntries ?? []).reduce(
        (s, e) => s + (inDateRange(e.invoiceDate, fy.startStr, fy.endStr) ? e.tdsAmount : 0),
        0,
      ),
    [tdsData, fy.startStr, fy.endStr],
  )
  const fyVendorTds = useMemo(
    () =>
      (tdsData?.vendorEntries ?? []).reduce(
        (s, e) => s + (inDateRange(e.paymentDate, fy.startStr, fy.endStr) ? e.tdsAmount : 0),
        0,
      ),
    [tdsData, fy.startStr, fy.endStr],
  )
  const fyNet = fyGst - fyClientTds - fyVendorTds

  const chartData = useMemo(() => {
    if (periodMode === 'monthly') return buildMonthlyChartSeries(gstData, tdsData)
    return buildQuarterlyChartSeries(gstData, tdsData)
  }, [gstData, tdsData, periodMode])

  const projectOptions = useMemo(
    () => projects.map((p) => ({ label: p.name, value: p.id })),
    [projects],
  )

  const allMergedRows = useMemo(() => {
    type Row = {
      id: string
      sortDate: string
      date: string
      ref: string
      projectName: string
      party: string
      type: 'gst' | 'clientTds' | 'vendorTds'
      base: number
      tax: number
      status: string
    }
    const out: Row[] = []
    for (const e of gstData?.entries ?? []) {
      out.push({
        id: `g-${e.invoiceId}`,
        sortDate: e.invoiceDate,
        date: e.invoiceDate,
        ref: e.invoiceNumber,
        projectName: e.projectName,
        party: e.clientName,
        type: 'gst',
        base: e.baseAmount,
        tax: e.gstAmount,
        status: e.status,
      })
    }
    for (const e of tdsData?.clientEntries ?? []) {
      out.push({
        id: `c-${e.invoiceId}`,
        sortDate: e.invoiceDate,
        date: e.invoiceDate,
        ref: e.invoiceNumber,
        projectName: e.projectName,
        party: e.clientName,
        type: 'clientTds',
        base: e.grossAmount,
        tax: e.tdsAmount,
        status: e.status,
      })
    }
    for (const e of tdsData?.vendorEntries ?? []) {
      out.push({
        id: `v-${e.paymentId}`,
        sortDate: e.paymentDate,
        date: e.paymentDate,
        ref: e.referenceNumber ?? e.paymentId,
        projectName: e.projectName,
        party: e.vendorName,
        type: 'vendorTds',
        base: e.invoiceTotal,
        tax: e.tdsAmount,
        status: '—',
      })
    }
    out.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
    return out
  }, [gstData, tdsData])

  const gstFooterTotals = useMemo(() => {
    const entries = gstData?.entries ?? []
    return {
      base: entries.reduce((s, e) => s + e.baseAmount, 0),
      gst: entries.reduce((s, e) => s + e.gstAmount, 0),
    }
  }, [gstData])

  const clientTdsTotalFooter = useMemo(
    () => (tdsData?.clientEntries ?? []).reduce((s, e) => s + e.tdsAmount, 0),
    [tdsData],
  )

  const vendorTdsTotalFooter = useMemo(
    () => (tdsData?.vendorEntries ?? []).reduce((s, e) => s + e.tdsAmount, 0),
    [tdsData],
  )

  function exportCurrentTab() {
    const stamp = dayjs().format('YYYY-MM-DD')
    if (tableTab === 'all') {
      downloadCsv(`filing-all-entries-${stamp}.csv`, [
        ['Date', 'Invoice/Ref', 'Project', 'Party', 'Type', 'Base amount', 'Tax amount', 'Status'],
        ...allMergedRows.map((r) => [
          r.date,
          r.ref,
          r.projectName,
          r.party,
          r.type === 'gst' ? 'GST' : r.type === 'clientTds' ? 'Client TDS' : 'Vendor TDS',
          r.base,
          r.tax,
          r.status,
        ]),
      ])
    } else if (tableTab === 'gst') {
      const rows = gstData?.entries ?? []
      downloadCsv(`filing-gst-${stamp}.csv`, [
        ['Invoice no.', 'Project', 'Client', 'Invoice date', 'Base amount', 'GST rate', 'GST amount', 'Status'],
        ...rows.map((e) => [
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
    } else if (tableTab === 'clientTds') {
      const rows = tdsData?.clientEntries ?? []
      downloadCsv(`filing-client-tds-${stamp}.csv`, [
        ['Invoice no.', 'Project', 'Client', 'Invoice date', 'Invoice amount', 'TDS rate', 'TDS amount', 'Status'],
        ...rows.map((e) => [
          e.invoiceNumber,
          e.projectName,
          e.clientName,
          e.invoiceDate,
          e.grossAmount,
          e.tdsRate,
          e.tdsAmount,
          e.status,
        ]),
      ])
    } else {
      const rows = tdsData?.vendorEntries ?? []
      downloadCsv(`filing-vendor-tds-${stamp}.csv`, [
        ['Payment ref', 'Project', 'Vendor', 'Payment date', 'Invoice total', 'TDS rate', 'TDS amount'],
        ...rows.map((e) => [
          e.referenceNumber ?? e.paymentId,
          e.projectName,
          e.vendorName,
          e.paymentDate,
          e.invoiceTotal,
          e.tdsRate,
          e.tdsAmount,
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
          <ShieldCheck size={20} strokeWidth={1.75} color={tokens.color.primary[600]} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 20, md: 22 } }}>
            Filing Summary
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Overall GST and TDS position across all projects
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
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { label: 'GST Collected', value: gstCollected, valueColor: undefined as string | undefined },
          { label: 'Client TDS Deducted', value: clientTds, valueColor: undefined },
          { label: 'Vendor TDS Deducted', value: vendorTds, valueColor: undefined },
          {
            label: 'Net Tax Position',
            value: netTax,
            valueColor: netPositive ? 'success.main' : 'error.main',
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
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: 15,
                mt: 0.5,
                color: m.valueColor ?? 'text.primary',
              }}
            >
              ₹{formatInr(m.value)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mb: 3 }} alignItems="stretch">
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
              Monthly trend
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
          <Box sx={{ width: 1, height: 360 }}>
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
                    formatter={(v, name) => [`₹${formatInr(Number(v ?? 0))}`, String(name)]}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="gst" name="GST" fill={CHART_GST} />
                  <Bar dataKey="tds" name="TDS" fill={CHART_TDS} />
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
            Period breakdown
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Select
              placeholder="All"
              size="sm"
              fullWidth
              clearable
              value={filterProjectId}
              onChange={(v) => setFilterProjectId(String(v))}
              options={projectOptions}
            />
          </Box>
          <Stack gap={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                GST on client invoices
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(gstCollected)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                TDS deducted by clients
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(clientTds)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                TDS deducted on vendors
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(vendorTds)}
              </Typography>
            </Stack>
            <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[100]}`, my: 1 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                Net tax position
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: netPositive ? 'success.main' : 'error.main',
                }}
              >
                ₹{formatInr(netTax)}
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[100]}`, my: 2 }} />

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            This Financial Year ({fy.label})
          </Typography>
          <Stack gap={1} sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                GST on client invoices
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(fyGst)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                TDS deducted by clients
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(fyClientTds)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                TDS deducted on vendors
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(fyVendorTds)}
              </Typography>
            </Stack>
            <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[100]}`, my: 1 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                Net tax position
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: fyNet >= 0 ? 'success.main' : 'error.main',
                }}
              >
                ₹{formatInr(fyNet)}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <Box
        sx={{
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          sx={{ p: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}` }}
        >
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {(
              [
                ['all', 'All Entries'],
                ['gst', 'GST'],
                ['clientTds', 'Client TDS'],
                ['vendorTds', 'Vendor TDS'],
              ] as const
            ).map(([id, label]) => (
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
          <Button
            size="sm"
            variant="outlined"
            color="primary"
            label="Export CSV"
            startIcon={<FileSpreadsheet size={14} strokeWidth={2} />}
            onClick={exportCurrentTab}
          />
        </Stack>

        <Table size="small">
          {tableTab === 'all' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice/Ref</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Project</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Party</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Type</TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    Base amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    Tax amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TABLE_CELL_SX, py: 4 }}>
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  allMergedRows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={TABLE_CELL_SX}>{formatDate(r.date)}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{r.ref}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{r.projectName}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{r.party}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        {r.type === 'gst' && (
                          <Tag label="GST" size="sm" color={tokens.color.success[500]} />
                        )}
                        {r.type === 'clientTds' && (
                          <Tag label="Client TDS" size="sm" color={tokens.color.warning[500]} />
                        )}
                        {r.type === 'vendorTds' && (
                          <Tag label="Vendor TDS" size="sm" color={tokens.color.info[600]} />
                        )}
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX} align="right">
                        ₹{formatInr(r.base)}
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX} align="right">
                        ₹{formatInr(r.tax)}
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        {r.type === 'vendorTds' ? (
                          '—'
                        ) : (
                          <StatusBadge
                            status={invoiceStatusToBadgeType(r.status as ClientInvoice['status'])}
                            label={r.status}
                            size="small"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && allMergedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                      No entries
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          )}

          {tableTab === 'gst' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice no.</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Project</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Client</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    Base amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    GST rate
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    GST amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(gstData?.entries ?? []).map((e) => (
                  <TableRow key={e.invoiceId} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography
                        component="button"
                        type="button"
                        onClick={() => navigate('/finance/receivables')}
                        sx={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: tokens.color.success[600],
                          cursor: 'pointer',
                          border: 'none',
                          bgcolor: 'transparent',
                          p: 0,
                          textAlign: 'left',
                          textDecoration: 'underline',
                        }}
                      >
                        {e.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{e.projectName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{e.clientName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{formatDate(e.invoiceDate)}</TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      ₹{formatInr(e.baseAmount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      {e.gstRate}%
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      ₹{formatInr(e.gstAmount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <StatusBadge
                        status={invoiceStatusToBadgeType(e.status as ClientInvoice['status'])}
                        label={e.status}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    Total
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }} align="right">
                    ₹{formatInr(gstFooterTotals.base)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }} align="right">
                    ₹{formatInr(gstFooterTotals.gst)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableFooter>
            </>
          )}

          {tableTab === 'clientTds' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice no.</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Project</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Client</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    Invoice amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    TDS rate
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    TDS amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(tdsData?.clientEntries ?? []).map((e) => (
                  <TableRow key={e.invoiceId} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography
                        component="button"
                        type="button"
                        onClick={() => navigate('/finance/receivables')}
                        sx={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: tokens.color.success[600],
                          cursor: 'pointer',
                          border: 'none',
                          bgcolor: 'transparent',
                          p: 0,
                          textAlign: 'left',
                          textDecoration: 'underline',
                        }}
                      >
                        {e.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{e.projectName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{e.clientName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{formatDate(e.invoiceDate)}</TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      ₹{formatInr(e.grossAmount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      {e.tdsRate}%
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      ₹{formatInr(e.tdsAmount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <StatusBadge
                        status={invoiceStatusToBadgeType(e.status as ClientInvoice['status'])}
                        label={e.status}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    Total TDS amount
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }} align="right">
                    ₹{formatInr(clientTdsTotalFooter)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableFooter>
            </>
          )}

          {tableTab === 'vendorTds' && (
            <>
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Payment ref</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Project</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Vendor</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Payment date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    Invoice total
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    TDS rate
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX} align="right">
                    TDS amount
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(tdsData?.vendorEntries ?? []).map((e) => (
                  <TableRow key={e.paymentId} hover>
                    <TableCell sx={TABLE_CELL_SX}>{e.referenceNumber ?? e.paymentId}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{e.projectName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{e.vendorName}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{formatDate(e.paymentDate)}</TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      ₹{formatInr(e.invoiceTotal)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      {e.tdsRate}%
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX} align="right">
                      ₹{formatInr(e.tdsAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, fontWeight: 700 }}>
                    Total TDS amount
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700 }} align="right">
                    ₹{formatInr(vendorTdsTotalFooter)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </>
          )}
        </Table>
      </Box>
    </Box>
  )
}
