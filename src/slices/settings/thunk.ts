import { createAsyncThunk } from '@reduxjs/toolkit'
import { settingsApi } from '../../api/settingsApi'
import type {
  CompanyProfile,
  GSTRate,
  TDSSection,
  SACCode,
  Category,
  Service,
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
