import type { Contact } from '../slices/customers/reducer'
import type { Vendor } from '../slices/vendors/reducer'
import {
  legacyContactsFromEntity,
  getEntityContactsList,
  normalizeContacts,
  primaryFieldsFromPrimaryContact,
  type PrimaryContactFields,
} from './entityContacts'

export { normalizeContacts } from './entityContacts'

export function legacyContactsFromVendor(vendor: Vendor): Contact[] {
  return legacyContactsFromEntity(vendor)
}

export function getVendorContactsList(vendor: Vendor): Contact[] {
  return getEntityContactsList(vendor)
}

/** Primary for listing/overview (matches Customer pattern naming). */
export function getPrimaryContact(vendor: Vendor): Contact | undefined {
  const normalized = normalizeContacts(getVendorContactsList(vendor))
  return normalized.find((c) => c.isPrimary) ?? normalized[0]
}

export function primaryFieldsFromVendor(primary: Contact | undefined): Pick<
  Vendor,
  'contactPerson' | 'phone' | 'email' | 'designation'
> {
  const f: PrimaryContactFields = primaryFieldsFromPrimaryContact(primary)
  return {
    contactPerson: f.contactPerson,
    phone: f.phone,
    email: f.email,
    designation: f.designation,
  }
}
