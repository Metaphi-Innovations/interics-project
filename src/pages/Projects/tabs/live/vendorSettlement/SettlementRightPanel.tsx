import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Box, Divider, Stack, Typography } from '@mui/material'
import { FormField } from '@/components/templates/DrawerForm'
import { Badge, Button, Checkbox, Input, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  createPayment,
  fetchExpenses,
  fetchPayments,
  fetchReimbursements,
  fetchVendorInvoices,
} from '@/slices/live/thunk'
import type { ExpenseType, VendorInvoice } from '@/slices/live/reducer'
import type { Baseline } from '@/slices/baseline/reducer'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { AddVendorInvoiceDrawer } from './AddVendorInvoiceDrawer'
import { VendorInvoiceDetailModal } from './SettlementModals'
import {
  computeVendorCardCounts,
  expenseRowsForVendor,
  findInvoiceForMilestone,
  findVendorMapping,
  invoiceMatchesRow,
  milestoneRowState,
  reimbMatchesRow,
  type VendorServiceRow,
} from './utils'

function TypeBadge({ type }: { type: ExpenseType }) {
  switch (type) {
    case 'additional':
      return <Badge label="Additional" variant="soft" color="neutral" size="sm" />
    case 'vendor_linked':
      return <Badge label="Vendor Linked" variant="soft" color="info" size="sm" />
    case 'common':
      return <Badge label="Common" variant="soft" color="secondary" size="sm" />
  }
}

