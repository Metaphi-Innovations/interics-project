import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography, IconButton as MuiIconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import dayjs from 'dayjs'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import { AutocompleteField, Button, DatePicker, Input, Select, Textarea, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchVendors } from '@/slices/vendors/thunk'
import { createVendorInvoice, updateVendorInvoice } from '@/slices/payables/thunk'
import type { VendorInvoice, VendorInvoiceLineItem, VendorPO } from '@/slices/payables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { Vendor } from '@/slices/vendors/reducer'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'

function toIso(d: Date | null): string {
  if (!d) return ''
  return dayjs(d).format('YYYY-MM-DD')
}

function newLineId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export interface VendorInvoiceDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  invoice?: VendorInvoice | null
  onSaved: () => void
}

export function VendorInvoiceDrawer({ open, onClose, mode, invoice, onSaved }: VendorInvoiceDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.payables.saving)
  const projects = useAppSelector((s) => s.projects.items)
  const vendors = useAppSelector((s) => s.vendors.items)
  const purchaseOrders = useAppSelector((s) => s.payables.purchaseOrders)

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [vendorPoId, setVendorPoId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date())
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<VendorInvoiceLineItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lineError, setLineError] = useState('')

  const liveProjects = useMemo(() => projects.filter((p) => p.status === 'Live'), [projects])
  const activeVendors = useMemo(() => vendors.filter((v) => v.status === 'Active'), [vendors])

  const poOptions = useMemo(() => {
    if (!project || !vendor) return []
    return purchaseOrders.filter(
      (po) => po.projectId === project.id && po.vendorId === vendor.id && po.status === 'issued',
    )
  }, [purchaseOrders, project, vendor])

  useEffect(() => {
    if (!open) return
    dispatch(fetchProjects({}))
    dispatch(fetchVendors({}))
  }, [open, dispatch])

  useEffect(() => {
    if (!open || mode !== 'create') return
    setVendor(null)
    setProject(null)
    setVendorPoId('')
    setInvoiceDate(new Date())
    setDueDate(null)
    setNotes('')
    setLines([])
    setErrors({})
    setLineError('')
  }, [open, mode])

  useEffect(() => {
    if (!open || mode !== 'edit' || !invoice) return
    const v =
      activeVendors.find((x) => x.id === invoice.vendorId) ??
      ({
        id: invoice.vendorId,
        name: invoice.vendorName,
        type: 'Measurable',
        gstin: null,
        pan: null,
        gstStatus: 'Registered',
        contactPerson: '',
        phone: '',
        email: '',
        city: '',
        state: '',
        address: null,
        tags: [],
        notes: null,
        status: 'Active',
        activeProjects: 0,
        totalPayables: 0,
        createdAt: '',
      } as Vendor)
    const p =
      liveProjects.find((x) => x.id === invoice.projectId) ??
      ({
        id: invoice.projectId,
        name: invoice.projectName,
        customerId: '',
        customerName: '',
        projectCode: '',
        type: 'Design Only',
        status: 'Live',
        progress: '',
        location: '',
        carpetArea: null,
        headcount: null,
        projectManager: '',
        projectManagerId: '',
        startDate: null,
        expectedEndDate: null,
        projectValue: 0,
        totalClientPOValue: 0,
        totalVendorPOValue: 0,
        invoicedAmount: 0,
        paidVendorAmount: 0,
        createdAt: '',
      } as Project)
    setVendor(v)
    setProject(p)
    setVendorPoId(invoice.vendorPoId ?? '')
    setInvoiceDate(invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date())
    setDueDate(invoice.dueDate ? new Date(invoice.dueDate) : null)
    setNotes(invoice.notes ?? '')
    setLines(invoice.lineItems.map((l) => ({ ...l })))
    setErrors({})
    setLineError('')
  }, [open, mode, invoice?.id, activeVendors, liveProjects])

  const selectedPo = useMemo(
    () => purchaseOrders.find((p) => p.id === vendorPoId) ?? null,
    [purchaseOrders, vendorPoId],
  )

  const totalAmount = useMemo(() => lines.reduce((s, l) => s + l.amount, 0), [lines])

  function addLine() {
    setLines((prev) => [...prev, { id: newLineId(), name: '', amount: 0 }])
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function updateLine(id: string, patch: Partial<VendorInvoiceLineItem>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function validatePoCap(): string | null {
    if (!selectedPo) return null
    if (totalAmount > selectedPo.totalValue + 0.01) {
      return `Invoice total exceeds PO value (₹${formatInr(selectedPo.totalValue)})`
    }
    return null
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    let le = ''
    if (!vendor) e.vendor = 'Vendor is required'
    if (!project) e.project = 'Project is required'
    if (!invoiceDate) e.invoiceDate = 'Invoice date is required'
    if (!dueDate) e.dueDate = 'Due date is required'
    else if (invoiceDate && dueDate < invoiceDate) e.dueDate = 'Due date must be on or after invoice date'
    if (lines.length < 1) le = 'At least one line item is required'
    else if (lines.some((l) => !l.name.trim() || l.amount <= 0)) {
      le = 'Each line needs a name and amount greater than 0'
    }
    const cap = validatePoCap()
    if (cap) le = cap
    setLineError(le)
    setErrors(e)
    return Object.keys(e).length === 0 && !le
  }

  const buildPayload = useCallback(
    (receiveNow: boolean): Record<string, unknown> => ({
      vendorId: vendor!.id,
      vendorName: vendor!.name,
      projectId: project!.id,
      projectName: project!.name,
      vendorPoId: vendorPoId || undefined,
      poNo: selectedPo?.poNo,
      invoiceDate: toIso(invoiceDate),
      dueDate: toIso(dueDate),
      notes: notes.trim() || undefined,
      lineItems: lines.map((l, idx) => ({
        id: l.id.startsWith('tmp-') ? `vil-new-${idx}` : l.id,
        name: l.name,
        amount: l.amount,
      })),
      receiveNow,
    }),
    [vendor, project, vendorPoId, selectedPo, invoiceDate, dueDate, notes, lines],
  )

  async function handleSaveDraft() {
    if (!validate()) return
    try {
      if (mode === 'edit' && invoice) {
        await dispatch(updateVendorInvoice({ id: invoice.id, data: buildPayload(false) })).unwrap()
        showToast({ title: 'Invoice saved', variant: 'success' })
      } else {
        await dispatch(createVendorInvoice({ ...buildPayload(false), receiveNow: false })).unwrap()
        showToast({ title: 'Draft saved', variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  async function handleReceived() {
    if (!validate()) return
    try {
      if (mode === 'edit' && invoice) {
        await dispatch(updateVendorInvoice({ id: invoice.id, data: buildPayload(true) })).unwrap()
        showToast({ title: 'Marked as received', variant: 'success' })
      } else {
        await dispatch(createVendorInvoice({ ...buildPayload(true), receiveNow: true })).unwrap()
        showToast({ title: 'Invoice received', variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  const footer = (
    <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: '20px', py: '14px' }}>
      <Button variant="outlined" size="sm" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button variant="outlined" size="sm" onClick={handleSaveDraft} loading={saving} disabled={mode === 'edit' && invoice?.status !== 'draft'}>
        Save Draft
      </Button>
      <Button variant="contained" size="sm" onClick={handleReceived} loading={saving} disabled={mode === 'edit' && invoice?.status !== 'draft'}>
        Mark as Received
      </Button>
    </Stack>
  )

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? `Edit invoice — ${invoice?.invoiceNo ?? ''}` : 'Add Vendor Invoice'}
      subtitle="Creates a payable (liability)"
      width={620}
      footer={footer}
    >
      <Stack spacing={3}>
        <FormSection title="Basic info">
          <FormField label="Vendor" required error={errors.vendor}>
            <AutocompleteField<Vendor>
              options={activeVendors}
              value={vendor}
              onChange={(v) => {
                setVendor(v)
                setVendorPoId('')
              }}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              placeholder="Select vendor"
              disabled={mode === 'edit'}
            />
          </FormField>
          <FormField label="Project" required error={errors.project}>
            <AutocompleteField<Project>
              options={liveProjects}
              value={project}
              onChange={(p) => {
                setProject(p)
                setVendorPoId('')
              }}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              placeholder="Select project"
              disabled={mode === 'edit'}
            />
          </FormField>
          <FormField label="PO reference (optional)">
            <Select
              value={vendorPoId}
              onChange={(v) => setVendorPoId(String(v))}
              options={[
                { label: 'No PO link', value: '' },
                ...poOptions.map((po: VendorPO) => ({
                  label: `${po.poNo} — ₹${formatInr(po.totalValue)}`,
                  value: po.id,
                })),
              ]}
              fullWidth
              size="sm"
              disabled={!project || !vendor}
            />
          </FormField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormField label="Invoice date" required error={errors.invoiceDate}>
              <DatePicker value={invoiceDate} onChange={setInvoiceDate} fullWidth size="sm" />
            </FormField>
            <FormField label="Due date" required error={errors.dueDate}>
              <DatePicker value={dueDate} onChange={setDueDate} fullWidth size="sm" />
            </FormField>
          </Stack>
          <FormField label="Notes">
            <Textarea value={notes} onChange={setNotes} minRows={2} fullWidth />
          </FormField>
        </FormSection>

        <Box sx={{ mb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography
              component="span"
              variant="overline"
              sx={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', color: 'text.secondary' }}
            >
              Line items
            </Typography>
            <Button variant="outlined" size="sm" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={addLine}>
              Add row
            </Button>
          </Stack>
          {lineError ? (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
              {lineError}
            </Typography>
          ) : null}
          <Table size="small" sx={{ border: `1px solid ${tokens.color.neutral[200]}`, borderRadius: 1 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell sx={{ py: 1, verticalAlign: 'top' }}>
                    <Input value={l.name} onChange={(v) => updateLine(l.id, { name: v })} size="sm" placeholder="Description" />
                  </TableCell>
                  <TableCell sx={{ py: 1, verticalAlign: 'top', maxWidth: 120 }}>
                    <Input
                      type="number"
                      value={String(l.amount)}
                      onChange={(v) => updateLine(l.id, { amount: Number(v) || 0 })}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <MuiIconButton size="small" onClick={() => removeLine(l.id)} aria-label="Remove line">
                      <DeleteOutlineIcon fontSize="small" />
                    </MuiIconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: tokens.color.neutral[50],
            border: `1px solid ${tokens.color.neutral[200]}`,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={700}>
              Total amount
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              ₹{formatInr(totalAmount)}
            </Typography>
          </Stack>
          {selectedPo ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              PO cap: ₹{formatInr(selectedPo.totalValue)} — remaining headroom checked on save.
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </DrawerForm>
  )
}
