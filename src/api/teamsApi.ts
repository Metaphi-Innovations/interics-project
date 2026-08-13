import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'

export const teamsApi = {
  async getMembers(params?: Record<string, unknown>) {
    const res = await client.get('/teams/members', { params })
    return unwrapApiData<{ items: unknown[]; meta: { page: number; limit: number; total: number } }>(res.data)
  },
  async getMemberDetail(userId: string) {
    const res = await client.get(`/teams/members/${userId}`)
    return unwrapApiData<{
      user: Record<string, unknown>
      assignments: Array<Record<string, unknown>>
    }>(res.data)
  },
}
