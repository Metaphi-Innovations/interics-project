import { http, HttpResponse } from 'msw'

interface GSTRate {
  id: string
  slabName: string
  rate: number
  description: string
  status: 'active' | 'inactive'
}

interface TDSSection {
  id: string
  section: string
  description: string
  defaultRate: number
  appliesTo: 'vendors' | 'clients' | 'both'
  status: 'active' | 'inactive'
}

interface SACCode {
  id: string
  code: string
  description: string
  gstRateId: string
  gstRate?: number
  status: 'active' | 'inactive'
}

interface Category {
  id: string
  name: string
  description: string
  servicesCount: number
  status: 'active' | 'inactive'
}

interface Service {
  id: string
  name: string
  categoryId: string
  sacCodeId: string | null
  gstRate: number
  allowGSTOverride: boolean
  allowVendorMapping: boolean
  tags: string[]
  status: 'active' | 'inactive'
}

interface CompanyProfile {
  companyName: string
  gstin: string
  pan: string
  companyType: 'pvt_ltd' | 'llp' | 'proprietorship' | 'partnership'
  email: string
  phone: string
  website: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  logoUrl: string | null
}

interface NumberingSchemes {
  projectPrefix: string
  projectFormat: 'PRJ-YY-###' | 'PRJ-YYYY-###' | 'PRJ-###'
  invoicePrefix: string
  invoiceFormat: 'INV-YYYY-###' | 'INV-YY-###'
  clientPOPrefix: string
  vendorPOPrefix: string
  expensePrefix: string
}

interface SystemDefaults {
  currency: 'INR'
  financialYearStart: 'april' | 'january'
  defaultTaxRegime: 'gst' | 'non_gst'
  defaultProjectType: 'design' | 'design_and_build'
  defaultPaginationSize: 10 | 25 | 50 | 100
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  autoArchiveDays: 0 | 30 | 60 | 90
}

// --- Seed data ---

let companyProfile: CompanyProfile = {
  companyName: 'Interics Design Consultants',
  gstin: '29INTDC1234A1Z5',
  pan: 'INTDC1234A',
  companyType: 'pvt_ltd',
  email: 'accounts@interics.com',
  phone: '+91 8012345678',
  website: 'www.interics.com',
  addressLine1: '3rd Floor, Design House, MG Road',
  addressLine2: 'Shivaji Nagar',
  city: 'Bangalore',
  state: 'Karnataka',
  pincode: '560001',
  logoUrl: null,
}

let gstRates: GSTRate[] = [
  { id: 'gst-1', slabName: 'GST 0%', rate: 0, description: 'Nil rated services', status: 'active' },
  { id: 'gst-2', slabName: 'GST 5%', rate: 5, description: 'Concessional rate', status: 'active' },
  { id: 'gst-3', slabName: 'GST 12%', rate: 12, description: 'Reduced rate services', status: 'active' },
  { id: 'gst-4', slabName: 'GST 18%', rate: 18, description: 'Standard Services Rate', status: 'active' },
  { id: 'gst-5', slabName: 'GST 28%', rate: 28, description: 'Luxury & sin goods', status: 'inactive' },
]

let tdsSections: TDSSection[] = [
  {
    id: 'tds-1',
    section: '194C',
    description: 'Payment to Contractors',
    defaultRate: 1,
    appliesTo: 'vendors',
    status: 'active',
  },
  {
    id: 'tds-2',
    section: '194J',
    description: 'Professional / Technical Services',
    defaultRate: 10,
    appliesTo: 'both',
    status: 'active',
  },
  {
    id: 'tds-3',
    section: '194I',
    description: 'Rent',
    defaultRate: 10,
    appliesTo: 'vendors',
    status: 'active',
  },
  {
    id: 'tds-4',
    section: '194H',
    description: 'Commission or Brokerage',
    defaultRate: 5,
    appliesTo: 'both',
    status: 'inactive',
  },
]

