import { http, HttpResponse } from 'msw'
import { DEFAULT_CATEGORIES } from '../../config/categories'
import type {
  PitchVersion,
  PitchCategory,
  PitchService,
  ClientMilestone,
  VendorMapping,
  PlannedExpense,
} from '../../slices/pitch/reducer'
import { normalizeVendorMapping } from '../../utils/vendorMilestones'

let pitchCategoryInstanceCounter = 100

/** Empty category rows for a new pitch version (matches Settings / config masters). */
function buildDefaultEmptyPitchCategories(): PitchCategory[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    id: `pc-${String(++pitchCategoryInstanceCounter).padStart(3, '0')}`,
    categoryId: c.id,
    categoryName: c.name,
    services: [],
    totalValue: 0,
  }))
}

// ─── Seed data ────────────────────────────────────────────────────────────────

let pitchVersions: PitchVersion[] = [
  {
    id: 'pv-001',
    projectId: 'p-001',
    versionNumber: 1,
    label: 'Version 1',
    isActive: true,
    createdAt: '2024-01-15',
    categories: [
      {
        id: 'pc-001',
        categoryId: 'cat-001',
        categoryName: 'Design & Diligence',
        services: [
          {
            id: 'ps-001',
            name: 'Interior Design',
            subcategoryId: 'sub-001',
            subcategoryName: 'Interior Design',
            customName: null,
            value: 1500000,
            sacCode: '998391',
            gstRate: 18,
            clientMilestones: [
              {
                id: 'cm-001',
                name: 'Mobilization',
                percentage: 20,
                value: 300000,
              },
              {
                id: 'cm-002',
                name: 'Design Draft',
                percentage: 40,
                value: 600000,
              },
              {
                id: 'cm-003',
                name: 'Final Handover',
                percentage: 40,
                value: 600000,
              },
            ],
            vendorMappings: [
              {
                id: 'vm-001',
                vendorId: 'v-001',
                vendorName: 'BuildWell Constructions',
                value: 900000,
                percentage: 60,
                milestones: [
                  {
                    id: 'vml-001',
                    name: 'Advance',
                    percentage: 30,
                    value: 270000,
                  },
                  {
                    id: 'vml-002',
                    name: 'Midpoint',
                    percentage: 60,
                    value: 540000,
                  },
                ],
                retention: { percentage: 10, amount: 90_000 },
                isMeasurable: false,
              },
            ],
            milestonesTotal: 1500000,
          },
        ],
        totalValue: 1500000,
      },
      {
        id: 'pc-002',
        categoryId: 'cat-002',
        categoryName: 'Build Services',
        services: [
          {
            id: 'ps-002',
            name: 'Construction / Build Services',
            subcategoryId: 'sub-010',
            subcategoryName: 'Construction / Build Services',
            customName: null,
            value: 2000000,
            sacCode: '995411',
            gstRate: 18,
            clientMilestones: [
              {
                id: 'cm-004',
                name: 'Mobilization',
                percentage: 25,
                value: 500000,
              },
              {
                id: 'cm-005',
                name: 'Structure Complete',
                percentage: 50,
                value: 1000000,
              },
              {
                id: 'cm-006',
                name: 'Handover',
                percentage: 25,
                value: 500000,
              },
            ],
            vendorMappings: [],
            milestonesTotal: 2000000,
          },
        ],
        totalValue: 2000000,
      },
    ],
    plannedExpenses: [
      {
        id: 'pe-seed-1',
        type: 'additional',
        name: 'Site logistics',
        amount: 125_000,
      },
      {
        id: 'pe-seed-2',
        type: 'common',
        name: 'Shared coordination',
        amount: 75_000,
        vendorSplits: [{ vendorId: 'v-001', percentage: 100, amount: 75_000 }],
      },
    ],
    totalRevenue: 3_500_000,
    totalCost: 1_100_000,
    profitability: 2_400_000,
  },
]

let versionCounter = 2

// ─── Helper: recalculate version totals ───────────────────────────────────────

