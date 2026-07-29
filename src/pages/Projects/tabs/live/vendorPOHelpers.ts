import type { Baseline, VendorPO, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { PitchCategory, PitchService, PitchVersion, VendorMapping } from '@/slices/pitch/reducer'
import { resolvePitchVersionForProject } from '@/store/selectors/pitchSelectors'
import {
  normalizeVendorMapping,
  validateVendorMilestonePercents,
} from '@/utils/vendorMilestones'

export type VendorMilestoneKind = 'regular' | 'retention'

export function resolveVendorPOMilestoneKind(m: VendorPOMilestone): VendorMilestoneKind {
  if (m.kind === 'retention') return 'retention'
  if (m.name.trim().toLowerCase() === 'retention') return 'retention'
  return 'regular'
}

export function vendorMilestoneTypeLabel(type: VendorMilestoneKind): string {
  switch (type) {
    case 'retention':
      return 'Retention'
    default:
      return 'Regular'
  }
}

export interface VendorOfferRow {
  categoryName: string
  categoryId: string
  serviceId: string
  serviceName: string
  mapping: VendorMapping
}

export interface VendorOption {
  vendorId: string
  vendorName: string
  allocatedValue: number
}

/** Contractual PO value vs latest execution amount — calculations use executed when set. */
export function vendorPoEffectiveValue(po: Pick<VendorPO, 'poValue' | 'executedValue'>): number {
  return po.executedValue ?? po.poValue
}

export type VendorMappingRowStatus =
  | 'Complete'
  | 'Milestones Pending'
  | 'Mapped'
  | 'Partial Allocation'

export interface VendorMilestoneOverviewRow {
  key: string
  service: string
  category: string
  vendor: string
  name: string
  pct: number
  amount: number
  retentionAmount: number
  allocationStatus: string
  milestoneType: VendorMilestoneKind
}

export interface VendorPOMilestoneOverviewRow {
  key: string
  poId: string
  poNumber: string
  vendorId: string
  vendor: string
  serviceId: string
  serviceName: string
  service: string
  milestoneId: string
  name: string
  pct: number
  amount: number
  milestoneType: VendorMilestoneKind
  /** @deprecated use milestoneType === 'retention' */
  isRetention: boolean
  status: VendorPOMilestone['status']
}

function findServiceInBaseline(baseline: Baseline | null, serviceId: string): PitchService | undefined {
  if (!baseline) return undefined
  for (const cat of baseline.categories) {
    const svc = cat.services.find((s) => s.id === serviceId)
    if (svc) return svc
  }
  return undefined
}

function linkedServiceLabels(po: VendorPO, baseline: Baseline | null): string {
  const ids = po.linkedBaselineServiceIds ?? []
  if (ids.length === 0) return '—'
  return ids
    .map((id) => {
      const svc = findServiceInBaseline(baseline, id)
      return svc?.subcategoryName ?? svc?.name ?? id
    })
    .join(', ')
}

export function vendorPOLinkedServiceLabel(po: VendorPO, baseline: Baseline | null): string {
  return linkedServiceLabels(po, baseline)
}

export function vendorPOCategoryLabel(po: VendorPO, baseline: Baseline | null): string {
  const serviceId = po.linkedBaselineServiceIds?.[0]
  if (!serviceId || !baseline) return '—'
  for (const cat of baseline.categories) {
    if (cat.services.some((s) => s.id === serviceId)) return cat.categoryName
  }
  return '—'
}

export function buildVendorPOMilestoneOverviewRows(
  vendorPOs: VendorPO[],
  projectId: string,
  baseline: Baseline | null,
): VendorPOMilestoneOverviewRow[] {
  const rows: VendorPOMilestoneOverviewRow[] = []
  for (const po of vendorPOs.filter((p) => p.projectId === projectId)) {
    const serviceLabel = linkedServiceLabels(po, baseline)
    const primaryServiceId = po.linkedBaselineServiceIds?.[0] ?? ''
    const primarySvc = primaryServiceId ? findServiceInBaseline(baseline, primaryServiceId) : undefined
    const primaryServiceName =
      primarySvc?.subcategoryName ?? primarySvc?.name ?? primaryServiceId
    for (const m of po.milestones) {
      const milestoneType = resolveVendorPOMilestoneKind(m)
      rows.push({
        key: `${po.id}-${m.id}`,
        poId: po.id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendor: po.vendorName,
        serviceId: primaryServiceId,
        serviceName: primaryServiceName,
        service: serviceLabel,
        milestoneId: m.id,
        name: m.name,
        pct: m.percentage,
        amount: m.value,
        milestoneType,
        isRetention: milestoneType === 'retention',
        status: m.status,
      })
    }
  }
  return rows
}

export function buildVendorOfferRows(version: PitchVersion | null): VendorOfferRow[] {
  if (!version) return []
  const rows: VendorOfferRow[] = []
  for (const category of version.categories) {
    for (const service of category.services) {
      for (const mapping of service.vendorMappings ?? []) {
        if (!mapping.vendorId || mapping.value <= 0) continue
        rows.push({
          categoryName: category.categoryName,
          categoryId: category.id,
          serviceId: service.id,
          serviceName: service.subcategoryName ?? service.name,
          mapping,
        })
      }
    }
  }
  return rows
}

function normalizeOfferLabel(value: string): string {
  return value.trim().toLowerCase()
}

/** Stable key for a vendor-offer table row. */
export function vendorOfferRowKey(row: VendorOfferRow): string {
  return `${row.mapping.vendorId}:${row.serviceId}:${row.mapping.id}`
}

/** Service ids for the same category + service label across pitch and baseline snapshots. */
export function collectMatchingServiceIds(
  row: VendorOfferRow,
  baseline: Baseline | null,
  offerVersion: PitchVersion | null,
  projectId: string,
): string[] {
  const ids = new Set<string>([row.serviceId])
  const targetCategory = normalizeOfferLabel(row.categoryName)
  const targetService = normalizeOfferLabel(row.serviceName)

  const sources: PitchCategory[][] = []
  if (baseline?.projectId === projectId) sources.push(baseline.categories)
  if (offerVersion?.projectId === projectId) sources.push(offerVersion.categories)

  for (const categories of sources) {
    for (const cat of categories) {
      if (normalizeOfferLabel(cat.categoryName) !== targetCategory) continue
      for (const svc of cat.services) {
        const label = normalizeOfferLabel(svc.subcategoryName ?? svc.name ?? svc.customName ?? '')
        if (label === targetService) ids.add(svc.id)
      }
    }
  }
  return Array.from(ids)
}

export interface VendorOfferHasPoOptions {
  alternateServiceIds?: string[]
  confirmedRowKeys?: ReadonlySet<string>
}

/** True when a vendor PO was created from this offer row. */
export function vendorOfferHasPo(
  row: VendorOfferRow,
  vendorPOs: VendorPO[],
  projectId: string,
  options?: VendorOfferHasPoOptions,
): boolean {
  return findVendorPOForOfferRow(row, vendorPOs, projectId, options) != null
}

/** Resolves the vendor PO linked to an offer row, if one exists. */
export function findVendorPOForOfferRow(
  row: VendorOfferRow,
  vendorPOs: VendorPO[],
  projectId: string,
  options?: VendorOfferHasPoOptions,
): VendorPO | undefined {
  const rowKey = vendorOfferRowKey(row)
  if (options?.confirmedRowKeys?.has(rowKey)) {
    const byMapping = vendorPOs.find(
      (po) =>
        po.projectId === projectId &&
        po.vendorId === row.mapping.vendorId &&
        po.linkedVendorMappingId === row.mapping.id,
    )
    if (byMapping) return byMapping
  }

  const serviceIds = new Set([row.serviceId, ...(options?.alternateServiceIds ?? [])])

  return vendorPOs.find((po) => {
    if (po.projectId !== projectId) return false
    if (po.vendorId !== row.mapping.vendorId) return false
    if (po.linkedVendorMappingId && po.linkedVendorMappingId === row.mapping.id) return true
    const linked = po.linkedBaselineServiceIds ?? []
    return linked.some((id) => serviceIds.has(id))
  })
}

export { resolvePitchVersionForProject } from '@/store/selectors/pitchSelectors'

/** PitchVersion-shaped view of a locked baseline (Live offer summaries). */
export function baselineToOfferVersion(baseline: Baseline): PitchVersion {
  return {
    id: baseline.versionId,
    projectId: baseline.projectId,
    versionNumber: baseline.pitchVersionNumber,
    label: baseline.versionLabel,
    isActive: true,
    createdAt: baseline.lockedAt,
    categories: baseline.categories,
    plannedExpenses: baseline.plannedExpenses ?? [],
    totalRevenue: baseline.totalRevenue,
    totalCost: baseline.totalCost,
    profitability: baseline.profitability,
  }
}

/**
 * Resolve client/vendor offer data for Live Contract & Receivable summaries.
 * Prefers the pitch version when it has categories; otherwise uses the locked baseline
 * created during Convert Live.
 */
export function resolveOfferVersionForProject(
  projectId: string,
  activeVersion: PitchVersion | null,
  versions: PitchVersion[],
  baseline: Baseline | null,
): PitchVersion | null {
  const pitch = resolvePitchVersionForProject(projectId, activeVersion, versions)
  if (pitch && pitch.categories.length > 0) return pitch

  if (baseline?.projectId === projectId) {
    return baselineToOfferVersion(baseline)
  }

  return pitch
}

export function deriveVendorOptions(version: PitchVersion | null): VendorOption[] {
  const map = new Map<string, VendorOption>()
  if (!version) return []
  for (const cat of version.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings ?? []) {
        if (!vm.vendorId) continue
        const existing = map.get(vm.vendorId)
        map.set(vm.vendorId, {
          vendorId: vm.vendorId,
          vendorName: vm.vendorName,
          allocatedValue: (existing?.allocatedValue ?? 0) + vm.value,
        })
      }
    }
  }
  return Array.from(map.values())
}

