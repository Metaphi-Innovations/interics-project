import { createAsyncThunk } from '@reduxjs/toolkit'
import { settingsApi } from '../../api/settingsApi'
import { generalSettingsService } from '@/modules/system-settings/general-settings'
import { taxConfigurationService } from '@/modules/system-settings/tax/tax-configuration.service'
import { sacCodesService } from '@/modules/system-settings/sac/sac-codes.service'
import { categoriesService } from '@/modules/system-settings/category/category.service'
import { servicesService } from '@/modules/system-settings/service/services.service'
import { sectorsService } from '@/modules/system-settings/sector/sector.service'
import { ratingsService } from '@/modules/system-settings/rating/rating.service'
import { systemDefaultsService } from '@/modules/system-settings/system-defaults/system-defaults.service'
import { projectManagementService } from '@/modules/project-management'
import { toSettingsRejectPayload } from '@/modules/system-settings/shared/api-errors'
import type { RootState } from '@/store'
import type {
  CompanyProfile,
  GSTRate,
  TDSSection,
  SACCode,
  Category,
  Service,
  StatusMaster,
  SectorMaster,
  RatingMaster,
  ProjectManagementMasterCategory,
  NumberingSchemes,
  SystemDefaults,
} from './reducer'

function rejectSettings(err: unknown, fallback: string) {
  return toSettingsRejectPayload(err, fallback)
}

type FetchOpts = { force?: boolean } | undefined

type SacFetchOpts = { force?: boolean; search?: string } | undefined

type ServiceFetchOpts =
  | { force?: boolean; search?: string; categoryId?: string }
  | undefined

type MasterFetchOpts = { force?: boolean; search?: string } | undefined

function shouldFetchList(force: boolean | undefined, alreadyLoaded: boolean): boolean {
  return Boolean(force) || !alreadyLoaded
}

function shouldFetchFilteredList(
  force: boolean | undefined,
  hasFilter: boolean,
  alreadyLoaded: boolean,
): boolean {
  return Boolean(force) || hasFilter || !alreadyLoaded
}

export const fetchCompanyProfile = createAsyncThunk(
  'settings/fetchCompanyProfile',
  async (_: FetchOpts, { rejectWithValue }) => {
    try {
      return await generalSettingsService.get()
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch company profile'))
    }
  }
)

