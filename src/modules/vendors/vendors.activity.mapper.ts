import type { ActivityEntry, ActivityType } from '@/slices/customers/reducer'

export type VendorActivityApiItem = {
  id: string
  type: string
  title: string
  description: string
  performedBy: { id: string; name: string }
  createdAt: string
}

export type VendorActivityApiSection = {
  type: string
  items: VendorActivityApiItem[]
  total: number
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
    case 'VENDOR_CREATED':
      return 'record_created'
    case 'VENDOR_UPDATED':
    case 'VENDOR_RESTORED':
      return 'profile_edited'
    case 'VENDOR_ACTIVATED':
    case 'VENDOR_DEACTIVATED':
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
export function toActivityEntry(item: VendorActivityApiItem): ActivityEntry {
  const type = mapAuditActionToActivityType(item.type)
  return {
    id: item.id,
    type,
    description: formatActivityLabel(item, type),
    user: item.performedBy?.name?.trim() || 'System',
    timestamp: item.createdAt,
  }
}

function formatActivityLabel(item: VendorActivityApiItem, type: ActivityType): string {
  if (type === 'record_created') return 'Vendor record created'
  if (type === 'profile_edited') {
    if (item.type === 'VENDOR_UPDATED') return 'Vendor details updated'
    return item.title?.trim() || item.description
  }
  if (type === 'status_changed') {
    if (item.type === 'VENDOR_ACTIVATED') return 'Vendor activated'
    if (item.type === 'VENDOR_DEACTIVATED') return 'Vendor deactivated'
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