export function findPitchService(
  version: PitchVersion | null,
  serviceId: string,
): PitchService | null {
  if (!version) return null
  for (const cat of version.categories) {
    const svc = cat.services.find((s) => s.id === serviceId)
    if (svc) return svc
  }
  return null
}

export function mappingAllocatedTotal(mapping: VendorMapping): number {
  const normalized = normalizeVendorMapping(mapping)
  const fromMilestones = (normalized.milestones ?? []).reduce((sum, m) => sum + m.value, 0)
  return fromMilestones + (normalized.retention?.amount ?? 0)
}

export function deriveVendorMappingRowStatus(mapping: VendorMapping): VendorMappingRowStatus {
  const normalized = normalizeVendorMapping(mapping)
  const hasBreakdown =
    (normalized.milestones?.length ?? 0) > 0 || Boolean(normalized.retention)
  if (!hasBreakdown) {
    return normalized.value > 0 ? 'Mapped' : 'Milestones Pending'
  }
  const validation = validateVendorMilestonePercents(normalized)
  if (!validation.valid) return 'Milestones Pending'
  const total = mappingAllocatedTotal(normalized)
  if (Math.abs(total - normalized.value) > 1) return 'Partial Allocation'
  return 'Complete'
}

export function buildVendorMilestoneOverviewRows(
  version: PitchVersion | null,
): VendorMilestoneOverviewRow[] {
  if (!version) return []
  const rows: VendorMilestoneOverviewRow[] = []
  for (const cat of version.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings ?? []) {
        const normalized = normalizeVendorMapping(vm)
        const allocated = mappingAllocatedTotal(normalized)
        const allocationStatus =
          normalized.milestones.length === 0 && !normalized.retention
            ? 'No breakdown'
            : Math.abs(allocated - normalized.value) <= 1
              ? 'Fully allocated'
              : `₹${Math.abs(normalized.value - allocated).toLocaleString('en-IN')} unallocated`

        for (const m of normalized.milestones) {
          rows.push({
            key: `${svc.id}-${vm.id}-${m.id}`,
            service: svc.name,
            category: cat.categoryName,
            vendor: vm.vendorName,
            name: m.name,
            pct: m.percentage,
            amount: m.value,
            retentionAmount: 0,
            allocationStatus,
            milestoneType: 'regular',
          })
        }
        if (normalized.retention) {
          rows.push({
            key: `${svc.id}-${vm.id}-retention`,
            service: svc.name,
            category: cat.categoryName,
            vendor: vm.vendorName,
            name: 'Retention',
            pct: normalized.retention.percentage,
            amount: normalized.retention.amount,
            retentionAmount: normalized.retention.amount,
            allocationStatus,
            milestoneType: 'retention',
          })
        }
      }
    }
  }
  return rows
}
