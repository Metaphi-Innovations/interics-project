import { http, HttpResponse } from 'msw'
import type { ClientInvoice } from '@/slices/live/types'
import {
  invoices,
  payments,
  PROJECT_CLIENTS,
  PROJECT_NAMES,
} from '@/mocks/liveFinanceMockState'
import { DEFAULT_TDS_RATE } from '@/config/billingRates'

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

/** Static seeds per calendar month key (YYYY-MM). */
const MOCK_DATA = {
  '2026-04': {
    filing: [
      {
        id: 'fr-gstr1-apr',
        type: 'GST' as const,
        returnType: 'GSTR-1',
        period: 'April 2026',
        dueDate: '2026-05-11',
        filedDate: null as string | null,
        status: 'pending' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-gstr3b-apr',
        type: 'GST' as const,
        returnType: 'GSTR-3B',
        period: 'April 2026',
        dueDate: '2026-05-20',
        filedDate: null as string | null,
        status: 'pending' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-tds-26q-q1fy27',
        type: 'TDS' as const,
        returnType: '26Q',
        period: 'Q1 FY2027',
        dueDate: '2026-07-31',
        filedDate: null as string | null,
        status: 'pending' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-gstr1-feb',
        type: 'GST' as const,
        returnType: 'GSTR-1',
        period: 'Feb 2026',
        dueDate: '2026-03-11',
        filedDate: '2026-03-10',
        status: 'filed' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-gstr3b-feb',
        type: 'GST' as const,
        returnType: 'GSTR-3B',
        period: 'Feb 2026',
        dueDate: '2026-03-20',
        filedDate: '2026-03-19',
        status: 'filed' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-tds-26q-q3',
        type: 'TDS' as const,
        returnType: '26Q',
        period: 'Q3 FY2026',
        dueDate: '2026-01-31',
        filedDate: '2026-01-28',
        status: 'filed' as const,
        lateFee: null as number | null,
      },
    ],
    gstSummary: {
      period: '2026-04',
      outputTax: 285000,
      inputCredit: 112000,
      netLiability: 173000,
      paid: 0,
      pending: 173000,
    },
    gstReturns: [
      {
        id: 'fr-gstr1-apr',
        returnType: 'GSTR-1' as const,
        period: 'April 2026',
        dueDate: '2026-05-11',
        filedDate: null as string | null,
        status: 'pending' as const,
        liability: 95000,
      },
      {
        id: 'fr-gstr3b-apr',
        returnType: 'GSTR-3B' as const,
        period: 'April 2026',
        dueDate: '2026-05-20',
        filedDate: null as string | null,
        status: 'pending' as const,
        liability: 78000,
      },
    ],
    tdsSummary: {
      period: '2026-04',
      totalDeducted: 48500,
      totalDeposited: 32000,
      pendingDeposit: 16500,
    },
    deductions: [
      {
        id: 'd-apr-001',
        period: '2026-04',
        deducteeType: 'vendor' as const,
        deducteeName: 'Build contractor',
        pan: 'AABCU9603R',
        amount: 18000,
        section: '194C',
        challanId: null as string | null,
        projectId: 'p-1',
        projectName: 'Tower A',
      },
      {
        id: 'd-apr-002',
        period: '2026-04',
        deducteeType: 'vendor' as const,
        deducteeName: 'Electrical vendor',
        pan: 'AAACE1234F',
        amount: 14500,
        section: '194C',
        challanId: null as string | null,
        projectId: 'p-1',
        projectName: 'Tower A',
      },
      {
        id: 'd-apr-003',
        period: '2026-04',
        deducteeType: 'client' as const,
        deducteeName: 'TDS received from client invoice',
        pan: 'AACCI1234G',
        amount: 16000,
        section: '194J',
        challanId: 'c-apr-001' as string | null,
        projectId: 'p-2',
        projectName: 'HQ Fitout',
      },
    ],
    challans: [
      {
        id: 'c-apr-001',
        period: '2026-04',
        bsrCode: '0001234',
        depositDate: '2026-04-15',
        amount: 16000,
        section: '194J',
        linkedDeductionIds: ['d-apr-003'] as string[],
      },
    ],
  },
  '2026-03': {
    filing: [
      {
        id: 'fr-gstr1-mar',
        type: 'GST' as const,
        returnType: 'GSTR-1',
        period: 'Mar 2026',
        dueDate: '2026-04-11',
        filedDate: null as string | null,
        status: 'pending' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-gstr3b-mar',
        type: 'GST' as const,
        returnType: 'GSTR-3B',
        period: 'Mar 2026',
        dueDate: '2026-04-20',
        filedDate: null as string | null,
        status: 'pending' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-tds-26q-q4',
        type: 'TDS' as const,
        returnType: '26Q',
        period: 'Q4 FY2026',
        dueDate: '2026-05-31',
        filedDate: null as string | null,
        status: 'pending' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-gstr1-feb',
        type: 'GST' as const,
        returnType: 'GSTR-1',
        period: 'Feb 2026',
        dueDate: '2026-03-11',
        filedDate: '2026-03-10',
        status: 'filed' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-gstr3b-feb',
        type: 'GST' as const,
        returnType: 'GSTR-3B',
        period: 'Feb 2026',
        dueDate: '2026-03-20',
        filedDate: '2026-03-19',
        status: 'filed' as const,
        lateFee: null as number | null,
      },
      {
        id: 'fr-tds-26q-q3',
        type: 'TDS' as const,
        returnType: '26Q',
        period: 'Q3 FY2026',
        dueDate: '2026-01-31',
        filedDate: '2026-01-28',
        status: 'filed' as const,
        lateFee: null as number | null,
      },
    ],
    gstSummary: {
      period: '2026-03',
      outputTax: 285000,
      inputCredit: 112000,
      netLiability: 173000,
      paid: 0,
      pending: 173000,
    },
    gstReturns: [
      {
        id: 'fr-gstr1-mar',
        returnType: 'GSTR-1' as const,
        period: 'Mar 2026',
        dueDate: '2026-04-11',
        filedDate: null as string | null,
        status: 'pending' as const,
        liability: 95000,
      },
      {
        id: 'fr-gstr3b-mar',
        returnType: 'GSTR-3B' as const,
        period: 'Mar 2026',
        dueDate: '2026-04-20',
        filedDate: null as string | null,
        status: 'pending' as const,
        liability: 78000,
      },
    ],
    tdsSummary: {
      period: '2026-03',
      totalDeducted: 48500,
      totalDeposited: 32000,
      pendingDeposit: 16500,
    },
    deductions: [
      {
        id: 'd-001',
        period: '2026-03',
        deducteeType: 'vendor' as const,
        deducteeName: 'Build contractor',
        pan: 'AABCU9603R',
        amount: 18000,
        section: '194C',
        challanId: null as string | null,
        projectId: 'p-1',
        projectName: 'Tower A',
      },
      {
        id: 'd-002',
        period: '2026-03',
        deducteeType: 'vendor' as const,
        deducteeName: 'Electrical vendor',
        pan: 'AAACE1234F',
        amount: 14500,
        section: '194C',
        challanId: null as string | null,
        projectId: 'p-1',
        projectName: 'Tower A',
      },
      {
        id: 'd-003',
        period: '2026-03',
        deducteeType: 'client' as const,
        deducteeName: 'TDS received from client invoice',
        pan: 'AACCI1234G',
        amount: 16000,
        section: '194J',
        challanId: 'c-001' as string | null,
        projectId: 'p-2',
        projectName: 'HQ Fitout',
      },
    ],
    challans: [
      {
        id: 'c-001',
        period: '2026-03',
        bsrCode: '0001234',
        depositDate: '2026-03-15',
        amount: 16000,
        section: '194J',
        linkedDeductionIds: ['d-003'] as string[],
      },
    ],
  },
} as const

