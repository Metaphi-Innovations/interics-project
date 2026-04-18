import { http, HttpResponse } from 'msw'
import { getClientPoValue } from '../data/clientPOValidation'

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'unpaid'
  | 'partially_paid'
  | 'overdue'
  | 'paid'

export type LineSource = 'milestone' | 'service' | 'manual'

export interface LineItem {
  id: string
  serviceId: string
  serviceName: string
  sacCode: string
  amount: number
  gstRate: number
  gstAmount: number
  milestoneId?: string
  baselineServiceId?: string
  lineSource?: LineSource
}

export interface Payment {
  id: string
  date: string
  amountReceived: number
  tdsDeducted: number
  netReceived: number
  paymentMode: 'bank_transfer' | 'cheque' | 'upi' | 'other'
  reference?: string
  recordedAt: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  clientId: string
  clientName: string
  projectId: string
  projectName: string
  invoiceDate: string
  dueDate: string
  lineItems: LineItem[]
  baseAmount: number
  gstAmount: number
  totalAmount: number
  tdsDeducted: number
  totalReceived: number
  balance: number
  status: InvoiceStatus
  payments: Payment[]
  notes?: string
  clientPoId?: string
  createdAt: string
  updatedAt: string
}

function lineGst(amount: number, gstRate: number): number {
  return Math.round(amount * (gstRate / 100) * 100) / 100
}

function summarize(lines: LineItem[]): { base: number; gst: number; total: number } {
  const base = lines.reduce((s, l) => s + l.amount, 0)
  const gst = lines.reduce((s, l) => s + l.gstAmount, 0)
  return { base, gst, total: base + gst }
}

function recalcFinancials(inv: Invoice): void {
  const { base, gst, total } = summarize(inv.lineItems)
  inv.baseAmount = base
  inv.gstAmount = gst
  inv.totalAmount = total
  const received = inv.payments.reduce((s, p) => s + p.amountReceived, 0)
  const tds = inv.payments.reduce((s, p) => s + p.tdsDeducted, 0)
  inv.totalReceived = received
  inv.tdsDeducted = tds
  inv.balance = Math.round((inv.totalAmount - received) * 100) / 100
}

let nextNum = 13

function makeLine(
  id: string,
  serviceId: string,
  serviceName: string,
  sac: string,
  amount: number,
  gstRate: number,
  extra?: Partial<Pick<LineItem, 'milestoneId' | 'baselineServiceId' | 'lineSource'>>,
): LineItem {
  const gstAmount = lineGst(amount, gstRate)
  return {
    id,
    serviceId,
    serviceName,
    sacCode: sac,
    amount,
    gstRate,
    gstAmount,
    ...extra,
  }
}

function totalInvoicedOnPo(
  list: Invoice[],
  projectId: string,
  clientPoId: string,
  excludeInvoiceId?: string,
): number {
  return list
    .filter(
      (i) =>
        i.projectId === projectId &&
        i.clientPoId === clientPoId &&
        i.id !== excludeInvoiceId,
    )
    .reduce((s, i) => s + i.totalAmount, 0)
}

function assertPoCap(
  list: Invoice[],
  projectId: string,
  clientPoId: string,
  newTotal: number,
  excludeInvoiceId?: string,
): string | null {
  const cap = getClientPoValue(projectId, clientPoId)
  if (cap === undefined) return null
  const used = totalInvoicedOnPo(list, projectId, clientPoId, excludeInvoiceId)
  if (used + newTotal > cap + 0.01) {
    return `Invoice total exceeds PO limit (₹${cap.toLocaleString('en-IN')} cap, ₹${used.toLocaleString('en-IN')} already invoiced on this PO)`
  }
  return null
}

