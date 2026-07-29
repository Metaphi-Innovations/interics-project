import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { UploadedDocumentLink } from '@/components/documents/UploadedDocumentLink'
import { DrawerForm, FormField } from '@/components/templates/DrawerForm'
import {
  Badge,
  Button,
  DatePicker,
  dateFromIso,
  Input,
  isoFromDate,
  useToast,
} from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  createPayment,
  fetchExpenses,
  fetchPayments,
  fetchReimbursements,
  fetchVendorInvoices,
  updateVendorInvoice,
} from '@/slices/live/thunk'
import type { Baseline } from '@/slices/baseline/reducer'
import type { Expense, VendorPayment } from '@/slices/live/types'
import { formatCurrency, formatDate } from '@/utils/formatters'
import {
  computeMilestonePayableStatus,
  calcVendorInvoiceNetPayable,
  calcVendorInvoiceTdsAmount,
  findInvoiceForMilestone,
  invoiceMatchesRow,
  payableStatusBadgeColor,
  payableStatusLabel,
  TDS_RATE_OPTIONS,
  vendorInvoiceDocumentFileName,
  vendorInvoiceDocumentOpenUrl,
  type VendorMilestoneEntry,
} from './utils'

export type VendorPayableDrawerFocus = 'details' | 'payment'

export type PaymentReleaseOutcome = 'complete' | 'partial' | 'not_paid'

const PAYMENT_OUTCOME_OPTIONS: { value: PaymentReleaseOutcome; label: string }[] = [
  { value: 'complete', label: 'Complete Payment' },
  { value: 'partial', label: 'Partial Payment' },
  { value: 'not_paid', label: 'Not Paid' },
]

function paymentStatusFromOutcome(outcome: PaymentReleaseOutcome): VendorPayment['status'] {
  if (outcome === 'complete') return 'completed'
  if (outcome === 'partial') return 'partial'
  return 'not_paid'
}

export interface VendorPayableWorkflowDrawerProps {
  open: boolean
  onClose: () => void
  entry: VendorMilestoneEntry | null
  baseline: Baseline | null
  focus?: VendorPayableDrawerFocus
  readOnly?: boolean
  onUploadInvoice?: (milestoneId: string) => void
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  )
}

