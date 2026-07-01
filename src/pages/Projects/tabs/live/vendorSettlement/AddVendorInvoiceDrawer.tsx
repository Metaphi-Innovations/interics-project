import { useEffect, useMemo, useState } from 'react'
import { Box, Divider, MenuItem, Select, Stack, Typography } from '@mui/material'
import { DrawerForm, FormField, FormSection } from '@/components/templates/DrawerForm'
import { Checkbox, FileUpload, Input, Textarea, useToast } from '@/design-system/components'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchVendorInvoices, updateVendorInvoice, uploadVendorInvoice } from '@/slices/live/thunk'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { Expense } from '@/slices/live/types'
import type { VendorMilestone } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  DEFAULT_TDS_PERCENT,
  calcVendorInvoiceNetPayable,
  calcVendorInvoiceTdsAmount,
  findInvoiceForMilestone,
  invoiceMatchesRow,
  resolveVendorMilestonesForRow,
  selectableProjectExpensesForInvoice,
  TDS_RATE_OPTIONS,
  type VendorServiceRow,
} from './utils'

function gstOnBase(base: number, rate: number): number {
  return Math.round((base * rate) / 100)
}

function mergeExpenseOptions(
  pending: Expense[],
  linkedIds: string[],
  allExpenses: Expense[],
): Expense[] {
  const linked = linkedIds
    .map((id) => allExpenses.find((e) => e.id === id))
    .filter((e): e is Expense => Boolean(e))
  const seen = new Set<string>()
  return [...linked, ...pending].filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })
}

function ExpenseCheckboxCards({
  expenses,
  selectedIds,
  onToggle,
  emptyMessage,
}: {
  expenses: Expense[]
  selectedIds: Set<string>
  onToggle: (expenseId: string, checked: boolean) => void
  emptyMessage: string
}) {
  if (expenses.length === 0) {
    return (
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 1 }}>
          {emptyMessage}
        </Typography>
      </Box>
    )
  }

  return (
    <>
      {expenses.map((exp) => (
        <Stack
          key={exp.id}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            minWidth: 0,
          }}
        >
          <Checkbox
            size="sm"
            label={exp.description}
            checked={selectedIds.has(exp.id)}
            onChange={(checked) => onToggle(exp.id, checked)}
          />
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, flexShrink: 0, ml: 1 }}>
            ₹{formatCurrency(exp.amount)}
          </Typography>
        </Stack>
      ))}
    </>
  )
}