export const updateCompanyProfile = createAsyncThunk(
  'settings/updateCompanyProfile',
  async (data: Partial<CompanyProfile>, { rejectWithValue }) => {
    try {
      return await generalSettingsService.update(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update company profile'))
    }
  }
)

export const fetchGSTRates = createAsyncThunk(
  'settings/fetchGSTRates',
  async (_: FetchOpts, { rejectWithValue }) => {
    try {
      return await taxConfigurationService.getGstRates()
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch GST rates'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchList(arg?.force, (getState() as RootState).settings.gstRates.length > 0),
  },
)

export const createGSTRate = createAsyncThunk(
  'settings/createGSTRate',
  async (data: Omit<GSTRate, 'id'>, { rejectWithValue }) => {
    try {
      return await taxConfigurationService.createGstRate(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create GST rate'))
    }
  }
)

export const updateGSTRate = createAsyncThunk(
  'settings/updateGSTRate',
  async ({ id, ...data }: GSTRate, { rejectWithValue }) => {
    try {
      return await taxConfigurationService.updateGstRate(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update GST rate'))
    }
  }
)

export const toggleGSTRateStatus = createAsyncThunk(
  'settings/toggleGSTRateStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const current = (getState() as RootState).settings.gstRates.find((r) => r.id === id)
      return await taxConfigurationService.toggleGstRate(id, current?.status !== 'active')
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle GST rate status'))
    }
  }
)

export const fetchTDSSections = createAsyncThunk(
  'settings/fetchTDSSections',
  async (_: FetchOpts, { rejectWithValue }) => {
    try {
      return await taxConfigurationService.getTdsSections()
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch TDS sections'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchList(arg?.force, (getState() as RootState).settings.tdsSections.length > 0),
  },
)

export const createTDSSection = createAsyncThunk(
  'settings/createTDSSection',
  async (data: Omit<TDSSection, 'id'>, { rejectWithValue }) => {
    try {
      return await taxConfigurationService.createTdsSection(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create TDS section'))
    }
  }
)

export const updateTDSSection = createAsyncThunk(
  'settings/updateTDSSection',
  async ({ id, ...data }: TDSSection, { rejectWithValue }) => {
    try {
      return await taxConfigurationService.updateTdsSection(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update TDS section'))
    }
  }
)

export const toggleTDSSectionStatus = createAsyncThunk(
  'settings/toggleTDSSectionStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const current = (getState() as RootState).settings.tdsSections.find((r) => r.id === id)
      return await taxConfigurationService.toggleTdsSection(id, current?.status !== 'active')
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle TDS section status'))
    }
  }
)

export const fetchSACCodes = createAsyncThunk(
  'settings/fetchSACCodes',
  async (opts: SacFetchOpts, { rejectWithValue }) => {
    try {
      return await sacCodesService.getAll({ search: opts?.search })
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch SAC codes'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchFilteredList(
        arg?.force,
        Boolean(arg?.search?.trim()),
        (getState() as RootState).settings.sacCodes.length > 0,
      ),
  },
)

export const createSACCode = createAsyncThunk(
  'settings/createSACCode',
  async (data: Omit<SACCode, 'id'>, { rejectWithValue }) => {
    try {
      return await sacCodesService.create(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create SAC code'))
    }
  }
)

export const updateSACCode = createAsyncThunk(
  'settings/updateSACCode',
  async ({ id, ...data }: SACCode, { rejectWithValue }) => {
    try {
      return await sacCodesService.update(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update SAC code'))
    }
  }
)

export const toggleSACCodeStatus = createAsyncThunk(
  'settings/toggleSACCodeStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const current = (getState() as RootState).settings.sacCodes.find((r) => r.id === id)
      const nextStatus = current?.status === 'active' ? 'inactive' : 'active'
      return await sacCodesService.toggle(id, nextStatus)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle SAC code status'))
    }
  }
)

export const fetchCategories = createAsyncThunk(
  'settings/fetchCategories',
  async (_: FetchOpts, { rejectWithValue }) => {
    try {
      return await categoriesService.getAll()
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch categories'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchList(arg?.force, (getState() as RootState).settings.categories.length > 0),
  },
)

export const createCategory = createAsyncThunk(
  'settings/createCategory',
  async (data: Omit<Category, 'id' | 'servicesCount'>, { rejectWithValue }) => {
    try {
      return await categoriesService.create(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create category'))
    }
  }
)

export const updateCategory = createAsyncThunk(
  'settings/updateCategory',
  async ({ id, ...data }: Category, { rejectWithValue }) => {
    try {
      return await categoriesService.update(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update category'))
    }
  }
)

export const toggleCategoryStatus = createAsyncThunk(
  'settings/toggleCategoryStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const current = (getState() as RootState).settings.categories.find((r) => r.id === id)
      return await categoriesService.toggle(id, current?.status !== 'active')
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle category status'))
    }
  }
)

export const fetchServices = createAsyncThunk(
  'settings/fetchServices',
  async (opts: ServiceFetchOpts, { getState, rejectWithValue }) => {
    try {
      const { categories, sacCodes } = (getState() as RootState).settings
      let cats = categories
      let sacs = sacCodes
      if (!cats.length) cats = await categoriesService.getAll()
      if (!sacs.length) sacs = await sacCodesService.getAll()
      return await servicesService.getAll(cats, sacs, {
        search: opts?.search,
        categoryId: opts?.categoryId,
      })
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch services'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchFilteredList(
        arg?.force,
        Boolean(arg?.search?.trim() || arg?.categoryId),
        (getState() as RootState).settings.services.length > 0,
      ),
  },
)

export const createService = createAsyncThunk(
  'settings/createService',
  async (data: Omit<Service, 'id'>, { getState, rejectWithValue }) => {
    try {
      const { categories, sacCodes } = (getState() as RootState).settings
      return await servicesService.create(data, categories, sacCodes)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create service'))
    }
  }
)

export const updateService = createAsyncThunk(
  'settings/updateService',
  async ({ id, ...data }: Service, { getState, rejectWithValue }) => {
    try {
      const { categories, sacCodes } = (getState() as RootState).settings
      return await servicesService.update(id, data, categories, sacCodes)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update service'))
    }
  }
)

export const toggleServiceStatus = createAsyncThunk(
  'settings/toggleServiceStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState
      const current = state.settings.services.find((r) => r.id === id)
      return await servicesService.toggle(
        id,
        current?.status !== 'active',
        state.settings.categories,
        state.settings.sacCodes,
      )
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle service status'))
    }
  }
)

export const fetchStatuses = createAsyncThunk(
  'settings/fetchStatuses',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getStatuses()
      return res.data as StatusMaster[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch statuses')
    }
  }
)

export const createStatus = createAsyncThunk(
  'settings/createStatus',
  async (data: Omit<StatusMaster, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createStatus(data as Record<string, unknown>)
      return res.data as StatusMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create status')
    }
  }
)

export const updateStatus = createAsyncThunk(
  'settings/updateStatus',
  async ({ id, ...data }: StatusMaster, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateStatus(id, data as Record<string, unknown>)
      return res.data as StatusMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update status')
    }
  }
)

export const toggleStatusMaster = createAsyncThunk(
  'settings/toggleStatusMaster',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleStatusStatus(id)
      return res.data as StatusMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle status')
    }
  }
)

