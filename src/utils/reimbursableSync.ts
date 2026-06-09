import type { CreateReimbursementBody } from '@/api/liveApi'
import type { Expense, ExpenseType, Reimbursement } from '@/slices/live/types'
import type { PlannedExpense, PitchVersion } from '@/slices/pitch/reducer'

/**
 * Financial rule: reimbursable amounts are vendor out-of-pocket costs repaid on top of
 * milestone invoices (payment additions in settlement). Payables only settle
 * Reimbursement records — every reimbursable_expenses Expense must sync to one.
 */
export const REIMBURSABLE_EXPENSE_TYPE: ExpenseType = 'reimbursable_expenses'

export function isReimbursableExpenseType(type: ExpenseType | PlannedExpense['type']): boolean {
  return type === REIMBURSABLE_EXPENSE_TYPE
}

function buildVendorNameById(version: PitchVersion | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!version) return out
  for (const cat of version.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings) {
        out[vm.vendorId] = vm.vendorName
      }
    }
  }
  return out
}

type ReimbursableSource = Pick<
  Expense,
  | 'id'
  | 'description'
  | 'amount'
  | 'date'
  | 'documentUrl'
  | 'vendorId'
  | 'vendorName'
  | 'serviceId'
  | 'serviceName'
  | 'milestoneId'
  | 'milestoneName'
  | 'sourcePlannedExpenseId'
>

export function reimbursableExpenseToReimbursementBody(
  expense: ReimbursableSource,
): CreateReimbursementBody {
  if (!expense.vendorId || !expense.serviceId) {
    throw new Error('Reimbursable expense requires vendorId and serviceId')
  }
  return {
    vendorId: expense.vendorId,
    vendorName: expense.vendorName ?? expense.vendorId,
    serviceId: expense.serviceId,
    serviceName: expense.serviceName ?? expense.serviceId,
    milestoneId: expense.milestoneId,
    milestoneName: expense.milestoneName,
    description: expense.description,
    amount: expense.amount,
    date: expense.date,
    documentUrl: expense.documentUrl,
    status: 'pending',
    sourceExpenseId: expense.id,
    sourcePlannedExpenseId: expense.sourcePlannedExpenseId,
  }
}

export function plannedReimbursableToReimbursementBody(
  planned: PlannedExpense,
  version: PitchVersion | null | undefined,
): CreateReimbursementBody {
  const vendorNameById = buildVendorNameById(version)
  if (!planned.vendorId || !planned.serviceId) {
    throw new Error('Planned reimbursable expense requires vendorId and serviceId')
  }
  return {
    vendorId: planned.vendorId,
    vendorName: vendorNameById[planned.vendorId] ?? planned.vendorId,
    serviceId: planned.serviceId,
    serviceName: planned.serviceName ?? planned.serviceId,
    milestoneId: planned.milestoneId,
    milestoneName: planned.milestoneName,
    description: planned.name,
    amount: planned.amount,
    date: planned.date ?? new Date().toISOString().slice(0, 10),
    documentUrl: planned.documentUrl,
    status: 'pending',
    sourcePlannedExpenseId: planned.id,
  }
}

export function findReimbursementForExpense(
  reimbursements: Reimbursement[],
  expenseId: string,
): Reimbursement | undefined {
  return reimbursements.find((r) => r.sourceExpenseId === expenseId)
}

export function findReimbursementForPlannedExpense(
  reimbursements: Reimbursement[],
  plannedExpenseId: string,
): Reimbursement | undefined {
  return reimbursements.find((r) => r.sourcePlannedExpenseId === plannedExpenseId)
}
