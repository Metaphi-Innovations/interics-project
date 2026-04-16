import { http, HttpResponse } from 'msw'
import type { VendorPOStatus } from '@/slices/payables/reducer'
import type { VendorInvoice, VendorPO, VendorPOLineItem, VendorInvoiceLineItem, VendorPayment } from '@/slices/payables/reducer'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function recalcPOLines(lines: VendorPOLineItem[]): number {
  for (const li of lines) {
    li.amount = round2(li.quantity * li.rate)
  }
  return round2(lines.reduce((s, l) => s + l.amount, 0))
}

function recalcVendorInvoice(inv: VendorInvoice): void {
  inv.totalAmount = round2(inv.lineItems.reduce((s, l) => s + l.amount, 0))
  const totalPaid = inv.payments.reduce((s, p) => s + p.amountPaid, 0)
  const tds = inv.payments.reduce((s, p) => s + p.tdsDeducted, 0)
  inv.totalPaid = round2(totalPaid)
  inv.tdsDeducted = round2(tds)
  const settled = inv.payments.reduce((s, p) => s + p.amountPaid + p.tdsDeducted, 0)
  inv.balance = round2(inv.totalAmount - settled)

  if (inv.status === 'draft') return

  const today = new Date().toISOString().slice(0, 10)
  if (inv.balance <= 0.01) {
    inv.status = 'paid'
    return
  }
  if (inv.dueDate < today) {
    inv.status = 'overdue'
    return
  }
  if (settled > 0.01) {
    inv.status = 'partially_paid'
  } else {
    inv.status = 'unpaid'
  }
}

function totalInvoicedOnVendorPO(
  list: VendorInvoice[],
  vendorPoId: string,
  excludeId?: string,
): number {
  return list
    .filter((i) => i.vendorPoId === vendorPoId && i.id !== excludeId)
    .reduce((s, i) => s + i.totalAmount, 0)
}

function assertVendorPoCap(
  list: VendorInvoice[],
  po: VendorPO,
  newTotal: number,
  excludeInvoiceId?: string,
): string | null {
  const used = totalInvoicedOnVendorPO(list, po.id, excludeInvoiceId)
  if (used + newTotal > po.totalValue + 0.01) {
    return `Invoice total exceeds PO value (₹${po.totalValue.toLocaleString('en-IN')} PO, ₹${used.toLocaleString('en-IN')} already invoiced on this PO)`
  }
  return null
}

let nextPo = 4
let nextInv = 9

function makePoLine(
  id: string,
  serviceName: string,
  description: string,
  qty: number,
  rate: number,
): VendorPOLineItem {
  return {
    id,
    serviceName,
    description,
    quantity: qty,
    rate,
    amount: round2(qty * rate),
  }
}

function makeInvLine(id: string, name: string, amount: number): VendorInvoiceLineItem {
  return { id, name, amount }
}

let purchaseOrders: VendorPO[] = [
  {
    id: 'vpo-001',
    poNo: 'VPO-2026-001',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    poDate: '2026-01-05',
    validUntil: '2026-06-30',
    paymentTerms: 'Net 30',
    notes: 'Civil package',
    status: 'issued',
    scopeBaselineServiceIds: ['ps-001'],
    lineItems: [
      makePoLine('vpol-1', 'Civil Works', 'Shell & core', 1, 1200000),
      makePoLine('vpol-2', 'MEP rough-in', 'Coordination', 1, 350000),
    ],
    totalValue: 0,
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-01-05T08:00:00Z',
  },
  {
    id: 'vpo-002',
    poNo: 'VPO-2026-002',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    vendorId: 'v-002',
    vendorName: 'Spectrum Interiors',
    poDate: '2026-02-10',
    validUntil: '2026-08-31',
    paymentTerms: 'Net 45',
    notes: undefined,
    status: 'issued',
    lineItems: [makePoLine('vpol-3', 'FF&E Supply', 'Loose furniture', 1, 890000)],
    totalValue: 0,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'vpo-003',
    poNo: 'VPO-2026-003',
    projectId: 'p-002',
    projectName: 'TechVentures - Office Expansion',
    vendorId: 'v-003',
    vendorName: 'LightCraft Solutions',
    poDate: '2026-03-01',
    validUntil: '2026-12-31',
    paymentTerms: 'Net 30',
    notes: 'Lighting BOQ',
    status: 'draft',
    lineItems: [makePoLine('vpol-4', 'Lighting fixtures', 'Supply & install', 1, 420000)],
    totalValue: 0,
    createdAt: '2026-03-01T12:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
  },
]

