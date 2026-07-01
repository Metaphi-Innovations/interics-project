import { useCallback, useEffect, useMemo, useState } from 'react'
import { Stack, Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import {
  AutocompleteField,
  Button,
  Checkbox,
  DatePicker,
  Select,
  Textarea,
  useToast,
} from '@/design-system/components'
import { receivablesApi } from '@/api/receivablesApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createInvoice, updateInvoice, sendInvoice } from '@/slices/receivables/thunk'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchClientPO, fetchBaseline } from '@/slices/baseline/thunk'
import { fetchServices, fetchSACCodes } from '@/slices/settings/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { ClientPO, Baseline } from '@/slices/baseline/reducer'
import { InvoiceLineItems, type DraftLineItem, computeGst } from './InvoiceLineItems'
import { computeLineItemTaxBreakdown } from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'
import {
  flattenBaselineMilestones,
  flattenBaselineServices,
  milestoneBillStatus,
  remainingMilestoneValue,
  remainingServiceValue,
  resolveServiceForBaseline,
  sacCodeForService,
  sumBilledPerBaselineService,
  sumBilledPerMilestone,
} from '@/pages/Finance/utils/projectBillable'
import type { Service, SACCode } from '@/slices/settings/reducer'

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  return dayjs(d).format('YYYY-MM-DD')
}

function buildAutoDraftLines(
  pickerAxis: 'milestones' | 'services' | null,
  selectedMilestoneIds: string[],
  selectedServiceIds: string[],
  baseline: Baseline | null,
  projectInvoices: Invoice[],
  projectId: string,
  services: Service[],
  sacCodes: SACCode[],
): DraftLineItem[] {
  if (!baseline || !pickerAxis) return []
  const mSet = new Set(selectedMilestoneIds)
  const sSet = new Set(selectedServiceIds)
  const billedM = sumBilledPerMilestone(projectInvoices, projectId)
  const billedS = sumBilledPerBaselineService(projectInvoices, projectId)
  const out: DraftLineItem[] = []

  if (pickerAxis === 'milestones') {
    for (const m of flattenBaselineMilestones(baseline)) {
      if (!mSet.has(m.milestoneId)) continue
      const billed = billedM.get(m.milestoneId) ?? 0
      const rem = remainingMilestoneValue(billed, m.value)
      const settingsSvc = resolveServiceForBaseline(m.baselineServiceName, services)
      if (!settingsSvc || rem <= 0) continue
      const sac = sacCodeForService(sacCodes, settingsSvc)
      const amt = rem
      const taxed = computeLineItemTaxBreakdown(amt, 0, settingsSvc.gstRate)
      out.push({
        id: `tmp-ms-${m.milestoneId}`,
        serviceId: settingsSvc.id,
        serviceName: `${m.milestoneName} — ${m.baselineServiceName}`,
        sacCode: sac,
        amount: amt,
        labourCessRate: 0,
        labourCessAmount: taxed.labourCessAmount,
        taxableAmount: taxed.taxableAmount,
        gstRate: settingsSvc.gstRate,
        gstAmount: taxed.gstAmount,
        milestoneId: m.milestoneId,
        baselineServiceId: m.baselineServiceId,
        lineSource: 'milestone',
        maxAmount: rem,
      })
    }
  } else {
    for (const s of flattenBaselineServices(baseline)) {
      if (!sSet.has(s.baselineServiceId)) continue
      const billed = billedS.get(s.baselineServiceId) ?? 0
      const rem = remainingServiceValue(billed, s.adjustedValue)
      const settingsSvc = resolveServiceForBaseline(s.name, services)
      if (!settingsSvc || rem <= 0) continue
      const sac = sacCodeForService(sacCodes, settingsSvc)
      const amt = rem
      const taxed = computeLineItemTaxBreakdown(amt, 0, settingsSvc.gstRate)
      out.push({
        id: `tmp-sv-${s.baselineServiceId}`,
        serviceId: settingsSvc.id,
        serviceName: s.name,
        sacCode: sac,
        amount: amt,
        labourCessRate: 0,
        labourCessAmount: taxed.labourCessAmount,
        taxableAmount: taxed.taxableAmount,
        gstRate: settingsSvc.gstRate,
        gstAmount: taxed.gstAmount,
        baselineServiceId: s.baselineServiceId,
        lineSource: 'service',
        maxAmount: rem,
      })
    }
  }
  return out
}

