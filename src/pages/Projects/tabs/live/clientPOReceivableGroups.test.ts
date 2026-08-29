import { describe, expect, it } from 'vitest'
import type { ClientPO } from '@/slices/baseline/reducer'
import type { ClientInvoice } from '@/slices/live/types'
import type { BillableMilestone } from './billableMilestones'
import { buildClientPoReceivableGroups } from './clientPOReceivableGroups'

function row(
  overrides: Partial<BillableMilestone> & Pick<BillableMilestone, 'milestoneId' | 'clientPoId'>,
): BillableMilestone {
  return {
    milestoneName: overrides.milestoneName ?? 'Milestone',
    serviceId: overrides.serviceId ?? 'svc-1',
    serviceName: overrides.serviceName ?? 'Service',
    baseAmount: overrides.baseAmount ?? 1000,
    tdsRate: overrides.tdsRate ?? null,
    poDocumentUrl: overrides.poDocumentUrl ?? null,
    poFileName: overrides.poFileName ?? null,
    ...overrides,
  }
}

function clientPO(id: string, poNumber: string): ClientPO {
  return {
    id,
    projectId: 'proj-1',
    poNumber,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    poValue: 100000,
    documentUrl: null,
    milestones: [],
  }
}

function invoice(
  overrides: Partial<ClientInvoice> & Pick<ClientInvoice, 'milestoneId' | 'serviceId'>,
): ClientInvoice {
  return {
    id: overrides.id ?? `inv-${overrides.milestoneId}`,
    projectId: 'proj-1',
    milestoneName: overrides.milestoneName ?? 'Milestone',
    serviceName: overrides.serviceName ?? 'Service',
    lineItems: overrides.lineItems ?? [],
    baseAmount: overrides.baseAmount ?? 1000,
    gstAmount: overrides.gstAmount ?? 180,
    grossAmount: overrides.grossAmount ?? 1180,
    tdsAmount: overrides.tdsAmount ?? 0,
    netReceivable: overrides.netReceivable ?? 1180,
    invoiceNumber: overrides.invoiceNumber ?? 'INV-1',
    invoiceDate: '2026-01-01',
    dueDate: '2026-02-01',
    status: overrides.status ?? 'sent',
    payments: overrides.payments ?? [],
    ...overrides,
  }
}

describe('buildClientPoReceivableGroups', () => {
  it('groups milestones and retentions under their PO without duplicates', () => {
    const rows: BillableMilestone[] = [
      row({ milestoneId: 'm1', clientPoId: 'po-1', milestoneName: 'Milestone A' }),
      row({ milestoneId: 'm2', clientPoId: 'po-1', milestoneName: 'Milestone B' }),
      row({ milestoneId: 'm1-retention', clientPoId: 'po-1', milestoneName: 'Retention A' }),
      row({ milestoneId: 'm3', clientPoId: 'po-2', milestoneName: 'Milestone C' }),
      row({ milestoneId: 'm3-retention', clientPoId: 'po-2', milestoneName: 'Retention B' }),
    ]
    const clientPOs = [clientPO('po-1', 'PO-001'), clientPO('po-2', 'PO-002')]

    const groups = buildClientPoReceivableGroups(rows, clientPOs, [])

    expect(groups).toHaveLength(2)
    expect(groups[0].poNumber).toBe('PO-001')
    expect(groups[0].milestones.map((m) => m.milestoneId)).toEqual([
      'm1',
      'm2',
      'm1-retention',
    ])
    expect(groups[1].poNumber).toBe('PO-002')
    expect(groups[1].milestones.map((m) => m.milestoneId)).toEqual(['m3', 'm3-retention'])
  })

  it('preserves all rows when multiple POs and mixed milestone/retention rows exist', () => {
    const rows: BillableMilestone[] = [
      row({ milestoneId: 'a', clientPoId: 'po-a' }),
      row({ milestoneId: 'b', clientPoId: 'po-b' }),
      row({ milestoneId: 'c', clientPoId: 'po-a' }),
    ]

    const groups = buildClientPoReceivableGroups(
      rows,
      [clientPO('po-a', 'PO-A'), clientPO('po-b', 'PO-B')],
      [],
    )

    const allIds = groups.flatMap((g) => g.milestones.map((m) => m.milestoneId))
    expect(allIds.sort()).toEqual(['a', 'b', 'c'])
    expect(allIds).toHaveLength(3)
  })

  it('computes PO payment status from billed milestone payment phases', () => {
    const rows: BillableMilestone[] = [
      row({ milestoneId: 'paid', clientPoId: 'po-1' }),
      row({ milestoneId: 'open', clientPoId: 'po-1' }),
    ]
    const invoices: ClientInvoice[] = [
      invoice({
        milestoneId: 'paid',
        serviceId: 'svc-1',
        grossAmount: 1180,
        netReceivable: 0,
        status: 'paid',
        payments: [
          {
            id: 'p1',
            date: '2026-01-15',
            amountReceived: 1180,
            tdsDeducted: 0,
            netReceived: 1180,
            paymentMode: 'bank_transfer',
            recordedAt: '2026-01-15T00:00:00.000Z',
          },
        ],
      }),
      invoice({ milestoneId: 'open', serviceId: 'svc-1', payments: [] }),
    ]

    const [group] = buildClientPoReceivableGroups(rows, [clientPO('po-1', 'PO-001')], invoices)

    expect(group.paymentStatus).toBe('Partial')
  })

  it('falls back for rows without a PO association', () => {
    const rows = [row({ milestoneId: 'orphan', clientPoId: '' })]
    const groups = buildClientPoReceivableGroups(rows, [], [])

    expect(groups).toHaveLength(1)
    expect(groups[0].poNumber).toBe('—')
    expect(groups[0].milestones).toHaveLength(1)
  })
})
