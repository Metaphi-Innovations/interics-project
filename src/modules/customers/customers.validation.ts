import {
  optionalEmail,
  optionalGstin,
  optionalMaxLength,
  optionalPan,
  optionalPhone,
  requiredPhone,
  requiredPincode,
  requiredText,
  collectErrors,
  type FieldErrorMap,
} from '@/modules/system-settings/shared/settings-validation'
import type { CustomerFormInput, UiGstStatus } from './customers.types'

export const CUSTOMER_IDENTITY_CONFLICT_MESSAGE =
  'A customer with this name, sector, city, and state already exists'

function gstinRequired(status: UiGstStatus): boolean {
  return status === 'Registered'
}

function requiredEmail(value: string | null | undefined, label = 'Email'): string | undefined {
  const required = requiredText(value, label, 255)
  if (required) return required
  return optionalEmail(value)
}

function hasSecondaryContact(form: CustomerFormInput): boolean {
  return Boolean(
    form.secondaryContactPerson?.trim() ||
      form.secondaryDesignation?.trim() ||
      form.secondaryPhone?.trim() ||
      form.secondaryEmail?.trim(),
  )
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
    ['gstStatus', requiredText(form.gstStatus, 'GST Status')],
    ['contactPerson', requiredText(form.contactPerson, 'Contact Person', 100)],
    ['phone', requiredPhone(form.phone)],
    ['email', requiredEmail(form.email)],
    ['designation', optionalMaxLength(form.designation, 'Designation', 100)],
    ['pincode', requiredPincode(form.pincode)],
    ['city', requiredText(form.city, 'City', 100)],
    ['state', requiredText(form.state, 'State', 100)],
    ['address', requiredText(form.address, 'Address', 500)],
    ['pan', optionalPan(form.pan)],
    ['notes', optionalMaxLength(form.notes, 'Notes', 5000)],
  ])

  if (hasSecondaryContact(form)) {
    const secondaryPhone = form.secondaryPhone ?? ''
    const secondaryEmail = form.secondaryEmail ?? ''
    const secondaryContactPerson = form.secondaryContactPerson ?? ''
    const secondaryContactError = requiredText(
      secondaryContactPerson,
      'Secondary Contact Person',
      100,
    )
    const secondaryPhoneError = requiredPhone(secondaryPhone)
    const secondaryEmailError = requiredEmail(secondaryEmail, 'Secondary Email')
    if (secondaryContactError) errors.secondaryContactPerson = secondaryContactError
    if (secondaryPhoneError) errors.secondaryPhone = secondaryPhoneError
    if (secondaryEmailError) errors.secondaryEmail = secondaryEmailError
    const secondaryDesignationError = optionalMaxLength(
      form.secondaryDesignation,
      'Secondary Designation',
      100,
    )
    if (secondaryDesignationError) errors.secondaryDesignation = secondaryDesignationError
  } else {
    const secondaryPhoneError = optionalPhone(form.secondaryPhone)
    const secondaryEmailError = optionalEmail(form.secondaryEmail)
    if (secondaryPhoneError) errors.secondaryPhone = secondaryPhoneError
    if (secondaryEmailError) errors.secondaryEmail = secondaryEmailError
  }

  if (gstinRequired(form.gstStatus)) {
    if (!form.gstin.trim()) {
      errors.gstin = 'GSTIN is required for registered customers'
    } else {
      const gstinError = optionalGstin(form.gstin)
      if (gstinError) errors.gstin = gstinError
    }
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
