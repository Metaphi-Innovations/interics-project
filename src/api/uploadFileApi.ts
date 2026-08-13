import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'

export type UploadedFileMetadata = {
  id: string
  originalName: string
  mimeType: string
  size: number
  viewUrl: string
  downloadUrl: string
}

/** Upload a document via POST /files/upload and return persisted file metadata. */
export async function uploadProjectDocumentFile(file: File): Promise<UploadedFileMetadata> {
  const form = new FormData()
  form.append('file', file)
  const res = await client.post('/files/upload', form, {
    headers: { 'Content-Type': undefined },
    timeout: 60_000,
  })
  return unwrapApiData<UploadedFileMetadata>(res.data)
}
