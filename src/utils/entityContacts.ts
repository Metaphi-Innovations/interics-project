import type { Contact } from '../slices/customers/reducer'

/** Minimal shape for legacy top-level contact fields */
export interface EntityWithLegacyContact {
  contactPerson: string
  designation?: string | null
  phone: string
  email: string
  contacts?: Contact[]
}

/** Build contacts from legacy top-level entity fields when `contacts[]` is empty */
export function legacyContactsFromEntity(entity: EntityWithLegacyContact): Contact[] {
  if (!entity.contactPerson && !entity.phone && !entity.email) return []
  return [
    {
      id: 'legacy-primary',
      name: entity.contactPerson,
      designation: entity.designation ?? '',
      phone: entity.phone,
      email: entity.email,
      isPrimary: true,
    },
  ]
}

export function getEntityContactsList(entity: EntityWithLegacyContact): Contact[] {
  if (entity.contacts?.length) return entity.contacts
  return legacyContactsFromEntity(entity)
}

/** Ensure exactly one primary contact (first contact if none marked). */
export function normalizeContacts(contacts: Contact[]): Contact[] {
  if (!contacts.length) return []
  const primaryIndex = contacts.findIndex((c) => c.isPrimary)
  const index = primaryIndex >= 0 ? primaryIndex : 0
  return contacts.map((contact, i) => ({
    ...contact,
    isPrimary: i === index,
  }))
}

/** Primary for listing/overview; normalized first-if-none */
export function getPrimaryContactFromEntity(entity: EntityWithLegacyContact): Contact | undefined {
  const normalized = normalizeContacts(getEntityContactsList(entity))
  return normalized.find((c) => c.isPrimary) ?? normalized[0]
}

export interface PrimaryContactFields {
  contactPerson: string
  phone: string
  email: string
  designation: string | null
}

export function primaryFieldsFromPrimaryContact(
  primary: Contact | undefined,
): PrimaryContactFields {
  return {
    contactPerson: primary?.name ?? '',
    phone: primary?.phone ?? '',
    email: primary?.email ?? '',
    designation: primary?.designation ?? null,
  }
}
