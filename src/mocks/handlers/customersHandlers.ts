import { http, HttpResponse } from 'msw'

interface Customer {
  id: string
  name: string
  type: 'Company' | 'Individual'
  gstStatus: 'Registered' | 'Unregistered'
  gstin: string | null
  pan: string | null
  contactPerson: string
  phone: string
  email: string
  city: string
  state: string
  address: string | null
  tags: string[]
  notes: string | null
  status: 'Active' | 'Inactive'
  activeProjects: number
  totalReceivables: number
  createdAt: string
}

let customers: Customer[] = [
  {
    id: 'c-001',
    name: 'TechHub Systems Pvt Ltd',
    type: 'Company',
    gstStatus: 'Registered',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    contactPerson: 'Rajesh Kumar',
    phone: '+91 9876543210',
    email: 'rajesh@techhub.com',
    city: 'Bangalore',
    state: 'Karnataka',
    address: 'Unit 401, Tech Park, Whitefield',
    tags: ['Enterprise', 'Repeat Client'],
    notes: null,
    status: 'Active',
    activeProjects: 2,
    totalReceivables: 450000,
    createdAt: '2024-01-15',
  },
  {
    id: 'c-002',
    name: 'Mr. Arun Sharma',
    type: 'Individual',
    gstStatus: 'Unregistered',
    gstin: null,
    pan: 'BCDFA5678G',
    contactPerson: 'Arun Sharma',
    phone: '+91 9876543211',
    email: 'arun.sharma@example.com',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Flat 12B, Sea View Apartments',
    tags: ['Residential'],
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 120000,
    createdAt: '2024-02-10',
  },
  {
    id: 'c-003',
    name: 'Green Villa Estates',
    type: 'Company',
    gstStatus: 'Registered',
    gstin: '27XYZAB9876C1Z3',
    pan: 'XYZAB9876C',
    contactPerson: 'Sarah Verma',
    phone: '+91 9876543212',
    email: 'sarah@greenvilla.com',
    city: 'Pune',
    state: 'Maharashtra',
    address: '5th Floor, Green Tower, Baner',
    tags: ['Real Estate', 'High Value'],
    notes: null,
    status: 'Inactive',
    activeProjects: 0,
    totalReceivables: 0,
    createdAt: '2023-11-20',
  },
  {
    id: 'c-004',
    name: 'Acme Corp',
    type: 'Company',
    gstStatus: 'Registered',
    gstin: '07ACMEC1234D1Z2',
    pan: 'ACMEC1234D',
    contactPerson: 'Vikram Singh',
    phone: '+91 9876543213',
    email: 'vikram@acmecorp.com',
    city: 'Delhi',
    state: 'Delhi',
    address: 'Plot 22, Connaught Place',
    tags: ['Enterprise', 'Corporate'],
    notes: 'Key account — priority client',
    status: 'Active',
    activeProjects: 3,
    totalReceivables: 850000,
    createdAt: '2023-09-05',
  },
  {
    id: 'c-005',
    name: 'TechVentures Ltd',
    type: 'Company',
    gstStatus: 'Registered',
    gstin: '29TVLTD5678E1Z9',
    pan: 'TVLTD5678E',
    contactPerson: 'Priya Nair',
    phone: '+91 9876543214',
    email: 'priya@techventures.com',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'HITEC City, Tower B',
    tags: ['Tech', 'Startup'],
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 280000,
    createdAt: '2024-03-01',
  },
  {
    id: 'c-006',
    name: 'Global Solutions LLP',
    type: 'Company',
    gstStatus: 'Registered',
    gstin: '33GSLLP2345F1Z6',
    pan: 'GSLLP2345F',
    contactPerson: 'Anand Krishnan',
    phone: '+91 9876543215',
    email: 'anand@globalsolutions.com',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Anna Salai, Office Block C',
    tags: ['Enterprise'],
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 185000,
    createdAt: '2024-01-28',
  },
]

let idCounter = 7

export const customersHandlers = [
  http.get('/api/customers', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status') ?? ''
    const type = url.searchParams.get('type') ?? ''
    const gstStatus = url.searchParams.get('gstStatus') ?? ''
    const state = url.searchParams.get('state') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10)

    let filtered = customers
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.contactPerson.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
      )
    }
    if (status) filtered = filtered.filter((c) => c.status === status)
    if (type) filtered = filtered.filter((c) => c.type === type)
    if (gstStatus) filtered = filtered.filter((c) => c.gstStatus === gstStatus)
    if (state) filtered = filtered.filter((c) => c.state === state)

    const total = filtered.length
    const items = filtered.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/customers/:id', ({ params }) => {
    const idOrSlug = params.id as string
    const toSlug = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()
    // Match by id first, then by name slug
    const customer =
      customers.find((c) => c.id === idOrSlug) ??
      customers.find((c) => toSlug(c.name) === idOrSlug)
    if (!customer) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    return HttpResponse.json(customer)
  }),

  http.post('/api/customers', async ({ request }) => {
    const data = await request.json() as Omit<Customer, 'id' | 'createdAt'>
    const newCustomer: Customer = {
      ...data,
      id: `c-${String(idCounter++).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    customers.unshift(newCustomer)
    return HttpResponse.json(newCustomer, { status: 201 })
  }),

  http.put('/api/customers/:id', async ({ params, request }) => {
    const idx = customers.findIndex((c) => c.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<Customer>
    customers[idx] = { ...customers[idx], ...data }
    return HttpResponse.json(customers[idx])
  }),

  http.delete('/api/customers/:id', ({ params }) => {
    const customer = customers.find((c) => c.id === params.id)
    if (!customer) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    if (customer.activeProjects > 0) {
      return HttpResponse.json(
        { message: 'Cannot delete customer with active projects' },
        { status: 400 }
      )
    }
    customers = customers.filter((c) => c.id !== params.id)
    return HttpResponse.json({ success: true })
  }),
]
