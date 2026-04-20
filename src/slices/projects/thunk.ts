import { createAsyncThunk } from '@reduxjs/toolkit'
import { projectsApi } from '../../api/projectsApi'
import type { Project } from './reducer'

/** Coerce various list API shapes into what the projects slice expects. */
function normalizeProjectsListResponse(data: unknown): { items: Project[]; total: number } {
  if (data == null || typeof data !== 'object') {
    return { items: [], total: 0 }
  }
  if (Array.isArray(data)) {
    const items = data as Project[]
    return { items, total: items.length }
  }
  const d = data as Record<string, unknown>
  if (Array.isArray(d.items)) {
    const items = d.items as Project[]
    const total =
      typeof d.total === 'number' && Number.isFinite(d.total) ? d.total : items.length
    return { items, total }
  }
  if (Array.isArray(d.data)) {
    const items = d.data as Project[]
    const total =
      typeof d.total === 'number' && Number.isFinite(d.total) ? d.total : items.length
    return { items, total }
  }
  if (Array.isArray(d.results)) {
    const items = d.results as Project[]
    const total =
      typeof d.total === 'number' && Number.isFinite(d.total)
        ? d.total
        : typeof d.count === 'number'
          ? d.count
          : items.length
    return { items, total }
  }
  return { items: [], total: 0 }
}

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
      return normalizeProjectsListResponse(response.data)
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
      return response.data as Project
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
