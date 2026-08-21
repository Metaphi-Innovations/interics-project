import client from './client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'

export const teamsApi = {
  async getMembers(params?: Record<string, unknown>) {
    const res = await client.get('/teams/members', { params })
    return unwrapApiData<{ items: unknown[]; meta: { page: number; limit: number; total: number } }>(res.data)
  },
  async getSummary() {
    const res = await client.get('/teams/summary')
    return unwrapApiData<{ assignments: number; teamMembers: number; projectsWithTeam: number }>(res.data)
  },
  async getFilters() {
    const res = await client.get('/teams/filters')
    return unwrapApiData<{
      teamMember: { value: string; label: string }[]
      roles: { value: string; label: string }[]
      projectCount: { value: string; label: string }[]
      projects: { value: string; label: string }[]
      statuses: { value: string; label: string }[]
    }>(res.data)
  },
  async getMemberDetail(userId: string) {
    const res = await client.get(`/teams/members/${userId}`)
    return unwrapApiData<{
      user: Record<string, unknown>
      assignments: Array<Record<string, unknown>>
    }>(res.data)
  },
}
