import type { VendorPO, VendorPOMilestone } from '@/slices/baseline/reducer'
import type { PitchCategory } from '@/slices/pitch/reducer'
import { resolvePitchServiceForMasterSelection } from './masterServiceResolution'
import type {
  VendorEditorMilestoneRow,
  VendorEditorRetentionRow,
} from './applyVendorEditorExecutedValue'
import type { VendorPOMilestoneRow, VendorPORetentionRow } from './VendorPOMilestoneEditor'

export interface CategoryOption {
  id: string
  label: string
}

export interface ServiceOption {
  id: string
  label: string
  categoryId: string
}

export interface VendorOfferMilestoneCard {
  id: string
  categoryId: string
  serviceId: string
  milestones: VendorPOMilestoneRow[]
  retention?: VendorPORetentionRow | null
}

export interface VendorOfferRetentionCard {
  id: string
  categoryId: string
  serviceId: string
  name: string
  percentage: number
  value: number
}

function isVendorRetentionMilestoneRow(milestone: VendorPOMilestone): boolean {
  const kind =
    milestone.kind ??
    (milestone.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
  return kind === 'retention'
}

/** Map PO linked service id → master catalog category/service picker ids. */
export function resolveMasterCategoryServiceIds(
  linkedServiceId: string,
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
  serviceCatalog: { categories: PitchCategory[] } | null,
): { categoryId: string; serviceId: string } {
  const trimmed = linkedServiceId.trim()
  if (!trimmed) {
    return { categoryId: '', serviceId: '' }
  }

  const direct = serviceOptions.find((s) => s.id === trimmed)
  if (direct) {
    return { categoryId: direct.categoryId, serviceId: direct.id }
  }

  if (serviceCatalog) {
    for (const svcOpt of serviceOptions) {
      const catOpt = categoryOptions.find((c) => c.id === svcOpt.categoryId)
      const resolved = resolvePitchServiceForMasterSelection(serviceCatalog, {
        masterCategoryId: svcOpt.categoryId,
        masterServiceId: svcOpt.id,
        masterCategoryName: catOpt?.label,
        masterServiceName: svcOpt.label,
      })
      if (
        resolved &&
        (resolved.service.id === trimmed || resolved.service.subcategoryId === trimmed)
      ) {
        return { categoryId: svcOpt.categoryId, serviceId: svcOpt.id }
      }
    }
  }

  return { categoryId: '', serviceId: trimmed }
}

export function vendorPOCardsFromMilestones(
  po: Pick<VendorPO, 'milestones' | 'linkedBaselineServiceIds'>,
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
  serviceCatalog: { categories: PitchCategory[] } | null = null,
): {
  milestoneCards: VendorOfferMilestoneCard[]
  retentionCards: VendorOfferRetentionCard[]
} {
  const linkedId = po.linkedBaselineServiceIds?.[0]?.trim() ?? ''
  const { categoryId, serviceId } = resolveMasterCategoryServiceIds(
    linkedId,
    categoryOptions,
    serviceOptions,
    serviceCatalog,
  )

  const regularMilestones: VendorPOMilestoneRow[] = []
  let retentionRow: VendorPOMilestone | null = null

  for (const milestone of po.milestones ?? []) {
    if (isVendorRetentionMilestoneRow(milestone)) {
      retentionRow = milestone
      continue
    }
    regularMilestones.push({
      id: milestone.id,
      name: milestone.name,
      percentage: milestone.percentage,
      value: milestone.value,
    })
  }

  const milestoneCards: VendorOfferMilestoneCard[] = []
  if (regularMilestones.length > 0) {
    milestoneCards.push({
      id: `loaded-ms-${linkedId || 'po'}`,
      categoryId,
      serviceId,
      milestones: regularMilestones,
      retention: null,
    })
  }

  const retentionCards: VendorOfferRetentionCard[] = []
  if (retentionRow) {
    retentionCards.push({
      id: retentionRow.id,
      categoryId,
      serviceId,
      name: retentionRow.name.trim() || 'Retention',
      percentage: retentionRow.percentage,
      value: retentionRow.value,
    })
  }

  return { milestoneCards, retentionCards }
}

export function flattenVendorPOCardsForEditor(
  milestoneCards: VendorOfferMilestoneCard[],
  retentionCards: VendorOfferRetentionCard[],
): { milestones: VendorPOMilestoneRow[]; retention: VendorPORetentionRow | null } {
  const milestones = milestoneCards.flatMap((card) => card.milestones)
  const retentionCard = retentionCards[0]
  const embeddedRetention = milestoneCards.find((card) => card.retention)?.retention ?? null
  const retention = retentionCard
    ? { percentage: retentionCard.percentage, amount: retentionCard.value }
    : embeddedRetention
  return { milestones, retention }
}

export function mergeExecutedValueIntoVendorPOCards(
  milestoneCards: VendorOfferMilestoneCard[],
  retentionCards: VendorOfferRetentionCard[],
  next: { milestones: VendorEditorMilestoneRow[]; retention: VendorEditorRetentionRow | null },
): {
  milestoneCards: VendorOfferMilestoneCard[]
  retentionCards: VendorOfferRetentionCard[]
} {
  const byId = new Map(next.milestones.map((m) => [m.id, m]))
  const updatedMilestoneCards = milestoneCards.map((card) => ({
    ...card,
    milestones: card.milestones.map((m) => {
      const updated = byId.get(m.id)
      return updated ? { ...m, percentage: updated.percentage, value: updated.value } : m
    }),
    retention:
      card.retention && next.retention
        ? { percentage: next.retention.percentage, amount: next.retention.amount }
        : card.retention,
  }))
  const updatedRetentionCards = retentionCards.map((card) =>
    next.retention
      ? { ...card, percentage: next.retention.percentage, value: next.retention.amount }
      : card,
  )
  return { milestoneCards: updatedMilestoneCards, retentionCards: updatedRetentionCards }
}
