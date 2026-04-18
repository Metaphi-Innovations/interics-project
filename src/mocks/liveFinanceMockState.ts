import type {
  ClientInvoice,
  ClientInvoiceLineItem,
  Expense,
  Reimbursement,
  VendorInvoice,
  VendorPayment,
} from '@/slices/live/types'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import {
  MONEY_EPS,
  rollupsFromLineItems,
  roundMoney,
  totalSettledFromPayments,
  totalTdsFromPayments,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'

const P001_NAME = 'Acme Corp - Head Office Redesign'
const P001_CLIENT = { clientId: 'c-004' as const, clientName: 'Acme Corp' }
const P002_NAME = 'TechVentures — Office Expansion'
const P002_CLIENT = { clientId: 'c-005' as const, clientName: 'TechVentures Ltd' }

function gstOnLine(amount: number, rate: number): number {
  return Math.round((amount * rate) / 100)
}

export function milestoneLine(
  id: string,
  milestoneId: string,
  serviceId: string,
  serviceName: string,
  amount: number,
  gstRate: number,
): ClientInvoiceLineItem {
  const gstAmount = gstOnLine(amount, gstRate)
  return {
    id,
    serviceId,
    serviceName,
    sacCode: '998314',
    amount,
    gstRate,
    gstAmount,
    milestoneId,
    lineSource: 'milestone',
  }
}

export function withPayments(
  inv: Omit<ClientInvoice, 'tdsAmount' | 'netReceivable' | 'status'> & {
    status?: ClientInvoice['status']
  },
): ClientInvoice {
  const tdsAmount = totalTdsFromPayments(inv.payments)
  const netReceivable = roundMoney(inv.grossAmount - totalSettledFromPayments(inv.payments))
  let status: ClientInvoice['status']
  if (netReceivable <= MONEY_EPS) status = 'paid'
  else if (inv.payments.length > 0) status = 'partially_paid'
  else if (inv.status === 'draft') status = 'draft'
  else status = 'sent'
  return { ...inv, status, tdsAmount, netReceivable }
}

// ─── Line items ───────────────────────────────────────────────────────────────

const li001 = milestoneLine('li-001-1', 'cm-001', 'ps-001', 'Interior Design', 300000, DEFAULT_GST_RATE)
const li002 = milestoneLine('li-002-1', 'cm-002', 'ps-001', 'Interior Design', 600000, DEFAULT_GST_RATE)
const li003 = milestoneLine('li-003-1', 'cm-004', 'ps-002', 'Civil Works', 500000, DEFAULT_GST_RATE)
const li006 = milestoneLine('li-006-1', 'cm-401', 'ps-001', 'Interior Design', 195000, DEFAULT_GST_RATE)

const liP2_008 = milestoneLine('li-p2-008', 'cm-wd', 'ps-001', 'Interior Design', 90000, DEFAULT_GST_RATE)
const liP2_009 = milestoneLine('li-p2-009', 'cm-ss', 'ps-002', 'Civil Works', 150000, DEFAULT_GST_RATE)
const liP2_012 = milestoneLine('li-p2-012', 'cm-fd', 'ps-001', 'Interior Design', 200000, DEFAULT_GST_RATE)

export let invoices: ClientInvoice[] = [
  withPayments({
    id: 'INV-001',
    projectId: 'p-001',
    projectName: P001_NAME,
    ...P001_CLIENT,
    milestoneId: 'cm-001',
    milestoneName: 'Mobilization',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    lineItems: [li001],
    ...rollupsFromLineItems([li001]),
    invoiceNumber: 'INV-001',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-14',
    payments: [
      {
        id: 'cip-001',
        date: '2024-02-15',
        amountReceived: 324000,
        tdsDeducted: 30000,
        netReceived: 324000,
        paymentMode: 'bank_transfer',
        reference: 'NEFT-INV001',
        recordedAt: '2024-02-15T10:00:00.000Z',
      },
    ],
  }),
  withPayments({
    id: 'INV-002',
    projectId: 'p-001',
    projectName: P001_NAME,
    ...P001_CLIENT,
    milestoneId: 'cm-002',
    milestoneName: 'Design Draft',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    lineItems: [li002],
    ...rollupsFromLineItems([li002]),
    invoiceNumber: 'INV-002',
    invoiceDate: '2024-02-01',
    dueDate: '2024-03-03',
    payments: [],
  }),
  withPayments({
    id: 'INV-003',
    projectId: 'p-001',
    projectName: P001_NAME,
    ...P001_CLIENT,
    milestoneId: 'cm-004',
    milestoneName: 'Mobilization',
    serviceId: 'ps-002',
    serviceName: 'Civil Works',
    lineItems: [li003],
    ...rollupsFromLineItems([li003]),
    invoiceNumber: 'INV-003',
    invoiceDate: '2024-01-20',
    dueDate: '2024-02-19',
    payments: [],
  }),
  withPayments({
    id: 'INV-2026-008',
    projectId: 'p-002',
    projectName: P002_NAME,
    ...P002_CLIENT,
    milestoneId: 'cm-wd',
    milestoneName: 'Working Drawings',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    lineItems: [liP2_008],
    ...rollupsFromLineItems([liP2_008]),
    invoiceNumber: 'INV-2026-008',
    invoiceDate: '2026-04-02',
    dueDate: '2026-05-02',
    payments: [],
  }),
  withPayments({
    id: 'INV-2026-009',
    projectId: 'p-002',
    projectName: P002_NAME,
    ...P002_CLIENT,
    milestoneId: 'cm-ss',
    milestoneName: 'Site Supervision',
    serviceId: 'ps-002',
    serviceName: 'Civil Works',
    lineItems: [liP2_009],
    ...rollupsFromLineItems([liP2_009]),
    invoiceNumber: 'INV-2026-009',
    invoiceDate: '2026-02-15',
    dueDate: '2026-03-17',
    payments: [],
  }),
  withPayments({
    id: 'INV-2026-012',
    projectId: 'p-002',
    projectName: P002_NAME,
    ...P002_CLIENT,
    milestoneId: 'cm-fd',
    milestoneName: 'Final Delivery',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    lineItems: [liP2_012],
    ...rollupsFromLineItems([liP2_012]),
    invoiceNumber: 'INV-2026-012',
    invoiceDate: '2026-02-20',
    dueDate: '2026-03-22',
    payments: [
      {
        id: 'cip-p2-012',
        date: '2026-02-25',
        amountReceived: 216000,
        tdsDeducted: 20000,
        netReceived: 216000,
        paymentMode: 'bank_transfer',
        reference: 'NEFT-INV2026012',
        recordedAt: '2026-02-25T11:00:00.000Z',
      },
    ],
  }),
  withPayments({
    id: 'inv-006',
    projectId: 'p-004',
    projectName: 'Global Solutions - Store Renovation',
    clientId: 'c-006',
    clientName: 'Global Solutions LLP',
    milestoneId: 'cm-401',
    milestoneName: 'Concept',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    lineItems: [li006],
    ...rollupsFromLineItems([li006]),
    invoiceNumber: 'LIV-26-006',
    invoiceDate: '2025-12-08',
    dueDate: '2026-01-07',
    payments: [
      {
        id: 'cip-006',
        date: '2025-12-20',
        amountReceived: 230100,
        tdsDeducted: 0,
        netReceived: 230100,
        paymentMode: 'upi',
        recordedAt: '2025-12-20T09:00:00.000Z',
      },
    ],
  }),
]

export let vendorInvoices: VendorInvoice[] = [
  {
    id: 'VINV-001',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'ps-002',
    serviceName: 'Construction / Build Services',
    milestoneId: 'vml-c1',
    milestoneName: 'Mobilization',
    invoiceNumber: 'BWC-MOB-001',
    invoiceDate: '2024-02-10',
    baseAmount: 200000,
    tdsRate: 10,
    tdsAmount: 20000,
    netPayable: 180000,
    status: 'paid',
  },
  {
    id: 'VINV-002',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'ps-002',
    serviceName: 'Construction / Build Services',
    milestoneId: 'vml-c2',
    milestoneName: 'Structure',
    invoiceNumber: 'BWC-DD-002',
    invoiceDate: '2024-03-01',
    baseAmount: 150000,
    tdsRate: 10,
    tdsAmount: 15000,
    netPayable: 135000,
    status: 'pending',
  },
  {
    id: 'VINV-003',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-002',
    vendorName: 'FloorMaster',
    serviceId: 'interior-design',
    serviceName: 'Interior Design',
    milestoneId: 'cm-001',
    milestoneName: 'Mobilization',
    invoiceNumber: 'FM-MOB-003',
    invoiceDate: '2024-02-05',
    baseAmount: 120000,
    tdsRate: 10,
    tdsAmount: 12000,
    netPayable: 108000,
    status: 'pending',
  },
  {
    id: 'VINV-004',
    projectId: 'p-002',
    projectName: P002_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell',
    serviceId: 'ps-002',
    serviceName: 'Civil Works',
    milestoneId: 'vml-p2-c1',
    milestoneName: 'Civil Works',
    invoiceNumber: 'VINV-004',
    invoiceDate: '2026-03-10',
    baseAmount: 120000,
    tdsRate: 10,
    tdsAmount: 12000,
    netPayable: 108000,
    status: 'pending',
  },
  {
    id: 'VINV-005',
    projectId: 'p-002',
    projectName: P002_NAME,
    vendorId: 'v-002',
    vendorName: 'FloorMaster',
    serviceId: 'ps-001',
    serviceName: 'Interior Design',
    milestoneId: 'vml-p2-i1',
    milestoneName: 'Interior Design',
    invoiceNumber: 'VINV-005',
    invoiceDate: '2026-03-20',
    baseAmount: 80000,
    tdsRate: 10,
    tdsAmount: 8000,
    netPayable: 72000,
    status: 'paid',
  },
]

export let payments: VendorPayment[] = [
  {
    id: 'PAY-001',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    paymentDate: '2024-02-18',
    totalAmount: 180000,
    linkedInvoiceIds: ['VINV-001'],
    linkedExpenseIds: [],
    linkedReimbursementIds: ['RMB-004'],
    invoiceTotal: 200000,
    expenseDeductions: 0,
    reimbursementAdditions: 8000,
    tdsDeducted: 20000,
    netPaid: 180000,
    status: 'completed',
    referenceNumber: 'NEFT-20240218-001',
  },
]

export let expenses: Expense[] = [
  {
    id: 'EXP-001',
    projectId: 'p-001',
    projectName: P001_NAME,
    type: 'additional',
    description: 'Office supplies',
    amount: 5000,
    date: '2024-02-01',
    status: 'pending',
  },
  {
    id: 'EXP-002',
    projectId: 'p-001',
    projectName: P001_NAME,
    type: 'vendor_linked',
    description: 'Site logistics',
    amount: 15000,
    date: '2024-02-05',
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'ps-002',
    serviceName: 'Construction / Build Services',
    milestoneId: 'vml-c1',
    milestoneName: 'Mobilization',
    status: 'pending',
  },
  {
    id: 'EXP-003',
    projectId: 'p-001',
    projectName: P001_NAME,
    type: 'vendor_linked',
    description: 'Material transport',
    amount: 8000,
    date: '2024-02-08',
    vendorId: 'v-001',
    vendorName: 'BuildWell',
    status: 'pending',
  },
  {
    id: 'EXP-004',
    projectId: 'p-001',
    projectName: P001_NAME,
    type: 'common',
    description: 'Site management cost',
    amount: 90000,
    date: '2024-02-12',
    vendorAllocations: [
      {
        vendorId: 'v-001',
        vendorName: 'BuildWell',
        allocationPercent: 60,
        allocationAmount: 54000,
      },
      {
        vendorId: 'v-002',
        vendorName: 'FloorMaster',
        allocationPercent: 40,
        allocationAmount: 36000,
      },
    ],
    status: 'pending',
  },
  {
    id: 'EXP-005',
    projectId: 'p-002',
    projectName: P002_NAME,
    type: 'additional',
    description: 'Site survey',
    amount: 8000,
    date: '2026-03-18',
    status: 'pending',
  },
  {
    id: 'EXP-006',
    projectId: 'p-002',
    projectName: P002_NAME,
    type: 'vendor_linked',
    description: 'Equipment rental',
    amount: 12000,
    date: '2026-03-22',
    vendorId: 'v-001',
    vendorName: 'BuildWell',
    status: 'pending',
  },
  {
    id: 'exp-007',
    projectId: 'p-006',
    type: 'additional',
    description: 'Bandra site contingency materials',
    amount: 18500,
    date: '2026-04-07',
    status: 'pending',
  },
]

export let reimbursements: Reimbursement[] = [
  {
    id: 'RMB-001',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'ps-002',
    serviceName: 'Construction / Build Services',
    milestoneId: 'vml-c1',
    milestoneName: 'Mobilization',
    description: 'Materials purchased by vendor',
    amount: 25000,
    date: '2024-02-14',
    status: 'pending',
  },
  {
    id: 'RMB-002',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-002',
    vendorName: 'FloorMaster',
    serviceId: 'interior-design',
    serviceName: 'Interior Design',
    description: 'Equipment rental paid by vendor',
    amount: 12000,
    date: '2024-02-16',
    status: 'pending',
  },
  {
    id: 'RMB-003',
    projectId: 'p-002',
    projectName: P002_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell',
    serviceId: 'ps-002',
    serviceName: 'Civil Works',
    milestoneId: 'vml-p2-c1',
    milestoneName: 'Civil Works',
    description: 'Tools purchased',
    amount: 15000,
    date: '2026-04-01',
    status: 'pending',
  },
  {
    id: 'RMB-004',
    projectId: 'p-001',
    projectName: P001_NAME,
    vendorId: 'v-001',
    vendorName: 'BuildWell Constructions',
    serviceId: 'ps-002',
    serviceName: 'Construction / Build Services',
    milestoneId: 'vml-c1',
    milestoneName: 'Mobilization',
    description: 'Advance site utilities paid by vendor',
    amount: 8000,
    date: '2024-02-20',
    status: 'included_in_payment',
    linkedPaymentId: 'PAY-001',
  },
]

export let invCounter = 7
export let invPaymentCounter = 7

let viCounter = 6
let payCounter = 2
let expCounter = 8
let rmbCounter = 4

export function nextVendorInvoiceId(): string {
  viCounter += 1
  return `VINV-${String(viCounter).padStart(3, '0')}`
}

export function nextPaymentId(): string {
  payCounter += 1
  return `PAY-${String(payCounter).padStart(3, '0')}`
}

export function nextExpenseId(): string {
  expCounter += 1
  return `exp-${String(expCounter).padStart(3, '0')}`
}

export function nextReimbursementId(): string {
  rmbCounter += 1
  const num = String(rmbCounter).padStart(3, '0')
  return `rmb-${num}`
}

/** Project display names for MSW aggregations when optional fields are missing */
export const PROJECT_NAMES: Record<string, string> = {
  'p-001': P001_NAME,
  'p-002': P002_NAME,
  'p-003': 'Acme Corp - Retail Fit-out',
  'p-004': 'Global Solutions - Store Renovation',
  'p-006': 'Bandra site project',
}

export const PROJECT_CLIENTS: Record<string, { clientId: string; clientName: string }> = {
  'p-001': P001_CLIENT,
  'p-002': P002_CLIENT,
  'p-004': { clientId: 'c-006', clientName: 'Global Solutions LLP' },
}