let sacCodes: SACCode[] = [
  {
    id: 'sac-1',
    code: '998391',
    description: 'Interior Design Services',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-2',
    code: '998392',
    description: 'Architecture & Spatial Design',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-3',
    code: '998312',
    description: 'Graphic Design Services',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-4',
    code: '995461',
    description: 'Electrical Installation Works',
    gstRateId: 'gst-3',
    gstRate: 12,
    status: 'active',
  },
  {
    id: 'sac-5',
    code: '995462',
    description: 'Civil & Finishing Works',
    gstRateId: 'gst-3',
    gstRate: 12,
    status: 'active',
  },
]

let categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Design & Diligence',
    description: 'Conceptual and detailed design work',
    servicesCount: 3,
    status: 'active',
  },
  {
    id: 'cat-2',
    name: 'Project Management',
    description: 'Site supervision and coordination services',
    servicesCount: 2,
    status: 'active',
  },
  {
    id: 'cat-3',
    name: 'Civil & Build',
    description: 'Execution and construction activities',
    servicesCount: 4,
    status: 'active',
  },
  {
    id: 'cat-4',
    name: 'MEP Services',
    description: 'Mechanical, Electrical and Plumbing works',
    servicesCount: 0,
    status: 'inactive',
  },
]

let services: Service[] = [
  {
    id: 'svc-1',
    name: 'Concept Design',
    categoryId: 'cat-1',
    sacCodeId: 'sac-1',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['design'],
    status: 'active',
  },
  {
    id: 'svc-2',
    name: 'Design Development',
    categoryId: 'cat-1',
    sacCodeId: 'sac-1',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['design'],
    status: 'active',
  },
  {
    id: 'svc-3',
    name: 'Working Drawings',
    categoryId: 'cat-1',
    sacCodeId: 'sac-2',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['drawings'],
    status: 'active',
  },
  {
    id: 'svc-4',
    name: 'Site Supervision',
    categoryId: 'cat-2',
    sacCodeId: 'sac-1',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['pm'],
    status: 'active',
  },
  {
    id: 'svc-5',
    name: 'Civil Works',
    categoryId: 'cat-3',
    sacCodeId: 'sac-5',
    gstRate: 12,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['civil'],
    status: 'active',
  },
]

let numberingSchemes: NumberingSchemes = {
  projectPrefix: 'PRJ',
  projectFormat: 'PRJ-YY-###',
  invoicePrefix: 'INV',
  invoiceFormat: 'INV-YYYY-###',
  clientPOPrefix: 'PO-CLI',
  vendorPOPrefix: 'PO-VND',
  expensePrefix: 'EXP',
}

let systemDefaults: SystemDefaults = {
  currency: 'INR',
  financialYearStart: 'april',
  defaultTaxRegime: 'gst',
  defaultProjectType: 'design_and_build',
  defaultPaginationSize: 25,
  dateFormat: 'DD/MM/YYYY',
  autoArchiveDays: 0,
}

let idCounter = 100

function nextId(): string {
  return String(++idCounter)
}

