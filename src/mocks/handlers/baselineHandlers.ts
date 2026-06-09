import { http, HttpResponse } from 'msw'
import type { ClientPO, Baseline, VendorPO } from '../../slices/baseline/reducer'
import type { PitchCategory, PlannedExpense } from '../../slices/pitch/reducer'
import { recalcTransitionDraft } from '../../utils/transitionDraft'

// ─── Seed: pitch-shaped baseline for p-001 (matches pitch mock + quotations) ─

function buildP001BaselineCategories(): PitchCategory[] {
  return [
    {
      id: 'pc-001',
      categoryId: 'cat-001',
      categoryName: 'Design & Diligence',
      totalValue: 1_500_000,
      services: [
        {
          id: 'ps-001',
          name: 'Interior Design',
          subcategoryId: 'sub-001',
          subcategoryName: 'Interior Design',
          customName: null,
          value: 1_500_000,
          sacCode: '998391',
          gstRate: 18,
          clientMilestones: [
            { id: 'cm-001', name: 'Mobilization', percentage: 20, value: 300_000 },
            { id: 'cm-002', name: 'Design Draft', percentage: 40, value: 600_000 },
            { id: 'cm-003', name: 'Final Handover', percentage: 40, value: 600_000 },
          ],
          vendorMappings: [
            {
              id: 'vm-001',
              vendorId: 'v-001',
              vendorName: 'BuildWell Constructions',
              value: 900_000,
              percentage: 60,
              milestones: [
                { id: 'vml-001', name: 'Advance', percentage: 30, value: 270_000 },
                { id: 'vml-002', name: 'Midpoint', percentage: 60, value: 540_000 },
              ],
              retention: { percentage: 10, amount: 90_000 },
              isMeasurable: false,
              quotation: {
                fileName: 'buildwell-design-quote.pdf',
                fileUrl: 'https://example.com/quotes/buildwell-design.pdf',
                uploadedAt: '2024-01-18',
              },
            },
          ],
          milestonesTotal: 1_500_000,
        },
      ],
    },
    {
      id: 'pc-002',
      categoryId: 'cat-002',
      categoryName: 'Build Services',
      totalValue: 2_000_000,
      services: [
        {
          id: 'ps-002',
          name: 'Construction / Build Services',
          subcategoryId: 'sub-010',
          subcategoryName: 'Construction / Build Services',
          customName: null,
          value: 2_000_000,
          sacCode: '995411',
          gstRate: 18,
          clientMilestones: [
            { id: 'cm-004', name: 'Mobilization', percentage: 25, value: 500_000 },
            { id: 'cm-005', name: 'Structure Complete', percentage: 50, value: 1_000_000 },
            { id: 'cm-006', name: 'Handover', percentage: 25, value: 500_000 },
          ],
          vendorMappings: [
            {
              id: 'vm-002',
              vendorId: 'v-001',
              vendorName: 'BuildWell Constructions',
              value: 2_000_000,
              percentage: 100,
              milestones: [
                { id: 'vml-c1', name: 'Mobilization', percentage: 25, value: 500_000 },
                { id: 'vml-c2', name: 'Structure', percentage: 50, value: 1_000_000 },
                { id: 'vml-c3', name: 'Handover', percentage: 25, value: 500_000 },
              ],
              isMeasurable: false,
              quotation: {
                fileName: 'buildwell-civil-quote.pdf',
                fileUrl: 'https://example.com/quotes/buildwell-civil.pdf',
                uploadedAt: '2024-01-19',
              },
            },
          ],
          milestonesTotal: 2_000_000,
        },
      ],
    },
  ]
}

const p001PlannedExpenses: PlannedExpense[] = [
  { id: 'pe-seed-1', type: 'additional', name: 'Site logistics', amount: 125_000 },
  {
    id: 'pe-seed-2',
    type: 'common',
    name: 'Shared coordination',
    amount: 75_000,
    vendorSplits: [{ vendorId: 'v-001', percentage: 100, amount: 75_000 }],
  },
]

const p001OriginalServiceValues: Record<string, number> = {
  'ps-001': 1_500_000,
  'ps-002': 2_000_000,
}

function recalcBaselineFinancials(
  categories: PitchCategory[],
  plannedExpenses: PlannedExpense[],
  originalServiceValues: Record<string, number>,
  projectId: string,
): Pick<Baseline, 'totalRevenue' | 'totalCost' | 'profitability' | 'categories' | 'plannedExpenses'> {
  const r = recalcTransitionDraft({
    sourceVersionId: 'pv-001',
    projectId,
    versionNumber: 1,
    label: 'Version 1',
    categories,
    plannedExpenses,
    originalServiceValues,
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
  })
  return {
    categories: r.categories,
    plannedExpenses: r.plannedExpenses,
    totalRevenue: r.totalRevenue,
    totalCost: r.totalCost,
    profitability: r.profitability,
  }
}

