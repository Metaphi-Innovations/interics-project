import type { Invoice, LineItem, Payment } from '@/slices/receivables/reducer'
import type {
  ClientInvoice,
  ClientInvoiceLineItem,
  ClientInvoicePayment,
  ClientInvoicePaymentMode,
} from '@/slices/live/types'
import {
  computeLineItemTaxBreakdown,
  rollupsFromLineItems,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
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
  const breakdown = computeLineItemTaxBreakdown(li.amount, li.labourCessRate ?? 0, li.gstRate)
  return {
    id: li.id,
    serviceId: li.serviceId,
    serviceName: li.serviceName,
    sacCode: li.sacCode,
    amount: li.amount,
    labourCessRate: li.labourCessRate ?? 0,
    labourCessAmount: li.labourCessAmount ?? breakdown.labourCessAmount,
    taxableAmount: li.taxableAmount ?? breakdown.taxableAmount,
    gstRate: li.gstRate,
    gstAmount: li.gstAmount,
    milestoneId: li.milestoneId,
    baselineServiceId: li.baselineServiceId,
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
  const mappedLines = inv.lineItems.map(toClientLineItem)
  const roll = rollupsFromLineItems(mappedLines)
  const milestoneId = inv.milestoneId?.trim() || primary?.milestoneId || '—'
  const milestoneName =
    inv.milestoneName?.trim() || milestoneNameFromLine(primary)
  const serviceId =
    inv.serviceId?.trim() ||
    primary?.serviceId ||
    primary?.baselineServiceId ||
    ''
  const serviceName = inv.serviceName?.trim() || primary?.serviceName || '—'
  return {
    id: inv.id,
    projectId: inv.projectId,
    projectName: inv.projectName,
    clientId: inv.clientId,
    clientName: inv.clientName,
    milestoneId,
    milestoneName,
    serviceId,
    serviceName,
    lineItems: mappedLines,
    baseAmount: inv.baseAmount || roll.baseAmount,
    labourCessAmount: inv.labourCessAmount ?? roll.labourCessAmount,
    taxableAmount: inv.taxableAmount ?? roll.taxableAmount,
    gstAmount: inv.gstAmount ?? roll.gstAmount,
    grossAmount: inv.totalAmount > 0 ? inv.totalAmount : roll.grossAmount,
    tdsAmount: inv.tdsDeducted,
    tdsRate: inv.tdsRate ?? null,
    netReceivable: inv.balance,
    invoiceNumber: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    status: mapInvoiceStatusToClient(inv.status),
    payments: inv.payments.map(paymentToClient),
    notes: inv.notes,
    clientPoId: inv.clientPoId,
    documentUrl: inv.documentUrl ?? undefined,
    fileName: inv.fileName ?? undefined,
    uploadedAt: inv.createdAt,
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
    labourCessRate: li.labourCessRate ?? 0,
    labourCessAmount: li.labourCessAmount,
    taxableAmount: li.taxableAmount,
    gstRate: li.gstRate,
    gstAmount: li.gstAmount,
    milestoneId: li.milestoneId,
    baselineServiceId: li.baselineServiceId,
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
    labourCessAmount: data.labourCessAmount,
    taxableAmount: data.taxableAmount,
    notes: data.notes,
    sendNow: options.sendNow,
    invoiceNo: data.invoiceNumber,
    milestoneId: data.milestoneId,
    milestoneName: data.milestoneName,
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    tdsRate: data.tdsRate ?? null,
    tdsDeducted: data.tdsAmount ?? 0,
    ...(data.clientPoId ? { clientPoId: data.clientPoId } : {}),
  }
}
