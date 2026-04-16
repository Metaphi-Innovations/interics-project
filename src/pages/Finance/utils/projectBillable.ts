import type { Baseline } from '@/slices/baseline/reducer'
import type { Invoice, LineItem } from '@/slices/receivables/reducer'
import type { Service, SACCode } from '@/slices/settings/reducer'

export interface FlatMilestone {
  milestoneId: string
  milestoneName: string
  baselineServiceId: string
  baselineServiceName: string
  value: number
}

export interface FlatBaselineServiceRow {
  baselineServiceId: string
  name: string
  adjustedValue: number
}

/** Map baseline service label to settings master (name match + fallbacks). */
export function resolveServiceForBaseline(
  baselineServiceName: string,
  services: Service[],
): Service | undefined {
  const n = baselineServiceName.trim().toLowerCase()
  const direct = services.find((s) => s.name.trim().toLowerCase() === n)
  if (direct) return direct
  const aliases: Record<string, string> = {
    'interior design': 'Interior Design',
    'civil works': 'Construction / Build Services',
  }
  const aliasTarget = aliases[n]
  if (aliasTarget) {
    const byAlias = services.find((s) => s.name.trim().toLowerCase() === aliasTarget.toLowerCase())
    if (byAlias) return byAlias
  }
  return services.find(
    (s) =>
      s.name.toLowerCase().includes(n) ||
      n.includes(s.name.toLowerCase()),
  )
}

export function flattenBaselineMilestones(baseline: Baseline | null): FlatMilestone[] {
  if (!baseline) return []
  const out: FlatMilestone[] = []
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      for (const m of svc.clientMilestones) {
        out.push({
          milestoneId: m.id,
          milestoneName: m.name,
          baselineServiceId: svc.id,
          baselineServiceName: svc.name,
          value: m.value,
        })
      }
    }
  }
  return out
}

export function flattenBaselineServices(baseline: Baseline | null): FlatBaselineServiceRow[] {
  if (!baseline) return []
  const out: FlatBaselineServiceRow[] = []
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      out.push({
        baselineServiceId: svc.id,
        name: svc.name,
        adjustedValue: svc.value,
      })
    }
  }
  return out
}

function lineItemsForProject(invoices: Invoice[], projectId: string): LineItem[] {
  return invoices.filter((i) => i.projectId === projectId).flatMap((i) => i.lineItems)
}

export function sumBilledPerMilestone(
  invoices: Invoice[],
  projectId: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const li of lineItemsForProject(invoices, projectId)) {
    if (!li.milestoneId) continue
    map.set(li.milestoneId, (map.get(li.milestoneId) ?? 0) + li.amount)
  }
  return map
}

export function sumBilledPerBaselineService(
  invoices: Invoice[],
  projectId: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const li of lineItemsForProject(invoices, projectId)) {
    if (li.lineSource !== 'service' || !li.baselineServiceId) continue
    map.set(li.baselineServiceId, (map.get(li.baselineServiceId) ?? 0) + li.amount)
  }
  return map
}

export type MilestoneBillStatus = 'unbilled' | 'partial' | 'billed'

export function milestoneBillStatus(billed: number, value: number): MilestoneBillStatus {
  if (billed <= 0) return 'unbilled'
  if (billed >= value - 0.01) return 'billed'
  return 'partial'
}

export function remainingMilestoneValue(billed: number, value: number): number {
  return Math.max(0, Math.round((value - billed) * 100) / 100)
}

export function remainingServiceValue(billed: number, adjustedValue: number): number {
  return Math.max(0, Math.round((adjustedValue - billed) * 100) / 100)
}

export function sacCodeForService(sacCodes: SACCode[], service: Service | undefined): string {
  if (!service?.sacCodeId) return ''
  return sacCodes.find((s) => s.id === service.sacCodeId)?.code ?? ''
}
