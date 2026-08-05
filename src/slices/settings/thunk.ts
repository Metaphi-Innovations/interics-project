import { createAsyncThunk } from '@reduxjs/toolkit'
import { settingsApi } from '../../api/settingsApi'
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

export const fetchCompanyProfile = createAsyncThunk(
  'settings/fetchCompanyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getCompanyProfile()
      return res.data as CompanyProfile
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch company profile')
    }
  }
)

export const updateCompanyProfile = createAsyncThunk(
  'settings/updateCompanyProfile',
  async (data: Partial<CompanyProfile>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateCompanyProfile(data as Record<string, unknown>)
      return res.data as CompanyProfile
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update company profile')
    }
  }
)

export const fetchGSTRates = createAsyncThunk(
  'settings/fetchGSTRates',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getGSTRates()
      return res.data as GSTRate[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch GST rates')
    }
  }
)

export const createGSTRate = createAsyncThunk(
  'settings/createGSTRate',
  async (data: Omit<GSTRate, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createGSTRate(data as Record<string, unknown>)
      return res.data as GSTRate
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create GST rate')
    }
  }
)

export const updateGSTRate = createAsyncThunk(
  'settings/updateGSTRate',
  async ({ id, ...data }: GSTRate, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateGSTRate(id, data as Record<string, unknown>)
      return res.data as GSTRate
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update GST rate')
    }
  }
)

export const toggleGSTRateStatus = createAsyncThunk(
  'settings/toggleGSTRateStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleGSTRateStatus(id)
      return res.data as GSTRate
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle GST rate status')
    }
  }
)

export const fetchTDSSections = createAsyncThunk(
  'settings/fetchTDSSections',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getTDSSections()
      return res.data as TDSSection[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch TDS sections')
    }
  }
)

export const createTDSSection = createAsyncThunk(
  'settings/createTDSSection',
  async (data: Omit<TDSSection, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createTDSSection(data as Record<string, unknown>)
      return res.data as TDSSection
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create TDS section')
    }
  }
)

export const updateTDSSection = createAsyncThunk(
  'settings/updateTDSSection',
  async ({ id, ...data }: TDSSection, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateTDSSection(id, data as Record<string, unknown>)
      return res.data as TDSSection
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update TDS section')
    }
  }
)

export const toggleTDSSectionStatus = createAsyncThunk(
  'settings/toggleTDSSectionStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleTDSSectionStatus(id)
      return res.data as TDSSection
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle TDS section status')
    }
  }
)

export const fetchSACCodes = createAsyncThunk(
  'settings/fetchSACCodes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getSACCodes()
      return res.data as SACCode[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch SAC codes')
    }
  }
)

export const createSACCode = createAsyncThunk(
  'settings/createSACCode',
  async (data: Omit<SACCode, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createSACCode(data as Record<string, unknown>)
      return res.data as SACCode
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create SAC code')
    }
  }
)

export const updateSACCode = createAsyncThunk(
  'settings/updateSACCode',
  async ({ id, ...data }: SACCode, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateSACCode(id, data as Record<string, unknown>)
      return res.data as SACCode
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update SAC code')
    }
  }
)

export const toggleSACCodeStatus = createAsyncThunk(
  'settings/toggleSACCodeStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleSACCodeStatus(id)
      return res.data as SACCode
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle SAC code status')
    }
  }
)

export const fetchCategories = createAsyncThunk(
  'settings/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getCategories()
      return res.data as Category[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch categories')
    }
  }
)

export const createCategory = createAsyncThunk(
  'settings/createCategory',
  async (data: Omit<Category, 'id' | 'servicesCount'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createCategory(data as Record<string, unknown>)
      return res.data as Category
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create category')
    }
  }
)

export const updateCategory = createAsyncThunk(
  'settings/updateCategory',
  async ({ id, ...data }: Category, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateCategory(id, data as Record<string, unknown>)
      return res.data as Category
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update category')
    }
  }
)

export const toggleCategoryStatus = createAsyncThunk(
  'settings/toggleCategoryStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleCategoryStatus(id)
      return res.data as Category
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle category status')
    }
  }
)

