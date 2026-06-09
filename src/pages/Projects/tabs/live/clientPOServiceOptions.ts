import type { Baseline } from '@/slices/baseline/reducer'
import type { PitchService, PitchVersion } from '@/slices/pitch/reducer'

export interface ClientPOServiceOption {
  id: string
  label: string
  categoryName: string
}

function serviceLabel(service: PitchService): string {
  return service.subcategoryName ?? service.name ?? service.customName ?? ''
}

function isUsableService(service: PitchService): boolean {
  const label = serviceLabel(service)
  return label.trim().length > 0
}

function flattenFromCategories(
  categories: { categoryName: string; services: PitchService[] }[],
): ClientPOServiceOption[] {
  const out: ClientPOServiceOption[] = []
  for (const cat of categories) {
    for (const svc of cat.services) {
      if (!isUsableService(svc)) continue
      out.push({
        id: svc.id,
        label: serviceLabel(svc),
        categoryName: cat.categoryName,
      })
    }
  }
  return out
}

export function flattenClientOfferServices(
  pitchVersion: PitchVersion | null,
  baseline: Baseline | null,
  projectId: string,
): ClientPOServiceOption[] {
  if (pitchVersion?.projectId === projectId) {
    return flattenFromCategories(pitchVersion.categories)
  }
  if (baseline?.projectId === projectId) {
    return flattenFromCategories(baseline.categories)
  }
  return []
}

export function serviceNameForOption(
  options: ClientPOServiceOption[],
  serviceId: string,
): string {
  return options.find((o) => o.id === serviceId)?.label ?? ''
}
