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

interface VendorFinancialDetails {
  totalPayables: number
  amountPaid: number
  outstanding: number
  tdsDeducted: number
  activeProjects: number
  completedProjects: number
  totalContractValue: number
  lastPaymentDate: string
  paymentTerms: string
  vendorType: string
  gstStatus: string
}

type VendorDocumentType =
  | 'Catalogue'
  | 'Brochure'
  | 'Certificate'
  | 'Compliance'
  | 'Product'

interface VendorDocument {
  id: string
  name: string
  type: VendorDocumentType
  uploadedAt: string
  expiryDate?: string | null
  url: string
}

type ComplianceChipStatus = 'verified' | 'missing' | 'expired' | 'expiring_soon'

interface VendorCompliance {
  gst?: ComplianceChipStatus
  pan?: ComplianceChipStatus
  bankCheque?: ComplianceChipStatus
  insurance?: { status: ComplianceChipStatus; expiryDate?: string | null }
}

interface Vendor {
  id: string
  name: string
  gstin: string | null
  pan: string | null
  gstStatus: 'Registered' | 'Unregistered'
  website?: string | null
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
  contacts: Contact[]
  gstDocument: { name: string; url: string } | null
  panDocument: { name: string; url: string } | null
  bankChequeDocument?: { name: string; url: string } | null
  insuranceDocument?: { name: string; url: string } | null
  activityLog: ActivityEntry[]
  financialDetails: VendorFinancialDetails
  documents?: VendorDocument[]
  additionalComplianceDocuments?: { id: string; name: string; url: string; expiryDate?: string | null }[]
  compliance?: VendorCompliance
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

let vendors: Vendor[] = [
  {
    id: 'v-001',
    name: 'BuildWell Constructions',
    gstin: '29BWCON1234A1Z7',
    pan: 'BWCON1234A',
    gstStatus: 'Registered',
    website: 'https://buildwell.com',
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
    contacts: [
      {
        id: 'vc-001',
        name: 'Ramesh Patil',
        designation: 'Managing Director',
        phone: '+91 9871234560',
        email: 'ramesh@buildwell.com',
        isPrimary: true,
      },
      {
        id: 'vc-002',
        name: 'Supriya Patil',
        designation: 'Accounts Manager',
        phone: '+91 9871234570',
        email: 'supriya@buildwell.com',
        isPrimary: false,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    bankChequeDocument: { name: 'buildwell_cancelled_cheque.pdf', url: '#' },
    insuranceDocument: { name: 'general_liability_cover.pdf', url: '#' },
    compliance: {
      gst: 'verified',
      pan: 'verified',
      bankCheque: 'verified',
      insurance: { status: 'expiring_soon', expiryDate: '2026-06-15' },
    },
    documents: [
      {
        id: 'vd-bw-1',
        name: 'Materials Catalogue FY25.pdf',
        type: 'Catalogue',
        uploadedAt: '2025-03-01T10:00:00Z',
        url: '#',
      },
      {
        id: 'vd-bw-2',
        name: 'ISO Certificate.pdf',
        type: 'Certificate',
        uploadedAt: '2024-11-20T09:00:00Z',
        expiryDate: '2027-11-19',
        url: '#',
      },
    ],
    activityLog: [
      {
        id: 'va-001',
        type: 'record_created',
        description: 'Vendor record created',
        user: 'Rajan Mehta',
        timestamp: '2023-10-12T09:00:00Z',
      },
      {
        id: 'va-002',
        type: 'profile_edited',
        description: 'Profile updated — Payment Terms changed to Net 30',
        user: 'Neha Sharma',
        timestamp: '2023-11-05T14:00:00Z',
      },
      {
        id: 'va-003',
        type: 'document_uploaded',
        description: 'GST Certificate uploaded',
        user: 'Neha Sharma',
        timestamp: '2023-11-10T09:30:00Z',
      },
      {
        id: 'va-004',
        type: 'contact_added',
        description: 'Contact added — Supriya Patil',
        user: 'Rajan Mehta',
        timestamp: '2024-01-20T11:00:00Z',
      },
    ],
    financialDetails: {
      totalPayables: 620000,
      amountPaid: 400000,
      outstanding: 220000,
      tdsDeducted: 62000,
      activeProjects: 3,
      completedProjects: 2,
      totalContractValue: 1800000,
      lastPaymentDate: '10 Mar 2025',
      paymentTerms: 'Net 30',
      vendorType: 'Measurable',
      gstStatus: 'Registered',
    },
  },
  {
    id: 'v-002',
    name: 'Spectrum Interiors',
    gstin: null,
    pan: 'SPINT5678B',
    gstStatus: 'Unregistered',
    website: 'https://spectruminteriors.com',
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
    contacts: [
      {
        id: 'vc-010',
        name: 'Kavita Mehta',
        designation: 'Principal Designer',
        phone: '+91 9871234561',
        email: 'kavita@spectruminteriors.com',
        isPrimary: true,
      },
    ],
    gstDocument: null,
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    documents: [{ id: 'vd-sp-1', name: 'FF&E Lookbook.pdf', type: 'Brochure', uploadedAt: '2025-02-01T12:00:00Z', url: '#' }],
    activityLog: [
      {
        id: 'va-010',
        type: 'record_created',
        description: 'Vendor record created',
        user: 'Rajan Mehta',
        timestamp: '2023-11-05T10:00:00Z',
      },
      {
        id: 'va-011',
        type: 'document_uploaded',
        description: 'PAN Card uploaded',
        user: 'Rajan Mehta',
        timestamp: '2023-11-05T10:05:00Z',
      },
    ],
    financialDetails: {
      totalPayables: 340000,
      amountPaid: 200000,
      outstanding: 140000,
      tdsDeducted: 0,
      activeProjects: 2,
      completedProjects: 1,
      totalContractValue: 600000,
      lastPaymentDate: '15 Feb 2025',
      paymentTerms: 'Net 45',
      vendorType: 'Non-measurable',
      gstStatus: 'Unregistered',
    },
  },
  {
    id: 'v-003',
    name: 'LightCraft Solutions',
    gstin: '27LCSOL9012C1Z3',
    pan: 'LCSOL9012C',
    gstStatus: 'Registered',
    website: 'lightcraft.example.com',
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
    contacts: [
      {
        id: 'vc-020',
        name: 'Suresh Iyer',
        designation: 'Sales Manager',
        phone: '+91 9871234562',
        email: 'suresh@lightcraft.com',
        isPrimary: true,
      },
      {
        id: 'vc-021',
        name: 'Divya Krishnan',
        designation: 'Technical Lead',
        phone: '+91 9871234572',
        email: 'divya@lightcraft.com',
        isPrimary: false,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    bankChequeDocument: { name: 'lcs_cheque.pdf', url: '#' },
    documents: [{ id: 'vd-lc-1', name: 'Product Matrix.xlsx', type: 'Product', uploadedAt: '2025-01-10T11:30:00Z', url: '#' }],
    activityLog: [
      {
        id: 'va-020',
        type: 'record_created',
        description: 'Vendor record created',
        user: 'Neha Sharma',
        timestamp: '2024-01-08T09:00:00Z',
      },
      {
        id: 'va-021',
        type: 'contact_added',
        description: 'Contact added — Divya Krishnan',
        user: 'Rajan Mehta',
        timestamp: '2024-02-14T10:30:00Z',
      },
      {
        id: 'va-022',
        type: 'primary_changed',
        description: 'Primary contact changed to Suresh Iyer',
        user: 'Rajan Mehta',
        timestamp: '2024-02-14T10:35:00Z',
      },
    ],
    financialDetails: {
      totalPayables: 95000,
      amountPaid: 60000,
      outstanding: 35000,
      tdsDeducted: 9500,
      activeProjects: 1,
      completedProjects: 0,
      totalContractValue: 150000,
      lastPaymentDate: '20 Jan 2025',
      paymentTerms: 'Net 60',
      vendorType: 'Non-measurable',
      gstStatus: 'Registered',
    },
  },
  {
    id: 'v-004',
    name: 'FloorMaster Pvt Ltd',
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
    contacts: [
      {
        id: 'vc-030',
        name: 'Deepak Gupta',
        designation: 'Director',
        phone: '+91 9871234563',
        email: 'deepak@floormaster.com',
        isPrimary: true,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'va-030',
        type: 'record_created',
        description: 'Vendor record created',
        user: 'Rajan Mehta',
        timestamp: '2023-08-20T09:00:00Z',
      },
      {
        id: 'va-031',
        type: 'profile_edited',
        description: 'Profile updated — Specialization Tags added',
        user: 'Neha Sharma',
        timestamp: '2023-09-10T14:00:00Z',
      },
      {
        id: 'va-032',
        type: 'document_uploaded',
        description: 'GST Certificate uploaded',
        user: 'Neha Sharma',
        timestamp: '2023-09-12T09:00:00Z',
      },
      {
        id: 'va-033',
        type: 'document_uploaded',
        description: 'PAN Card uploaded',
        user: 'Neha Sharma',
        timestamp: '2023-09-12T09:05:00Z',
      },
    ],
    financialDetails: {
      totalPayables: 210000,
      amountPaid: 150000,
      outstanding: 60000,
      tdsDeducted: 21000,
      activeProjects: 2,
      completedProjects: 3,
      totalContractValue: 750000,
      lastPaymentDate: '28 Feb 2025',
      paymentTerms: 'Net 30',
      vendorType: 'Measurable',
      gstStatus: 'Registered',
    },
  },
  {
    id: 'v-005',
    name: 'AirTech HVAC',
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
    contacts: [
      {
        id: 'vc-040',
        name: 'Mohan Rao',
        designation: 'Operations Head',
        phone: '+91 9871234564',
        email: 'mohan@airtechhvac.com',
        isPrimary: true,
      },
    ],
    gstDocument: { name: 'GST_Certificate.pdf', url: '#' },
    panDocument: null,
    bankChequeDocument: null,
    insuranceDocument: { name: 'liability_policy_expired.pdf', url: '#' },
    compliance: {
      gst: 'verified',
      pan: 'missing',
      bankCheque: 'missing',
      insurance: { status: 'expired', expiryDate: '2025-03-01' },
    },
    activityLog: [
      {
        id: 'va-040',
        type: 'record_created',
        description: 'Vendor record created',
        user: 'Rajan Mehta',
        timestamp: '2024-02-14T10:00:00Z',
      },
      {
        id: 'va-041',
        type: 'document_uploaded',
        description: 'GST Certificate uploaded',
        user: 'Rajan Mehta',
        timestamp: '2024-02-14T10:10:00Z',
      },
    ],
    financialDetails: {
      totalPayables: 175000,
      amountPaid: 100000,
      outstanding: 75000,
      tdsDeducted: 17500,
      activeProjects: 1,
      completedProjects: 0,
      totalContractValue: 300000,
      lastPaymentDate: '05 Mar 2025',
      paymentTerms: 'Immediate',
      vendorType: 'Measurable',
      gstStatus: 'Registered',
    },
  },
  {
    id: 'v-006',
    name: 'Craft Studio Design',
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
    contacts: [
      {
        id: 'vc-050',
        name: 'Nisha Sharma',
        designation: 'Creative Director',
        phone: '+91 9871234565',
        email: 'nisha@craftstudio.com',
        isPrimary: true,
      },
    ],
    gstDocument: null,
    panDocument: { name: 'PAN_Card.pdf', url: '#' },
    activityLog: [
      {
        id: 'va-050',
        type: 'record_created',
        description: 'Vendor record created',
        user: 'Rajan Mehta',
        timestamp: '2023-07-30T09:00:00Z',
      },
      {
        id: 'va-051',
        type: 'status_changed',
        description: 'Status changed from Active to Inactive',
        user: 'Rajan Mehta',
        timestamp: '2024-05-15T15:00:00Z',
      },
    ],
    financialDetails: {
      totalPayables: 0,
      amountPaid: 0,
      outstanding: 0,
      tdsDeducted: 0,
      activeProjects: 0,
      completedProjects: 1,
      totalContractValue: 120000,
      lastPaymentDate: '01 Apr 2023',
      paymentTerms: 'Net 45',
      vendorType: 'Non-measurable',
      gstStatus: 'Unregistered',
    },
  },
]

// Per-vendor contacts store (for sub-resource CRUD)
const contactsStore: Record<string, Contact[]> = {}
vendors.forEach((v) => {
  contactsStore[v.id] = v.contacts
})

let idCounter = 7
let contactIdCounter = 100

export const vendorsHandlers = [
  http.get('/api/vendors', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status') ?? ''
    const gstStatus = url.searchParams.get('gstStatus') ?? ''
    const state = url.searchParams.get('state') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10)

    let filtered = vendors
    if (search) {
      const q = search.trim().toLowerCase()
      const tokens = q.split(/\s+/).filter(Boolean)
      filtered = filtered.filter((v) => {
        const stored = contactsStore[v.id] ?? v.contacts
        const hay = [
          v.name,
          v.contactPerson,
          v.email,
          v.website ?? '',
          ...v.tags,
          ...stored.flatMap((c) => [c.name, c.email, c.phone, c.designation ?? '']),
        ]
          .join(' ')
          .toLowerCase()
        return tokens.every((t) => hay.includes(t))
      })
    }
    if (status) filtered = filtered.filter((v) => v.status === status)
    if (gstStatus) filtered = filtered.filter((v) => v.gstStatus === gstStatus)
    if (state) filtered = filtered.filter((v) => v.state === state)

    const total = filtered.length
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map((v) => ({
      ...v,
      contacts: contactsStore[v.id] ?? v.contacts,
    }))
    return HttpResponse.json({ items, total })
  }),

  http.get('/api/vendors/:id', ({ params }) => {
    const idOrSlug = params.id as string
    const vendor =
      vendors.find((v) => v.id === idOrSlug) ??
      vendors.find((v) => toSlug(v.name) === idOrSlug)
    if (!vendor) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    return HttpResponse.json({ ...vendor, contacts: contactsStore[vendor.id] ?? vendor.contacts })
  }),

  http.post('/api/vendors', async ({ request }) => {
    const data = await request.json() as Omit<Vendor, 'id' | 'createdAt'>
    const defaultFinancial: VendorFinancialDetails = {
      totalPayables: 0,
      amountPaid: 0,
      outstanding: 0,
      tdsDeducted: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalContractValue: 0,
      lastPaymentDate: '—',
      paymentTerms: 'Net 30',
      vendorType: 'Measurable',
      gstStatus: data.gstStatus,
    }
    const newVendor: Vendor = {
      ...data,
      id: `v-${String(idCounter++).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      contacts: data.contacts ?? [],
      activityLog: data.activityLog ?? [],
      financialDetails: {
        ...defaultFinancial,
        ...(data.financialDetails ?? {}),
        gstStatus: data.gstStatus,
      },
    }
    vendors.unshift(newVendor)
    contactsStore[newVendor.id] = newVendor.contacts ?? []
    return HttpResponse.json(newVendor, { status: 201 })
  }),

  http.put('/api/vendors/:id', async ({ params, request }) => {
    const idx = vendors.findIndex((v) => v.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    const data = await request.json() as Partial<Vendor>
    const prev = vendors[idx]
    const merged: Vendor = { ...prev, ...data }
    if (data.gstStatus !== undefined && prev.financialDetails) {
      merged.financialDetails = {
        ...prev.financialDetails,
        gstStatus: data.gstStatus,
      }
    }
    vendors[idx] = merged
    if (data.contacts !== undefined) {
      contactsStore[prev.id] = data.contacts
      merged.contacts = data.contacts
      const primary = data.contacts.find((c) => c.isPrimary) ?? data.contacts[0]
      if (primary) {
        merged.contactPerson = primary.name
        merged.phone = primary.phone
        merged.email = primary.email
        merged.designation = primary.designation ?? null
      }
    }
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

  // ── Contacts sub-resource ─────────────────────────────────────────────────

  http.get('/api/vendors/:id/contacts', ({ params }) => {
    const id = params.id as string
    const contacts = contactsStore[id]
    if (!contacts) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    return HttpResponse.json(contacts)
  }),

  http.post('/api/vendors/:id/contacts', async ({ params, request }) => {
    const id = params.id as string
    if (!contactsStore[id]) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    const data = await request.json() as Omit<Contact, 'id'>
    const newContact: Contact = {
      ...data,
      id: `vc-${String(contactIdCounter++).padStart(3, '0')}`,
    }
    if (newContact.isPrimary) {
      contactsStore[id].forEach((c) => { c.isPrimary = false })
    }
    contactsStore[id].push(newContact)
    return HttpResponse.json(newContact, { status: 201 })
  }),

  http.put('/api/vendors/:id/contacts/:contactId', async ({ params, request }) => {
    const { id, contactId } = params as { id: string; contactId: string }
    if (!contactsStore[id]) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
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

  http.delete('/api/vendors/:id/contacts/:contactId', ({ params }) => {
    const { id, contactId } = params as { id: string; contactId: string }
    if (!contactsStore[id]) {
      return HttpResponse.json({ message: 'Vendor not found' }, { status: 404 })
    }
    const contact = contactsStore[id].find((c) => c.id === contactId)
    if (!contact) {
      return HttpResponse.json({ message: 'Contact not found' }, { status: 404 })
    }
    contactsStore[id] = contactsStore[id].filter((c) => c.id !== contactId)
    return HttpResponse.json({ success: true })
  }),
]
