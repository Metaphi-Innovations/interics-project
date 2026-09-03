import {
  collectErrors,
  optionalEmail,
  optionalGstin,
  optionalMaxLength,
  optionalPan,
  optionalPhone,
  optionalPincode,
  optionalWebsite,
  requiredPhone,
  requiredText,
  type FieldErrorMap,
} from '@/modules/system-settings/shared/settings-validation'
import type { VendorFormInput, UiGstStatus } from './vendors.types'

export const VENDOR_IDENTITY_CONFLICT_MESSAGE =
  'A vendor with this name, city, and state already exists'

function gstinRequired(status: UiGstStatus): boolean {
  return status === 'Registered'
}

function requiredEmail(value: string | null | undefined): string | undefined {
  const v = (value ?? '').trim()
  if (!v) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address'
  return undefined
}

function normalizeIdentityValue(value: string): string {
  return value.trim().toLowerCase()
}

export type VendorIdentityCandidate = {
  id: string
  name: string
  city: string
  state: string
}

export type ValidateVendorFormOptions = {
  existingVendors?: VendorIdentityCandidate[]
  excludeId?: string
}

export function findVendorIdentityConflict(
  form: VendorFormInput,
  existingVendors: VendorIdentityCandidate[] = [],
  excludeId?: string,
): string | null {
  const candidate = {
    name: normalizeIdentityValue(form.name),
    city: normalizeIdentityValue(form.city || 'Unknown'),
    state: normalizeIdentityValue(form.state || 'Unknown'),
  }

  if (!candidate.name || !candidate.city || !candidate.state) {
    return null
  }

  const duplicate = existingVendors.find((vendor) => {
    if (excludeId && vendor.id === excludeId) return false
    return (
      normalizeIdentityValue(vendor.name) === candidate.name &&
      normalizeIdentityValue(vendor.city || 'Unknown') === candidate.city &&
      normalizeIdentityValue(vendor.state || 'Unknown') === candidate.state
    )
  })

  return duplicate ? VENDOR_IDENTITY_CONFLICT_MESSAGE : null
}

export function validateVendorForm(
  form: VendorFormInput,
  options: ValidateVendorFormOptions = {},
): FieldErrorMap {
  const isPendingProfile = form.profileStatus === 'pending'
  const hasContactInput = isPendingProfile || Boolean(
    form.contactPerson?.trim() || form.phone?.trim() || form.email?.trim(),
  )

  const errors = collectErrors([
    ['name', requiredText(form.name, 'Vendor Name', 255)],
    [
      'contactPerson',
      hasContactInput
        ? requiredText(form.contactPerson, 'Contact Person', 100)
        : optionalMaxLength(form.contactPerson, 'Contact Person', 100),
    ],
    ['phone', hasContactInput ? requiredPhone(form.phone) : optionalPhone(form.phone)],
    ['email', hasContactInput ? requiredEmail(form.email) : optionalEmail(form.email)],
    ['designation', optionalMaxLength(form.designation, 'Designation', 100)],
    ['website', optionalWebsite(form.website)],
    ['city', isPendingProfile ? optionalMaxLength(form.city, 'City', 100) : requiredText(form.city, 'City', 100)],
    ['state', isPendingProfile ? optionalMaxLength(form.state, 'State', 100) : requiredText(form.state, 'State', 100)],
    ['address', isPendingProfile ? optionalMaxLength(form.address, 'Address', 500) : requiredText(form.address, 'Address', 500)],
    ['pincode', isPendingProfile ? optionalPincode(form.pincode) : requiredText(form.pincode, 'Pincode', 6) || optionalPincode(form.pincode)],
    ['pan', optionalPan(form.pan)],
    ['bankAccountNumber', optionalMaxLength(form.bankAccountNumber, 'Account number', 34)],
    [
      'ifscCode',
      (() => {
        const v = (form.ifscCode ?? '').trim().toUpperCase()
        if (!v) return undefined
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return 'Enter a valid 11-character IFSC code'
        return undefined
      })(),
    ],
    ['bankBranchName', optionalMaxLength(form.bankBranchName, 'Bank / Branch name', 255)],
    ['notes', optionalMaxLength(form.notes, 'Notes', 5000)],
  ])

  if (!isPendingProfile && !form.gstStatus) {
    errors.gstStatus = 'GST Status is required'
  }

  if (!isPendingProfile && !form.tags?.some((tag) => tag.trim())) {
    errors.tags = 'At least one specialization tag is required'
  }

  if (gstinRequired(form.gstStatus)) {
    if (!form.gstin?.trim()) {
      errors.gstin = 'GSTIN is required for registered vendors'
    } else {
      const gstinError = optionalGstin(form.gstin)
      if (gstinError) errors.gstin = gstinError
    }
  } else if (form.gstin?.trim()) {
    const gstinError = optionalGstin(form.gstin)
    if (gstinError) errors.gstin = gstinError
  }

  if (!errors.name && !errors.city && !errors.state) {
    const identityError = findVendorIdentityConflict(
      form,
      options.existingVendors,
      options.excludeId,
    )
    if (identityError) {
      errors.name = identityError
    }
  }

  return errors
}
