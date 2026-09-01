import type {
  ClientInvoice,
  ClientInvoiceLineItem,
  ClientInvoicePayment,
  VendorInvoice,
  VendorPayment,
} from '@/slices/live/types'

export const PAYMENT_MONEY_EPS = 0.01

export type PaymentAllocationRow = {
  invoiceId: string
  milestoneId: string
  allocatedAmount: number
}

export type ClientPaymentAllocationRow = {
  milestoneId: string
  allocatedAmount: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseVendorPaymentAllocations(
  payment: Pick<VendorPayment, 'allocations'> | undefined,
): PaymentAllocationRow[] {
  if (!payment?.allocations?.length) return []
  return payment.allocations
    .map((row) => ({
      invoiceId: row.invoiceId.trim(),
      milestoneId: row.milestoneId.trim(),
      allocatedAmount: roundMoney(row.allocatedAmount),
    }))
    .filter(
      (row) =>
        row.invoiceId &&
        row.milestoneId &&
        row.allocatedAmount > PAYMENT_MONEY_EPS,
    )
}

export function parseClientPaymentAllocations(
  payment: ClientInvoicePayment,
): ClientPaymentAllocationRow[] {
  const raw = payment.allocations
  if (!raw?.length) return []
  return raw
    .map((row) => ({
      milestoneId: row.milestoneId.trim(),
      allocatedAmount: roundMoney(row.allocatedAmount),
    }))
    .filter((row) => row.milestoneId && row.allocatedAmount > PAYMENT_MONEY_EPS)
}

export function sumVendorInvoicePaidFromPayments(
  payments: VendorPayment[],
  invoiceId: string,
): number {
  let total = 0
  for (const payment of payments) {
    if (payment.status === 'not_paid') continue
    if (!payment.linkedInvoiceIds?.includes(invoiceId)) continue
    const allocs = parseVendorPaymentAllocations(payment).filter(
      (row) => row.invoiceId === invoiceId,
    )
    if (allocs.length > 0) {
      total += allocs.reduce((sum, row) => sum + row.allocatedAmount, 0)
    } else {
      total += payment.netPaid ?? 0
    }
  }
  return roundMoney(total)
}

export function sumVendorLinePaidFromPayments(
  payments: VendorPayment[],
  invoiceId: string,
  milestoneId: string,
  legacy?: { invoiceNet: number; lineNet: number },
): number {
  let total = 0
  for (const payment of payments) {
    if (payment.status === 'not_paid') continue
    if (!payment.linkedInvoiceIds?.includes(invoiceId)) continue
    const allocs = parseVendorPaymentAllocations(payment).filter(
      (row) => row.invoiceId === invoiceId && row.milestoneId === milestoneId,
    )
    if (allocs.length > 0) {
      total += allocs.reduce((sum, row) => sum + row.allocatedAmount, 0)
      continue
    }
    if (!payment.allocations?.length && legacy && legacy.invoiceNet > PAYMENT_MONEY_EPS) {
      const paid = payment.netPaid ?? 0
      total += roundMoney((paid * legacy.lineNet) / legacy.invoiceNet)
    }
  }
  return roundMoney(total)
}

export function sumClientInvoicePaidFromPayments(payments: ClientInvoicePayment[]): number {
  let total = 0
  for (const payment of payments) {
    const allocs = parseClientPaymentAllocations(payment)
    if (allocs.length > 0) {
      total += allocs.reduce((sum, row) => sum + row.allocatedAmount, 0)
    } else {
      total += payment.amountReceived ?? 0
    }
  }
  return roundMoney(total)
}

export function sumClientLinePaidFromPayments(
  payments: ClientInvoicePayment[],
  milestoneId: string,
  legacy?: { invoiceNet: number; lineNet: number },
): number {
  let total = 0
  for (const payment of payments) {
    const allocs = parseClientPaymentAllocations(payment).filter(
      (row) => row.milestoneId === milestoneId,
    )
    if (allocs.length > 0) {
      total += allocs.reduce((sum, row) => sum + row.allocatedAmount, 0)
      continue
    }
    if (!payment.allocations?.length && legacy && legacy.invoiceNet > PAYMENT_MONEY_EPS) {
      const received = payment.amountReceived ?? 0
      total += roundMoney((received * legacy.lineNet) / legacy.invoiceNet)
    }
  }
  return roundMoney(total)
}

export function resolveVendorLineNetFromInvoice(
  invoice: VendorInvoice,
  milestoneId: string,
): number {
  const id = milestoneId.trim()
  if (!id) return 0

  const lineItems = invoice.lineItems ?? []
  const matching = lineItems.filter((li) => li.milestoneId?.trim() === id)
  if (matching.length > 0) {
    let net = 0
    for (const li of matching) {
      if (li.netAmount != null && Number.isFinite(li.netAmount)) {
        net += li.netAmount
        continue
      }
      const base = li.amount ?? 0
      const gst = li.gstAmount ?? 0
      const tds = li.tdsAmount ?? 0
      net += roundMoney(base + gst - tds)
    }
    return roundMoney(net)
  }

  if (invoice.milestoneId?.trim() === id) {
    return roundMoney(invoice.netPayable ?? 0)
  }

  return 0
}

export function resolveVendorLineAmountsFromInvoice(
  invoice: VendorInvoice,
  milestoneId: string,
): { base: number; gstAmount: number; tdsAmount: number; net: number } | null {
  const id = milestoneId.trim()
  if (!id) return null

  const lineItems = (invoice.lineItems ?? []).filter((li) => li.milestoneId?.trim() === id)
  if (lineItems.length > 0) {
    let base = 0
    let gstAmount = 0
    let tdsAmount = 0
    let net = 0
    for (const li of lineItems) {
      base += li.amount ?? 0
      gstAmount += li.gstAmount ?? 0
      tdsAmount += li.tdsAmount ?? 0
      if (li.netAmount != null && Number.isFinite(li.netAmount)) {
        net += li.netAmount
      } else {
        net += roundMoney((li.amount ?? 0) + (li.gstAmount ?? 0) - (li.tdsAmount ?? 0))
      }
    }
    return {
      base: roundMoney(base),
      gstAmount: roundMoney(gstAmount),
      tdsAmount: roundMoney(tdsAmount),
      net: roundMoney(net),
    }
  }

  if (invoice.milestoneId?.trim() === id) {
    return {
      base: invoice.baseAmount ?? 0,
      gstAmount: invoice.gstAmount ?? 0,
      tdsAmount: invoice.tdsAmount ?? 0,
      net: invoice.netPayable ?? 0,
    }
  }

  return null
}

export type ClientLineAmounts = {
  base: number
  labourCessAmount: number
  gstAmount: number
  tdsAmount: number
  net: number
}

function clientInvoiceHeaderNet(inv: ClientInvoice): number {
  return roundMoney(inv.grossAmount - (inv.tdsAmount ?? 0))
}

function resolveAuthoritativeClientLineNetFromItem(
  li: ClientInvoiceLineItem,
  invoiceTds: number,
  invoiceBase: number,
): number | null {
  if (li.netAmount != null && Number.isFinite(li.netAmount)) {
    return roundMoney(li.netAmount)
  }

  const base = li.amount ?? 0
  const hasLineTax =
    li.labourCessAmount != null ||
    li.gstAmount != null ||
    li.tdsAmount != null
  if (!hasLineTax) {
    return base > PAYMENT_MONEY_EPS ? null : 0
  }

  const labourCess = li.labourCessAmount ?? 0
  const gst = li.gstAmount ?? 0
  const gross =
    li.taxableAmount != null && li.gstAmount != null
      ? li.taxableAmount + gst
      : base + labourCess + gst
  const lineTds =
    li.tdsAmount != null
      ? li.tdsAmount
      : invoiceBase > PAYMENT_MONEY_EPS
        ? roundMoney((invoiceTds * base) / invoiceBase)
        : 0
  return roundMoney(gross - lineTds)
}

function distributeAmountByBaseProportion(
  lines: Array<{ milestoneId: string; base: number }>,
  amountToDistribute: number,
): Map<string, number> {
  const result = new Map<string, number>()
  const target = roundMoney(amountToDistribute)
  if (target <= PAYMENT_MONEY_EPS || lines.length === 0) return result

  const totalBase = roundMoney(lines.reduce((sum, line) => sum + line.base, 0))
  if (totalBase <= PAYMENT_MONEY_EPS) return result

  let sumAllocated = 0
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    const isLast = index === lines.length - 1
    const amount = isLast
      ? roundMoney(target - sumAllocated)
      : roundMoney(target * (line.base / totalBase))
    result.set(line.milestoneId, amount)
    if (!isLast) sumAllocated += amount
  }
  return result
}

