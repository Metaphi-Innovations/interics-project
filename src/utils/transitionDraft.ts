import type { PitchCategory, PitchVersion, PlannedExpense } from '@/slices/pitch/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import { normalizeVendorMapping, validateVendorMilestonePercents } from '@/utils/vendorMilestones'

/** Editable PO transition snapshot (nested like PitchVersion, no pitch id). */
export interface TransitionDraft {
  sourceVersionId: string
  projectId: string
  versionNumber: number
  label: string
  categories: PitchCategory[]
  plannedExpenses: PlannedExpense[]
  /** Snapshot of service values when version was first loaded (PO alignment "original"). */
  originalServiceValues: Record<string, number>
  totalRevenue: number
  totalCost: number
  profitability: number
}

export function recalcTransitionDraft<T extends Pick<TransitionDraft, 'categories' | 'plannedExpenses' | 'originalServiceValues'>>(
  draft: T,
): T & Pick<TransitionDraft, 'totalRevenue' | 'totalCost' | 'profitability'> {
  let totalRevenue = 0
  let vendorCostSum = 0
  const plannedExpenses = draft.plannedExpenses ?? []
  const updatedCategories = draft.categories.map((cat) => {
    const catTotal = cat.services.reduce((sum, s) => sum + s.value, 0)
    totalRevenue += catTotal
    const servicesNormalized = cat.services.map((s) => ({
      ...s,
      vendorMappings: s.vendorMappings.map((vm) => normalizeVendorMapping(vm)),
    }))
    const vendorCostInCat = servicesNormalized.reduce(
      (sum, s) => sum + s.vendorMappings.reduce((vs, vm) => vs + vm.value, 0),
      0,
    )
    vendorCostSum += vendorCostInCat
    return { ...cat, totalValue: catTotal, services: servicesNormalized }
  })
  const plannedTotal = plannedExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalCost = vendorCostSum + plannedTotal
  return {
    ...draft,
    categories: updatedCategories,
    plannedExpenses,
    totalRevenue,
    totalCost,
    profitability: totalRevenue - totalCost,
  }
}

/** Build PitchVersion-shaped object for financial helpers / expense drawer. */
export function transitionDraftToPitchVersion(draft: TransitionDraft): PitchVersion {
  return {
    id: `transition-${draft.sourceVersionId}`,
    projectId: draft.projectId,
    versionNumber: draft.versionNumber,
    label: draft.label,
    isActive: false,
    createdAt: '',
    categories: draft.categories,
    plannedExpenses: draft.plannedExpenses ?? [],
    totalRevenue: draft.totalRevenue,
    totalCost: draft.totalCost,
    profitability: draft.profitability,
  }
}

export function validateTransitionDraftForSave(draft: TransitionDraft): { ok: boolean; messages: string[] } {
  const messages: string[] = []
  for (const cat of draft.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings) {
        if (vm.value <= 0) continue
        if (vm.milestones.length === 0) {
          messages.push(`Vendor "${vm.vendorName || vm.vendorId}" on "${svc.name}" needs at least one milestone.`)
          continue
        }
        const v = validateVendorMilestonePercents(vm)
        if (!v.valid) {
          messages.push(
            `${svc.name} / ${vm.vendorName || vm.vendorId}: ${v.pctMessage ?? v.structureMessage ?? 'Invalid milestones'}`,
          )
        }
      }
    }
  }
  for (const e of draft.plannedExpenses ?? []) {
    if (e.type === 'vendor' && !e.vendorId) {
      messages.push(`Vendor-linked expense "${e.name}" must have a vendor.`)
    }
    if (e.type === 'common' && e.vendorSplits?.length) {
      const sum = e.vendorSplits.reduce((s, x) => s + x.percentage, 0)
      if (Math.abs(sum - 100) >= 0.02) {
        messages.push(`Common expense "${e.name}" vendor splits must total 100%.`)
      }
    }
  }
  return { ok: messages.length === 0, messages }
}

export function hydrateDraftFromPitchVersion(
  projectId: string,
  version: PitchVersion,
): TransitionDraft {
  const raw = structuredClone(version) as PitchVersion
  const originalServiceValues: Record<string, number> = {}
  for (const cat of raw.categories) {
    for (const svc of cat.services) {
      originalServiceValues[svc.id] = svc.value
    }
  }
  const base: TransitionDraft = {
    sourceVersionId: version.id,
    projectId,
    versionNumber: raw.versionNumber,
    label: raw.label,
    categories: raw.categories,
    plannedExpenses: (raw.plannedExpenses ?? []).map((e) => ({ ...e })),
    originalServiceValues,
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
  }
  return recalcTransitionDraft(base) as TransitionDraft
}

/** Rehydrate transition draft from a locked baseline snapshot (edit-baseline flow). */
export function baselineSnapshotToTransitionDraft(projectId: string, baseline: Baseline): TransitionDraft {
  const base: TransitionDraft = {
    sourceVersionId: baseline.versionId,
    projectId,
    versionNumber: baseline.pitchVersionNumber,
    label: baseline.versionLabel,
    categories: structuredClone(baseline.categories),
    plannedExpenses: structuredClone(baseline.plannedExpenses ?? []),
    originalServiceValues: { ...baseline.originalServiceValues },
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
  }
  return recalcTransitionDraft(base) as TransitionDraft
}
