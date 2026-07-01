import type { ClientPOMilestone } from '@/slices/baseline/reducer'
import {
  createVendorOfferMilestoneCard,
  isGroupedServiceValid,
  type CategoryOption,
  type GroupedServiceMilestones,
  type ServiceOption,
  type VendorOfferMilestoneCard,
} from './VendorOfferMilestoneCards'
import type { VendorPOMilestoneRow } from './VendorPOMilestoneEditor'
import {
  serviceNameForOption,
  type ClientPOServiceOption,
} from './clientPOServiceOptions'

export {
  VendorOfferMilestoneCardEditor as ClientPOMilestoneCardEditor,
  VendorOfferRetentionCardEditor as ClientPORetentionCardEditor,
  createVendorOfferRetentionCard as createClientPORetentionCard,
  isMilestoneCardConfigured,
  isRetentionCardConfigured,
  type VendorOfferMilestoneCard as ClientPOMilestoneCard,
  type VendorOfferRetentionCard as ClientPORetentionCard,
} from './VendorOfferMilestoneCards'

export function createClientPOMilestoneCard(
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
): VendorOfferMilestoneCard {
  return {
    ...createVendorOfferMilestoneCard(categoryOptions, serviceOptions),
    retention: { percentage: 0, amount: 0 },
  }
}

export function groupClientCardsByService(
  milestoneCards: VendorOfferMilestoneCard[],
): GroupedServiceMilestones[] {
  const map = new Map<string, GroupedServiceMilestones>()

  function ensure(serviceId: string, categoryId: string): GroupedServiceMilestones {
    const existing = map.get(serviceId)
    if (existing) return existing
    const group: GroupedServiceMilestones = {
      serviceId,
      categoryId,
      milestones: [],
      finalMilestones: [],
      retentions: [],
    }
    map.set(serviceId, group)
    return group
  }

  for (const card of milestoneCards) {
    if (!card.serviceId || !card.categoryId) continue
    const group = ensure(card.serviceId, card.categoryId)
    group.milestones.push(...card.milestones)
    if (
      card.retention &&
      (card.retention.percentage > 0 || card.retention.amount > 0)
    ) {
      group.retentions.push({
        id: `ret-${card.id}`,
        categoryId: card.categoryId,
        serviceId: card.serviceId,
        name: 'Retention',
        percentage: card.retention.percentage,
        value: card.retention.amount,
      })
    }
  }

  return Array.from(map.values())
}

export function isClientGroupedServiceValid(
  milestoneBaseValue: number,
  group: GroupedServiceMilestones,
): boolean {
  return isGroupedServiceValid(milestoneBaseValue, group)
}

export function buildClientPOMilestonePayload(
  groups: GroupedServiceMilestones[],
  serviceOptions: ClientPOServiceOption[],
): ClientPOMilestone[] {
  const rows: ClientPOMilestone[] = []

  for (const group of groups) {
    const serviceName = serviceNameForOption(serviceOptions, group.serviceId)

    for (const milestone of group.milestones) {
      if (!milestone.name.trim()) continue
      rows.push({
        id: milestone.id,
        serviceId: group.serviceId,
        serviceName,
        name: milestone.name.trim(),
        percentage: milestone.percentage,
        value: milestone.value,
        kind: 'regular',
      })
    }

    for (const retention of group.retentions) {
      if (!retention.name.trim() || (retention.percentage <= 0 && retention.value <= 0)) continue
      rows.push({
        id: `cli-ret-${retention.id}`,
        serviceId: group.serviceId,
        serviceName,
        name: retention.name.trim(),
        percentage: retention.percentage,
        value: retention.value,
        kind: 'retention',
      })
    }
  }

  return rows
}

function isRetentionMilestoneRow(milestone: ClientPOMilestone): boolean {
  return milestone.kind === 'retention' || milestone.id.startsWith('cli-ret-')
}

export function clientPOCardsFromMilestones(
  milestones: ClientPOMilestone[],
  serviceOptions: ClientPOServiceOption[],
): {
  milestoneCards: VendorOfferMilestoneCard[]
} {
  const milestoneCards: VendorOfferMilestoneCard[] = []
  const regularByService = new Map<string, VendorPOMilestoneRow[]>()
  const retentionByService = new Map<string, { percentage: number; amount: number }>()

  for (const milestone of milestones) {
    if (isRetentionMilestoneRow(milestone)) {
      retentionByService.set(milestone.serviceId, {
        percentage: milestone.percentage,
        amount: milestone.value,
      })
      continue
    }

    if (milestone.retention) {
      retentionByService.set(milestone.serviceId, {
        percentage: milestone.retention.percentage,
        amount: milestone.retention.value,
      })
    }

    const rows = regularByService.get(milestone.serviceId) ?? []
    rows.push({
      id: milestone.id,
      name: milestone.name,
      percentage: milestone.percentage,
      value: milestone.value,
    })
    regularByService.set(milestone.serviceId, rows)
  }

  for (const [serviceId, rows] of regularByService) {
    if (rows.length === 0) continue
    const serviceOption = serviceOptions.find((option) => option.id === serviceId)
    milestoneCards.push({
      id: `loaded-ms-${serviceId}`,
      categoryId: serviceOption?.categoryId ?? '',
      serviceId,
      milestones: rows,
      retention: retentionByService.get(serviceId) ?? null,
    })
  }

  return { milestoneCards }
}