function reconcileClientLineNetTotals(
  lines: Array<{ milestoneId: string; lineNet: number }>,
  headerNet: number,
): Array<{ milestoneId: string; lineNet: number }> {
  if (lines.length === 0) return lines
  const target = roundMoney(headerNet)
  const sum = roundMoney(lines.reduce((total, line) => total + line.lineNet, 0))
  if (Math.abs(sum - target) <= PAYMENT_MONEY_EPS) return lines

  const out = lines.map((line) => ({ ...line }))
  const last = out[out.length - 1]!
  last.lineNet = roundMoney(last.lineNet + (target - sum))
  return out.filter((line) => line.lineNet > PAYMENT_MONEY_EPS)
}

/** Derive per-milestone line nets from a client invoice (authoritative line tax, else header fallback). */
export function listClientInvoiceLineNetsFromInvoice(
  inv: ClientInvoice,
): Array<{ milestoneId: string; lineNet: number }> {
  const headerNet = clientInvoiceHeaderNet(inv)
  const invoiceTds = inv.tdsAmount ?? 0
  const invoiceBase = inv.baseAmount ?? 0
  const lineItems = inv.lineItems ?? []

  if (lineItems.length === 0) {
    const headerId = inv.milestoneId?.trim()
    if (headerId && headerNet > PAYMENT_MONEY_EPS) {
      return [{ milestoneId: headerId, lineNet: headerNet }]
    }
    return []
  }

  type MilestoneAggregate = {
    unresolvedBase: number
    resolvedNet: number
  }
  const byId = new Map<string, MilestoneAggregate>()

  for (const li of lineItems) {
    const milestoneId = li.milestoneId?.trim()
    if (!milestoneId) continue

    const base = li.amount ?? 0
    const authoritative = resolveAuthoritativeClientLineNetFromItem(li, invoiceTds, invoiceBase)
    const existing = byId.get(milestoneId) ?? { unresolvedBase: 0, resolvedNet: 0 }

    if (authoritative != null && authoritative > PAYMENT_MONEY_EPS) {
      existing.resolvedNet = roundMoney(existing.resolvedNet + authoritative)
    } else if (base > PAYMENT_MONEY_EPS) {
      existing.unresolvedBase = roundMoney(existing.unresolvedBase + base)
    }
    byId.set(milestoneId, existing)
  }

  if (byId.size === 0) {
    const headerId = inv.milestoneId?.trim()
    if (headerId && headerNet > PAYMENT_MONEY_EPS) {
      return [{ milestoneId: headerId, lineNet: headerNet }]
    }
    return []
  }

  let knownNetSum = 0
  const unresolved: Array<{ milestoneId: string; base: number }> = []

  for (const [milestoneId, entry] of byId.entries()) {
    if (entry.unresolvedBase > PAYMENT_MONEY_EPS) {
      unresolved.push({ milestoneId, base: entry.unresolvedBase })
    }
    if (entry.resolvedNet > PAYMENT_MONEY_EPS) {
      knownNetSum = roundMoney(knownNetSum + entry.resolvedNet)
    }
  }

  const remainingHeaderNet = roundMoney(Math.max(0, headerNet - knownNetSum))
  const fallbackNets =
    unresolved.length > 0
      ? distributeAmountByBaseProportion(unresolved, remainingHeaderNet)
      : new Map<string, number>()

  const lines: Array<{ milestoneId: string; lineNet: number }> = []
  for (const [milestoneId, entry] of byId.entries()) {
    const lineNet = roundMoney(entry.resolvedNet + (fallbackNets.get(milestoneId) ?? 0))
    if (lineNet <= PAYMENT_MONEY_EPS) continue
    lines.push({ milestoneId, lineNet })
  }

  if (lines.length === 0) return []
  return reconcileClientLineNetTotals(lines, headerNet)
}