export function SettlementRightPanel({
  projectId,
  projectName,
  baseline,
  selectedRow,
  showProjectCaption,
  onPaymentCreated,
}: {
  projectId: string
  projectName?: string
  baseline: Baseline | null
  selectedRow: VendorServiceRow | null
  showProjectCaption?: boolean
  onPaymentCreated?: () => void
}) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const { vendorInvoices, expenses, reimbursements, saving } = useAppSelector((s) => s.live)

  const [addOpen, setAddOpen] = useState(false)
  const [addDrawerPresetMilestoneId, setAddDrawerPresetMilestoneId] = useState<string | undefined>(
    undefined,
  )
  const [viewInvoice, setViewInvoice] = useState<VendorInvoice | null>(null)
  const [selInv, setSelInv] = useState<Set<string>>(() => new Set())
  const [selExp, setSelExp] = useState<Set<string>>(() => new Set())
  const [selRmb, setSelRmb] = useState<Set<string>>(() => new Set())
  const [paymentDate, setPaymentDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

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

  const invoicesForRow = useMemo(() => {
    if (!selectedRow) return []
    return projectInvoices.filter((inv) => invoiceMatchesRow(inv, selectedRow))
  }, [projectInvoices, selectedRow])

  const expensesForRow = useMemo(() => {
    if (!selectedRow) return []
    return expenseRowsForVendor(projectExpenses, selectedRow)
  }, [projectExpenses, selectedRow])

  const reimbForRow = useMemo(() => {
    if (!selectedRow) return []
    return projectReimb.filter((r) => reimbMatchesRow(r, selectedRow))
  }, [projectReimb, selectedRow])

  const vendorMilestonesForPanel = useMemo(() => {
    if (!selectedRow || !baseline) return []
    const m = findVendorMapping(baseline, selectedRow.vendorId, selectedRow.serviceId)
    return m?.milestones ?? []
  }, [baseline, selectedRow])

  useEffect(() => {
    setSelInv(new Set())
    setSelExp(new Set())
    setSelRmb(new Set())
    setPaymentDate('')
    setReferenceNumber('')
  }, [selectedRow?.vendorId, selectedRow?.serviceId, projectId])

  const countsForSelected = useMemo(() => {
    if (!selectedRow) {
      return {
        pendingInv: 0,
        pendingExp: 0,
        pendingRmb: 0,
        pendingExpAmount: 0,
        pendingRmbAmount: 0,
        outstanding: 0,
        allSettled: true,
      }
    }
    return computeVendorCardCounts(baseline, projectInvoices, projectExpenses, projectReimb, selectedRow)
  }, [baseline, projectInvoices, projectExpenses, projectReimb, selectedRow])

  const netCalc = useMemo(() => {
    const invObjs = projectInvoices.filter((i) => selInv.has(i.id))
    const invoiceTotal = invObjs.reduce((s, i) => s + i.baseAmount, 0)
    const tdsDeducted = invObjs.reduce((s, i) => s + i.tdsAmount, 0)

    let expenseDeductions = 0
    for (const id of selExp) {
      const row = expensesForRow.find((x) => x.expense.id === id)
      if (row) expenseDeductions += row.amount
    }

    const reimbObjs = projectReimb.filter((r) => selRmb.has(r.id))
    const reimbursementAdditions = reimbObjs.reduce((s, r) => s + r.amount, 0)

    const netPaid = invoiceTotal - expenseDeductions - tdsDeducted + reimbursementAdditions
    return {
      invoiceTotal,
      expenseDeductions,
      tdsDeducted,
      reimbursementAdditions,
      netPaid,
    }
  }, [projectInvoices, projectReimb, selInv, selExp, selRmb, expensesForRow])

  const hasSelection = selInv.size + selExp.size + selRmb.size > 0
  const canSubmit =
    hasSelection &&
    netCalc.netPaid > 0 &&
    paymentDate.trim() !== '' &&
    referenceNumber.trim() !== '' &&
    !saving

  const toggle = (set: Dispatch<SetStateAction<Set<string>>>, id: string, on: boolean) => {
    set((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const refreshProjectLive = useCallback(async () => {
    await Promise.all([
      dispatch(fetchVendorInvoices(projectId)).unwrap(),
      dispatch(fetchPayments(projectId)).unwrap(),
      dispatch(fetchExpenses(projectId)).unwrap(),
      dispatch(fetchReimbursements(projectId)).unwrap(),
    ])
  }, [dispatch, projectId])

  async function handleCreatePayment() {
    if (!selectedRow || !canSubmit) return
    try {
      await dispatch(
        createPayment({
          projectId,
          data: {
            vendorId: selectedRow.vendorId,
            vendorName: selectedRow.vendorName,
            paymentDate,
            totalAmount: netCalc.netPaid,
            linkedInvoiceIds: [...selInv],
            linkedExpenseIds: [...selExp],
            linkedReimbursementIds: [...selRmb],
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
      setSelInv(new Set())
      setSelExp(new Set())
      setSelRmb(new Set())
      setPaymentDate('')
      setReferenceNumber('')
      onPaymentCreated?.()
    } catch {
      toast.error('Failed to record payment')
    }
  }

  const closeAddDrawer = useCallback(() => {
    setAddOpen(false)
    setAddDrawerPresetMilestoneId(undefined)
  }, [])

  return (
    <>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          minHeight: { md: 480 },
        }}
      >
        {!selectedRow ? (
          <Typography variant="body2" sx={{ p: 3, color: 'text.secondary' }}>
            Select a vendor to settle.
          </Typography>
        ) : (
          <>
            <Box sx={{ px: 2, py: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 15 }}>
                    {selectedRow.vendorName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedRow.serviceName}
                    {showProjectCaption && projectName ? ` · ${projectName}` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 1, fontSize: 14 }}>
                    Total outstanding: ₹
                    {formatCurrency(countsForSelected.outstanding)}
                  </Typography>
                </Box>
                <Button
                  size="sm"
                  variant="outlined"
                  label="Add vendor invoice"
                  onClick={() => {
                    setAddDrawerPresetMilestoneId(undefined)
                    setAddOpen(true)
                  }}
                />
              </Stack>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
              <Typography variant="overline" sx={{ fontSize: 10, letterSpacing: 0.6 }}>
                Select items to include
              </Typography>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontSize: 12 }}>
                Invoices
              </Typography>
              <Stack gap={1}>
                {vendorMilestonesForPanel.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                    No milestones for this vendor mapping in baseline.
                  </Typography>
                )}
                {vendorMilestonesForPanel.map((vm, idx) => {
                  const inv = findInvoiceForMilestone(invoicesForRow, vm)
                  const st = milestoneRowState(inv)
                  const state1 = st === 1
                  const state2 = st === 2
                  const state3 = st === 3
                  const rowBg =
                    state3 || state1 ? tokens.color.neutral[50] : 'transparent'
                  const rowOp = state3 || state1 ? 0.85 : 1
                  return (
                    <Stack
                      key={vm.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: rowBg,
                        opacity: rowOp,
                        border: `1px solid ${tokens.color.neutral[100]}`,
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" gap={1}>
                        <Box
                          sx={{
                            width: 40,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                          }}
                        >
                          {state2 && inv && (
                            <Checkbox
                              size="sm"
                              checked={selInv.has(inv.id)}
                              onChange={(checked) => toggle(setSelInv, inv.id, checked)}
                            />
                          )}
                          {state1 && <Checkbox size="sm" checked={false} disabled />}
                          {state3 && <Checkbox size="sm" checked disabled />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>
                              M{idx + 1} — {vm.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>
                              ₹{formatCurrency(vm.value)}
                            </Typography>
                          </Stack>
                          {state1 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
                              No invoice uploaded
                            </Typography>
                          )}
                          {(state2 || state3) && inv && (
                            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                              Invoice: {inv.invoiceNumber} · {formatDate(inv.invoiceDate)}
                            </Typography>
                          )}
                          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                            {state2 && inv && (
                              <>
                                <Badge label="Pending" variant="soft" color="warning" size="sm" />
                                <Button
                                  size="sm"
                                  variant="text"
                                  label="View"
                                  onClick={() => setViewInvoice(inv)}
                                />
                                <Button
                                  size="sm"
                                  variant="text"
                                  label="Pay Now"
                                  onClick={() => toggle(setSelInv, inv.id, true)}
                                />
                              </>
                            )}
                            {state3 && inv && (
                              <>
                                <Badge label="Paid" variant="soft" color="success" size="sm" />
                                <Button
                                  size="sm"
                                  variant="text"
                                  label="View"
                                  onClick={() => setViewInvoice(inv)}
                                />
                              </>
                            )}
                            {state1 && selectedRow && (
                              <Button
                                size="sm"
                                variant="outlined"
                                color="primary"
                                label="+ Upload Invoice"
                                onClick={() => {
                                  setAddDrawerPresetMilestoneId(vm.id)
                                  setAddOpen(true)
                                }}
                              />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Stack>
                  )
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12 }}>
                Expenses
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Vendor-linked and this vendor&apos;s share of common expenses (deduct from payment).
              </Typography>
              <Stack gap={1}>
                {expensesForRow.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                    No expenses
                  </Typography>
                )}
                {expensesForRow.map(({ expense: e, amount, kind }) => {
                  const locked = e.status === 'included_in_payment'
                  return (
                    <Stack
                      key={`${e.id}-${kind}`}
                      direction="row"
                      alignItems="center"
                      gap={1}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: locked ? tokens.color.neutral[50] : 'transparent',
                        opacity: locked ? 0.72 : 1,
                        border: `1px solid ${tokens.color.neutral[100]}`,
                      }}
                    >
                      {!locked && (
                        <Checkbox
                          size="sm"
                          checked={selExp.has(e.id)}
                          onChange={(checked) => toggle(setSelExp, e.id, checked)}
                        />
                      )}
                      {locked && <Box sx={{ width: 40 }} />}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {e.description}
                        </Typography>
                        <TypeBadge type={e.type} />
                      </Box>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        ₹{formatCurrency(amount)}
                      </Typography>
                      {locked && <Badge label="Included" variant="soft" color="neutral" size="sm" />}
                    </Stack>
                  )
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12 }}>
                Reimbursements
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                These increase the payment (vendor paid on your behalf).
              </Typography>
              <Stack gap={1}>
                {reimbForRow.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                    No reimbursements
                  </Typography>
                )}
                {reimbForRow.map((r) => {
                  const locked = r.status === 'included_in_payment'
                  return (
                    <Stack
                      key={r.id}
                      direction="row"
                      alignItems="center"
                      gap={1}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: locked ? tokens.color.neutral[50] : 'transparent',
                        opacity: locked ? 0.72 : 1,
                        border: `1px solid ${tokens.color.neutral[100]}`,
                      }}
                    >
                      {!locked && (
                        <Checkbox
                          size="sm"
                          checked={selRmb.has(r.id)}
                          onChange={(checked) => toggle(setSelRmb, r.id, checked)}
                        />
                      )}
                      {locked && <Box sx={{ width: 40 }} />}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {r.description}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        ₹{formatCurrency(r.amount)}
                      </Typography>
                      {locked && <Badge label="Included" variant="soft" color="neutral" size="sm" />}
                    </Stack>
                  )
                })}
              </Stack>
            </Box>

            <Box
              sx={{
                flexShrink: 0,
                borderTop: `1px solid ${tokens.color.neutral[100]}`,
                p: 2,
                bgcolor: tokens.color.neutral[50],
              }}
            >
              <Typography variant="overline" sx={{ fontSize: 10, letterSpacing: 0.6 }}>
                Net calculation
              </Typography>
              <Stack gap={0.75} sx={{ mt: 1 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    Invoice Total
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    ₹{formatCurrency(netCalc.invoiceTotal)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    − Expense Deductions
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    ₹{formatCurrency(netCalc.expenseDeductions)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    − TDS (on invoices)
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    ₹{formatCurrency(netCalc.tdsDeducted)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    + Reimbursements
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    ₹{formatCurrency(netCalc.reimbursementAdditions)}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                    Net Payment
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14, fontWeight: 700 }}>
                    ₹{formatCurrency(netCalc.netPaid)}
                  </Typography>
                </Stack>
              </Stack>

              <Stack gap={1.5} sx={{ mt: 2 }}>
                <FormField label="Payment Reference" required>
                  <Input value={referenceNumber} onChange={setReferenceNumber} size="sm" />
                </FormField>
                <FormField label="Payment Date" required>
                  <Input type="date" value={paymentDate} onChange={setPaymentDate} size="sm" />
                </FormField>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label="Create Payment"
                  disabled={!canSubmit}
                  loading={saving}
                  onClick={() => void handleCreatePayment()}
                />
              </Box>
            </Box>
          </>
        )}
      </Box>

      <AddVendorInvoiceDrawer
        open={addOpen}
        projectId={projectId}
        context={selectedRow}
        presetMilestoneId={addDrawerPresetMilestoneId}
        baseline={baseline}
        onClose={closeAddDrawer}
      />
      <VendorInvoiceDetailModal
        open={!!viewInvoice}
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
      />
    </>
  )
}