type BundleKey = keyof typeof MOCK_DATA

/** Mutable clones of demo rows — `as const` seeds are widened on copy for handler mutations. */
interface FilingRowState {
  id: string
  type: 'GST' | 'TDS'
  returnType: string
  period: string
  dueDate: string
  filedDate: string | null
  status: 'pending' | 'filed' | 'overdue'
  lateFee: number | null
}

interface GstSummaryState {
  period: string
  outputTax: number
  inputCredit: number
  netLiability: number
  paid: number
  pending: number
}

interface GstReturnState {
  id: string
  returnType: string
  period: string
  dueDate: string
  filedDate: string | null
  status: 'pending' | 'filed' | 'overdue'
  liability: number
}

interface TdsSummaryState {
  period: string
  totalDeducted: number
  totalDeposited: number
  pendingDeposit: number
}

interface DeductionState {
  id: string
  period: string
  deducteeType: 'vendor' | 'client'
  deducteeName: string
  pan: string
  amount: number
  section: string
  challanId: string | null
  projectId: string
  projectName: string
}

interface ChallanState {
  id: string
  period: string
  bsrCode: string
  depositDate: string
  amount: number
  section: string
  linkedDeductionIds: string[]
}

interface MutableBundle {
  filingItems: FilingRowState[]
  gstSummary: GstSummaryState
  gstReturns: GstReturnState[]
  tdsSummary: TdsSummaryState
  deductions: DeductionState[]
  challans: ChallanState[]
}

