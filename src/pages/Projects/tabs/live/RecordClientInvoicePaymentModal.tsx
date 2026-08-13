import { useEffect, useMemo, useState } from 'react'
import { Stack, Typography } from '@mui/material'
import { Modal, Button, DatePicker, Select, Input, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchInvoices, recordInvoicePayment } from '@/slices/live/thunk'
import type { ClientInvoice, ClientInvoicePaymentMode } from '@/slices/live/types'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'
import {
  balancePending,
  MONEY_EPS,
  roundMoney,
  totalReceivedBank,
  totalSettledFromPayments,
  totalTdsFromPayments,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'

const PAYMENT_MODES: { label: string; value: ClientInvoicePaymentMode }[] = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'UPI', value: 'upi' },
  { label: 'Cash', value: 'cash' },
  { label: 'Other', value: 'other' },
]

export interface RecordClientInvoicePaymentModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  invoice: ClientInvoice | null
}

export function RecordClientInvoicePaymentModal({
  open,
  onClose,
  projectId,
  invoice,
}: RecordClientInvoicePaymentModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.live.saving)

  const [amountReceived, setAmountReceived] = useState('')
  const [tdsDeducted, setTdsDeducted] = useState('0')
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date())
  const [paymentMode, setPaymentMode] = useState<ClientInvoicePaymentMode>('bank_transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const bal = invoice ? balancePending(invoice) : 0

  const priorSettled = useMemo(() => {
    if (!invoice) return 0
    return totalSettledFromPayments(invoice.payments)
  }, [invoice])

  const amtLive = amountReceived.trim() === '' ? 0 : Number(amountReceived)
  const tdsRaw = tdsDeducted.trim()
  const tdsLive = tdsRaw === '' ? 0 : Number(tdsDeducted)

  const priorBank = invoice ? totalReceivedBank(invoice.payments) : 0
  const priorTds = invoice ? totalTdsFromPayments(invoice.payments) : 0
  const thisSettlement =
    (Number.isFinite(amtLive) ? amtLive : 0) + (Number.isFinite(tdsLive) ? tdsLive : 0)
  const totalSettledProjected = roundMoney(priorSettled + thisSettlement)
  const remainingProjected = invoice ? roundMoney(bal - thisSettlement) : 0

  const exceedsInvoice =
    invoice &&
    Number.isFinite(amtLive) &&
    Number.isFinite(tdsLive) &&
    priorSettled + amtLive + tdsLive > invoice.grossAmount + MONEY_EPS

  useEffect(() => {
    if (open && invoice) {
      const pending = balancePending(invoice)
      setAmountReceived(pending > MONEY_EPS ? String(pending) : '')
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

    const tdsParsed = tdsRaw === '' ? 0 : Number(tdsDeducted)
    if (Number.isNaN(tdsParsed)) {
      setError('Enter a valid TDS amount')
      return
    }
    if (tdsParsed < 0) {
      setError('TDS cannot be negative')
      return
    }

    if (priorSettled + a + tdsParsed > invoice.grossAmount + MONEY_EPS) {
      setError('Total settled (including this payment) cannot exceed invoice total')
      return
    }

    if (!paymentDate) {
      setError('Payment date is required')
      return
    }

    const y = paymentDate.getFullYear()
    const mo = String(paymentDate.getMonth() + 1).padStart(2, '0')
    const day = String(paymentDate.getDate()).padStart(2, '0')
    const dateIso = `${y}-${mo}-${day}`

    setError('')
    try {
      await dispatch(
        recordInvoicePayment({
          projectId,
          invoiceId: invoice.id,
          data: {
            date: dateIso,
            amountReceived: a,
            tdsDeducted: tdsParsed,
            paymentMode,
            reference: reference.trim() || undefined,
          },
        }),
      ).unwrap()
      void dispatch(fetchInvoices(projectId))
      showToast({ title: 'Payment recorded', variant: 'success' })
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  if (!invoice) return null

  const balancePendingColor =
    bal <= MONEY_EPS ? tokens.color.success[600] : tokens.color.error[600]
  const remainingColor =
    remainingProjected <= MONEY_EPS ? tokens.color.success[600] : tokens.color.error[600]

  const submitDisabled =
    !amountReceived.trim() || Number(amountReceived) <= 0 || Number.isNaN(Number(amountReceived))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      subtitle={invoice.invoiceNumber}
      size="sm"
      sx={{
        '& .MuiDialog-paper': {
          width: 520,
          maxWidth: 520,
        },
      }}
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="text" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="sm"
            onClick={handleSubmit}
            loading={saving}
            disabled={submitDisabled}
          >
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
            borderRadius: 1,
            bgcolor: (t) => t.palette.action.hover,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Invoice Total
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₹{formatInr(invoice.grossAmount)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Amount Received
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
              ₹{formatInr(priorBank)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              TDS Deducted
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₹{formatInr(priorTds)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Balance Pending
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: balancePendingColor }}>
              ₹{formatInr(bal)}
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
          helperText="Bank credit only. Partial payments are allowed up to the outstanding balance."
        />

        <Input
          label="TDS Deducted"
          type="number"
          fullWidth
          size="sm"
          value={tdsDeducted}
          onChange={setTdsDeducted}
          helperText="TDS withheld by client (optional). Default 0."
        />

        <Stack
          spacing={1}
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: (t) => t.palette.action.hover,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            With this payment
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
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            Total settled would exceed the invoice total. Reduce amount or TDS.
          </Typography>
        ) : null}

        <DatePicker
          label="Payment Date"
          value={paymentDate}
          onChange={setPaymentDate}
          fullWidth
          size="sm"
          required
        />

        <Select
          label="Payment Mode"
          value={paymentMode}
          onChange={(v) => setPaymentMode(v as ClientInvoicePaymentMode)}
          options={PAYMENT_MODES.map((m) => ({ label: m.label, value: m.value }))}
          fullWidth
          size="sm"
          required
        />

        <Input label="Reference No" fullWidth size="sm" value={reference} onChange={setReference} />

        {error ? (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </Stack>
    </Modal>
  )
}
