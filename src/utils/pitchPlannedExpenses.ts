import type { PitchVersion } from '@/slices/pitch/reducer'

export function vendorValueTotalsByVendorId(
  version: PitchVersion,
): Map<string, { value: number; name: string }> {
  const map = new Map<string, { value: number; name: string }>()
  for (const cat of version.categories) {
    for (const s of cat.services) {
      for (const vm of s.vendorMappings) {
        if (!vm.vendorId) continue
        const cur = map.get(vm.vendorId)
        if (cur) {
          cur.value += vm.value
        } else {
          map.set(vm.vendorId, { value: vm.value, name: vm.vendorName || vm.vendorId })
        }
      }
    }
  }
  return map
}

export function redistributeCommonPercents(
  ids: string[],
  version: PitchVersion,
): Record<string, number> {
  if (ids.length === 0) return {}
  const totals = vendorValueTotalsByVendorId(version)
  const sumW = ids.reduce((s, id) => s + (totals.get(id)?.value ?? 0), 0)
  const next: Record<string, number> = {}
  if (sumW <= 0) {
    const eq = 100 / ids.length
    ids.forEach((id) => {
      next[id] = Math.round(eq * 100) / 100
    })
    return next
  }
  let allocated = 0
  ids.forEach((id, i) => {
    if (i === ids.length - 1) {
      next[id] = Math.round((100 - allocated) * 100) / 100
    } else {
      const w = totals.get(id)?.value ?? 0
      const p = Math.round(((w / sumW) * 100) * 100) / 100
      next[id] = p
      allocated += p
    }
  })
  return next
}
