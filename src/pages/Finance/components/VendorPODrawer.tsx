import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography, IconButton as MuiIconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import dayjs from 'dayjs'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import { AutocompleteField, Button, Checkbox, DatePicker, Input, Textarea, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchVendors } from '@/slices/vendors/thunk'
import { fetchBaseline } from '@/slices/baseline/thunk'
import { createPO, updateVendorPO, issueVendorPO } from '@/slices/payables/thunk'
import type { VendorPO, VendorPOLineItem } from '@/slices/payables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { Vendor } from '@/slices/vendors/reducer'
import { flattenBaselineServices } from '@/pages/Finance/utils/projectBillable'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'

function toIso(d: Date | null): string {
  if (!d) return ''
  return dayjs(d).format('YYYY-MM-DD')
}

function newLineId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export interface VendorPODrawerProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  purchaseOrder?: VendorPO | null
  onSaved: () => void
}

export function VendorPODrawer({ open, onClose, mode, purchaseOrder, onSaved }: VendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.payables.saving)
  const projects = useAppSelector((s) => s.projects.items)
  const vendors = useAppSelector((s) => s.vendors.items)
  const baseline = useAppSelector((s) => s.baseline.baseline)

  const [project, setProject] = useState<Project | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [poDate, setPoDate] = useState<Date | null>(new Date())
  const [validUntil, setValidUntil] = useState<Date | null>(null)
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [scopeIds, setScopeIds] = useState<string[]>([])
  const [lines, setLines] = useState<VendorPOLineItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const liveProjects = useMemo(() => projects.filter((p) => p.status === 'Live'), [projects])
  const activeVendors = useMemo(() => vendors.filter((v) => v.status === 'Active'), [vendors])

  const flatServices = useMemo(() => flattenBaselineServices(baseline), [baseline])

  useEffect(() => {
    if (!open) return
    dispatch(fetchProjects({}))
    dispatch(fetchVendors({}))
  }, [open, dispatch])

  useEffect(() => {
    if (!open || !project) return
    dispatch(fetchBaseline(project.id))
  }, [open, project?.id, dispatch])

  useEffect(() => {
    if (!open || mode !== 'create') return
    setProject(null)
    setVendor(null)
    setPoDate(new Date())
    setValidUntil(null)
    setPaymentTerms('')
    setNotes('')
    setScopeIds([])
    setLines([])
    setErrors({})
  }, [open, mode])

  useEffect(() => {
    if (!open || mode !== 'edit' || !purchaseOrder) return
    const p =
      liveProjects.find((x) => x.id === purchaseOrder.projectId) ??
      ({
        id: purchaseOrder.projectId,
        name: purchaseOrder.projectName,
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
    const v =
      activeVendors.find((x) => x.id === purchaseOrder.vendorId) ??
      ({
        id: purchaseOrder.vendorId,
        name: purchaseOrder.vendorName,
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
    setProject(p)
    setVendor(v)
    setPoDate(purchaseOrder.poDate ? new Date(purchaseOrder.poDate) : new Date())
    setValidUntil(purchaseOrder.validUntil ? new Date(purchaseOrder.validUntil) : null)
    setPaymentTerms(purchaseOrder.paymentTerms ?? '')
    setNotes(purchaseOrder.notes ?? '')
    setScopeIds(purchaseOrder.scopeBaselineServiceIds ?? [])
    setLines(purchaseOrder.lineItems.map((l) => ({ ...l })))
    setErrors({})
  }, [open, mode, purchaseOrder?.id, liveProjects, activeVendors])

  const totalValue = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.rate, 0),
    [lines],
  )

  const toggleScope = (id: string) => {
    setScopeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        serviceName: '',
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ])
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function updateLine(id: string, patch: Partial<VendorPOLineItem>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const next = { ...l, ...patch }
        next.amount = Math.round(next.quantity * next.rate * 100) / 100
        return next
      }),
    )
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!project) e.project = 'Project is required'
    if (!vendor) e.vendor = 'Vendor is required'
    if (!poDate) e.poDate = 'PO date is required'
    if (lines.length < 1) e.lines = 'Add at least one line item'
    else if (lines.some((l) => !l.serviceName.trim() || l.quantity <= 0 || l.rate < 0)) {
      e.lines = 'Each line needs a service name, quantity > 0, and rate ≥ 0'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = useCallback(
    (issueNow: boolean): Record<string, unknown> => ({
      projectId: project!.id,
      projectName: project!.name,
      vendorId: vendor!.id,
      vendorName: vendor!.name,
      poDate: toIso(poDate),
      validUntil: validUntil ? toIso(validUntil) : undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      notes: notes.trim() || undefined,
      scopeBaselineServiceIds: scopeIds.length ? scopeIds : undefined,
      lineItems: lines.map((l) => ({
        id: l.id.startsWith('tmp-') ? undefined : l.id,
        serviceName: l.serviceName,
        description: l.description,
        quantity: l.quantity,
        rate: l.rate,
        amount: Math.round(l.quantity * l.rate * 100) / 100,
      })),
      issueNow,
    }),
    [project, vendor, poDate, validUntil, paymentTerms, notes, scopeIds, lines],
  )

  async function handleSaveDraft() {
    if (!validate()) return
    try {
      if (mode === 'edit' && purchaseOrder) {
        await dispatch(
          updateVendorPO({ id: purchaseOrder.id, data: { ...buildPayload(false), issueNow: false } }),
        ).unwrap()
        showToast({ title: 'PO draft saved', variant: 'success' })
      } else {
        await dispatch(createPO({ ...buildPayload(false), issueNow: false })).unwrap()
        showToast({ title: 'PO draft saved', variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  async function handleIssue() {
    if (!validate()) return
    try {
      if (mode === 'edit' && purchaseOrder) {
        await dispatch(
          updateVendorPO({ id: purchaseOrder.id, data: { ...buildPayload(false), issueNow: false } }),
        ).unwrap()
        await dispatch(issueVendorPO(purchaseOrder.id)).unwrap()
        showToast({ title: 'PO issued', variant: 'success' })
      } else {
        await dispatch(createPO({ ...buildPayload(true), issueNow: true })).unwrap()
        showToast({ title: 'PO issued', variant: 'success' })
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
      <Button variant="outlined" size="sm" onClick={handleSaveDraft} loading={saving}>
        Save Draft
      </Button>
      <Button variant="contained" size="sm" onClick={handleIssue} loading={saving}>
        Issue PO
      </Button>
    </Stack>
  )

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? `Edit PO — ${purchaseOrder?.poNo ?? ''}` : 'Create Vendor PO'}
      subtitle="Project-linked cost commitment"
      width={620}
      footer={footer}
    >
      <Stack spacing={3}>
        <FormSection title="Basic info">
          <FormField label="Project" required error={errors.project}>
            <AutocompleteField<Project>
              options={liveProjects}
              value={project}
              onChange={(p) => {
                setProject(p)
                setScopeIds([])
              }}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              placeholder="Select project"
            />
          </FormField>
          <FormField label="Vendor" required error={errors.vendor}>
            <AutocompleteField<Vendor>
              options={activeVendors}
              value={vendor}
              onChange={setVendor}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              placeholder="Select vendor"
            />
          </FormField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormField label="PO date" required error={errors.poDate}>
              <DatePicker value={poDate} onChange={setPoDate} fullWidth size="sm" />
            </FormField>
            <FormField label="Valid until">
              <DatePicker value={validUntil} onChange={setValidUntil} fullWidth size="sm" />
            </FormField>
          </Stack>
          <FormField label="Payment terms">
            <Input value={paymentTerms} onChange={setPaymentTerms} fullWidth size="sm" placeholder="e.g. Net 30" />
          </FormField>
          <FormField label="Notes">
            <Textarea value={notes} onChange={setNotes} minRows={2} fullWidth />
          </FormField>
        </FormSection>

        <FormSection title="Scope (optional)" subtitle="Services / work types from project baseline">
          {!project ? (
            <Typography variant="body2" color="text.secondary">
              Select a project to load baseline services.
            </Typography>
          ) : flatServices.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No baseline services for this project.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {flatServices.map((s) => (
                <Stack key={s.baselineServiceId} direction="row" alignItems="center" gap={1}>
                  <Checkbox
                    checked={scopeIds.includes(s.baselineServiceId)}
                    onChange={() => toggleScope(s.baselineServiceId)}
                    label={s.name}
                  />
                </Stack>
              ))}
            </Stack>
          )}
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
          {errors.lines ? (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
              {errors.lines}
            </Typography>
          ) : null}
          <Table size="small" sx={{ border: `1px solid ${tokens.color.neutral[200]}`, borderRadius: 1 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Service / work</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Qty</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Rate</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell sx={{ py: 1, verticalAlign: 'top' }}>
                    <Input
                      value={l.serviceName}
                      onChange={(v) => updateLine(l.id, { serviceName: v })}
                      size="sm"
                      placeholder="Name"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, verticalAlign: 'top' }}>
                    <Input
                      value={l.description}
                      onChange={(v) => updateLine(l.id, { description: v })}
                      size="sm"
                      placeholder="Optional"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, verticalAlign: 'top', maxWidth: 88 }}>
                    <Input
                      type="number"
                      value={String(l.quantity)}
                      onChange={(v) => updateLine(l.id, { quantity: Number(v) || 0 })}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, verticalAlign: 'top', maxWidth: 100 }}>
                    <Input
                      type="number"
                      value={String(l.rate)}
                      onChange={(v) => updateLine(l.id, { rate: Number(v) || 0 })}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, fontSize: 12, fontWeight: 600, verticalAlign: 'middle' }}>
                    ₹{formatInr(l.quantity * l.rate)}
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
              Total PO value
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              ₹{formatInr(totalValue)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </DrawerForm>
  )
}
