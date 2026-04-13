import { http, HttpResponse } from 'msw'
import type { PitchVersion, PitchCategory, PitchService, ClientMilestone, VendorMapping } from '../../slices/pitch/reducer'

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
                milestones: [
                  {
                    id: 'vml-001',
                    name: 'Advance',
                    percentage: 30,
                    value: 270000,
                    dueDate: '2024-02-05',
                  },
                  {
                    id: 'vml-002',
                    name: 'Midpoint',
                    percentage: 70,
                    value: 630000,
                    dueDate: '2024-05-01',
                  },
                ],
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
            name: 'Civil Works',
            subcategoryId: 'sub-010',
            subcategoryName: 'Build Services',
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
            milestonesTotal: 2000000,
          },
        ],
        totalValue: 2000000,
      },
    ],
    totalRevenue: 3500000,
    totalCost: 900000,
    profitability: 2600000,
  },
]

let versionCounter = 2

// ─── Helper: recalculate version totals ───────────────────────────────────────

function recalcVersion(version: PitchVersion): PitchVersion {
  let totalRevenue = 0
  let totalCost = 0
  const updatedCategories = version.categories.map((cat) => {
    const catTotal = cat.services.reduce((sum, s) => sum + s.value, 0)
    totalRevenue += catTotal
    const vendorCost = cat.services.reduce(
      (sum, s) => sum + s.vendorMappings.reduce((vs, vm) => vs + vm.value, 0),
      0
    )
    totalCost += vendorCost
    return { ...cat, totalValue: catTotal }
  })
  return {
    ...version,
    categories: updatedCategories,
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
        categories: [],
        totalRevenue: 0,
        totalCost: 0,
        profitability: 0,
      }
    }

    pitchVersions.push(newVersion)
    return HttpResponse.json(newVersion, { status: 201 })
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
      const updated = JSON.parse(JSON.stringify(pitchVersions[idx])) as PitchVersion
      for (const cat of updated.categories) {
        const s = cat.services.find((sv) => sv.id === params.serviceId)
        if (s) {
          s.vendorMappings = mappings
        }
      }
      pitchVersions[idx] = recalcVersion(updated)
      return HttpResponse.json(pitchVersions[idx])
    }
  ),
]
