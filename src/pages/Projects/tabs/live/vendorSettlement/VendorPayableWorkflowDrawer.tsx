import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Badge, Button, Checkbox, DatePicker, dateFromIso, Input, isoFromDate, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  createPayment,
  fetchExpenses,
  fetchPayments,
  fetchReimbursements,
  fetchVendorInvoices,
  updateVendorInvoice,
  updateVendorPayableControl,
} from '@/slices/live/thunk'
import type { Baseline } from '@/slices/baseline/reducer'
import type { Expense } from '@/slices/live/types'
import { formatCurrency, formatDate } from '@/utils/formatters'
import {
  computeMilestonePayableStatus,
  computePayablePaymentStatus,
  computeVendorCardCounts,
  calcVendorInvoiceNetPayable,
  calcVendorInvoiceTdsAmount,
  deriveVendorComplianceStatus,
  expenseRowsForVendor,
  findInvoiceForMilestone,
  getPayableControl,
  invoiceMatchesRow,
  isPayableReleaseAllowed,
  payableStatusBadgeColor,
  payableStatusLabel,
  TDS_RATE_OPTIONS,
  vendorInvoiceDocumentFileName,
  vendorInvoiceDocumentOpenUrl,
  type VendorMilestoneEntry,
} from './utils'

export type VendorPayableDrawerFocus = 'details' | 'payment' | 'compliance' | 'client-payment'

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

const FIELD_CONTAINER_SX = {
  p: 1.5,
  borderRadius: 1,
  bgcolor: 'background.paper',
  border: `1px solid ${tokens.color.neutral[100]}`,
  height: '100%',
} as const

