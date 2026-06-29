import { useEffect, useMemo, useState } from 'react'
import { Box, Divider, MenuItem, Select, Stack, Typography } from '@mui/material'
import { DrawerForm, FormField, FormSection } from '@/components/templates/DrawerForm'
import { Checkbox, FileUpload, Input, useToast } from '@/design-system/components'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchVendorInvoices, uploadVendorInvoice } from '@/slices/live/thunk'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { VendorMilestone } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  DEFAULT_TDS_PERCENT,
  findInvoiceForMilestone,
  invoiceMatchesRow,
  resolveVendorMilestonesForRow,
  selectableProjectExpensesForInvoice,
  type VendorServiceRow,
} from './utils'

function gstOnBase(base: number, rate: number): number {
  return Math.round((base * rate) / 100)
}

export function AddVendorInvoiceDrawer({
  open,
  projectId,
  context,
  presetMilestoneId,
  baseline,
  vendorPOs = [],
  onClose,
}: {
  open: boolean
  projectId: string
  context: VendorServiceRow | null
  presetMilestoneId?: string
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
  const [gstRate, setGstRate] = useState(String(DEFAULT_GST_RATE))
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(() => new Set())

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

  const pendingExpenses = useMemo(
    () => selectableProjectExpensesForInvoice(expenses, projectId),
    [expenses, projectId],
  )

  const baseNumber = Number(baseAmount) || 0
  const gstRateNumber = Number(gstRate) || 0
  const gstAmount = gstOnBase(baseNumber, gstRateNumber)
  const tdsRate = DEFAULT_TDS_PERCENT
  const tdsAmount = Math.round((baseNumber * tdsRate) / 100)

  const expenseDeductions = useMemo(() => {
    let total = 0
    for (const id of selectedExpenseIds) {
      const exp = pendingExpenses.find((e) => e.id === id)
      if (exp) total += exp.amount
    }
    return total
  }, [selectedExpenseIds, pendingExpenses])

  const netPayable = Math.max(0, baseNumber - expenseDeductions - tdsAmount)

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
      setGstRate(String(DEFAULT_GST_RATE))
      setDocumentUrl(undefined)
      setSelectedExpenseIds(new Set())
      return
    }
    if (presetMilestoneId) {
      setSelectedMilestoneId(presetMilestoneId)
    } else {
      setSelectedMilestoneId('')
    }
  }, [open, presetMilestoneId])

  useEffect(() => {
    if (!open) return
    const vm = lockedMilestone ?? milestones.find((m) => m.id === selectedMilestoneId)
    if (vm && vm.value > 0) {
      setBaseAmount(String(vm.value))
    }
  }, [open, lockedMilestone, selectedMilestoneId, milestones])

  function toggleExpense(expenseId: string, checked: boolean) {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(expenseId)
      else next.delete(expenseId)
      return next
    })
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
      toast.error('Expense deductions cannot exceed the invoice amount')
      return
    }
    try {
      await dispatch(
        uploadVendorInvoice({
          projectId,
          data: {
            vendorId: context.vendorId,
            vendorName: context.vendorName,
            serviceId: context.serviceId,
            serviceName: context.serviceName,
            milestoneId: vm.id,
            milestoneName: vm.name,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate,
            baseAmount: base,
            gstRate: gstRateNumber,
            gstAmount,
            tdsRate,
            tdsAmount,
            linkedExpenseIds: [...selectedExpenseIds],
            expenseDeductions,
            netPayable,
            status: 'pending',
            documentUrl,
          },
        }),
      ).unwrap()
      toast.success('Vendor invoice saved')
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
      title="Add Vendor Invoice"
      subtitle="Upload vendor billing details"
      width={560}
      onSubmit={handleSubmit}
      submitLabel="Save Invoice"
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
        <FormField label="GST (%)" hint={`GST: ₹${formatCurrency(gstAmount)}`}>
          <Input type="number" value={gstRate} onChange={(v) => setGstRate(v)} size="sm" />
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="TDS" hint={`${tdsRate}% · ₹${formatCurrency(tdsAmount)}`}>
            <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
              Calculated automatically from invoice amount
            </Typography>
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
            setDocumentUrl(f ? `local://${f.name}` : undefined)
          }}
        />
      </FormSection>

      <FormSection title="Linked Expenses" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: 11 }}>
            Select pending project expenses to deduct from this invoice. Each expense can only be adjusted once.
          </Typography>
        </Box>
        {pendingExpenses.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 1 }}>
              No pending expenses available for adjustment.
            </Typography>
          </Box>
        ) : (
          pendingExpenses.map((exp) => (
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
                checked={selectedExpenseIds.has(exp.id)}
                onChange={(checked) => toggleExpense(exp.id, checked)}
              />
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, flexShrink: 0, ml: 1 }}>
                ₹{formatCurrency(exp.amount)}
              </Typography>
            </Stack>
          ))
        )}
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
            <Typography variant="body2" sx={{ fontSize: 12 }}>Expense Deductions</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
              − ₹{formatCurrency(expenseDeductions)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12 }}>TDS ({tdsRate}%)</Typography>
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