export function VendorPayableWorkflowDrawer({
  open,
  onClose,
  entry,
  focus: _focus = 'details',
  readOnly = false,
  onUploadInvoice,
}: VendorPayableWorkflowDrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()

  const { vendorInvoices, expenses, payments, saving } = useAppSelector((s) => s.live)

  const [paymentDate, setPaymentDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentReleaseOutcome>('complete')
  const [partialAmount, setPartialAmount] = useState('')
  const [tdsRateDraft, setTdsRateDraft] = useState(10)
  const [tdsSaving, setTdsSaving] = useState(false)

  const projectId = entry?.projectId ?? ''
  const row = entry?.row ?? null
  const milestone = entry?.milestone ?? null

  useEffect(() => {
    if (!open || !projectId) return
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses(projectId))
    void dispatch(fetchPayments(projectId))
  }, [open, projectId, dispatch])

  useEffect(() => {
    if (!open) {
      setPaymentDate('')
      setReferenceNumber('')
      setPaymentOutcome('complete')
      setPartialAmount('')
    }
  }, [open, entry?.milestone.id, row?.vendorId, row?.serviceId])

  const projectInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )
  const projectExpenses = useMemo(
    () => expenses.filter((e) => e.projectId === projectId),
    [expenses, projectId],
  )
  const projectPayments = useMemo(
    () => payments.filter((p) => p.projectId === projectId),
    [payments, projectId],
  )

  const invoicesForRow = useMemo(() => {
    if (!row) return []
    return projectInvoices.filter((inv) => invoiceMatchesRow(inv, row))
  }, [projectInvoices, row])

  const milestoneInvoice = useMemo(() => {
    if (!milestone) return undefined
    return findInvoiceForMilestone(invoicesForRow, milestone)
  }, [invoicesForRow, milestone])

  const payableStatus = useMemo(
    () => computeMilestonePayableStatus(milestoneInvoice),
    [milestoneInvoice],
  )

  const linkedExpenses = useMemo(() => {
    if (!milestoneInvoice) return [] as Expense[]
    return (milestoneInvoice.linkedExpenseIds ?? [])
      .map((id) => projectExpenses.find((e) => e.id === id))
      .filter((e): e is Expense => Boolean(e))
  }, [milestoneInvoice, projectExpenses])

  const linkedAdditionExpenses = useMemo(() => {
    if (!milestoneInvoice) return [] as Expense[]
    return (milestoneInvoice.linkedAdditionExpenseIds ?? [])
      .map((id) => projectExpenses.find((e) => e.id === id))
      .filter((e): e is Expense => Boolean(e))
  }, [milestoneInvoice, projectExpenses])

  const settlementPayment = useMemo(() => {
    if (!milestoneInvoice) return undefined
    return projectPayments.find((p) => p.linkedInvoiceIds?.includes(milestoneInvoice.id))
  }, [projectPayments, milestoneInvoice])

  useEffect(() => {
    if (milestoneInvoice) {
      setTdsRateDraft(milestoneInvoice.tdsRate)
    }
  }, [milestoneInvoice?.id, milestoneInvoice?.tdsRate])

  async function handleTdsRateChange(nextRate: number) {
    if (!milestoneInvoice || readOnly || milestoneInvoice.status === 'paid' || tdsSaving) return
    const prevRate = tdsRateDraft
    setTdsRateDraft(nextRate)
    const tdsAmount = calcVendorInvoiceTdsAmount(milestoneInvoice.baseAmount, nextRate)
    const netPayable = calcVendorInvoiceNetPayable(
      milestoneInvoice.baseAmount,
      milestoneInvoice.expenseDeductions ?? 0,
      nextRate,
      milestoneInvoice.expenseAdditions ?? 0,
    )
    setTdsSaving(true)
    try {
      await dispatch(
        updateVendorInvoice({
          projectId,
          invoiceId: milestoneInvoice.id,
          data: { tdsRate: nextRate, tdsAmount, netPayable },
        }),
      ).unwrap()
    } catch {
      setTdsRateDraft(prevRate)
      toast.error('Failed to update TDS rate')
    } finally {
      setTdsSaving(false)
    }
  }

  const invoiceTdsAmount = milestoneInvoice
    ? calcVendorInvoiceTdsAmount(milestoneInvoice.baseAmount, tdsRateDraft)
    : 0
  const invoiceNetPayable = milestoneInvoice
    ? calcVendorInvoiceNetPayable(
        milestoneInvoice.baseAmount,
        milestoneInvoice.expenseDeductions ?? 0,
        tdsRateDraft,
        milestoneInvoice.expenseAdditions ?? 0,
      )
    : 0
  const tdsEditable =
    !readOnly && milestoneInvoice != null && milestoneInvoice.status !== 'paid' && !tdsSaving

  const showReleasePayment =
    !readOnly && milestoneInvoice != null && milestoneInvoice.status !== 'paid'

  const partialAmountNumber = Number(partialAmount)
  const partialAmountValid =
    paymentOutcome !== 'partial' ||
    (partialAmount.trim() !== '' &&
      Number.isFinite(partialAmountNumber) &&
      partialAmountNumber > 0 &&
      partialAmountNumber < invoiceNetPayable)

  const canSubmitPayment =
    showReleasePayment &&
    paymentDate.trim() !== '' &&
    (paymentOutcome === 'not_paid' || referenceNumber.trim() !== '') &&
    (paymentOutcome !== 'complete' || invoiceNetPayable > 0) &&
    partialAmountValid &&
    !saving

  const refreshProjectLive = useCallback(async () => {
    await Promise.all([
      dispatch(fetchVendorInvoices(projectId)).unwrap(),
      dispatch(fetchPayments(projectId)).unwrap(),
      dispatch(fetchExpenses(projectId)).unwrap(),
      dispatch(fetchReimbursements(projectId)).unwrap(),
    ])
  }, [dispatch, projectId])

  async function handleCreatePayment() {
    if (!row || !milestoneInvoice || !canSubmitPayment) return

    const paymentStatus = paymentStatusFromOutcome(paymentOutcome)
    const netPaid =
      paymentOutcome === 'complete'
        ? invoiceNetPayable
        : paymentOutcome === 'partial'
          ? partialAmountNumber
          : 0
    const totalAmount = paymentOutcome === 'not_paid' ? 0 : netPaid

    try {
      await dispatch(
        createPayment({
          projectId,
          data: {
            vendorId: row.vendorId,
            vendorName: row.vendorName,
            paymentDate,
            totalAmount,
            linkedInvoiceIds: [milestoneInvoice.id],
            linkedExpenseIds: [],
            linkedReimbursementIds: [],
            invoiceTotal: milestoneInvoice.baseAmount,
            expenseDeductions: milestoneInvoice.expenseDeductions ?? 0,
            reimbursementAdditions: 0,
            tdsDeducted: paymentOutcome === 'not_paid' ? 0 : invoiceTdsAmount,
            netPaid,
            status: paymentStatus,
            referenceNumber: referenceNumber.trim() || undefined,
          },
        }),
      ).unwrap()
      toast.success(
        paymentOutcome === 'not_paid'
          ? 'Marked as not paid'
          : paymentOutcome === 'partial'
            ? 'Partial payment recorded'
            : 'Payment recorded',
      )
      await refreshProjectLive()
      onClose()
    } catch {
      toast.error('Failed to record payment')
    }
  }

  if (!entry || !row || !milestone) return null

  const documentName = milestoneInvoice ? vendorInvoiceDocumentFileName(milestoneInvoice) : null
  const documentUrl = milestoneInvoice?.documentUrl
    ? vendorInvoiceDocumentOpenUrl(milestoneInvoice.documentUrl)
    : null

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={milestoneInvoice?.invoiceNumber ?? 'Vendor milestone'}
      width={560}
      hideFooter
      headerSx={{ alignItems: 'center' }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
            {milestone.name}
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="overline"
            sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
          >
            Vendor information
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            <ReadOnlyField label="Vendor" value={row.vendorName} />
            <ReadOnlyField label="Service" value={row.serviceName} />
            <ReadOnlyField label="Project" value={entry.projectName} />
            <ReadOnlyField label="Milestone value" value={`₹${formatCurrency(milestone.value)}`} />
          </Box>
        </Box>

        <Divider />

        <Box>
          <Typography
            variant="overline"
            sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
          >
            Invoice details
          </Typography>
          {milestoneInvoice ? (
            <Stack spacing={1.25}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <ReadOnlyField label="Invoice date" value={formatDate(milestoneInvoice.invoiceDate)} />
                <ReadOnlyField
                  label="Invoice amount"
                  value={`₹${formatCurrency(milestoneInvoice.baseAmount)}`}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Payment status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Badge
                      label={payableStatusLabel(payableStatus)}
                      variant="soft"
                      color={payableStatusBadgeColor(payableStatus)}
                      size="sm"
                    />
                  </Box>
                </Box>
                {documentName ? (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 11, display: 'block', mb: 0.5 }}
                    >
                      Uploaded document
                    </Typography>
                    <UploadedDocumentLink
                      fileName={documentName}
                      documentUrl={documentUrl}
                      onOpenFailed={() =>
                        toast.error('The invoice file is no longer available in this session.')
                      }
                    />
                  </Box>
                ) : null}
              </Box>
              {milestoneInvoice.description ? (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 11, display: 'block', mb: 0.5 }}
                  >
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {milestoneInvoice.description}
                  </Typography>
                </Box>
              ) : null}
              {linkedAdditionExpenses.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mb: 0.5 }}>
                    Expense additions
                  </Typography>
                  {linkedAdditionExpenses.map((exp) => (
                    <Typography key={exp.id} variant="body2" sx={{ fontSize: 12 }}>
                      {exp.description} · +₹{formatCurrency(exp.amount)}
                    </Typography>
                  ))}
                </Box>
              ) : null}
              {linkedExpenses.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mb: 0.5 }}>
                    Expense deductions
                  </Typography>
                  {linkedExpenses.map((exp) => (
                    <Typography key={exp.id} variant="body2" sx={{ fontSize: 12 }}>
                      {exp.description} · −₹{formatCurrency(exp.amount)}
                    </Typography>
                  ))}
                </Box>
              ) : null}
              <Divider sx={{ my: 0.5 }} />
              <Stack gap={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    Invoice amount
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    ₹{formatCurrency(milestoneInvoice.baseAmount)}
                  </Typography>
                </Stack>
                {(milestoneInvoice.expenseAdditions ?? 0) > 0 ? (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      Expense additions
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      + ₹{formatCurrency(milestoneInvoice.expenseAdditions ?? 0)}
                    </Typography>
                  </Stack>
                ) : null}
                {(milestoneInvoice.expenseDeductions ?? 0) > 0 ? (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      Expense deductions
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      − ₹{formatCurrency(milestoneInvoice.expenseDeductions ?? 0)}
                    </Typography>
                  </Stack>
                ) : null}
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, flexShrink: 0 }}>
                      TDS
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 88 }}>
                      <Select
                        value={tdsRateDraft}
                        onChange={(e) => void handleTdsRateChange(Number(e.target.value))}
                        disabled={!tdsEditable}
                        sx={{ fontSize: 12, height: 32 }}
                      >
                        {TDS_RATE_OPTIONS.map((rate) => (
                          <MenuItem key={rate} value={rate} sx={{ fontSize: 12 }}>
                            {rate}%
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    − ₹{formatCurrency(invoiceTdsAmount)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                    Net payable
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}
                  >
                    ₹{formatCurrency(invoiceNetPayable)}
                  </Typography>
                </Stack>
              </Stack>
              {settlementPayment ? (
                <Box
                  sx={{
                    mt: 0.5,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: tokens.color.neutral[50],
                    border: `1px solid ${tokens.color.neutral[100]}`,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: 10, letterSpacing: 0.5 }}>
                    SETTLEMENT
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, mt: 0.5 }}>
                    {settlementPayment.status === 'not_paid'
                      ? 'Not paid'
                      : settlementPayment.status === 'partial'
                        ? 'Partial'
                        : 'Paid'}{' '}
                    {formatDate(settlementPayment.paymentDate)}
                    {settlementPayment.referenceNumber
                      ? ` · Ref ${settlementPayment.referenceNumber}`
                      : ''}
                    {settlementPayment.status !== 'not_paid'
                      ? ` · ₹${formatCurrency(settlementPayment.netPaid)}`
                      : ''}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          ) : (
            <Stack gap={1}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                No vendor invoice uploaded for this milestone.
              </Typography>
              {!readOnly && onUploadInvoice ? (
                <Button
                  size="sm"
                  variant="outlined"
                  color="primary"
                  label="Upload Invoice"
                  onClick={() => onUploadInvoice(milestone.id)}
                />
              ) : null}
            </Stack>
          )}
        </Box>

        {showReleasePayment ? (
          <>
            <Divider />
            <Box>
              <Typography
                variant="overline"
                sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
              >
                Release payment
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12 }}>
                  <FormField label="Payment type" required>
                    <FormControl fullWidth size="small">
                      <Select
                        value={paymentOutcome}
                        onChange={(e) => {
                          setPaymentOutcome(e.target.value as PaymentReleaseOutcome)
                          if (e.target.value !== 'partial') setPartialAmount('')
                        }}
                        sx={{ fontSize: 12, height: 36 }}
                      >
                        {PAYMENT_OUTCOME_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 12 }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </FormField>
                </Grid>
                {paymentOutcome === 'partial' ? (
                  <Grid size={{ xs: 12 }}>
                    <FormField label="Amount paid" required>
                      <Input
                        value={partialAmount}
                        onChange={setPartialAmount}
                        size="sm"
                        placeholder={`Less than ₹${formatCurrency(invoiceNetPayable)}`}
                      />
                    </FormField>
                  </Grid>
                ) : null}
                {paymentOutcome !== 'not_paid' ? (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormField label="Payment reference" required>
                      <Input value={referenceNumber} onChange={setReferenceNumber} size="sm" />
                    </FormField>
                  </Grid>
                ) : null}
                <Grid size={{ xs: 12, sm: paymentOutcome === 'not_paid' ? 12 : 6 }}>
                  <FormField label="Payment date" required>
                    <DatePicker
                      value={dateFromIso(paymentDate)}
                      onChange={(d) => setPaymentDate(isoFromDate(d))}
                      fullWidth
                      size="sm"
                    />
                  </FormField>
                </Grid>
              </Grid>
              <Box sx={{ mt: 1.5 }}>
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label="Release Payment"
                  fullWidth
                  disabled={!canSubmitPayment}
                  onClick={() => void handleCreatePayment()}
                />
              </Box>
            </Box>
          </>
        ) : null}
      </Stack>
    </DrawerForm>
  )
}
