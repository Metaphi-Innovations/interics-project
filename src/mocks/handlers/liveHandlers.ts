import { http, HttpResponse } from 'msw'
import type { Invoice, VendorInvoice, Expense, ChangeRequest } from '../../slices/live/reducer'

// ─── Seed data ────────────────────────────────────────────────────────────────

let invoices: Invoice[] = [
  {
    id: 'inv-001',
    projectId: 'p-001',
    invoiceNumber: 'INV-24-001',
    invoiceDate: '2024-02-05',
    dueDate: '2024-03-05',
    milestoneId: 'cm-001',
    milestoneName: 'Mobilization',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    amount: 300000,
    gstRate: 18,
    gstAmount: 54000,
    tdsRate: 10,
    tdsAmount: 30000,
    grossAmount: 354000,
    netReceivable: 324000,
    status: 'Paid',
    paidAmount: 324000,
    paidDate: '2024-02-20',
    receiptReference: 'NEFT-20240220-001',
  },
  {
    id: 'inv-002',
    projectId: 'p-001',
    invoiceNumber: 'INV-24-002',
    invoiceDate: '2024-03-20',
    dueDate: '2024-04-20',
    milestoneId: 'cm-002',
    milestoneName: 'Design Draft',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    amount: 600000,
    gstRate: 18,
    gstAmount: 108000,
    tdsRate: 10,
    tdsAmount: 60000,
    grossAmount: 708000,
    netReceivable: 648000,
    status: 'Sent',
    paidAmount: 0,
    paidDate: null,
    receiptReference: null,
  },
  {
    id: 'inv-003',
    projectId: 'p-001',
    invoiceNumber: 'INV-24-003',
    invoiceDate: '2024-02-20',
    dueDate: '2024-03-20',
    milestoneId: 'cm-004',
    milestoneName: 'Mobilization',
    serviceId: 'ps-002',
    serviceName: 'Civil Works',
    amount: 500000,
    gstRate: 18,
    gstAmount: 90000,
    tdsRate: 10,
    tdsAmount: 50000,
    grossAmount: 590000,
    netReceivable: 540000,
    status: 'Overdue',
    paidAmount: 0,
    paidDate: null,
    receiptReference: null,
  },
]

let vendorInvoices: VendorInvoice[] = [
  {
    id: 'vi-001',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    invoiceNumber: 'BWC-INV-001',
    invoiceDate: '2024-02-10',
    milestoneId: 'vml-001',
    milestoneName: 'Advance',
    amount: 270000,
    tdsRate: 2,
    tdsAmount: 5400,
    netPayable: 264600,
    status: 'Paid',
    paidAmount: 264600,
    paidDate: '2024-02-15',
    paymentReference: 'NEFT-20240215-001',
  },
  {
    id: 'vi-002',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    invoiceNumber: 'BWC-INV-002',
    invoiceDate: '2024-04-01',
    milestoneId: 'vml-002',
    milestoneName: 'Midpoint',
    amount: 630000,
    tdsRate: 2,
    tdsAmount: 12600,
    netPayable: 617400,
    status: 'Pending',
    paidAmount: 0,
    paidDate: null,
    paymentReference: null,
  },
]

let expenses: Expense[] = [
  {
    id: 'exp-001',
    projectId: 'p-001',
    date: '2024-02-08',
    description: 'Site visit - Delhi',
    category: 'Travel',
    amount: 15000,
    vendorId: null,
    vendorName: null,
    billable: true,
    status: 'Approved',
    receiptUrl: null,
    notes: 'Flight + hotel for site survey',
    submittedBy: 'Rahul Sharma',
    approvedBy: 'Admin User',
  },
  {
    id: 'exp-002',
    projectId: 'p-001',
    date: '2024-03-15',
    description: 'Material samples',
    category: 'Materials',
    amount: 8500,
    vendorId: 'v-004',
    vendorName: 'FloorMaster Pvt Ltd',
    billable: false,
    status: 'Pending',
    receiptUrl: null,
    notes: null,
    submittedBy: 'Rahul Sharma',
    approvedBy: null,
  },
]

let changeRequests: ChangeRequest[] = [
  {
    id: 'cr-001',
    projectId: 'p-001',
    crNumber: 'CR-24-001',
    title: 'Additional Meeting Room',
    description: 'Client requesting additional meeting room on floor 3',
    requestedBy: 'Rahul Sharma',
    requestedDate: '2024-03-10',
    type: 'Scope Addition',
    status: 'Approved',
    financialImpact: 250000,
    approvedBy: 'Admin User',
    approvedDate: '2024-03-15',
    notes: 'Approved with revised timeline',
  },
  {
    id: 'cr-002',
    projectId: 'p-001',
    crNumber: 'CR-24-002',
    title: 'Timeline Extension - 2 weeks',
    description: 'Civil work delayed due to material delivery',
    requestedBy: 'Rahul Sharma',
    requestedDate: '2024-04-01',
    type: 'Timeline Extension',
    status: 'Pending Approval',
    financialImpact: 0,
    approvedBy: null,
    approvedDate: null,
    notes: null,
  },
]

