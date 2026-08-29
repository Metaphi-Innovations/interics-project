export function expenseDocumentDisplayName(documentUrl?: string): string | null {
  if (!documentUrl) return null
  if (documentUrl.startsWith('local://')) {
    return documentUrl.slice('local://'.length) || null
  }
  try {
    const path = new URL(documentUrl, 'http://local').pathname
    const name = path.split('/').filter(Boolean).pop()
    return name || documentUrl
  } catch {
    return documentUrl
  }
}

export function isExpenseDocumentLocalOnly(documentUrl?: string): boolean {
  return Boolean(documentUrl?.startsWith('local://'))
}

export function expenseDocumentViewUrl(documentUrl?: string): string | null {
  if (!documentUrl || isExpenseDocumentLocalOnly(documentUrl)) return null
  return documentUrl
}

export function isExpenseDocumentDownloadable(documentUrl?: string): boolean {
  return expenseDocumentViewUrl(documentUrl) != null
}
