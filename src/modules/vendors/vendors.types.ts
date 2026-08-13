import type { Vendor } from '@/slices/vendors/reducer'
import type { ActivityEntry, Contact } from '@/slices/customers/reducer'

export type UiGstStatus = Vendor['gstStatus']
export type ApiGstStatus = 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ'

export type VendorListItemApi = {
  id: string
  initials?: string
  vendorName?: string
  contactPerson?: string
  designation?: string | null
  contactPersonLabel?: string
  phone?: string
  email?: string
  website?: string | null
  location?: string
  city?: string
  state?: string
  billingCity?: string
  billingState?: string
  specialization?: string
  complianceStatus?: string
  gstStatus?: string
  isActive?: boolean
  statusLabel?: string
  createdAt?: string
}

export type VendorDocumentRefApi = {
  fileId?: string
  fileName?: string
  viewUrl?: string
  downloadUrl?: string
}

export type VendorDetailSectionsApi = {
  id: string
  overview?: {
    vendorProfile?: {
      vendorCode?: string
      vendorName?: string
      gstStatus?: string
      gstin?: string | null
      panNumber?: string | null
      status?: string
    }
    billingAddress?: {
      address?: string | null
      city?: string
      state?: string
      pincode?: string | null
      fullAddress?: string
    }
    shippingAddress?: {
      address?: string | null
      city?: string | null
      state?: string | null
      pincode?: string | null
      fullAddress?: string
    }
    specialization?: { tags?: string[] }
    notes?: string | null
    catalogue?: VendorDocumentRefApi | null
    primaryContact?: {
      id?: string
      name?: string
      designation?: string | null
      phone?: string
      email?: string
    }
    procurementSummary?: {
      website?: string | null
      linkedProjects?: number
    }
  }
  documentsAndTax?: {
    gstStatus?: string
    gstin?: string | null
    panNumber?: string | null
    gstCertificate?: VendorDocumentRefApi | null
    panCard?: VendorDocumentRefApi | null
    cancelledCheque?: VendorDocumentRefApi | null
    insuranceDocument?: VendorDocumentRefApi | null
    insuranceExpiryDate?: string | null
    isExpired?: boolean
    expiresWithin30Days?: boolean
  }
  contacts?: {
    items?: Array<{
      id: string
      name: string
      designation?: string | null
      phone: string
      email: string
      isPrimary?: boolean
      contactType?: string
    }>
    primaryContact?: {
      id?: string
      name?: string
      designation?: string | null
      phone?: string
      email?: string
    }
  }
  activity?: {
    type?: string
    items?: Array<{
      id: string
      type: string
      title: string
      description: string
      performedBy?: { id: string; name: string }
      createdAt: string
    }>
    total?: number
  }
}

export type VendorFiltersApi = {
  status?: Array<{ value: boolean; label: string }>
  gstStatuses?: Array<{ value: string; label: string }>
  states?: Array<{ value: string; label: string }>
  complianceStatuses?: Array<{ value: string; label: string }>
}

export type VendorListParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  gstStatus?: string
  state?: string
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type VendorListResult = {
  items: Vendor[]
  total: number
  page: number
  pageSize: number
}

/** UI/drawer write shape — keeps Vendor page types, maps to API in service. */
export type VendorFormInput = {
  name: string
  website?: string | null
  gstStatus: UiGstStatus
  gstin?: string | null
  pan?: string | null
  contactPerson: string
  designation?: string | null
  phone: string
  email: string
  address?: string | null
  city: string
  state: string
  pincode?: string | null
  shippingAddress?: string | null
  shippingCity?: string | null
  shippingState?: string | null
  shippingPincode?: string | null
  tags?: string[]
  notes?: string | null
  paymentTerms?: string | null
  status?: Vendor['status']
  rating?: string | null
  contacts?: Contact[]
  gstCertificateFile?: File | null
  panCardFile?: File | null
  cancelledChequeFile?: File | null
  insuranceDocumentFile?: File | null
  catalogueFile?: File | null
  insuranceExpiryDate?: string | null
  removeDocuments?: Array<
    'GST_CERTIFICATE' | 'PAN_CARD' | 'CANCELLED_CHEQUE' | 'INSURANCE_DOCUMENT' | 'CATALOGUE'
  >
}

export type VendorDocumentFiles = {
  gstCertificate?: File
  panCard?: File
  cancelledCheque?: File
  insuranceDocument?: File
  catalogue?: File
}

export type VendorActivityApiSection = {
  type: string
  items: NonNullable<VendorDetailSectionsApi['activity']>['items']
  total: number
}

export type { Vendor, Contact, ActivityEntry }
