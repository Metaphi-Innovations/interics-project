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

interface StatusMaster {
  id: string
  name: string
  status: 'active' | 'inactive'
}

interface SectorMaster {
  id: string
  name: string
  status: 'active' | 'inactive'
}

interface RatingMaster {
  id: string
  name: string
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
  {
    id: 'sac-6',
    code: '998393',
    description: 'Due Diligence & Advisory',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-7',
    code: '999799',
    description: 'Other Services (Approvals)',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-8',
    code: '995411',
    description: 'Construction Services',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-9',
    code: '995481',
    description: 'Interior Execution / Fit-outs',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
  {
    id: 'sac-10',
    code: '998319',
    description: 'Project Management Services',
    gstRateId: 'gst-4',
    gstRate: 18,
    status: 'active',
  },
]

let categories: Category[] = [
  {
    id: 'cat-001',
    name: 'Design & Diligence',
    description: 'Design, diligence, and statutory planning scope',
    servicesCount: 5,
    status: 'active',
  },
  {
    id: 'cat-002',
    name: 'Build Services',
    description: 'Construction, fit-outs, and site delivery',
    servicesCount: 3,
    status: 'active',
  },
  {
    id: 'cat-003',
    name: 'Consultancy',
    description: 'Specialist advisory services',
    servicesCount: 4,
    status: 'active',
  },
]

let services: Service[] = [
  {
    id: 'svc-101',
    name: 'Interior Design',
    categoryId: 'cat-001',
    sacCodeId: 'sac-1',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['design'],
    status: 'active',
  },
  {
    id: 'svc-102',
    name: 'Engineering Services',
    categoryId: 'cat-001',
    sacCodeId: 'sac-2',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['engineering'],
    status: 'active',
  },
  {
    id: 'svc-103',
    name: 'Due Diligence',
    categoryId: 'cat-001',
    sacCodeId: 'sac-6',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['diligence'],
    status: 'active',
  },
  {
    id: 'svc-104',
    name: 'LEED (Planning)',
    categoryId: 'cat-001',
    sacCodeId: 'sac-3',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['leed'],
    status: 'active',
  },
  {
    id: 'svc-105',
    name: 'Local Approvals',
    categoryId: 'cat-001',
    sacCodeId: 'sac-7',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['approvals'],
    status: 'active',
  },
  {
    id: 'svc-201',
    name: 'Construction / Build Services',
    categoryId: 'cat-002',
    sacCodeId: 'sac-8',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['build'],
    status: 'active',
  },
  {
    id: 'svc-202',
    name: 'Interior Execution / Fit-outs',
    categoryId: 'cat-002',
    sacCodeId: 'sac-9',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['fitout'],
    status: 'active',
  },
  {
    id: 'svc-203',
    name: 'Project Management / Site Supervision',
    categoryId: 'cat-002',
    sacCodeId: 'sac-10',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['pm'],
    status: 'active',
  },
  {
    id: 'svc-301',
    name: 'Acoustic Consultancy',
    categoryId: 'cat-003',
    sacCodeId: 'sac-3',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['consultancy'],
    status: 'active',
  },
  {
    id: 'svc-302',
    name: 'Lighting Consultancy',
    categoryId: 'cat-003',
    sacCodeId: 'sac-3',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['consultancy'],
    status: 'active',
  },
  {
    id: 'svc-303',
    name: 'Kitchen Consultancy',
    categoryId: 'cat-003',
    sacCodeId: 'sac-3',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['consultancy'],
    status: 'active',
  },
  {
    id: 'svc-304',
    name: 'LEED (Advisory)',
    categoryId: 'cat-003',
    sacCodeId: 'sac-3',
    gstRate: 18,
    allowGSTOverride: false,
    allowVendorMapping: false,
    tags: ['consultancy'],
    status: 'active',
  },
]

let statuses: StatusMaster[] = [
  { id: 'sts-1', name: 'Execution Ongoing', status: 'active' },
  { id: 'sts-2', name: 'Payment Pending', status: 'active' },
  { id: 'sts-3', name: 'At Risk', status: 'active' },
  { id: 'sts-4', name: 'Completed', status: 'active' },
  { id: 'sts-5', name: 'On Hold', status: 'active' },
]

let sectors: SectorMaster[] = [
  { id: 'sec-1', name: 'Banking', status: 'active' },
  { id: 'sec-2', name: 'IT Companies', status: 'active' },
  { id: 'sec-3', name: 'Healthcare', status: 'active' },
  { id: 'sec-4', name: 'Hospitality', status: 'active' },
  { id: 'sec-5', name: 'Manufacturing', status: 'active' },
]

let ratings: RatingMaster[] = [
  { id: 'rat-1', name: 'Premium', status: 'active' },
  { id: 'rat-2', name: 'Luxury', status: 'active' },
  { id: 'rat-3', name: 'Ultra Premium', status: 'active' },
  { id: 'rat-4', name: 'Standard', status: 'active' },
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

  // Status Master
  http.get('/api/settings/statuses', () => HttpResponse.json(statuses)),
  http.post('/api/settings/statuses', async ({ request }) => {
    const data = await request.json() as Omit<StatusMaster, 'id'>
    const row: StatusMaster = { id: `sts-${nextId()}`, ...data }
    statuses.push(row)
    return HttpResponse.json(row, { status: 201 })
  }),
  http.put('/api/settings/statuses/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<StatusMaster>
    const idx = statuses.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    statuses[idx] = { ...statuses[idx], ...data }
    return HttpResponse.json(statuses[idx])
  }),
  http.patch('/api/settings/statuses/:id/toggle', ({ params }) => {
    const idx = statuses.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    statuses[idx].status = statuses[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(statuses[idx])
  }),

  // Sector Master
  http.get('/api/settings/sectors', () => HttpResponse.json(sectors)),
  http.post('/api/settings/sectors', async ({ request }) => {
    const data = await request.json() as Omit<SectorMaster, 'id'>
    const row: SectorMaster = { id: `sec-${nextId()}`, ...data }
    sectors.push(row)
    return HttpResponse.json(row, { status: 201 })
  }),
  http.put('/api/settings/sectors/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<SectorMaster>
    const idx = sectors.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    sectors[idx] = { ...sectors[idx], ...data }
    return HttpResponse.json(sectors[idx])
  }),
  http.patch('/api/settings/sectors/:id/toggle', ({ params }) => {
    const idx = sectors.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    sectors[idx].status = sectors[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(sectors[idx])
  }),

  // Rating Master
  http.get('/api/settings/ratings', () => HttpResponse.json(ratings)),
  http.post('/api/settings/ratings', async ({ request }) => {
    const data = await request.json() as Omit<RatingMaster, 'id'>
    const row: RatingMaster = { id: `rat-${nextId()}`, ...data }
    ratings.push(row)
    return HttpResponse.json(row, { status: 201 })
  }),
  http.put('/api/settings/ratings/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<RatingMaster>
    const idx = ratings.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    ratings[idx] = { ...ratings[idx], ...data }
    return HttpResponse.json(ratings[idx])
  }),
  http.patch('/api/settings/ratings/:id/toggle', ({ params }) => {
    const idx = ratings.findIndex(r => r.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    ratings[idx].status = ratings[idx].status === 'active' ? 'inactive' : 'active'
    return HttpResponse.json(ratings[idx])
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
