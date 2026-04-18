import { useEffect, useMemo, useState } from 'react'
import { Box, MenuItem, Select, Typography } from '@mui/material'
import { DrawerForm, FormField, FormSection } from '@/components/templates/DrawerForm'
import { Button, FileUpload, Input, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendorInvoices, uploadVendorInvoice } from '@/slices/live/thunk'
import type { Baseline } from '@/slices/baseline/reducer'
import type { VendorMilestone } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  DEFAULT_TDS_PERCENT,
  findInvoiceForMilestone,
  findVendorMapping,
  invoiceMatchesRow,
  type VendorServiceRow,
} from './utils'

export function AddVendorInvoiceDrawer({
  open,
  projectId,
  context,
  presetMilestoneId,
  baseline,
  onClose,
}: {
  open: boolean
  projectId: string
  context: VendorServiceRow | null
  presetMilestoneId?: string
  baseline: Baseline | null
  onClose: () => void
}) {
  const dispatch = useAppDispatch()
  const { saving, vendorInvoices } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)

  const projectScopedInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const mapping = useMemo(() => {
    if (!context || !baseline) return undefined
    return findVendorMapping(baseline, context.vendorId, context.serviceId)
  }, [baseline, context])

  const uninvoicedMilestones = useMemo((): VendorMilestone[] => {
    if (!context || !mapping) return []
    const scoped = projectScopedInvoices.filter((inv) => invoiceMatchesRow(inv, context))
    return mapping.milestones.filter((vm) => !findInvoiceForMilestone(scoped, vm))
  }, [context, mapping, projectScopedInvoices])

  const lockedMilestone = useMemo(() => {
    if (!presetMilestoneId || !mapping) return undefined
    return mapping.milestones.find((m) => m.id === presetMilestoneId)
  }, [presetMilestoneId, mapping])

  useEffect(() => {
    if (!open) {
      setSelectedMilestoneId('')
      setInvoiceNumber('')
      setInvoiceDate('')
      setBaseAmount('')
      setDocumentUrl(undefined)
      return
    }
    if (presetMilestoneId) {
      setSelectedMilestoneId(presetMilestoneId)
    } else {
      setSelectedMilestoneId('')
    }
  }, [open, presetMilestoneId])

  async function handleSubmit() {
    if (!context || !mapping) {
      toast.error('Missing vendor context')
      return
    }
    const vm =
      lockedMilestone ??
      mapping.milestones.find((m) => m.id === selectedMilestoneId)
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
      toast.error('Enter a valid base amount')
      return
    }
    const tdsRate = DEFAULT_TDS_PERCENT
    const tdsAmount = Math.round((base * tdsRate) / 100)
    const netPayable = base - tdsAmount
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
            tdsRate,
            tdsAmount,
            netPayable,
            status: 'pending',
            documentUrl,
          },
        }),
      ).unwrap()
      toast.success('Vendor invoice added')
      await dispatch(fetchVendorInvoices(projectId)).unwrap()
      onClose()
    } catch {
      toast.error('Failed to save vendor invoice')
    }
  }

  const resolvedVm =
    lockedMilestone ?? mapping?.milestones.find((m) => m.id === selectedMilestoneId)
  const submitDisabled = saving || !context || !mapping || !resolvedVm

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Vendor Invoice"
      subtitle="Upload vendor billing details"
      width={520}
      onSubmit={handleSubmit}
      submitLabel="Save"
      submitLoading={saving}
      submitDisabled={submitDisabled}
    >
      <FormSection title="Vendor & scope" columns={1}>
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
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField
            label="Base Amount"
            required
            hint="TDS will be calculated automatically"
          >
            <Input
              type="number"
              value={baseAmount}
              onChange={(v) => setBaseAmount(v)}
              size="sm"
              startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
            />
          </FormField>
        </Box>
      </FormSection>
      <FormSection title="Document" columns={1}>
        <FileUpload
          accept="application/pdf,.pdf"
          maxFiles={1}
          label="Attach File (optional)"
          onUpload={(files) => {
            const f = files[0]
            setDocumentUrl(f ? `local://${f.name}` : undefined)
          }}
        />
      </FormSection>
    </DrawerForm>
  )
}
