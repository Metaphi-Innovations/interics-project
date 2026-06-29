import { http, HttpResponse } from 'msw'
import type { PitchCategory, PlannedExpense } from '../../slices/pitch/reducer'
import type { Project } from '../../slices/projects/reducer'

type MockProject = Project

let projects: MockProject[] = [
  {
    id: 'p-001',
    projectCode: 'PRJ-24-001',
    name: 'Acme Corp - Head Office Redesign',
    customerId: 'c-004',
    customerName: 'Acme Corp',
    projectTypes: ['TDD', 'ID', 'MEP', 'Build'],
    status: 'Live',
    progress: 'Execution ongoing',
    building: 'Connaught Place Tower',
    location: 'Connaught Place, Delhi',
    floor: '12th Floor',
    carpetArea: 4500,
    headcount: 120,
    workstationSize: '1200 sq ft',
    meetingRoomCount: 6,
    serverRoomDetails: '200 sq ft with raised flooring',
    upsCapacity: '20 KVA',
    receptionDetails: 'Open reception with waiting lounge',
    pantryDetails: '2 pantries with wet and dry zones',
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    assignedTeam: [
      { userId: 'u-004', name: 'Meera Iyer', roleLabel: 'Interior Designer' },
      { userId: 'u-005', name: 'Vikram Shah', roleLabel: 'Site Coordinator' },
    ],
    startDate: '2024-01-15',
    expectedEndDate: '2024-08-30',
    projectValue: 4500000,
    totalClientPOValue: 3500000,
    totalVendorPOValue: 2250000,
    invoicedAmount: 1550000,
    paidVendorAmount: 1200000,
    createdAt: '2026-04-01',
    sector: 'Commercial',
    designFeePerSqft: 850,
    buildValuePerSqft: 4200,
    clientTeam: [
      {
        name: 'Anita Verma',
        designation: 'Facilities Head',
        email: 'anita.verma@acmecorp.com',
        phone: '+91 98765 43210',
        company: 'Acme Corp',
      },
    ],
  },
  {
    id: 'p-002',
    projectCode: 'PRJ-24-002',
    name: 'TechVentures - Office Expansion',
    customerId: 'c-005',
    customerName: 'TechVentures Ltd',
    projectTypes: ['ID', 'MEP', 'Lighting', 'Build'],
    status: 'Live',
    progress: 'Execution ongoing',
    building: 'Cyber Towers',
    location: 'HITEC City, Hyderabad',
    floor: '8th Floor',
    carpetArea: 3200,
    headcount: 85,
    projectManager: 'Arjun Nair',
    projectManagerId: 'u-004',
    assignedTeam: [
      { userId: 'u-003', name: 'Arjun Nair', roleLabel: 'Design Lead' },
      { userId: 'u-002', name: 'Sarah Kapoor', roleLabel: 'Project Coordinator' },
    ],
    startDate: '2024-02-01',
    expectedEndDate: '2024-09-15',
    projectValue: 2800000,
    totalClientPOValue: 2800000,
    totalVendorPOValue: 1800000,
    invoicedAmount: 980000,
    paidVendorAmount: 750000,
    createdAt: '2026-04-03',
    sector: 'Commercial',
    designFeePerSqft: 720,
    buildValuePerSqft: 3800,
    clientTeam: [
      {
        name: 'Rohit Menon',
        designation: 'Project Coordinator',
        email: 'rohit.menon@techventures.com',
        phone: '+91 91234 56780',
        company: 'TechVentures Ltd',
      },
    ],
  },
  {
    id: 'p-003',
    projectCode: 'PRJ-24-003',
    name: 'Acme Corp - Retail Fit-out',
    customerId: 'c-004',
    customerName: 'Acme Corp',
    projectTypes: ['TDD', 'ID', 'Branding & Styling'],
    status: 'Pitch',
    progress: 'Quotation ready',
    building: 'Khan Market Plaza',
    location: 'Khan Market, Delhi',
    floor: 'Ground Floor',
    carpetArea: 1200,
    headcount: 20,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    assignedTeam: [{ userId: 'u-004', name: 'Meera Iyer', roleLabel: 'Designer' }],
    startDate: null,
    expectedEndDate: null,
    projectValue: 1250000,
    totalClientPOValue: 0,
    totalVendorPOValue: 0,
    invoicedAmount: 0,
    paidVendorAmount: 0,
    createdAt: '2026-04-05',
    sector: 'Retail',
    designFeePerSqft: 950,
  },
  {
    id: 'p-004',
    projectCode: 'PRJ-24-004',
    name: 'Global Solutions - Store Renovation',
    customerId: 'c-006',
    customerName: 'Global Solutions LLP',
    projectTypes: ['MEP', 'Local Approvals', 'Structural', 'Build'],
    status: 'Live',
    progress: 'Payment pending — awaiting client wire',
    building: 'Express Avenue',
    location: 'Anna Salai, Chennai',
    floor: '3rd Floor',
    carpetArea: 2800,
    headcount: 60,
    projectManager: 'Arjun Nair',
    projectManagerId: 'u-004',
    assignedTeam: [
      { userId: 'u-005', name: 'Vikram Shah', roleLabel: 'Execution' },
      { userId: 'u-002', name: 'Sarah Kapoor', roleLabel: 'Accounts' },
    ],
    startDate: '2024-01-20',
    expectedEndDate: '2024-07-20',
    projectValue: 1850000,
    totalClientPOValue: 1850000,
    totalVendorPOValue: 1200000,
    invoicedAmount: 740000,
    paidVendorAmount: 580000,
    createdAt: '2026-04-07',
    sector: 'Retail',
    designFeePerSqft: 680,
    buildValuePerSqft: 3500,
  },
  {
    id: 'p-005',
    projectCode: 'PRJ-23-005',
    name: 'Elite Consultants - Office Interiors',
    customerId: 'c-001',
    customerName: 'TechHub Systems Pvt Ltd',
    projectTypes: ['ID', 'Kitchen', 'AV', 'IT'],
    status: 'Completed',
    progress: 'Completed',
    building: 'ITPL Block A',
    location: 'Whitefield, Bangalore',
    floor: '5th Floor',
    carpetArea: 3800,
    headcount: 100,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    assignedTeam: [{ userId: 'u-004', name: 'Meera Iyer', roleLabel: 'Designer' }],
    startDate: '2023-06-01',
    expectedEndDate: '2023-12-31',
    projectValue: 3200000,
    totalClientPOValue: 3200000,
    totalVendorPOValue: 2100000,
    invoicedAmount: 3200000,
    paidVendorAmount: 2100000,
    createdAt: '2026-03-18',
    sector: 'Commercial',
    designFeePerSqft: 780,
  },
  {
    id: 'p-006',
    projectCode: 'PRJ-24-006',
    name: 'Skyline Penthouse',
    customerId: 'c-002',
    customerName: 'Mr. Arun Sharma',
    projectTypes: ['TDD', 'ID', 'LEED', 'Lighting', 'Security'],
    status: 'Live',
    progress: 'At risk',
    building: 'Skyline Residency',
    location: 'Bandra, Mumbai',
    floor: 'Penthouse',
    carpetArea: 2200,
    headcount: 4,
    projectManager: 'Priya Menon',
    projectManagerId: 'u-003',
    assignedTeam: [
      { userId: 'u-002', name: 'Sarah Kapoor', roleLabel: 'Design Lead' },
      { userId: 'u-005', name: 'Vikram Shah', roleLabel: 'Site' },
    ],
    startDate: '2024-01-15',
    expectedEndDate: '2024-06-30',
    projectValue: 5500000,
    totalClientPOValue: 3500000,
    totalVendorPOValue: 2250000,
    invoicedAmount: 1550000,
    paidVendorAmount: 1200000,
    createdAt: '2026-04-02',
    sector: 'Residential',
    designFeePerSqft: 1200,
  },
  {
    id: 'p-007',
    projectCode: 'PRJ-24-007',
    name: 'Green Villa - Lobby Design',
    customerId: 'c-003',
    customerName: 'Green Villa Estates',
    projectTypes: ['ID', 'Acoustic'],
    status: 'Cancelled',
    progress: 'Cancelled',
    building: 'Green Villa',
    location: 'Baner, Pune',
    floor: 'Lobby',
    carpetArea: 800,
    headcount: 0,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    assignedTeam: [],
    startDate: '2024-02-01',
    expectedEndDate: null,
    projectValue: 450000,
    totalClientPOValue: 0,
    totalVendorPOValue: 0,
    invoicedAmount: 0,
    paidVendorAmount: 0,
    createdAt: '2026-03-28',
    sector: 'Hospitality',
    designFeePerSqft: 640,
  },
  {
    id: 'p-008',
    projectCode: 'PRJ-23-008',
    name: 'TechHub - Floor 3 Renovation',
    customerId: 'c-001',
    customerName: 'TechHub Systems Pvt Ltd',
    projectTypes: ['MEP', 'Build', 'Other'],
    status: 'Archived',
    progress: 'Archived',
    building: 'TechHub Campus',
    location: 'Whitefield, Bangalore',
    floor: '3rd Floor',
    carpetArea: 1500,
    headcount: 40,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    assignedTeam: [{ userId: 'u-004', name: 'Meera Iyer', roleLabel: 'Designer' }],
    startDate: '2023-01-10',
    expectedEndDate: '2023-05-30',
    projectValue: 1200000,
    totalClientPOValue: 1200000,
    totalVendorPOValue: 780000,
    invoicedAmount: 1200000,
    paidVendorAmount: 780000,
    createdAt: '2026-02-12',
    sector: 'Industrial',
    designFeePerSqft: 520,
    buildValuePerSqft: 2900,
  },
]

