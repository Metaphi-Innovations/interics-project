import { describe, expect, it } from 'vitest'
import type { Contact } from '@/slices/customers/reducer'
import type { Vendor } from '@/slices/vendors/reducer'
import vendorsReducer from '@/slices/vendors/reducer'
import { fetchVendorById } from '@/slices/vendors/thunk'
import { toCreatePayload } from '@/modules/projects/projects.mapper'
import type { ProjectCreateFormInput } from '@/modules/projects/projects.types'
import {
  getVendorContactsForProjectCreate,
  vendorSelectionAfterChange,
} from './projectCreateHelpers'

const VENDOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const VENDOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CONTACT_A1 = '11111111-1111-4111-8111-111111111111'
const CONTACT_A2 = '22222222-2222-4222-8222-222222222222'
const CONTACT_B1 = '33333333-3333-4333-8333-333333333333'
const CUSTOMER_CONTACT = '99999999-9999-4999-8999-999999999999'

function contact(id: string, name: string, isPrimary = false): Contact {
  return {
    id,
    name,
    designation: '',
    phone: '9876543210',
    email: `${name.replace(/\s+/g, '').toLowerCase()}@example.com`,
    isPrimary,
  }
}

function listVendor(id: string, name: string): Vendor {
  return {
    id,
    name,
    gstin: null,
    pan: null,
    gstStatus: 'Unregistered',
    contactPerson: 'Legacy Person',
    phone: '9876543210',
    email: 'legacy@example.com',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: null,
    tags: [],
    notes: null,
    status: 'Active',
    rating: null,
    activeProjects: 0,
    totalPayables: 0,
    createdAt: new Date().toISOString(),
    // List rows intentionally omit contacts — Create Project must load detail.
  }
}

function detailVendor(id: string, name: string, contacts: Contact[]): Vendor {
  return {
    ...listVendor(id, name),
    contacts,
    contactPerson: contacts.find((c) => c.isPrimary)?.name ?? contacts[0]?.name ?? '',
  }
}

describe('Create Project vendor contacts dropdown source', () => {
  it('shows Vendor A contacts from detail contacts[], using VendorContact ids', () => {
    const vendorA = detailVendor(VENDOR_A, 'Vendor A', [
      contact(CONTACT_A1, 'Alice', true),
      contact(CONTACT_A2, 'Amy'),
    ])
    const options = getVendorContactsForProjectCreate(vendorA)
    expect(options.map((c) => ({ value: c.id, label: c.name }))).toEqual([
      { value: CONTACT_A1, label: 'Alice' },
      { value: CONTACT_A2, label: 'Amy' },
    ])
  })

  it('switches Vendor A → Vendor B: A contacts disappear, B contacts appear', () => {
    const vendorA = detailVendor(VENDOR_A, 'Vendor A', [contact(CONTACT_A1, 'Alice', true)])
    const vendorB = detailVendor(VENDOR_B, 'Vendor B', [contact(CONTACT_B1, 'Bob', true)])

    expect(getVendorContactsForProjectCreate(vendorA).map((c) => c.id)).toEqual([CONTACT_A1])
    expect(getVendorContactsForProjectCreate(vendorB).map((c) => c.id)).toEqual([CONTACT_B1])
    expect(getVendorContactsForProjectCreate(vendorB).map((c) => c.id)).not.toContain(CONTACT_A1)
  })

  it('clears prior vendor-contact selection when vendor changes and defaults to primary UUID', () => {
    const priorSelection = {
      vendorId: VENDOR_A,
      vendorContactIds: [CONTACT_A1],
    }
    const vendorBContacts = [contact(CONTACT_B1, 'Bob', true)]
    const next = vendorSelectionAfterChange(VENDOR_B, vendorBContacts)

    expect(next.vendorId).toBe(VENDOR_B)
    expect(next.vendorContactIds).toEqual([CONTACT_B1])
    expect(next.vendorContactIds).not.toEqual(priorSelection.vendorContactIds)
  })

  it('list-only vendor (no contacts[]) yields empty dropdown options', () => {
    expect(getVendorContactsForProjectCreate(listVendor(VENDOR_A, 'Vendor A'))).toEqual([])
  })

  it('excludes legacy-primary placeholders from dropdown options', () => {
    const vendor = detailVendor(VENDOR_A, 'Vendor A', [
      contact('legacy-primary', 'Legacy', true),
      contact(CONTACT_A1, 'Alice'),
    ])
    expect(getVendorContactsForProjectCreate(vendor).map((c) => c.id)).toEqual([CONTACT_A1])
  })

  it('stores selected contact as VendorContact id (not vendor id / customer contact id)', () => {
    const contacts = [contact(CONTACT_A1, 'Alice', true)]
    const selection = vendorSelectionAfterChange(VENDOR_A, contacts)
    expect(selection.vendorContactIds).toEqual([CONTACT_A1])
    expect(selection.vendorContactIds).not.toContain(VENDOR_A)
    expect(selection.vendorContactIds).not.toContain(CUSTOMER_CONTACT)
  })
})

describe('fetchVendorById merges contacts into vendors.items', () => {
  it('updates the list row so Create Project can render vendor contacts', () => {
    const initial = vendorsReducer(undefined, { type: '@@INIT' })
    const withList = {
      ...initial,
      items: [listVendor(VENDOR_A, 'Vendor A')],
    }
    const detail = detailVendor(VENDOR_A, 'Vendor A', [
      contact(CONTACT_A1, 'Alice', true),
      contact(CONTACT_A2, 'Amy'),
    ])

    const next = vendorsReducer(
      withList,
      fetchVendorById.fulfilled(detail, 'req', VENDOR_A),
    )

    expect(next.selectedItem?.id).toBe(VENDOR_A)
    expect(next.items[0].contacts?.map((c) => c.id)).toEqual([CONTACT_A1, CONTACT_A2])
    expect(getVendorContactsForProjectCreate(next.items[0]).map((c) => c.id)).toEqual([
      CONTACT_A1,
      CONTACT_A2,
    ])
  })
})

describe('toCreatePayload vendorContactIds', () => {
  const baseForm: ProjectCreateFormInput = {
    customerId: '11111111-1111-4111-8111-111111111111',
    name: 'Alpha Tower',
    contactIds: [CUSTOMER_CONTACT],
    projectTypes: ['Office'],
    sector: 'Office',
    projectManagerId: '44444444-4444-4444-8444-444444444444',
  }

  it('sends vendorId + vendorContactIds as actual UUIDs', () => {
    const selection = vendorSelectionAfterChange(VENDOR_A, [
      contact(CONTACT_A1, 'Alice', true),
    ])
    const payload = toCreatePayload({
      ...baseForm,
      vendorId: selection.vendorId,
      vendorContactIds: selection.vendorContactIds,
    })

    expect(payload.vendorId).toBe(VENDOR_A)
    expect(payload.vendorContactIds).toEqual([CONTACT_A1])
    expect(payload.contactIds).toEqual([CUSTOMER_CONTACT])
  })
})
