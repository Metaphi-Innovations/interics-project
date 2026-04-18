import { http, HttpResponse } from 'msw'
import type { Expense, Reimbursement, VendorInvoice, VendorPayment } from '../../slices/live/types'
import {
  expenses,
  expCounter,
  payCounter,
  payments,
  reimbursements,
  rmbCounter,
  vendorInvoices,
  viCounter,
} from '@/mocks/liveFinanceMockState'

// ─── Handlers ─────────────────────────────────────────────────────────────────
// Client invoices: use global GET/POST /api/invoices (receivablesHandlers).

export const liveHandlers = [
  http.get('/api/projects/:id/vendor-invoices', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(vendorInvoices.filter((v) => v.projectId === id))
  }),

  http.post('/api/projects/:id/vendor-invoices', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<VendorInvoice, 'id' | 'projectId'>
    const newVI: VendorInvoice = {
      id: `VINV-${String(viCounter++).padStart(3, '0')}`,
      projectId: id,
      ...body,
    }
    vendorInvoices.push(newVI)
    return HttpResponse.json(newVI, { status: 201 })
  }),

  http.get('/api/projects/:id/payments', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(payments.filter((p) => p.projectId === id))
  }),

  http.post('/api/projects/:id/payments', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<VendorPayment, 'id' | 'projectId'>
    const newP: VendorPayment = {
      id: `PAY-${String(payCounter++).padStart(3, '0')}`,
      projectId: id,
      ...body,
    }
    payments.push(newP)
    for (const invId of newP.linkedInvoiceIds) {
      const vi = vendorInvoices.find((v) => v.id === invId)
      if (vi) vi.status = 'paid'
    }
    for (const expId of newP.linkedExpenseIds) {
      const ex = expenses.find((e) => e.id === expId)
      if (ex) {
        ex.status = 'included_in_payment'
        ex.linkedPaymentId = newP.id
      }
    }
    for (const rId of newP.linkedReimbursementIds) {
      const r = reimbursements.find((x) => x.id === rId)
      if (r) {
        r.status = 'included_in_payment'
        r.linkedPaymentId = newP.id
      }
    }
    return HttpResponse.json(newP, { status: 201 })
  }),

  http.get('/api/projects/:id/expenses', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(expenses.filter((e) => e.projectId === id))
  }),

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

  http.delete('/api/projects/:id/expenses/:expenseId', ({ params }) => {
    const projectId = params.id as string
    const expenseId = params.expenseId as string
    const idx = expenses.findIndex((e) => e.id === expenseId && e.projectId === projectId)
    if (idx === -1) return new HttpResponse(null, { status: 404 })
    expenses.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/projects/:id/reimbursements', ({ params }) => {
    const id = params.id as string
    return HttpResponse.json(reimbursements.filter((r) => r.projectId === id))
  }),

  http.post('/api/projects/:id/reimbursements', async ({ params, request }) => {
    const id = params.id as string
    const body = await request.json() as Omit<Reimbursement, 'id' | 'projectId'>
    const num = String(rmbCounter++).padStart(3, '0')
    const newR: Reimbursement = {
      id: `rmb-${num}`,
      projectId: id,
      ...body,
    }
    reimbursements.push(newR)
    return HttpResponse.json(newR, { status: 201 })
  }),

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
