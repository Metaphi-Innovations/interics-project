import { VendorPOPayableSummary } from './VendorPOPayableSummary'

interface PaymentsTabProps {
  projectId: string
}

export default function PaymentsTab({ projectId }: PaymentsTabProps) {
  return <VendorPOPayableSummary projectId={projectId} />
}
