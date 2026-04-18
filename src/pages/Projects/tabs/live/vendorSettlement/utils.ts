import { tokens } from '@/design-system/tokens'
import type { Expense, Reimbursement, VendorInvoice, VendorPayment } from '@/slices/live/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import type { PitchService, VendorMilestone } from '@/slices/pitch/reducer'

export interface VendorServiceRow {
  vendorId: string
  vendorName: string
  serviceId: string
  serviceName: string
}

export const DEFAULT_TDS_PERCENT = 10

export const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: '10px',
  px: 2,
}

export const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: '12px',
  px: 2,
}

export function vendorServiceKey(row: VendorServiceRow): string {
  return `${row.vendorId}::${row.serviceId}`
}

export function globalVendorContextKey(projectId: string, row: VendorServiceRow): string {
  return `${projectId}::${row.vendorId}::${row.serviceId}`
}

export function baselineVendorServiceRows(baseline: Baseline | null): VendorServiceRow[] {
  if (!baseline) return []
  const rows: VendorServiceRow[] = []
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      for (const m of svc.vendorMappings) {
        rows.push({
          vendorId: m.vendorId,
          vendorName: m.vendorName,
          serviceId: svc.id,
          serviceName: svc.name,
        })
      }
    }
  }
  return rows.sort((a, b) => {
    const c = a.vendorName.localeCompare(b.vendorName)
    return c !== 0 ? c : a.serviceName.localeCompare(b.serviceName)
  })
}

export function invoiceMatchesRow(inv: VendorInvoice, row: VendorServiceRow): boolean {
  return inv.vendorId === row.vendorId && inv.serviceId === row.serviceId
}

export function findPitchService(baseline: Baseline | null, serviceId: string): PitchService | undefined {
  if (!baseline) return undefined
  for (const cat of baseline.categories) {
    const s = cat.services.find((svc) => svc.id === serviceId)
    if (s) return s
  }
  return undefined
}

export function findVendorMapping(baseline: Baseline | null, vendorId: string, serviceId: string) {
  const svc = findPitchService(baseline, serviceId)
  return svc?.vendorMappings.find((m) => m.vendorId === vendorId)
}

export function findInvoiceForMilestone(
  scopedInvoices: VendorInvoice[],
  vm: VendorMilestone,
): VendorInvoice | undefined {
  return (
    scopedInvoices.find((inv) => inv.milestoneId === vm.id) ??
    scopedInvoices.find((inv) => inv.milestoneName.trim() === vm.name.trim())
  )
}

export type MilestoneRowState = 1 | 2 | 3

export function milestoneRowState(inv: VendorInvoice | undefined): MilestoneRowState {
  if (!inv) return 1
  if (inv.status === 'paid') return 3
  return 2
}

export function reimbMatchesRow(r: Reimbursement, row: VendorServiceRow): boolean {
  return r.vendorId === row.vendorId && r.serviceId === row.serviceId
}

export function vendorLinkedExpenseMatchesRow(e: Expense, row: VendorServiceRow): boolean {
  if (e.type !== 'vendor_linked') return false
  if (e.vendorId !== row.vendorId) return false
  if (e.serviceId === row.serviceId) return true
  return e.serviceId === undefined || e.serviceId === ''
}

export function commonExpenseAmountForVendor(e: Expense, vendorId: string): number {
  const row = e.vendorAllocations?.find((a) => a.vendorId === vendorId)
  return row?.allocationAmount ?? 0
}

export function expenseRowsForVendor(
  expenses: Expense[],
  row: VendorServiceRow,
): { expense: Expense; amount: number; kind: 'vendor_linked' | 'common' }[] {
  const out: { expense: Expense; amount: number; kind: 'vendor_linked' | 'common' }[] = []
  for (const e of expenses) {
    if (e.status !== 'pending') continue
    if (e.type === 'vendor_linked' && vendorLinkedExpenseMatchesRow(e, row)) {
      out.push({ expense: e, amount: e.amount, kind: 'vendor_linked' })
    }
    if (e.type === 'common' && e.vendorAllocations?.some((a) => a.vendorId === row.vendorId)) {
      const amt = commonExpenseAmountForVendor(e, row.vendorId)
      if (amt > 0) out.push({ expense: e, amount: amt, kind: 'common' })
    }
  }
  return out
}