function bundleFromSeed(key: BundleKey): MutableBundle {
  const s = MOCK_DATA[key]
  return {
    filingItems: clone(s.filing) as unknown as FilingRowState[],
    gstSummary: clone(s.gstSummary) as GstSummaryState,
    gstReturns: clone(s.gstReturns) as unknown as GstReturnState[],
    tdsSummary: clone(s.tdsSummary) as TdsSummaryState,
    deductions: clone(s.deductions) as unknown as DeductionState[],
    challans: clone(s.challans) as unknown as ChallanState[],
  }
}

/** Mutable copies keyed by YYYY-MM (only months with demo data). */
let stateByPeriod: Record<string, MutableBundle> = {
  '2026-04': bundleFromSeed('2026-04'),
  '2026-03': bundleFromSeed('2026-03'),
}

/** Map API period query to a bundle key, or null if no demo data. */
function resolveBundlePeriod(period: string | null): string | null {
  if (!period) return '2026-04'
  if (period === '2026-04') return '2026-04'
  if (period === '2026-03' || period === 'FY2026-Q4' || period === 'FY2026-Q3') return '2026-03'
  return null
}

function getBundle(key: string): MutableBundle | undefined {
  return stateByPeriod[key]
}

function recomputeGstPaid(b: MutableBundle): void {
  const paid = b.gstReturns.filter((r) => r.status === 'filed').reduce((s, r) => s + r.liability, 0)
  b.gstSummary.paid = paid
  b.gstSummary.pending = Math.max(0, b.gstSummary.netLiability - paid)
}

function recomputeTdsSummary(b: MutableBundle): void {
  const totalDeducted = b.deductions.reduce((s, d) => s + d.amount, 0)
  const totalDeposited = b.challans.reduce((s, c) => s + c.amount, 0)
  b.tdsSummary.totalDeducted = totalDeducted
  b.tdsSummary.totalDeposited = totalDeposited
  b.tdsSummary.pendingDeposit = Math.max(0, totalDeducted - totalDeposited)
}

function syncFilingFromGst(b: MutableBundle): void {
  for (const g of b.gstReturns) {
    const f = b.filingItems.find((x) => x.id === g.id)
    if (f) {
      f.filedDate = g.filedDate
      f.status = g.status === 'filed' ? 'filed' : g.status === 'overdue' ? 'overdue' : 'pending'
    }
  }
}

