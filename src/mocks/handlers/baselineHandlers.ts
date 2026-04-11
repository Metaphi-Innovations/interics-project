import { http, HttpResponse } from 'msw'
import type { ClientPO, Baseline, VendorPO } from '../../slices/baseline/reducer'

// ─── Seed data ────────────────────────────────────────────────────────────────

let clientPOs: ClientPO[] = [
  {
    id: 'po-001',
    projectId: 'p-001',
    poNumber: 'PO-CLI-2024-001',
    poDate: '2024-01-20',
    poValue: 2000000,
    documentUrl: null,
    status: 'Active',
    isPrimary: true,
  },
  {
    id: 'po-002',
    projectId: 'p-001',
    poNumber: 'PO-CLI-2024-002',
    poDate: '2024-03-15',
    poValue: 1500000,
    documentUrl: null,
    status: 'Active',
    isPrimary: false,
  },
]

let baselines: Baseline[] = [
  {
    id: 'bl-001',
    projectId: 'p-001',
    versionId: 'pv-001',
    versionLabel: 'Version 1',
    createdAt: '2024-01-22',
    lockedAt: '2024-01-22',
    status: 'Locked',
    clientPOId: 'po-001',
    totalRevenue: 3500000,
    totalCost: 900000,
    profitability: 2600000,
    categories: [
      {
        id: 'bc-001',
        categoryName: 'Design & Diligence',
        services: [
          {
            id: 'bs-001',
            name: 'Interior Design',
            subcategoryName: 'Interior Design',
            value: 1500000,
            originalValue: 1500000,
            adjustedValue: 1500000,
            clientMilestones: [
              {
                id: 'cm-001',
                name: 'Mobilization',
                percentage: 20,
                value: 300000,
                dueDate: '2024-02-01',
              },
              {
                id: 'cm-002',
                name: 'Design Draft',
                percentage: 40,
                value: 600000,
                dueDate: '2024-03-15',
              },
              {
                id: 'cm-003',
                name: 'Final Handover',
                percentage: 40,
                value: 600000,
                dueDate: '2024-06-30',
              },
            ],
            vendorMappings: [
              {
                id: 'vm-001',
                vendorId: 'v-001',
                vendorName: 'BuildWell Constructions',
                value: 900000,
                percentage: 60,
              },
            ],
          },
        ],
        totalValue: 1500000,
      },
      {
        id: 'bc-002',
        categoryName: 'Build Services',
        services: [
          {
            id: 'bs-002',
            name: 'Civil Works',
            subcategoryName: 'Build Services',
            value: 2000000,
            originalValue: 2000000,
            adjustedValue: 2000000,
            clientMilestones: [
              {
                id: 'cm-004',
                name: 'Mobilization',
                percentage: 25,
                value: 500000,
                dueDate: '2024-02-15',
              },
              {
                id: 'cm-005',
                name: 'Structure Complete',
                percentage: 50,
                value: 1000000,
                dueDate: '2024-05-01',
              },
              {
                id: 'cm-006',
                name: 'Handover',
                percentage: 25,
                value: 500000,
                dueDate: '2024-08-01',
              },
            ],
            vendorMappings: [],
          },
        ],
        totalValue: 2000000,
      },
    ],
  },
]

let vendorPOs: VendorPO[] = [
  {
    id: 'vpo-001',
    projectId: 'p-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    poNumber: 'PO-VEN-2024-001',
    poDate: '2024-01-25',
    poValue: 900000,
    status: 'Active',
    milestones: [
      {
        id: 'vml-001',
        name: 'Advance',
        percentage: 30,
        value: 270000,
        dueDate: '2024-02-05',
        status: 'Paid',
      },
      {
        id: 'vml-002',
        name: 'Midpoint',
        percentage: 70,
        value: 630000,
        dueDate: '2024-05-01',
        status: 'Pending',
      },
    ],
  },
]