let idCounter = 9
let codeCounter = 9

type TransitionPersisted = {
  versionId: string | null
  categories: PitchCategory[]
  plannedExpenses: PlannedExpense[]
  versionNumber?: number
  label?: string
  totalRevenue?: number
  totalCost?: number
  profitability?: number
}

const transitionByProjectId = new Map<string, TransitionPersisted>()

function ensureAssignedTeam(project: MockProject): MockProject {
  if (project.assignedTeam && project.assignedTeam.length > 0) return project
  if (project.projectManagerId && project.projectManager) {
    return {
      ...project,
      assignedTeam: [
        {
          userId: project.projectManagerId,
          name: project.projectManager,
          roleLabel: 'Project Lead',
        },
      ],
    }
  }
  return { ...project, assignedTeam: project.assignedTeam ?? [] }
}

export const projectsHandlers = [
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status') ?? ''
    const type = url.searchParams.get('type') ?? ''
    const projectManager = url.searchParams.get('projectManager') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10)

    let filtered = projects
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.projectCode.toLowerCase().includes(search) ||
          p.customerName.toLowerCase().includes(search)
      )
    }
    if (status) filtered = filtered.filter((p) => p.status === status)
    if (type) {
      filtered = filtered.filter((p) => {
        const types = p.projectTypes ?? []
        return types.includes(type)
      })
    }
    if (projectManager) filtered = filtered.filter((p) => p.projectManagerId === projectManager)

    const total = filtered.length
    const items = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map(ensureAssignedTeam)
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/projects/:id', ({ params }) => {
    const idParam = params.id as string
    const toSlug = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()
    const project =
      projects.find((p) => p.id === idParam) ??
      projects.find((p) => toSlug(p.name) === idParam)
    if (!project) {
      return HttpResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    return HttpResponse.json(ensureAssignedTeam(project))
  }),

  http.post('/api/projects', async ({ request }) => {
    const data = await request.json() as Omit<MockProject, 'id' | 'projectCode' | 'createdAt'>
    const year = new Date().getFullYear().toString().slice(-2)
    const newProject: MockProject = {
      ...data,
      id: `p-${String(idCounter++).padStart(3, '0')}`,
      projectCode: `PRJ-${year}-${String(codeCounter++).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    projects.unshift(newProject)
    return HttpResponse.json(newProject, { status: 201 })
  }),

  http.put('/api/projects/:id', async ({ params, request }) => {
    const idx = projects.findIndex((p) => p.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<MockProject>
    projects[idx] = { ...projects[idx], ...data }
    return HttpResponse.json(projects[idx])
  }),

  http.patch('/api/projects/:id/status', async ({ params, request }) => {
    const idx = projects.findIndex((p) => p.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    const { status } = await request.json() as { status: MockProject['status'] }
    projects[idx] = { ...projects[idx], status }
    return HttpResponse.json(projects[idx])
  }),

  http.get('/api/projects/:id/transition', ({ params }) => {
    const id = params.id as string
    const saved = transitionByProjectId.get(id)
    if (!saved) {
      return HttpResponse.json({
        versionId: null,
        categories: [],
        plannedExpenses: [],
      } satisfies TransitionPersisted)
    }
    return HttpResponse.json(saved)
  }),

  http.post('/api/projects/:id/transition/save', async ({ params, request }) => {
    const id = params.id as string
    const body = (await request.json()) as TransitionPersisted
    transitionByProjectId.set(id, body)
    return HttpResponse.json(body)
  }),
]
