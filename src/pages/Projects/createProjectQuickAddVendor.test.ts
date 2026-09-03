import { describe, expect, it } from 'vitest'
import { toCreatePayload } from '@/modules/vendors/vendors.mapper'
import type { VendorFormInput } from '@/modules/vendors/vendors.types'
import { toCreatePayload as toProjectCreatePayload } from '@/modules/projects/projects.mapper'
import type { ProjectCreateFormInput } from '@/modules/projects/projects.types'
import {
  MOBILE_VALIDATION_MESSAGE,
  isValidIndianMobileDigits,
} from '@/utils/mobile'
import { validateAddNewPersonForm } from './createContactPersonValidation'
import {
  getVendorContactsForProjectCreate,
  vendorSelectionAfterChange,
} from './projectCreateHelpers'
import type { Contact } from '@/slices/customers/reducer'

const baseVendorForm = (): VendorFormInput => ({
  name: 'Pending Vendor LLC',
  gstStatus: 'Unregistered',
  contactPerson: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  status: 'Active',
  profileStatus: 'pending',
})

describe('QuickAdd vendor create payload (Pending Contacts)', () => {
  it('maps Active status to isActive:true and marks the vendor profile as pending', () => {
    const payload = toCreatePayload(baseVendorForm())
    expect(payload.vendorName).toBe('Pending Vendor LLC')
    expect(payload.billingCity).toBe('Unknown')
    expect(payload.billingState).toBe('Unknown')
    expect(payload.isActive).toBe(true)
    expect(payload.profileStatus).toBe('pending')
  })

  it('does not force isActive when status is omitted (full VendorDrawer create)', () => {
    const form = baseVendorForm()
    delete form.status
    delete form.profileStatus
    const payload = toCreatePayload(form)
    expect(payload.isActive).toBeUndefined()
  })

  it('maps Inactive status to isActive:false', () => {
    const payload = toCreatePayload({ ...baseVendorForm(), status: 'Inactive' })
    expect(payload.isActive).toBe(false)
  })
})

describe('Create Project after QuickAdd vendor selection', () => {
  const vendorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const contactId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

  it('auto-selects vendor and stores real VendorContact id in project payload', () => {
    const contacts: Contact[] = [
      {
        id: contactId,
        name: 'Priya',
        designation: '',
        phone: '9876543210',
        email: 'priya@example.com',
        isPrimary: true,
      },
    ]
    const selection = vendorSelectionAfterChange(vendorId, contacts)
    expect(selection.vendorId).toBe(vendorId)
    expect(selection.vendorContactIds).toEqual([contactId])

    const projectForm: ProjectCreateFormInput = {
      customerId: '11111111-1111-4111-8111-111111111111',
      name: 'Site A',
      contactIds: ['22222222-2222-4222-8222-222222222222'],
      projectTypes: ['Office'],
      sector: 'Office',
      projectManagerId: '33333333-3333-4333-8333-333333333333',
      vendorId: selection.vendorId,
      vendorContactIds: selection.vendorContactIds,
    }
    const payload = toProjectCreatePayload(projectForm)
    expect(payload.vendorId).toBe(vendorId)
    expect(payload.vendorContactIds).toEqual([contactId])
  })

  it('loads only real VendorContact UUIDs for the selected vendor', () => {
    const options = getVendorContactsForProjectCreate({
      contacts: [
        {
          id: 'legacy-primary',
          name: 'Legacy',
          designation: '',
          phone: '9876543210',
          email: 'a@b.com',
          isPrimary: true,
        },
        {
          id: contactId,
          name: 'Real',
          designation: '',
          phone: '9876543211',
          email: 'r@b.com',
          isPrimary: false,
        },
      ],
    })
    expect(options.map((c) => c.id)).toEqual([contactId])
  })
})

describe('Add New Person contact validation', () => {
  it('rejects invalid customer mobile with the shared message', () => {
    expect(isValidIndianMobileDigits('987654321')).toBe(false)
    const errors = validateAddNewPersonForm(
      { name: 'Ada', phone: '987654321', email: '', designation: '' },
      [],
      [],
      false,
    )
    expect(errors.phone).toBe(MOBILE_VALIDATION_MESSAGE)
  })

  it('rejects invalid vendor mobile with the shared message', () => {
    const errors = validateAddNewPersonForm(
      { name: 'Ada', phone: 'abcdefghij', email: '', designation: '' },
      [],
      [],
      true,
    )
    expect(errors.phone).toBe(MOBILE_VALIDATION_MESSAGE)
  })

  it('rejects invalid email with a clear message', () => {
    const errors = validateAddNewPersonForm(
      { name: 'Ada', phone: '9876543210', email: 'not-an-email', designation: '' },
      [],
      [],
      false,
    )
    expect(errors.email).toBe('Please enter a valid email address.')
  })

  it('requires contact person name', () => {
    const errors = validateAddNewPersonForm(
      { name: '', phone: '9876543210', email: '', designation: '' },
      [],
      [],
      false,
    )
    expect(errors.name).toBe('Contact person name is required.')
  })
})
