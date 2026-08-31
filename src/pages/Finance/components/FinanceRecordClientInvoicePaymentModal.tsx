import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { recordPayment } from '@/slices/receivables/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
import { RecordClientInvoicePaymentModal } from '@/pages/Projects/tabs/live/RecordClientInvoicePaymentModal'
import { invoiceToClientInvoice } from '@/pages/Projects/tabs/live/invoiceAdapters'

export interface FinanceRecordClientInvoicePaymentModalProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onRecorded: () => void
}

/** Finance Receivable adapter: reuses Project Live Record Payment form with receivables API. */
export function FinanceRecordClientInvoicePaymentModal({
  open,
  onClose,
  invoice,
  onRecorded,
}: FinanceRecordClientInvoicePaymentModalProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.receivables.saving)
  const clientInvoice = useMemo(
    () => (invoice ? invoiceToClientInvoice(invoice) : null),
    [invoice],
  )

  return (
    <RecordClientInvoicePaymentModal
      open={open}
      onClose={onClose}
      projectId={invoice?.projectId ?? ''}
      invoice={clientInvoice}
      paymentEntryMode="finance"
      saving={saving}
      onRecordPayment={async (payload) => {
        await dispatch(
          recordPayment({
            invoiceId: payload.invoiceId,
            payment: {
              date: payload.date,
              amountReceived: payload.amountReceived,
              tdsDeducted: 0,
              paymentMode: payload.paymentMode,
              reference: payload.reference,
              allocationMode: 'finance',
            },
          }),
        ).unwrap()
      }}
      onRecorded={onRecorded}
    />
  )
}
