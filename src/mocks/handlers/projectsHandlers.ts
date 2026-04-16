import { http, HttpResponse } from 'msw'
import type { PitchCategory, PlannedExpense } from '../../slices/pitch/reducer'

interface Project {
  id: string
  projectCode: string
  name: string
  customerId: string
  customerName: string
  type: 'Design Only' | 'Design & Build'
  status: 'Pitch' | 'Live' | 'Completed' | 'Cancelled' | 'Archived'
  progress: string
  location: string
  carpetArea: number | null
  headcount: number | null
  projectManager: string
  projectManagerId: string
  startDate: string | null
  expectedEndDate: string | null
  projectValue: number
  totalClientPOValue: number
  totalVendorPOValue: number
  invoicedAmount: number
  paidVendorAmount: number
  createdAt: string
}

let projects: Project[] = [
  {
    id: 'p-001',
    projectCode: 'PRJ-24-001',
    name: 'Acme Corp - Head Office Redesign',
    customerId: 'c-004',
    customerName: 'Acme Corp',
    type: 'Design & Build',
    status: 'Live',
    progress: 'Execution ongoing',
    location: 'Connaught Place, Delhi',
    carpetArea: 4500,
    headcount: 120,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    startDate: '2024-01-15',
    expectedEndDate: '2024-08-30',
    projectValue: 4500000,
    totalClientPOValue: 3500000,
    totalVendorPOValue: 2250000,
    invoicedAmount: 1550000,
    paidVendorAmount: 1200000,
    createdAt: '2026-04-01',
  },
  {
    id: 'p-002',
    projectCode: 'PRJ-24-002',
    name: 'TechVentures - Office Expansion',
    customerId: 'c-005',
    customerName: 'TechVentures Ltd',
    type: 'Design & Build',
    status: 'Live',
    progress: 'Execution ongoing',
    location: 'HITEC City, Hyderabad',
    carpetArea: 3200,
    headcount: 85,
    projectManager: 'Arjun Nair',
    projectManagerId: 'u-004',
    startDate: '2024-02-01',
    expectedEndDate: '2024-09-15',
    projectValue: 2800000,
    totalClientPOValue: 2800000,
    totalVendorPOValue: 1800000,
    invoicedAmount: 980000,
    paidVendorAmount: 750000,
    createdAt: '2026-04-03',
  },
  {
    id: 'p-003',
    projectCode: 'PRJ-24-003',
    name: 'Acme Corp - Retail Fit-out',
    customerId: 'c-004',
    customerName: 'Acme Corp',
    type: 'Design Only',
    status: 'Pitch',
    progress: 'Quotation ready',
    location: 'Khan Market, Delhi',
    carpetArea: 1200,
    headcount: 20,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    startDate: null,
    expectedEndDate: null,
    projectValue: 1250000,
    totalClientPOValue: 0,
    totalVendorPOValue: 0,
    invoicedAmount: 0,
    paidVendorAmount: 0,
    createdAt: '2026-04-05',
  },
  {
    id: 'p-004',
    projectCode: 'PRJ-24-004',
    name: 'Global Solutions - Store Renovation',
    customerId: 'c-006',
    customerName: 'Global Solutions LLP',
    type: 'Design & Build',
    status: 'Live',
    progress: 'Payment pending — awaiting client wire',
    location: 'Anna Salai, Chennai',
    carpetArea: 2800,
    headcount: 60,
    projectManager: 'Arjun Nair',
    projectManagerId: 'u-004',
    startDate: '2024-01-20',
    expectedEndDate: '2024-07-20',
    projectValue: 1850000,
    totalClientPOValue: 1850000,
    totalVendorPOValue: 1200000,
    invoicedAmount: 740000,
    paidVendorAmount: 580000,
    createdAt: '2026-04-07',
  },
  {
    id: 'p-005',
    projectCode: 'PRJ-23-005',
    name: 'Elite Consultants - Office Interiors',
    customerId: 'c-001',
    customerName: 'TechHub Systems Pvt Ltd',
    type: 'Design & Build',
    status: 'Completed',
    progress: 'Completed',
    location: 'Whitefield, Bangalore',
    carpetArea: 3800,
    headcount: 100,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    startDate: '2023-06-01',
    expectedEndDate: '2023-12-31',
    projectValue: 3200000,
    totalClientPOValue: 3200000,
    totalVendorPOValue: 2100000,
    invoicedAmount: 3200000,
    paidVendorAmount: 2100000,
    createdAt: '2026-03-18',
  },
  {
    id: 'p-006',
    projectCode: 'PRJ-24-006',
    name: 'Skyline Penthouse',
    customerId: 'c-002',
    customerName: 'Mr. Arun Sharma',
    type: 'Design & Build',
    status: 'Live',
    progress: 'At risk',
    location: 'Bandra, Mumbai',
    carpetArea: 2200,
    headcount: 4,
    projectManager: 'Priya Menon',
    projectManagerId: 'u-003',
    startDate: '2024-01-15',
    expectedEndDate: '2024-06-30',
    projectValue: 5500000,
    totalClientPOValue: 3500000,
    totalVendorPOValue: 2250000,
    invoicedAmount: 1550000,
    paidVendorAmount: 1200000,
    createdAt: '2026-04-02',
  },
  {
    id: 'p-007',
    projectCode: 'PRJ-24-007',
    name: 'Green Villa - Lobby Design',
    customerId: 'c-003',
    customerName: 'Green Villa Estates',
    type: 'Design Only',
    status: 'Cancelled',
    progress: 'Cancelled',
    location: 'Baner, Pune',
    carpetArea: 800,
    headcount: 0,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    startDate: '2024-02-01',
    expectedEndDate: null,
    projectValue: 450000,
    totalClientPOValue: 0,
    totalVendorPOValue: 0,
    invoicedAmount: 0,
    paidVendorAmount: 0,
    createdAt: '2026-03-28',
  },
  {
    id: 'p-008',
    projectCode: 'PRJ-23-008',
    name: 'TechHub - Floor 3 Renovation',
    customerId: 'c-001',
    customerName: 'TechHub Systems Pvt Ltd',
    type: 'Design & Build',
    status: 'Archived',
    progress: 'Archived',
    location: 'Whitefield, Bangalore',
    carpetArea: 1500,
    headcount: 40,
    projectManager: 'Rahul Sharma',
    projectManagerId: 'u-003',
    startDate: '2023-01-10',
    expectedEndDate: '2023-05-30',
    projectValue: 1200000,
    totalClientPOValue: 1200000,
    totalVendorPOValue: 780000,
    invoicedAmount: 1200000,
    paidVendorAmount: 780000,
    createdAt: '2026-02-12',
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
    if (type) filtered = filtered.filter((p) => p.type === type)
    if (projectManager) filtered = filtered.filter((p) => p.projectManagerId === projectManager)

    const total = filtered.length
    const items = filtered.slice((page - 1) * pageSize, page * pageSize)
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
    return HttpResponse.json(project)
  }),

  http.post('/api/projects', async ({ request }) => {
    const data = await request.json() as Omit<Project, 'id' | 'projectCode' | 'createdAt'>
    const year = new Date().getFullYear().toString().slice(-2)
    const newProject: Project = {
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
    const data = await request.json() as Partial<Project>
    projects[idx] = { ...projects[idx], ...data }
    return HttpResponse.json(projects[idx])
  }),

  http.patch('/api/projects/:id/status', async ({ params, request }) => {
    const idx = projects.findIndex((p) => p.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Project not found' }, { status: 404 })
    }
    const { status } = await request.json() as { status: Project['status'] }
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
