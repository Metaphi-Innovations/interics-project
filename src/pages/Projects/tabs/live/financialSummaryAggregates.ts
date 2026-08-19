import type { Baseline, ClientPO, ClientPOMilestone, VendorPO } from '@/slices/baseline/reducer'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'
import type { ClientInvoice, Expense, VendorInvoice } from '@/slices/live/types'
import type { PlannedExpense } from '@/slices/pitch/reducer'
import type { Service } from '@/slices/settings/reducer'
import {
  clientMilestoneBaseGross,
  clientMilestoneGross,
  isInvoiceFullyPaid,
} from './clientInvoiceUtils'
import { clientMilestonePaymentStatus, vendorMilestonePaymentStatus } from './milestonePaymentStatus'
import { FINANCIALS_EPS } from '../financialsAggregates'

// Types are now defined in financialSummaryTypes.ts — re-export for backward compat.
export type {
  FinancialSummaryMetrics,
  FinancialSummaryWorkstreamRow,
  FinancialSummaryCategoryGroup,
  FinancialSummarySortField,
  ServiceCatalogEntry,
} from './financialSummaryTypes'

import type {
  FinancialSummaryMetrics,
  FinancialSummaryWorkstreamRow,
  FinancialSummaryCategoryGroup,
  FinancialSummarySortField,
  ServiceCatalogEntry,
} from './financialSummaryTypes'

export function projectedProfitPct(clientPO: number, vendorPO: number): number | null {
  if (clientPO <= FINANCIALS_EPS) return null
  return ((clientPO - vendorPO) / clientPO) * 100
}

export function actualProfitPct(clientReceived: number, vendorPaid: number): number | null {
  if (clientReceived <= FINANCIALS_EPS) return null
  return ((clientReceived - vendorPaid) / clientReceived) * 100
}

export function buildFinancialSummaryMetrics(
  clientPOAmount: number,
  clientReceived: number,
  vendorPOAmount: number,
  vendorPaid: number,
  pendingReceived = clientPOAmount - clientReceived,
  pendingPaid = vendorPOAmount - vendorPaid,
): FinancialSummaryMetrics {
  return {
    clientPOAmount,
    clientReceived,
    pendingReceived,
    vendorPOAmount,
    vendorPaid,
    pendingPaid,
    projectedProfitPct: projectedProfitPct(clientPOAmount, vendorPOAmount),
    actualProfitPct: actualProfitPct(clientReceived, vendorPaid),
  }
}

function sumMetrics(rows: FinancialSummaryWorkstreamRow[]): FinancialSummaryMetrics {
  const clientPOAmount = rows.reduce((s, r) => s + r.clientPOAmount, 0)
  const clientReceived = rows.reduce((s, r) => s + r.clientReceived, 0)
  const pendingReceived = rows.reduce((s, r) => s + r.pendingReceived, 0)
  const vendorPOAmount = rows.reduce((s, r) => s + r.vendorPOAmount, 0)
  const vendorPaid = rows.reduce((s, r) => s + r.vendorPaid, 0)
  const pendingPaid = rows.reduce((s, r) => s + r.pendingPaid, 0)
  return buildFinancialSummaryMetrics(
    clientPOAmount,
    clientReceived,
    vendorPOAmount,
    vendorPaid,
    pendingReceived,
    pendingPaid,
  )
}

/** Gross of unpaid portions of a client PO milestone (regular + retention separately). */
function pendingClientMilestoneGross(
  milestone: ClientPOMilestone,
  invoices: ClientInvoice[],
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  let pending = 0
  if (
    clientMilestonePaymentStatus(invoices, milestone.id, milestone.serviceId, milestone.name) !==
    'Paid'
  ) {
    pending += clientMilestoneBaseGross(
      milestone.value,
      milestone.serviceId,
      baseline,
      settingsServices,
    )
  }
  if (milestone.retention) {
    if (
      clientMilestonePaymentStatus(
        invoices,
        `${milestone.id}-retention`,
        milestone.serviceId,
        `${milestone.name} — Retention`,
      ) !== 'Paid'
    ) {
      pending += clientMilestoneBaseGross(
        milestone.retention.value,
        milestone.serviceId,
        baseline,
        settingsServices,
      )
    }
  }
  return pending
}

