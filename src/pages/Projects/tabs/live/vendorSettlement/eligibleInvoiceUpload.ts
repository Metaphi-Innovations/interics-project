import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import type { VendorMilestone } from '@/slices/pitch/reducer'
import { buildVendorPOMilestoneOverviewRows } from '@/pages/Projects/tabs/live/vendorPOHelpers'
import {
  flattenVendorPoMilestones,
  vendorBilledAmountForMilestone,
  vendorMilestoneFullyInvoiced,
} from '@/pages/Finance/utils/vendorBillable'
import {
  invoiceMatchesRow,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement/utils'

/** A Vendor PO milestone that is eligible for a new invoice upload. */
export interface EligibleInvoiceUploadEntry {
  projectId: string
  projectName: string
  row: VendorServiceRow
  milestone: VendorMilestone
}

/** Vendor linked to a Vendor PO on a project (for cascading Project → Vendor). */
export interface ProjectVendorOption {
  projectId: string
  projectName: string
  vendorId: string
  vendorName: string
}

/**
 * Vendors associated with Vendor POs for each project (any PO status).
 */
export function buildProjectVendorOptionsFromVendorPOs(
  projects: Array<{ id: string; name: string }>,
  vendorPOsByProject: Record<string, VendorPO[]>,
): ProjectVendorOption[] {
  const map = new Map<string, ProjectVendorOption>()

  for (const project of projects) {
    for (const po of vendorPOsByProject[project.id] ?? []) {
      if (po.projectId !== project.id) continue
      if (!po.vendorId) continue
      const key = `${project.id}::${po.vendorId}`
      if (map.has(key)) continue
      map.set(key, {
        projectId: project.id,
        projectName: project.name,
        vendorId: po.vendorId,
        vendorName: po.vendorName || po.vendorId,
      })
    }
  }

  return [...map.values()].sort((a, b) => {
    const byProject = a.projectName.localeCompare(b.projectName)
    if (byProject !== 0) return byProject
    return a.vendorName.localeCompare(b.vendorName)
  })
}

/**
 * Eligible Vendor PO milestones for invoice upload:
 * any Vendor PO milestones without an existing vendor invoice.
 */
export function buildEligibleVendorInvoiceUploadEntries(
  projects: Array<{ id: string; name: string }>,
  vendorPOsByProject: Record<string, VendorPO[]>,
  baselinesByProject: Record<string, Baseline | null>,
  vendorInvoices: VendorInvoice[],
): EligibleInvoiceUploadEntry[] {
  const out: EligibleInvoiceUploadEntry[] = []

  for (const project of projects) {
    const projectPOs = (vendorPOsByProject[project.id] ?? []).filter(
      (po) => po.projectId === project.id && Boolean(po.vendorId),
    )
    if (projectPOs.length === 0) continue

    const baseline = baselinesByProject[project.id] ?? null
    const overview = buildVendorPOMilestoneOverviewRows(projectPOs, project.id, baseline)
    const scopedInvoices = vendorInvoices.filter((inv) => inv.projectId === project.id)

    for (const row of overview) {
      if (!row.vendorId) continue
      const serviceId = row.serviceId || `po:${row.poId}`
      const context: VendorServiceRow = {
        vendorId: row.vendorId,
        vendorName: row.vendor,
        serviceId,
        serviceName: row.serviceName || row.service || '—',
      }
      const milestone: VendorMilestone = {
        id: row.milestoneId,
        name: row.name,
        percentage: row.pct,
        value: row.amount,
      }
      const rowInvoices = scopedInvoices.filter((inv) => invoiceMatchesRow(inv, context))
      const flatMilestones = flattenVendorPoMilestones(
        projectPOs.find((po) => po.id === row.poId) ?? null,
      )
      const flatMilestone = flatMilestones.find((m) => m.milestoneId === row.milestoneId) ?? {
        milestoneId: row.milestoneId,
        milestoneName: row.name,
        serviceId,
        serviceName: row.serviceName || row.service || '—',
        value: row.amount,
        isRetention: row.milestoneType === 'retention',
      }
      const billed = vendorBilledAmountForMilestone(
        rowInvoices,
        project.id,
        row.poId,
        row.vendorId,
        serviceId,
        flatMilestone,
      )
      if (vendorMilestoneFullyInvoiced(row.amount, billed)) continue

      out.push({
        projectId: project.id,
        projectName: project.name,
        row: context,
        milestone,
      })
    }
  }

  return out
}

export function serviceOptionKey(entry: Pick<EligibleInvoiceUploadEntry, 'projectId' | 'row'>): string {
  return `${entry.projectId}::${entry.row.vendorId}::${entry.row.serviceId}`
}
