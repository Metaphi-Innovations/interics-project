import { createAsyncThunk } from '@reduxjs/toolkit'
import { projectsApi } from '../../api/projectsApi'
import { getProjectAssignedMembers } from '@/utils/projectAssignedTeam'
import { normalizeListResponse } from '@/utils/normalizeListResponse'
import type { Project } from './reducer'

interface FetchProjectsParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  type?: string
  projectManager?: string
}

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (params: FetchProjectsParams = {}, { rejectWithValue }) => {
    try {
      const response = await projectsApi.getAll(
        params as Record<string, unknown>
      )
      const { items, total } = normalizeListResponse<Project>(response.data)
      return {
        items: items.map((project) => ({
          ...project,
          assignedTeam: getProjectAssignedMembers(project),
        })),
        total,
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch projects')
    }
  }
)

export const fetchProjectById = createAsyncThunk(
  'projects/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await projectsApi.getById(id)
      const project = response.data as Project
      return {
        ...project,
        assignedTeam: getProjectAssignedMembers(project),
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to fetch project')
    }
  }
)

export const createProject = createAsyncThunk(
  'projects/create',
  async (
    data: Omit<Project, 'id' | 'projectCode' | 'createdAt'>,
    { rejectWithValue }
  ) => {
    try {
      const response = await projectsApi.create(
        data as unknown as Record<string, unknown>
      )
      return response.data as Project
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to create project')
    }
  }
)

export const updateProject = createAsyncThunk(
  'projects/update',
  async (
    { id, data }: { id: string; data: Partial<Project> },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectsApi.update(
        id,
        data as Record<string, unknown>
      )
      return response.data as Project
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to update project')
    }
  }
)

export const changeProjectStatus = createAsyncThunk(
  'projects/changeStatus',
  async (
    { id, status }: { id: string; status: Project['status'] },
    { rejectWithValue }
  ) => {
    try {
      const response = await projectsApi.changeStatus(id, status)
      return response.data as Project
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(error.response?.data?.message ?? 'Failed to change project status')
    }
  }
)