/** Minimal baseline for p-002 — vendor milestone ids align with liveFinanceMockState vendor invoices. */
function buildP002BaselineCategories(): PitchCategory[] {
  return [
    {
      id: 'pc-p2-a',
      categoryId: 'cat-p2-a',
      categoryName: 'Design',
      totalValue: 500_000,
      services: [
        {
          id: 'ps-001',
          name: 'Interior Design',
          subcategoryId: 'sub-p2-1',
          subcategoryName: 'Interior Design',
          customName: null,
          value: 500_000,
          sacCode: '998391',
          gstRate: 18,
          clientMilestones: [
            { id: 'cm-p2-id', name: 'Delivery', percentage: 100, value: 500_000 },
          ],
          vendorMappings: [
            {
              id: 'vm-p2-fm',
              vendorId: 'v-002',
              vendorName: 'FloorMaster',
              value: 500_000,
              percentage: 100,
              milestones: [
                { id: 'vml-p2-i1', name: 'Interior Design', percentage: 100, value: 500_000 },
              ],
              isMeasurable: false,
            },
          ],
          milestonesTotal: 500_000,
        },
      ],
    },
    {
      id: 'pc-p2-b',
      categoryId: 'cat-p2-b',
      categoryName: 'Civil',
      totalValue: 800_000,
      services: [
        {
          id: 'ps-002',
          name: 'Civil Works',
          subcategoryId: 'sub-p2-2',
          subcategoryName: 'Civil Works',
          customName: null,
          value: 800_000,
          sacCode: '995411',
          gstRate: 18,
          clientMilestones: [
            { id: 'cm-p2-cw', name: 'Civil', percentage: 100, value: 800_000 },
          ],
          vendorMappings: [
            {
              id: 'vm-p2-bw',
              vendorId: 'v-001',
              vendorName: 'BuildWell',
              value: 800_000,
              percentage: 100,
              milestones: [
                { id: 'vml-p2-c1', name: 'Civil Works', percentage: 100, value: 800_000 },
              ],
              isMeasurable: false,
            },
          ],
          milestonesTotal: 800_000,
        },
      ],
    },
  ]
}

const p002PlannedExpenses: PlannedExpense[] = []

const p002OriginalServiceValues: Record<string, number> = {
  'ps-001': 500_000,
  'ps-002': 800_000,
}

function buildBl002(): Baseline {
  const cats = buildP002BaselineCategories()
  const fin = recalcBaselineFinancials(cats, p002PlannedExpenses, p002OriginalServiceValues, 'p-002')
  return {
    id: 'bl-002',
    projectId: 'p-002',
    version: 1,
    versionId: 'pv-p2-001',
    versionLabel: 'Version 1',
    basedOnPitchVersion: 'Version 1',
    pitchVersionNumber: 1,
    isActive: true,
    createdAt: '2026-01-10',
    lockedAt: '2026-01-10',
    status: 'Locked',
    clientPOId: 'po-p2-001',
    categories: fin.categories,
    plannedExpenses: fin.plannedExpenses,
    originalServiceValues: p002OriginalServiceValues,
    totalRevenue: fin.totalRevenue,
    totalCost: fin.totalCost,
    profitability: fin.profitability,
  }
}

function buildBl001(): Baseline {
  const cats = buildP001BaselineCategories()
  const fin = recalcBaselineFinancials(cats, p001PlannedExpenses, p001OriginalServiceValues, 'p-001')
  return {
    id: 'bl-001',
    projectId: 'p-001',
    version: 1,
    versionId: 'pv-001',
    versionLabel: 'Version 1',
    basedOnPitchVersion: 'Version 1',
    pitchVersionNumber: 1,
    isActive: true,
    createdAt: '2024-01-22',
    lockedAt: '2024-01-22',
    status: 'Locked',
    clientPOId: 'po-001',
    categories: fin.categories,
    plannedExpenses: fin.plannedExpenses,
    originalServiceValues: p001OriginalServiceValues,
    totalRevenue: fin.totalRevenue,
    totalCost: fin.totalCost,
    profitability: fin.profitability,
  }
}

// ─── Seed data ────────────────────────────────────────────────────────────────