export function resolveClientLineNetFromInvoice(
  inv: ClientInvoice,
  milestoneId: string,
): number {
  const id = milestoneId.trim()
  if (!id) return 0

  const resolved = listClientInvoiceLineNetsFromInvoice(inv).find((line) => line.milestoneId === id)
  if (resolved) return resolved.lineNet

  if (inv.milestoneId?.trim() === id) {
    return clientInvoiceHeaderNet(inv)
  }

  return 0
}

function resolveClientLineAmountsFromMatchedItems(
  items: ClientInvoiceLineItem[],
  inv: ClientInvoice,
): ClientLineAmounts {
  const invoiceTds = inv.tdsAmount ?? 0
  const invoiceBase = inv.baseAmount ?? 0
  let base = 0
  let labourCessAmount = 0
  let gstAmount = 0
  let tdsAmount = 0
  let net = 0

  for (const li of items) {
    base = roundMoney(base + (li.amount ?? 0))
    labourCessAmount = roundMoney(labourCessAmount + (li.labourCessAmount ?? 0))
    gstAmount = roundMoney(gstAmount + (li.gstAmount ?? 0))
    if (li.tdsAmount != null) {
      tdsAmount = roundMoney(tdsAmount + li.tdsAmount)
    }
    const lineNet = resolveAuthoritativeClientLineNetFromItem(li, invoiceTds, invoiceBase)
    if (lineNet != null) {
      net = roundMoney(net + lineNet)
    }
  }

  if (tdsAmount <= PAYMENT_MONEY_EPS && invoiceBase > PAYMENT_MONEY_EPS && base > PAYMENT_MONEY_EPS) {
    tdsAmount = roundMoney((invoiceTds * base) / invoiceBase)
  }
  if (net <= PAYMENT_MONEY_EPS) {
    net = roundMoney(base + labourCessAmount + gstAmount - tdsAmount)
  }

  return { base, labourCessAmount, gstAmount, tdsAmount, net }
}