export function VendorPayableWorkflowDrawer({
  open,
  onClose,
  entry,
  baseline,
  focus = 'details',
  readOnly = false,
  onUploadInvoice,
}: VendorPayableWorkflowDrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const complianceRef = useRef<HTMLDivElement>(null)
  const paymentRef = useRef<HTMLDivElement>(null)

  const { vendorInvoices, expenses, reimbursements, vendorPayableControls, payments, saving } =
    useAppSelector((s) => s.live)

  const [selInv, setSelInv] = useState<Set<string>>(() => new Set())
  const [selExp, setSelExp] = useState<Set<string>>(() => new Set())
  const [paymentDate, setPaymentDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [tdsRateDraft, setTdsRateDraft] = useState(10)
  const [tdsSaving, setTdsSaving] = useState(false)

  const projectId = entry?.projectId ?? ''
  const row = entry?.row ?? null
  const milestone = entry?.milestone ?? null

  useEffect(() => {
    if (!open || !projectId) return
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses(projectId))
    void dispatch(fetchReimbursements(projectId))
    void dispatch(fetchPayments(projectId))
  }, [open, projectId, dispatch])

  useEffect(() => {
    if (!open) {
      setSelInv(new Set())
      setSelExp(new Set())
      setPaymentDate('')
      setReferenceNumber('')
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
  const projectReimb = useMemo(
    () => reimbursements.filter((r) => r.projectId === projectId),
    [reimbursements, projectId],
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

  const expensesForRow = useMemo(() => {
    if (!row) return []
    return expenseRowsForVendor(projectExpenses, row, projectInvoices)
  }, [projectExpenses, row, projectInvoices])

  const payableControl = useMemo(() => {
    if (!row) return null
    return getPayableControl(vendorPayableControls, projectId, row)
  }, [vendorPayableControls, projectId, row])

  const countsForRow = useMemo(() => {
    if (!row) {
      return {
        pendingInv: 0,
        pendingExp: 0,
        pendingRmb: 0,
        pendingExpAmount: 0,
        pendingRmbAmount: 0,
        outstanding: 0,
        allSettled: true,
        milestoneCount: 0,
        uninvoicedMilestones: 0,
        billSubmitted: false,
      }
    }
    return computeVendorCardCounts(
      baseline,
      projectInvoices,
      projectExpenses,
      projectReimb,
      row,
      [],
    )
  }, [baseline, projectInvoices, projectExpenses, projectReimb, row])

  const payableStatus = useMemo(() => {
    if (!payableControl) return 'pending_compliance' as const
    return computeMilestonePayableStatus(milestoneInvoice, payableControl)
  }, [milestoneInvoice, payableControl])

  const vendorServiceStatus = useMemo(() => {
    if (!payableControl) return 'pending_compliance' as const
    return computePayablePaymentStatus(countsForRow, payableControl)
  }, [countsForRow, payableControl])

  const releaseAllowed = payableControl ? isPayableReleaseAllowed(payableControl) : false

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

  useEffect(() => {
    if (!open || focus !== 'payment' || !milestoneInvoice || milestoneInvoice.status === 'paid') return
    setSelInv(new Set([milestoneInvoice.id]))
  }, [open, focus, milestoneInvoice])

  useEffect(() => {
    if (!open) return
    const section =
      focus === 'payment'
        ? paymentRef.current
        : focus === 'compliance' || focus === 'client-payment'
          ? complianceRef.current
          : null
    if (!section) return
    const timer = window.setTimeout(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [open, focus])

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

  async function persistPayableControl(
    patch: Partial<{
      clientPaymentReceived: boolean
      complianceChecks: NonNullable<typeof payableControl>['complianceChecks']
    }>,
  ) {
    if (readOnly || !row || !payableControl) return
    const complianceChecks = patch.complianceChecks ?? payableControl.complianceChecks
    try {
      await dispatch(
        updateVendorPayableControl({
          projectId,
          data: {
            projectId,
            vendorId: row.vendorId,
            serviceId: row.serviceId,
            clientPaymentReceived:
              patch.clientPaymentReceived ?? payableControl.clientPaymentReceived,
            complianceChecks,
            vendorComplianceStatus: deriveVendorComplianceStatus(complianceChecks),
          },
        }),
      ).unwrap()
    } catch {
      toast.error('Failed to save payable checks')
    }
  }

  const netCalc = useMemo(() => {
    const invObjs = projectInvoices.filter((i) => selInv.has(i.id))
    const invoiceTotal = invObjs.reduce((s, i) => s + i.baseAmount, 0)
    const tdsDeducted = invObjs.reduce((s, i) => s + i.tdsAmount, 0)
    let expenseDeductions = 0
    for (const id of selExp) {
      const expRow = expensesForRow.find((x) => x.expense.id === id)
      if (expRow) expenseDeductions += expRow.amount
    }
    const netPaid = invoiceTotal - expenseDeductions - tdsDeducted
    return { invoiceTotal, expenseDeductions, tdsDeducted, reimbursementAdditions: 0, netPaid }
  }, [projectInvoices, selInv, selExp, expensesForRow])

  const canSubmitPayment =
    !readOnly &&
    selInv.size > 0 &&
    netCalc.netPaid > 0 &&
    paymentDate.trim() !== '' &&
    referenceNumber.trim() !== '' &&
    releaseAllowed &&
    milestoneInvoice?.status !== 'paid' &&
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
    if (!row || !canSubmitPayment) return
    try {
      await dispatch(
        createPayment({
          projectId,
          data: {
            vendorId: row.vendorId,
            vendorName: row.vendorName,
            paymentDate,
            totalAmount: netCalc.netPaid,
            linkedInvoiceIds: [...selInv],
            linkedExpenseIds: [...selExp],
            linkedReimbursementIds: [],
            invoiceTotal: netCalc.invoiceTotal,
            expenseDeductions: netCalc.expenseDeductions,
            reimbursementAdditions: netCalc.reimbursementAdditions,
            tdsDeducted: netCalc.tdsDeducted,
            netPaid: netCalc.netPaid,
            status: 'completed',
            referenceNumber: referenceNumber.trim(),
          },
        }),
      ).unwrap()
      toast.success('Payment recorded')
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
                    Status
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
              {milestoneInvoice.description ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mb: 0.5 }}>
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
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>
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
                    Paid {formatDate(settlementPayment.paymentDate)} · Ref{' '}
                    {settlementPayment.referenceNumber ?? '—'} · ₹
                    {formatCurrency(settlementPayment.netPaid)}
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

        <Divider />

        <Box ref={complianceRef}>
          <Typography
            variant="overline"
            sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
          >
            Compliance
          </Typography>
          <Stack gap={1.5}>
            <FormField label="Client payment received">
              {readOnly ? (
                <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
                  {payableControl?.clientPaymentReceived ? 'Yes' : 'No'}
                </Typography>
              ) : (
                <FormControl size="small" fullWidth>
                  <Select
                    value={payableControl?.clientPaymentReceived ? 'yes' : 'no'}
                    onChange={(e) =>
                      void persistPayableControl({
                        clientPaymentReceived: e.target.value === 'yes',
                      })
                    }
                    sx={{ fontSize: 12 }}
                  >
                    <MenuItem value="yes" sx={{ fontSize: 12 }}>
                      Yes
                    </MenuItem>
                    <MenuItem value="no" sx={{ fontSize: 12 }}>
                      No
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
            </FormField>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mb: 0.75 }}>
                Vendor compliance
              </Typography>
              <Grid container spacing={1.5}>
                {(
                  [
                    ['insurance', 'Insurance'],
                    ['contractSigned', 'Contract Signed'],
                    ['documentsSubmitted', 'Required Documents Submitted'],
                  ] as const
                ).map(([key, label]) => (
                  <Grid key={key} size={{ xs: 6 }}>
                    <Box sx={FIELD_CONTAINER_SX}>
                      <Checkbox
                        size="sm"
                        label={label}
                        checked={payableControl?.complianceChecks[key] ?? false}
                        disabled={readOnly}
                        onChange={(checked) => {
                          if (!payableControl || readOnly) return
                          void persistPayableControl({
                            complianceChecks: {
                              ...payableControl.complianceChecks,
                              [key]: checked,
                            },
                          })
                        }}
                        sx={{ m: 0 }}
                      />
                    </Box>
                  </Grid>
                ))}
                <Grid size={{ xs: 6 }}>
                  <Box sx={FIELD_CONTAINER_SX}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      Compliance status
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, mt: 0.25 }}>
                      {payableControl?.vendorComplianceStatus === 'complete' ? 'Complete' : 'Pending'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            {!readOnly && !releaseAllowed && milestoneInvoice?.status !== 'paid' ? (
              <Typography variant="caption" color="warning.main" sx={{ fontSize: 11 }}>
                {vendorServiceStatus === 'waiting_for_client_payment'
                  ? 'Waiting for client payment before vendor release.'
                  : vendorServiceStatus === 'pending_compliance'
                    ? 'Complete compliance checks before vendor release.'
                    : 'Payment release is blocked.'}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        {!readOnly && milestoneInvoice && milestoneInvoice.status !== 'paid' ? (
          <>
            <Divider />
            <Box ref={paymentRef}>
              <Typography
                variant="overline"
                sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
              >
                Release payment
              </Typography>
              <Stack gap={1.5}>
                {expensesForRow.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mb: 0.75, display: 'block' }}>
                      Optional expense deductions
                    </Typography>
                    <Grid container spacing={1.5}>
                      {expensesForRow.map(({ expense: e, amount }) => {
                        const locked = e.status !== 'pending'
                        return (
                          <Grid key={e.id} size={{ xs: 6 }}>
                            <Box sx={FIELD_CONTAINER_SX}>
                              <Checkbox
                                size="sm"
                                label={`${e.description} · ₹${formatCurrency(amount)}`}
                                checked={!locked && selExp.has(e.id)}
                                disabled={locked}
                                onChange={(checked) => {
                                  setSelExp((prev) => {
                                    const next = new Set(prev)
                                    if (checked) next.add(e.id)
                                    else next.delete(e.id)
                                    return next
                                  })
                                }}
                                sx={{ m: 0 }}
                              />
                            </Box>
                          </Grid>
                        )
                      })}
                    </Grid>
                  </Box>
                ) : null}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: tokens.color.neutral[50],
                    border: `1px solid ${tokens.color.neutral[100]}`,
                  }}
                >
                  <Stack gap={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        Net payment
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                        ₹{formatCurrency(netCalc.netPaid)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormField label="Payment reference" required>
                      <Input value={referenceNumber} onChange={setReferenceNumber} size="sm" />
                    </FormField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
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
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label="Release Payment"
                  disabled={!canSubmitPayment}
                  onClick={() => void handleCreatePayment()}
                />
              </Stack>
            </Box>
          </>
        ) : null}
      </Stack>
    </DrawerForm>
  )
}