export function itemsSummary(p: VendorPayment): string {
  const ni = p.linkedInvoiceIds.length
  const ne = p.linkedExpenseIds.length
  const nr = p.linkedReimbursementIds.length
  const parts: string[] = []
  if (ni) parts.push(`${ni} invoice${ni === 1 ? '' : 's'}`)
  if (ne) parts.push(`${ne} expense${ne === 1 ? '' : 's'}`)
  if (nr) parts.push(`${nr} reimbursement${nr === 1 ? '' : 's'}`)
  return parts.length ? parts.join(', ') : '—'
}

export interface CardCounts {
  pendingInv: number
  pendingExp: number
  pendingRmb: number
  pendingExpAmount: number
  pendingRmbAmount: number
  outstanding: number
  allSettled: boolean
}

export type RowSettlementStatus = 'settled' | 'partially_paid' | 'payment_pending'

export function paymentTouchesRow(
  payment: VendorPayment,
  projectId: string,
  row: VendorServiceRow,
  vendorInvoices: VendorInvoice[],
  expenses: Expense[],
  reimbursements: Reimbursement[],
): boolean {
  if (payment.projectId !== projectId || payment.vendorId !== row.vendorId) return false

  for (const id of payment.linkedInvoiceIds) {
    const inv = vendorInvoices.find((i) => i.id === id)
    if (inv && invoiceMatchesRow(inv, row)) return true
  }

  for (const id of payment.linkedExpenseIds) {
    const e = expenses.find((x) => x.id === id)
    if (!e || e.projectId !== projectId) continue
    if (expenseRowsForVendor([e], row).length > 0) return true
  }

  for (const id of payment.linkedReimbursementIds) {
    const r = reimbursements.find((x) => x.id === id)
    if (r && reimbMatchesRow(r, row)) return true
  }

  return false
}

export function rowSettlementStatus(
  counts: CardCounts,
  projectId: string,
  row: VendorServiceRow,
  payments: VendorPayment[],
  vendorInvoices: VendorInvoice[],
  expenses: Expense[],
  reimbursements: Reimbursement[],
): RowSettlementStatus {
  if (counts.allSettled) return 'settled'
  const touched = payments.some((p) =>
    paymentTouchesRow(p, projectId, row, vendorInvoices, expenses, reimbursements),
  )
  if (touched) return 'partially_paid'
  return 'payment_pending'
}

export function computeVendorCardCounts(
  baselineForProject: Baseline | null,
  projectInvoices: VendorInvoice[],
  projectExpenses: Expense[],
  projectReimb: Reimbursement[],
  row: VendorServiceRow,
): CardCounts {
  const mapping = findVendorMapping(baselineForProject, row.vendorId, row.serviceId)
  const milestones = mapping?.milestones ?? []
  const scoped = projectInvoices.filter((inv) => invoiceMatchesRow(inv, row))
  let uninvoicedM = 0
  let pendingInv = 0
  for (const vm of milestones) {
    const inv = findInvoiceForMilestone(scoped, vm)
    if (!inv) uninvoicedM += 1
    else if (inv.status !== 'paid') pendingInv += 1
  }
  const exRows = expenseRowsForVendor(projectExpenses, row)
  const pendingExp = exRows.length
  const rmbs = projectReimb.filter((r) => reimbMatchesRow(r, row))
  const pendingRmb = rmbs.filter((r) => r.status === 'pending').length
  const invNet = scoped.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.netPayable, 0)
  const rmbSum = rmbs.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const expSum = exRows.reduce((s, x) => s + x.amount, 0)
  const outstanding = Math.max(0, invNet + rmbSum - expSum)
  const allSettled =
    uninvoicedM === 0 && pendingInv === 0 && pendingExp === 0 && pendingRmb === 0
  return {
    pendingInv,
    pendingExp,
    pendingRmb,
    pendingExpAmount: expSum,
    pendingRmbAmount: rmbSum,
    outstanding,
    allSettled,
  }
}
