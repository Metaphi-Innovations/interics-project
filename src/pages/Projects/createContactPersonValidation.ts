import type { Contact } from '@/slices/customers/reducer'
import { isValidIndianMobileDigits, MOBILE_VALIDATION_MESSAGE } from '@/utils/mobile'
import { contactPhoneExists, normalizePhoneNumber } from './projectCreateHelpers'

export interface NewPersonFormFields {
  name: string
  phone: string
  email: string
  designation: string
}

export function validateAddNewPersonForm(
  form: NewPersonFormFields,
  peers: Contact[],
  existingVendorPhones: string[],
  isVendor: boolean,
): Partial<Record<keyof NewPersonFormFields, string>> {
  const errors: Partial<Record<keyof NewPersonFormFields, string>> = {}
  if (!form.name.trim()) errors.name = 'Contact person name is required.'

  const trimmedPhone = form.phone.trim()
  if (!trimmedPhone) {
    errors.phone = 'Mobile number is required.'
  } else if (!isValidIndianMobileDigits(trimmedPhone)) {
    errors.phone = MOBILE_VALIDATION_MESSAGE
  } else {
    const phoneTaken = contactPhoneExists(peers, trimmedPhone)
    if (isVendor) {
      const vendorPhoneTaken = existingVendorPhones.some(
        (p) => normalizePhoneNumber(p) === normalizePhoneNumber(trimmedPhone),
      )
      if (phoneTaken || vendorPhoneTaken) {
        errors.phone = 'A contact with this mobile number already exists.'
      }
    } else if (phoneTaken) {
      errors.phone =
        'A contact with this mobile number already exists for this customer.'
    }
  }

  const trimmedEmail = form.email.trim()
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.'
  }

  return errors
}
