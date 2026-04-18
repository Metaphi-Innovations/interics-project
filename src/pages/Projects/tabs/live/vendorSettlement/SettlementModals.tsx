import { Divider, Stack, Typography } from '@mui/material'
import { Modal } from '@/design-system/components'
import type { VendorInvoice, VendorPayment } from '@/slices/live/reducer'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { itemsSummary } from './utils'

export function VendorInvoiceDetailModal({
  open,
  invoice,
  onClose,
}: {
  open: boolean
  invoice: VendorInvoice | null
  onClose: () => void
}) {
  if (!invoice) return null
  return (
    <Modal open={open} onClose={onClose} title="Vendor invoice" size="sm">
      <Stack gap={1} sx={{ py: 1 }}>
        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
          {invoice.invoiceNumber}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>
          Milestone: {invoice.milestoneName}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>
          Date: {formatDate(invoice.invoiceDate)}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>
          Base: ₹{formatCurrency(invoice.baseAmount)} · TDS: ₹{formatCurrency(invoice.tdsAmount)}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
          Net payable: ₹{formatCurrency(invoice.netPayable)}
        </Typography>
      </Stack>
    </Modal>
  )
}

export function PaymentDetailModal({
  open,
  payment,
  onClose,
}: {
  open: boolean
  payment: VendorPayment | null
  onClose: () => void
}) {
  if (!payment) return null
  return (
    <Modal open={open} onClose={onClose} title="Payment details" size="sm">
      <Stack gap={1.5} sx={{ py: 1 }}>
        <Typography variant="body2" sx={{ fontSize: 13 }}>
          <strong>{payment.vendorName}</strong>
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
          Date: {formatDate(payment.paymentDate)}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
          Reference: {payment.referenceNumber ?? '—'}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Stack gap={0.5}>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            Invoice total: ₹{formatCurrency(payment.invoiceTotal)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            Expense deductions: ₹{formatCurrency(payment.expenseDeductions)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            TDS (on invoices): ₹{formatCurrency(payment.tdsDeducted)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            Reimbursements: ₹{formatCurrency(payment.reimbursementAdditions)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, mt: 1 }}>
            Net paid: ₹{formatCurrency(payment.netPaid)}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {itemsSummary(payment)}
        </Typography>
      </Stack>
    </Modal>
  )
}
