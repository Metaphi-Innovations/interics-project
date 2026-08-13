/** @deprecated Use `@/modules/vendors` `vendorsService` instead. */
import { vendorsService } from '@/modules/vendors'
import type { VendorFormInput } from '@/modules/vendors'
import type { Contact } from '@/slices/customers/reducer'
import type { Vendor } from '@/slices/vendors/reducer'

export const vendorsApi = {
  getAll: (params?: Record<string, unknown>) =>
    vendorsService.getAll({
      page: typeof params?.page === 'number' ? params.page : undefined,
      limit:
        typeof params?.limit === 'number'
          ? params.limit
          : typeof params?.pageSize === 'number'
            ? params.pageSize
            : undefined,
      search: typeof params?.search === 'string' ? params.search : undefined,
      isActive:
        params?.status === 'Active'
          ? true
          : params?.status === 'Inactive'
            ? false
            : typeof params?.isActive === 'boolean'
              ? params.isActive
              : undefined,
      gstStatus: typeof params?.gstStatus === 'string' ? params.gstStatus : undefined,
      state: typeof params?.state === 'string' ? params.state : undefined,
    }).then((result) => ({
      data: { items: result.items, total: result.total, pagination: { page: result.page, limit: result.pageSize, total: result.total } },
    })),

  getById: (id: string) => vendorsService.getById(id).then((data) => ({ data })),

  create: (data: Record<string, unknown>) =>
    vendorsService.create(data as unknown as VendorFormInput).then((v) => ({ data: v })),

  update: (id: string, data: Record<string, unknown>) =>
    vendorsService.updatePartial(id, data as Partial<Vendor>).then((v) => ({ data: v })),

  delete: (id: string) => vendorsService.remove(id).then(() => ({ data: null })),

  createContact: (vendorId: string, data: Record<string, unknown>) =>
    vendorsService
      .createContact(vendorId, data as unknown as Omit<Contact, 'id'>)
      .then((contact) => ({ data: contact })),

  updateContact: (vendorId: string, contactId: string, data: Record<string, unknown>) =>
    vendorsService
      .updateContact(vendorId, contactId, data as Partial<Omit<Contact, 'id'>>)
      .then((contact) => ({ data: contact })),
}
