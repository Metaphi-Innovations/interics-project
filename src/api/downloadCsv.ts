import client from './client'

function compactParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

export async function downloadCsv(
  path: string,
  params: Record<string, unknown>,
  filename: string,
) {
  const response = await client.get(path, {
    params: compactParams(params),
    responseType: 'blob',
  })

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
