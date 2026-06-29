import type { ClientPO } from '@/slices/baseline/reducer'

export interface BillableMilestone {
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  baseAmount: number
}

/** Build billable rows from Client PO milestones (live billing). */
export function buildBillableFromClientPOs(
  clientPOs: ClientPO[],
  projectId: string,
): BillableMilestone[] {
  const rows: BillableMilestone[] = []
  for (const po of clientPOs.filter((p) => p.projectId === projectId)) {
    for (const m of po.milestones ?? []) {
      if (!m.name?.trim() || !m.serviceId?.trim()) continue

      if (m.kind === 'retention' || m.id.startsWith('cli-ret-')) {
        rows.push({
          milestoneId: m.id,
          milestoneName: m.name,
          serviceId: m.serviceId,
          serviceName: m.serviceName?.trim() || m.serviceId,
          baseAmount: m.value,
        })
        continue
      }

      rows.push({
        milestoneId: m.id,
        milestoneName: m.name,
        serviceId: m.serviceId,
        serviceName: m.serviceName?.trim() || m.serviceId,
        baseAmount: m.value,
      })
      if (m.retention && (m.retention.value > 0 || m.retention.percentage > 0)) {
        rows.push({
          milestoneId: `${m.id}-retention`,
          milestoneName: `${m.name} — Retention`,
          serviceId: m.serviceId,
          serviceName: m.serviceName?.trim() || m.serviceId,
          baseAmount: m.retention.value,
        })
      }
    }
  }
  return rows
}
