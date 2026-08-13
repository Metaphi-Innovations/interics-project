import client from '@/api/client'
import {
  toCompanyProfile,
  toUpdateSystemSettingsPayload,
  unwrapSystemSettingsResponse,
} from './general-settings.mapper'
import { withInflight } from '../shared/inflight'
import type { CompanyProfile } from '@/slices/settings/reducer'

export const generalSettingsService = {
  async get(): Promise<CompanyProfile> {
    return withInflight('system-settings:get', async () => {
      const response = await client.get('/system-settings')
      const settings = unwrapSystemSettingsResponse(response.data)
      return toCompanyProfile(settings)
    })
  },

  async update(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const response = await client.put(
      '/system-settings',
      toUpdateSystemSettingsPayload(data),
    )
    const settings = unwrapSystemSettingsResponse(response.data)
    return toCompanyProfile(settings)
  },
}
