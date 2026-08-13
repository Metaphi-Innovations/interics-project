import client from '@/api/client'
import { unwrapApiData } from '@/modules/system-settings/shared/api'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import type { PayableSummaryKpis } from '@/pages/Finance/utils/payableSummary'

export type PayablesSummaryApi = {
  totalVendorOfferValue: number
  paidTillDate: number
  remainingPayment: number
}

export type PayablesWorkspaceApi = {
  vendorPOs: VendorPO[]
  vendorInvoices: VendorInvoice[]
  baselines: Baseline[]
}

export function toPayableSummaryKpis(data: PayablesSummaryApi): PayableSummaryKpis {
  return {
    totalVendorPoValue: data.totalVendorOfferValue,
    paidTillDate: data.paidTillDate,
    pendingPayment: data.remainingPayment,
  }
}

export const payablesService = {
  async getSummary(params?: {
    projectId?: string
    vendorId?: string
  }): Promise<PayablesSummaryApi> {
    const res = await client.get('/finance/payables/summary', { params })
    return (
      unwrapApiData<PayablesSummaryApi>(res.data) ?? {
        totalVendorOfferValue: 0,
        paidTillDate: 0,
        remainingPayment: 0,
      }
    )
  },

  async getWorkspace(): Promise<PayablesWorkspaceApi> {
    const res = await client.get('/finance/payables/workspace')
    const data = unwrapApiData<PayablesWorkspaceApi>(res.data)
    return {
      vendorPOs: Array.isArray(data?.vendorPOs) ? data.vendorPOs : [],
      vendorInvoices: Array.isArray(data?.vendorInvoices) ? data.vendorInvoices : [],
      baselines: Array.isArray(data?.baselines) ? data.baselines : [],
    }
  },
}
