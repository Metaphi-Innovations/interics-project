import { http, HttpResponse } from 'msw'

interface Contact {
  id: string
  name: string
  designation: string
  phone: string
  email: string
  isPrimary: boolean
}

interface ActivityEntry {
  id: string
  type: 'record_created' | 'profile_edited' | 'contact_added' | 'contact_removed' | 'primary_changed' | 'document_uploaded' | 'status_changed'
  description: string
  user: string
  timestamp: string
}

interface CustomerFinancialDetails {
  totalBilled: number
  amountReceived: number
  outstanding: number
  tdsWithheld: number
  activeProjects: number
  completedProjects: number
  totalProjectValue: number
  lastInvoiceDate: string
  paymentTerms: string
  creditLimit: number | null
  gstStatus: string
}

interface Customer {
  id: string
  name: string
  type: 'Company' | 'Individual'
  gstStatus: 'Registered' | 'Unregistered' | 'Composition' | 'SEZ'
  gstin: string | null
  pan: string | null
  contactPerson: string
  phone: string
  email: string
  city: string
  state: string
  address: string | null
  tags: string[]
  sector: string
  msmeRegistered: boolean
  notes: string | null
  status: 'Active' | 'Inactive'
  activeProjects: number
  totalReceivables: number
  createdAt: string
  contacts: Contact[]
  gstDocument: { name: string; url: string } | null
  panDocument: { name: string; url: string } | null
  activityLog: ActivityEntry[]
  financialDetails: CustomerFinancialDetails
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
    sector: 'Banking',
    msmeRegistered: false,
    notes: null,
    status: 'Active',
    activeProjects: 0,
    totalReceivables: 0,
    createdAt: '2024-01-15',
    contacts: [
      {
        id: 'cc-001',
        name: 'Rajesh Kumar',
        designation: 'Managing Director',
        phone: '+91 9876543210',
        email: 'rajesh@techhub.com',
        isPrimary: true,
      },
      {
        id: 'cc-002',
        name: 'Preethi Rao',
        designation: 'Accounts',
        phone: '+91 9876543219',
        email: 'preethi@techhub.com',
        isPrimary: false,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'a-001',
        type: 'record_created',
        description: 'Customer record created',
        user: 'Rajan Mehta',
        timestamp: '2024-01-15T10:30:00Z',
      },
      {
        id: 'a-002',
        type: 'profile_edited',
        description: 'Profile updated — Payment Terms changed to Net 30',
        user: 'Neha Sharma',
        timestamp: '2024-02-20T14:15:00Z',
      },
      {
        id: 'a-003',
        type: 'document_uploaded',
        description: 'GST Certificate uploaded',
        user: 'Neha Sharma',
        timestamp: '2024-03-05T09:45:00Z',
      },
      {
        id: 'a-004',
        type: 'contact_added',
        description: 'Contact added — Preethi Rao',
        user: 'Rajan Mehta',
        timestamp: '2024-03-10T11:00:00Z',
      },
    ],
    financialDetails: {
      totalBilled: 4_400_000,
      amountReceived: 4_400_000,
      outstanding: 0,
      tdsWithheld: 220_000,
      activeProjects: 0,
      completedProjects: 2,
      totalProjectValue: 4_400_000,
      lastInvoiceDate: '30 May 2023',
      paymentTerms: 'Net 30',
      creditLimit: 5_000_000,
      gstStatus: 'Registered',
    },
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
    sector: 'IT Companies',
    msmeRegistered: false,
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 1_550_000,
    createdAt: '2024-02-10',
    contacts: [
      {
        id: 'cc-010',
        name: 'Arun Sharma',
        designation: 'Owner',
        phone: '+91 9876543211',
        email: 'arun.sharma@example.com',
        isPrimary: true,
      },
    ],
    gstDocument: null,
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'a-010',
        type: 'record_created',
        description: 'Customer record created',
        user: 'Rajan Mehta',
        timestamp: '2024-02-10T09:00:00Z',
      },
      {
        id: 'a-011',
        type: 'document_uploaded',
        description: 'PAN Card uploaded',
        user: 'Rajan Mehta',
        timestamp: '2024-02-10T09:05:00Z',
      },
    ],
    financialDetails: {
      totalBilled: 1_550_000,
      amountReceived: 0,
      outstanding: 1_550_000,
      tdsWithheld: 0,
      activeProjects: 1,
      completedProjects: 0,
      totalProjectValue: 5_500_000,
      lastInvoiceDate: '15 Jan 2024',
      paymentTerms: 'Net 30',
      creditLimit: null,
      gstStatus: 'Unregistered',
    },
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
    sector: 'Hospitality',
    msmeRegistered: true,
    notes: null,
    status: 'Inactive',
    activeProjects: 0,
    totalReceivables: 0,
    createdAt: '2023-11-20',
    contacts: [
      {
        id: 'cc-020',
        name: 'Sarah Verma',
        designation: 'Director',
        phone: '+91 9876543212',
        email: 'sarah@greenvilla.com',
        isPrimary: true,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'a-020',
        type: 'record_created',
        description: 'Customer record created',
        user: 'Neha Sharma',
        timestamp: '2023-11-20T10:00:00Z',
      },
      {
        id: 'a-021',
        type: 'status_changed',
        description: 'Status changed from Active to Inactive',
        user: 'Rajan Mehta',
        timestamp: '2024-06-01T15:30:00Z',
      },
    ],
    financialDetails: {
      totalBilled: 0,
      amountReceived: 0,
      outstanding: 0,
      tdsWithheld: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalProjectValue: 450_000,
      lastInvoiceDate: '—',
      paymentTerms: 'Net 30',
      creditLimit: null,
      gstStatus: 'Registered',
    },
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
    sector: 'Healthcare',
    msmeRegistered: false,
    notes: 'Key account — priority client',
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 1_550_000,
    createdAt: '2023-09-05',
    contacts: [
      {
        id: 'cc-030',
        name: 'Vikram Singh',
        designation: 'CEO',
        phone: '+91 9876543213',
        email: 'vikram@acmecorp.com',
        isPrimary: true,
      },
      {
        id: 'cc-031',
        name: 'Anita Kapoor',
        designation: 'Procurement Head',
        phone: '+91 9876543216',
        email: 'anita@acmecorp.com',
        isPrimary: false,
      },
      {
        id: 'cc-032',
        name: 'Sanjay Tiwari',
        designation: 'Accounts Manager',
        phone: '+91 9876543217',
        email: 'sanjay@acmecorp.com',
        isPrimary: false,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'a-030',
        type: 'record_created',
        description: 'Customer record created',
        user: 'Rajan Mehta',
        timestamp: '2023-09-05T09:00:00Z',
      },
      {
        id: 'a-031',
        type: 'profile_edited',
        description: 'Profile updated — Credit Limit set to ₹5L',
        user: 'Neha Sharma',
        timestamp: '2023-10-12T14:00:00Z',
      },
      {
        id: 'a-032',
        type: 'contact_added',
        description: 'Contact added — Anita Kapoor',
        user: 'Neha Sharma',
        timestamp: '2023-11-01T10:30:00Z',
      },
      {
        id: 'a-033',
        type: 'contact_added',
        description: 'Contact added — Sanjay Tiwari',
        user: 'Rajan Mehta',
        timestamp: '2024-01-15T11:00:00Z',
      },
      {
        id: 'a-034',
        type: 'document_uploaded',
        description: 'GST Certificate uploaded',
        user: 'Neha Sharma',
        timestamp: '2024-02-05T09:30:00Z',
      },
    ],
    financialDetails: {
      totalBilled: 1_550_000,
      amountReceived: 0,
      outstanding: 1_550_000,
      tdsWithheld: 0,
      activeProjects: 1,
      completedProjects: 0,
      totalProjectValue: 5_750_000,
      lastInvoiceDate: '15 Feb 2024',
      paymentTerms: 'Net 30',
      creditLimit: 10_000_000,
      gstStatus: 'Registered',
    },
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
    sector: 'Banking',
    msmeRegistered: true,
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 980_000,
    createdAt: '2024-03-01',
    contacts: [
      {
        id: 'cc-040',
        name: 'Priya Nair',
        designation: 'Co-Founder',
        phone: '+91 9876543214',
        email: 'priya@techventures.com',
        isPrimary: true,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: null,
    activityLog: [
      {
        id: 'a-040',
        type: 'record_created',
        description: 'Customer record created',
        user: 'Rajan Mehta',
        timestamp: '2024-03-01T10:00:00Z',
      },
      {
        id: 'a-041',
        type: 'document_uploaded',
        description: 'GST Certificate uploaded',
        user: 'Rajan Mehta',
        timestamp: '2024-03-01T10:10:00Z',
      },
    ],
    financialDetails: {
      totalBilled: 980_000,
      amountReceived: 0,
      outstanding: 980_000,
      tdsWithheld: 0,
      activeProjects: 1,
      completedProjects: 0,
      totalProjectValue: 2_800_000,
      lastInvoiceDate: '08 Dec 2025',
      paymentTerms: 'Net 45',
      creditLimit: null,
      gstStatus: 'Registered',
    },
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
    sector: 'Manufacturing',
    msmeRegistered: false,
    notes: null,
    status: 'Active',
    activeProjects: 1,
    totalReceivables: 740_000,
    createdAt: '2024-01-28',
    contacts: [
      {
        id: 'cc-050',
        name: 'Anand Krishnan',
        designation: 'Managing Partner',
        phone: '+91 9876543215',
        email: 'anand@globalsolutions.com',
        isPrimary: true,
      },
      {
        id: 'cc-051',
        name: 'Meena Sundaram',
        designation: 'Operations Lead',
        phone: '+91 9876543218',
        email: 'meena@globalsolutions.com',
        isPrimary: false,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'a-050',
        type: 'record_created',
        description: 'Customer record created',
        user: 'Rajan Mehta',
        timestamp: '2024-01-28T09:00:00Z',
      },
      {
        id: 'a-051',
        type: 'profile_edited',
        description: 'Profile updated — Payment Terms changed to Net 30',
        user: 'Neha Sharma',
        timestamp: '2024-02-15T11:30:00Z',
      },
      {
        id: 'a-052',
        type: 'contact_added',
        description: 'Contact added — Meena Sundaram',
        user: 'Rajan Mehta',
        timestamp: '2024-03-20T10:00:00Z',
      },
    ],
    financialDetails: {
      totalBilled: 740_000,
      amountReceived: 740_000,
      outstanding: 0,
      tdsWithheld: 37_000,
      activeProjects: 1,
      completedProjects: 0,
      totalProjectValue: 1_850_000,
      lastInvoiceDate: '20 Jan 2024',
      paymentTerms: 'Net 30',
      creditLimit: null,
      gstStatus: 'Registered',
    },
  },
]