purchaseOrders.forEach((po) => {
  po.totalValue = recalcPOLines(po.lineItems)
})

let vendorInvoices: VendorInvoice[] = [
  {
    id: 'vinv-001',
    invoiceNo: 'VINV-2026-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    vendorPoId: 'vpo-001',
    poNo: 'VPO-2026-001',
    invoiceDate: '2026-02-01',
    dueDate: '2026-03-03',
    lineItems: [makeInvLine('vil-1', 'Civil milestone 1', 450000)],
    totalAmount: 0,
    totalPaid: 0,
    tdsDeducted: 0,
    balance: 0,
    status: 'paid',
    payments: [
      {
        id: 'vpay-1',
        date: '2026-02-25',
        amountPaid: 440000,
        tdsDeducted: 10000,
        paymentMode: 'bank_transfer',
        reference: 'NEFT-BW-225',
        recordedAt: '2026-02-25T11:00:00Z',
      },
    ],
    notes: undefined,
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-25T11:00:00Z',
  },
  {
    id: 'vinv-002',
    invoiceNo: 'VINV-2026-002',
    vendorId: 'v-002',
    vendorName: 'Spectrum Interiors',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    vendorPoId: 'vpo-002',
    poNo: 'VPO-2026-002',
    invoiceDate: '2026-03-15',
    dueDate: '2026-04-14',
    lineItems: [makeInvLine('vil-2', 'FF&E deposit invoice', 320000)],
    totalAmount: 0,
    totalPaid: 0,
    tdsDeducted: 0,
    balance: 0,
    status: 'partially_paid',
    payments: [
      {
        id: 'vpay-2',
        date: '2026-03-28',
        amountPaid: 150000,
        tdsDeducted: 5000,
        paymentMode: 'bank_transfer',
        recordedAt: '2026-03-28T14:00:00Z',
      },
    ],
    notes: undefined,
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-28T14:00:00Z',
  },
  {
    id: 'vinv-003',
    invoiceNo: 'VINV-2026-003',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    projectId: 'p-001',
    projectName: 'Acme Corp - Head Office Redesign',
    vendorPoId: 'vpo-001',
    poNo: 'VPO-2026-001',
    invoiceDate: '2026-03-20',
    dueDate: '2026-04-10',
    lineItems: [makeInvLine('vil-3', 'Civil milestone 2', 600000)],
    totalAmount: 0,
    totalPaid: 0,
    tdsDeducted: 0,
    balance: 0,
    status: 'overdue',
    payments: [],
    notes: undefined,
    createdAt: '2026-03-20T08:00:00Z',
    updatedAt: '2026-03-20T08:00:00Z',
  },
  {
    id: 'vinv-004',
    invoiceNo: 'VINV-2026-004',
    vendorId: 'v-003',
    vendorName: 'LightCraft Solutions',
    projectId: 'p-002',
    projectName: 'TechVentures - Office Expansion',
    invoiceDate: '2026-03-22',
    dueDate: '2026-04-21',
    lineItems: [makeInvLine('vil-4', 'Lighting — phase A', 185000)],
    totalAmount: 0,
    totalPaid: 0,
    tdsDeducted: 0,
    balance: 0,
    status: 'unpaid',
    payments: [],
    notes: undefined,
    createdAt: '2026-03-22T09:30:00Z',
    updatedAt: '2026-03-22T09:30:00Z',
  },
  {
    id: 'vinv-005',
    invoiceNo: 'VINV-2026-005',
    vendorId: 'v-002',
    vendorName: 'Spectrum Interiors',
    projectId: 'p-002',
    projectName: 'TechVentures - Office Expansion',
    invoiceDate: '2026-04-01',
    dueDate: '2026-05-01',
    lineItems: [makeInvLine('vil-5', 'Loose furniture supply', 275000)],
    totalAmount: 0,
    totalPaid: 0,
    tdsDeducted: 0,
    balance: 0,
    status: 'draft',
    payments: [],
    notes: 'Awaiting GRN',
    createdAt: '2026-04-01T11:00:00Z',
    updatedAt: '2026-04-01T11:00:00Z',
  },
  {
    id: 'vinv-006',
    invoiceNo: 'VINV-2026-006',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    projectId: 'p-004',
    projectName: 'Global Solutions - Store Renovation',
    invoiceDate: '2026-03-10',
    dueDate: '2026-04-09',
    lineItems: [makeInvLine('vil-6', 'Civil rectification', 95000)],
    totalAmount: 0,
    totalPaid: 0,
    tdsDeducted: 0,
    balance: 0,
    status: 'unpaid',
    payments: [],
    createdAt: '2026-03-10T15:00:00Z',
    updatedAt: '2026-03-10T15:00:00Z',
  },
]

