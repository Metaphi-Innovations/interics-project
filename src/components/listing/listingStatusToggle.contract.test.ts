import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isPendingVendor } from '@/utils/vendorProfileStatus'
import type { Vendor } from '@/slices/vendors/reducer'

const customersPage = fs.readFileSync(
  path.resolve(__dirname, '../../pages/Customers/CustomersPage.tsx'),
  'utf8',
)
const vendorsPage = fs.readFileSync(
  path.resolve(__dirname, '../../pages/Vendors/VendorsPage.tsx'),
  'utf8',
)

function vendorStub(partial: Partial<Vendor>): Vendor {
  return partial as Vendor
}

describe('Customers listing STATUS toggle', () => {
  it('renders StatusColumnToggle in a Status column (not Settings power icon)', () => {
    expect(customersPage).toContain('StatusColumnToggle')
    expect(customersPage).toContain('>Status</TableCell>')
    expect(customersPage).not.toContain('SettingsToggleAction')
    expect(customersPage).toContain('setCustomerActive')
  })

  it('Action column uses RowActions only (no Active/Inactive power control)', () => {
    expect(customersPage).toMatch(
      /CUSTOMER_STATUS_CELL_SX[\s\S]*?StatusColumnToggle[\s\S]*?RowActions/,
    )
    expect(customersPage).not.toContain('from \'@/pages/Settings/components/SettingsTableActions\'')
  })
})

describe('Vendors listing STATUS toggle', () => {
  it('renders StatusColumnToggle in a Status column (not Settings power icon)', () => {
    expect(vendorsPage).toContain('StatusColumnToggle')
    expect(vendorsPage).toContain('>Status</TableCell>')
    expect(vendorsPage).not.toContain('SettingsToggleAction')
    expect(vendorsPage).toContain('setVendorActive')
  })

  it('Status column hosts the toggle; Action hosts RowActions only', () => {
    expect(vendorsPage).toMatch(/TABLE_CELL_STATUS_SX[\s\S]*?StatusColumnToggle/)
    expect(vendorsPage).toMatch(/TABLE_CELL_ACTION_SX[\s\S]*?RowActions/)
    expect(vendorsPage).not.toContain("from '@/pages/Settings/components/SettingsTableActions'")
  })
})

describe('Vendor profileStatus independence from isActive toggle', () => {
  it('PENDING remains pending regardless of Active/Inactive', () => {
    expect(isPendingVendor(vendorStub({ profileStatus: 'pending', status: 'Active' }))).toBe(true)
    expect(isPendingVendor(vendorStub({ profileStatus: 'pending', status: 'Inactive' }))).toBe(true)
    expect(isPendingVendor(vendorStub({ profileStatus: 'complete', status: 'Active' }))).toBe(false)
    expect(isPendingVendor(vendorStub({ profileStatus: 'complete', status: 'Inactive' }))).toBe(false)
  })
})