function invoiceLinesToDraft(items: Invoice['lineItems']): DraftLineItem[] {
  return items.map((li) => {
    const breakdown = computeLineItemTaxBreakdown(li.amount, li.labourCessRate ?? 0, li.gstRate)
    return {
      id: li.id,
      serviceId: li.serviceId,
      serviceName: li.serviceName,
      sacCode: li.sacCode,
      amount: li.amount,
      labourCessRate: li.labourCessRate ?? 0,
      labourCessAmount: li.labourCessAmount ?? breakdown.labourCessAmount,
      taxableAmount: li.taxableAmount ?? breakdown.taxableAmount,
      gstRate: li.gstRate,
      gstAmount: li.gstAmount,
      milestoneId: li.milestoneId,
      baselineServiceId: li.baselineServiceId,
      lineSource: li.lineSource ?? (li.milestoneId ? 'milestone' : li.baselineServiceId ? 'service' : 'manual'),
      maxAmount: undefined,
    }
  })
}

export interface CreateInvoiceDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  invoice?: Invoice | null
  onSaved: () => void
}

export function CreateInvoiceDrawer({ open, onClose, mode, invoice, onSaved }: CreateInvoiceDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.receivables.saving)
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const { services, sacCodes } = useAppSelector((s) => s.settings)
  const clientPOs = useAppSelector((s) => s.baseline.clientPOs)
  const baseline = useAppSelector((s) => s.baseline.baseline)
  const baselineLoading = useAppSelector((s) => s.baseline.loading)

  const [project, setProject] = useState<Project | null>(null)
  const [selectedPoId, setSelectedPoId] = useState('')
  const [pickerAxis, setPickerAxis] = useState<'milestones' | 'services' | null>(null)
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([])
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date())
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLineItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lineError, setLineError] = useState('')

  const liveProjects = useMemo(() => projects.filter((p) => p.status === 'Live'), [projects])

  const projectOptions = useMemo(() => {
    if (mode === 'edit' && invoice && !liveProjects.some((p) => p.id === invoice.projectId)) {
      const stub: Project = {
        id: invoice.projectId,
        name: invoice.projectName,
        customerId: invoice.clientId,
        customerName: invoice.clientName,
        projectCode: '',
        projectTypes: [],
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
      }
      return [stub, ...liveProjects]
    }
    return liveProjects
  }, [mode, invoice, liveProjects])

  const selectedPo = useMemo(
    () => clientPOs.find((p) => p.id === selectedPoId) ?? null,
    [clientPOs, selectedPoId],
  )

  useEffect(() => {
    if (!open) return
    dispatch(fetchProjects({}))
    dispatch(fetchServices())
    dispatch(fetchSACCodes())
  }, [open, dispatch])

  useEffect(() => {
    if (!open || !project) {
      setProjectInvoices([])
      return
    }
    dispatch(fetchClientPO(project.id))
    dispatch(fetchBaseline(project.id))
    void receivablesApi
      .getAll({ projectId: project.id, pageSize: 500 })
      .then((r) => {
        const data = r.data as { items: Invoice[] }
        setProjectInvoices(data.items ?? [])
      })
      .catch(() => setProjectInvoices([]))
  }, [open, project?.id, dispatch])

  useEffect(() => {
    if (!open || mode !== 'create') return
    setProject(null)
    setSelectedPoId('')
    setPickerAxis(null)
    setSelectedMilestoneIds([])
    setSelectedServiceIds([])
    setLines([])
    setInvoiceDate(new Date())
    setDueDate(null)
    setNotes('')
    setErrors({})
    setLineError('')
  }, [open, mode])

  useEffect(() => {
    if (!open || mode !== 'edit' || !invoice) return
    const p =
      projects.find((x) => x.id === invoice.projectId) ??
      ({
        id: invoice.projectId,
        name: invoice.projectName,
        customerId: invoice.clientId,
        customerName: invoice.clientName,
        projectCode: '',
        projectTypes: [],
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
    setProject(p)
    setSelectedPoId(invoice.clientPoId ?? '')
    setInvoiceDate(invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date())
    setDueDate(invoice.dueDate ? new Date(invoice.dueDate) : null)
    setNotes(invoice.notes ?? '')
    setLines(invoiceLinesToDraft(invoice.lineItems))
    const ms = invoice.lineItems.map((l) => l.milestoneId).filter(Boolean) as string[]
    const bs = invoice.lineItems
      .filter((l) => l.lineSource === 'service' && l.baselineServiceId)
      .map((l) => l.baselineServiceId!) 
    if (ms.length) {
      setPickerAxis('milestones')
      setSelectedMilestoneIds([...new Set(ms)])
      setSelectedServiceIds([])
    } else if (bs.length) {
      setPickerAxis('services')
      setSelectedServiceIds([...new Set(bs)])
      setSelectedMilestoneIds([])
    } else {
      setPickerAxis(null)
      setSelectedMilestoneIds([])
      setSelectedServiceIds([])
    }
    setErrors({})
    setLineError('')
  }, [open, mode, invoice?.id, projects])

  const milestoneKey = selectedMilestoneIds.slice().sort().join(',')
  const serviceKey = selectedServiceIds.slice().sort().join(',')

  useEffect(() => {
    if (!open || mode !== 'create' || !project) return
    setLines((prev) => {
      const manual = prev.filter((l) => l.lineSource === 'manual')
      const auto = buildAutoDraftLines(
        pickerAxis,
        selectedMilestoneIds,
        selectedServiceIds,
        baseline,
        projectInvoices,
        project.id,
        services,
        sacCodes,
      )
      if (pickerAxis === null) return manual
      return [...auto, ...manual]
    })
  }, [
    open,
    mode,
    project?.id,
    pickerAxis,
    milestoneKey,
    serviceKey,
    baseline,
    projectInvoices,
    services,
    sacCodes,
  ])

  const onProjectChange = useCallback((p: Project | null) => {
    setProject(p)
    setSelectedPoId('')
    setPickerAxis(null)
    setSelectedMilestoneIds([])
    setSelectedServiceIds([])
    setLines([])
  }, [])

  const toggleMilestone = (id: string) => {
    if (mode === 'edit') return
    setSelectedServiceIds([])
    setSelectedMilestoneIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setPickerAxis(next.length ? 'milestones' : null)
      return next
    })
  }

  const toggleService = (id: string) => {
    if (mode === 'edit') return
    setSelectedMilestoneIds([])
    setSelectedServiceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setPickerAxis(next.length ? 'services' : null)
      return next
    })
  }

  const flatMilestones = useMemo(() => flattenBaselineMilestones(baseline), [baseline])
  const flatServices = useMemo(() => flattenBaselineServices(baseline), [baseline])
  const billedByMilestone = useMemo(
    () => (project ? sumBilledPerMilestone(projectInvoices, project.id) : new Map()),
    [project, projectInvoices],
  )
  const billedByService = useMemo(
    () => (project ? sumBilledPerBaselineService(projectInvoices, project.id) : new Map()),
    [project, projectInvoices],
  )

  function validate(): boolean {
    const e: Record<string, string> = {}
    let le = ''
    if (!project) e.project = 'Project is required'
    if (!invoiceDate) e.invoiceDate = 'Invoice date is required'
    if (!dueDate) e.dueDate = 'Due date is required'
    else if (invoiceDate && dueDate < invoiceDate) e.dueDate = 'Due date must be on or after invoice date'
    if (lines.length < 1) le = 'At least one line item is required'
    else if (lines.some((l) => !l.serviceId || l.amount <= 0)) {
      le = 'Each line needs a service and amount greater than 0'
    } else if (
      lines.some(
        (l) => l.maxAmount !== undefined && l.maxAmount >= 0 && l.amount > l.maxAmount + 0.01,
      )
    ) {
      le = 'One or more amounts exceed the allowed maximum for that milestone or service'
    }
    if (selectedPo && project) {
      const used = projectInvoices
        .filter((i) => i.clientPoId === selectedPo.id && i.id !== invoice?.id)
        .reduce((s, i) => s + i.totalAmount, 0)
      const draftTotal = lines.reduce((s, l) => s + l.amount + computeGst(l.amount, l.gstRate), 0)
      if (used + draftTotal > selectedPo.poValue + 0.01) {
        le = `Total exceeds PO value (₹${formatInr(selectedPo.poValue)} less ₹${formatInr(used)} already invoiced on this PO)`
      }
    }
    setLineError(le)
    setErrors(e)
    return Object.keys(e).length === 0 && !le
  }

  function buildPayload(sendNow: boolean): Record<string, unknown> {
    const payloadLines = lines.map((l, idx) => ({
      id: l.id.startsWith('tmp-') ? `li-new-${idx}` : l.id,
      serviceId: l.serviceId,
      serviceName: l.serviceName,
      sacCode: l.sacCode,
      amount: l.amount,
      gstRate: l.gstRate,
      gstAmount: computeGst(l.amount, l.gstRate),
      milestoneId: l.milestoneId,
      baselineServiceId: l.baselineServiceId,
      lineSource: l.lineSource,
    }))
    return {
      clientId: project!.customerId,
      clientName: project!.customerName,
      projectId: project!.id,
      projectName: project!.name,
      invoiceDate: toIsoDate(invoiceDate),
      dueDate: toIsoDate(dueDate),
      notes: notes.trim() || undefined,
      lineItems: payloadLines,
      sendNow,
      clientPoId: selectedPoId || undefined,
    }
  }

  async function handleSaveDraft() {
    if (!validate()) return
    try {
      if (mode === 'edit' && invoice) {
        await dispatch(updateInvoice({ id: invoice.id, data: buildPayload(false) })).unwrap()
        showToast({ title: 'Invoice saved', variant: 'success' })
      } else {
        await dispatch(createInvoice(buildPayload(false))).unwrap()
        showToast({ title: 'Draft saved', variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  async function handleSaveSend() {
    if (!validate()) return
    try {
      let invId = invoice?.id;
      if (mode === 'edit' && invoice) {
        const result = await dispatch(updateInvoice({ id: invoice.id, data: buildPayload(false) })).unwrap()
        invId = result.id || invoice.id;
      } else {
        const result = await dispatch(createInvoice(buildPayload(false))).unwrap()
        invId = result.id;
      }
      
      if (invId) {
        await dispatch(sendInvoice(invId)).unwrap()
        showToast({ title: mode === 'edit' ? 'Invoice updated and sent' : 'Invoice created and sent', variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err) {
      showToast({ title: String(err), variant: 'error' })
    }
  }

  const minDue = invoiceDate ?? undefined
  const baseTotal = lines.reduce((s, l) => s + l.amount, 0)
  const gstTotal = lines.reduce((s, l) => s + l.gstAmount, 0)
  const invoiceTotal = baseTotal + gstTotal

  const footer = (
    <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 5, py: 3.5 }}>
      <Button variant="outlined" size="sm" onClick={handleSaveDraft} loading={saving} label="Draft invoice" />
      <Button variant="contained" size="sm" onClick={handleSaveSend} loading={saving} label="Save" />
    </Stack>
  )

  const headerSubtitle =
    mode === 'edit' && invoice ? (
      <Stack spacing={0.25}>
        <Typography variant="body2" color="text.secondary">
          {invoice.clientName} · {invoice.projectName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {invoice.invoiceNo}
        </Typography>
      </Stack>
    ) : null

  const poSelectOptions: { label: string; value: string }[] = [
    { label: 'No PO (optional)', value: '' },
    ...clientPOs.map((po: ClientPO) => ({
      label: `${po.poNumber} — ₹${formatInr(po.poValue)} (${po.startDate} → ${po.endDate})`,
      value: po.id,
    })),
  ]

  const readOnlyPickers = mode === 'edit'

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Invoice' : 'Create Invoice'}
      hideHeaderDivider
      headerSx={{ py: 1.5, alignItems: 'center' }}
      width={600}
      footer={footer}
    >
      <Stack spacing={3} sx={{ pt: 1 }}>
        {headerSubtitle && <Box>{headerSubtitle}</Box>}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: -1 }}
        >
          <Typography
            variant="overline"
            sx={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.8px',
              color: 'text.secondary',
              textTransform: 'uppercase',
            }}
          >
            Project selection
          </Typography>
          <Button
            variant="outlined"
            size="sm"
            onClick={() =>
              showToast({
                title: invoice ? 'PDF download (placeholder)' : 'Draft preview download (placeholder)',
                variant: 'success',
              })
            }
            label="Download PDF"
          />
        </Stack>
        <FormSection title="" divider={false}>
          <Stack spacing={2}>
            <FormField label="Project" required error={errors.project}>
              <AutocompleteField<Project>
                options={projectOptions}
                getOptionLabel={(o) => (o.projectCode ? `${o.name} (${o.projectCode})` : o.name)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={project}
                onChange={onProjectChange}
                disabled={mode === 'edit'}
                placeholder="Search live project"
                error={!!errors.project}
                size="sm"
              />
            </FormField>
            {project && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: tokens.color.neutral[50],
                  border: `1px solid ${tokens.color.neutral[200]}`,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  Client
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {project.customerName}
                </Typography>
              </Box>
            )}
          </Stack>
        </FormSection>

        {project && clientPOs.length > 0 && (
          <FormSection title="PO selection">
            <FormField label="Client PO">
              <Select
                size="sm"
                placeholder="Optional"
                value={selectedPoId}
                onChange={(v) => setSelectedPoId(String(v))}
                options={poSelectOptions}
                fullWidth
                disabled={mode === 'edit'}
              />
            </FormField>
          </FormSection>
        )}

        {project && (
          <FormSection title="Bill from project">
            {!baseline && !baselineLoading && (
              <Typography variant="body2" color="text.secondary">
                No locked baseline — project billing setup incomplete. Use a manual line if allowed below.
              </Typography>
            )}
            {baselineLoading && (
              <Typography variant="body2" color="text.secondary">
                Loading baseline…
              </Typography>
            )}
            {baseline && (
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Select milestones or services (not both). Picking one clears the other.
                </Typography>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Milestones
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {flatMilestones.map((m) => {
                      const billed = billedByMilestone.get(m.milestoneId) ?? 0
                      const rem = remainingMilestoneValue(billed, m.value)
                      const st = milestoneBillStatus(billed, m.value)
                      return (
                        <Checkbox
                          key={m.milestoneId}
                          size="sm"
                          label={`${m.milestoneName} — ${m.baselineServiceName} · ₹${formatInr(m.value)} · Remaining ₹${formatInr(rem)} · ${st}`}
                          checked={selectedMilestoneIds.includes(m.milestoneId)}
                          onChange={() => toggleMilestone(m.milestoneId)}
                          disabled={readOnlyPickers || pickerAxis === 'services' || rem <= 0}
                        />
                      )
                    })}
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Services
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {flatServices.map((s) => {
                      const billed = billedByService.get(s.baselineServiceId) ?? 0
                      const rem = remainingServiceValue(billed, s.adjustedValue)
                      return (
                        <Checkbox
                          key={s.baselineServiceId}
                          size="sm"
                          label={`${s.name} · Remaining ₹${formatInr(rem)}`}
                          checked={selectedServiceIds.includes(s.baselineServiceId)}
                          onChange={() => toggleService(s.baselineServiceId)}
                          disabled={readOnlyPickers || pickerAxis === 'milestones' || rem <= 0}
                        />
                      )
                    })}
                  </Stack>
                </Box>
              </Stack>
            )}
          </FormSection>
        )}

        <FormSection title="Line items">
          <InvoiceLineItems
            mode="edit"
            lines={lines}
            services={services}
            sacCodes={sacCodes}
            onChange={setLines}
            error={lineError}
            projectSourced={!!project && !!baseline}
            allowEmpty
            manualAddCollapsed
          />
        </FormSection>

        <FormSection title="Invoice details">
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormField label="Invoice date" required error={errors.invoiceDate}>
                <DatePicker value={invoiceDate} onChange={setInvoiceDate} fullWidth size="sm" />
              </FormField>
              <FormField label="Due date" required error={errors.dueDate}>
                <DatePicker value={dueDate} onChange={setDueDate} minDate={minDue} fullWidth size="sm" />
              </FormField>
            </Stack>
            <FormField label="Notes">
              <Textarea
                minRows={2}
                fullWidth
                value={notes}
                onChange={setNotes}
                placeholder="Optional notes"
              />
            </FormField>
          </Stack>
        </FormSection>

        <FormSection title="Summary" divider={false}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${tokens.color.neutral[200]}`,
              bgcolor: tokens.color.neutral[50],
            }}
          >
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Base amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(baseTotal)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  + GST
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(gstTotal)}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>
                  Invoice total
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  ₹{formatInr(invoiceTotal)}
                </Typography>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              TDS will be captured during payment.
            </Typography>
          </Box>
        </FormSection>
      </Stack>
    </DrawerForm>
  )
}
