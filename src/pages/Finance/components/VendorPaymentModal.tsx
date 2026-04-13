import { useEffect, useMemo, useState } from 'react'
import { Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { Modal, Button, DatePicker, Select, Input, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { recordVendorPayment } from '@/slices/payables/thunk'
import type { VendorInvoice } from '@/slices/payables/reducer'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'

const PAYMENT_MODES: { label: string; value: 'bank_transfer' | 'cheque' | 'upi' | 'other' }[] = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'UPI', value: 'upi' },
  { label: 'Other', value: 'other' },
]

const MONEY_EPS = 0.01

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

function priorSettled(inv: VendorInvoice): number {
  return inv.payments.reduce((s, p) => s + p.amountPaid + p.tdsDeducted, 0)
}

export interface VendorPaymentModalProps {
  open: boolean
  onClose: () => void
  /** When null, user picks an invoice (header action). */
  invoice: VendorInvoice | null
  /** Payable invoices for picker when `invoice` is null */
  invoiceOptions?: VendorInvoice[]
  onRecorded: () => void
}

export function VendorPaymentModal({
  open,
  onClose,
  invoice: invoiceProp,
  invoiceOptions = [],
  onRecorded,
}: VendorPaymentModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.payables.saving)

  const [selectedId, setSelectedId] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [tdsDeducted, setTdsDeducted] = useState('0')
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date())
  const [paymentMode, setPaymentMode] = useState<'bank_transfer' | 'cheque' | 'upi' | 'other'>('bank_transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const invoice = useMemo(() => {
    if (invoiceProp) return invoiceProp
    return invoiceOptions.find((i) => i.id === selectedId) ?? null
  }, [invoiceProp, invoiceOptions, selectedId])

  const balance = invoice?.balance ?? 0

  const settledBefore = invoice ? priorSettled(invoice) : 0

  const amtLive = amountPaid.trim() === '' ? 0 : Number(amountPaid)
  const tdsRaw = tdsDeducted.trim()
  const tdsLive = tdsRaw === '' ? 0 : Number(tdsDeducted)

  const thisSettlement =
    (Number.isFinite(amtLive) ? amtLive : 0) + (Number.isFinite(tdsLive) ? tdsLive : 0)
  const totalSettledProjected = roundMoney(settledBefore + thisSettlement)
  const remainingProjected = invoice
    ? roundMoney(invoice.totalAmount - settledBefore - thisSettlement)
    : 0

  const exceedsInvoice =
    invoice &&
    Number.isFinite(amtLive) &&
    Number.isFinite(tdsLive) &&
    settledBefore + amtLive + tdsLive > invoice.totalAmount + MONEY_EPS

  useEffect(() => {
    if (open) {
      setSelectedId(invoiceProp?.id ?? '')
      setAmountPaid('')
      setTdsDeducted('0')
      setPaymentDate(new Date())
      setPaymentMode('bank_transfer')
      setReference('')
      setError('')
    }
  }, [open, invoiceProp?.id])

  async function handleSubmit() {
    if (!invoice) {
      setError('Select an invoice')
      return
    }

    const a = Number(amountPaid)
    if (!amountPaid.trim() || Number.isNaN(a) || a <= 0) {
      setError('Enter amount paid (bank) greater than zero')
      return
    }
    if (a > balance + MONEY_EPS) {
      setError(`Bank amount cannot exceed balance pending (₹${formatInr(balance)})`)
      return
    }

    const tdsParsed = tdsRaw === '' ? 0 : Number(tdsDeducted)
    if (Number.isNaN(tdsParsed)) {
      setError('Enter a valid TDS amount')
      return
    }
    if (tdsParsed < 0) {
      setError('TDS cannot be negative')
      return
    }

    if (settledBefore + a + tdsParsed > invoice.totalAmount + MONEY_EPS) {
      setError('Total settled (including this payment) cannot exceed invoice total')
      return
    }

    if (!paymentDate) {
      setError('Payment date is required')
      return
    }

    setError('')
    try {
      await dispatch(
        recordVendorPayment({
          invoiceId: invoice.id,
          payment: {
            date: dayjs(paymentDate).format('YYYY-MM-DD'),
            amountPaid: a,
            tdsDeducted: tdsParsed,
            paymentMode,
            reference: reference.trim() || undefined,
          },
        }),
      ).unwrap()
      showToast({ title: 'Payment recorded', variant: 'success' })
      onRecorded()
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  const balancePendingColor =
    balance <= MONEY_EPS ? tokens.color.success[600] : tokens.color.error[600]
  const remainingColor =
    remainingProjected <= MONEY_EPS ? tokens.color.success[600] : tokens.color.warning[700]

  const pickerOptions = invoiceOptions.filter(
    (i) => i.status !== 'draft' && i.status !== 'paid' && i.balance > MONEY_EPS,
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? `Record Payment — ${invoice.invoiceNo}` : 'Record vendor payment'}
      size="sm"
      sx={{
        '& .MuiDialog-paper': {
          width: 480,
          maxWidth: 480,
        },
      }}
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="outlined" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" size="sm" onClick={handleSubmit} loading={saving}>
            Record Payment
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        {!invoiceProp ? (
          <Select
            label="Invoice"
            value={selectedId}
            onChange={(v) => setSelectedId(String(v))}
            options={[
              { label: 'Select invoice…', value: '' },
              ...pickerOptions.map((i) => ({
                label: `${i.invoiceNo} — ${i.vendorName} (₹${formatInr(i.balance)})`,
                value: i.id,
              })),
            ]}
            fullWidth
            size="sm"
            required
          />
        ) : null}

        {invoice ? (
          <>
            <Stack
              spacing={1}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: tokens.color.neutral[50],
                border: `1px solid ${tokens.color.neutral[200]}`,
              }}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Invoice Total
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(invoice.totalAmount)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Already Paid (bank)
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
                  ₹{formatInr(invoice.totalPaid)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Balance Pending
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: balancePendingColor }}>
                  ₹{formatInr(balance)}
                </Typography>
              </Stack>
            </Stack>

            <Input
              label="Amount Paid (Bank)"
              type="number"
              fullWidth
              required
              size="sm"
              value={amountPaid}
              onChange={setAmountPaid}
              helperText={`Max ₹${formatInr(balance)} (cash to vendor; enter gross bank outflow, do not reduce by TDS here)`}
            />

            <Input
              label="TDS Deducted"
              type="number"
              fullWidth
              size="sm"
              value={tdsDeducted}
              onChange={setTdsDeducted}
              helperText="TDS withheld before paying vendor (default 0). Settlement = bank + TDS."
            />

            <Stack
              spacing={1}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: tokens.color.neutral[50],
                border: `1px solid ${tokens.color.neutral[200]}`,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                With this payment (cumulative)
              </Typography>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Settled
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(totalSettledProjected)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="body2" color="text.secondary">
                  Remaining Balance
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: remainingColor }}>
                  ₹{formatInr(remainingProjected)}
                </Typography>
              </Stack>
            </Stack>

            {exceedsInvoice ? (
              <Typography variant="caption" sx={{ color: tokens.color.warning[800] }}>
                Total settled would exceed the invoice total. Reduce amount or TDS.
              </Typography>
            ) : null}

            <DatePicker
              label="Payment date"
              value={paymentDate}
              onChange={setPaymentDate}
              fullWidth
              size="sm"
              required
            />

            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(v) => setPaymentMode(v as typeof paymentMode)}
              options={PAYMENT_MODES.map((m) => ({ label: m.label, value: m.value }))}
              fullWidth
              size="sm"
              required
            />

            <Input label="Reference No" fullWidth size="sm" value={reference} onChange={setReference} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Choose an invoice to record a payment.
          </Typography>
        )}

        {error ? (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>
    </Modal>
  )
}
