import type { Customer, Contact } from '@/slices/customers/reducer'

export type UiGstStatus = Customer['gstStatus']
export type UiStatus = Customer['status']

export type ApiGstStatus = 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ'

export type CustomerListItemApi = {
  id: string
  customerName?: string
  initials?: string
  contactPerson?: string
  designation?: string | null
  contactPersonLabel?: string
  phone?: string
  email?: string
  sector?: string
  sectorLabel?: string
  projectCount?: number
  outstandingAmount?: number
  gstStatus?: string
  isActive?: boolean
  statusLabel?: string
  city?: string
  state?: string
  createdAt?: string
  compliance?: string
}

export type CustomerDetailApi = {
  id: string
  customerName: string
  sector: string
  sectorLabel?: string
  gstStatus: string
  gstin: string | null
  panNumber: string | null
  contactPerson: string
  designation: string | null
  phone: string
  email: string
  address: string | null
  city: string
  state: string
  pincode: string | null
  tags: string[]
  notes: string | null
  isActive: boolean
  createdAt: string
  gstCertificateFile?: {
    id?: string
    originalName?: string
    url?: string
    viewUrl?: string
  } | null
  panDocumentFile?: {
    id?: string
    originalName?: string
    url?: string
    viewUrl?: string
  } | null
}

export type CustomerDocumentRefApi = {
  fileId?: string
  fileName?: string
  originalName?: string
  url?: string
  viewUrl?: string
  downloadUrl?: string
}

export type CustomerDetailSectionsApi = {
  id: string
  overview?: {
    /** Backend shape */
    customerProfile?: {
      customerName?: string
      sector?: string
      sectorLabel?: string
      gstStatus?: string
      gstin?: string | null
      panNumber?: string | null
      status?: string
    }
    addressAndLocation?: {
      address?: string | null
      city?: string
      state?: string
      pincode?: string | null
      fullAddress?: string
    }
    tagsAndNotes?: {
      tags?: string[]
      notes?: string | null
    }
    primaryContact?: {
      id?: string
      name?: string
      designation?: string | null
      phone?: string
      email?: string
    }
    projectSummary?: {
      activeProjects?: number
      outstandingAmount?: number
    }
    /** Legacy / alternate shape */
    profile?: {
      customerName?: string
      sector?: string
      sectorLabel?: string
      isActive?: boolean
      gstStatus?: string
      tags?: string[]
      notes?: string | null
    }
    address?: {
      address?: string | null
      city?: string
      state?: string
      pincode?: string | null
    }
  }
  documentsAndTax?: {
    gstRegistration?: {
      status?: string
      gstStatus?: string
      gstin?: string | null
      document?: CustomerDocumentRefApi | null
      certificateFile?: { originalName?: string; url?: string } | null
    }
    panIncomeTax?: {
      panNumber?: string | null
      document?: CustomerDocumentRefApi | null
      documentFile?: { originalName?: string; url?: string } | null
    }
  }
  contacts?: {
    items?: Array<{
      id: string
      name: string
      designation?: string | null
      phone: string
      email: string
      isPrimary?: boolean
    }>
    primaryContact?: {
      id?: string
      name?: string
      designation?: string | null
      phone?: string
      email?: string
    }
  }
}

export type CustomerFiltersApi = {
  status: Array<{ value: boolean; label: string }>
  gstStatuses: Array<{ value: string; label: string }>
  states: Array<{ value: string; label: string }>
  customerName?: Array<{ value: string; label: string }>
  contactPerson?: Array<{ value: string; label: string }>
  sector?: Array<{ value: string; label: string }>
}

export type CustomerListParams = {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  gstStatus?: string
  state?: string
  sector?: string
  customerName?: string
  contactPerson?: string
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type CustomerListResult = {
  items: Customer[]
  total: number
  page: number
  pageSize: number
}

export type CustomerFormInput = {
  name: string
  sector: string
  gstStatus: UiGstStatus
  gstin: string
  pan: string
  contactPerson: string
  designation: string
  phone: string
  email: string
  city: string
  state: string
  address: string
  pincode: string
  tags: string[]
  notes: string
  gstCertificateFile?: File | null
  panDocumentFile?: File | null
}

export type CustomerDocumentFiles = {
  gstCertificate?: File
  panDocument?: File
}

export type CreateCustomerContactPayload = {
  name: string
  designation?: string
  phone: string
  email: string
  contactType: 'PRIMARY' | 'ACCOUNTS' | 'BILLING' | 'PROJECT' | 'TECHNICAL' | 'LEGAL' | 'OTHER'
  isPrimary?: boolean
}

export type { Customer, Contact }
