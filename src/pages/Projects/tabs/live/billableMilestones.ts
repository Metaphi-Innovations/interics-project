import type { ClientPO } from '@/slices/baseline/reducer'

export interface BillableMilestone {
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  baseAmount: number
  clientPoId: string
  /** Uploaded Client PO document for this milestone row. */
  poDocumentUrl: string | null
  poFileName: string | null
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
          clientPoId: po.id,
          poDocumentUrl: po.documentUrl,
          poFileName: po.fileName ?? null,
        })
        continue
      }

      rows.push({
        milestoneId: m.id,
        milestoneName: m.name,
        serviceId: m.serviceId,
        serviceName: m.serviceName?.trim() || m.serviceId,
        baseAmount: m.value,
        clientPoId: po.id,
        poDocumentUrl: po.documentUrl,
        poFileName: po.fileName ?? null,
      })
      if (m.retention && (m.retention.value > 0 || m.retention.percentage > 0)) {
        rows.push({
          milestoneId: `${m.id}-retention`,
          milestoneName: `${m.name} — Retention`,
          serviceId: m.serviceId,
          serviceName: m.serviceName?.trim() || m.serviceId,
          baseAmount: m.retention.value,
          clientPoId: po.id,
          poDocumentUrl: po.documentUrl,
          poFileName: po.fileName ?? null,
        })
      }
    }
  }
  return rows
}