export const fetchSectors = createAsyncThunk(
  'settings/fetchSectors',
  async (opts: MasterFetchOpts, { rejectWithValue }) => {
    try {
      return await sectorsService.getAll({ search: opts?.search })
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch sectors'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchFilteredList(
        arg?.force,
        Boolean(arg?.search?.trim()),
        (getState() as RootState).settings.sectors.length > 0,
      ),
  },
)

export const createSector = createAsyncThunk(
  'settings/createSector',
  async (data: Omit<SectorMaster, 'id'>, { rejectWithValue }) => {
    try {
      return await sectorsService.create(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create sector'))
    }
  }
)

export const updateSector = createAsyncThunk(
  'settings/updateSector',
  async ({ id, ...data }: SectorMaster, { rejectWithValue }) => {
    try {
      return await sectorsService.update(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update sector'))
    }
  }
)

export const toggleSectorStatus = createAsyncThunk(
  'settings/toggleSectorStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const current = (getState() as RootState).settings.sectors.find((r) => r.id === id)
      return await sectorsService.toggle(id, current?.status !== 'active')
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle sector status'))
    }
  }
)

export const fetchRatings = createAsyncThunk(
  'settings/fetchRatings',
  async (opts: MasterFetchOpts, { rejectWithValue }) => {
    try {
      return await ratingsService.getAll({ search: opts?.search })
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch ratings'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchFilteredList(
        arg?.force,
        Boolean(arg?.search?.trim()),
        (getState() as RootState).settings.ratings.length > 0,
      ),
  },
)

export const createRating = createAsyncThunk(
  'settings/createRating',
  async (data: Omit<RatingMaster, 'id'>, { rejectWithValue }) => {
    try {
      return await ratingsService.create(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create rating'))
    }
  }
)

export const updateRating = createAsyncThunk(
  'settings/updateRating',
  async ({ id, ...data }: RatingMaster, { rejectWithValue }) => {
    try {
      return await ratingsService.update(id, data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update rating'))
    }
  }
)

export const toggleRatingStatus = createAsyncThunk(
  'settings/toggleRatingStatus',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const current = (getState() as RootState).settings.ratings.find((r) => r.id === id)
      return await ratingsService.toggle(id, current?.status !== 'active')
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to toggle rating status'))
    }
  }
)

export const fetchProjectManagementCategories = createAsyncThunk(
  'settings/fetchProjectManagementCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await projectManagementService.getAll()
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch project management categories'))
    }
  },
)

export const createProjectManagementCategory = createAsyncThunk(
  'settings/createProjectManagementCategory',
  async (
    data: Omit<ProjectManagementMasterCategory, 'id'>,
    { rejectWithValue },
  ) => {
    try {
      return await projectManagementService.create({
        name: data.name,
        checkpoints: data.checkpoints,
        status: data.status,
      })
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to create project management category'))
    }
  },
)

export const updateProjectManagementCategory = createAsyncThunk(
  'settings/updateProjectManagementCategory',
  async ({ id, ...data }: ProjectManagementMasterCategory, { rejectWithValue }) => {
    try {
      return await projectManagementService.update(id, {
        name: data.name,
        checkpoints: data.checkpoints,
        status: data.status,
      })
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update project management category'))
    }
  },
)

export const toggleProjectManagementCategoryStatus = createAsyncThunk(
  'settings/toggleProjectManagementCategoryStatus',
  async (
    { id, status }: { id: string; status: 'active' | 'inactive' },
    { rejectWithValue },
  ) => {
    try {
      return await projectManagementService.setStatus(id, status)
    } catch (err: unknown) {
      return rejectWithValue(
        rejectSettings(err, 'Failed to toggle project management category status'),
      )
    }
  },
)

export const fetchNumberingSchemes = createAsyncThunk(
  'settings/fetchNumberingSchemes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getNumberingSchemes()
      return res.data as NumberingSchemes
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch numbering schemes')
    }
  }
)

export const updateNumberingSchemes = createAsyncThunk(
  'settings/updateNumberingSchemes',
  async (data: NumberingSchemes, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateNumberingSchemes(data as unknown as Record<string, unknown>)
      return res.data as NumberingSchemes
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update numbering schemes')
    }
  }
)

export const fetchSystemDefaults = createAsyncThunk(
  'settings/fetchSystemDefaults',
  async (_: FetchOpts, { rejectWithValue }) => {
    try {
      return await systemDefaultsService.get()
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to fetch system defaults'))
    }
  },
  {
    condition: (arg, { getState }) =>
      shouldFetchList(arg?.force, (getState() as RootState).settings.systemDefaultsLoaded),
  },
)

export const updateSystemDefaults = createAsyncThunk(
  'settings/updateSystemDefaults',
  async (data: SystemDefaults, { rejectWithValue }) => {
    try {
      return await systemDefaultsService.update(data)
    } catch (err: unknown) {
      return rejectWithValue(rejectSettings(err, 'Failed to update system defaults'))
    }
  }
)
