import type { Baseline, VendorPO, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { PitchService, PitchVersion, VendorMapping } from '@/slices/pitch/reducer'
import { resolvePitchVersionForProject } from '@/store/selectors/pitchSelectors'
import {
  normalizeVendorMapping,
  validateVendorMilestonePercents,
} from '@/utils/vendorMilestones'

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
}

export interface VendorPOMilestoneOverviewRow {
  key: string
  poId: string
  poNumber: string
  vendor: string
  service: string
  name: string
  pct: number
  amount: number
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

export function buildVendorPOMilestoneOverviewRows(
  vendorPOs: VendorPO[],
  projectId: string,
  baseline: Baseline | null,
): VendorPOMilestoneOverviewRow[] {
  const rows: VendorPOMilestoneOverviewRow[] = []
  for (const po of vendorPOs.filter((p) => p.projectId === projectId)) {
    const serviceLabel = linkedServiceLabels(po, baseline)
    for (const m of po.milestones) {
      const isRetention = m.name.trim().toLowerCase() === 'retention'
      rows.push({
        key: `${po.id}-${m.id}`,
        poId: po.id,
        poNumber: po.poNumber,
        vendor: po.vendorName,
        service: serviceLabel,
        name: m.name,
        pct: m.percentage,
        amount: m.value,
        isRetention,
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

/** True when a vendor PO was created from this offer row (vendor + linked service). */
export function vendorOfferHasPo(
  row: VendorOfferRow,
  vendorPOs: VendorPO[],
  projectId: string,
): boolean {
  return vendorPOs.some((po) => {
    if (po.projectId !== projectId) return false
    if (po.vendorId !== row.mapping.vendorId) return false
    const linked = po.linkedBaselineServiceIds ?? []
    return linked.includes(row.serviceId)
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
          })
        }
      }
    }
  }
  return rows
}
