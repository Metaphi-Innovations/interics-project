import type { Invoice, LineItem, Payment } from '@/slices/receivables/reducer'
import type {
  ClientInvoice,
  ClientInvoiceLineItem,
  ClientInvoicePayment,
  ClientInvoicePaymentMode,
} from '@/slices/live/types'

function milestoneNameFromLine(li: LineItem | undefined): string {
  if (!li) return '—'
  if (!li.milestoneId) return li.serviceName
  const parts = li.serviceName.split(' — ')
  return parts.length >= 2 ? parts[0]!.trim() : li.serviceName
}

function toClientLineSource(
  li: LineItem,
): ClientInvoiceLineItem['lineSource'] | undefined {
  if (li.lineSource === 'service') return 'milestone'
  return li.lineSource === 'manual' ? 'manual' : 'milestone'
}

function toClientLineItem(li: LineItem): ClientInvoiceLineItem {
  return {
    id: li.id,
    serviceId: li.serviceId,
    serviceName: li.serviceName,
    sacCode: li.sacCode,
    amount: li.amount,
    gstRate: li.gstRate,
    gstAmount: li.gstAmount,
    milestoneId: li.milestoneId,
    lineSource: toClientLineSource(li),
  }
}

function paymentToClient(p: Payment): ClientInvoicePayment {
  const mode = p.paymentMode as ClientInvoicePaymentMode
  return {
    id: p.id,
    date: p.date,
    amountReceived: p.amountReceived,
    tdsDeducted: p.tdsDeducted,
    netReceived: p.netReceived,
    paymentMode: mode,
    reference: p.reference,
    recordedAt: p.recordedAt,
  }
}

function mapInvoiceStatusToClient(s: Invoice['status']): ClientInvoice['status'] {
  if (s === 'draft') return 'draft'
  if (s === 'paid') return 'paid'
  if (s === 'partially_paid') return 'partially_paid'
  return 'sent'
}

/** Map global B1 invoice to Live Billing `ClientInvoice` (single primary milestone from first milestone line). */
export function invoiceToClientInvoice(inv: Invoice): ClientInvoice {
  const primary =
    inv.lineItems.find((l) => l.milestoneId) ?? inv.lineItems[0]
  const serviceKey = primary?.baselineServiceId ?? primary?.serviceId ?? ''
  return {
    id: inv.id,
    projectId: inv.projectId,
    projectName: inv.projectName,
    clientId: inv.clientId,
    clientName: inv.clientName,
    milestoneId: primary?.milestoneId ?? '—',
    milestoneName: milestoneNameFromLine(primary),
    serviceId: serviceKey,
    serviceName: primary?.serviceName ?? '—',
    lineItems: inv.lineItems.map(toClientLineItem),
    baseAmount: inv.baseAmount,
    gstAmount: inv.gstAmount,
    grossAmount: inv.totalAmount,
    tdsAmount: inv.tdsDeducted,
    netReceivable: inv.balance,
    invoiceNumber: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    status: mapInvoiceStatusToClient(inv.status),
    payments: inv.payments.map(paymentToClient),
    notes: inv.notes,
  }
}

/** Build POST /api/invoices body from a Live Billing draft (MSW + receivables slice). */
export function clientInvoiceDraftToReceivablesPost(
  projectId: string,
  projectName: string,
  clientId: string,
  clientName: string,
  data: Omit<ClientInvoice, 'id' | 'projectId'>,
  options: { sendNow: boolean },
): Record<string, unknown> {
  const lineItems = data.lineItems.map((li) => ({
    id: li.id,
    serviceId: li.serviceId,
    serviceName: li.serviceName,
    sacCode: li.sacCode,
    amount: li.amount,
    gstRate: li.gstRate,
    gstAmount: li.gstAmount,
    milestoneId: li.milestoneId,
    lineSource: li.lineSource === 'manual' ? 'manual' : 'milestone',
  }))
  return {
    clientId,
    clientName,
    projectId,
    projectName,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate,
    lineItems,
    notes: data.notes,
    sendNow: options.sendNow,
    invoiceNo: data.invoiceNumber,
  }
}