function findBundleForReturnId(id: string): MutableBundle | null {
  for (const b of Object.values(stateByPeriod)) {
    if (b.gstReturns.some((r) => r.id === id) || b.filingItems.some((f) => f.id === id)) return b
  }
  return null
}

function findBundleForDeductionId(id: string): MutableBundle | null {
  for (const b of Object.values(stateByPeriod)) {
    if (b.deductions.some((d) => d.id === id)) return b
  }
  return null
}

function findBundleForChallanId(id: string): MutableBundle | null {
  for (const b of Object.values(stateByPeriod)) {
    if (b.challans.some((c) => c.id === id)) return b
  }
  return null
}

function resetDemoState(): void {
  stateByPeriod = {
    '2026-04': bundleFromSeed('2026-04'),
    '2026-03': bundleFromSeed('2026-03'),
  }
}

export const complianceHandlers = [
  http.get('*/api/v1/compliance/filing', ({ request }) => {
    const url = new URL(request.url)
    const raw = url.searchParams.get('period') || '2026-04'
    const bundleKey = resolveBundlePeriod(raw)
    const type = url.searchParams.get('type') ?? 'all'
    if (!bundleKey) {
      return HttpResponse.json({ items: [] })
    }
    const b = getBundle(bundleKey)
    if (!b) return HttpResponse.json({ items: [] })
    let items = clone(b.filingItems)
    if (type === 'gst') items = items.filter((i) => i.type === 'GST')
    if (type === 'tds') items = items.filter((i) => i.type === 'TDS')
    return HttpResponse.json({ items })
  }),

  http.get('*/api/v1/compliance/gst', ({ request }) => {
    const url = new URL(request.url)
    const periodParam = url.searchParams.get('period')
    if (periodParam !== null && periodParam !== '') {
      const raw = periodParam || '2026-04'
      const bundleKey = resolveBundlePeriod(raw)
      if (!bundleKey) {
        return HttpResponse.json({ summary: null, returns: [] })
      }
      const b = getBundle(bundleKey)
      if (!b) return HttpResponse.json({ summary: null, returns: [] })
      recomputeGstPaid(b)
      return HttpResponse.json({ summary: clone(b.gstSummary), returns: clone(b.gstReturns) })
    }
    return globalGstLedger(request)
  }),

  http.get('*/api/v1/compliance/tds', ({ request }) => {
    const url = new URL(request.url)
    const periodParam = url.searchParams.get('period')
    if (periodParam !== null && periodParam !== '') {
      const raw = periodParam || '2026-04'
      const bundleKey = resolveBundlePeriod(raw)
      if (!bundleKey) {
        return HttpResponse.json({ summary: null, deductions: [], challans: [] })
      }
      const b = getBundle(bundleKey)
      if (!b) {
        return HttpResponse.json({ summary: null, deductions: [], challans: [] })
      }
      recomputeTdsSummary(b)
      return HttpResponse.json({
        summary: clone(b.tdsSummary),
        deductions: clone(b.deductions),
        challans: clone(b.challans),
      })
    }
    return globalTdsLedger(request)
  }),

  http.post('*/api/v1/compliance/returns/:id/file', async ({ params, request }) => {
    const id = params.id as string
    const body = (await request.json()) as { filedDate?: string; notes?: string }
    const filedDate = body.filedDate ?? new Date().toISOString().slice(0, 10)

    const b = findBundleForReturnId(id)
    if (!b) {
      return HttpResponse.json({ message: 'Return not found' }, { status: 404 })
    }

    const g = b.gstReturns.find((r) => r.id === id)
    if (g) {
      g.filedDate = filedDate
      g.status = 'filed'
    }
    const f = b.filingItems.find((r) => r.id === id)
    if (f) {
      f.filedDate = filedDate
      f.status = 'filed'
    }
    syncFilingFromGst(b)
    recomputeGstPaid(b)

    return HttpResponse.json({
      filingItems: clone(b.filingItems),
      gstReturns: clone(b.gstReturns),
      gstSummary: g ? clone(b.gstSummary) : undefined,
    })
  }),

  http.post('*/api/v1/compliance/challans', async ({ request }) => {
    const body = (await request.json()) as {
      period?: string
      bsrCode?: string
      section?: string
      depositDate?: string
      amount?: number
      notes?: string
    }
    if (!body.bsrCode || !body.section || !body.depositDate || body.amount == null) {
      return HttpResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    const raw = body.period || '2026-04'
    const bundleKey = resolveBundlePeriod(raw)
    if (!bundleKey) {
      return HttpResponse.json({ message: 'Invalid period' }, { status: 400 })
    }
    const b = getBundle(bundleKey)
    if (!b) return HttpResponse.json({ message: 'Invalid period' }, { status: 400 })

    const id = `c-${Date.now()}`
    b.challans.push({
      id,
      period: bundleKey === '2026-04' ? '2026-04' : '2026-03',
      bsrCode: body.bsrCode,
      depositDate: body.depositDate,
      amount: Number(body.amount),
      section: body.section,
      linkedDeductionIds: [],
    })
    recomputeTdsSummary(b)
    return HttpResponse.json({ challans: clone(b.challans), summary: clone(b.tdsSummary) })
  }),

  http.patch('*/api/v1/compliance/deductions/:id/map-challan', async ({ params, request }) => {
    const deductionId = params.id as string
    const body = (await request.json()) as { challanId?: string }
    const challanId = body.challanId
    if (!challanId) {
      return HttpResponse.json({ message: 'challanId required' }, { status: 400 })
    }
    const b = findBundleForDeductionId(deductionId)
    if (!b) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const ded = b.deductions.find((d) => d.id === deductionId)
    const ch = b.challans.find((c) => c.id === challanId)
    if (!ded || !ch) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    if (ded.section !== ch.section) {
      return HttpResponse.json({ message: 'Section must match challan section' }, { status: 400 })
    }
    const prev = ded.challanId
    if (prev) {
      const prevCh = b.challans.find((c) => c.id === prev)
      if (prevCh) {
        prevCh.linkedDeductionIds = prevCh.linkedDeductionIds.filter((x) => x !== deductionId)
      }
    }
    ded.challanId = challanId
    if (!ch.linkedDeductionIds.includes(deductionId)) {
      ch.linkedDeductionIds.push(deductionId)
    }
    recomputeTdsSummary(b)
    return HttpResponse.json({
      deductions: clone(b.deductions),
      challans: clone(b.challans),
      summary: clone(b.tdsSummary),
    })
  }),

  http.delete('*/api/v1/compliance/challans/:id', ({ params }) => {
    const id = params.id as string
    const b = findBundleForChallanId(id)
    if (!b) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const ch = b.challans.find((c) => c.id === id)
    if (!ch) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    if (ch.linkedDeductionIds.length > 0) {
      return HttpResponse.json({ message: 'Cannot delete challan with mapped deductions' }, { status: 400 })
    }
    b.challans = b.challans.filter((c) => c.id !== id)
    recomputeTdsSummary(b)
    return HttpResponse.json({ challans: clone(b.challans), summary: clone(b.tdsSummary) })
  }),
]

export function resetComplianceMockState(): void {
  resetDemoState()
}

function parseYmd(s: string): Date {
  return new Date(s.length <= 10 ? `${s}T00:00:00` : s)
}

function projectNameFor(id: string): string {
  return PROJECT_NAMES[id] ?? id
}

function clientForProject(projectId: string): { clientId: string; clientName: string } {
  const row = PROJECT_CLIENTS[projectId]
  if (row) return row
  return { clientId: '', clientName: '' }
}

function passesInvoiceFilters(inv: ClientInvoice, url: URL): boolean {
  const projectId = url.searchParams.get('projectId')
  if (projectId && inv.projectId !== projectId) return false
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')
  const quarter = url.searchParams.get('quarter')
  const d = parseYmd(inv.invoiceDate)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (year !== null && year !== '') {
    if (y !== Number(year)) return false
  }
  if (month !== null && month !== '') {
    if (m !== Number(month)) return false
  }
  if (quarter !== null && quarter !== '' && year !== null && year !== '') {
    const q = Number(quarter)
    const yNum = Number(year)
    const qStart = (q - 1) * 3 + 1
    if (d.getFullYear() !== yNum || m < qStart || m > qStart + 2) return false
  }
  return true
}

function passesPaymentFilters(p: (typeof payments)[number], url: URL): boolean {
  const projectId = url.searchParams.get('projectId')
  if (projectId && p.projectId !== projectId) return false
  const month = url.searchParams.get('month')
  const year = url.searchParams.get('year')
  const quarter = url.searchParams.get('quarter')
  const d = parseYmd(p.paymentDate)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (year !== null && year !== '') {
    if (y !== Number(year)) return false
  }
  if (month !== null && month !== '') {
    if (m !== Number(month)) return false
  }
  if (quarter !== null && quarter !== '' && year !== null && year !== '') {
    const q = Number(quarter)
    const yNum = Number(year)
    const qStart = (q - 1) * 3 + 1
    if (d.getFullYear() !== yNum || m < qStart || m > qStart + 2) return false
  }
  return true
}

function globalGstLedger(request: Request) {
  const url = new URL(request.url)
  const filtered = invoices.filter((i) => passesInvoiceFilters(i, url))

  const now = new Date()
  const cm = now.getMonth() + 1
  const cy = now.getFullYear()
  const thisMonthGst = filtered
    .filter((i) => {
      const d = parseYmd(i.invoiceDate)
      return d.getFullYear() === cy && d.getMonth() + 1 === cm
    })
    .reduce((s, i) => s + i.gstAmount, 0)

  const byProjectMap = new Map<
    string,
    { projectId: string; projectName: string; clientName: string; gstAmount: number }
  >()
  const byMonthMap = new Map<
    string,
    {
      month: number
      year: number
      gstAmount: number
      invoiceCount: number
      baseAmount: number
    }
  >()

  const totalGstSum = filtered.reduce((s, i) => s + i.gstAmount, 0)

  for (const inv of filtered) {
    const pid = inv.projectId
    const pn = inv.projectName ?? projectNameFor(pid)
    const cc = inv.clientId
      ? { clientName: inv.clientName ?? '' }
      : clientForProject(inv.projectId)
    const prevP = byProjectMap.get(pid) ?? {
      projectId: pid,
      projectName: pn,
      clientName: cc.clientName,
      gstAmount: 0,
    }
    prevP.gstAmount += inv.gstAmount
    if (!prevP.clientName && cc.clientName) prevP.clientName = cc.clientName
    byProjectMap.set(pid, prevP)

    const d = parseYmd(inv.invoiceDate)
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const prevM = byMonthMap.get(mk) ?? {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      gstAmount: 0,
      invoiceCount: 0,
      baseAmount: 0,
    }
    prevM.gstAmount += inv.gstAmount
    prevM.baseAmount += inv.baseAmount
    prevM.invoiceCount += 1
    byMonthMap.set(mk, prevM)
  }

  const byProject = [...byProjectMap.values()].map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    clientName: p.clientName,
    gstAmount: p.gstAmount,
    percentage: totalGstSum > 0 ? Math.round((p.gstAmount / totalGstSum) * 10000) / 100 : 0,
  }))

  const entries = filtered.map((inv) => {
    const li0 = inv.lineItems[0]
    const gstRate = li0?.gstRate ?? (inv.baseAmount > 0 ? (100 * inv.gstAmount) / inv.baseAmount : 0)
    const cc = inv.clientId
      ? { clientId: inv.clientId, clientName: inv.clientName ?? '' }
      : clientForProject(inv.projectId)
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      projectId: inv.projectId,
      projectName: inv.projectName ?? projectNameFor(inv.projectId),
      clientId: cc.clientId,
      clientName: inv.clientName ?? cc.clientName,
      baseAmount: inv.baseAmount,
      gstRate,
      gstAmount: inv.gstAmount,
      invoiceDate: inv.invoiceDate,
      status: inv.status,
    }
  })

  return HttpResponse.json({
    summary: {
      totalGst: totalGstSum,
      thisMonth: thisMonthGst,
      invoiceCount: filtered.filter((i) => i.gstAmount > 0).length,
      byProject,
      byMonth: [...byMonthMap.values()].sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month,
      ),
    },
    entries,
  })
}