function recalcVersion(version: PitchVersion): PitchVersion {
  let totalRevenue = 0
  let vendorCostSum = 0
  const plannedExpenses = version.plannedExpenses ?? []
  const updatedCategories = version.categories.map((cat) => {
    const catTotal = cat.services.reduce((sum, s) => sum + s.value, 0)
    totalRevenue += catTotal
    const servicesNormalized = cat.services.map((s) => ({
      ...s,
      vendorMappings: s.vendorMappings.map(normalizeVendorMapping),
    }))
    const vendorCostInCat = servicesNormalized.reduce(
      (sum, s) => sum + s.vendorMappings.reduce((vs, vm) => vs + vm.value, 0),
      0,
    )
    vendorCostSum += vendorCostInCat
    return { ...cat, totalValue: catTotal, services: servicesNormalized }
  })
  const plannedTotal = plannedExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalCost = vendorCostSum + plannedTotal
  return {
    ...version,
    categories: updatedCategories,
    plannedExpenses,
    totalRevenue,
    totalCost,
    profitability: totalRevenue - totalCost,
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const pitchHandlers = [
  // GET /api/projects/:projectId/pitch/versions
  http.get('/api/projects/:projectId/pitch/versions', ({ params }) => {
    const projectId = params.projectId as string
    const versions = pitchVersions.filter((v) => v.projectId === projectId)
    return HttpResponse.json(versions)
  }),

  // POST /api/projects/:projectId/pitch/versions
  http.post('/api/projects/:projectId/pitch/versions', async ({ params, request }) => {
    const projectId = params.projectId as string
    const body = await request.json() as { label: string; copyFromVersionId?: string }

    const existingVersions = pitchVersions.filter((v) => v.projectId === projectId)
    const versionNumber = existingVersions.length + 1

    let newVersion: PitchVersion

    if (body.copyFromVersionId) {
      const source = pitchVersions.find((v) => v.id === body.copyFromVersionId)
      if (!source) {
        return HttpResponse.json({ message: 'Source version not found' }, { status: 404 })
      }
      newVersion = {
        ...JSON.parse(JSON.stringify(source)) as PitchVersion,
        id: `pv-${String(versionCounter++).padStart(3, '0')}`,
        projectId,
        versionNumber,
        label: body.label,
        isActive: false,
        createdAt: new Date().toISOString().split('T')[0],
      }
    } else {
      newVersion = {
        id: `pv-${String(versionCounter++).padStart(3, '0')}`,
        projectId,
        versionNumber,
        label: body.label,
        isActive: false,
        createdAt: new Date().toISOString().split('T')[0],
        categories: buildDefaultEmptyPitchCategories(),
        plannedExpenses: [],
        totalRevenue: 0,
        totalCost: 0,
        profitability: 0,
      }
    }

    const normalized: PitchVersion = Array.isArray(newVersion.plannedExpenses)
      ? newVersion
      : { ...newVersion, plannedExpenses: [] as PlannedExpense[] }
    pitchVersions.push(recalcVersion(normalized))
    return HttpResponse.json(pitchVersions[pitchVersions.length - 1], { status: 201 })
  }),

  // GET /api/projects/:projectId/pitch/versions/:versionId
  http.get('/api/projects/:projectId/pitch/versions/:versionId', ({ params }) => {
    const version = pitchVersions.find((v) => v.id === params.versionId)
    if (!version) {
      return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
    }
    return HttpResponse.json(version)
  }),

  // PUT /api/projects/:projectId/pitch/versions/:versionId
  http.put('/api/projects/:projectId/pitch/versions/:versionId', async ({ params, request }) => {
    const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<PitchVersion>
    pitchVersions[idx] = { ...pitchVersions[idx], ...data }
    return HttpResponse.json(recalcVersion(pitchVersions[idx]))
  }),

  // POST /api/projects/:projectId/pitch/versions/:versionId/categories
  http.post(
    '/api/projects/:projectId/pitch/versions/:versionId/categories',
    async ({ params, request }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const body = await request.json() as Omit<PitchCategory, 'services' | 'totalValue'>
      const newCategory: PitchCategory = { ...body, services: [], totalValue: 0 }
      pitchVersions[idx] = {
        ...pitchVersions[idx],
        categories: [...pitchVersions[idx].categories, newCategory],
      }
      return HttpResponse.json(recalcVersion(pitchVersions[idx]))
    }
  ),

  // DELETE /api/projects/:projectId/pitch/versions/:versionId/categories/:categoryId
  http.delete(
    '/api/projects/:projectId/pitch/versions/:versionId/categories/:categoryId',
    ({ params }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      updated.categories = updated.categories.filter((c) => c.id !== params.categoryId)
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),

  // POST .../categories/:categoryId/services
  http.post(
    '/api/projects/:projectId/pitch/versions/:versionId/categories/:categoryId/services',
    async ({ params, request }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const catIdx = pitchVersions[idx].categories.findIndex(
        (c) => c.id === params.categoryId
      )
      if (catIdx === -1) {
        return HttpResponse.json({ message: 'Category not found' }, { status: 404 })
      }
      const body = await request.json() as Partial<PitchService>
      const newService: PitchService = {
        id: `ps-${Date.now()}`,
        name: body.name ?? 'New Service',
        subcategoryId: body.subcategoryId ?? null,
        subcategoryName: body.subcategoryName ?? null,
        customName: body.customName ?? null,
        value: body.value ?? 0,
        clientMilestones: body.clientMilestones ?? [],
        vendorMappings: body.vendorMappings ?? [],
        milestonesTotal: 0,
      }
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      updated.categories[catIdx].services.push(newService)
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),

  // PUT .../categories/:categoryId/services/:serviceId
  http.put(
    '/api/projects/:projectId/pitch/versions/:versionId/categories/:categoryId/services/:serviceId',
    async ({ params, request }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      const cat = updated.categories.find((c) => c.id === params.categoryId)
      if (!cat) return HttpResponse.json({ message: 'Category not found' }, { status: 404 })
      const sIdx = cat.services.findIndex((s) => s.id === params.serviceId)
      if (sIdx === -1) return HttpResponse.json({ message: 'Service not found' }, { status: 404 })
      const data = await request.json() as Partial<PitchService>
      cat.services[sIdx] = { ...cat.services[sIdx], ...data }
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),

  // DELETE .../categories/:categoryId/services/:serviceId
  http.delete(
    '/api/projects/:projectId/pitch/versions/:versionId/categories/:categoryId/services/:serviceId',
    ({ params }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      const cat = updated.categories.find((c) => c.id === params.categoryId)
      if (!cat) return HttpResponse.json({ message: 'Category not found' }, { status: 404 })
      cat.services = cat.services.filter((s) => s.id !== params.serviceId)
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),

  // PUT .../services/:serviceId/milestones
  http.put(
    '/api/projects/:projectId/pitch/versions/:versionId/services/:serviceId/milestones',
    async ({ params, request }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const { milestones } = await request.json() as { milestones: ClientMilestone[] }
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      for (const cat of updated.categories) {
        const s = cat.services.find((sv) => sv.id === params.serviceId)
        if (s) {
          s.clientMilestones = milestones
          s.milestonesTotal = milestones.reduce((sum, m) => sum + m.value, 0)
        }
      }
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),

  // PUT .../services/:serviceId/vendors
  http.put(
    '/api/projects/:projectId/pitch/versions/:versionId/services/:serviceId/vendors',
    async ({ params, request }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const { mappings } = await request.json() as { mappings: VendorMapping[] }
      const normalized = mappings.map((m) => normalizeVendorMapping(m))
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      for (const cat of updated.categories) {
        const s = cat.services.find((sv) => sv.id === params.serviceId)
        if (s) {
          s.vendorMappings = normalized
        }
      }
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),

  // PUT .../planned-expenses
  http.put(
    '/api/projects/:projectId/pitch/versions/:versionId/planned-expenses',
    async ({ params, request }) => {
      const idx = pitchVersions.findIndex((v) => v.id === params.versionId)
      if (idx === -1) {
        return HttpResponse.json({ message: 'Version not found' }, { status: 404 })
      }
      const { expenses } = await request.json() as { expenses: PlannedExpense[] }
      pitchVersions[idx] = recalcVersion({
        ...pitchVersions[idx],
        plannedExpenses: expenses,
      })
      return HttpResponse.json(pitchVersions[idx])
    },
  ),
]
