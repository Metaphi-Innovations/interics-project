import { http, HttpResponse } from 'msw'
import type { Invoice, VendorInvoice, Expense, ChangeRequest } from '../../slices/live/reducer'

// ─── Seed data ────────────────────────────────────────────────────────────────

/** Live-tab invoices: dates in rolling window (Nov 2025–Apr 2026) for dashboard charts. */
let invoices: Invoice[] = [
  {
    id: 'inv-001',
    projectId: 'p-001',
    invoiceNumber: 'LIV-26-001',
    invoiceDate: '2025-11-18',
    dueDate: '2025-12-18',
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
    paidDate: '2025-11-28',
    receiptReference: 'NEFT-20251128-001',
  },
  {
    id: 'inv-002',
    projectId: 'p-001',
    invoiceNumber: 'LIV-26-002',
    invoiceDate: '2026-02-05',
    dueDate: '2026-03-07',
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
    invoiceNumber: 'LIV-26-003',
    invoiceDate: '2026-03-22',
    dueDate: '2026-04-21',
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
  {
    id: 'inv-004',
    projectId: 'p-002',
    invoiceNumber: 'LIV-26-004',
    invoiceDate: '2026-01-14',
    dueDate: '2026-02-13',
    milestoneId: 'cm-101',
    milestoneName: 'Design phase',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    amount: 420000,
    gstRate: 18,
    gstAmount: 75600,
    tdsRate: 10,
    tdsAmount: 42000,
    grossAmount: 495600,
    netReceivable: 453600,
    status: 'Paid',
    paidAmount: 453600,
    paidDate: '2026-02-01',
    receiptReference: 'NEFT-20260201-002',
  },
  {
    id: 'inv-005',
    projectId: 'p-002',
    invoiceNumber: 'LIV-26-005',
    invoiceDate: '2026-04-02',
    dueDate: '2026-05-02',
    milestoneId: 'cm-102',
    milestoneName: 'Site execution',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    amount: 280000,
    gstRate: 18,
    gstAmount: 50400,
    tdsRate: 10,
    tdsAmount: 28000,
    grossAmount: 330400,
    netReceivable: 302400,
    status: 'Sent',
    paidAmount: 0,
    paidDate: null,
    receiptReference: null,
  },
  {
    id: 'inv-006',
    projectId: 'p-004',
    invoiceNumber: 'LIV-26-006',
    invoiceDate: '2025-12-08',
    dueDate: '2026-01-07',
    milestoneId: 'cm-401',
    milestoneName: 'Concept',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    amount: 195000,
    gstRate: 18,
    gstAmount: 35100,
    tdsRate: 10,
    tdsAmount: 19500,
    grossAmount: 230100,
    netReceivable: 210600,
    status: 'Paid',
    paidAmount: 210600,
    paidDate: '2025-12-20',
    receiptReference: 'UPI-20251220-004',
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
    invoiceDate: '2025-11-25',
    milestoneId: 'vml-001',
    milestoneName: 'Advance',
    amount: 270000,
    tdsRate: 2,
    tdsAmount: 5400,
    netPayable: 264600,
    status: 'Paid',
    paidAmount: 264600,
    paidDate: '2025-12-02',
    paymentReference: 'NEFT-20251202-001',
  },
  {
    id: 'vi-002',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    invoiceNumber: 'BWC-INV-002',
    invoiceDate: '2026-04-01',
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
  {
    id: 'vi-003',
    projectId: 'p-002',
    vendorPOId: 'vpo-102',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    invoiceNumber: 'BWC-INV-HYD-001',
    invoiceDate: '2026-03-05',
    milestoneId: 'vml-101',
    milestoneName: 'Mobilization',
    amount: 185000,
    tdsRate: 2,
    tdsAmount: 3700,
    netPayable: 181300,
    status: 'Paid',
    paidAmount: 181300,
    paidDate: '2026-03-12',
    paymentReference: 'NEFT-20260312-002',
  },
  {
    id: 'vi-004',
    projectId: 'p-002',
    vendorPOId: 'vpo-102',
    vendorId: 'v-004',
    vendorName: 'FloorMaster Pvt Ltd',
    invoiceNumber: 'FM-HYD-042',
    invoiceDate: '2026-04-08',
    milestoneId: 'vml-102',
    milestoneName: 'Flooring supply',
    amount: 92000,
    tdsRate: 2,
    tdsAmount: 1840,
    netPayable: 90160,
    status: 'Pending',
    paidAmount: 0,
    paidDate: null,
    paymentReference: null,
  },
  {
    id: 'vi-005',
    projectId: 'p-004',
    vendorPOId: 'vpo-401',
    vendorId: 'v-002',
    vendorName: 'Chennai Fitouts Co',
    invoiceNumber: 'CFC-MAA-118',
    invoiceDate: '2026-01-18',
    milestoneId: 'vml-401',
    milestoneName: 'Materials',
    amount: 142000,
    tdsRate: 2,
    tdsAmount: 2840,
    netPayable: 139160,
    status: 'Paid',
    paidAmount: 139160,
    paidDate: '2026-01-25',
    paymentReference: 'NEFT-20260125-004',
  },
  {
    id: 'vi-006',
    projectId: 'p-004',
    vendorPOId: 'vpo-401',
    vendorId: 'v-002',
    vendorName: 'Chennai Fitouts Co',
    invoiceNumber: 'CFC-MAA-119',
    invoiceDate: '2026-04-02',
    milestoneId: 'vml-402',
    milestoneName: 'Fixtures',
    amount: 88000,
    tdsRate: 2,
    tdsAmount: 1760,
    netPayable: 86240,
    status: 'On Hold',
    paidAmount: 0,
    paidDate: null,
    paymentReference: null,
  },
  {
    id: 'vi-007',
    projectId: 'p-006',
    vendorPOId: 'vpo-601',
    vendorId: 'v-003',
    vendorName: 'Mumbai Glassworks',
    invoiceNumber: 'MGW-BOM-009',
    invoiceDate: '2026-03-28',
    milestoneId: 'vml-601',
    milestoneName: 'Glazing',
    amount: 310000,
    tdsRate: 2,
    tdsAmount: 6200,
    netPayable: 303800,
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
    date: '2025-12-02',
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
    date: '2026-04-03',
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
  {
    id: 'exp-003',
    projectId: 'p-002',
    date: '2026-03-14',
    description: 'Hyderabad site survey travel',
    category: 'Travel',
    amount: 22000,
    vendorId: null,
    vendorName: null,
    billable: true,
    status: 'Approved',
    receiptUrl: null,
    notes: null,
    submittedBy: 'Sarah Johnson',
    approvedBy: 'Admin User',
  },
  {
    id: 'exp-004',
    projectId: 'p-002',
    date: '2026-04-05',
    description: 'Rendering software renewal',
    category: 'Misc',
    amount: 48000,
    vendorId: null,
    vendorName: null,
    billable: false,
    status: 'Pending',
    receiptUrl: null,
    notes: 'Annual license',
    submittedBy: 'Meera Iyer',
    approvedBy: null,
  },
  {
    id: 'exp-005',
    projectId: 'p-004',
    date: '2026-02-02',
    description: 'Chennai site storage',
    category: 'Accommodation',
    amount: 12000,
    vendorId: null,
    vendorName: null,
    billable: true,
    status: 'Approved',
    receiptUrl: null,
    notes: null,
    submittedBy: 'Arjun Nair',
    approvedBy: 'Admin User',
  },
  {
    id: 'exp-006',
    projectId: 'p-006',
    date: '2026-04-07',
    description: 'Bandra site contingency materials',
    category: 'Materials',
    amount: 18500,
    vendorId: 'v-003',
    vendorName: 'Mumbai Glassworks',
    billable: true,
    status: 'Pending',
    receiptUrl: null,
    notes: 'Urgent glass repair samples',
    submittedBy: 'Priya Menon',
    approvedBy: null,
  },
]

let changeRequests: ChangeRequest[] = [
  {
    id: 'cr-001',
    projectId: 'p-001',
    crNumber: 'CR-26-001',
    title: 'Additional Meeting Room',
    description: 'Client requesting additional meeting room on floor 3',
    requestedBy: 'Rahul Sharma',
    requestedDate: '2026-03-10',
    type: 'Scope Addition',
    status: 'Approved',
    financialImpact: 250000,
    approvedBy: 'Admin User',
    approvedDate: '2026-03-15',
    notes: 'Approved with revised timeline',
  },
  {
    id: 'cr-002',
    projectId: 'p-001',
    crNumber: 'CR-26-002',
    title: 'Timeline Extension - 2 weeks',
    description: 'Civil work delayed due to material delivery',
    requestedBy: 'Rahul Sharma',
    requestedDate: '2026-04-01',
    type: 'Timeline Extension',
    status: 'Pending Approval',
    financialImpact: 0,
    approvedBy: null,
    approvedDate: null,
    notes: null,
  },
  {
    id: 'cr-003',
    projectId: 'p-002',
    crNumber: 'CR-26-003',
    title: 'Extra AV integration bay',
    description: 'Client added two video-conference rooms',
    requestedBy: 'Sarah Johnson',
    requestedDate: '2026-04-04',
    type: 'Scope Addition',
    status: 'Pending Approval',
    financialImpact: 180000,
    approvedBy: null,
    approvedDate: null,
    notes: null,
  },
  {
    id: 'cr-004',
    projectId: 'p-004',
    crNumber: 'CR-26-004',
    title: 'Retail signage package',
    description: 'Scope for external signage coordination',
    requestedBy: 'Arjun Nair',
    requestedDate: '2026-02-18',
    type: 'Scope Addition',
    status: 'Approved',
    financialImpact: 95000,
    approvedBy: 'Admin User',
    approvedDate: '2026-02-22',
    notes: null,
  },
]

let invCounter = 7
let viCounter = 8
let expCounter = 7
let crCounter = 5

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
