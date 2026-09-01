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
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import { clientLineOutstanding } from '@/pages/Projects/tabs/live/clientMilestoneBillingStatus'
import { sumClientInvoicePaidFromPayments } from '@/pages/Projects/tabs/live/paymentAllocation'

const PAYMENT_MODES: { label: string; value: ClientInvoicePaymentMode }[] = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'UPI', value: 'upi' },
  { label: 'Cash', value: 'cash' },
  { label: 'Other', value: 'other' },
]

export type RecordClientInvoicePaymentPayload = {
  invoiceId: string
  date: string
  amountReceived: number
  paymentMode: ClientInvoicePaymentMode
  reference?: string
  allocationMode?: 'project_live' | 'finance'
  targetMilestoneId?: string
}

export interface RecordClientInvoicePaymentModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  invoice: ClientInvoice | null
  /** When set, complete payment pays this milestone/retention row outstanding (Project Live). */
  targetMilestoneId?: string
  /** project_live = row allocation; finance = invoice-level proportional allocation */
  paymentEntryMode?: 'project_live' | 'finance'
  /** When set, used instead of Live `recordInvoicePayment` (Finance Receivable adapter). */
  onRecordPayment?: (payload: RecordClientInvoicePaymentPayload) => Promise<void>
  /** Override saving state (defaults to Live slice). */
  saving?: boolean
  /** Called after a successful payment (refetch). Live path also refreshes invoices when omitted. */
  onRecorded?: () => void
}

export function RecordClientInvoicePaymentModal({
  open,
  onClose,
  projectId,
  invoice,
  targetMilestoneId,
  paymentEntryMode = 'project_live',
  onRecordPayment,
  saving: savingOverride,
  onRecorded,
}: RecordClientInvoicePaymentModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const liveSaving = useAppSelector((s) => s.live.saving)
  const saving = savingOverride ?? liveSaving

  const [amountReceived, setAmountReceived] = useState('')
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date())
  const [paymentMode, setPaymentMode] = useState<ClientInvoicePaymentMode>('bank_transfer')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const gross = invoice?.grossAmount ?? 0
  const invoiceTds = invoice?.tdsAmount ?? 0
  const netPayable = roundMoney(gross - invoiceTds)
  const priorBank = invoice ? sumClientInvoicePaidFromPayments(invoice.payments) : 0
  const rowOutstanding =
    invoice && targetMilestoneId && paymentEntryMode === 'project_live'
      ? clientLineOutstanding(invoice, targetMilestoneId)
      : invoice
        ? balancePending(invoice)
        : 0
  const bal = invoice ? balancePending(invoice) : 0

  const amtLive = amountReceived.trim() === '' ? 0 : Number(amountReceived)
  const totalReceivedProjected = roundMoney(priorBank + (Number.isFinite(amtLive) ? amtLive : 0))
  const remainingProjected = invoice ? roundMoney(bal - (Number.isFinite(amtLive) ? amtLive : 0)) : 0

  const exceedsNetPayable = useMemo(() => {
    if (!invoice) return false
    const a = Number(amountReceived)
    if (!Number.isFinite(a)) return false
    return priorBank + a > netPayable + MONEY_EPS
  }, [invoice, amountReceived, priorBank, netPayable])

  useEffect(() => {
    if (open && invoice) {
      const pending =
        paymentEntryMode === 'finance' || !targetMilestoneId
          ? balancePending(invoice)
          : clientLineOutstanding(invoice, targetMilestoneId)
      setAmountReceived(pending > MONEY_EPS ? String(pending) : '')
      setPaymentDate(new Date())
      setPaymentMode('bank_transfer')
      setReference('')
      setError('')
    }
  }, [open, invoice, targetMilestoneId, paymentEntryMode])

  async function handleSubmit() {
    if (!invoice) return

    const a = Number(amountReceived)
    if (!amountReceived.trim() || Number.isNaN(a) || a <= 0) {
      setError('Enter amount received (bank) greater than zero')
      return
    }

    if (priorBank + a > netPayable + MONEY_EPS) {
      setError('Total received cannot exceed net payable amount')
      return
    }

    if (
      paymentEntryMode === 'project_live' &&
      targetMilestoneId &&
      a > rowOutstanding + MONEY_EPS
    ) {
      setError('Payment exceeds milestone outstanding balance')
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
    const allocationMode = paymentEntryMode
    const paymentPayload = {
      date: dateIso,
      amountReceived: a,
      paymentMode,
      reference: reference.trim() || undefined,
      allocationMode,
      targetMilestoneId:
        paymentEntryMode === 'project_live' ? targetMilestoneId : undefined,
    }
    try {
      if (onRecordPayment) {
        await onRecordPayment({
          invoiceId: invoice.id,
          ...paymentPayload,
        })
      } else {
        await dispatch(
          recordInvoicePayment({
            projectId,
            invoiceId: invoice.id,
            data: paymentPayload,
          }),
        ).unwrap()
        void dispatch(fetchInvoices(projectId))
      }
      showToast({ title: 'Payment recorded', variant: 'success' })
      onRecorded?.()
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

  const isFinanceMode = paymentEntryMode === 'finance'
  const invoiceNetReceivable = netPayable
  const outstanding = bal

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
          {isFinanceMode ? (
            <>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Invoice amount / net receivable
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(invoiceNetReceivable)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Already received
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
                  ₹{formatInr(priorBank)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Outstanding
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: balancePendingColor }}>
                  ₹{formatInr(outstanding)}
                </Typography>
              </Stack>
            </>
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Gross invoice amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(gross)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Invoice TDS
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  −₹{formatInr(invoiceTds)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Net payable
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(netPayable)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Prior received
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
                  ₹{formatInr(priorBank)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Balance pending
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: balancePendingColor }}>
                  ₹{formatInr(bal)}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>

        <Input
          label={isFinanceMode ? 'Payment Amount' : 'Amount Received (Bank)'}
          type="number"
          fullWidth
          required
          size="sm"
          value={amountReceived}
          onChange={setAmountReceived}
          helperText={
            isFinanceMode
              ? 'Invoice-level payment against net receivable outstanding.'
              : 'Bank credit only. Partial payments are allowed up to the net payable balance.'
          }
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
              Total received
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₹{formatInr(totalReceivedProjected)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="body2" color="text.secondary">
              Remaining balance
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: remainingColor }}>
              ₹{formatInr(remainingProjected)}
            </Typography>
          </Stack>
        </Stack>

        {exceedsNetPayable ? (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            Total received would exceed net payable. Reduce the amount.
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

        <Input
          label={isFinanceMode ? 'Reference for Received Payment' : 'Reference No'}
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
