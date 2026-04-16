import type { PitchCategory, PlannedExpense, VendorMapping } from '@/slices/pitch/reducer'

export function allVendorIdsInCategories(categories: PitchCategory[]): Set<string> {
  const s = new Set<string>()
  for (const c of categories) {
    for (const svc of c.services) {
      for (const vm of svc.vendorMappings) {
        if (vm.vendorId) s.add(vm.vendorId)
      }
    }
  }
  return s
}

function vendorMappingsForService(categories: PitchCategory[], serviceId: string): VendorMapping[] {
  for (const cat of categories) {
    const svc = cat.services.find((x) => x.id === serviceId)
    if (svc) return svc.vendorMappings
  }
  return []
}

/**
 * When vendor mappings for a service are saved:
 * 1) Same mapping id, vendorId A -> B: rewire vendor-linked expenses A -> B.
 * 2) Any vendor-linked expense whose vendorId is no longer present anywhere → additional.
 */
export function rewirePlannedExpensesAfterVendorMappingSave(
  categoriesBefore: PitchCategory[],
  serviceId: string,
  nextMappings: VendorMapping[],
  expenses: PlannedExpense[],
): PlannedExpense[] {
  const prev = vendorMappingsForService(categoriesBefore, serviceId)
  const prevById = new Map(prev.map((m) => [m.id, m]))
  const nextById = new Map(nextMappings.map((m) => [m.id, m]))

  const idChanges: Array<{ from: string; to: string }> = []
  for (const [id, pm] of prevById) {
    const nm = nextById.get(id)
    if (nm && pm.vendorId && nm.vendorId && pm.vendorId !== nm.vendorId) {
      idChanges.push({ from: pm.vendorId, to: nm.vendorId })
    }
  }

  let nextExp = expenses.map((e) => {
    if (e.type !== 'vendor' || !e.vendorId) return e
    let vid = e.vendorId
    for (const { from, to } of idChanges) {
      if (vid === from) vid = to
    }
    return vid !== e.vendorId ? { ...e, vendorId: vid } : e
  })

  // Replace categories in-memory for this service only to compute post-tree
  const categoriesAfter = categoriesBefore.map((cat) => ({
    ...cat,
    services: cat.services.map((svc) =>
      svc.id === serviceId ? { ...svc, vendorMappings: nextMappings } : svc,
    ),
  }))
  const stillPresent = allVendorIdsInCategories(categoriesAfter)
  nextExp = nextExp.map((e) => {
    if (e.type !== 'vendor' || !e.vendorId) return e
    if (!stillPresent.has(e.vendorId)) {
      return { ...e, type: 'additional' as const, vendorId: undefined }
    }
    return e
  })

  return nextExp
}
