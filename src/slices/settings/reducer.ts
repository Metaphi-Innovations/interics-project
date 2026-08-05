import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import {
  fetchCompanyProfile,
  updateCompanyProfile,
  fetchGSTRates,
  createGSTRate,
  updateGSTRate,
  toggleGSTRateStatus,
  fetchTDSSections,
  createTDSSection,
  updateTDSSection,
  toggleTDSSectionStatus,
  fetchSACCodes,
  createSACCode,
  updateSACCode,
  toggleSACCodeStatus,
  fetchCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  fetchServices,
  createService,
  updateService,
  toggleServiceStatus,
  fetchStatuses,
  createStatus,
  updateStatus,
  toggleStatusMaster,
  fetchSectors,
  createSector,
  updateSector,
  toggleSectorStatus,
  fetchRatings,
  createRating,
  updateRating,
  toggleRatingStatus,
  fetchProjectManagementCategories,
  createProjectManagementCategory,
  updateProjectManagementCategory,
  toggleProjectManagementCategoryStatus,
  fetchNumberingSchemes,
  updateNumberingSchemes,
  fetchSystemDefaults,
  updateSystemDefaults,
} from './thunk'

export interface GSTRate {
  id: string
  slabName: string
  rate: number
  description: string
  status: 'active' | 'inactive'
}

export interface TDSSection {
  id: string
  section: string
  description: string
  defaultRate: number
  appliesTo: 'vendors' | 'clients' | 'both'
  status: 'active' | 'inactive'
}

export interface SACCode {
  id: string
  code: string
  description: string
  gstRateId: string
  gstRate?: number
  status: 'active' | 'inactive'
}

export interface Category {
  id: string
  name: string
  description: string
  servicesCount: number
  status: 'active' | 'inactive'
}

export interface Service {
  id: string
  name: string
  categoryId: string
  sacCodeId: string | null
  gstRate: number
  allowGSTOverride: boolean
  allowVendorMapping: boolean
  tags: string[]
  status: 'active' | 'inactive'
}

export interface StatusMaster {
  id: string
  name: string
  status: 'active' | 'inactive'
}

export interface SectorMaster {
  id: string
  name: string
  status: 'active' | 'inactive'
}

export interface RatingMaster {
  id: string
  name: string
  status: 'active' | 'inactive'
}

export interface ProjectManagementCheckpoint {
  id: string
  name: string
}

export interface ProjectManagementMasterCategory {
  id: string
  name: string
  checkpoints: ProjectManagementCheckpoint[]
  status: 'active' | 'inactive'
}

export interface CompanyProfile {
  companyName: string
  gstin: string
  pan: string
  companyType: 'pvt_ltd' | 'llp' | 'proprietorship' | 'partnership'
  email: string
  phone: string
  website: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  logoUrl: string | null
}

export interface NumberingSchemes {
  projectPrefix: string
  projectFormat: 'PRJ-YY-###' | 'PRJ-YYYY-###' | 'PRJ-###'
  invoicePrefix: string
  invoiceFormat: 'INV-YYYY-###' | 'INV-YY-###'
  clientPOPrefix: string
  vendorPOPrefix: string
  expensePrefix: string
}

export interface SystemDefaults {
  currency: 'INR'
  financialYearStart: 'april' | 'january'
  defaultTaxRegime: 'gst' | 'non_gst'
  defaultProjectType: 'design' | 'design_and_build'
  defaultPaginationSize: 10 | 25 | 50 | 100
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  autoArchiveDays: 0 | 30 | 60 | 90
}

interface SettingsState {
  companyProfile: CompanyProfile
  numberingSchemes: NumberingSchemes
  systemDefaults: SystemDefaults
  gstRates: GSTRate[]
  tdsSections: TDSSection[]
  sacCodes: SACCode[]
  categories: Category[]
  services: Service[]
  statuses: StatusMaster[]
  sectors: SectorMaster[]
  ratings: RatingMaster[]
  projectManagementCategories: ProjectManagementMasterCategory[]
  loading: boolean
  saving: boolean
}