let invCounter = 4
let viCounter = 3
let expCounter = 3
let crCounter = 3

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const liveHandlers = [
  // GET /api/projects/:id/invoices
  http.get('/api/projects/:id/invoices', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(invoices.filter((i) => i.projectId === id))
  }),

  // POST /api/projects/:id/invoices
  http.post('/api/projects/:id/invoices', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<Invoice, 'id' | 'projectId'>
    const newInvoice: Invoice = {
      id: `inv-${String(invCounter++).padStart(3, '0')}`,
      projectId: id,
      ...body,
    }
    invoices.push(newInvoice)
    return HttpResponse.json(newInvoice, { status: 201 })
  }),

  // PUT /api/projects/:id/invoices/:invId
  http.put('/api/projects/:id/invoices/:invId', async ({ params, request }) => {
    const invId = params.invId as string
    const idx = invoices.findIndex((i) => i.id === invId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<Invoice>
    invoices[idx] = { ...invoices[idx], ...body }
    return HttpResponse.json(invoices[idx])
  }),

  // PATCH /api/projects/:id/invoices/:invId/status
  http.patch('/api/projects/:id/invoices/:invId/status', async ({ params, request }) => {
    const invId = params.invId as string
    const idx = invoices.findIndex((i) => i.id === invId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<Invoice>
    invoices[idx] = { ...invoices[idx], ...body }
    return HttpResponse.json(invoices[idx])
  }),

  // GET /api/projects/:id/vendor-invoices
  http.get('/api/projects/:id/vendor-invoices', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(vendorInvoices.filter((v) => v.projectId === id))
  }),

  // POST /api/projects/:id/vendor-invoices
  http.post('/api/projects/:id/vendor-invoices', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<VendorInvoice, 'id' | 'projectId'>
    const newVI: VendorInvoice = {
      id: `vi-${String(viCounter++).padStart(3, '0')}`,
      projectId: id,
      ...body,
    }
    vendorInvoices.push(newVI)
    return HttpResponse.json(newVI, { status: 201 })
  }),

  // PATCH /api/projects/:id/vendor-invoices/:viId/pay
  http.patch('/api/projects/:id/vendor-invoices/:viId/pay', async ({ params, request }) => {
    const viId = params.viId as string
    const idx = vendorInvoices.findIndex((v) => v.id === viId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<VendorInvoice>
    vendorInvoices[idx] = { ...vendorInvoices[idx], ...body, status: 'Paid' }
    return HttpResponse.json(vendorInvoices[idx])
  }),

  // GET /api/projects/:id/expenses
  http.get('/api/projects/:id/expenses', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(expenses.filter((e) => e.projectId === id))
  }),

  // POST /api/projects/:id/expenses
  http.post('/api/projects/:id/expenses', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<Expense, 'id' | 'projectId'>
    const newExp: Expense = {
      id: `exp-${String(expCounter++).padStart(3, '0')}`,
      projectId: id,
      ...body,
    }
    expenses.push(newExp)
    return HttpResponse.json(newExp, { status: 201 })
  }),

  // PATCH /api/projects/:id/expenses/:expId/approve
  http.patch('/api/projects/:id/expenses/:expId/approve', async ({ params, request }) => {
    const expId = params.expId as string
    const idx = expenses.findIndex((e) => e.id === expId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as { status: 'Approved' | 'Rejected' }
    expenses[idx] = {
      ...expenses[idx],
      status: body.status,
      approvedBy: body.status === 'Approved' ? 'Admin User' : null,
    }
    return HttpResponse.json(expenses[idx])
  }),

  // GET /api/projects/:id/change-requests
  http.get('/api/projects/:id/change-requests', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(changeRequests.filter((c) => c.projectId === id))
  }),

  // POST /api/projects/:id/change-requests
  http.post('/api/projects/:id/change-requests', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<ChangeRequest, 'id' | 'projectId'>
    const num = String(crCounter++).padStart(3, '0')
    const newCR: ChangeRequest = {
      id: `cr-${num}`,
      projectId: id,
      crNumber: `CR-24-${num}`,
      ...body,
    }
    changeRequests.push(newCR)
    return HttpResponse.json(newCR, { status: 201 })
  }),

  // PATCH /api/projects/:id/change-requests/:crId/approve
  http.patch('/api/projects/:id/change-requests/:crId/approve', async ({ params, request }) => {
    const crId = params.crId as string
    const idx = changeRequests.findIndex((c) => c.id === crId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as { status: 'Approved' | 'Rejected'; notes?: string }
    const now = new Date().toISOString().split('T')[0]
    changeRequests[idx] = {
      ...changeRequests[idx],
      status: body.status,
      approvedBy: body.status === 'Approved' ? 'Admin User' : null,
      approvedDate: body.status === 'Approved' ? now : null,
      notes: body.notes ?? changeRequests[idx].notes,
    }
    return HttpResponse.json(changeRequests[idx])
  }),

  // GET /api/projects/:id/compliance
  http.get('/api/projects/:id/compliance', () => {
    return HttpResponse.json({
      gstSummary: {
        collected: 405000,
        paid: 144000,
        netPayable: 261000,
      },
      tdsSummary: {
        deducted: 22500,
        deposited: 22500,
        pending: 0,
      },
      monthlyTracker: [
        {
          month: 'March 2024',
          gstCollected: 153000,
          gstPaid: 54000,
          netGst: 99000,
          tdsDeducted: 8500,
          tdsDeposited: 8500,
          status: 'pending',
        },
        {
          month: 'February 2024',
          gstCollected: 252000,
          gstPaid: 90000,
          netGst: 162000,
          tdsDeducted: 14000,
          tdsDeposited: 14000,
          status: 'filed',
        },
      ],
      pendingActions: [
        'March 2024 GST return due on 20th April',
        'TDS payment pending for March quarter',
      ],
    })
  }),
]
