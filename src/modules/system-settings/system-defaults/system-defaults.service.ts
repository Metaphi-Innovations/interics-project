import client from '@/api/client'
import { unwrapApiData } from '../shared/api'
import { withInflight } from '../shared/inflight'
import type { SystemDefaults } from '@/slices/settings/reducer'

type SystemDefaultsApi = {
  currency: string
  financialYearStart: string
  defaultTaxRegime: string
  defaultProjectType: string
  defaultPagination: number
  dateFormat: string
  autoArchiveCompletedProjects: string
}

const BASE = '/system-settings/system-defaults'

const FY_TO_API: Record<SystemDefaults['financialYearStart'], string> = {
  april: 'APRIL',
  january: 'JANUARY',
}

const FY_TO_UI: Record<string, SystemDefaults['financialYearStart']> = {
  APRIL: 'april',
  JANUARY: 'january',
}

const TAX_TO_API: Record<SystemDefaults['defaultTaxRegime'], string> = {
  gst: 'GST',
  non_gst: 'GST',
}

const TAX_TO_UI: Record<string, SystemDefaults['defaultTaxRegime']> = {
  GST: 'gst',
}

const PROJECT_TO_API: Record<SystemDefaults['defaultProjectType'], string> = {
  design: 'DESIGN',
  design_and_build: 'DESIGN_AND_BUILD',
}

const PROJECT_TO_UI: Record<string, SystemDefaults['defaultProjectType']> = {
  DESIGN: 'design',
  DESIGN_AND_BUILD: 'design_and_build',
  BUILD: 'design_and_build',
}

const ARCHIVE_TO_API: Record<SystemDefaults['autoArchiveDays'], string> = {
  0: 'NEVER',
  30: '30_DAYS',
  60: '60_DAYS',
  90: '90_DAYS',
}

const ARCHIVE_TO_UI: Record<string, SystemDefaults['autoArchiveDays']> = {
  NEVER: 0,
  '30_DAYS': 30,
  '60_DAYS': 60,
  '90_DAYS': 90,
  '180_DAYS': 90,
}

function toUi(api: SystemDefaultsApi): SystemDefaults {
  const pagination = Number(api.defaultPagination)
  const defaultPaginationSize = ([10, 25, 50, 100].includes(pagination)
    ? pagination
    : 25) as SystemDefaults['defaultPaginationSize']

  return {
    currency: 'INR',
    financialYearStart: FY_TO_UI[api.financialYearStart] ?? 'april',
    defaultTaxRegime: TAX_TO_UI[api.defaultTaxRegime] ?? 'gst',
    defaultProjectType: PROJECT_TO_UI[api.defaultProjectType] ?? 'design_and_build',
    defaultPaginationSize,
    dateFormat: (['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(api.dateFormat)
      ? api.dateFormat
      : 'DD/MM/YYYY') as SystemDefaults['dateFormat'],
    autoArchiveDays: ARCHIVE_TO_UI[api.autoArchiveCompletedProjects] ?? 0,
  }
}

function toPayload(data: SystemDefaults): SystemDefaultsApi {
  return {
    currency: data.currency,
    financialYearStart: FY_TO_API[data.financialYearStart],
    defaultTaxRegime: TAX_TO_API[data.defaultTaxRegime],
    defaultProjectType: PROJECT_TO_API[data.defaultProjectType],
    defaultPagination: data.defaultPaginationSize,
    dateFormat: data.dateFormat,
    autoArchiveCompletedProjects: ARCHIVE_TO_API[data.autoArchiveDays],
  }
}

export const systemDefaultsService = {
  async get(): Promise<SystemDefaults> {
    return withInflight('system-defaults:get', async () => {
      const res = await client.get(BASE)
      return toUi(unwrapApiData<SystemDefaultsApi>(res.data))
    })
  },

  async update(data: SystemDefaults): Promise<SystemDefaults> {
    const res = await client.put(BASE, toPayload(data))
    return toUi(unwrapApiData<SystemDefaultsApi>(res.data))
  },
}
