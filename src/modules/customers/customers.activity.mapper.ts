import type { ActivityEntry, ActivityType, CustomerFinancialDetails } from '@/slices/customers/reducer'

export type CustomerActivityApiItem = {
  id: string
  type: string
  title: string
  description: string
  performedBy: { id: string; name: string }
  createdAt: string
}

export type CustomerActivityApiSection = {
  type: string
  items: CustomerActivityApiItem[]
  total: number
}

export type CustomerFinancialApi = {
  totalBilled: number
  amountReceived: number
  outstanding: number
  tdsWithheld: number
  activeProjects: number
  completedProjects: number
  totalProjectValue: number
  lastInvoiceDate: string | null
  paymentTerms?: string | null
  creditLimit?: number | null
  gstStatus?: string | null
}

const DOCUMENT_ACTIONS = new Set([
  'DOCUMENT_UPLOADED',
  'DOCUMENT_UPDATED',
  'GST_DOCUMENT_UPLOADED',
  'GST_DOCUMENT_UPDATED',
  'GST_DOCUMENT_DELETED',
  'PAN_DOCUMENT_UPLOADED',
  'PAN_DOCUMENT_UPDATED',
  'PAN_DOCUMENT_DELETED',
  'DOCUMENT_VIEWED',
  'DOCUMENT_DOWNLOADED',
])

const FINANCIAL_ACTIONS = new Set([
  'INVOICE_CREATED',
  'INVOICE_UPDATED',
  'INVOICE_PAID',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECORDED',
  'OUTSTANDING_UPDATED',
])

export function mapAuditActionToActivityType(action: string): ActivityType {
  switch (action) {
    case 'CUSTOMER_CREATED':
      return 'record_created'
    case 'CUSTOMER_UPDATED':
    case 'CUSTOMER_RESTORED':
      return 'profile_edited'
    case 'CUSTOMER_ACTIVATED':
    case 'CUSTOMER_DEACTIVATED':
      return 'status_changed'
    case 'CONTACT_CREATED':
    case 'CONTACT_ACTIVATED':
      return 'contact_added'
    case 'CONTACT_DELETED':
    case 'CONTACT_DEACTIVATED':
      return 'contact_removed'
    case 'CONTACT_UPDATED':
    case 'PRIMARY_CONTACT_ASSIGNED':
    case 'PRIMARY_CONTACT_REMOVED':
    case 'PRIMARY_CONTACT_CHANGED':
      return 'primary_changed'
    default:
      if (DOCUMENT_ACTIONS.has(action)) return 'document_uploaded'
      if (FINANCIAL_ACTIONS.has(action)) return 'financial'
      return 'profile_edited'
  }
}

/** Prefer a concise title; fall back to description from the API. */
export function toActivityEntry(item: CustomerActivityApiItem): ActivityEntry {
  const type = mapAuditActionToActivityType(item.type)
  return {
    id: item.id,
    type,
    description: formatActivityLabel(item, type),
    user: item.performedBy?.name?.trim() || 'System',
    timestamp: item.createdAt,
  }
}

function formatActivityLabel(item: CustomerActivityApiItem, type: ActivityType): string {
  if (type === 'record_created') return 'Customer record created'
  if (type === 'profile_edited') {
    if (item.type === 'CUSTOMER_UPDATED') return 'Customer details updated'
    return item.title?.trim() || item.description
  }
  if (type === 'status_changed') {
    if (item.type === 'CUSTOMER_ACTIVATED') return 'Customer activated'
    if (item.type === 'CUSTOMER_DEACTIVATED') return 'Customer deactivated'
    return item.title?.trim() || item.description
  }
  if (type === 'contact_added') {
    const match = item.description.match(/^(.+?) was added/i)
    if (match?.[1]) return `Contact added — ${match[1].trim()}`
  }
  if (type === 'document_uploaded') {
    const actionVerb =
      /updated/i.test(item.type) || /updated/i.test(item.description)
        ? 'updated'
        : /deleted/i.test(item.type) || /deleted/i.test(item.description)
          ? 'deleted'
          : 'uploaded'
    if (/gst/i.test(item.type) || /gst/i.test(item.description)) {
      return `GST Certificate ${actionVerb}`
    }
    if (/pan/i.test(item.type) || /pan/i.test(item.description)) {
      return `PAN document ${actionVerb}`
    }
    const fileMatch = item.description.match(/^(.+?) (uploaded|updated|viewed|downloaded|deleted)/i)
    if (fileMatch?.[1]) return `${capitalizeWords(fileMatch[1])} ${fileMatch[2].toLowerCase()}`
    return item.title?.trim() || item.description
  }
  return item.title?.trim() || item.description
}

function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function toFinancialDetails(
  api: CustomerFinancialApi,
  fallbackGstStatus = '',
): CustomerFinancialDetails {
  return {
    totalBilled: api.totalBilled ?? 0,
    amountReceived: api.amountReceived ?? 0,
    outstanding: api.outstanding ?? 0,
    tdsWithheld: api.tdsWithheld ?? 0,
    activeProjects: api.activeProjects ?? 0,
    completedProjects: api.completedProjects ?? 0,
    totalProjectValue: api.totalProjectValue ?? 0,
    lastInvoiceDate: api.lastInvoiceDate ?? '',
    paymentTerms: api.paymentTerms ?? '',
    creditLimit: api.creditLimit ?? null,
    gstStatus: api.gstStatus ?? fallbackGstStatus,
  }
}
