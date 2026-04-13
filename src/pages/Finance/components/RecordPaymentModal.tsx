import { useEffect, useMemo, useState } from 'react'
import { Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { Modal, Button, DatePicker, Select, Input, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { recordPayment } from '@/slices/receivables/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
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

export interface RecordPaymentModalProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onRecorded: () => void
}

export function RecordPaymentModal({ open, onClose, invoice, onRecorded }: RecordPaymentModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.receivables.saving)

  const [amountReceived, setAmountReceived] = useState('')
  const [tdsDeducted, setTdsDeducted] = useState('0')
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date())
  const [paymentMode, setPaymentMode] = useState<'bank_transfer' | 'cheque' | 'upi' | 'other'>('bank_transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const balance = invoice?.balance ?? 0

  const priorSettled = useMemo(() => {
    if (!invoice) return 0
    return invoice.payments.reduce((s, p) => s + p.amountReceived + p.tdsDeducted, 0)
  }, [invoice])

  const amtLive = amountReceived.trim() === '' ? 0 : Number(amountReceived)
  const tdsRaw = tdsDeducted.trim()
  const tdsLive = tdsRaw === '' ? 0 : Number(tdsDeducted)

  const thisSettlement =
    (Number.isFinite(amtLive) ? amtLive : 0) + (Number.isFinite(tdsLive) ? tdsLive : 0)
  const totalSettledProjected = roundMoney(priorSettled + thisSettlement)
  const remainingProjected = invoice
    ? roundMoney(invoice.totalAmount - priorSettled - thisSettlement)
    : 0

  const exceedsInvoice =
    invoice &&
    Number.isFinite(amtLive) &&
    Number.isFinite(tdsLive) &&
    priorSettled + amtLive + tdsLive > invoice.totalAmount + MONEY_EPS

  useEffect(() => {
    if (open && invoice) {
      setAmountReceived('')
      setTdsDeducted('0')
      setPaymentDate(new Date())
      setPaymentMode('bank_transfer')
      setReference('')
      setError('')
    }
  }, [open, invoice])

  async function handleSubmit() {
    if (!invoice) return

    const a = Number(amountReceived)
    if (!amountReceived.trim() || Number.isNaN(a) || a <= 0) {
      setError('Enter amount received (bank) greater than zero')
      return
    }
    if (a > balance + MONEY_EPS) {
      setError(`Amount cannot exceed balance pending (₹${formatInr(balance)})`)
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

    if (priorSettled + a + tdsParsed > invoice.totalAmount + MONEY_EPS) {
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
        recordPayment({
          invoiceId: invoice.id,
          payment: {
            date: dayjs(paymentDate).format('YYYY-MM-DD'),
            amountReceived: a,
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

  if (!invoice) return null

  const balancePendingColor =
    balance <= MONEY_EPS ? tokens.color.success[600] : tokens.color.error[600]
  const remainingColor =
    remainingProjected <= MONEY_EPS ? tokens.color.success[600] : tokens.color.warning[700]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record Payment — ${invoice.invoiceNo}`}
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
              Already Received
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
              ₹{formatInr(invoice.totalReceived)}
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
          label="Amount Received (Bank)"
          type="number"
          fullWidth
          required
          size="sm"
          value={amountReceived}
          onChange={setAmountReceived}
          helperText={`Max ₹${formatInr(balance)} (bank amount after TDS; do not reduce by TDS here)`}
        />

        <Input
          label="TDS Deducted"
          type="number"
          fullWidth
          size="sm"
          value={tdsDeducted}
          onChange={setTdsDeducted}
          helperText="Optional. TDS withheld by client (default 0)."
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

        <Input
          label="Reference No"
          fullWidth
          size="sm"
          value={reference}
          onChange={setReference}
        />

        {error ? (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>
    </Modal>
  )
}
