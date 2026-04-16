import type { ClientMilestone, VendorMilestone } from '@/slices/pitch/reducer'

export type ClientMilestoneDisplayStatus = 'Pending' | 'Upcoming' | 'Completed' | 'Due Soon'

/** Order-based UI status for client milestones (no due dates on pitch type). */
export function deriveClientMilestoneDisplayStatus(
  milestones: ClientMilestone[],
  index: number,
): ClientMilestoneDisplayStatus {
  const n = milestones.length
  if (n === 0) return 'Pending'
  if (index === 0) return 'Pending'
  if (index === n - 1) return 'Completed'
  if (index === n - 2 && n > 2) return 'Due Soon'
  return 'Upcoming'
}

export type VendorMappingMilestoneDisplayStatus = 'Pending' | 'Upcoming' | 'Completed' | 'Due Soon'

/** Order-based UI status for vendor mapping milestones (pitch VendorMilestone has no status field). */
export function deriveVendorMappingMilestoneDisplayStatus(
  milestones: VendorMilestone[],
  index: number,
): VendorMappingMilestoneDisplayStatus {
  const n = milestones.length
  if (n === 0) return 'Pending'
  if (index === 0) return 'Pending'
  if (index === n - 1) return 'Completed'
  if (index === n - 2 && n > 2) return 'Due Soon'
  return 'Upcoming'
}
