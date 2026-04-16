import client from './client'
import type { FilingItem, GSTReturn, GSTSummary, TDSDeduction, TDSSummary, TDSChallan } from '@/slices/compliance/reducer'

export interface MarkReturnFiledBody {
  filedDate: string
  notes?: string
}

export interface AddChallanBody {
  period: string
  bsrCode: string
  section: string
  depositDate: string
  amount: number
  notes?: string
}

export const complianceApi = {
  getFiling: (params: { period: string; type?: string }) =>
    client.get<{ items: FilingItem[] }>('/compliance/filing', { params }),

  getGst: (params: { period: string }) =>
    client.get<{ summary: GSTSummary | null; returns: GSTReturn[] }>('/compliance/gst', { params }),

  getTds: (params: { period: string }) =>
    client.get<{
      summary: TDSSummary | null
      deductions: TDSDeduction[]
      challans: TDSChallan[]
    }>('/compliance/tds', { params }),

  markReturnFiled: (id: string, body: MarkReturnFiledBody) =>
    client.post<{
      filingItems: FilingItem[]
      gstReturns: GSTReturn[]
      gstSummary?: GSTSummary | null | undefined
    }>(`/compliance/returns/${id}/file`, body),

  addChallan: (body: AddChallanBody) =>
    client.post<{ challans: TDSChallan[]; summary: TDSSummary | null }>('/compliance/challans', body),

  mapDeductionToChallan: (deductionId: string, body: { challanId: string }) =>
    client.patch<{
      deductions: TDSDeduction[]
      challans: TDSChallan[]
      summary: TDSSummary | null
    }>(`/compliance/deductions/${deductionId}/map-challan`, body),

  deleteChallan: (id: string) =>
    client.delete<{ challans: TDSChallan[]; summary: TDSSummary | null }>(`/compliance/challans/${id}`),
}
