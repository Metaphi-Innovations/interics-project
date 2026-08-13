import { http, HttpResponse } from 'msw'
import type { Expense, Reimbursement, VendorPayment } from '@/slices/live/types'
import { expenses, nextExpenseId, payments, reimbursements } from '@/mocks/liveFinanceMockState'

function parseDate(s: string): Date {
  return new Date(s + (s.length <= 10 ? 'T00:00:00' : ''))
}

function inDateRange(
  dateStr: string,
  from: string | null,
  to: string | null,
): boolean {
  const d = parseDate(dateStr)
  if (from && d < parseDate(from)) return false
  if (to && d > parseDate(to)) return false
  return true
}

export const financeHandlers = [
  http.get('*/api/v1/expenses', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const type = url.searchParams.get('type')
    const vendorId = url.searchParams.get('vendorId')
    const status = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    let rows = [...expenses]
    if (projectId) rows = rows.filter((e) => e.projectId === projectId)
    if (type) rows = rows.filter((e) => e.type === type)
    if (vendorId) rows = rows.filter((e) => e.vendorId === vendorId)
    if (status) rows = rows.filter((e) => e.status === status)
    if (dateFrom || dateTo) {
      rows = rows.filter((e) => inDateRange(e.date, dateFrom, dateTo))
    }
    return HttpResponse.json(rows)
  }),

  http.post('*/api/v1/expenses', async ({ request }) => {
    const body = await request.json() as Omit<Expense, 'id'> & { projectId: string }
    if (!body.projectId) {
      return HttpResponse.json({ message: 'projectId is required' }, { status: 400 })
    }
    const { projectId, ...rest } = body
    const newExp: Expense = {
      ...rest,
      id: nextExpenseId(),
      projectId,
    }
    expenses.push(newExp)
    return HttpResponse.json(newExp, { status: 201 })
  }),

  http.get('*/api/v1/payments', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const vendorId = url.searchParams.get('vendorId')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    let rows: VendorPayment[] = [...payments]
    if (projectId) rows = rows.filter((p) => p.projectId === projectId)
    if (vendorId) rows = rows.filter((p) => p.vendorId === vendorId)
    if (dateFrom || dateTo) {
      rows = rows.filter((p) => inDateRange(p.paymentDate, dateFrom, dateTo))
    }
    return HttpResponse.json(rows)
  }),

  http.get('*/api/v1/reimbursements', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const vendorId = url.searchParams.get('vendorId')
    const status = url.searchParams.get('status')

    let rows: Reimbursement[] = [...reimbursements]
    if (projectId) rows = rows.filter((r) => r.projectId === projectId)
    if (vendorId) rows = rows.filter((r) => r.vendorId === vendorId)
    if (status) rows = rows.filter((r) => r.status === status)
    return HttpResponse.json(rows)
  }),
]
