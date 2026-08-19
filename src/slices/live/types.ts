/** Line item on a live (project) client invoice */
export type ClientInvoiceLineSource = 'milestone' | 'manual'

export interface ClientInvoiceLineItem {
  id: string
  serviceId: string
  serviceName: string
  sacCode: string
  amount: number
  labourCessRate?: number
  labourCessAmount?: number
  taxableAmount?: number
  gstRate: number
  gstAmount: number
  milestoneId?: string
  /** Pitch/baseline service row id when it differs from settings `serviceId`. */
  baselineServiceId?: string
  lineSource?: ClientInvoiceLineSource
}

export type ClientInvoicePaymentMode =
  | 'bank_transfer'
  | 'cheque'
  | 'upi'
  | 'cash'
  | 'other'

export interface ClientInvoicePayment {
  id: string
  date: string
  amountReceived: number
  tdsDeducted: number
  netReceived: number
  paymentMode: ClientInvoicePaymentMode
  reference?: string
  recordedAt: string
}

/** Persisted status; UI may show Overdue when past due with balance > 0 */
export type ClientInvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid'

/** Client billing invoice */
export interface ClientInvoice {
  id: string
  projectId: string
  /** Denormalized for global / cross-project views */
  projectName?: string
  clientId?: string
  clientName?: string
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  lineItems: ClientInvoiceLineItem[]
  baseAmount: number
  labourCessAmount?: number
  taxableAmount?: number
  gstAmount: number
  grossAmount: number
  /** Cumulative TDS withheld (from payments) */
  tdsAmount: number
  /** TDS rate (%) taken from Client PO. */
  tdsRate?: number | null
  /** Balance pending = grossAmount − Σ(amountReceived + tdsDeducted) */
  netReceivable: number
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  status: ClientInvoiceStatus
  payments: ClientInvoicePayment[]
  notes?: string
  clientPoId?: string
  documentUrl?: string
  fileName?: string
  /** When the invoice document was uploaded into the system. */
  uploadedAt?: string
}

/** Vendor invoices */
export interface VendorInvoice {
  id: string
  projectId: string
  projectName?: string
  vendorId: string
  vendorName: string
  serviceId: string
  serviceName: string
  milestoneId: string
  milestoneName: string
  invoiceNumber: string
  invoiceDate: string
  /** Optional for list views that only expose invoice date */
  dueDate?: string
  baseAmount: number
  gstRate?: number
  gstAmount?: number
  tdsRate: number
  tdsAmount: number
  /** Expense ids deducted when this invoice was uploaded. */
  linkedExpenseIds?: string[]
  expenseDeductions?: number
  /** Expense ids added to the invoice amount when uploaded. */
  linkedAdditionExpenseIds?: string[]
  expenseAdditions?: number
  /** Optional notes or invoice details entered at upload. */
  description?: string
  netPayable: number
  /** pending = uploaded / ready for payment; payment outcomes update status on release */
  status: 'pending' | 'approved' | 'paid' | 'partially_paid' | 'not_paid'
  documentUrl?: string
  /** Uploaded invoice PDF filename (not the invoice number). */
  fileName?: string
  /** When the invoice document was uploaded into the system. */
  uploadedAt?: string
  /** Optional line items when one invoice covers multiple milestones. */
  lineItems?: Array<{
    milestoneId?: string
    serviceId?: string
    amount?: number
    milestoneName?: string
  }>
}

/** Per vendor–service row on a project (Finance → Payments payable control). */
export interface VendorPayableComplianceChecks {
  insurance: boolean
  contractSigned: boolean
  documentsSubmitted: boolean
}

export type VendorComplianceStatus = 'complete' | 'pending'

export interface VendorPayableControl {
  projectId: string
  vendorId: string
  serviceId: string
  clientPaymentReceived: boolean
  vendorComplianceStatus: VendorComplianceStatus
  complianceChecks: VendorPayableComplianceChecks
}

/** Vendor payment (settlement record) */
export interface VendorPayment {
  id: string
  projectId: string
  projectName?: string
  vendorId: string
  vendorName: string
  paymentDate: string
  totalAmount: number
  linkedInvoiceIds: string[]
  linkedExpenseIds: string[]
  linkedReimbursementIds: string[]
  invoiceTotal: number
  expenseDeductions: number
  reimbursementAdditions: number
  tdsDeducted: number
  netPaid: number
  /** completed = full settle; partial = partial payment; not_paid = recorded as unpaid */
  status: 'completed' | 'partial' | 'not_paid'
  referenceNumber?: string
}

export type ExpenseType =
  | 'additional'
  | 'vendor_linked'
  | 'common'
  | 'office_expenses'
  | 'reimbursable_expenses'

export type CommonExpenseSplitMethod = 'proportional_po' | 'equal'

export interface Expense {
  id: string
  projectId: string
  projectName?: string
  /** Filled when expense is synced from Pitch planned expenses. */
  sourcePlannedExpenseId?: string
  type: ExpenseType
  description: string
  amount: number
  date: string
  documentUrl?: string
  vendorId?: string
  vendorName?: string
  serviceId?: string
  serviceName?: string
  milestoneId?: string
  milestoneName?: string
  /** How a common expense is split across build vendors. */
  splitMethod?: CommonExpenseSplitMethod
  /** Vendor who initially paid a common expense out of pocket. */
  paidByVendorId?: string
  paidByVendorName?: string
  vendorAllocations?: {
    vendorId: string
    vendorName: string
    allocationPercent: number
    allocationAmount: number
    /**
     * When false, this vendor's share is not recovered via payable deduction
     * and remains a project/common expense. Defaults to true when omitted.
     */
    includedInRecovery?: boolean
  }[]
  status: 'pending' | 'adjusted' | 'included_in_payment'
  linkedPaymentId?: string
  /** Set when expense is deducted on a vendor invoice upload. */
  linkedVendorInvoiceId?: string
  /** Set when a reimbursable expense auto-syncs to payables. */
  linkedReimbursementId?: string
}

export interface Reimbursement {
  id: string
  projectId: string
  projectName?: string
  vendorId: string
  vendorName: string
  serviceId: string
  serviceName: string
  milestoneId?: string
  milestoneName?: string
  description: string
  amount: number
  date: string
  documentUrl?: string
  status: 'pending' | 'included_in_payment'
  linkedPaymentId?: string
  /** Live expense that spawned this reimbursement (reimbursable sync). */
  sourceExpenseId?: string
  /** Pitch planned expense that spawned this reimbursement. */
  sourcePlannedExpenseId?: string
}

export interface ComplianceData {
  gstSummary: {
    collected: number
    paid: number
    netPayable: number
  }
  tdsSummary: {
    deducted: number
    deposited: number
    pending: number
  }
  monthlyTracker: Array<{
    month: string
    gstCollected: number
    gstPaid: number
    netGst: number
    tdsDeducted: number
    tdsDeposited: number
    status: 'filed' | 'pending' | 'overdue'
  }>
  pendingActions: string[]
}
