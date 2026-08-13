import { http, HttpResponse } from 'msw'

interface StatusMaster {
  id: string
  name: string
  status: 'active' | 'inactive'
}

interface NumberingSchemes {
  projectPrefix: string
  projectFormat: 'PRJ-YY-###' | 'PRJ-YYYY-###' | 'PRJ-###'
  invoicePrefix: string
  invoiceFormat: 'INV-YYYY-###' | 'INV-YY-###'
  clientPOPrefix: string
  vendorPOPrefix: string
  expensePrefix: string
}

// --- Seed data ---

let statuses: StatusMaster[] = [
  { id: 'sts-1', name: 'Execution Ongoing', status: 'active' },
  { id: 'sts-2', name: 'Payment Pending', status: 'active' },
  { id: 'sts-3', name: 'At Risk', status: 'active' },
  { id: 'sts-4', name: 'Completed', status: 'active' },
  { id: 'sts-5', name: 'On Hold', status: 'active' },
]

let numberingSchemes: NumberingSchemes = {
  projectPrefix: 'PRJ',
  projectFormat: 'PRJ-YY-###',
  invoicePrefix: 'INV',
  invoiceFormat: 'INV-YYYY-###',
  clientPOPrefix: 'PO-CLI',
  vendorPOPrefix: 'PO-VND',
  expensePrefix: 'EXP',
}

let idCounter = 100

function nextId(): string {
  return String(++idCounter)
}

export const settingsHandlers = [
  // Integrated System Settings modules + Project Management call the real backend
  // via API_BASE_URL — no MSW handlers here.

  // Status Master
  http.get('/api/v1/settings/statuses', () => HttpResponse.json(statuses)),
  http.post('/api/v1/settings/statuses', async ({ request }) => {
    const data = await request.json() as Omit<StatusMaster, 'id'>
    const row: StatusMaster = { id: `sts-${nextId()}`, ...data }
    statuses.push(row)
    return HttpResponse.json(row, { status: 201 })
  }),
  http.put('/api/v1/settings/statuses/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<StatusMaster>
    const idx = statuses.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    statuses[idx] = { ...statuses[idx], ...data }
    return HttpResponse.json(statuses[idx])
  }),
  http.patch('/api/v1/settings/statuses/:id/toggle', ({ params }) => {
    const idx = statuses.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    statuses[idx].status = statuses[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(statuses[idx])
  }),

  // Numbering Schemes
  http.get('/api/v1/settings/numbering-schemes', () => HttpResponse.json(numberingSchemes)),
  http.put('/api/v1/settings/numbering-schemes', async ({ request }) => {
    numberingSchemes = await request.json() as NumberingSchemes
    return HttpResponse.json(numberingSchemes)
  }),
]
