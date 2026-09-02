export type VendorInvoiceUploadLineItem = {
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  amount: number
}

export type VendorInvoiceUploadMilestoneOption = {
  milestoneId: string
  milestoneName: string
  serviceId: string
  value: number
  isRetention: boolean
  billableAmount: number
  disabled: boolean
}

export function toggleSelectedMilestoneIds(current: string[], milestoneId: string): string[] {
  if (!milestoneId) return current
  return current.includes(milestoneId)
    ? current.filter((id) => id !== milestoneId)
    : [...current, milestoneId]
}

/** Whether to apply row-entry initial milestone once PO is available (never after user edits). */
export function shouldApplyInitialVendorMilestoneSelection(args: {
  initialMilestoneId?: string
  selectedPoId: string
  seededPoId: string | null
  selectionTouched: boolean
}): boolean {
  if (!args.initialMilestoneId || !args.selectedPoId) return false
  if (args.selectionTouched) return false
  if (args.seededPoId === args.selectedPoId) return false
  return true
}

export function initialVendorMilestoneSelection(initialMilestoneId: string): string[] {
  return [initialMilestoneId]
}

export function buildVendorInvoiceUploadLineItems(
  selectedMilestoneIds: string[],
  options: VendorInvoiceUploadMilestoneOption[],
  serviceId: string,
): VendorInvoiceUploadLineItem[] {
  const uniqueIds = [...new Set(selectedMilestoneIds.filter(Boolean))]
  const byId = new Map(options.map((m) => [m.milestoneId, m]))
  const out: VendorInvoiceUploadLineItem[] = []

  for (const milestoneId of uniqueIds) {
    const milestone = byId.get(milestoneId)
    if (!milestone || milestone.disabled) continue
    const amount = milestone.billableAmount
    if (amount <= 0) continue
    out.push({
      milestoneId: milestone.milestoneId,
      milestoneName: milestone.milestoneName,
      serviceId,
      serviceName: serviceId,
      amount,
    })
  }

  return out
}

/** Selected milestone IDs that cannot become invoice lines (disabled / zero billable). */
export function countUnbuildableVendorMilestoneSelections(
  selectedMilestoneIds: string[],
  options: VendorInvoiceUploadMilestoneOption[],
): number {
  const uniqueIds = [...new Set(selectedMilestoneIds.filter(Boolean))]
  const byId = new Map(options.map((m) => [m.milestoneId, m]))
  let skipped = 0
  for (const milestoneId of uniqueIds) {
    const milestone = byId.get(milestoneId)
    if (!milestone || milestone.disabled || milestone.billableAmount <= 0) skipped++
  }
  return skipped
}

export function sumVendorInvoiceLineItemAmounts(
  lineItems: Array<Pick<VendorInvoiceUploadLineItem, 'amount'>>,
): number {
  return lineItems.reduce((sum, li) => sum + Number(li.amount || 0), 0)
}

export function buildMilestoneUploadOptions(
  milestones: Array<{
    milestoneId: string
    milestoneName: string
    serviceId: string
    value: number
    isRetention: boolean
  }>,
  getBillableAmount: (milestoneId: string) => number,
  isDisabled: (milestoneId: string) => boolean,
): VendorInvoiceUploadMilestoneOption[] {
  return milestones.map((m) => ({
    milestoneId: m.milestoneId,
    milestoneName: m.milestoneName,
    serviceId: m.serviceId,
    value: m.value,
    isRetention: m.isRetention,
    billableAmount: getBillableAmount(m.milestoneId),
    disabled: isDisabled(m.milestoneId),
  }))
}
