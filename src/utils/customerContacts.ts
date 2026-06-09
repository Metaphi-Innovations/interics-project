import type { Customer } from '../slices/customers/reducer'
import type { Contact } from '../slices/customers/reducer'
import {
  getEntityContactsList,
  legacyContactsFromEntity,
  normalizeContacts,
  primaryFieldsFromPrimaryContact,
  type PrimaryContactFields,
} from './entityContacts'

/** @deprecated Prefer legacyContactsFromEntity */
export function legacyContactsFromCustomer(customer: Customer) {
  return legacyContactsFromEntity(customer)
}

export function getCustomerContactsList(customer: Customer): Contact[] {
  return getEntityContactsList(customer)
}

export {
  normalizeContacts,
}

/** Maps primary contact slice fields to legacy Customer columns (preserve API for imports). */
export function primaryFieldsFromContact(
  primary: Contact | undefined,
): Pick<Customer, 'contactPerson' | 'phone' | 'email' | 'designation'> {
  const f = primaryFieldsFromPrimaryContact(primary)
  return {
    contactPerson: f.contactPerson,
    phone: f.phone,
    email: f.email,
    designation: f.designation,
  }
}

export type { PrimaryContactFields }

export function getPrimaryContact(customer: Customer): Contact | undefined {
  const normalized = normalizeContacts(getCustomerContactsList(customer))
  return normalized.find((c) => c.isPrimary) ?? normalized[0]
}