vendorInvoices.forEach((inv) => recalcVendorInvoice(inv))

function parseListUrl(url: URL): Record<string, string> {
  const q: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    q[k] = v
  })
  return q
}

function filterPOs(list: VendorPO[], q: Record<string, string>): VendorPO[] {
  let out = [...list]
  if (q.vendorId) out = out.filter((p) => p.vendorId === q.vendorId)
  if (q.projectId) out = out.filter((p) => p.projectId === q.projectId)
  if (q.search) {
    const s = q.search.toLowerCase()
    out = out.filter(
      (p) =>
        p.poNo.toLowerCase().includes(s) ||
        p.vendorName.toLowerCase().includes(s) ||
        p.projectName.toLowerCase().includes(s),
    )
  }
  if (q.dateFrom) out = out.filter((p) => p.poDate >= q.dateFrom)
  if (q.dateTo) out = out.filter((p) => p.poDate <= q.dateTo)
  return out
}

function filterVendorInvoices(list: VendorInvoice[], q: Record<string, string>): VendorInvoice[] {
  let out = [...list]
  if (q.status) out = out.filter((i) => i.status === q.status)
  if (q.vendorId) out = out.filter((i) => i.vendorId === q.vendorId)
  if (q.projectId) out = out.filter((i) => i.projectId === q.projectId)
  if (q.search) {
    const s = q.search.toLowerCase()
    out = out.filter(
      (i) =>
        i.invoiceNo.toLowerCase().includes(s) ||
        i.vendorName.toLowerCase().includes(s) ||
        i.projectName.toLowerCase().includes(s) ||
        (i.poNo?.toLowerCase().includes(s) ?? false),
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

export const payablesHandlers = [
  http.get('/api/vendor-pos', ({ request }) => {
    const url = new URL(request.url)
    const q = parseListUrl(url)
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 200))
    const filtered = filterPOs(purchaseOrders, q)
    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/vendor-pos/:id', ({ params }) => {
    const po = purchaseOrders.find((p) => p.id === params.id)
    if (!po) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(po)
  }),

  http.post('/api/vendor-pos', async ({ request }) => {
    const body = (await request.json()) as Partial<VendorPO> & { issueNow?: boolean }
    const lineItems = (body.lineItems ?? []) as VendorPOLineItem[]
    if (lineItems.length === 0) {
      return HttpResponse.json({ message: 'At least one line item required' }, { status: 400 })
    }
    recalcPOLines(lineItems)
    const n = nextPo++
    const id = `vpo-${String(n).padStart(3, '0')}`
    const now = new Date().toISOString()
    const status: VendorPOStatus = body.issueNow ? 'issued' : 'draft'
    const po: VendorPO = {
      id,
      poNo: `VPO-2026-${String(n).padStart(3, '0')}`,
      projectId: body.projectId ?? '',
      projectName: body.projectName ?? '',
      vendorId: body.vendorId ?? '',
      vendorName: body.vendorName ?? '',
      poDate: body.poDate ?? now.slice(0, 10),
      validUntil: body.validUntil,
      paymentTerms: body.paymentTerms,
      notes: body.notes,
      status,
      lineItems: lineItems.map((li, idx) => ({ ...li, id: li.id || `vpol-${id}-${idx}` })),
      totalValue: 0,
      scopeBaselineServiceIds: body.scopeBaselineServiceIds,
      createdAt: now,
      updatedAt: now,
    }
    po.totalValue = recalcPOLines(po.lineItems)
    purchaseOrders = [po, ...purchaseOrders]
    return HttpResponse.json(po)
  }),

  http.put('/api/vendor-pos/:id', async ({ params, request }) => {
    const idx = purchaseOrders.findIndex((p) => p.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const prev = purchaseOrders[idx]
    if (prev.status !== 'draft') {
      return HttpResponse.json({ message: 'Only draft POs can be edited' }, { status: 400 })
    }
    const body = (await request.json()) as Partial<VendorPO>
    const now = new Date().toISOString()
    const lineItems = (body.lineItems ?? prev.lineItems) as VendorPOLineItem[]
    recalcPOLines(lineItems)
    const merged: VendorPO = {
      ...prev,
      projectId: body.projectId ?? prev.projectId,
      projectName: body.projectName ?? prev.projectName,
      vendorId: body.vendorId ?? prev.vendorId,
      vendorName: body.vendorName ?? prev.vendorName,
      poDate: body.poDate ?? prev.poDate,
      validUntil: body.validUntil !== undefined ? body.validUntil : prev.validUntil,
      paymentTerms: body.paymentTerms !== undefined ? body.paymentTerms : prev.paymentTerms,
      notes: body.notes !== undefined ? body.notes : prev.notes,
      lineItems: lineItems.map((li, i) => ({ ...li, id: li.id || `vpol-${prev.id}-${i}` })),
      scopeBaselineServiceIds:
        body.scopeBaselineServiceIds !== undefined
          ? body.scopeBaselineServiceIds
          : prev.scopeBaselineServiceIds,
      updatedAt: now,
    }
    merged.totalValue = recalcPOLines(merged.lineItems)
    purchaseOrders[idx] = merged
    return HttpResponse.json(merged)
  }),

  http.patch('/api/vendor-pos/:id/status', async ({ params, request }) => {
    const idx = purchaseOrders.findIndex((p) => p.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = (await request.json()) as { status: VendorPOStatus }
    const po = purchaseOrders[idx]
    if (body.status === 'issued' && po.status === 'draft') {
      po.status = 'issued'
      po.updatedAt = new Date().toISOString()
      return HttpResponse.json(po)
    }
    return HttpResponse.json({ message: 'Invalid transition' }, { status: 400 })
  }),

  http.get('/api/vendor-invoices', ({ request }) => {
    const url = new URL(request.url)
    const q = parseListUrl(url)
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 200))
    const filtered = filterVendorInvoices(vendorInvoices, q)
    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/vendor-invoices/:id', ({ params }) => {
    const inv = vendorInvoices.find((i) => i.id === params.id)
    if (!inv) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(inv)
  }),

  http.post('/api/vendor-invoices', async ({ request }) => {
    const body = (await request.json()) as Partial<VendorInvoice> & { receiveNow?: boolean }
    const lineItems = (body.lineItems ?? []) as VendorInvoiceLineItem[]
    if (lineItems.length === 0) {
      return HttpResponse.json({ message: 'At least one line item required' }, { status: 400 })
    }
    const n = nextInv++
    const id = `vinv-${String(n).padStart(3, '0')}`
    const now = new Date().toISOString()
    const draft = !body.receiveNow
    const inv: VendorInvoice = {
      id,
      invoiceNo: body.invoiceNo ?? `VINV-2026-${String(n).padStart(3, '0')}`,
      vendorId: body.vendorId ?? '',
      vendorName: body.vendorName ?? '',
      projectId: body.projectId ?? '',
      projectName: body.projectName ?? '',
      vendorPoId: body.vendorPoId,
      poNo: body.poNo,
      invoiceDate: body.invoiceDate ?? now.slice(0, 10),
      dueDate: body.dueDate ?? now.slice(0, 10),
      lineItems: lineItems.map((li, idx) => ({ ...li, id: li.id || `vil-${id}-${idx}` })),
      totalAmount: 0,
      totalPaid: 0,
      tdsDeducted: 0,
      balance: 0,
      status: draft ? 'draft' : 'unpaid',
      payments: [],
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    }
    recalcVendorInvoice(inv)
    if (inv.vendorPoId) {
      const po = purchaseOrders.find((p) => p.id === inv.vendorPoId)
      if (!po) return HttpResponse.json({ message: 'Linked PO not found' }, { status: 400 })
      const capErr = assertVendorPoCap(vendorInvoices, po, inv.totalAmount)
      if (capErr) return HttpResponse.json({ message: capErr }, { status: 422 })
    }
    vendorInvoices = [inv, ...vendorInvoices]
    return HttpResponse.json(inv)
  }),

  http.put('/api/vendor-invoices/:id', async ({ params, request }) => {
    const idx = vendorInvoices.findIndex((i) => i.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const prev = vendorInvoices[idx]
    const body = (await request.json()) as Partial<VendorInvoice> & { receiveNow?: boolean }
    if (prev.status !== 'draft' && body.lineItems) {
      return HttpResponse.json({ message: 'Only draft invoices can be edited' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const lineItems = (body.lineItems ?? prev.lineItems) as VendorInvoiceLineItem[]
    const merged: VendorInvoice = {
      ...prev,
      vendorId: body.vendorId ?? prev.vendorId,
      vendorName: body.vendorName ?? prev.vendorName,
      projectId: body.projectId ?? prev.projectId,
      projectName: body.projectName ?? prev.projectName,
      vendorPoId: body.vendorPoId !== undefined ? body.vendorPoId : prev.vendorPoId,
      poNo: body.poNo !== undefined ? body.poNo : prev.poNo,
      invoiceDate: body.invoiceDate ?? prev.invoiceDate,
      dueDate: body.dueDate ?? prev.dueDate,
      notes: body.notes !== undefined ? body.notes : prev.notes,
      lineItems: lineItems.map((li, i) => ({ ...li, id: li.id || `vil-${prev.id}-${i}` })),
      updatedAt: now,
    }
    if (body.receiveNow && merged.status === 'draft') {
      merged.status = 'unpaid'
    }
    recalcVendorInvoice(merged)
    if (merged.vendorPoId) {
      const po = purchaseOrders.find((p) => p.id === merged.vendorPoId)
      if (!po) return HttpResponse.json({ message: 'Linked PO not found' }, { status: 400 })
      const capErr = assertVendorPoCap(vendorInvoices, po, merged.totalAmount, merged.id)
      if (capErr) return HttpResponse.json({ message: capErr }, { status: 422 })
    }
    vendorInvoices[idx] = merged
    return HttpResponse.json(merged)
  }),

  http.post('/api/vendor-invoices/:id/payments', async ({ params, request }) => {
    const idx = vendorInvoices.findIndex((i) => i.id === params.id)
    if (idx < 0) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = (await request.json()) as {
      date: string
      amountPaid: number
      tdsDeducted: number
      paymentMode: VendorPayment['paymentMode']
      reference?: string
    }
    const inv = vendorInvoices[idx]
    if (inv.status === 'draft') {
      return HttpResponse.json({ message: 'Cannot record payment on draft' }, { status: 400 })
    }
    const pay: VendorPayment = {
      id: `vpay-${Date.now()}`,
      date: body.date,
      amountPaid: body.amountPaid,
      tdsDeducted: body.tdsDeducted ?? 0,
      paymentMode: body.paymentMode,
      reference: body.reference,
      recordedAt: new Date().toISOString(),
    }
    inv.payments.push(pay)
    recalcVendorInvoice(inv)
    inv.updatedAt = new Date().toISOString()
    return HttpResponse.json(inv)
  }),
]
