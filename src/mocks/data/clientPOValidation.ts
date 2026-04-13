/** Mirrors seed data in baselineHandlers for PO cap checks on /api/invoices. */
const PO_BY_PROJECT: Record<string, { id: string; poValue: number }[]> = {
  'p-001': [
    { id: 'po-001', poValue: 2_000_000 },
    { id: 'po-002', poValue: 1_500_000 },
  ],
}

export function getClientPoValue(projectId: string, poId: string): number | undefined {
  const list = PO_BY_PROJECT[projectId]
  return list?.find((p) => p.id === poId)?.poValue
}
