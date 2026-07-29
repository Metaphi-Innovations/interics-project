import { toSlug } from './formatters'

export type PayableFocus = 'details' | 'payment' | 'invoice' | 'compliance' | 'client-payment'

export interface ProjectPayableNavigationParams {
  projectName: string
  vendorId: string
  serviceId: string
  milestoneId?: string
  focus?: PayableFocus
}

export interface ParsedPayableContext {
  vendorId?: string
  serviceId?: string
  milestoneId?: string
  focus?: PayableFocus
}

const PAYABLE_FOCUS_VALUES: PayableFocus[] = [
  'details',
  'payment',
  'invoice',
  'compliance',
  'client-payment',
]

function isPayableFocus(value: string | null): value is PayableFocus {
  return value != null && PAYABLE_FOCUS_VALUES.includes(value as PayableFocus)
}

export function buildProjectPayablePath({
  projectName,
  vendorId,
  serviceId,
  milestoneId,
  focus = 'details',
}: ProjectPayableNavigationParams): string {
  const params = new URLSearchParams()
  params.set('tab', 'live')
  params.set('liveSubTab', 'payments')
  params.set('vendorId', vendorId)
  params.set('serviceId', serviceId)
  if (milestoneId) params.set('milestoneId', milestoneId)
  if (focus !== 'details') params.set('payableFocus', focus)
  return `/projects/${toSlug(projectName)}?${params.toString()}`
}

/** Maps finance payables action labels to deep-link focus on the Payable tab. */
export function payableFocusFromActionLabel(label: string): PayableFocus {
  switch (label) {
    case 'Upload Invoice':
      return 'invoice'
    case 'Release Payment':
      return 'payment'
    case 'View Settlement History':
    case 'View Client Payment':
    case 'View Details':
      return 'details'
    default:
      return 'details'
  }
}

export function parsePayableContext(searchParams: URLSearchParams): ParsedPayableContext {
  const focusRaw = searchParams.get('payableFocus')
  return {
    vendorId: searchParams.get('vendorId') ?? undefined,
    serviceId: searchParams.get('serviceId') ?? undefined,
    milestoneId: searchParams.get('milestoneId') ?? undefined,
    focus: isPayableFocus(focusRaw) ? focusRaw : undefined,
  }
}