export const fetchServices = createAsyncThunk(
  'settings/fetchServices',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getServices()
      return res.data as Service[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch services')
    }
  }
)

export const createService = createAsyncThunk(
  'settings/createService',
  async (data: Omit<Service, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createService(data as Record<string, unknown>)
      return res.data as Service
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create service')
    }
  }
)

export const updateService = createAsyncThunk(
  'settings/updateService',
  async ({ id, ...data }: Service, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateService(id, data as Record<string, unknown>)
      return res.data as Service
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update service')
    }
  }
)

export const toggleServiceStatus = createAsyncThunk(
  'settings/toggleServiceStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleServiceStatus(id)
      return res.data as Service
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle service status')
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
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getSectors()
      return res.data as SectorMaster[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch sectors')
    }
  }
)

export const createSector = createAsyncThunk(
  'settings/createSector',
  async (data: Omit<SectorMaster, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createSector(data as Record<string, unknown>)
      return res.data as SectorMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create sector')
    }
  }
)

export const updateSector = createAsyncThunk(
  'settings/updateSector',
  async ({ id, ...data }: SectorMaster, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateSector(id, data as Record<string, unknown>)
      return res.data as SectorMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update sector')
    }
  }
)

export const toggleSectorStatus = createAsyncThunk(
  'settings/toggleSectorStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleSectorStatus(id)
      return res.data as SectorMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle sector status')
    }
  }
)

export const fetchRatings = createAsyncThunk(
  'settings/fetchRatings',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getRatings()
      return res.data as RatingMaster[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch ratings')
    }
  }
)

export const createRating = createAsyncThunk(
  'settings/createRating',
  async (data: Omit<RatingMaster, 'id'>, { rejectWithValue }) => {
    try {
      const res = await settingsApi.createRating(data as Record<string, unknown>)
      return res.data as RatingMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to create rating')
    }
  }
)

export const updateRating = createAsyncThunk(
  'settings/updateRating',
  async ({ id, ...data }: RatingMaster, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateRating(id, data as Record<string, unknown>)
      return res.data as RatingMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update rating')
    }
  }
)

export const toggleRatingStatus = createAsyncThunk(
  'settings/toggleRatingStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleRatingStatus(id)
      return res.data as RatingMaster
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to toggle rating status')
    }
  }
)

export const fetchProjectManagementCategories = createAsyncThunk(
  'settings/fetchProjectManagementCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getProjectManagementCategories()
      return res.data as ProjectManagementMasterCategory[]
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        e.response?.data?.message ?? 'Failed to fetch project management categories',
      )
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
      const res = await settingsApi.createProjectManagementCategory(
        data as unknown as Record<string, unknown>,
      )
      return res.data as ProjectManagementMasterCategory
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        e.response?.data?.message ?? 'Failed to create project management category',
      )
    }
  },
)

export const updateProjectManagementCategory = createAsyncThunk(
  'settings/updateProjectManagementCategory',
  async ({ id, ...data }: ProjectManagementMasterCategory, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateProjectManagementCategory(
        id,
        data as unknown as Record<string, unknown>,
      )
      return res.data as ProjectManagementMasterCategory
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        e.response?.data?.message ?? 'Failed to update project management category',
      )
    }
  },
)

export const toggleProjectManagementCategoryStatus = createAsyncThunk(
  'settings/toggleProjectManagementCategoryStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await settingsApi.toggleProjectManagementCategoryStatus(id)
      return res.data as ProjectManagementMasterCategory
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(
        e.response?.data?.message ?? 'Failed to toggle project management category status',
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
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsApi.getSystemDefaults()
      return res.data as SystemDefaults
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to fetch system defaults')
    }
  }
)

export const updateSystemDefaults = createAsyncThunk(
  'settings/updateSystemDefaults',
  async (data: SystemDefaults, { rejectWithValue }) => {
    try {
      const res = await settingsApi.updateSystemDefaults(data as unknown as Record<string, unknown>)
      return res.data as SystemDefaults
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      return rejectWithValue(e.response?.data?.message ?? 'Failed to update system defaults')
    }
  }
)
