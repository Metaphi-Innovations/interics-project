import type { Expense, VendorInvoice } from '@/slices/live/types'

/** Vendors that still need to apply this common expense on an invoice (payer + allocated). */
export function commonExpenseVendorsNeedingInvoiceLink(e: Expense): string[] {
  if (e.type !== 'common') return []
  const needed = new Set<string>()
  if (e.paidByVendorId) needed.add(e.paidByVendorId)
  for (const a of e.vendorAllocations ?? []) {
    if (a.includedInRecovery !== false) needed.add(a.vendorId)
  }
  return [...needed]
}

export function invoiceLinksExpense(inv: VendorInvoice, expenseId: string): boolean {
  return (
    (inv.linkedExpenseIds ?? []).includes(expenseId) ||
    (inv.linkedAdditionExpenseIds ?? []).includes(expenseId)
  )
}

export function vendorHasLinkedExpenseOnInvoice(
  invoices: VendorInvoice[],
  vendorId: string,
  expenseId: string,
): boolean {
  return invoices.some((inv) => inv.vendorId === vendorId && invoiceLinksExpense(inv, expenseId))
}

/** True when every Paid By / Allocated vendor has linked this common expense on some invoice. */
export function isCommonExpenseFullyLinkedOnInvoices(
  e: Expense,
  invoices: VendorInvoice[],
): boolean {
  if (e.type !== 'common') return false
  const needed = commonExpenseVendorsNeedingInvoiceLink(e)
  if (needed.length === 0) return true
  return needed.every((vendorId) => vendorHasLinkedExpenseOnInvoice(invoices, vendorId, e.id))
}

/** Apply invoice-link status for an expense after create/update of a vendor invoice. */
export function nextExpenseStatusAfterInvoiceLink(
  exp: Expense,
  invoices: VendorInvoice[],
  linkingInvoiceId: string,
): Pick<Expense, 'status' | 'linkedVendorInvoiceId'> {
  if (exp.type === 'common') {
    const fullyLinked = isCommonExpenseFullyLinkedOnInvoices(exp, invoices)
    return {
      status: fullyLinked ? 'adjusted' : 'pending',
      linkedVendorInvoiceId: fullyLinked ? linkingInvoiceId : exp.linkedVendorInvoiceId,
    }
  }
  return {
    status: 'adjusted',
    linkedVendorInvoiceId: linkingInvoiceId,
  }
}
