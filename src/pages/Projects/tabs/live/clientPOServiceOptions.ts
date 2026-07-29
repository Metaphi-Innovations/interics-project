import type { Category, Service } from '@/slices/settings/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import type { PitchService, PitchVersion } from '@/slices/pitch/reducer'
import type { CategoryOption, ServiceOption } from './VendorOfferMilestoneCards'

export interface ClientPOServiceOption {
  id: string
  label: string
  categoryId: string
  categoryName: string
}

export interface ClientPOCategoryOption {
  id: string
  label: string
}

function serviceLabel(service: PitchService): string {
  return service.subcategoryName ?? service.name ?? service.customName ?? ''
}

function isUsableService(service: PitchService): boolean {
  const label = serviceLabel(service)
  return label.trim().length > 0
}

function flattenFromCategories(
  categories: { id: string; categoryName: string; services: PitchService[] }[],
): ClientPOServiceOption[] {
  const out: ClientPOServiceOption[] = []
  for (const cat of categories) {
    for (const svc of cat.services) {
      if (!isUsableService(svc)) continue
      out.push({
        id: svc.id,
        label: serviceLabel(svc),
        categoryId: cat.id,
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

/** Active Category Master rows for Client/Vendor PO milestone pickers. */
export function masterCategoryOptions(categories: Category[]): CategoryOption[] {
  return categories
    .filter((c) => c.status === 'active')
    .map((c) => ({ id: c.id, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Active Service Master rows for Client/Vendor PO milestone pickers. */
export function masterServiceOptions(services: Service[]): ServiceOption[] {
  return services
    .filter((s) => s.status === 'active')
    .map((s) => ({ id: s.id, label: s.name, categoryId: s.categoryId }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Active masters as Client PO service options (includes category name for payloads). */
export function masterClientPOServiceOptions(
  categories: Category[],
  services: Service[],
): ClientPOServiceOption[] {
  const activeCats = new Map(
    categories.filter((c) => c.status === 'active').map((c) => [c.id, c.name] as const),
  )
  return services
    .filter((s) => s.status === 'active' && activeCats.has(s.categoryId))
    .map((s) => ({
      id: s.id,
      label: s.name,
      categoryId: s.categoryId,
      categoryName: activeCats.get(s.categoryId) ?? '',
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function serviceNameForOption(
  options: ClientPOServiceOption[],
  serviceId: string,
): string {
  return options.find((o) => o.id === serviceId)?.label ?? ''
}

export function clientPOCategoryOptions(
  serviceOptions: ClientPOServiceOption[],
): ClientPOCategoryOption[] {
  const map = new Map<string, string>()
  for (const option of serviceOptions) {
    map.set(option.categoryId, option.categoryName)
  }
  return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
}

export function clientPOCardServiceOptions(
  serviceOptions: ClientPOServiceOption[],
): ServiceOption[] {
  return serviceOptions.map((option) => ({
    id: option.id,
    label: option.label,
    categoryId: option.categoryId,
  }))
}
