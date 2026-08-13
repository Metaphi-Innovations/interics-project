import type { Baseline, ClientPO, VendorPO } from '@/slices/baseline/reducer'
import type { PitchCategory, PitchService } from '@/slices/pitch/reducer'
import type { ClientInvoice, Expense, VendorInvoice, VendorPayment } from '@/slices/live/types'
import {
  balancePending,
  isDueDateOverdue,
  MONEY_EPS,
  totalReceivedBank,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import {
  baselineVendorServiceRows,
  findVendorMapping,
  invoiceMatchesRow,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement/utils'

export const FINANCIALS_EPS = 0.01

export function baselineForProject(baseline: Baseline | null, projectId: string): Baseline | null {
  if (!baseline || baseline.projectId !== projectId) return null
  return baseline
}

export function serviceBaselineValue(baseline: Baseline, service: PitchService): number {
  const v = baseline.originalServiceValues[service.id]
  return v !== undefined ? v : service.value
}

export function invoicesForService(
  invoices: ClientInvoice[],
  projectId: string,
  serviceId: string,
): ClientInvoice[] {
  return invoices.filter((i) => i.projectId === projectId && i.serviceId === serviceId)
}

export function aggregateServiceRevenue(invoices: ClientInvoice[]): {
  invoiced: number
  received: number
} {
  let invoiced = 0
  let received = 0
  for (const inv of invoices) {
    invoiced += inv.grossAmount
    received += totalReceivedBank(inv.payments)
  }
  return { invoiced, received }
}

export function revenueRowStatus(invoices: ClientInvoice[]): string {
  if (invoices.length === 0) return 'Not Invoiced'
  const { invoiced, received } = aggregateServiceRevenue(invoices)
  let anyOverdueUnpaid = false
  let allFullySettled = true
  for (const inv of invoices) {
    const bal = balancePending(inv)
    if (bal > MONEY_EPS) {
      allFullySettled = false
      if (isDueDateOverdue(inv.dueDate)) anyOverdueUnpaid = true
    }
  }
  if (anyOverdueUnpaid) return 'Overdue'
  if (allFullySettled && invoiced > MONEY_EPS) return 'Collected'
  if (received > MONEY_EPS && invoiced - received > MONEY_EPS) return 'Partially Collected'
  if (received <= MONEY_EPS && invoiced > MONEY_EPS) return 'Invoiced'
  return 'Invoiced'
}

export interface RevenueServiceRow {
  categoryId: string
  categoryName: string
  serviceId: string
  serviceName: string
  baseline: number
  invoiced: number
  received: number
  status: string
}

export function buildRevenueBreakdown(
  baseline: Baseline,
  invoices: ClientInvoice[],
  projectId: string,
): RevenueServiceRow[] {
  const rows: RevenueServiceRow[] = []
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      const scoped = invoicesForService(invoices, projectId, svc.id)
      const { invoiced, received } = aggregateServiceRevenue(scoped)
      rows.push({
        categoryId: cat.id,
        categoryName: cat.categoryName,
        serviceId: svc.id,
        serviceName: svc.name,
        baseline: serviceBaselineValue(baseline, svc),
        invoiced,
        received,
        status: revenueRowStatus(scoped),
      })
    }
  }
  return rows
}

export function aggregateVendorRow(
  row: VendorServiceRow,
  baseline: Baseline,
  vendorInvoices: VendorInvoice[],
): { baseline: number; invoiced: number; paid: number; status: string } {
  const mapping = findVendorMapping(baseline, row.vendorId, row.serviceId)
  const base = mapping?.value ?? 0
  const scoped = vendorInvoices.filter((v) => invoiceMatchesRow(v, row))
  let invoiced = 0
  let paid = 0
  for (const inv of scoped) {
    invoiced += inv.netPayable
    if (inv.status === 'paid') paid += inv.netPayable
  }
  let status = 'Not Invoiced'
  if (scoped.length > 0) {
    const allPaid = scoped.every((i) => i.status === 'paid')
    const somePaid = scoped.some((i) => i.status === 'paid')
    if (allPaid) status = 'Settled'
    else if (somePaid) status = 'Partial'
    else status = 'Pending'
  }
  return { baseline: base, invoiced, paid, status }
}