let clientPOs: ClientPO[] = [
  {
    id: 'po-001',
    projectId: 'p-001',
    poNumber: 'PO-CLI-2024-001',
    startDate: '2024-01-20',
    endDate: '2024-06-30',
    poValue: 2_000_000,
    documentUrl: 'https://example.com/client-po/po-001.pdf',
    fileName: 'PO-CLI-2024-001.pdf',
    uploadedAt: '2024-01-20',
    milestones: [
      {
        id: 'cm-001',
        serviceId: 'ps-001',
        serviceName: 'Interior Design',
        name: 'Mobilization',
        percentage: 15,
        value: 300_000,
      },
      {
        id: 'cm-002',
        serviceId: 'ps-001',
        serviceName: 'Interior Design',
        name: 'Design Draft',
        percentage: 30,
        value: 600_000,
      },
      {
        id: 'cm-004',
        serviceId: 'ps-002',
        serviceName: 'Construction / Build Services',
        name: 'Mobilization',
        percentage: 25,
        value: 500_000,
      },
      {
        id: 'cm-005',
        serviceId: 'ps-001',
        serviceName: 'Interior Design',
        name: 'Final Handover',
        percentage: 22,
        value: 450_000,
      },
    ],
  },
  {
    id: 'po-002',
    projectId: 'p-001',
    poNumber: 'PO-CLI-2024-002',
    startDate: '2024-03-15',
    endDate: '2024-12-31',
    poValue: 1_500_000,
    documentUrl: null,
    fileName: 'PO-CLI-2024-002-draft.pdf',
    uploadedAt: '2024-03-10',
  },
  {
    id: 'po-p2-001',
    projectId: 'p-002',
    poNumber: 'PO-P2-2026-001',
    startDate: '2026-01-05',
    endDate: '2026-12-31',
    poValue: 1_200_000,
    documentUrl: null,
    uploadedAt: '2026-01-05',
    milestones: [
      {
        id: 'cm-101',
        serviceId: 'ps-001',
        serviceName: 'Interior Design',
        name: 'Design phase',
        percentage: 35,
        value: 420_000,
      },
      {
        id: 'cm-102',
        serviceId: 'ps-001',
        serviceName: 'Interior Design',
        name: 'Site execution',
        percentage: 23,
        value: 280_000,
      },
      {
        id: 'cm-103',
        serviceId: 'ps-001',
        serviceName: 'Interior Design',
        name: 'Snagging',
        percentage: 12,
        value: 150_000,
      },
    ],
  },
]

/** All baseline versions per project (only one isActive: true). */
let baselines: Baseline[] = [buildBl001(), buildBl002()]

let vendorPOs: VendorPO[] = [
  {
    id: 'vpo-001',
    projectId: 'p-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    poNumber: 'PO-VEN-2024-001',
    poDate: '2024-01-25',
    poValue: 900_000,
    status: 'Issued',
    paymentTerms: '30% advance, 70% on milestone certification',
    linkedBaselineServiceIds: ['ps-001'],
    documentUrl: 'https://example.com/vendor-po/vpo-001.pdf',
    fileName: 'PO-VEN-2024-001.pdf',
    milestones: [
      {
        id: 'vml-001',
        name: 'Advance',
        percentage: 30,
        value: 270_000,
        dueDate: '2024-02-05',
        status: 'Paid',
      },
      {
        id: 'vml-002',
        name: 'Midpoint',
        percentage: 70,
        value: 630_000,
        dueDate: '2024-05-01',
        status: 'Pending',
      },
    ],
  },
  {
    id: 'vpo-002',
    projectId: 'p-001',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    poNumber: 'PO-VEN-2024-002',
    poDate: '2024-02-01',
    poValue: 2_000_000,
    status: 'Accepted',
    paymentTerms: 'Net 45 from invoice',
    linkedBaselineServiceIds: ['ps-002'],
    documentUrl: null,
    fileName: null,
    milestones: [],
  },
]

let poCounter = 3
let baselineCounter = 2
let vendorPOCounter = 3

function activeBaseline(projectId: string): Baseline | undefined {
  return baselines.find((b) => b.projectId === projectId && b.isActive)
}

