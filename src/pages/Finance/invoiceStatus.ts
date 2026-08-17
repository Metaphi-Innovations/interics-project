import dayjs from 'dayjs'
import type { Invoice } from '@/slices/receivables/reducer'
import type { StatusType } from '@/design-system/components'

const SETTLED_EPS = 0.01

export function mapInvoiceStatus(inv: Pick<Invoice, 'status' | 'balance' | 'dueDate'>): string {
  if (inv.status === 'uploaded' || inv.status === 'draft') return 'draft'
  if (Number(inv.balance ?? 0) <= SETTLED_EPS) return 'paid'
  if (inv.status === 'overdue' || dayjs(inv.dueDate).isBefore(dayjs(), 'day')) return 'overdue'
  return 'tax'
}

export function isPartiallyPaidInvoice(
  inv: Pick<Invoice, 'balance' | 'totalReceived' | 'tdsDeducted' | 'status'>,
): boolean {
  if (inv.status === 'draft' || inv.status === 'uploaded' || inv.status === 'paid') return false
  if (Number(inv.balance ?? 0) <= SETTLED_EPS) return false
  if (inv.status === 'partially_paid') return true
  const settled = Number(inv.totalReceived ?? 0) + Number(inv.tdsDeducted ?? 0)
  return settled > SETTLED_EPS
}

/** Extra Partially Paid chip only on Tax / Overdue invoices — no separate tab. */
export function showPartialPaidAlongsideTabStatus(inv: Invoice): boolean {
  const tabStatus = mapInvoiceStatus(inv)
  return (tabStatus === 'tax' || tabStatus === 'overdue') && isPartiallyPaidInvoice(inv)
}

export function invoiceStatusToBadgeType(status: Invoice['status'] | string): StatusType {
  if (status === 'draft') return 'invoice_draft'
  if (status === 'not_paid') return 'unpaid'
  return status as StatusType
}
