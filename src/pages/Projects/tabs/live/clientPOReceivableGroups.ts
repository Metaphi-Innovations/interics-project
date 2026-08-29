import type { ClientPO } from '@/slices/baseline/reducer'
import type { ClientInvoice } from '@/slices/live/types'
import type { BillableMilestone } from './billableMilestones'
import { milestonePaymentPhase } from './clientMilestoneBillingStatus'
import {
  clientMilestoneIsBilled,
  findClientInvoicesForMilestone,
} from './milestonePaymentStatus'

export type ClientPOReceivablePaymentStatus = 'Paid' | 'Partial' | 'Unpaid'

export interface ClientPOReceivableGroup {
  poId: string
  poNumber: string
  milestones: BillableMilestone[]
  paymentStatus: ClientPOReceivablePaymentStatus
}

const UNASSIGNED_PO_ID = '__unassigned__'

export function buildClientPoReceivableGroups(
  rows: BillableMilestone[],
  clientPOs: ClientPO[],
  projectInvoices: ClientInvoice[],
): ClientPOReceivableGroup[] {
  const poNumberById = new Map(clientPOs.map((po) => [po.id, po.poNumber]))
  const byPo = new Map<string, BillableMilestone[]>()

  for (const row of rows) {
    const poId = row.clientPoId?.trim() || UNASSIGNED_PO_ID
    const list = byPo.get(poId) ?? []
    list.push(row)
    byPo.set(poId, list)
  }

  const groups: ClientPOReceivableGroup[] = []

  for (const [poId, milestones] of byPo) {
    let paidCount = 0

    for (const m of milestones) {
      const isBilled = clientMilestoneIsBilled(
        projectInvoices,
        m.milestoneId,
        m.serviceId,
        m.milestoneName,
      )
      if (!isBilled) continue

      const covering = findClientInvoicesForMilestone(
        projectInvoices,
        m.milestoneId,
        m.serviceId,
        m.milestoneName,
      )
      if (milestonePaymentPhase(covering) === 'paid') {
        paidCount += 1
      }
    }

    const total = milestones.length
    const paymentStatus: ClientPOReceivablePaymentStatus =
      paidCount === 0 ? 'Unpaid' : paidCount === total ? 'Paid' : 'Partial'

    groups.push({
      poId,
      poNumber:
        poId === UNASSIGNED_PO_ID ? '—' : (poNumberById.get(poId) ?? '—'),
      milestones,
      paymentStatus,
    })
  }

  return groups.sort((a, b) => a.poNumber.localeCompare(b.poNumber))
}

export function clientPOReceivablePaymentStatusColor(
  status: ClientPOReceivablePaymentStatus,
): 'success' | 'warning' | 'neutral' {
  if (status === 'Paid') return 'success'
  if (status === 'Partial') return 'warning'
  return 'neutral'
}