export function AddVendorInvoiceDrawer({
  open,
  projectId,
  context,
  presetMilestoneId,
  editInvoiceId,
  baseline,
  vendorPOs = [],
  onClose,
}: {
  open: boolean
  projectId: string
  context: VendorServiceRow | null
  presetMilestoneId?: string
  editInvoiceId?: string
  baseline: Baseline | null
  vendorPOs?: VendorPO[]
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const { saving, vendorInvoices, expenses } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [description, setDescription] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)
  const [documentFileName, setDocumentFileName] = useState<string | undefined>(undefined)
  const [selectedDeductionIds, setSelectedDeductionIds] = useState<Set<string>>(() => new Set())
  const [selectedAdditionIds, setSelectedAdditionIds] = useState<Set<string>>(() => new Set())
  const [tdsRate, setTdsRate] = useState(DEFAULT_TDS_PERCENT)

  const projectScopedInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const milestones = useMemo((): VendorMilestone[] => {
    if (!context) return []
    return resolveVendorMilestonesForRow(vendorPOs, baseline, context)
  }, [vendorPOs, baseline, context])

  const uninvoicedMilestones = useMemo((): VendorMilestone[] => {
    if (!context || milestones.length === 0) return []
    const scoped = projectScopedInvoices.filter((inv) => invoiceMatchesRow(inv, context))
    return milestones.filter((vm) => !findInvoiceForMilestone(scoped, vm))
  }, [context, milestones, projectScopedInvoices])

  const lockedMilestone = useMemo(() => {
    if (!presetMilestoneId || milestones.length === 0) return undefined
    return milestones.find((m) => m.id === presetMilestoneId)
  }, [presetMilestoneId, milestones])

  const existingInvoice = useMemo(() => {
    if (!editInvoiceId) return undefined
    return projectScopedInvoices.find((inv) => inv.id === editInvoiceId)
  }, [editInvoiceId, projectScopedInvoices])

  const isEditMode = Boolean(existingInvoice)

  const pendingExpenses = useMemo(
    () => selectableProjectExpensesForInvoice(expenses, projectId),
    [expenses, projectId],
  )

  const expenseOptions = useMemo(() => {
    if (!existingInvoice) return pendingExpenses
    const linkedIds = [
      ...(existingInvoice.linkedExpenseIds ?? []),
      ...(existingInvoice.linkedAdditionExpenseIds ?? []),
    ]
    return mergeExpenseOptions(pendingExpenses, linkedIds, expenses)
  }, [existingInvoice, expenses, pendingExpenses])

  const baseNumber = Number(baseAmount) || 0
  const gstRateNumber = DEFAULT_GST_RATE
  const gstAmount = gstOnBase(baseNumber, gstRateNumber)
  const tdsAmount = calcVendorInvoiceTdsAmount(baseNumber, tdsRate)

  const expenseDeductions = useMemo(() => {
    let total = 0
    for (const id of selectedDeductionIds) {
      const exp = expenseOptions.find((e) => e.id === id)
      if (exp) total += exp.amount
    }
    return total
  }, [selectedDeductionIds, expenseOptions])

  const expenseAdditions = useMemo(() => {
    let total = 0
    for (const id of selectedAdditionIds) {
      const exp = expenseOptions.find((e) => e.id === id)
      if (exp) total += exp.amount
    }
    return total
  }, [selectedAdditionIds, expenseOptions])

  const netPayable = calcVendorInvoiceNetPayable(
    baseNumber,
    expenseDeductions,
    tdsRate,
    expenseAdditions,
  )

  useEffect(() => {
    if (!open) return
    void dispatch(fetchExpenses(projectId))
  }, [open, dispatch, projectId])

  useEffect(() => {
    if (!open) {
      setSelectedMilestoneId('')
      setInvoiceNumber('')
      setInvoiceDate('')
      setBaseAmount('')
      setDescription('')
      setDocumentUrl(undefined)
      setDocumentFileName(undefined)
      setSelectedDeductionIds(new Set())
      setSelectedAdditionIds(new Set())
      setTdsRate(DEFAULT_TDS_PERCENT)
      return
    }
    if (existingInvoice) {
      setSelectedMilestoneId(existingInvoice.milestoneId)
      setInvoiceNumber(existingInvoice.invoiceNumber)
      setInvoiceDate(existingInvoice.invoiceDate)
      setBaseAmount(String(existingInvoice.baseAmount))
      setDescription(existingInvoice.description ?? '')
      setDocumentUrl(existingInvoice.documentUrl)
      setDocumentFileName(existingInvoice.fileName)
      setSelectedDeductionIds(new Set(existingInvoice.linkedExpenseIds ?? []))
      setSelectedAdditionIds(new Set(existingInvoice.linkedAdditionExpenseIds ?? []))
      setTdsRate(existingInvoice.tdsRate)
      return
    }
    if (presetMilestoneId) {
      setSelectedMilestoneId(presetMilestoneId)
    } else {
      setSelectedMilestoneId('')
    }
  }, [open, presetMilestoneId, existingInvoice])

  useEffect(() => {
    if (!open || existingInvoice) return
    const vm = lockedMilestone ?? milestones.find((m) => m.id === selectedMilestoneId)
    if (vm && vm.value > 0) {
      setBaseAmount(String(vm.value))
    }
  }, [open, existingInvoice, lockedMilestone, selectedMilestoneId, milestones])

  function toggleDeduction(expenseId: string, checked: boolean) {
    setSelectedDeductionIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(expenseId)
      else next.delete(expenseId)
      return next
    })
    if (checked) {
      setSelectedAdditionIds((prev) => {
        if (!prev.has(expenseId)) return prev
        const next = new Set(prev)
        next.delete(expenseId)
        return next
      })
    }
  }

  function toggleAddition(expenseId: string, checked: boolean) {
    setSelectedAdditionIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(expenseId)
      else next.delete(expenseId)
      return next
    })
    if (checked) {
      setSelectedDeductionIds((prev) => {
        if (!prev.has(expenseId)) return prev
        const next = new Set(prev)
        next.delete(expenseId)
        return next
      })
    }
  }

  async function handleSubmit() {
    if (!context || milestones.length === 0) {
      toast.error('Missing vendor context')
      return
    }
    const vm = lockedMilestone ?? milestones.find((m) => m.id === selectedMilestoneId)
    if (!vm) {
      toast.error('Select a milestone')
      return
    }
    if (!invoiceNumber.trim() || !invoiceDate || !baseAmount.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    const base = Number(baseAmount)
    if (!Number.isFinite(base) || base <= 0) {
      toast.error('Enter a valid invoice amount')
      return
    }
    if (netPayable < 0) {
      toast.error('Expense deductions cannot exceed invoice amount plus additions')
      return
    }
    try {
      const payload = {
        vendorId: context.vendorId,
        vendorName: context.vendorName,
        serviceId: context.serviceId,
        serviceName: context.serviceName,
        milestoneId: vm.id,
        milestoneName: vm.name,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        baseAmount: base,
        description: description.trim() || undefined,
        gstRate: gstRateNumber,
        gstAmount,
        tdsRate,
        tdsAmount,
        linkedExpenseIds: [...selectedDeductionIds],
        expenseDeductions,
        linkedAdditionExpenseIds: [...selectedAdditionIds],
        expenseAdditions,
        netPayable,
        status: existingInvoice?.status ?? 'pending',
        documentUrl,
        fileName: documentFileName,
      }
      if (existingInvoice) {
        await dispatch(
          updateVendorInvoice({
            projectId,
            invoiceId: existingInvoice.id,
            data: payload,
          }),
        ).unwrap()
        toast.success('Vendor invoice updated')
      } else {
        await dispatch(
          uploadVendorInvoice({
            projectId,
            data: payload,
          }),
        ).unwrap()
        toast.success('Vendor invoice saved')
      }
      await dispatch(fetchVendorInvoices(projectId)).unwrap()
      await dispatch(fetchExpenses(projectId)).unwrap()
      onClose()
    } catch {
      toast.error('Failed to save vendor invoice')
    }
  }

  const resolvedVm = lockedMilestone ?? milestones.find((m) => m.id === selectedMilestoneId)
  const submitDisabled = saving || !context || milestones.length === 0 || !resolvedVm

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Edit Vendor Invoice' : 'Add Vendor Invoice'}
      subtitle={isEditMode ? 'Update vendor billing details' : 'Upload vendor billing details'}
      width={560}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Update Invoice' : 'Save Invoice'}
      submitLoading={saving}
      submitDisabled={submitDisabled}
    >
      <FormSection title="Vendor & scope" columns={2} divider={false}>
        <FormField label="Vendor Name">
          <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
            {context?.vendorName ?? '—'}
          </Typography>
        </FormField>
        <FormField label="Service Name">
          <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
            {context?.serviceName ?? '—'}
          </Typography>
        </FormField>
        {lockedMilestone ? (
          <FormField label="Milestone">
            <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
              {lockedMilestone.name} · ₹{formatCurrency(lockedMilestone.value)}
            </Typography>
          </FormField>
        ) : (
          <FormField label="Milestone" required hint="Only milestones without an uploaded invoice">
            <Select
              size="small"
              displayEmpty
              value={selectedMilestoneId}
              onChange={(e) => setSelectedMilestoneId(e.target.value)}
              fullWidth
              disabled={uninvoicedMilestones.length === 0}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                {uninvoicedMilestones.length === 0 ? 'No milestones available' : 'Select milestone'}
              </MenuItem>
              {uninvoicedMilestones.map((vm) => (
                <MenuItem key={vm.id} value={vm.id} sx={{ fontSize: 12 }}>
                  {vm.name} · ₹{formatCurrency(vm.value)}
                </MenuItem>
              ))}
            </Select>
          </FormField>
        )}
      </FormSection>

      <FormSection title="Invoice" columns={2}>
        <FormField label="Invoice Number" required>
          <Input value={invoiceNumber} onChange={(v) => setInvoiceNumber(v)} size="sm" />
        </FormField>
        <FormField label="Invoice Date" required>
          <Input type="date" value={invoiceDate} onChange={(v) => setInvoiceDate(v)} size="sm" />
        </FormField>
        <FormField label="Invoice Amount (₹)" required>
          <Input
            type="number"
            value={baseAmount}
            onChange={(v) => setBaseAmount(v)}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Description" hint="Optional">
            <Textarea
              placeholder="Enter invoice description..."
              value={description}
              onChange={setDescription}
              minRows={3}
              fullWidth
            />
          </FormField>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="TDS %" required hint={`Deduction · ₹${formatCurrency(tdsAmount)}`}>
            <Select
              size="small"
              fullWidth
              value={tdsRate}
              onChange={(e) => setTdsRate(Number(e.target.value))}
              sx={{ fontSize: 12 }}
            >
              {TDS_RATE_OPTIONS.map((rate) => (
                <MenuItem key={rate} value={rate} sx={{ fontSize: 12 }}>
                  {rate}%
                </MenuItem>
              ))}
            </Select>
          </FormField>
        </Box>
      </FormSection>

      <FormSection title="Document" columns={1}>
        <FileUpload
          accept="application/pdf,.pdf"
          maxFiles={1}
          label="Upload Invoice"
          onUpload={(files) => {
            const f = files[0]
            if (f) {
              setDocumentUrl(URL.createObjectURL(f))
              setDocumentFileName(f.name)
            } else {
              setDocumentUrl(undefined)
              setDocumentFileName(undefined)
            }
          }}
        />
      </FormSection>

      <FormSection title="Expense Additions" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: 11 }}>
            Select expenses that should be added to the invoice amount.
          </Typography>
        </Box>
        <ExpenseCheckboxCards
          expenses={expenseOptions}
          selectedIds={selectedAdditionIds}
          onToggle={toggleAddition}
          emptyMessage="No pending expenses available for addition."
        />
      </FormSection>

      <FormSection title="Expense Deductions" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: 11 }}>
            Select expenses that should be deducted from the invoice amount.
          </Typography>
        </Box>
        <ExpenseCheckboxCards
          expenses={expenseOptions}
          selectedIds={selectedDeductionIds}
          onToggle={toggleDeduction}
          emptyMessage="No pending expenses available for deduction."
        />
      </FormSection>

      <Divider sx={{ my: 1 }} />

      <Box
        sx={{
          p: 1.5,
          borderRadius: 1,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="overline" sx={{ fontSize: 10, letterSpacing: 0.6, display: 'block', mb: 1 }}>
          Payment Summary
        </Typography>
        <Stack gap={0.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12 }}>Invoice Amount</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              ₹{formatCurrency(baseNumber)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12 }}>Expense Additions</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              + ₹{formatCurrency(expenseAdditions)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12 }}>Expense Deductions</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              − ₹{formatCurrency(expenseDeductions)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              TDS ({tdsRate}%)
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              − ₹{formatCurrency(tdsAmount)}
            </Typography>
          </Stack>
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>Net Payable</Typography>
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>
              ₹{formatCurrency(netPayable)}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </DrawerForm>
  )
}
