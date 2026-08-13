import type { CompanyProfile } from '@/slices/settings/reducer'

export type ApiCompanyType =
  | 'PROPRIETORSHIP'
  | 'PARTNERSHIP'
  | 'LLP'
  | 'PRIVATE_LIMITED'
  | 'PUBLIC_LIMITED'
  | 'GOVERNMENT'
  | 'OTHER'

export type FormCompanyType = CompanyProfile['companyType']

export type SystemSettingsFileMetadata = {
  id: string
  originalName: string
  mimeType: string
  size: number
  isEncrypted: boolean
  createdAt: string
}

export type SystemSettingsApi = {
  id: string
  organizationId: string
  companyName: string | null
  gstin: string | null
  pan: string | null
  companyType: ApiCompanyType | null
  email: string | null
  phone: string | null
  website: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  pincode: string | null
  companyLogo: SystemSettingsFileMetadata | null
  createdAt?: string
  updatedAt?: string
  createdById?: string | null
  updatedById?: string | null
}

export type UpdateSystemSettingsPayload = {
  companyName?: string
  gstin?: string
  pan?: string
  companyType?: ApiCompanyType
  email?: string
  phone?: string
  website?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  companyLogoFileId?: string | null
}
