import type { Baseline, ClientPO, VendorPO } from '@/slices/baseline/reducer'
import { transitionAllQuotationsUploaded, transitionAllServicesHaveVendors } from '@/utils/transitionFinalize'
import type { TransitionDraft } from '@/utils/transitionDraft'
import { recalcTransitionDraft } from '@/utils/transitionDraft'

export type ReadinessRowState = 'ok' | 'warn'

export interface BaselineReadinessRow {
  id: string
  label: string
  state: ReadinessRowState
}

export interface BaselineReadinessResult {
  percent: number
  rows: BaselineReadinessRow[]
}

function baselineToDraftForChecks(baseline: Baseline): TransitionDraft {
  return recalcTransitionDraft({
    sourceVersionId: baseline.versionId,
    projectId: baseline.projectId,
    versionNumber: baseline.pitchVersionNumber,
    label: baseline.versionLabel,
    categories: baseline.categories,
    plannedExpenses: baseline.plannedExpenses ?? [],
    originalServiceValues: baseline.originalServiceValues,
    totalRevenue: 0,
    totalCost: 0,
    profitability: 0,
  }) as TransitionDraft
}

/**
 * Heuristic readiness for locked baseline execution.
 * Each row contributes equally to percent when state === ok.
 */
export function computeBaselineReadiness(
  baseline: Baseline | null,
  vendorPOs: VendorPO[],
  clientPOs: ClientPO[],
): BaselineReadinessResult {
  if (!baseline) {
    return {
      percent: 0,
      rows: [
        { id: 'locked', label: 'Financials locked', state: 'warn' },
        { id: 'vendors', label: 'Vendors mapped', state: 'warn' },
        { id: 'vpo', label: 'Vendor PO pending', state: 'warn' },
        { id: 'quotes', label: 'Missing quotations', state: 'warn' },
      ],
    }
  }

  const draft = baselineToDraftForChecks(baseline)
  const financialsLocked = baseline.status === 'Locked' && baseline.isActive
  const vendorsMapped = transitionAllServicesHaveVendors(draft)
  const quotesOk = transitionAllQuotationsUploaded(draft)

  const vendorIdsWithIssued = new Set(
    vendorPOs.filter((p) => p.status === 'Issued' || p.status === 'Accepted').map((p) => p.vendorId),
  )
  let anyAllocationMissingIssuedPO = false
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings ?? []) {
        if (vm.value <= 0) continue
        if (!vendorIdsWithIssued.has(vm.vendorId)) {
          anyAllocationMissingIssuedPO = true
          break
        }
      }
      if (anyAllocationMissingIssuedPO) break
    }
  }

  const rows: BaselineReadinessRow[] = [
    { id: 'locked', label: 'Financials locked', state: financialsLocked ? 'ok' : 'warn' },
    { id: 'vendors', label: 'Vendors mapped', state: vendorsMapped ? 'ok' : 'warn' },
    {
      id: 'vpo',
      label: 'Vendor PO pending',
      state: anyAllocationMissingIssuedPO ? 'warn' : 'ok',
    },
    {
      id: 'quotes',
      label: 'Missing quotations',
      state: quotesOk ? 'ok' : 'warn',
    },
  ]

  const clientPoOk = clientPOs.length > 0
  rows.push({ id: 'clientpo', label: 'Client PO on file', state: clientPoOk ? 'ok' : 'warn' })

  const okCount = rows.filter((r) => r.state === 'ok').length
  const percent = Math.round((okCount / rows.length) * 100)

  return { percent, rows }
}
