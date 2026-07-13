/**
 * Canonical demo entities for the Interics frontend MSW layer.
 * All modules should reuse these IDs and display names so Clients, Projects,
 * Vendors, Team, Finance, and Reports stay connected.
 */

export const DEMO_USERS = {
  'u-001': { id: 'u-001', name: 'Rajan Mehta', email: 'admin@interics.com' },
  'u-002': { id: 'u-002', name: 'Sarah Kapoor', email: 'sarah@interics.com' },
  'u-003': { id: 'u-003', name: 'Arjun Nair', email: 'arjun@interics.com' },
  'u-004': { id: 'u-004', name: 'Meera Iyer', email: 'meera@interics.com' },
  'u-005': { id: 'u-005', name: 'Vikram Shah', email: 'vikram@interics.com' },
  'u-006': { id: 'u-006', name: 'Priya Rajan', email: 'priya@interics.com' },
} as const

export const DEMO_CUSTOMERS = {
  'c-001': { id: 'c-001', name: 'TechHub Systems Pvt Ltd' },
  'c-002': { id: 'c-002', name: 'Mr. Arun Sharma' },
  'c-003': { id: 'c-003', name: 'Green Villa Estates' },
  'c-004': { id: 'c-004', name: 'Acme Corp' },
  'c-005': { id: 'c-005', name: 'TechVentures Ltd' },
  'c-006': { id: 'c-006', name: 'Global Solutions LLP' },
} as const

export const DEMO_VENDORS = {
  'v-001': { id: 'v-001', name: 'BuildWell Constructions' },
  'v-002': { id: 'v-002', name: 'Spectrum Interiors' },
  'v-003': { id: 'v-003', name: 'LightCraft' },
  'v-004': { id: 'v-004', name: 'FloorMaster Pvt Ltd' },
  'v-005': { id: 'v-005', name: 'AirTech HVAC' },
  'v-006': { id: 'v-006', name: 'Craft Studio Design' },
} as const

/** Stable project display names — must match projectsHandlers seeds. */
export const DEMO_PROJECTS = {
  'p-001': {
    id: 'p-001',
    name: 'Acme Corp - Head Office Redesign',
    customerId: 'c-004',
    customerName: DEMO_CUSTOMERS['c-004'].name,
    projectValue: 4_500_000,
    totalClientPOValue: 3_500_000,
    totalVendorPOValue: 2_250_000,
    invoicedAmount: 1_550_000,
    paidVendorAmount: 1_200_000,
    status: 'Live',
  },
  'p-002': {
    id: 'p-002',
    name: 'TechVentures - Office Expansion',
    customerId: 'c-005',
    customerName: DEMO_CUSTOMERS['c-005'].name,
    projectValue: 2_800_000,
    totalClientPOValue: 2_800_000,
    totalVendorPOValue: 1_800_000,
    invoicedAmount: 980_000,
    paidVendorAmount: 750_000,
    status: 'Live',
  },
  'p-003': {
    id: 'p-003',
    name: 'Acme Corp - Retail Fit-out',
    customerId: 'c-004',
    customerName: DEMO_CUSTOMERS['c-004'].name,
    projectValue: 1_250_000,
    totalClientPOValue: 0,
    totalVendorPOValue: 0,
    invoicedAmount: 0,
    paidVendorAmount: 0,
    status: 'Pitch',
  },
  'p-004': {
    id: 'p-004',
    name: 'Global Solutions - Store Renovation',
    customerId: 'c-006',
    customerName: DEMO_CUSTOMERS['c-006'].name,
    projectValue: 1_850_000,
    totalClientPOValue: 1_850_000,
    totalVendorPOValue: 1_200_000,
    invoicedAmount: 740_000,
    paidVendorAmount: 580_000,
    status: 'Live',
  },
  'p-005': {
    id: 'p-005',
    name: 'TechHub - Office Interiors',
    customerId: 'c-001',
    customerName: DEMO_CUSTOMERS['c-001'].name,
    projectValue: 3_200_000,
    totalClientPOValue: 3_200_000,
    totalVendorPOValue: 2_100_000,
    invoicedAmount: 3_200_000,
    paidVendorAmount: 2_100_000,
    status: 'Completed',
  },
  'p-006': {
    id: 'p-006',
    name: 'Skyline Penthouse',
    customerId: 'c-002',
    customerName: DEMO_CUSTOMERS['c-002'].name,
    projectValue: 5_500_000,
    totalClientPOValue: 3_500_000,
    totalVendorPOValue: 2_250_000,
    invoicedAmount: 1_550_000,
    paidVendorAmount: 1_200_000,
    status: 'Live',
  },
  'p-007': {
    id: 'p-007',
    name: 'Green Villa - Lobby Design',
    customerId: 'c-003',
    customerName: DEMO_CUSTOMERS['c-003'].name,
    projectValue: 450_000,
    totalClientPOValue: 0,
    totalVendorPOValue: 0,
    invoicedAmount: 0,
    paidVendorAmount: 0,
    status: 'Cancelled',
  },
  'p-008': {
    id: 'p-008',
    name: 'TechHub - Floor 3 Renovation',
    customerId: 'c-001',
    customerName: DEMO_CUSTOMERS['c-001'].name,
    projectValue: 1_200_000,
    totalClientPOValue: 1_200_000,
    totalVendorPOValue: 780_000,
    invoicedAmount: 1_200_000,
    paidVendorAmount: 780_000,
    status: 'Archived',
  },
} as const

export type DemoProjectId = keyof typeof DEMO_PROJECTS

export const PROJECT_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(DEMO_PROJECTS).map((p) => [p.id, p.name]),
)

export const PROJECT_CLIENTS: Record<string, { clientId: string; clientName: string }> =
  Object.fromEntries(
    Object.values(DEMO_PROJECTS).map((p) => [
      p.id,
      { clientId: p.customerId, clientName: p.customerName },
    ]),
  )

/** Lightweight project picker rows for User Management `/api/projects-list`. */
export function demoProjectListOptions(): { id: string; name: string; clientName: string }[] {
  return Object.values(DEMO_PROJECTS).map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.customerName,
  }))
}

export const VENDOR = {
  buildWell: DEMO_VENDORS['v-001'],
  spectrum: DEMO_VENDORS['v-002'],
  lightCraft: DEMO_VENDORS['v-003'],
  floorMaster: DEMO_VENDORS['v-004'],
  airTech: DEMO_VENDORS['v-005'],
  craftStudio: DEMO_VENDORS['v-006'],
} as const
