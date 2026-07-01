import type { CreateExpenseBody } from '@/api/liveApi'
import type { PlannedExpense, PitchVersion } from '@/slices/pitch/reducer'
import type { ExpenseType } from '@/slices/live/types'

function toLiveExpenseType(type: PlannedExpense['type']): ExpenseType {
  switch (type) {
    case 'vendor':
      return 'vendor_linked'
    case 'additional':
    case 'common':
    case 'office_expenses':
    case 'reimbursable_expenses':
      return type
  }
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

const todayIso = () => new Date().toISOString().slice(0, 10)

export function plannedExpenseToLiveCreateBody(
  planned: PlannedExpense,
  version: PitchVersion | null | undefined,
): CreateExpenseBody {
  const vendorNameById = buildVendorNameById(version)
  const type = toLiveExpenseType(planned.type)
  const date = planned.date || todayIso()

  return {
    sourcePlannedExpenseId: planned.id,
    type,
    description: planned.name,
    amount: planned.amount,
    date,
    documentUrl: planned.documentUrl,
    vendorId: planned.vendorId,
    vendorName: planned.vendorId ? vendorNameById[planned.vendorId] ?? planned.vendorId : undefined,
    serviceId: planned.serviceId,
    serviceName: planned.serviceName,
    milestoneId: planned.milestoneId,
    milestoneName: planned.milestoneName,
    vendorAllocations:
      planned.type === 'common' && planned.vendorSplits?.length
        ? planned.vendorSplits.map((s) => ({
            vendorId: s.vendorId,
            vendorName: vendorNameById[s.vendorId] ?? s.vendorId,
            allocationPercent: s.percentage,
            allocationAmount: s.amount,
          }))
        : undefined,
    splitMethod: planned.splitMethod,
    paidByVendorId: planned.paidByVendorId,
    paidByVendorName: planned.paidByVendorName,
    status: 'pending',
  }
}
