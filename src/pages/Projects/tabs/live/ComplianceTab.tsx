import { TaxComplianceSection } from './TaxComplianceSection'

interface ComplianceTabProps {
  projectId: string
  clientName: string
}

/** @deprecated Use TaxComplianceSection inside FinancialsTab instead. */
export default function ComplianceTab({ projectId, clientName }: ComplianceTabProps) {
  return <TaxComplianceSection projectId={projectId} clientName={clientName} />
}