// Per-customer contacts store (for sub-resource CRUD)
const contactsStore: Record<string, Contact[]> = {}
customers.forEach((c) => {
  contactsStore[c.id] = c.contacts
})

let idCounter = 7
let contactIdCounter = 100

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
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map((c) => ({
      ...c,
      contacts: contactsStore[c.id] ?? c.contacts,
    }))
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/customers/:id', ({ params }) => {
    const idOrSlug = params.id as string
    const toSlug = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim()
    const customer =
      customers.find((c) => c.id === idOrSlug) ??
      customers.find((c) => toSlug(c.name) === idOrSlug)
    if (!customer) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    // Merge live contacts
    return HttpResponse.json({ ...customer, contacts: contactsStore[customer.id] ?? customer.contacts })
  }),

  http.post('/api/customers', async ({ request }) => {
    const data = await request.json() as Omit<Customer, 'id' | 'createdAt'>
    const defaultFinancial: CustomerFinancialDetails = {
      totalBilled: 0,
      amountReceived: 0,
      outstanding: 0,
      tdsWithheld: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalProjectValue: 0,
      lastInvoiceDate: '—',
      paymentTerms: 'Net 30',
      creditLimit: null,
      gstStatus: data.gstStatus,
    }
    const newCustomer: Customer = {
      ...data,
      sector: data.sector ?? '',
      msmeRegistered: data.msmeRegistered ?? false,
      id: `c-${String(idCounter++).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      contacts: data.contacts ?? [],
      activityLog: data.activityLog ?? [],
      financialDetails: {
        ...defaultFinancial,
        ...(data.financialDetails ?? {}),
        gstStatus: data.gstStatus,
      },
    }
    customers.unshift(newCustomer)
    contactsStore[newCustomer.id] = newCustomer.contacts
    return HttpResponse.json(newCustomer, { status: 201 })
  }),

  http.put('/api/customers/:id', async ({ params, request }) => {
    const idx = customers.findIndex((c) => c.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<Customer>
    const prev = customers[idx]
    const merged: Customer = { ...prev, ...data }
    if (data.contacts !== undefined) {
      contactsStore[prev.id] = data.contacts
      merged.contacts = data.contacts
      const primary = data.contacts.find((c) => c.isPrimary) ?? data.contacts[0]
      if (primary) {
        merged.contactPerson = primary.name
        merged.phone = primary.phone
        merged.email = primary.email
      }
    }
    if (data.gstStatus !== undefined && prev.financialDetails) {
      merged.financialDetails = {
        ...prev.financialDetails,
        gstStatus: data.gstStatus,
      }
    }
    customers[idx] = merged
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

  // ── Contacts sub-resource ─────────────────────────────────────────────────

  http.get('/api/customers/:id/contacts', ({ params }) => {
    const id = params.id as string
    const contacts = contactsStore[id]
    if (!contacts) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    return HttpResponse.json(contacts)
  }),

  http.post('/api/customers/:id/contacts', async ({ params, request }) => {
    const id = params.id as string
    if (!contactsStore[id]) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    const data = await request.json() as Omit<Contact, 'id'>
    const normalizePhone = (phone: string) => phone.replace(/\D/g, '')
    const nextPhone = normalizePhone(data.phone ?? '')
    if (
      nextPhone &&
      contactsStore[id].some((c) => normalizePhone(c.phone) === nextPhone)
    ) {
      return HttpResponse.json(
        { message: 'A contact with this mobile number already exists for this customer' },
        { status: 409 },
      )
    }
    const newContact: Contact = {
      ...data,
      id: `cc-${String(contactIdCounter++).padStart(3, '0')}`,
    }
    if (newContact.isPrimary) {
      contactsStore[id].forEach((c) => { c.isPrimary = false })
    }
    contactsStore[id].push(newContact)
    const customerIdx = customers.findIndex((c) => c.id === id)
    if (customerIdx !== -1) {
      customers[customerIdx] = {
        ...customers[customerIdx],
        contacts: [...contactsStore[id]],
      }
      const primary = contactsStore[id].find((c) => c.isPrimary) ?? contactsStore[id][0]
      if (primary) {
        customers[customerIdx].contactPerson = primary.name
        customers[customerIdx].phone = primary.phone
        customers[customerIdx].email = primary.email
      }
    }
    return HttpResponse.json(newContact, { status: 201 })
  }),

  http.put('/api/customers/:id/contacts/:contactId', async ({ params, request }) => {
    const { id, contactId } = params as { id: string; contactId: string }
    if (!contactsStore[id]) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    const idx = contactsStore[id].findIndex((c) => c.id === contactId)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Contact not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<Contact>
    if (data.isPrimary) {
      contactsStore[id].forEach((c) => { c.isPrimary = false })
    }
    contactsStore[id][idx] = { ...contactsStore[id][idx], ...data }
    return HttpResponse.json(contactsStore[id][idx])
  }),

  http.delete('/api/customers/:id/contacts/:contactId', ({ params }) => {
    const { id, contactId } = params as { id: string; contactId: string }
    if (!contactsStore[id]) {
      return HttpResponse.json({ message: 'Customer not found' }, { status: 404 })
    }
    const contact = contactsStore[id].find((c) => c.id === contactId)
    if (!contact) {
      return HttpResponse.json({ message: 'Contact not found' }, { status: 404 })
    }
    contactsStore[id] = contactsStore[id].filter((c) => c.id !== contactId)
    return HttpResponse.json({ success: true })
  }),
]
