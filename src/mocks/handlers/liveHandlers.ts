import { http, HttpResponse } from 'msw'
import type { Invoice, VendorMilestonePayment, Expense, ChangeRequest } from '../../slices/live/reducer'

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
    grossAmount: 354000,
    netReceivable: 354000,
    status: 'Paid',
    paidAmount: 324000,
    paidDate: '2025-11-28',
    receiptReference: 'NEFT-20251128-001',
    paymentMode: 'NEFT',
    receiptTdsRate: 10,
    receiptTdsAmount: 30000,
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
    grossAmount: 708000,
    netReceivable: 708000,
    status: 'Sent',
    paidAmount: 0,
    paidDate: null,
    receiptReference: null,
    paymentMode: null,
    receiptTdsRate: null,
    receiptTdsAmount: 0,
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
    grossAmount: 590000,
    netReceivable: 590000,
    status: 'Overdue',
    paidAmount: 0,
    paidDate: null,
    receiptReference: null,
    paymentMode: null,
    receiptTdsRate: null,
    receiptTdsAmount: 0,
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
    grossAmount: 495600,
    netReceivable: 495600,
    status: 'Paid',
    paidAmount: 453600,
    paidDate: '2026-02-01',
    receiptReference: 'NEFT-20260201-002',
    paymentMode: 'NEFT',
    receiptTdsRate: 10,
    receiptTdsAmount: 42000,
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
    grossAmount: 330400,
    netReceivable: 330400,
    status: 'Generated',
    paidAmount: 0,
    paidDate: null,
    receiptReference: null,
    paymentMode: null,
    receiptTdsRate: null,
    receiptTdsAmount: 0,
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
    grossAmount: 230100,
    netReceivable: 230100,
    status: 'Paid',
    paidAmount: 210600,
    paidDate: '2025-12-20',
    receiptReference: 'UPI-20251220-004',
    paymentMode: 'UPI',
    receiptTdsRate: 10,
    receiptTdsAmount: 19500,
  },
]

/** Live vendor milestone payments: p-001 has 2 pending + 1 uploaded + 1 paid per product spec. */
let vendorInvoices: VendorMilestonePayment[] = [
  {
    id: 'vi-p01-1',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'svc-civil',
    serviceName: 'Civil Works',
    milestoneId: 'vml-p01-a',
    milestoneName: 'Advance',
    amount: 270000,
    status: 'PendingInvoice',
    paidAmount: 0,
    paidDate: null,
  },
  {
    id: 'vi-p01-2',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-004',
    vendorName: 'FloorMaster Pvt Ltd',
    serviceId: 'svc-floor',
    serviceName: 'Flooring',
    milestoneId: 'vml-p01-b',
    milestoneName: 'Supply & fix',
    amount: 180000,
    status: 'PendingInvoice',
    paidAmount: 0,
    paidDate: null,
  },
  {
    id: 'vi-p01-3',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'svc-civil',
    serviceName: 'Civil Works',
    milestoneId: 'vml-p01-c',
    milestoneName: 'Midpoint',
    amount: 630000,
    status: 'InvoiceUploaded',
    invoiceNumber: 'BWC-INV-UP-003',
    invoiceDate: '2026-04-01',
    invoiceAmount: 630000,
    dueDate: '2026-05-01',
    attachmentUrl: null,
    paidAmount: 0,
    paidDate: null,
  },
  {
    id: 'vi-p01-4',
    projectId: 'p-001',
    vendorPOId: 'vpo-001',
    vendorId: 'v-002',
    vendorName: 'Chennai Fitouts Co',
    serviceId: 'svc-fit',
    serviceName: 'Fit-out',
    milestoneId: 'vml-p01-d',
    milestoneName: 'Materials',
    amount: 142000,
    status: 'Paid',
    invoiceNumber: 'CFC-MAA-118',
    invoiceDate: '2026-01-18',
    invoiceAmount: 142000,
    dueDate: '2026-02-17',
    tdsPercent: 10,
    tdsAmount: 14200,
    netPayable: 127800,
    paymentDate: '2026-01-25',
    paymentMode: 'Bank Transfer',
    referenceNumber: 'NEFT-20260125-004',
    paidAmount: 127800,
    paidDate: '2026-01-25',
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
let viCounter = 5
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
    const body = await request.json() as Omit<VendorMilestonePayment, 'id' | 'projectId'>
    const newVI: VendorMilestonePayment = {
      id: `vi-${String(viCounter++).padStart(3, '0')}`,
      projectId: id,
      ...body,
    }
    vendorInvoices.push(newVI)
    return HttpResponse.json(newVI, { status: 201 })
  }),

  // PATCH /api/projects/:id/vendor-invoices/:viId
  http.patch('/api/projects/:id/vendor-invoices/:viId', async ({ params, request }) => {
    const viId = params.viId as string
    const idx = vendorInvoices.findIndex((v) => v.id === viId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<VendorMilestonePayment>
    vendorInvoices[idx] = { ...vendorInvoices[idx], ...body }
    return HttpResponse.json(vendorInvoices[idx])
  }),

  // PATCH /api/projects/:id/vendor-invoices/:viId/pay
  http.patch('/api/projects/:id/vendor-invoices/:viId/pay', async ({ params, request }) => {
    const viId = params.viId as string
    const idx = vendorInvoices.findIndex((v) => v.id === viId)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const body = await request.json() as Partial<VendorMilestonePayment>
    const prev = vendorInvoices[idx]
    vendorInvoices[idx] = {
      ...prev,
      ...body,
      status: 'Paid',
      paymentDate: body.paidDate ?? prev.paymentDate,
      referenceNumber: body.referenceNumber ?? prev.referenceNumber,
      tdsPercent: body.tdsPercent ?? prev.tdsPercent,
      tdsAmount: body.tdsAmount ?? prev.tdsAmount,
      netPayable: body.netPayable ?? prev.netPayable,
      paidAmount: body.paidAmount ?? prev.paidAmount,
      paidDate: body.paidDate ?? prev.paidDate,
      paymentMode: body.paymentMode ?? prev.paymentMode,
    }
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
