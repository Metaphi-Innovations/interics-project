import { VendorPOPayableSummary } from './VendorPOPayableSummary'
import type { ParsedPayableContext } from '@/utils/payableNavigation'

interface PaymentsTabProps {
  projectId: string
  payableContext?: ParsedPayableContext
}

export default function PaymentsTab({ projectId, payableContext }: PaymentsTabProps) {
  return <VendorPOPayableSummary projectId={projectId} payableContext={payableContext} />
}
