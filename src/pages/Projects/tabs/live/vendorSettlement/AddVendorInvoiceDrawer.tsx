import { useEffect, useMemo, useState } from 'react'
import { Box, MenuItem, Select, Typography } from '@mui/material'
import { DrawerForm, FormField, FormSection } from '@/components/templates/DrawerForm'
import { DatePicker, dateFromIso, FileUpload, Input, isoFromDate, Textarea, useToast } from '@/design-system/components'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchVendorInvoices, updateVendorInvoice, uploadVendorInvoice } from '@/slices/live/thunk'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { VendorMilestone } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  DEFAULT_TDS_PERCENT,
  calcVendorInvoiceNetPayable,
  calcVendorInvoiceTdsAmount,
  findInvoiceForMilestone,
  invoiceMatchesRow,
  resolveVendorMilestonesForRow,
  TDS_RATE_OPTIONS,
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
  const { saving, vendorInvoices } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [description, setDescription] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)
  const [documentFileName, setDocumentFileName] = useState<string | undefined>(undefined)
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

  const baseNumber = Number(baseAmount) || 0
  const gstRateNumber = DEFAULT_GST_RATE
  const gstAmount = gstOnBase(baseNumber, gstRateNumber)
  const tdsAmount = calcVendorInvoiceTdsAmount(baseNumber, tdsRate)
  const expenseDeductions = 0
  const expenseAdditions = 0
  const netPayable = calcVendorInvoiceNetPayable(
    baseNumber,
    expenseDeductions,
    tdsRate,
    expenseAdditions,
  )

  useEffect(() => {
    if (!open) {
      setSelectedMilestoneId('')
      setInvoiceNumber('')
      setInvoiceDate('')
      setBaseAmount('')
      setDescription('')
      setDocumentUrl(undefined)
      setDocumentFileName(undefined)
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
      toast.error('Net payable cannot be negative')
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
        linkedExpenseIds: [] as string[],
        expenseDeductions,
        linkedAdditionExpenseIds: [] as string[],
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
      await dispatch(fetchExpenses({ projectId })).unwrap()
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
          <DatePicker
            value={dateFromIso(invoiceDate)}
            onChange={(d) => setInvoiceDate(isoFromDate(d))}
            fullWidth
            size="sm"
          />
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
    </DrawerForm>
  )
}
