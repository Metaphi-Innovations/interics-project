/** Client-side vendor rating persistence until rating is stored on the Vendor model. */

const STORAGE_KEY = 'intresic.vendorRatings'

function readAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
}

export function getStoredVendorRating(vendorId: string): string | null {
  if (!vendorId.trim()) return null
  const value = readAll()[vendorId]?.trim()
  return value || null
}

export function setStoredVendorRating(vendorId: string, rating: string | null | undefined): void {
  if (!vendorId.trim()) return
  const map = readAll()
  const next = rating?.trim()
  if (!next) {
    delete map[vendorId]
  } else {
    map[vendorId] = next
  }
  writeAll(map)
}