export const settingsHandlers = [
  // Company Profile
  http.get('/api/settings/company', () => HttpResponse.json(companyProfile)),
  http.put('/api/settings/company', async ({ request }) => {
    const data = await request.json() as Partial<CompanyProfile>
    companyProfile = { ...companyProfile, ...data }
    return HttpResponse.json(companyProfile)
  }),

  // GST Rates
  http.get('/api/settings/gst-rates', () => HttpResponse.json(gstRates)),
  http.post('/api/settings/gst-rates', async ({ request }) => {
    const data = await request.json() as Omit<GSTRate, 'id'>
    const newRate: GSTRate = { id: `gst-${nextId()}`, ...data }
    gstRates.push(newRate)
    return HttpResponse.json(newRate, { status: 201 })
  }),
  http.put('/api/settings/gst-rates/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<GSTRate>
    const idx = gstRates.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    gstRates[idx] = { ...gstRates[idx], ...data }
    return HttpResponse.json(gstRates[idx])
  }),
  http.patch('/api/settings/gst-rates/:id/toggle', ({ params }) => {
    const idx = gstRates.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    gstRates[idx].status = gstRates[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(gstRates[idx])
  }),

  // TDS Sections
  http.get('/api/settings/tds-sections', () => HttpResponse.json(tdsSections)),
  http.post('/api/settings/tds-sections', async ({ request }) => {
    const data = await request.json() as Omit<TDSSection, 'id'>
    const newSection: TDSSection = { id: `tds-${nextId()}`, ...data }
    tdsSections.push(newSection)
    return HttpResponse.json(newSection, { status: 201 })
  }),
  http.put('/api/settings/tds-sections/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<TDSSection>
    const idx = tdsSections.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    tdsSections[idx] = { ...tdsSections[idx], ...data }
    return HttpResponse.json(tdsSections[idx])
  }),
  http.patch('/api/settings/tds-sections/:id/toggle', ({ params }) => {
    const idx = tdsSections.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    tdsSections[idx].status = tdsSections[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(tdsSections[idx])
  }),

  // SAC Codes
  http.get('/api/settings/sac-codes', () => HttpResponse.json(sacCodes)),
  http.post('/api/settings/sac-codes', async ({ request }) => {
    const data = await request.json() as Omit<SACCode, 'id'>
    const newCode: SACCode = { id: `sac-${nextId()}`, ...data }
    sacCodes.push(newCode)
    return HttpResponse.json(newCode, { status: 201 })
  }),
  http.put('/api/settings/sac-codes/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<SACCode>
    const idx = sacCodes.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    sacCodes[idx] = { ...sacCodes[idx], ...data }
    return HttpResponse.json(sacCodes[idx])
  }),
  http.patch('/api/settings/sac-codes/:id/toggle', ({ params }) => {
    const idx = sacCodes.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    sacCodes[idx].status = sacCodes[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(sacCodes[idx])
  }),

  // Categories
  http.get('/api/settings/categories', () => HttpResponse.json(categories)),
  http.post('/api/settings/categories', async ({ request }) => {
    const data = await request.json() as Omit<Category, 'id' | 'servicesCount'>
    const newCat: Category = { id: `cat-${nextId()}`, servicesCount: 0, ...data }
    categories.push(newCat)
    return HttpResponse.json(newCat, { status: 201 })
  }),
  http.put('/api/settings/categories/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<Category>
    const idx = categories.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    categories[idx] = { ...categories[idx], ...data }
    return HttpResponse.json(categories[idx])
  }),
  http.patch('/api/settings/categories/:id/toggle', ({ params }) => {
    const idx = categories.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    categories[idx].status = categories[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(categories[idx])
  }),
  http.delete('/api/settings/categories/:id', ({ params }) => {
    const idx = categories.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    categories.splice(idx, 1)
    return HttpResponse.json({ success: true })
  }),

  // Services
  http.get('/api/settings/services', () => HttpResponse.json(services)),
  http.post('/api/settings/services', async ({ request }) => {
    const data = await request.json() as Omit<Service, 'id'>
    const newSvc: Service = { id: `svc-${nextId()}`, ...data }
    services.push(newSvc)
    return HttpResponse.json(newSvc, { status: 201 })
  }),
  http.put('/api/settings/services/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<Service>
    const idx = services.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    services[idx] = { ...services[idx], ...data }
    return HttpResponse.json(services[idx])
  }),
  http.patch('/api/settings/services/:id/toggle', ({ params }) => {
    const idx = services.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    services[idx].status = services[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(services[idx])
  }),

  // Numbering Schemes
  http.get('/api/settings/numbering-schemes', () => HttpResponse.json(numberingSchemes)),
  http.put('/api/settings/numbering-schemes', async ({ request }) => {
    const data = await request.json() as Partial<NumberingSchemes>
    numberingSchemes = { ...numberingSchemes, ...data }
    return HttpResponse.json(numberingSchemes)
  }),

  // System Defaults
  http.get('/api/settings/system-defaults', () => HttpResponse.json(systemDefaults)),
  http.put('/api/settings/system-defaults', async ({ request }) => {
    const data = await request.json() as Partial<SystemDefaults>
    systemDefaults = { ...systemDefaults, ...data }
    return HttpResponse.json(systemDefaults)
  }),
]
