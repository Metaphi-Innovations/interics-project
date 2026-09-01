import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { PitchCategory, PitchService } from '@/slices/pitch/reducer'

export type VendorServiceNameCatalogEntry = {
  id: string
  name: string
}

export interface VendorMasterCatalogLabels {
  categories: Array<{ value: string; label: string }>
  services: Array<{ value: string; label: string; categoryId: string }>
}

export function buildVendorServiceNameCatalog(
  masterServices: VendorServiceNameCatalogEntry[],
  baseline: Baseline | null,
  pitchCategories?: PitchCategory[],
): VendorServiceNameCatalogEntry[] {
  const catalog: VendorServiceNameCatalogEntry[] = [...masterServices]

  const appendFromCategories = (
    categories: { services: PitchService[] }[] | undefined,
  ) => {
    for (const cat of categories ?? []) {
      for (const svc of cat.services ?? []) {
        const label = (svc.subcategoryName ?? svc.name ?? svc.customName ?? '').trim()
        if (!label) continue
        catalog.push({ id: svc.id, name: label })
        if (svc.subcategoryId?.trim()) {
          catalog.push({ id: svc.subcategoryId, name: label })
        }
      }
    }
  }

  appendFromCategories(baseline?.categories)
  appendFromCategories(pitchCategories)
  return catalog
}

export function vendorPOCategoryLabel(
  po: VendorPO,
  baseline: Baseline | null,
  masterCatalog?: VendorMasterCatalogLabels,
): string {
  const serviceId = po.linkedBaselineServiceIds?.[0]?.trim()
  if (!serviceId) return '—'

  if (baseline) {
    const categories = Array.isArray(baseline.categories) ? baseline.categories : []
    for (const cat of categories) {
      if (
        (cat.services ?? []).some((s) => s.id === serviceId || s.subcategoryId === serviceId)
      ) {
        return cat.categoryName
      }
    }
  }

  if (masterCatalog) {
    const masterService = masterCatalog.services.find((s) => s.value === serviceId)
    if (masterService) {
      const masterCategory = masterCatalog.categories.find(
        (c) => c.value === masterService.categoryId,
      )
      if (masterCategory?.label) return masterCategory.label
    }
  }

  return '—'
}
