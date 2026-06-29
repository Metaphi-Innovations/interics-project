import type { ClientPOMilestone } from '@/slices/baseline/reducer'
import {
  groupAllCardsByService,
  isGroupedServiceValid,
  type GroupedServiceMilestones,
  type VendorOfferMilestoneCard,
  type VendorOfferRetentionCard,
} from './VendorOfferMilestoneCards'
import type { VendorPOMilestoneRow } from './VendorPOMilestoneEditor'
import {
  serviceNameForOption,
  type ClientPOServiceOption,
} from './clientPOServiceOptions'

export {
  VendorOfferMilestoneCardEditor as ClientPOMilestoneCardEditor,
  VendorOfferRetentionCardEditor as ClientPORetentionCardEditor,
  createVendorOfferMilestoneCard as createClientPOMilestoneCard,
  createVendorOfferRetentionCard as createClientPORetentionCard,
  isMilestoneCardConfigured,
  isRetentionCardConfigured,
  type VendorOfferMilestoneCard as ClientPOMilestoneCard,
  type VendorOfferRetentionCard as ClientPORetentionCard,
} from './VendorOfferMilestoneCards'

export function groupClientCardsByService(
  milestoneCards: VendorOfferMilestoneCard[],
  retentionCards: VendorOfferRetentionCard[],
): GroupedServiceMilestones[] {
  return groupAllCardsByService(
    milestoneCards,
    [],
    retentionCards,
  )
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
  retentionCards: VendorOfferRetentionCard[]
} {
  const milestoneCards: VendorOfferMilestoneCard[] = []
  const retentionCards: VendorOfferRetentionCard[] = []
  const regularByService = new Map<string, VendorPOMilestoneRow[]>()

  for (const milestone of milestones) {
    const serviceOption = serviceOptions.find((option) => option.id === milestone.serviceId)
    const categoryId = serviceOption?.categoryId ?? ''

    if (isRetentionMilestoneRow(milestone)) {
      retentionCards.push({
        id: milestone.id.replace(/^cli-ret-/, 'ret-'),
        categoryId,
        serviceId: milestone.serviceId,
        name: milestone.name,
        percentage: milestone.percentage,
        value: milestone.value,
      })
      continue
    }

    if (milestone.retention) {
      retentionCards.push({
        id: `ret-from-${milestone.id}`,
        categoryId,
        serviceId: milestone.serviceId,
        name: 'Retention',
        percentage: milestone.retention.percentage,
        value: milestone.retention.value,
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
    })
  }

  return { milestoneCards, retentionCards }
}
