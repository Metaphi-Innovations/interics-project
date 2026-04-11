import { http, HttpResponse } from 'msw'

interface Vendor {
  id: string
  name: string
  type: 'Measurable' | 'Non-measurable'
  gstin: string | null
  pan: string | null
  gstStatus: 'Registered' | 'Unregistered'
  contactPerson: string
  designation?: string | null
  phone: string
  email: string
  city: string
  state: string
  address: string | null
  pincode?: string | null
  tags: string[]
  paymentTerms?: string | null
  notes: string | null
  status: 'Active' | 'Inactive'
  activeProjects: number
  totalPayables: number
  createdAt: string
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

let vendors: Vendor[] = [
  {
    id: 'v-001',
    name: 'BuildWell Constructions',
    type: 'Measurable',
    gstin: '29BWCON1234A1Z7',
    pan: 'BWCON1234A',
    gstStatus: 'Registered',
    contactPerson: 'Ramesh Patil',
    designation: 'Managing Director',
    phone: '+91 9871234560',
    email: 'ramesh@buildwell.com',
    city: 'Bangalore',
    state: 'Karnataka',
    address: 'Industrial Area, Phase 2',
    pincode: '560058',
    tags: ['Civil', 'Contractor'],
    paymentTerms: 'Net 30',
    notes: null,
    status: 'Active',
    activeProjects: 3,
    totalPayables: 620000,
    createdAt: '2023-10-12',
  },
  {
    id: 'v-002',
    name: 'Spectrum Interiors',
    type: 'Non-measurable',
    gstin: null,
    pan: 'SPINT5678B',
    gstStatus: 'Unregistered',
    contactPerson: 'Kavita Mehta',
    designation: 'Principal Designer',
    phone: '+91 9871234561',
    email: 'kavita@spectruminteriors.com',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Andheri West, Studio 4',
    pincode: '400053',
    tags: ['Furniture', 'FF&E'],
    paymentTerms: 'Net 45',
    notes: null,
    status: 'Active',
    activeProjects: 2,
    totalPayables: 340000,
    createdAt: '2023-11-05',
  },
  {
    id: 'v-003',
    name: 'LightCraft Solutions',
    type: 'Non-measurable',
    gstin: '27LCSOL9012C1Z3',
    pan: 'LCSOL9012C',
    gstStatus: 'Registered',
    contactPerson: 'Suresh Iyer',
    designation: 'Sales Manager',
    phone: '+91 9871234562',
    email: 'suresh@lightcraft.com',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Kothrud, Lighting House',
    pincode: '411038',
    tags: ['Lighting', 'MEP'],
    paymentTerms: 'Net 60',
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalPayables: 95000,
    createdAt: '2024-01-08',
  },
  {
    id: 'v-004',
    name: 'FloorMaster Pvt Ltd',
    type: 'Measurable',
    gstin: '07FLRMS3456D1Z5',
    pan: 'FLRMS3456D',
    gstStatus: 'Registered',
    contactPerson: 'Deepak Gupta',
    designation: 'Director',
    phone: '+91 9871234563',
    email: 'deepak@floormaster.com',
    city: 'Delhi',
    state: 'Delhi',
    address: 'Kirti Nagar, Furniture Market',
    pincode: '110015',
    tags: ['Flooring', 'Material'],
    paymentTerms: 'Net 30',
    notes: 'Preferred vendor for hardwood',
    status: 'Active',
    activeProjects: 2,
    totalPayables: 210000,
    createdAt: '2023-08-20',
  },
  {
    id: 'v-005',
    name: 'AirTech HVAC',
    type: 'Measurable',
    gstin: '29AIRHV7890E1Z1',
    pan: 'AIRHV7890E',
    gstStatus: 'Registered',
    contactPerson: 'Mohan Rao',
    designation: 'Operations Head',
    phone: '+91 9871234564',
    email: 'mohan@airtechhvac.com',
    city: 'Bangalore',
    state: 'Karnataka',
    address: 'Peenya Industrial Estate',
    pincode: '560058',
    tags: ['HVAC', 'MEP'],
    paymentTerms: 'Immediate',
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalPayables: 175000,
    createdAt: '2024-02-14',
  },
  {
    id: 'v-006',
    name: 'Craft Studio Design',
    type: 'Non-measurable',
    gstin: null,
    pan: 'CRFSD2345F',
    gstStatus: 'Unregistered',
    contactPerson: 'Nisha Sharma',
    designation: 'Creative Director',
    phone: '+91 9871234565',
    email: 'nisha@craftstudio.com',
    city: 'Ahmedabad',
    state: 'Gujarat',
    address: 'CG Road, Design District',
    pincode: '380009',
    tags: ['Consultancy', 'Design'],
    paymentTerms: 'Net 45',
    notes: null,
    status: 'Inactive',
    activeProjects: 0,
    totalPayables: 0,
    createdAt: '2023-07-30',
  },
]

let idCounter = 7

export const vendorsHandlers = [
  http.get('/api/vendors', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status') ?? ''
    const type = url.searchParams.get('type') ?? ''
    const gstStatus = url.searchParams.get('gstStatus') ?? ''
    const state = url.searchParams.get('state') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10)

    let filtered = vendors
    if (search) {
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(search) ||
          v.contactPerson.toLowerCase().includes(search) ||
          v.email.toLowerCase().includes(search)
      )
    }
    if (status) filtered = filtered.filter((v) => v.status === status)
    if (type) filtered = filtered.filter((v) => v.type === type)
    if (gstStatus) filtered = filtered.filter((v) => v.gstStatus === gstStatus)
    if (state) filtered = filtered.filter((v) => v.state === state)

    const total = filtered.length
    const items = filtered.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/vendors/:id', ({ params }) => {
    const idOrSlug = params.id as string
    // Support both id and slug lookup
    const vendor =
      vendors.find((v) => v.id === idOrSlug) ??
      vendors.find((v) => toSlug(v.name) === idOrSlug)
    if (!vendor) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    return HttpResponse.json(vendor)
  }),

  http.post('/api/vendors', async ({ request }) => {
    const data = await request.json() as Omit<Vendor, 'id' | 'createdAt'>
    const newVendor: Vendor = {
      ...data,
      id: `v-${String(idCounter++).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    vendors.unshift(newVendor)
    return HttpResponse.json(newVendor, { status: 201 })
  }),

  http.put('/api/vendors/:id', async ({ params, request }) => {
    const idx = vendors.findIndex((v) => v.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<Vendor>
    vendors[idx] = { ...vendors[idx], ...data }
    return HttpResponse.json(vendors[idx])
  }),

  http.delete('/api/vendors/:id', ({ params }) => {
    const vendor = vendors.find((v) => v.id === params.id)
    if (!vendor) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    if (vendor.activeProjects > 0) {
      return HttpResponse.json(
        { message: 'Cannot delete vendor with active projects' },
        { status: 400 }
      )
    }
    vendors = vendors.filter((v) => v.id !== params.id)
    return HttpResponse.json({ success: true })
  }),
]
