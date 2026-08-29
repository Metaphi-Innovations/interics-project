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
  Skeleton,
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
import { unwrapApiData, unwrapApiList } from '@/modules/system-settings/shared/api'
import type {
  FillingSummaryChartPoint,
  FillingSummaryKpis,
  FillingSummaryListType,
  FillingSummaryPeriodBreakdown,
  GlobalGstEntry,
  GlobalTdsClientEntry,
  GlobalTdsVendorEntry,
} from '@/slices/finance/types'
import type { ClientInvoice } from '@/slices/live/types'
import { formatDate, formatInr } from '@/utils/formatters'
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

const TAB_TO_LIST_TYPE: Record<Exclude<TableTab, 'all'>, FillingSummaryListType> = {
  gst: 'gst',
  clientTds: 'client_tds',
  vendorTds: 'vendor_tds',
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

function parseChartPeriod(period: string): Date | null {
  const match = period.trim().match(/^([A-Za-z]{3})\s+(\d{2})$/)
  if (!match) return null
  const parsed = new Date(`${match[1]} 1, 20${match[2]}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function groupChartByQuarter(rows: FillingSummaryChartPoint[]): FillingSummaryChartPoint[] {
  const map = new Map<string, FillingSummaryChartPoint>()
  for (const row of rows) {
    const parsed = parseChartPeriod(row.period)
    const label = parsed
      ? `Q${Math.floor(parsed.getMonth() / 3) + 1} ${parsed.getFullYear()}`
      : row.period
    const prev = map.get(label) ?? { period: label, gst: 0, tds: 0 }
    prev.gst += row.gst
    prev.tds += row.tds
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

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (c: string | number) => {
    const s = String(c)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const body = rows.map((r) => r.map(esc).join(',')).join('\n')
  downloadBlob(new Blob([body], { type: 'text/csv;charset=utf-8;' }), filename)
}

function filenameFromDisposition(header: unknown, fallback: string) {
  if (typeof header !== 'string') return fallback
  const match = header.match(/filename="?([^";]+)"?/i)
  return match?.[1]?.trim() || fallback
}

function axisTickInr(v: number) {
  return `₹${formatInr(v)}`
}

export default function FilingSummaryPage() {
  const navigate = useNavigate()

  const [filterProjectId, setFilterProjectId] = useState('')
  const [projectOptions, setProjectOptions] = useState<Array<{ label: string; value: string }>>([])
  const [kpis, setKpis] = useState<FillingSummaryKpis | null>(null)
  const [monthlyChart, setMonthlyChart] = useState<FillingSummaryChartPoint[]>([])
  const [breakdown, setBreakdown] = useState<FillingSummaryPeriodBreakdown | null>(null)
  const [gstEntries, setGstEntries] = useState<GlobalGstEntry[]>([])
  const [clientTdsEntries, setClientTdsEntries] = useState<GlobalTdsClientEntry[]>([])
  const [vendorTdsEntries, setVendorTdsEntries] = useState<GlobalTdsVendorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly')
  const [tableTab, setTableTab] = useState<TableTab>('gst')

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
        financeApi.getFillingSummary(scopeParams),
        financeApi.getFillingSummaryChart(scopeParams),
        financeApi.getFillingSummaryPeriodBreakdown(scopeParams),
      ])
      setKpis(unwrapApiData<FillingSummaryKpis>(summaryRes.data))
      setMonthlyChart(unwrapApiList<FillingSummaryChartPoint>(chartRes.data))
      setBreakdown(unwrapApiData<FillingSummaryPeriodBreakdown>(breakdownRes.data))
    } catch {
      setError('Could not load compliance data.')
      setKpis(null)
      setMonthlyChart([])
      setBreakdown(null)
    } finally {
      setLoading(false)
    }
  }, [scopeParams])

  const loadTable = useCallback(async () => {
    try {
      const listParams = { ...scopeParams, limit: 100 }
      if (tableTab === 'gst') {
        const gstRes = await financeApi.getFillingSummaryList({ ...listParams, type: 'gst' })
        setGstEntries(unwrapApiList<GlobalGstEntry>(gstRes.data))
        setClientTdsEntries([])
        setVendorTdsEntries([])
        return
      }
      if (tableTab === 'clientTds') {
        const clientRes = await financeApi.getFillingSummaryList({
          ...listParams,
          type: 'client_tds',
        })
        setClientTdsEntries(unwrapApiList<GlobalTdsClientEntry>(clientRes.data))
        setGstEntries([])
        setVendorTdsEntries([])
        return
      }
      if (tableTab === 'vendorTds') {
        const vendorRes = await financeApi.getFillingSummaryList({
          ...listParams,
          type: 'vendor_tds',
        })
        setVendorTdsEntries(unwrapApiList<GlobalTdsVendorEntry>(vendorRes.data))
        setGstEntries([])
        setClientTdsEntries([])
        return
      }
      const [gstRes, clientRes, vendorRes] = await Promise.all([
        financeApi.getFillingSummaryList({ ...listParams, type: 'gst' }),
        financeApi.getFillingSummaryList({ ...listParams, type: 'client_tds' }),
        financeApi.getFillingSummaryList({ ...listParams, type: 'vendor_tds' }),
      ])
      setGstEntries(unwrapApiList<GlobalGstEntry>(gstRes.data))
      setClientTdsEntries(unwrapApiList<GlobalTdsClientEntry>(clientRes.data))
      setVendorTdsEntries(unwrapApiList<GlobalTdsVendorEntry>(vendorRes.data))
    } catch {
      setError('Could not load compliance data.')
      setGstEntries([])
      setClientTdsEntries([])
      setVendorTdsEntries([])
    }
  }, [scopeParams, tableTab])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadTable()
  }, [loadTable])

  const gstCollected = kpis?.totalGst ?? 0
  const clientTds = kpis?.clientTdsTotal ?? 0
  const vendorTds = kpis?.vendorTdsTotal ?? 0
  const netTax = gstCollected - clientTds - vendorTds
  const netPositive = netTax >= 0

  const fy = useMemo(() => indianFyLabelAndRange(), [])
  const fyTotals = useMemo(() => {
    const periods = (breakdown?.periods ?? []).filter((p) => {
      const stamp = `${p.year}-${String(p.month).padStart(2, '0')}-01`
      return stamp >= fy.startStr && stamp <= fy.endStr
    })
    const fyGst = periods.reduce((s, p) => s + p.gst, 0)
    const fyClientTds = periods.reduce((s, p) => s + p.clientTds, 0)
    const fyVendorTds = periods.reduce((s, p) => s + p.vendorTds, 0)
    return {
      fyGst,
      fyClientTds,
      fyVendorTds,
      fyNet: fyGst - fyClientTds - fyVendorTds,
    }
  }, [breakdown, fy.startStr, fy.endStr])

  const chartData = useMemo(
    () => (periodMode === 'monthly' ? monthlyChart : groupChartByQuarter(monthlyChart)),
    [monthlyChart, periodMode],
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
    for (const e of gstEntries) {
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
    for (const e of clientTdsEntries) {
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
    for (const e of vendorTdsEntries) {
      out.push({
        id: `v-${e.paymentId}`,
        sortDate: e.paymentDate,
        date: e.paymentDate,
        ref: e.invoiceNumber?.trim() || e.referenceNumber?.trim() || '—',
        projectName: e.projectName,
        party: e.vendorName,
        type: 'vendorTds',
        base: e.invoiceTotal,
        tax: e.tdsAmount,
        status: e.status || 'paid',
      })
    }
    out.sort((a, b) => b.sortDate.localeCompare(a.sortDate))
    return out
  }, [gstEntries, clientTdsEntries, vendorTdsEntries])

  const gstFooterTotals = useMemo(
    () => ({
      base: gstEntries.reduce((s, e) => s + e.baseAmount, 0),
      gst: gstEntries.reduce((s, e) => s + e.gstAmount, 0),
    }),
    [gstEntries],
  )

  const clientTdsTotalFooter = useMemo(
    () => clientTdsEntries.reduce((s, e) => s + e.tdsAmount, 0),
    [clientTdsEntries],
  )

  const vendorTdsTotalFooter = useMemo(
    () => vendorTdsEntries.reduce((s, e) => s + e.tdsAmount, 0),
    [vendorTdsEntries],
  )

  async function exportCurrentTab() {
    const stamp = dayjs().format('YYYY-MM-DD')
    if (tableTab === 'all') {
      downloadCsv(`filing-all-entries-${stamp}.csv`, [
        ['Date', 'Invoice/Ref', 'Project', 'Party', 'Type', 'Base amount', 'GST / TDS amount', 'Status'],
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
      return
    }
    try {
      const type = TAB_TO_LIST_TYPE[tableTab]
      const res = await financeApi.exportFillingSummary({
        type,
        ...(filterProjectId ? { projectId: filterProjectId } : {}),
      })
      downloadBlob(
        res.data as Blob,
        filenameFromDisposition(res.headers['content-disposition'], `filling-summary-${type}.csv`),
      )
    } catch {
      setError('Could not export filling summary.')
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
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  p: 2,
                  border: `1px solid ${tokens.color.neutral[100]}`,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Skeleton width="60%" height={14} />
                <Skeleton width="80%" height={28} sx={{ mt: 1 }} />
              </Box>
            ))
          : [
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
              <Skeleton variant="rounded" width="100%" height="100%" />
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
              onChange={(v) => setFilterProjectId(v ? String(v) : '')}
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

          {filterProjectId && (breakdown?.periods.length ?? 0) > 0 && (
            <>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[100]}`, my: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                Monthly breakdown
              </Typography>
              <Stack gap={0.75} sx={{ mt: 1, maxHeight: 160, overflow: 'auto' }}>
                {breakdown?.periods.map((row) => (
                  <Stack key={`${row.year}-${row.month}`} direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {row.period}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      GST ₹{formatInr(row.gst)} · TDS ₹{formatInr(row.clientTds + row.vendorTds)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </>
          )}

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
                ₹{formatInr(fyTotals.fyGst)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                TDS deducted by clients
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(fyTotals.fyClientTds)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                TDS deducted on vendors
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatInr(fyTotals.fyVendorTds)}
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
                  color: fyTotals.fyNet >= 0 ? 'success.main' : 'error.main',
                }}
              >
                ₹{formatInr(fyTotals.fyNet)}
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
            onClick={() => void exportCurrentTab()}
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
                    GST / TDS amount
                  </TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading &&
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((__, j) => (
                        <TableCell key={j} sx={TABLE_CELL_SX}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
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
                        <StatusBadge
                          status={invoiceStatusToBadgeType(r.status as ClientInvoice['status'])}
                          label={r.status}
                          size="small"
                        />
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
                {loading
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j} sx={TABLE_CELL_SX}>
                            <Skeleton height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (gstEntries).map((e) => (
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
                {loading
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j} sx={TABLE_CELL_SX}>
                            <Skeleton height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (clientTdsEntries).map((e) => (
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
                  <TableCell sx={TABLE_HEADER_SX}>Invoice/Ref</TableCell>
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
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j} sx={TABLE_CELL_SX}>
                            <Skeleton height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (vendorTdsEntries).map((e) => (
                  <TableRow key={e.paymentId} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      {e.invoiceNumber?.trim() || e.referenceNumber?.trim() || '—'}
                    </TableCell>
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
                    <TableCell sx={TABLE_CELL_SX}>
                      <StatusBadge
                        status={invoiceStatusToBadgeType((e.status || 'paid') as ClientInvoice['status'])}
                        label={e.status || 'paid'}
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
                    ₹{formatInr(vendorTdsTotalFooter)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} />
                </TableRow>
              </TableFooter>
            </>
          )}
        </Table>
      </Box>
    </Box>
  )
}
