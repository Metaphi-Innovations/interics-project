import {
  optionalEmail,
  optionalGstin,
  optionalMaxLength,
  optionalPan,
  optionalPhone,
  optionalPincode,
  requiredText,
  collectErrors,
  type FieldErrorMap,
} from '@/modules/system-settings/shared/settings-validation'
import type { CustomerFormInput, UiGstStatus } from './customers.types'

export const CUSTOMER_IDENTITY_CONFLICT_MESSAGE =
  'A customer with this name, sector, city, and state already exists'

function gstinRequired(status: UiGstStatus): boolean {
  return status !== 'Unregistered'
}

function normalizeIdentityValue(value: string): string {
  return value.trim().toLowerCase()
}

export type CustomerIdentityCandidate = {
  id: string
  name: string
  sector?: string | null
  city: string
  state: string
}

export type ValidateCustomerFormOptions = {
  existingCustomers?: CustomerIdentityCandidate[]
  excludeId?: string
}

export function findCustomerIdentityConflict(
  form: CustomerFormInput,
  existingCustomers: CustomerIdentityCandidate[] = [],
  excludeId?: string,
): string | null {
  const candidate = {
    name: normalizeIdentityValue(form.name),
    sector: normalizeIdentityValue(form.sector),
    city: normalizeIdentityValue(form.city),
    state: normalizeIdentityValue(form.state),
  }

  if (!candidate.name || !candidate.sector || !candidate.city || !candidate.state) {
    return null
  }

  const duplicate = existingCustomers.find((customer) => {
    if (excludeId && customer.id === excludeId) return false
    return (
      normalizeIdentityValue(customer.name) === candidate.name &&
      normalizeIdentityValue(customer.sector ?? '') === candidate.sector &&
      normalizeIdentityValue(customer.city) === candidate.city &&
      normalizeIdentityValue(customer.state) === candidate.state
    )
  })

  return duplicate ? CUSTOMER_IDENTITY_CONFLICT_MESSAGE : null
}

export function validateCustomerForm(
  form: CustomerFormInput,
  options: ValidateCustomerFormOptions = {},
): FieldErrorMap {
  const errors = collectErrors([
    ['name', requiredText(form.name, 'Customer Name', 255)],
    ['sector', requiredText(form.sector, 'Sector', 100)],
    ['contactPerson', optionalMaxLength(form.contactPerson, 'Contact Person', 100)],
    ['phone', optionalPhone(form.phone)],
    ['email', optionalEmail(form.email)],
    ['designation', optionalMaxLength(form.designation, 'Designation', 100)],
    ['pincode', optionalPincode(form.pincode)],
    ['city', optionalMaxLength(form.city, 'City', 100)],
    ['state', optionalMaxLength(form.state, 'State', 100)],
    ['address', optionalMaxLength(form.address, 'Address', 500)],
    ['pan', optionalPan(form.pan)],
    ['notes', optionalMaxLength(form.notes, 'Notes', 5000)],
  ])

  if (gstinRequired(form.gstStatus)) {
    if (!form.gstin.trim()) {
      errors.gstin = 'GSTIN is required for this GST status'
    } else {
      const gstinError = optionalGstin(form.gstin)
      if (gstinError) errors.gstin = gstinError
    }
  } else if (form.gstin.trim()) {
    const gstinError = optionalGstin(form.gstin)
    if (gstinError) errors.gstin = gstinError
  }

  if (!errors.name && !errors.sector && !errors.city && !errors.state) {
    const identityError = findCustomerIdentityConflict(
      form,
      options.existingCustomers,
      options.excludeId,
    )
    if (identityError) {
      errors.name = identityError
    }
  }

  return errors
}

export { gstinRequired }