export interface CostBreakdownRow extends VendorServiceRow {
  baseline: number
  invoiced: number
  paid: number
  status: string
}

export function buildCostBreakdown(
  baseline: Baseline,
  vendorInvoices: VendorInvoice[],
): CostBreakdownRow[] {
  const keys = baselineVendorServiceRows(baseline)
  return keys.map((row) => {
    const agg = aggregateVendorRow(row, baseline, vendorInvoices)
    return { ...row, ...agg }
  })
}

export function sumClientInvoicesGross(invoices: ClientInvoice[], projectId: string): number {
  return invoices
    .filter((i) => i.projectId === projectId)
    .reduce((s, i) => s + i.grossAmount, 0)
}

export function sumVendorPaymentsNetPaid(payments: VendorPayment[], projectId: string): number {
  return payments.filter((p) => p.projectId === projectId).reduce((s, p) => s + p.netPaid, 0)
}

export function sumExpensesAmount(expenses: Expense[], projectId: string): number {
  return expenses.filter((e) => e.projectId === projectId).reduce((s, e) => s + e.amount, 0)
}

export function sumPlannedExpensesBaseline(baseline: Baseline): number {
  return baseline.plannedExpenses.reduce((s, pe) => s + pe.amount, 0)
}

export type VarianceKind = 'revenue' | 'cost' | 'grossProfit' | 'expenses'

export interface VarianceRow {
  item: string
  kind: VarianceKind
  baseline: number
  actual: number
  variance: number
  variancePctLabel: string
  positiveIsGood: boolean
}

export function buildVarianceRows(
  baseline: Baseline | null,
  projectId: string,
  clientInvoices: ClientInvoice[],
  payments: VendorPayment[],
  expenses: Expense[],
): VarianceRow[] {
  if (!baseline || baseline.projectId !== projectId) {
    return []
  }
  const revB = baseline.totalRevenue
  const costB = baseline.totalCost
  const gpB = baseline.profitability
  const expB = sumPlannedExpensesBaseline(baseline)

  const revA = sumClientInvoicesGross(clientInvoices, projectId)
  const costA = sumVendorPaymentsNetPaid(payments, projectId)
  const gpA = revA - costA
  const expA = sumExpensesAmount(expenses, projectId)

  const pct = (variance: number, base: number): string => {
    if (Math.abs(base) < FINANCIALS_EPS) return 'N/A'
    return `${((100 * variance) / base).toFixed(1)}%`
  }

  const varRev = revA - revB
  const varCost = costB - costA
  const varGp = gpA - gpB
  const varExp = expA - expB

  return [
    {
      item: 'Revenue',
      kind: 'revenue',
      baseline: revB,
      actual: revA,
      variance: varRev,
      variancePctLabel: pct(varRev, revB),
      positiveIsGood: true,
    },
    {
      item: 'Cost',
      kind: 'cost',
      baseline: costB,
      actual: costA,
      variance: varCost,
      variancePctLabel: pct(varCost, costB),
      positiveIsGood: true,
    },
    {
      item: 'Gross Profit',
      kind: 'grossProfit',
      baseline: gpB,
      actual: gpA,
      variance: varGp,
      variancePctLabel: pct(varGp, gpB),
      positiveIsGood: true,
    },
    {
      item: 'Expenses',
      kind: 'expenses',
      baseline: expB,
      actual: expA,
      variance: varExp,
      variancePctLabel: pct(varExp, expB),
      positiveIsGood: false,
    },
  ]
}

export function varianceColorKey(row: VarianceRow): 'success' | 'error' | 'inherit' {
  if (Math.abs(row.variance) < FINANCIALS_EPS) return 'inherit'
  if (row.kind === 'expenses') {
    return row.variance > FINANCIALS_EPS ? 'error' : 'success'
  }
  if (row.positiveIsGood) {
    if (row.variance > FINANCIALS_EPS) return 'success'
    if (row.variance < -FINANCIALS_EPS) return 'error'
  }
  return 'inherit'
}

// Re-export types used by variance/revenue helpers (overview math lives on backend).
export type { ClientPO, VendorPO, PitchCategory }
