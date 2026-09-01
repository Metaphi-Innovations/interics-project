import type { Invoice } from '@/slices/receivables/reducer'
import { invoiceToClientInvoice } from '@/pages/Projects/tabs/live/invoiceAdapters'
import {
  balancePending,
  clientInvoiceAmountBreakdownNet,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'

/** Finance Receivable listing Net Amount = Project Live Amount Breakdown → Net. */
export function financeReceivableNetAmount(inv: Invoice): number {
  return clientInvoiceAmountBreakdownNet(invoiceToClientInvoice(inv))
}

/** Finance Receivable listing Pending Amount = Project Live Payment Summary → Outstanding. */
export function financeReceivableOutstanding(inv: Invoice): number {
  return balancePending(invoiceToClientInvoice(inv))
}