let invoices: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNo: 'INV-2026-001',
    clientId: 'c-004',
    clientName: 'Acme Corp',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    invoiceDate: '2025-11-12',
    dueDate: '2025-12-12',
    lineItems: [
      makeLine('li-1', 'svc-101', 'Mobilization — Interior Design', '998391', 300000, 18, {
        milestoneId: 'cm-001',
        baselineServiceId: 'ps-001',
        lineSource: 'milestone',
      }),
      makeLine('li-2', 'svc-203', 'Site Supervision', '998391', 150000, 18, { lineSource: 'manual' }),
    ],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    clientPoId: 'po-001',
    status: 'paid',
    payments: [
      {
        id: 'pay-1',
        date: '2025-11-28',
        amountReceived: 531000,
        tdsDeducted: 2000,
        netReceived: 531000,
        paymentMode: 'bank_transfer',
        reference: 'NEFT-88291',
        recordedAt: '2025-11-28T10:00:00Z',
      },
    ],
    createdAt: '2025-11-12T09:00:00Z',
    updatedAt: '2025-11-28T10:00:00Z',
  },
  {
    id: 'inv-002',
    invoiceNo: 'INV-2026-002',
    clientId: 'c-005',
    clientName: 'TechVentures Ltd',
    projectId: 'p-002',
    projectName: 'TechVentures - Office Expansion',
    invoiceDate: '2025-12-08',
    dueDate: '2026-01-07',
    lineItems: [makeLine('li-3', 'svc-102', 'Design Development', '998391', 300000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'paid',
    payments: [
      {
        id: 'pay-2',
        date: '2025-12-20',
        amountReceived: 354000,
        tdsDeducted: 0,
        netReceived: 354000,
        paymentMode: 'upi',
        recordedAt: '2025-12-20T14:00:00Z',
      },
    ],
    createdAt: '2025-12-08T11:00:00Z',
    updatedAt: '2025-12-20T14:00:00Z',
  },
  {
    id: 'inv-003',
    invoiceNo: 'INV-2026-003',
    clientId: 'c-006',
    clientName: 'Global Solutions LLP',
    projectId: 'p-004',
    projectName: 'Global Solutions - Store Renovation',
    invoiceDate: '2026-01-14',
    dueDate: '2026-02-13',
    lineItems: [makeLine('li-4', 'svc-102', 'Working Drawings', '998392', 120000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 500,
    totalReceived: 0,
    balance: 0,
    status: 'overdue',
    payments: [
      {
        id: 'pay-3',
        date: '2026-02-01',
        amountReceived: 50000,
        tdsDeducted: 500,
        netReceived: 50000,
        paymentMode: 'cheque',
        reference: 'CHQ-4412',
        recordedAt: '2026-02-01T09:00:00Z',
      },
    ],
    createdAt: '2026-01-14T08:00:00Z',
    updatedAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'inv-004',
    invoiceNo: 'INV-2026-004',
    clientId: 'c-002',
    clientName: 'Mr. Arun Sharma',
    projectId: 'p-006',
    projectName: 'Skyline Penthouse',
    invoiceDate: '2026-02-03',
    dueDate: '2026-03-05',
    lineItems: [makeLine('li-5', 'svc-201', 'Civil Works', '995462', 80000, 12)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'overdue',
    payments: [],
    createdAt: '2026-02-03T10:00:00Z',
    updatedAt: '2026-02-03T10:00:00Z',
  },
  {
    id: 'inv-005',
    invoiceNo: 'INV-2026-005',
    clientId: 'c-004',
    clientName: 'Acme Corp',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    invoiceDate: '2026-03-06',
    dueDate: '2026-04-05',
    lineItems: [
      makeLine('li-6', 'svc-101', 'Design Draft — Interior Design', '998391', 600000, 18, {
        milestoneId: 'cm-002',
        baselineServiceId: 'ps-001',
        lineSource: 'milestone',
      }),
    ],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 1800,
    totalReceived: 0,
    balance: 0,
    clientPoId: 'po-001',
    status: 'partially_paid',
    payments: [
      {
        id: 'pay-4',
        date: '2026-03-18',
        amountReceived: 59000,
        tdsDeducted: 1800,
        netReceived: 59000,
        paymentMode: 'bank_transfer',
        recordedAt: '2026-03-18T16:00:00Z',
      },
    ],
    createdAt: '2026-03-06T12:00:00Z',
    updatedAt: '2026-03-18T16:00:00Z',
  },
  {
    id: 'inv-006',
    invoiceNo: 'INV-2026-006',
    clientId: 'c-003',
    clientName: 'Green Villa Estates',
    projectId: 'p-007',
    projectName: 'Green Villa - Lobby Design',
    invoiceDate: '2026-03-22',
    dueDate: '2026-04-21',
    lineItems: [makeLine('li-7', 'svc-102', 'Design Development', '998391', 250000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'unpaid',
    payments: [],
    createdAt: '2026-03-22T09:00:00Z',
    updatedAt: '2026-03-22T09:00:00Z',
  },
  {
    id: 'inv-007',
    invoiceNo: 'INV-2026-007',
    clientId: 'c-001',
    clientName: 'TechHub Systems Pvt Ltd',
    projectId: 'p-008',
    projectName: 'TechHub - Floor 3 Renovation',
    invoiceDate: '2026-03-25',
    dueDate: '2026-04-24',
    lineItems: [makeLine('li-8', 'svc-203', 'Site Supervision', '998391', 180000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'unpaid',
    payments: [],
    createdAt: '2026-03-25T10:00:00Z',
    updatedAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'inv-008',
    invoiceNo: 'INV-2026-008',
    clientId: 'c-005',
    clientName: 'TechVentures Ltd',
    projectId: 'p-002',
    projectName: 'TechVentures - Office Expansion',
    invoiceDate: '2026-04-02',
    dueDate: '2026-05-02',
    lineItems: [makeLine('li-9', 'svc-102', 'Working Drawings', '998392', 90000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'sent',
    payments: [],
    createdAt: '2026-04-02T14:00:00Z',
    updatedAt: '2026-04-02T14:05:00Z',
  },
  {
    id: 'inv-009',
    invoiceNo: 'INV-2026-009',
    clientId: 'c-004',
    clientName: 'Acme Corp',
    projectId: 'p-003',
    projectName: 'Acme Corp - Retail Fit-out',
    invoiceDate: '2026-04-04',
    dueDate: '2026-05-04',
    lineItems: [makeLine('li-10', 'svc-101', 'Concept Design', '998391', 50000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'draft',
    payments: [],
    createdAt: '2026-04-04T11:00:00Z',
    updatedAt: '2026-04-04T11:00:00Z',
  },
  {
    id: 'inv-010',
    invoiceNo: 'INV-2026-010',
    clientId: 'c-002',
    clientName: 'Mr. Arun Sharma',
    projectId: 'p-006',
    projectName: 'Skyline Penthouse',
    invoiceDate: '2026-04-06',
    dueDate: '2026-05-06',
    lineItems: [makeLine('li-11', 'svc-102', 'Design Development', '998391', 35000, 18)],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'draft',
    payments: [],
    createdAt: '2026-04-06T09:30:00Z',
    updatedAt: '2026-04-06T09:30:00Z',
  },
  {
    id: 'inv-011',
    invoiceNo: 'INV-2026-011',
    clientId: 'c-006',
    clientName: 'Global Solutions LLP',
    projectId: 'p-004',
    projectName: 'Global Solutions - Store Renovation',
    invoiceDate: '2025-12-18',
    dueDate: '2026-01-17',
    lineItems: [
      makeLine('li-12', 'svc-101', 'Concept package — Retail', '998391', 200000, 18),
    ],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    status: 'paid',
    payments: [
      {
        id: 'pay-5',
        date: '2026-01-05',
        amountReceived: 236000,
        tdsDeducted: 0,
        netReceived: 236000,
        paymentMode: 'bank_transfer',
        reference: 'NEFT-GS-0105',
        recordedAt: '2026-01-05T11:00:00Z',
      },
    ],
    createdAt: '2025-12-18T10:00:00Z',
    updatedAt: '2026-01-05T11:00:00Z',
  },
  {
    id: 'inv-012',
    invoiceNo: 'INV-2026-012',
    clientId: 'c-004',
    clientName: 'Acme Corp',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    invoiceDate: '2026-02-20',
    dueDate: '2026-03-22',
    lineItems: [
      makeLine('li-13', 'svc-203', 'FF&E coordination', '998391', 240000, 18, { lineSource: 'manual' }),
    ],
    baseAmount: 0,
    gstAmount: 0,
    totalAmount: 0,
    tdsDeducted: 0,
    totalReceived: 0,
    balance: 0,
    clientPoId: 'po-002',
    status: 'sent',
    payments: [],
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z',
  },
]

invoices.forEach((inv) => {
  inv.lineItems.forEach((li) => {
    li.gstAmount = lineGst(li.amount, li.gstRate)
  })
  recalcFinancials(inv)
})

function parseListUrl(url: URL): Record<string, string> {
  const q: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    q[k] = v
  })
  return q
}

function filterInvoices(list: Invoice[], q: Record<string, string>): Invoice[] {
  let out = [...list]
  if (q.status) out = out.filter((i) => i.status === q.status)
  if (q.clientId) out = out.filter((i) => i.clientId === q.clientId)
  if (q.projectId) out = out.filter((i) => i.projectId === q.projectId)
  if (q.search) {
    const s = q.search.toLowerCase()
    out = out.filter(
      (i) =>
        i.invoiceNo.toLowerCase().includes(s) ||
        i.clientName.toLowerCase().includes(s) ||
        i.projectName.toLowerCase().includes(s),
    )
  }
  if (q.dateFrom) out = out.filter((i) => i.invoiceDate >= q.dateFrom)
  if (q.dateTo) out = out.filter((i) => i.invoiceDate <= q.dateTo)
  if (q.amountMin) {
    const m = Number(q.amountMin)
    if (!Number.isNaN(m)) out = out.filter((i) => i.totalAmount >= m)
  }
  if (q.amountMax) {
    const m = Number(q.amountMax)
    if (!Number.isNaN(m)) out = out.filter((i) => i.totalAmount <= m)
  }
  return out
}

export const receivablesHandlers = [
  http.get('/api/invoices', ({ request }) => {
    const url = new URL(request.url)
    const q = parseListUrl(url)
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(500, Math.max(1, Number(q.pageSize) || 100))
    const filtered = filterInvoices(invoices, q)
    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/invoices/:id', ({ params }) => {
    const inv = invoices.find((i) => i.id === params.id)
    if (!inv) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(inv)
  }),

  http.post('/api/invoices', async ({ request }) => {
    const body = (await request.json()) as Partial<Invoice> & { sendNow?: boolean; invoiceNo?: string }
    const lineItems = (body.lineItems ?? []) as LineItem[]
    if (lineItems.length === 0) {
      return HttpResponse.json({ message: 'At least one line item required' }, { status: 400 })
    }
    for (const li of lineItems) {
      if (li.milestoneId) {
        const key = li.baselineServiceId ?? li.serviceId
        const dup = invoices.some(
          (inv) =>
            inv.projectId === body.projectId &&
            inv.lineItems.some(
              (x) =>
                x.milestoneId === li.milestoneId &&
                (x.baselineServiceId ?? x.serviceId) === key,
            ),
        )
        if (dup) {
          return HttpResponse.json(
            { message: 'An invoice already exists for this milestone' },
            { status: 409 },
          )
        }
      }
    }
    lineItems.forEach((li) => {
      li.gstAmount = lineGst(li.amount, li.gstRate)
    })
    const n = nextNum++
    const id = `inv-${String(n).padStart(3, '0')}`
    const invoiceNo =
      typeof body.invoiceNo === 'string' && body.invoiceNo.trim() !== ''
        ? body.invoiceNo.trim()
        : `INV-2024-${String(n).padStart(3, '0')}`
    const now = new Date().toISOString()
    const inv: Invoice = {
      id,
      invoiceNo,
      clientId: body.clientId ?? '',
      clientName: body.clientName ?? '',
      projectId: body.projectId ?? '',
      projectName: body.projectName ?? '',
      invoiceDate: body.invoiceDate ?? now.slice(0, 10),
      dueDate: body.dueDate ?? now.slice(0, 10),
      lineItems: lineItems.map((li, idx) => ({
        ...li,
        id: li.id || `li-${id}-${idx}`,
      })),
      baseAmount: 0,
      gstAmount: 0,
      totalAmount: 0,
      tdsDeducted: 0,
      totalReceived: 0,
      balance: 0,
      status: body.sendNow ? 'sent' : 'draft',
      payments: [],
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    }
    recalcFinancials(inv)
    inv.balance = inv.totalAmount - inv.totalReceived
    inv.status = body.sendNow ? 'sent' : 'draft'
    inv.clientPoId = body.clientPoId as string | undefined
    const poErr = inv.clientPoId
      ? assertPoCap(invoices, inv.projectId, inv.clientPoId, inv.totalAmount)
      : null
    if (poErr) return HttpResponse.json({ message: poErr }, { status: 400 })
    invoices.push(inv)
    return HttpResponse.json(inv)
  }),

  http.put('/api/invoices/:id', async ({ params, request }) => {
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = (await request.json()) as Partial<Invoice> & { sendNow?: boolean }
    const prev = invoices[idx]
    if (prev.status !== 'draft' && body.lineItems) {
      return HttpResponse.json({ message: 'Only draft invoices can be edited' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const lineItems = body.lineItems ?? prev.lineItems
    lineItems.forEach((li) => {
      li.gstAmount = lineGst(li.amount, li.gstRate)
    })
    const merged: Invoice = {
      ...prev,
      clientId: body.clientId ?? prev.clientId,
      clientName: body.clientName ?? prev.clientName,
      projectId: body.projectId ?? prev.projectId,
      projectName: body.projectName ?? prev.projectName,
      invoiceDate: body.invoiceDate ?? prev.invoiceDate,
      dueDate: body.dueDate ?? prev.dueDate,
      notes: body.notes !== undefined ? body.notes : prev.notes,
      lineItems,
      id: prev.id,
      invoiceNo: prev.invoiceNo,
      payments: prev.payments,
      clientPoId:
        body.clientPoId !== undefined ? (body.clientPoId as string | undefined) : prev.clientPoId,
      status: body.sendNow ? 'sent' : prev.status,
      updatedAt: now,
    }
    recalcFinancials(merged)
    const poErr = merged.clientPoId
      ? assertPoCap(invoices, merged.projectId, merged.clientPoId, merged.totalAmount, merged.id)
      : null
    if (poErr) return HttpResponse.json({ message: poErr }, { status: 400 })
    invoices[idx] = merged
    return HttpResponse.json(merged)
  }),

  http.post('/api/invoices/:id/payments', async ({ params, request }) => {
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = (await request.json()) as {
      date: string
      amountReceived: number
      tdsDeducted: number
      paymentMode: Payment['paymentMode']
      reference?: string
    }
    const inv = invoices[idx]
    if (inv.status === 'draft') {
      return HttpResponse.json({ message: 'Cannot record payment on draft' }, { status: 400 })
    }
    const pay: Payment = {
      id: `pay-${Date.now()}`,
      date: body.date,
      amountReceived: body.amountReceived,
      tdsDeducted: body.tdsDeducted ?? 0,
      netReceived: body.amountReceived,
      paymentMode: body.paymentMode,
      reference: body.reference,
      recordedAt: new Date().toISOString(),
    }
    inv.payments.push(pay)
    recalcFinancials(inv)
    if (inv.balance <= 0) inv.status = 'paid'
    else if (inv.totalReceived > 0) inv.status = 'partially_paid'
    inv.updatedAt = new Date().toISOString()
    return HttpResponse.json(inv)
  }),

  http.patch('/api/invoices/:id/status', async ({ params, request }) => {
    const idx = invoices.findIndex((i) => i.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = (await request.json()) as { status: InvoiceStatus }
    const inv = invoices[idx]
    if (body.status === 'sent' && inv.status === 'draft') {
      inv.status = 'sent'
      inv.updatedAt = new Date().toISOString()
      return HttpResponse.json(inv)
    }
    return HttpResponse.json({ message: 'Invalid transition' }, { status: 400 })
  }),
]
