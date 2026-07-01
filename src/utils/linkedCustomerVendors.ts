import client from '@/api/client'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { Project } from '@/slices/projects/reducer'

export interface LinkedVendorOption {
  id: string
  label: string
}

function mergeVendorEntries(
  entries: Iterable<{ vendorId: string; vendorName: string }>,
): LinkedVendorOption[] {
  const map = new Map<string, string>()
  for (const entry of entries) {
    const id = entry.vendorId?.trim()
    if (!id) continue
    const name = entry.vendorName?.trim()
    map.set(id, name || map.get(id) || id)
  }
  return Array.from(map.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function projectIdsForLinkedVendors(
  customerId: string,
  projects: Project[],
  projectId?: string,
): string[] {
  if (projectId) return [projectId]
  return projects.filter((p) => p.customerId === customerId).map((p) => p.id)
}

export async function fetchLinkedVendorsForProjects(
  projectIds: string[],
): Promise<LinkedVendorOption[]> {
  const entries: { vendorId: string; vendorName: string }[] = []

  for (const projectId of projectIds) {
    try {
      const posRes = await client.get<VendorPO[]>(`/projects/${projectId}/vendor-pos`)
      for (const po of posRes.data) {
        entries.push({ vendorId: po.vendorId, vendorName: po.vendorName })
      }
    } catch {
      // Project may have no vendor POs yet.
    }

    try {
      const baselineRes = await client.get<Baseline>(`/projects/${projectId}/baseline`)
      for (const cat of baselineRes.data.categories ?? []) {
        for (const svc of cat.services) {
          for (const mapping of svc.vendorMappings ?? []) {
            entries.push({ vendorId: mapping.vendorId, vendorName: mapping.vendorName })
          }
        }
      }
    } catch {
      // Project may not have a baseline yet.
    }
  }

  return mergeVendorEntries(entries)
}
