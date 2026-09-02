import { DEFAULT_GST_RATE } from '@/config/billingRates'
import type { Baseline, ClientPO } from '@/slices/baseline/reducer'
import type { PitchService } from '@/slices/pitch/reducer'
import type { Service } from '@/slices/settings/reducer'
import { resolvePitchServiceGstRate } from './pitchGstDisplay'

function findBaselineService(baseline: Baseline | null, serviceId: string): PitchService | null {
  if (!baseline || !serviceId.trim()) return null
  for (const cat of baseline.categories ?? []) {
    for (const svc of cat.services ?? []) {
      if (svc.id === serviceId || svc.subcategoryId === serviceId) return svc
    }
  }
  return null
}

/**
 * Canonical Client PO GST % resolution for unsaved / preview state.
 *
 * Order (mirrors server `resolveClientServiceGstRate`):
 * 1. Settings Master service id (Client PO milestones store master ids from dropdown)
 * 2. Baseline / pitch service match (id or subcategoryId)
 * 3. {@link DEFAULT_GST_RATE} only when GST cannot be resolved
 */
export function resolveClientServiceGstRate(
  serviceId: string,
  baseline: Baseline | null,
  settingsServices: Service[] = [],
): number {
  const trimmed = serviceId.trim()
  if (!trimmed) return 0

  const master = settingsServices.find((s) => s.id === trimmed)
  if (master?.gstRate != null && !Number.isNaN(master.gstRate)) {
    return master.gstRate
  }

  const pitchSvc = findBaselineService(baseline, trimmed)
  if (pitchSvc) return resolvePitchServiceGstRate(pitchSvc, settingsServices)

  return DEFAULT_GST_RATE
}

export interface ClientPoMilestoneGstContext {
  serviceId?: string
  baseline: Baseline | null
  settingsServices: Service[]
}

/**
 * GST % for a Client PO billing milestone (incl. `${id}-retention`).
 * Saved PO snapshot `gstRate` wins; otherwise delegates to {@link resolveClientServiceGstRate}.
 */
export function resolveClientPoMilestoneGstRate(
  po: ClientPO | null | undefined,
  milestoneId: string,
  context: ClientPoMilestoneGstContext,
): number {
  const resolveFromService = (serviceId: string): number =>
    serviceId.trim()
      ? resolveClientServiceGstRate(serviceId, context.baseline, context.settingsServices)
      : DEFAULT_GST_RATE

  if (!po?.milestones?.length) {
    return resolveFromService(context.serviceId ?? '')
  }

  const wanted = milestoneId.trim()
  const isNestedRetention = wanted.endsWith('-retention')
  const parentId = isNestedRetention ? wanted.slice(0, -'-retention'.length) : ''

  for (const m of po.milestones) {
    if (isNestedRetention) {
      if (m.id !== parentId) continue
      if (m.retention?.gstRate != null && Number.isFinite(m.retention.gstRate)) {
        return m.retention.gstRate
      }
      return resolveFromService(context.serviceId ?? m.serviceId ?? '')
    }
    if (m.id === wanted) {
      if (m.kind === 'retention' || m.id.startsWith('cli-ret-')) {
        if (m.gstRate != null && Number.isFinite(m.gstRate)) return m.gstRate
        return resolveFromService(context.serviceId ?? m.serviceId ?? '')
      }
      if (m.gstRate != null && Number.isFinite(m.gstRate)) return m.gstRate
      return resolveFromService(context.serviceId ?? m.serviceId ?? '')
    }
  }

  return resolveFromService(context.serviceId ?? '')
}
