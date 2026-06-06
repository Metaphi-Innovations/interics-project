import type { ClientPO } from '@/slices/baseline/reducer'

/** Demo billable milestones per project — keep in sync with MSW client invoice seeds. */

export interface BillableMilestone {
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  baseAmount: number
}

export const BILLABLE_BY_PROJECT: Record<string, BillableMilestone[]> = {
  'p-001': [
    {
      milestoneId: 'cm-001',
      milestoneName: 'Mobilization',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 300000,
    },
    {
      milestoneId: 'cm-002',
      milestoneName: 'Design Draft',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 600000,
    },
    {
      milestoneId: 'cm-004',
      milestoneName: 'Mobilization',
      serviceId: 'ps-002',
      serviceName: 'Civil Works',
      baseAmount: 500000,
    },
    {
      milestoneId: 'cm-005',
      milestoneName: 'Final Handover',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 450000,
    },
  ],
  'p-002': [
    {
      milestoneId: 'cm-101',
      milestoneName: 'Design phase',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 420000,
    },
    {
      milestoneId: 'cm-102',
      milestoneName: 'Site execution',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 280000,
    },
    {
      milestoneId: 'cm-103',
      milestoneName: 'Snagging',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 150000,
    },
  ],
  'p-004': [
    {
      milestoneId: 'cm-401',
      milestoneName: 'Concept',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 195000,
    },
    {
      milestoneId: 'cm-402',
      milestoneName: 'Documentation',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 120000,
    },
  ],
}

/** Build billable rows from Client PO milestones (live billing). */
export function buildBillableFromClientPOs(
  clientPOs: ClientPO[],
  projectId: string,
): BillableMilestone[] {
  const rows: BillableMilestone[] = []
  for (const po of clientPOs.filter((p) => p.projectId === projectId)) {
    for (const m of po.milestones ?? []) {
      if (!m.name?.trim()) continue
      rows.push({
        milestoneId: m.id,
        milestoneName: m.name,
        serviceId: m.serviceId || `po-svc-${po.id}`,
        serviceName: m.serviceName?.trim() || po.poNumber,
        baseAmount: m.value,
      })
    }
  }
  return rows
}