function isPaidMilestone(
  milestone: ClientPOMilestone,
  invoices: ClientInvoice[],
): boolean {
  return paidMilestoneAmount(milestone, invoices) > FINANCIALS_EPS
}

/** Paid portion of a milestone row (regular value and nested retention separately). */
function paidMilestoneAmount(
  milestone: ClientPOMilestone,
  invoices: ClientInvoice[],
): number {
  let paid = 0
  if (
    clientMilestonePaymentStatus(invoices, milestone.id, milestone.serviceId, milestone.name) ===
    'Paid'
  ) {
    paid += milestone.value
  }
  if (milestone.retention) {
    if (
      clientMilestonePaymentStatus(
        invoices,
        `${milestone.id}-retention`,
        milestone.serviceId,
        `${milestone.name} — Retention`,
      ) === 'Paid'
    ) {
      paid += milestone.retention.value
    }
  }
  return paid
}

type ServiceBucket = {
  serviceId: string
  serviceName: string
  categoryName: string
  clientPOAmount: number
  clientReceived: number
  pendingReceived: number
  vendorPOAmount: number
  vendorPaid: number
  pendingPaid: number
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function looksLikeRawId(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return true
  if (UUID_RE.test(trimmed)) return true
  if (trimmed.startsWith('vendor-po:') || trimmed.startsWith('vendor-inv:')) return true
  if (trimmed.startsWith('id::')) return true
  return false
}

/** Prefer a human service label over an id/uuid fallback. */
function preferServiceLabel(current: string, next: string): string {
  const nextTrim = next?.trim() ?? ''
  const currentTrim = current?.trim() ?? ''
  if (!nextTrim) return currentTrim
  if (looksLikeRawId(nextTrim)) return currentTrim || nextTrim
  if (!currentTrim || looksLikeRawId(currentTrim)) return nextTrim
  return currentTrim
}

function preferCategoryLabel(current: string, next: string): string {
  const nextTrim = next?.trim() ?? ''
  const currentTrim = current?.trim() ?? ''
  if (!nextTrim || looksLikeRawId(nextTrim)) return currentTrim
  if (!currentTrim || looksLikeRawId(currentTrim)) return nextTrim
  return currentTrim
}

/** Stable overview key: same category + service → one row; either differs → new row. */
function workstreamIdentityKey(categoryName: string, serviceName: string, fallbackId: string): string {
  const service = normalizeLabel(serviceName)
  const category = normalizeLabel(categoryName)
  // Never key solely by a raw UUID label — keep id fallback so later alias merge can attach.
  if (service && !looksLikeRawId(serviceName)) return `${category}::${service}`
  return `id::${fallbackId}`
}

type ResolvedServiceMeta = {
  ids: string[]
  serviceName: string
  categoryName: string
}

function findServiceMetaInBaseline(
  baseline: Baseline | null,
  serviceId: string,
): ResolvedServiceMeta | null {
  if (!baseline || !serviceId.trim()) return null
  for (const cat of baseline.categories ?? []) {
    for (const svc of cat.services ?? []) {
      if (svc.id === serviceId || svc.subcategoryId === serviceId) {
        const serviceName = (svc.subcategoryName ?? svc.name ?? svc.customName ?? '').trim()
        const ids = [svc.id, svc.subcategoryId].filter((id): id is string => Boolean(id?.trim()))
        return {
          ids: [...new Set(ids)],
          serviceName: serviceName || serviceId,
          categoryName: cat.categoryName?.trim() ?? '',
        }
      }
    }
  }
  return null
}

function findServiceMetaInCatalog(
  catalog: ServiceCatalogEntry[] | undefined,
  serviceId: string,
): ResolvedServiceMeta | null {
  if (!catalog?.length || !serviceId.trim()) return null
  const hit = catalog.find((s) => s.id === serviceId)
  if (!hit?.name?.trim()) return null
  const aliases = catalog
    .filter(
      (s) =>
        normalizeLabel(s.name) === normalizeLabel(hit.name) &&
        categoriesCompatible(s.categoryName ?? '', hit.categoryName ?? ''),
    )
    .map((s) => s.id)
  return {
    ids: [...new Set([serviceId, ...aliases].filter(Boolean))],
    serviceName: hit.name.trim(),
    categoryName: hit.categoryName?.trim() ?? '',
  }
}

function resolveServiceMeta(
  baseline: Baseline | null,
  serviceId: string,
  serviceNameHint?: string,
  categoryNameHint?: string,
  catalog?: ServiceCatalogEntry[],
): ResolvedServiceMeta {
  const fromBaseline = findServiceMetaInBaseline(baseline, serviceId)
  const fromCatalog = findServiceMetaInCatalog(catalog, serviceId)
  const hintName = serviceNameHint?.trim() ?? ''
  const hintCategory = categoryNameHint?.trim() ?? ''

  const ids = [
    ...new Set(
      [serviceId, ...(fromBaseline?.ids ?? []), ...(fromCatalog?.ids ?? [])].filter((id) =>
        Boolean(id?.trim()),
      ),
    ),
  ]

  const serviceName = preferServiceLabel(
    preferServiceLabel(fromBaseline?.serviceName ?? '', fromCatalog?.serviceName ?? ''),
    hintName,
  )
  const categoryName = preferCategoryLabel(
    preferCategoryLabel(fromBaseline?.categoryName ?? '', fromCatalog?.categoryName ?? ''),
    hintCategory,
  )

  return {
    ids,
    serviceName: serviceName || serviceId,
    categoryName,
  }
}

function categoriesCompatible(a: string, b: string): boolean {
  const left = normalizeLabel(a)
  const right = normalizeLabel(b)
  if (!left || !right) return true
  return left === right
}

function isClientInvoicePaid(inv: ClientInvoice): boolean {
  return isInvoiceFullyPaid(inv)
}

/** Bank amount received for a client invoice (aligns with Billing “Received”). */
export function clientInvoiceReceivedAmount(inv: ClientInvoice): number {
  const fromPayments = inv.payments.reduce((s, p) => s + p.amountReceived, 0)
  if (fromPayments > 0) return fromPayments
  if (inv.status === 'paid') return Math.max(0, inv.grossAmount - (inv.tdsAmount ?? 0))
  return Math.max(0, inv.grossAmount - inv.netReceivable)
}

/**
 * Bank amount received for paid client invoices, attributed by service.
 * Matches Billing “Received” (Σ amountReceived); multi-service invoices split by line share.
 */
function paidInvoiceReceivedByService(
  invoices: ClientInvoice[],
): Map<string, { amount: number; serviceName: string }> {
  const map = new Map<string, { amount: number; serviceName: string }>()

  const add = (serviceId: string, serviceName: string, amount: number) => {
    const id = serviceId?.trim()
    if (!id || Math.abs(amount) < FINANCIALS_EPS) return
    const existing = map.get(id) ?? {
      amount: 0,
      serviceName: serviceName?.trim() || id,
    }
    existing.amount += amount
    if (serviceName?.trim()) existing.serviceName = serviceName.trim()
    map.set(id, existing)
  }

  for (const inv of invoices) {
    if (!isClientInvoicePaid(inv)) continue
    const received = clientInvoiceReceivedAmount(inv)
    const linesWithService = (inv.lineItems ?? []).filter((li) => li.serviceId?.trim())
    if (linesWithService.length === 0) {
      add(inv.serviceId, inv.serviceName, received)
      continue
    }

    const uniqueServices = new Set(linesWithService.map((li) => li.serviceId))
    if (uniqueServices.size === 1) {
      const li = linesWithService[0]!
      add(li.serviceId, li.serviceName || inv.serviceName, received)
      continue
    }

    const totalBase = linesWithService.reduce((s, li) => s + li.amount, 0)
    if (totalBase <= FINANCIALS_EPS) {
      add(inv.serviceId, inv.serviceName, received)
      continue
    }
    for (const li of linesWithService) {
      add(
        li.serviceId,
        li.serviceName || inv.serviceName,
        (li.amount / totalBase) * received,
      )
    }
  }

  return map
}

function liveClientServiceBuckets(
  clientPOs: ClientPO[],
  projectId: string,
  invoices: ClientInvoice[],
  baseline: Baseline | null,
  catalog?: ServiceCatalogEntry[],
  settingsServices: Service[] = [],
): ServiceBucket[] {
  const map = new Map<string, ServiceBucket>()
  const idToKey = new Map<string, string>()

  const ensureBucket = (
    serviceId: string,
    serviceNameHint: string,
    categoryNameHint = '',
  ): ServiceBucket => {
    const meta = resolveServiceMeta(
      baseline,
      serviceId,
      serviceNameHint,
      categoryNameHint,
      catalog,
    )
    for (const id of meta.ids) {
      const existingKey = idToKey.get(id)
      if (existingKey && map.has(existingKey)) {
        const existing = map.get(existingKey)!
        existing.serviceName = preferServiceLabel(existing.serviceName, meta.serviceName)
        existing.categoryName = preferCategoryLabel(existing.categoryName, meta.categoryName)
        for (const alias of meta.ids) idToKey.set(alias, existingKey)
        return existing
      }
    }

    for (const [key, row] of map) {
      if (
        !looksLikeRawId(meta.serviceName) &&
        normalizeLabel(row.serviceName) === normalizeLabel(meta.serviceName) &&
        categoriesCompatible(row.categoryName, meta.categoryName)
      ) {
        row.serviceName = preferServiceLabel(row.serviceName, meta.serviceName)
        row.categoryName = preferCategoryLabel(row.categoryName, meta.categoryName)
        for (const alias of meta.ids) idToKey.set(alias, key)
        return row
      }
    }

    const key = workstreamIdentityKey(meta.categoryName, meta.serviceName, serviceId || meta.serviceName)
    const bucket: ServiceBucket = {
      serviceId: serviceId || meta.ids[0] || key,
      serviceName: meta.serviceName,
      categoryName: meta.categoryName,
      clientPOAmount: 0,
      clientReceived: 0,
      pendingReceived: 0,
      vendorPOAmount: 0,
      vendorPaid: 0,
      pendingPaid: 0,
    }
    map.set(key, bucket)
    for (const alias of meta.ids) idToKey.set(alias, key)
    return bucket
  }

  for (const po of clientPOs.filter((p) => p.projectId === projectId)) {
    for (const milestone of po.milestones ?? []) {
      if (!milestone.serviceId?.trim()) continue
      const bucket = ensureBucket(
        milestone.serviceId,
        milestone.serviceName?.trim() || milestone.serviceId,
      )
      bucket.clientPOAmount += clientMilestoneGross(milestone, baseline, settingsServices)
      bucket.pendingReceived += pendingClientMilestoneGross(
        milestone,
        invoices,
        baseline,
        settingsServices,
      )
    }
  }

  for (const [serviceId, received] of paidInvoiceReceivedByService(invoices)) {
    const bucket = ensureBucket(serviceId, received.serviceName)
    bucket.clientReceived += received.amount
  }

  return Array.from(map.values())
}

function addVendorAmountsToBuckets(
  buckets: ServiceBucket[],
  baseline: Baseline | null,
  vendorPOs: VendorPO[],
  projectId: string,
  vendorInvoices: VendorInvoice[],
  catalog?: ServiceCatalogEntry[],
): ServiceBucket[] {
  const map = new Map<string, ServiceBucket>()
  const idToKey = new Map<string, string>()

  for (const bucket of buckets) {
    const key = workstreamIdentityKey(bucket.categoryName, bucket.serviceName, bucket.serviceId)
    map.set(key, { ...bucket })
    idToKey.set(bucket.serviceId, key)
  }

  const ensureBucket = (
    serviceId: string,
    serviceNameHint: string,
    categoryNameHint = '',
  ): ServiceBucket => {
    const meta = resolveServiceMeta(
      baseline,
      serviceId,
      serviceNameHint,
      categoryNameHint,
      catalog,
    )

    for (const id of meta.ids) {
      const existingKey = idToKey.get(id)
      if (existingKey && map.has(existingKey)) {
        const existing = map.get(existingKey)!
        existing.serviceName = preferServiceLabel(existing.serviceName, meta.serviceName)
        existing.categoryName = preferCategoryLabel(existing.categoryName, meta.categoryName)
        for (const alias of meta.ids) idToKey.set(alias, existingKey)
        return existing
      }
    }

    for (const [key, row] of map) {
      if (
        !looksLikeRawId(meta.serviceName) &&
        normalizeLabel(row.serviceName) === normalizeLabel(meta.serviceName) &&
        categoriesCompatible(row.categoryName, meta.categoryName)
      ) {
        row.serviceName = preferServiceLabel(row.serviceName, meta.serviceName)
        row.categoryName = preferCategoryLabel(row.categoryName, meta.categoryName)
        for (const alias of meta.ids) idToKey.set(alias, key)
        return row
      }
    }

    const key = workstreamIdentityKey(meta.categoryName, meta.serviceName, serviceId || meta.serviceName)
    const bucket: ServiceBucket = {
      serviceId: serviceId || meta.ids[0] || key,
      serviceName: meta.serviceName,
      categoryName: meta.categoryName,
      clientPOAmount: 0,
      clientReceived: 0,
      pendingReceived: 0,
      vendorPOAmount: 0,
      vendorPaid: 0,
      pendingPaid: 0,
    }
    map.set(key, bucket)
    for (const alias of meta.ids) idToKey.set(alias, key)
    return bucket
  }

  for (const po of vendorPOs.filter((p) => p.projectId === projectId)) {
    const linked = po.linkedBaselineServiceIds ?? []
    const amount = vendorPoEffectiveValue(po)
    if (linked.length === 0) {
      const bucket = ensureBucket(`vendor-po:${po.id}`, `Vendor PO ${po.poNumber || po.id}`)
      bucket.vendorPOAmount += amount
      for (const milestone of po.milestones ?? []) {
        if (vendorMilestonePaymentStatus(vendorInvoices, milestone.id) === 'Paid') continue
        bucket.pendingPaid += milestone.value
      }
      continue
    }
    const share = amount / linked.length
    for (const serviceId of linked) {
      const meta = resolveServiceMeta(baseline, serviceId, undefined, undefined, catalog)
      const bucket = ensureBucket(serviceId, meta.serviceName, meta.categoryName)
      bucket.vendorPOAmount += share
    }
    for (const milestone of po.milestones ?? []) {
      if (vendorMilestonePaymentStatus(vendorInvoices, milestone.id) === 'Paid') continue
      const milestoneShare = linked.length > 0 ? milestone.value / linked.length : milestone.value
      for (const serviceId of linked) {
        const meta = resolveServiceMeta(baseline, serviceId, undefined, undefined, catalog)
        const bucket = ensureBucket(serviceId, meta.serviceName, meta.categoryName)
        bucket.pendingPaid += milestoneShare
      }
    }
  }

  for (const inv of vendorInvoices.filter((v) => v.projectId === projectId)) {
    if (inv.status !== 'paid') continue
    const serviceId = inv.serviceId?.trim() || `vendor-inv:${inv.id}`
    const meta = resolveServiceMeta(baseline, serviceId, inv.serviceName, undefined, catalog)
    const bucket = ensureBucket(serviceId, meta.serviceName || inv.serviceName, meta.categoryName)
    bucket.vendorPaid += inv.netPayable
  }

  return Array.from(map.values())
}

function expensePaidAmount(
  planned: PlannedExpense,
  expenses: Expense[],
  projectId: string,
): number {
  return expenses
    .filter(
      (e) =>
        e.projectId === projectId &&
        e.type === 'office_expenses' &&
        (e.sourcePlannedExpenseId === planned.id ||
          e.description.trim().toLowerCase() === planned.name.trim().toLowerCase()),
    )
    .reduce((s, e) => s + e.amount, 0)
}

/**
 * Live Overview aggregates.
 * Client PO from Live Client PO milestones; Client Received from paid invoice bank received
 * (not pitch / not milestone value / not gross). Vendor columns use Live vendor POs / vendor invoices.
 * Same category + service (by id alias or name) merges into one workstream row.
 */
export function buildFinancialSummaryGroups(
  baseline: Baseline | null,
  projectId: string,
  clientPOs: ClientPO[],
  vendorPOs: VendorPO[],
  clientInvoices: ClientInvoice[],
  vendorInvoices: VendorInvoice[],
  expenses: Expense[],
  /** Optional office expenses (e.g. from live-synced planned list). */
  officeExpenses?: PlannedExpense[],
  /** @deprecated Ignored — overview is live PO driven. */
  _pitchCategories?: unknown,
  /** Optional service master catalog for resolving linked payable service ids to names. */
  serviceCatalog?: ServiceCatalogEntry[],
  /** Settings services for per-service GST resolution on client PO gross amounts. */
  settingsServices: Service[] = [],
): FinancialSummaryCategoryGroup[] {
  const projectInvoices = clientInvoices.filter((i) => i.projectId === projectId)
  const clientBuckets = liveClientServiceBuckets(
    clientPOs,
    projectId,
    projectInvoices,
    baseline,
    serviceCatalog,
    settingsServices,
  )
  const buckets = addVendorAmountsToBuckets(
    clientBuckets,
    baseline,
    vendorPOs,
    projectId,
    vendorInvoices,
    serviceCatalog,
  )

  const byCategory = new Map<string, FinancialSummaryWorkstreamRow[]>()
  for (const bucket of buckets) {
    if (
      Math.abs(bucket.clientPOAmount) < FINANCIALS_EPS &&
      Math.abs(bucket.clientReceived) < FINANCIALS_EPS &&
      Math.abs(bucket.pendingReceived) < FINANCIALS_EPS &&
      Math.abs(bucket.vendorPOAmount) < FINANCIALS_EPS &&
      Math.abs(bucket.vendorPaid) < FINANCIALS_EPS &&
      Math.abs(bucket.pendingPaid) < FINANCIALS_EPS
    ) {
      continue
    }

    const row: FinancialSummaryWorkstreamRow = {
      id: workstreamIdentityKey(bucket.categoryName, bucket.serviceName, bucket.serviceId),
      kind: 'service',
      workstreamName: looksLikeRawId(bucket.serviceName)
        ? preferServiceLabel(
            '',
            resolveServiceMeta(baseline, bucket.serviceId, bucket.serviceName, bucket.categoryName, serviceCatalog)
              .serviceName,
          ) || bucket.serviceName
        : bucket.serviceName,
      ...buildFinancialSummaryMetrics(
        bucket.clientPOAmount,
        bucket.clientReceived,
        bucket.vendorPOAmount,
        bucket.vendorPaid,
        bucket.pendingReceived,
        bucket.pendingPaid,
      ),
    }
    const categoryName = bucket.categoryName.trim() || 'Uncategorized'
    const rows = byCategory.get(categoryName)
    if (rows) rows.push(row)
    else byCategory.set(categoryName, [row])
  }

  const categoryGroups: FinancialSummaryCategoryGroup[] = []
  for (const [name, rows] of byCategory) {
    categoryGroups.push({
      id: `cat:${name}`,
      name,
      kind: 'category',
      children: rows,
      subtotal: sumMetrics(rows),
    })
  }

  const expenseChildren: FinancialSummaryWorkstreamRow[] = (officeExpenses ?? []).map((pe) => {
    const vendorPOAmount = pe.amount
    const vendorPaid = expensePaidAmount(pe, expenses, projectId)
    const pendingPaid = Math.max(0, vendorPOAmount - vendorPaid)
    return {
      id: pe.id,
      kind: 'expense',
      workstreamName: pe.name,
      ...buildFinancialSummaryMetrics(0, 0, vendorPOAmount, vendorPaid, 0, pendingPaid),
    }
  })

  if (expenseChildren.length > 0) {
    categoryGroups.push({
      id: 'expenses',
      name: 'Expenses',
      kind: 'expenses',
      children: expenseChildren,
      subtotal: sumMetrics(expenseChildren),
    })
  }

  return categoryGroups
}

export function buildFinancialSummaryTotal(
  groups: FinancialSummaryCategoryGroup[],
): FinancialSummaryMetrics {
  const allChildren = groups.flatMap((g) => g.children)
  return sumMetrics(allChildren)
}

export function sortWorkstreamRows(
  rows: FinancialSummaryWorkstreamRow[],
  field: FinancialSummarySortField,
  direction: 'asc' | 'desc',
): FinancialSummaryWorkstreamRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (field === 'workstream') {
      return factor * a.workstreamName.localeCompare(b.workstreamName)
    }
    const av = a[field] ?? Number.NEGATIVE_INFINITY
    const bv = b[field] ?? Number.NEGATIVE_INFINITY
    return factor * (av - bv)
  })
}

// re-export helper used by tests / callers that still check paid flags
export { isPaidMilestone }
