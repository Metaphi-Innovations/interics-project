import { describe, expect, it } from 'vitest'
import type { ClientPO } from '@/slices/baseline/reducer'
import { flattenClientPoMilestones } from './projectBillable'

const po: ClientPO = {
  id: 'po-1',
  projectId: 'p-1',
  poNumber: 'PO-001',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  poValue: 100000,
  documentUrl: null,
  milestones: [
    {
      id: 'ms-1',
      serviceId: 'svc-1',
      serviceName: 'Interior Design',
      name: 'Design deposit',
      percentage: 40,
      value: 40000,
      kind: 'regular',
      retention: { percentage: 10, value: 10000 },
    },
    {
      id: 'cli-ret-2',
      serviceId: 'svc-1',
      serviceName: 'Interior Design',
      name: 'Retention',
      percentage: 10,
      value: 10000,
      kind: 'retention',
    },
  ],
}

describe('flattenClientPoMilestones', () => {
  it('returns PO milestones including regular retention split rows', () => {
    const rows = flattenClientPoMilestones(po)
    expect(rows.map((r) => r.milestoneId)).toEqual(['ms-1', 'ms-1-retention', 'cli-ret-2'])
    expect(rows[0]?.value).toBe(40000)
    expect(rows[1]?.milestoneName).toBe('Design deposit — Retention')
  })

  it('returns an empty list when no PO is selected', () => {
    expect(flattenClientPoMilestones(null)).toEqual([])
  })
})