let poCounter = 3
let baselineCounter = 2
let vendorPOCounter = 2

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const baselineHandlers = [
  // GET /api/projects/:projectId/po — returns array
  http.get('/api/projects/:projectId/po', ({ params }) => {
    const projectId = params.projectId as string
    const pos = clientPOs.filter((p) => p.projectId === projectId)
    return HttpResponse.json(pos)
  }),

  // POST /api/projects/:projectId/po — adds new PO to array
  http.post('/api/projects/:projectId/po', async ({ params, request }) => {
    const projectId = params.projectId as string
    const body = await request.json() as Omit<ClientPO, 'id' | 'projectId'>
    const newPO: ClientPO = {
      id: `po-${String(poCounter++).padStart(3, '0')}`,
      projectId,
      ...body,
    }
    clientPOs.push(newPO)
    return HttpResponse.json(newPO, { status: 201 })
  }),

  // PUT /api/projects/:projectId/po/:poId — updates specific PO
  http.put('/api/projects/:projectId/po/:poId', async ({ params, request }) => {
    const poId = params.poId as string
    const idx = clientPOs.findIndex((p) => p.id === poId)
    if (idx === -1) return HttpResponse.json({ message: 'PO not found' }, { status: 404 })
    const body = await request.json() as Partial<ClientPO>
    clientPOs[idx] = { ...clientPOs[idx], ...body }
    return HttpResponse.json(clientPOs[idx])
  }),

  // DELETE /api/projects/:projectId/po/:poId — deletes specific PO
  http.delete('/api/projects/:projectId/po/:poId', ({ params }) => {
    const poId = params.poId as string
    const idx = clientPOs.findIndex((p) => p.id === poId)
    if (idx === -1) return HttpResponse.json({ message: 'PO not found' }, { status: 404 })
    clientPOs.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  // GET /api/projects/:projectId/baseline
  http.get('/api/projects/:projectId/baseline', ({ params }) => {
    const projectId = params.projectId as string
    const baseline = baselines.find((b) => b.projectId === projectId)
    if (!baseline) return HttpResponse.json(null, { status: 404 })
    return HttpResponse.json(baseline)
  }),

  // POST /api/projects/:projectId/baseline
  http.post('/api/projects/:projectId/baseline', async ({ params, request }) => {
    const projectId = params.projectId as string
    const body = await request.json() as Partial<Baseline>
    const now = new Date().toISOString().split('T')[0]
    const newBaseline: Baseline = {
      id: `bl-${String(baselineCounter++).padStart(3, '0')}`,
      projectId,
      versionId: body.versionId ?? '',
      versionLabel: body.versionLabel ?? '',
      createdAt: now,
      lockedAt: now,
      status: 'Locked',
      clientPOId: body.clientPOId ?? '',
      categories: body.categories ?? [],
      totalRevenue: body.totalRevenue ?? 0,
      totalCost: body.totalCost ?? 0,
      profitability: body.profitability ?? 0,
    }
    baselines.push(newBaseline)
    return HttpResponse.json(newBaseline, { status: 201 })
  }),

  // PUT /api/projects/:projectId/baseline/:baselineId
  http.put('/api/projects/:projectId/baseline/:baselineId', async ({ params, request }) => {
    const baselineId = params.baselineId as string
    const idx = baselines.findIndex((b) => b.id === baselineId)
    if (idx === -1) return HttpResponse.json({ message: 'Baseline not found' }, { status: 404 })
    const body = await request.json() as Partial<Baseline>
    baselines[idx] = { ...baselines[idx], ...body }
    return HttpResponse.json(baselines[idx])
  }),

  // GET /api/projects/:projectId/vendor-pos
  http.get('/api/projects/:projectId/vendor-pos', ({ params }) => {
    const projectId = params.projectId as string
    const pos = vendorPOs.filter((p) => p.projectId === projectId)
    return HttpResponse.json(pos)
  }),

  // POST /api/projects/:projectId/vendor-pos
  http.post('/api/projects/:projectId/vendor-pos', async ({ params, request }) => {
    const projectId = params.projectId as string
    const body = await request.json() as Omit<VendorPO, 'id' | 'projectId' | 'milestones'>
    const newVendorPO: VendorPO = {
      id: `vpo-${String(vendorPOCounter++).padStart(3, '0')}`,
      projectId,
      milestones: [],
      ...body,
    }
    vendorPOs.push(newVendorPO)
    return HttpResponse.json(newVendorPO, { status: 201 })
  }),

  // PUT /api/projects/:projectId/vendor-pos/:poId
  http.put('/api/projects/:projectId/vendor-pos/:poId', async ({ params, request }) => {
    const poId = params.poId as string
    const idx = vendorPOs.findIndex((p) => p.id === poId)
    if (idx === -1) return HttpResponse.json({ message: 'Vendor PO not found' }, { status: 404 })
    const body = await request.json() as Partial<VendorPO>
    vendorPOs[idx] = { ...vendorPOs[idx], ...body }
    return HttpResponse.json(vendorPOs[idx])
  }),
]
