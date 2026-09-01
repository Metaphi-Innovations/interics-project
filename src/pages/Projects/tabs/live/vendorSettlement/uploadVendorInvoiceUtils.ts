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
