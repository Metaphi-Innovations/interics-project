import { createAsyncThunk } from '@reduxjs/toolkit'
import { projectsService } from '@/modules/projects'
import { toSettingsRejectPayload } from '@/modules/system-settings/shared/api-errors'
import { PROJECT_FIELD_ALIASES } from '@/modules/projects'
import type { ProjectCreateFormInput } from '@/modules/projects'
import type { Project } from './reducer'

function rejectProject(err: unknown, fallback: string) {
  return toSettingsRejectPayload(err, fallback, PROJECT_FIELD_ALIASES)
}

interface FetchProjectsParams {
  page?: number
  pageSize?: number
  limit?: number
  search?: string
  status?: string
  type?: string
  projectManager?: string
  projectLeadId?: string
}

function isCreateFormInput(data: unknown): data is ProjectCreateFormInput {
  return (
    data != null &&
    typeof data === 'object' &&
    'customerId' in data &&
    'name' in data &&
    'projectManagerId' in data &&
    Array.isArray((data as { contactIds?: unknown }).contactIds)
  )
}

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (params: FetchProjectsParams = {}, { rejectWithValue }) => {
    try {
      return await projectsService.getAll({
        page: params.page,
        limit: params.limit ?? params.pageSize,
        search: params.search,
        status: params.status,
        projectLeadId: params.projectLeadId ?? params.projectManager,
      })
    } catch (err: unknown) {
      return rejectWithValue(rejectProject(err, 'Failed to fetch projects'))
    }
  },
)

export const fetchProjectById = createAsyncThunk(
  'projects/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await projectsService.getById(id)
    } catch (err: unknown) {
      return rejectWithValue(rejectProject(err, 'Failed to fetch project'))
    }
  },
)

export const createProject = createAsyncThunk(
  'projects/create',
  async (
    data: Omit<Project, 'id' | 'projectCode' | 'createdAt'> | ProjectCreateFormInput,
    { rejectWithValue },
  ) => {
    try {
      if (!isCreateFormInput(data)) {
        return rejectWithValue({
          message: 'Invalid project create payload',
          fieldErrors: {},
        })
      }
      return await projectsService.create(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectProject(err, 'Failed to create project'))
    }
  },
)

export const updateProject = createAsyncThunk(
  'projects/update',
  async (
    { id, data }: { id: string; data: Partial<Project> & { contactIds?: string[] } },
    { rejectWithValue },
  ) => {
    try {
      return await projectsService.update(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectProject(err, 'Failed to update project'))
    }
  },
)

export const changeProjectStatus = createAsyncThunk(
  'projects/changeStatus',
  async (
    { id, status }: { id: string; status: Project['status'] },
    { rejectWithValue },
  ) => {
    try {
      if (status === 'Live') {
        return await projectsService.markLive(id)
      }
      // Backend currently supports Pitch -> Live only.
      return await projectsService.getById(id)
    } catch (err: unknown) {
      return rejectWithValue(rejectProject(err, 'Failed to change project status'))
    }
  },
)