function baselinesForProject(projectId: string): Baseline[] {
  return baselines.filter((b) => b.projectId === projectId).sort((a, b) => b.version - a.version)
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const baselineHandlers = [
  http.get('/api/projects/:projectId/po', ({ params }) => {
    const projectId = params.projectId as string
    const pos = clientPOs.filter((p) => p.projectId === projectId)
    return HttpResponse.json(pos)
  }),

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

  http.put('/api/projects/:projectId/po/:poId', async ({ params, request }) => {
    const poId = params.poId as string
    const idx = clientPOs.findIndex((p) => p.id === poId)
    if (idx === -1) return HttpResponse.json({ message: 'PO not found' }, { status: 404 })
    const body = await request.json() as Partial<ClientPO>
    clientPOs[idx] = { ...clientPOs[idx], ...body }
    return HttpResponse.json(clientPOs[idx])
  }),

  http.delete('/api/projects/:projectId/po/:poId', ({ params }) => {
    const poId = params.poId as string
    const idx = clientPOs.findIndex((p) => p.id === poId)
    if (idx === -1) return HttpResponse.json({ message: 'PO not found' }, { status: 404 })
    clientPOs.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  http.get('/api/projects/:projectId/baseline', ({ params }) => {
    const projectId = params.projectId as string
    const baseline = activeBaseline(projectId)
    if (!baseline) return HttpResponse.json(null, { status: 404 })
    return HttpResponse.json(baseline)
  }),

  http.get('/api/projects/:projectId/baseline/history', ({ params }) => {
    const projectId = params.projectId as string
    return HttpResponse.json(baselinesForProject(projectId))
  }),

  http.post('/api/projects/:projectId/baseline', async ({ params, request }) => {
    const projectId = params.projectId as string
    const body = await request.json() as Partial<Baseline>
    const now = new Date().toISOString().split('T')[0]

    const existing = baselines.filter((b) => b.projectId === projectId)
    const nextVersion = existing.length === 0 ? 1 : Math.max(...existing.map((b) => b.version)) + 1

    for (const b of baselines) {
      if (b.projectId === projectId) b.isActive = false
    }

    const cats = structuredClone(body.categories ?? []) as PitchCategory[]
    const planned = structuredClone(body.plannedExpenses ?? []) as PlannedExpense[]
    const originals = body.originalServiceValues ?? {}
    const fin = recalcBaselineFinancials(cats, planned, originals, projectId)

    const newBaseline: Baseline = {
      id: `bl-${String(baselineCounter++).padStart(3, '0')}`,
      projectId,
      version: nextVersion,
      versionId: body.versionId ?? '',
      versionLabel: body.versionLabel ?? '',
      basedOnPitchVersion: body.basedOnPitchVersion ?? body.versionLabel ?? '',
      pitchVersionNumber: body.pitchVersionNumber ?? 1,
      isActive: true,
      createdAt: now,
      lockedAt: now,
      status: 'Locked',
      clientPOId: body.clientPOId ?? '',
      categories: fin.categories,
      plannedExpenses: fin.plannedExpenses,
      originalServiceValues: originals,
      totalRevenue: body.totalRevenue ?? fin.totalRevenue,
      totalCost: body.totalCost ?? fin.totalCost,
      profitability: body.profitability ?? fin.profitability,
    }
    baselines.push(newBaseline)
    return HttpResponse.json(newBaseline, { status: 201 })
  }),

  http.put('/api/projects/:projectId/baseline/:baselineId', async ({ params, request }) => {
    const baselineId = params.baselineId as string
    const idx = baselines.findIndex((b) => b.id === baselineId)
    if (idx === -1) return HttpResponse.json({ message: 'Baseline not found' }, { status: 404 })
    const body = await request.json() as Partial<Baseline>
    let merged: Baseline = { ...baselines[idx], ...body }
    if (body.plannedExpenses !== undefined) {
      const planned = structuredClone(body.plannedExpenses) as PlannedExpense[]
      const fin = recalcBaselineFinancials(
        merged.categories,
        planned,
        merged.originalServiceValues ?? {},
        baselines[idx].projectId,
      )
      merged = {
        ...merged,
        categories: fin.categories,
        plannedExpenses: fin.plannedExpenses,
        totalRevenue: fin.totalRevenue,
        totalCost: fin.totalCost,
        profitability: fin.profitability,
      }
    }
    baselines[idx] = merged
    return HttpResponse.json(baselines[idx])
  }),

  http.get('/api/projects/:projectId/vendor-pos', ({ params }) => {
    const projectId = params.projectId as string
    const pos = vendorPOs.filter((p) => p.projectId === projectId)
    return HttpResponse.json(pos)
  }),

  http.post('/api/projects/:projectId/vendor-pos', async ({ params, request }) => {
    const projectId = params.projectId as string
    const body = await request.json() as Omit<VendorPO, 'id' | 'projectId' | 'milestones'> & {
      milestones?: VendorPO['milestones']
    }
    const { milestones: bodyMilestones, status: bodyStatus, ...bodyRest } = body
    const newVendorPO: VendorPO = {
      ...bodyRest,
      id: `vpo-${String(vendorPOCounter++).padStart(3, '0')}`,
      projectId,
      milestones: bodyMilestones ?? [],
      status: bodyStatus ?? 'Draft',
    }
    vendorPOs.push(newVendorPO)
    return HttpResponse.json(newVendorPO, { status: 201 })
  }),

  http.put('/api/projects/:projectId/vendor-pos/:poId', async ({ params, request }) => {
    const poId = params.poId as string
    const idx = vendorPOs.findIndex((p) => p.id === poId)
    if (idx === -1) return HttpResponse.json({ message: 'Vendor PO not found' }, { status: 404 })
    const body = await request.json() as Partial<VendorPO>
    vendorPOs[idx] = { ...vendorPOs[idx], ...body }
    return HttpResponse.json(vendorPOs[idx])
  }),
]
