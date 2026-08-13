import { createAsyncThunk } from '@reduxjs/toolkit'
import { projectsService } from '@/modules/projects'
import { toSettingsRejectPayload } from '@/modules/system-settings/shared/api-errors'
import { PROJECT_FIELD_ALIASES } from '@/modules/projects'
import type { ProjectCreateFormInput, ProjectFiltersApi } from '@/modules/projects'
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
  projectName?: string
  projectType?: string
  expectedStartDate?: string
  expectedEndDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
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
    const reqSeq = Date.now()
    // #region agent log
    fetch('http://127.0.0.1:7520/ingest/820d80bd-911d-41c2-805b-1434b6b6fe3d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'df06a2'},body:JSON.stringify({sessionId:'df06a2',runId:'post-fix',hypothesisId:'B',location:'thunk.ts:fetchProjects',message:'fetchProjects start',data:{reqSeq,status:params.status,page:params.page,limit:params.limit??params.pageSize,search:params.search},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      const result = await projectsService.getAll({
        page: params.page,
        limit: params.limit ?? params.pageSize,
        search: params.search,
        status: params.status,
        projectLeadId: params.projectLeadId ?? params.projectManager,
        projectName: params.projectName,
        projectType: params.projectType ?? params.type,
        expectedStartDate: params.expectedStartDate,
        expectedEndDate: params.expectedEndDate,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      })
      const targetId = 'a7b37aca-bfba-454e-80c5-241c43ad2f19'
      // #region agent log
      fetch('http://127.0.0.1:7520/ingest/820d80bd-911d-41c2-805b-1434b6b6fe3d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'df06a2'},body:JSON.stringify({sessionId:'df06a2',runId:'post-fix',hypothesisId:'B',location:'thunk.ts:fetchProjects:result',message:'fetchProjects result',data:{reqSeq,status:params.status,total:result.total,count:result.items.length,targetInResult:result.items.some((p)=>p.id===targetId||p.name.includes('1786442761297')),ids:result.items.map((p)=>p.id),names:result.items.map((p)=>p.name),statuses:result.items.map((p)=>p.status)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return result
    } catch (err: unknown) {
      return rejectWithValue(rejectProject(err, 'Failed to fetch projects'))
    }
  },
)

export const fetchProjectFilters = createAsyncThunk<
  ProjectFiltersApi,
  void,
  { rejectValue: ReturnType<typeof rejectProject> }
>('projects/fetchFilters', async (_, { rejectWithValue }) => {
  try {
    return await projectsService.getFilters()
  } catch (err: unknown) {
    return rejectWithValue(rejectProject(err, 'Failed to fetch project filters'))
  }
})

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