function resolveClientLineAmountsByHeaderFallback(
  inv: ClientInvoice,
  milestoneId: string,
): ClientLineAmounts | null {
  const lineItems = (inv.lineItems ?? []).filter((li) => li.milestoneId?.trim())
  if (lineItems.length === 0) return null

  const byId = new Map<string, number>()
  for (const li of lineItems) {
    const id = li.milestoneId!.trim()
    byId.set(id, roundMoney((byId.get(id) ?? 0) + (li.amount ?? 0)))
  }

  const baseLines = [...byId.entries()].map(([id, base]) => ({ milestoneId: id, base }))
  if (!baseLines.some((line) => line.milestoneId === milestoneId)) return null

  const headerBase = inv.baseAmount ?? 0
  const headerLabourCess = inv.labourCessAmount ?? 0
  const headerGst = inv.gstAmount ?? 0
  const headerTds = inv.tdsAmount ?? 0
  const headerNet = clientInvoiceHeaderNet(inv)

  const baseMap = distributeAmountByBaseProportion(baseLines, headerBase)
  const labourMap = distributeAmountByBaseProportion(baseLines, headerLabourCess)
  const gstMap = distributeAmountByBaseProportion(baseLines, headerGst)
  const tdsMap = distributeAmountByBaseProportion(baseLines, headerTds)
  const netMap = distributeAmountByBaseProportion(baseLines, headerNet)

  return {
    base: baseMap.get(milestoneId) ?? 0,
    labourCessAmount: labourMap.get(milestoneId) ?? 0,
    gstAmount: gstMap.get(milestoneId) ?? 0,
    tdsAmount: tdsMap.get(milestoneId) ?? 0,
    net: netMap.get(milestoneId) ?? 0,
  }
}

/** Resolve one invoice line's tax breakdown for Project Live Receivable display. */
export function resolveClientLineAmountsFromInvoice(
  inv: ClientInvoice,
  milestoneId: string,
): ClientLineAmounts | null {
  const id = milestoneId.trim()
  if (!id) return null

  const matched = (inv.lineItems ?? []).filter((li) => li.milestoneId?.trim() === id)
  if (matched.length > 0) {
    const amounts = resolveClientLineAmountsFromMatchedItems(matched, inv)
    const needsFallback =
      matched.some(
        (li) =>
          resolveAuthoritativeClientLineNetFromItem(li, inv.tdsAmount ?? 0, inv.baseAmount ?? 0) ==
          null,
      ) && (inv.lineItems?.length ?? 0) > 1
    if (needsFallback) {
      return resolveClientLineAmountsByHeaderFallback(inv, id) ?? amounts
    }
    return amounts
  }

  if (inv.milestoneId?.trim() === id) {
    return {
      base: inv.baseAmount ?? 0,
      labourCessAmount: inv.labourCessAmount ?? 0,
      gstAmount: inv.gstAmount ?? 0,
      tdsAmount: inv.tdsAmount ?? 0,
      net: clientInvoiceHeaderNet(inv),
    }
  }

  return null
}

export function deriveRowPaymentPhase(
  lineNet: number,
  linePaid: number,
): 'unpaid' | 'partially_paid' | 'paid' {
  if (linePaid + PAYMENT_MONEY_EPS >= lineNet) return 'paid'
  if (linePaid > PAYMENT_MONEY_EPS) return 'partially_paid'
  return 'unpaid'
}

export function deriveInvoiceSettlementStatus(
  invoiceNet: number,
  totalPaid: number,
): 'not_paid' | 'partially_paid' | 'paid' {
  if (totalPaid <= PAYMENT_MONEY_EPS) return 'not_paid'
  if (totalPaid + PAYMENT_MONEY_EPS >= invoiceNet) return 'paid'
  return 'partially_paid'
}
