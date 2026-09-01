import type { PitchCategory, PitchService } from '@/slices/pitch/reducer'

function normalizeOfferLabel(value: string): string {
  return value.trim().toLowerCase()
}

function pitchServiceLabel(svc: PitchService): string {
  return normalizeOfferLabel(svc.subcategoryName ?? svc.name ?? svc.customName ?? '')
}

export interface MasterServiceSelection {
  masterCategoryId: string
  masterServiceId: string
  masterCategoryName?: string
  masterServiceName?: string
}

export interface ResolvedPitchServiceTarget {
  categoryId: string
  categoryName: string
  service: PitchService
}

/** Map master category/service picker ids to a pitch or baseline service row. */
export function resolvePitchServiceForMasterSelection(
  version: { categories: PitchCategory[] } | null,
  selection: MasterServiceSelection,
): ResolvedPitchServiceTarget | null {
  if (!version) return null

  const masterCatName = selection.masterCategoryName?.trim()
  const masterSvcName = selection.masterServiceName?.trim()

  const serviceMatches = (svc: PitchService): boolean =>
    svc.id === selection.masterServiceId ||
    svc.subcategoryId === selection.masterServiceId ||
    (masterSvcName != null &&
      masterSvcName.length > 0 &&
      pitchServiceLabel(svc) === normalizeOfferLabel(masterSvcName))

  for (const cat of version.categories) {
    const categoryMatches =
      cat.categoryId === selection.masterCategoryId ||
      cat.id === selection.masterCategoryId ||
      (masterCatName != null &&
        masterCatName.length > 0 &&
        normalizeOfferLabel(cat.categoryName) === normalizeOfferLabel(masterCatName))

    if (!categoryMatches) continue

    for (const svc of cat.services) {
      if (serviceMatches(svc)) {
        return { categoryId: cat.id, categoryName: cat.categoryName, service: svc }
      }
    }
  }

  for (const cat of version.categories) {
    for (const svc of cat.services) {
      if (serviceMatches(svc)) {
        return { categoryId: cat.id, categoryName: cat.categoryName, service: svc }
      }
    }
  }

  return null
}