const initialState: SettingsState = {
  companyProfile: {
    companyName: '',
    gstin: '',
    pan: '',
    companyType: 'pvt_ltd',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    logoUrl: null,
  },
  numberingSchemes: {
    projectPrefix: 'PRJ',
    projectFormat: 'PRJ-YY-###',
    invoicePrefix: 'INV',
    invoiceFormat: 'INV-YYYY-###',
    clientPOPrefix: 'PO-CLI',
    vendorPOPrefix: 'PO-VND',
    expensePrefix: 'EXP',
  },
  systemDefaults: {
    currency: 'INR',
    financialYearStart: 'april',
    defaultTaxRegime: 'gst',
    defaultProjectType: 'design_and_build',
    defaultPaginationSize: 25,
    dateFormat: 'DD/MM/YYYY',
    autoArchiveDays: 0,
  },
  gstRates: [],
  tdsSections: [],
  sacCodes: [],
  categories: [],
  services: [],
  statuses: [],
  sectors: [],
  ratings: [],
  projectManagementCategories: [],
  loading: false,
  saving: false,
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Company Profile
    builder
      .addCase(fetchCompanyProfile.pending, (state) => { state.loading = true })
      .addCase(fetchCompanyProfile.fulfilled, (state, action: PayloadAction<CompanyProfile>) => {
        state.loading = false
        state.companyProfile = action.payload
      })
      .addCase(fetchCompanyProfile.rejected, (state) => { state.loading = false })
      .addCase(updateCompanyProfile.pending, (state) => { state.saving = true })
      .addCase(updateCompanyProfile.fulfilled, (state, action: PayloadAction<CompanyProfile>) => {
        state.saving = false
        state.companyProfile = action.payload
      })
      .addCase(updateCompanyProfile.rejected, (state) => { state.saving = false })

    // GST Rates
    builder
      .addCase(fetchGSTRates.pending, (state) => { state.loading = true })
      .addCase(fetchGSTRates.fulfilled, (state, action: PayloadAction<GSTRate[]>) => {
        state.loading = false
        state.gstRates = action.payload
      })
      .addCase(fetchGSTRates.rejected, (state) => { state.loading = false })
      .addCase(createGSTRate.pending, (state) => { state.saving = true })
      .addCase(createGSTRate.fulfilled, (state, action: PayloadAction<GSTRate>) => {
        state.saving = false
        state.gstRates.push(action.payload)
      })
      .addCase(createGSTRate.rejected, (state) => { state.saving = false })
      .addCase(updateGSTRate.pending, (state) => { state.saving = true })
      .addCase(updateGSTRate.fulfilled, (state, action: PayloadAction<GSTRate>) => {
        state.saving = false
        const idx = state.gstRates.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.gstRates[idx] = action.payload
      })
      .addCase(updateGSTRate.rejected, (state) => { state.saving = false })
      .addCase(toggleGSTRateStatus.fulfilled, (state, action: PayloadAction<GSTRate>) => {
        const idx = state.gstRates.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.gstRates[idx] = action.payload
      })

    // TDS Sections
    builder
      .addCase(fetchTDSSections.pending, (state) => { state.loading = true })
      .addCase(fetchTDSSections.fulfilled, (state, action: PayloadAction<TDSSection[]>) => {
        state.loading = false
        state.tdsSections = action.payload
      })
      .addCase(fetchTDSSections.rejected, (state) => { state.loading = false })
      .addCase(createTDSSection.pending, (state) => { state.saving = true })
      .addCase(createTDSSection.fulfilled, (state, action: PayloadAction<TDSSection>) => {
        state.saving = false
        state.tdsSections.push(action.payload)
      })
      .addCase(createTDSSection.rejected, (state) => { state.saving = false })
      .addCase(updateTDSSection.pending, (state) => { state.saving = true })
      .addCase(updateTDSSection.fulfilled, (state, action: PayloadAction<TDSSection>) => {
        state.saving = false
        const idx = state.tdsSections.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.tdsSections[idx] = action.payload
      })
      .addCase(updateTDSSection.rejected, (state) => { state.saving = false })
      .addCase(toggleTDSSectionStatus.fulfilled, (state, action: PayloadAction<TDSSection>) => {
        const idx = state.tdsSections.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.tdsSections[idx] = action.payload
      })

    // SAC Codes
    builder
      .addCase(fetchSACCodes.pending, (state) => { state.loading = true })
      .addCase(fetchSACCodes.fulfilled, (state, action: PayloadAction<SACCode[]>) => {
        state.loading = false
        state.sacCodes = action.payload
      })
      .addCase(fetchSACCodes.rejected, (state) => { state.loading = false })
      .addCase(createSACCode.pending, (state) => { state.saving = true })
      .addCase(createSACCode.fulfilled, (state, action: PayloadAction<SACCode>) => {
        state.saving = false
        state.sacCodes.push(action.payload)
      })
      .addCase(createSACCode.rejected, (state) => { state.saving = false })
      .addCase(updateSACCode.pending, (state) => { state.saving = true })
      .addCase(updateSACCode.fulfilled, (state, action: PayloadAction<SACCode>) => {
        state.saving = false
        const idx = state.sacCodes.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.sacCodes[idx] = action.payload
      })
      .addCase(updateSACCode.rejected, (state) => { state.saving = false })
      .addCase(toggleSACCodeStatus.fulfilled, (state, action: PayloadAction<SACCode>) => {
        const idx = state.sacCodes.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.sacCodes[idx] = action.payload
      })

    // Categories
    builder
      .addCase(fetchCategories.pending, (state) => { state.loading = true })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.loading = false
        state.categories = action.payload
      })
      .addCase(fetchCategories.rejected, (state) => { state.loading = false })
      .addCase(createCategory.pending, (state) => { state.saving = true })
      .addCase(createCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.saving = false
        state.categories.push(action.payload)
      })
      .addCase(createCategory.rejected, (state) => { state.saving = false })
      .addCase(updateCategory.pending, (state) => { state.saving = true })
      .addCase(updateCategory.fulfilled, (state, action: PayloadAction<Category>) => {
        state.saving = false
        const idx = state.categories.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.categories[idx] = action.payload
      })
      .addCase(updateCategory.rejected, (state) => { state.saving = false })
      .addCase(toggleCategoryStatus.fulfilled, (state, action: PayloadAction<Category>) => {
        const idx = state.categories.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.categories[idx] = action.payload
      })

    // Services
    builder
      .addCase(fetchServices.pending, (state) => { state.loading = true })
      .addCase(fetchServices.fulfilled, (state, action: PayloadAction<Service[]>) => {
        state.loading = false
        state.services = action.payload
      })
      .addCase(fetchServices.rejected, (state) => { state.loading = false })
      .addCase(createService.pending, (state) => { state.saving = true })
      .addCase(createService.fulfilled, (state, action: PayloadAction<Service>) => {
        state.saving = false
        state.services.push(action.payload)
      })
      .addCase(createService.rejected, (state) => { state.saving = false })
      .addCase(updateService.pending, (state) => { state.saving = true })
      .addCase(updateService.fulfilled, (state, action: PayloadAction<Service>) => {
        state.saving = false
        const idx = state.services.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.services[idx] = action.payload
      })
      .addCase(updateService.rejected, (state) => { state.saving = false })
      .addCase(toggleServiceStatus.fulfilled, (state, action: PayloadAction<Service>) => {
        const idx = state.services.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.services[idx] = action.payload
      })

    // Status Master
    builder
      .addCase(fetchStatuses.pending, (state) => { state.loading = true })
      .addCase(fetchStatuses.fulfilled, (state, action: PayloadAction<StatusMaster[]>) => {
        state.loading = false
        state.statuses = action.payload
      })
      .addCase(fetchStatuses.rejected, (state) => { state.loading = false })
      .addCase(createStatus.pending, (state) => { state.saving = true })
      .addCase(createStatus.fulfilled, (state, action: PayloadAction<StatusMaster>) => {
        state.saving = false
        state.statuses.push(action.payload)
      })
      .addCase(createStatus.rejected, (state) => { state.saving = false })
      .addCase(updateStatus.pending, (state) => { state.saving = true })
      .addCase(updateStatus.fulfilled, (state, action: PayloadAction<StatusMaster>) => {
        state.saving = false
        const idx = state.statuses.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.statuses[idx] = action.payload
      })
      .addCase(updateStatus.rejected, (state) => { state.saving = false })
      .addCase(toggleStatusMaster.fulfilled, (state, action: PayloadAction<StatusMaster>) => {
        const idx = state.statuses.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.statuses[idx] = action.payload
      })

    // Sector Master
    builder
      .addCase(fetchSectors.pending, (state) => { state.loading = true })
      .addCase(fetchSectors.fulfilled, (state, action: PayloadAction<SectorMaster[]>) => {
        state.loading = false
        state.sectors = action.payload
      })
      .addCase(fetchSectors.rejected, (state) => { state.loading = false })
      .addCase(createSector.pending, (state) => { state.saving = true })
      .addCase(createSector.fulfilled, (state, action: PayloadAction<SectorMaster>) => {
        state.saving = false
        state.sectors.push(action.payload)
      })
      .addCase(createSector.rejected, (state) => { state.saving = false })
      .addCase(updateSector.pending, (state) => { state.saving = true })
      .addCase(updateSector.fulfilled, (state, action: PayloadAction<SectorMaster>) => {
        state.saving = false
        const idx = state.sectors.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.sectors[idx] = action.payload
      })
      .addCase(updateSector.rejected, (state) => { state.saving = false })
      .addCase(toggleSectorStatus.fulfilled, (state, action: PayloadAction<SectorMaster>) => {
        const idx = state.sectors.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.sectors[idx] = action.payload
      })

    // Rating Master
    builder
      .addCase(fetchRatings.pending, (state) => { state.loading = true })
      .addCase(fetchRatings.fulfilled, (state, action: PayloadAction<RatingMaster[]>) => {
        state.loading = false
        state.ratings = action.payload
      })
      .addCase(fetchRatings.rejected, (state) => { state.loading = false })
      .addCase(createRating.pending, (state) => { state.saving = true })
      .addCase(createRating.fulfilled, (state, action: PayloadAction<RatingMaster>) => {
        state.saving = false
        state.ratings.push(action.payload)
      })
      .addCase(createRating.rejected, (state) => { state.saving = false })
      .addCase(updateRating.pending, (state) => { state.saving = true })
      .addCase(updateRating.fulfilled, (state, action: PayloadAction<RatingMaster>) => {
        state.saving = false
        const idx = state.ratings.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.ratings[idx] = action.payload
      })
      .addCase(updateRating.rejected, (state) => { state.saving = false })
      .addCase(toggleRatingStatus.fulfilled, (state, action: PayloadAction<RatingMaster>) => {
        const idx = state.ratings.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.ratings[idx] = action.payload
      })

    // Project Management Master
    builder
      .addCase(fetchProjectManagementCategories.pending, (state) => { state.loading = true })
      .addCase(
        fetchProjectManagementCategories.fulfilled,
        (state, action: PayloadAction<ProjectManagementMasterCategory[]>) => {
          state.loading = false
          state.projectManagementCategories = action.payload
        },
      )
      .addCase(fetchProjectManagementCategories.rejected, (state) => { state.loading = false })
      .addCase(createProjectManagementCategory.pending, (state) => { state.saving = true })
      .addCase(
        createProjectManagementCategory.fulfilled,
        (state, action: PayloadAction<ProjectManagementMasterCategory>) => {
          state.saving = false
          state.projectManagementCategories.push(action.payload)
        },
      )
      .addCase(createProjectManagementCategory.rejected, (state) => { state.saving = false })
      .addCase(updateProjectManagementCategory.pending, (state) => { state.saving = true })
      .addCase(
        updateProjectManagementCategory.fulfilled,
        (state, action: PayloadAction<ProjectManagementMasterCategory>) => {
          state.saving = false
          const idx = state.projectManagementCategories.findIndex(r => r.id === action.payload.id)
          if (idx !== -1) state.projectManagementCategories[idx] = action.payload
        },
      )
      .addCase(updateProjectManagementCategory.rejected, (state) => { state.saving = false })
      .addCase(
        toggleProjectManagementCategoryStatus.fulfilled,
        (state, action: PayloadAction<ProjectManagementMasterCategory>) => {
          const idx = state.projectManagementCategories.findIndex(r => r.id === action.payload.id)
          if (idx !== -1) state.projectManagementCategories[idx] = action.payload
        },
      )

    // Numbering Schemes
    builder
      .addCase(fetchNumberingSchemes.pending, (state) => { state.loading = true })
      .addCase(fetchNumberingSchemes.fulfilled, (state, action: PayloadAction<NumberingSchemes>) => {
        state.loading = false
        state.numberingSchemes = action.payload
      })
      .addCase(fetchNumberingSchemes.rejected, (state) => { state.loading = false })
      .addCase(updateNumberingSchemes.pending, (state) => { state.saving = true })
      .addCase(updateNumberingSchemes.fulfilled, (state, action: PayloadAction<NumberingSchemes>) => {
        state.saving = false
        state.numberingSchemes = action.payload
      })
      .addCase(updateNumberingSchemes.rejected, (state) => { state.saving = false })

    // System Defaults
    builder
      .addCase(fetchSystemDefaults.pending, (state) => { state.loading = true })
      .addCase(fetchSystemDefaults.fulfilled, (state, action: PayloadAction<SystemDefaults>) => {
        state.loading = false
        state.systemDefaults = action.payload
      })
      .addCase(fetchSystemDefaults.rejected, (state) => { state.loading = false })
      .addCase(updateSystemDefaults.pending, (state) => { state.saving = true })
      .addCase(updateSystemDefaults.fulfilled, (state, action: PayloadAction<SystemDefaults>) => {
        state.saving = false
        state.systemDefaults = action.payload
      })
      .addCase(updateSystemDefaults.rejected, (state) => { state.saving = false })
  },
})

export default settingsSlice.reducer
