import type { Expense } from '@/slices/live/types'

export function commonExpenseAmountForVendor(e: Expense, vendorId: string): number {
  const row = e.vendorAllocations?.find((a) => a.vendorId === vendorId)
  return row?.allocationAmount ?? 0
}

/** Whether this vendor participates in recovering their expense share. */
export function isVendorIncludedInCommonRecovery(e: Expense, vendorId: string): boolean {
  const row = e.vendorAllocations?.find((a) => a.vendorId === vendorId)
  if (!row) return false
  return row.includedInRecovery !== false
}

/**
 * Expense Share deducted from a vendor invoice when selected in Allocated To.
 * Uses allocationAmount (normalized expense share), not PO Ratio.
 */
export function commonExpenseInvoiceDeduction(e: Expense, vendorId: string): number {
  if (e.type !== 'common') return 0
  if (!isVendorIncludedInCommonRecovery(e, vendorId)) return 0
  return Math.max(0, commonExpenseAmountForVendor(e, vendorId))
}
