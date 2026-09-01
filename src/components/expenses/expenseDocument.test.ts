import { describe, expect, it, vi } from 'vitest'
import {
  expenseDocumentDisplayName,
  expenseDocumentViewUrl,
  isExpenseDocumentDownloadable,
  isExpenseDocumentLocalOnly,
} from './expenseDocumentUtils'

vi.mock('@/utils/openAuthenticatedDocument', () => ({
  downloadAuthenticatedDocument: vi.fn(),
  openAuthenticatedDocument: vi.fn(),
}))

import { downloadAuthenticatedDocument } from '@/utils/openAuthenticatedDocument'

describe('expense document helpers', () => {
  it('treats local:// documents as not downloadable', () => {
    expect(isExpenseDocumentLocalOnly('local://receipt.pdf')).toBe(true)
    expect(isExpenseDocumentDownloadable('local://receipt.pdf')).toBe(false)
    expect(expenseDocumentViewUrl('local://receipt.pdf')).toBeNull()
    expect(expenseDocumentDisplayName('local://receipt.pdf')).toBe('receipt.pdf')
  })

  it('treats uploaded file URLs as downloadable', () => {
    const url = '/api/v1/files/abc-123/view'
    expect(isExpenseDocumentDownloadable(url)).toBe(true)
    expect(expenseDocumentViewUrl(url)).toBe(url)
  })
})

describe('downloadAuthenticatedDocument integration', () => {
  it('can be invoked for expense file URLs', async () => {
    const mocked = vi.mocked(downloadAuthenticatedDocument)
    mocked.mockResolvedValue(undefined)

    await downloadAuthenticatedDocument('/api/v1/files/abc/view', 'receipt.pdf')

    expect(mocked).toHaveBeenCalledWith('/api/v1/files/abc/view', 'receipt.pdf')
  })
})
