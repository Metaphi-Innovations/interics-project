import { API_BASE_URL } from '@/api/config'
import { getStoredToken } from '@/utils/authStorage'

/** Turn API-relative file paths into absolute URLs the browser can open. */
export function resolveApiAssetUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl?.trim()) return null
  const value = pathOrUrl.trim()
  if (value.startsWith('local://')) return null
  if (/^https?:\/\//i.test(value) || value.startsWith('blob:')) return value

  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/i, '')
  if (value.startsWith('/')) return `${apiOrigin}${value}`
  return `${API_BASE_URL.replace(/\/$/, '')}/${value.replace(/^\//, '')}`
}

export function buildFileViewUrlFromId(fileId?: string | null): string | null {
  if (!fileId?.trim()) return null
  return `${API_BASE_URL.replace(/\/$/, '')}/files/${fileId.trim()}/view`
}

/**
 * Fetch an authenticated file and open it in a new tab.
 * Opens the tab synchronously on click so the current page never navigates away.
 */
export async function openAuthenticatedDocument(
  pathOrUrl: string,
  onFailed?: () => void,
): Promise<void> {
  const absolute = resolveApiAssetUrl(pathOrUrl)
  if (!absolute) {
    onFailed?.()
    return
  }

  // Open immediately within the user gesture — async window.open is often blocked,
  // and falling back to location.assign was navigating the current page away.
  const newTab = window.open('about:blank', '_blank')
  if (!newTab) {
    onFailed?.()
    return
  }

  try {
    newTab.document.title = 'Loading document…'
    const token = getStoredToken()
    const response = await fetch(absolute, {
      method: 'GET',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      newTab.close()
      onFailed?.()
      return
    }
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    newTab.location.replace(blobUrl)
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000)
  } catch {
    try {
      newTab.close()
    } catch {
      // ignore
    }
    onFailed?.()
  }
}

/** Fetch an authenticated file and trigger a browser download (does not change view behavior). */
export async function downloadAuthenticatedDocument(
  pathOrUrl: string,
  fileName?: string,
  onFailed?: () => void,
): Promise<void> {
  const absolute = resolveApiAssetUrl(pathOrUrl)
  if (!absolute) {
    onFailed?.()
    return
  }

  const downloadUrl = absolute.includes('/view')
    ? absolute.replace(/\/view(?=$|\?)/, '/download')
    : absolute

  try {
    const token = getStoredToken()
    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!response.ok) {
      onFailed?.()
      return
    }
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = fileName?.trim() || 'document'
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch {
    onFailed?.()
  }
}