function globalTdsLedger(request: Request) {
  const url = new URL(request.url)
  const typeFilter = url.searchParams.get('type') ?? 'all'

  const invFiltered = invoices.filter((i) => passesInvoiceFilters(i, url))
  const payFiltered = payments.filter((p) => passesPaymentFilters(p, url))

  const clientEntries =
    typeFilter === 'vendor'
      ? []
      : invFiltered.map((inv) => {
          const tdsRate =
            inv.grossAmount > 0 ? Math.round((100 * inv.tdsAmount) / inv.grossAmount) : DEFAULT_TDS_RATE
          const cc = inv.clientId
            ? { clientId: inv.clientId, clientName: inv.clientName ?? '' }
            : clientForProject(inv.projectId)
          return {
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            projectId: inv.projectId,
            projectName: inv.projectName ?? projectNameFor(inv.projectId),
            clientId: cc.clientId,
            clientName: inv.clientName ?? cc.clientName,
            grossAmount: inv.grossAmount,
            tdsRate,
            tdsAmount: inv.tdsAmount,
            invoiceDate: inv.invoiceDate,
            status: inv.status,
          }
        })

  const vendorEntries =
    typeFilter === 'client'
      ? []
      : payFiltered.map((p) => {
          const tdsRate =
            p.invoiceTotal > 0 ? Math.round((100 * p.tdsDeducted) / p.invoiceTotal) : DEFAULT_TDS_RATE
          return {
            paymentId: p.id,
            projectId: p.projectId,
            projectName: p.projectName ?? projectNameFor(p.projectId),
            vendorId: p.vendorId,
            vendorName: p.vendorName,
            invoiceTotal: p.invoiceTotal,
            tdsRate,
            tdsAmount: p.tdsDeducted,
            paymentDate: p.paymentDate,
            referenceNumber: p.referenceNumber,
          }
        })

  const clientTdsTotal = clientEntries.reduce((s, e) => s + e.tdsAmount, 0)
  const vendorTdsTotal = vendorEntries.reduce((s, e) => s + e.tdsAmount, 0)

  const byMonthMap = new Map<string, { month: number; year: number; clientTds: number; vendorTds: number }>()
  for (const inv of invFiltered) {
    if (typeFilter === 'vendor') continue
    const d = parseYmd(inv.invoiceDate)
    const mk = `${d.getFullYear()}-${d.getMonth() + 1}`
    const prev = byMonthMap.get(mk) ?? {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      clientTds: 0,
      vendorTds: 0,
    }
    prev.clientTds += inv.tdsAmount
    byMonthMap.set(mk, prev)
  }
  for (const p of payFiltered) {
    if (typeFilter === 'client') continue
    const d = parseYmd(p.paymentDate)
    const mk = `${d.getFullYear()}-${d.getMonth() + 1}`
    const prev = byMonthMap.get(mk) ?? {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      clientTds: 0,
      vendorTds: 0,
    }
    prev.vendorTds += p.tdsDeducted
    byMonthMap.set(mk, prev)
  }

  return HttpResponse.json({
    summary: {
      clientTdsTotal,
      vendorTdsTotal,
      total: clientTdsTotal + vendorTdsTotal,
      byMonth: [...byMonthMap.values()].sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month,
      ),
    },
    clientEntries,
    vendorEntries,
  })
}
