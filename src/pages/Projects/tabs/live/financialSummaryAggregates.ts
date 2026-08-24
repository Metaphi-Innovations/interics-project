import type { Baseline, ClientPO, VendorPO } from '@/slices/baseline/reducer'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'
import type { ClientInvoice, VendorInvoice } from '@/slices/live/types'
import type { PlannedExpense } from '@/slices/pitch/reducer'
import { totalReceivedBank } from './clientInvoiceUtils'
import { FINANCIALS_EPS } from '../financialsAggregates'

export interface FinancialSummaryMetrics {
  clientPOAmount: number
  clientReceived: number
  pendingReceived: number
  vendorPOAmount: number
  vendorPaid: number
  pendingPaid: number
  projectedProfitPct: number | null
  actualProfitPct: number | null
}

export interface FinancialSummaryWorkstreamRow extends FinancialSummaryMetrics {
  id: string
  workstreamName: string
}

export interface FinancialSummaryCategoryGroup {
  id: string
  name: string
  children: FinancialSummaryWorkstreamRow[]
  subtotal: FinancialSummaryMetrics
}

export interface OfficeExpenseRow {
  id: string
  name: string
  date: string | undefined
  amount: number
}

export type FinancialSummarySortField =
  | 'workstream'
  | 'clientPOAmount'
  | 'clientReceived'
  | 'pendingReceived'
  | 'vendorPOAmount'
  | 'vendorPaid'
  | 'pendingPaid'
  | 'projectedProfitPct'
  | 'actualProfitPct'

export function projectedProfitPct(clientPO: number, vendorPO: number): number | null {
  if (clientPO <= FINANCIALS_EPS) return null
  return ((clientPO - vendorPO) / clientPO) * 100
}

export function actualProfitPct(clientReceived: number, vendorPaid: number): number | null {
  if (clientReceived <= FINANCIALS_EPS) return null
  return ((clientReceived - vendorPaid) / clientReceived) * 100
}

export function buildFinancialSummaryMetrics(
  clientPOAmount: number,
  clientReceived: number,
  vendorPOAmount: number,
  vendorPaid: number,
): FinancialSummaryMetrics {
  return {
    clientPOAmount,
    clientReceived,
    pendingReceived: clientPOAmount - clientReceived,
    vendorPOAmount,
    vendorPaid,
    pendingPaid: vendorPOAmount - vendorPaid,
    projectedProfitPct: projectedProfitPct(clientPOAmount, vendorPOAmount),
    actualProfitPct: actualProfitPct(clientReceived, vendorPaid),
  }
}

function sumMetrics(rows: FinancialSummaryWorkstreamRow[]): FinancialSummaryMetrics {
  const clientPOAmount = rows.reduce((s, r) => s + r.clientPOAmount, 0)
  const clientReceived = rows.reduce((s, r) => s + r.clientReceived, 0)
  const vendorPOAmount = rows.reduce((s, r) => s + r.vendorPOAmount, 0)
  const vendorPaid = rows.reduce((s, r) => s + r.vendorPaid, 0)
  return buildFinancialSummaryMetrics(clientPOAmount, clientReceived, vendorPOAmount, vendorPaid)
}

function clientPOAmountByService(clientPOs: ClientPO[], projectId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const po of clientPOs.filter((p) => p.projectId === projectId)) {
    for (const m of po.milestones ?? []) {
      if (!m.serviceId?.trim()) continue
      const amount = m.value + (m.retention?.value ?? 0)
      map.set(m.serviceId, (map.get(m.serviceId) ?? 0) + amount)
    }
  }
  return map
}

function vendorPOAmountByService(vendorPOs: VendorPO[], projectId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const po of vendorPOs.filter((p) => p.projectId === projectId)) {
    const linked = po.linkedBaselineServiceIds ?? []
    if (linked.length === 0) continue
    const share = vendorPoEffectiveValue(po) / linked.length
    for (const serviceId of linked) {
      map.set(serviceId, (map.get(serviceId) ?? 0) + share)
    }
  }
  return map
}

function clientReceivedByService(
  invoices: ClientInvoice[],
  projectId: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const inv of invoices.filter((i) => i.projectId === projectId)) {
    const received = totalReceivedBank(inv.payments)
    if (received <= 0) continue
    map.set(inv.serviceId, (map.get(inv.serviceId) ?? 0) + received)
  }
  return map
}

function vendorPaidByService(
  vendorInvoices: VendorInvoice[],
  projectId: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const inv of vendorInvoices.filter((v) => v.projectId === projectId)) {
    if (inv.status !== 'paid') continue
    map.set(inv.serviceId, (map.get(inv.serviceId) ?? 0) + inv.netPayable)
  }
  return map
}

export function officeExpensesFromPitch(planned: PlannedExpense[] | undefined): PlannedExpense[] {
  return (planned ?? []).filter((pe) => pe.type === 'office_expenses')
}

export function buildOfficeExpenseRows(planned: PlannedExpense[]): OfficeExpenseRow[] {
  return planned.map((pe) => ({
    id: pe.id,
    name: pe.name,
    date: pe.date,
    amount: pe.amount,
  }))
}

export function buildFinancialSummaryGroups(
  baseline: Baseline | null,
  projectId: string,
  clientPOs: ClientPO[],
  vendorPOs: VendorPO[],
  clientInvoices: ClientInvoice[],
  vendorInvoices: VendorInvoice[],
): FinancialSummaryCategoryGroup[] {
  if (!baseline || baseline.projectId !== projectId) return []

  const clientPOMap = clientPOAmountByService(clientPOs, projectId)
  const clientReceivedMap = clientReceivedByService(clientInvoices, projectId)
  const vendorPOMap = vendorPOAmountByService(vendorPOs, projectId)
  const vendorPaidMap = vendorPaidByService(vendorInvoices, projectId)

  return baseline.categories.map((cat) => {
    const children: FinancialSummaryWorkstreamRow[] = cat.services.map((svc) => {
      const clientPOAmount = clientPOMap.get(svc.id) ?? 0
      const clientReceived = clientReceivedMap.get(svc.id) ?? 0
      const vendorPOAmount = vendorPOMap.get(svc.id) ?? 0
      const vendorPaid = vendorPaidMap.get(svc.id) ?? 0
      return {
        id: svc.id,
        workstreamName: svc.subcategoryName ?? svc.name ?? svc.customName ?? '—',
        ...buildFinancialSummaryMetrics(
          clientPOAmount,
          clientReceived,
          vendorPOAmount,
          vendorPaid,
        ),
      }
    })

    return {
      id: cat.id,
      name: cat.categoryName,
      children,
      subtotal: sumMetrics(children),
    }
  })
}

export function buildFinancialSummaryTotal(
  groups: FinancialSummaryCategoryGroup[],
): FinancialSummaryMetrics {
  const allChildren = groups.flatMap((g) => g.children)
  return sumMetrics(allChildren)
}

export function sortWorkstreamRows(
  rows: FinancialSummaryWorkstreamRow[],
  field: FinancialSummarySortField,
  direction: 'asc' | 'desc',
): FinancialSummaryWorkstreamRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (field === 'workstream') {
      return factor * a.workstreamName.localeCompare(b.workstreamName)
    }
    const av = a[field] ?? Number.NEGATIVE_INFINITY
    const bv = b[field] ?? Number.NEGATIVE_INFINITY
    return factor * (av - bv)
  })
}
