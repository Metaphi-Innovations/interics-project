/** Labels exposed in the Project Live Payable milestone listing action menu. */
export function payableListingMenuLabels(options: {
  isBilled: boolean
  showViewInvoice: boolean
  showRecordPayment: boolean
}): string[] {
  const items: string[] = []
  if (!options.isBilled) items.push('Upload Invoice')
  if (options.showViewInvoice) items.push('View Invoice')
  if (options.showRecordPayment) items.push('Record Payment')
  return items
}

export function payableListingMenuIncludesDelete(): boolean {
  return false
}

/** View Invoice is available whenever a covering vendor invoice exists (independent of payment status). */
export function shouldShowPayableViewInvoice(
  billingPhase: 'not_invoiced' | 'invoiced',
): boolean {
  return billingPhase === 'invoiced'
}

/** Record Payment is available when invoiced and not fully paid (no Draft/Tax checks). */
export function shouldShowPayableRecordPayment(
  billingPhase: 'not_invoiced' | 'invoiced',
  paymentPhase: 'unpaid' | 'partially_paid' | 'paid',
): boolean {
  return billingPhase === 'invoiced' && paymentPhase !== 'paid'
}

/** Whether the action-menu trigger (⋮) should render for a milestone row. */
export function shouldRenderProjectLiveActionMenuTrigger(
  visibleItemCount: number,
  alwaysShowTrigger: boolean,
): boolean {
  return alwaysShowTrigger || visibleItemCount > 0
}

/** Payable rows with alwaysShowTrigger must never disable the menu trigger based on item visibility. */
export function isPayableActionMenuTriggerDisabled(
  visibleItemCount: number,
  alwaysShowTrigger: boolean,
): boolean {
  return !alwaysShowTrigger && visibleItemCount === 0
}
