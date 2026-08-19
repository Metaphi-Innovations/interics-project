import { useCallback, useEffect, useMemo, useState } from 'react'
import { Stack, Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { DrawerForm, FormSection, FormField } from '@/components/templates'
import {
  AutocompleteField,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/design-system/components'
import { receivablesApi } from '@/api/receivablesApi'
import { dropdownsApi, type ProjectDropdownOption } from '@/api/dropdownsApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createInvoice, updateInvoice, sendInvoice } from '@/slices/receivables/thunk'
import { fetchClientPO, fetchClientPoById, fetchBaseline } from '@/slices/baseline/thunk'
import { fetchServices, fetchSACCodes } from '@/slices/settings/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
import type { Project } from '@/slices/projects/reducer'
import type { ClientPO } from '@/slices/baseline/reducer'
import { InvoiceLineItems, type DraftLineItem } from './InvoiceLineItems'
import {
  computeLineItemTaxBreakdown,
  rollupsFromLineItems,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import {
  flattenBaselineMilestones,
  flattenClientPoMilestones,
  milestoneBillStatus,
  remainingMilestoneValue,
  resolveServiceForLine,
  sacCodeForService,
  sumBilledPerMilestone,
} from '@/pages/Finance/utils/projectBillable'
import type { Service, SACCode } from '@/slices/settings/reducer'

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  return dayjs(d).format('YYYY-MM-DD')
}

function parsePaymentTermDays(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

function addDaysToDate(base: Date, days: number): Date {
  return dayjs(base).add(days, 'day').toDate()
}

function buildAutoDraftLines(
  selectedMilestoneIds: string[],
  sourceMilestones: ReturnType<typeof flattenClientPoMilestones>,
  projectInvoices: Invoice[],
  projectId: string,
  services: Service[],
  sacCodes: SACCode[],
): DraftLineItem[] {
  if (selectedMilestoneIds.length === 0) return []
  const mSet = new Set(selectedMilestoneIds)
  const billedM = sumBilledPerMilestone(projectInvoices, projectId)
  const out: DraftLineItem[] = []

  for (const m of sourceMilestones) {
    if (!mSet.has(m.milestoneId)) continue
    const billed = billedM.get(m.milestoneId) ?? 0
    const remaining = remainingMilestoneValue(billed, m.value)
    if (remaining <= 0) continue
    const settingsSvc = resolveServiceForLine(m.baselineServiceId, m.baselineServiceName, services)
    const sac = sacCodeForService(sacCodes, settingsSvc)
    const gstRate = settingsSvc?.gstRate ?? DEFAULT_GST_RATE
    const taxed = computeLineItemTaxBreakdown(remaining, 0, gstRate)
    out.push({
      id: `tmp-ms-${m.milestoneId}`,
      serviceId: settingsSvc?.id ?? m.baselineServiceId,
      serviceName: `${m.milestoneName} — ${m.baselineServiceName}`,
      sacCode: sac,
      amount: remaining,
      labourCessRate: 0,
      labourCessAmount: taxed.labourCessAmount,
      taxableAmount: taxed.taxableAmount,
      gstRate,
      gstAmount: taxed.gstAmount,
      milestoneId: m.milestoneId,
      baselineServiceId: m.baselineServiceId,
      lineSource: 'milestone',
      maxAmount: remaining,
    })
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

function dropdownOptionToProject(option: ProjectDropdownOption): Project {
  return stubProject({
    id: option.value,
    name: option.projectName || option.label,
    customerId: option.customerId,
    customerName: option.customerName,
    projectCode: option.projectCode,
  })
}

function stubProject(opts: {
  id: string
  name: string
  customerId: string
  customerName: string
  projectCode?: string
}): Project {
  return {
    id: opts.id,
    name: opts.name,
    customerId: opts.customerId,
    customerName: opts.customerName,
    projectCode: opts.projectCode ?? '',
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
}

type CreateInvoicePreset = {
  projectId: string
  projectName?: string
  clientId?: string
  clientName?: string
  clientPoId?: string
  milestoneId?: string
}

export interface CreateInvoiceDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  invoice?: Invoice | null
  onSaved: () => void
  preset?: CreateInvoicePreset | null
}

export function CreateInvoiceDrawer({ open, onClose, mode, invoice, onSaved, preset }: CreateInvoiceDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const saving = useAppSelector((s) => s.receivables.saving)
  const { services, sacCodes } = useAppSelector((s) => s.settings)
  const clientPOs = useAppSelector((s) => s.baseline.clientPOs)
  const baseline = useAppSelector((s) => s.baseline.baseline)
  const baselineLoading = useAppSelector((s) => s.baseline.loading)

  const [liveProjects, setLiveProjects] = useState<Project[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [selectedPoId, setSelectedPoId] = useState('')
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState<string[]>([])
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([])
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date())
  const [paymentTermDays, setPaymentTermDays] = useState('30')
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLineItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lineError, setLineError] = useState('')

  function applyDueDateFromTerms(nextInvoiceDate: Date | null, nextDays: string) {
    if (!nextInvoiceDate) return
    const days = parsePaymentTermDays(nextDays)
    if (days == null) return
    setDueDate(addDaysToDate(nextInvoiceDate, days))
  }

  function handleInvoiceDateChange(next: Date | null) {
    setInvoiceDate(next)
    if (errors.invoiceDate) setErrors((prev) => ({ ...prev, invoiceDate: '' }))
    applyDueDateFromTerms(next, paymentTermDays)
  }

  function handlePaymentTermDaysChange(value: string) {
    setPaymentTermDays(value)
    applyDueDateFromTerms(invoiceDate, value)
  }

  function handleDueDateChange(next: Date | null) {
    setDueDate(next)
    if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: '' }))
  }

  const presetProject = useMemo<Project | null>(() => {
    if (!preset?.projectId) return null
    return (
      liveProjects.find((p) => p.id === preset.projectId) ??
      stubProject({
        id: preset.projectId,
        name: preset.projectName ?? 'Project',
        customerId: preset.clientId ?? '',
        customerName: preset.clientName ?? '',
      })
    )
  }, [preset, liveProjects])

  const projectOptions = useMemo(() => {
    if (mode === 'edit' && invoice && !liveProjects.some((p) => p.id === invoice.projectId)) {
      return [
        stubProject({
          id: invoice.projectId,
          name: invoice.projectName,
          customerId: invoice.clientId,
          customerName: invoice.clientName,
        }),
        ...liveProjects,
      ]
    }
    if (mode === 'create' && presetProject && !liveProjects.some((p) => p.id === presetProject.id)) {
      return [presetProject, ...liveProjects]
    }
    return liveProjects
  }, [mode, invoice, liveProjects, presetProject])

  const projectPos = useMemo(
    () => (project ? clientPOs.filter((p) => p.projectId === project.id) : []),
    [clientPOs, project],
  )

  const selectedPo = useMemo(
    () => projectPos.find((p) => p.id === selectedPoId) ?? null,
    [projectPos, selectedPoId],
  )

  useEffect(() => {
    if (!open) return
    void dropdownsApi
      .getLiveProjects()
      .then((options) => setLiveProjects(options.map(dropdownOptionToProject)))
      .catch(() => setLiveProjects([]))
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
        setProjectInvoices(r.items ?? [])
      })
      .catch(() => setProjectInvoices([]))
  }, [open, project?.id, dispatch])

  useEffect(() => {
    if (!open || !project?.id || !selectedPoId) return
    void dispatch(fetchClientPoById({ projectId: project.id, poId: selectedPoId }))
  }, [open, project?.id, selectedPoId, dispatch])

  useEffect(() => {
    if (!open || mode !== 'create') return
    setProject(null)
    setSelectedPoId('')
    setSelectedMilestoneIds([])
    setLines([])
    setInvoiceDate(new Date())
    setPaymentTermDays('30')
    setDueDate(addDaysToDate(new Date(), 30))
    setNotes('')
    setErrors({})
    setLineError('')
  }, [open, mode, preset?.projectId, preset?.clientPoId, preset?.milestoneId])

  useEffect(() => {
    if (!open || mode !== 'create' || !preset?.projectId) return
    const p = presetProject
    if (!p) return
    setProject(p)
    setSelectedPoId(preset.clientPoId ?? '')
    if (preset.milestoneId) {
      setSelectedMilestoneIds([preset.milestoneId])
    }
  }, [open, mode, preset, presetProject])

  useEffect(() => {
    if (!open || mode !== 'edit' || !invoice) return
    const p =
      liveProjects.find((x) => x.id === invoice.projectId) ??
      stubProject({
        id: invoice.projectId,
        name: invoice.projectName,
        customerId: invoice.clientId,
        customerName: invoice.clientName,
      })
    setProject(p)
    setSelectedPoId(invoice.clientPoId ?? '')
    const nextInvoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date()
    const nextDueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
    setInvoiceDate(nextInvoiceDate)
    setDueDate(nextDueDate)
    if (nextInvoiceDate && nextDueDate) {
      const diff = dayjs(nextDueDate).startOf('day').diff(dayjs(nextInvoiceDate).startOf('day'), 'day')
      setPaymentTermDays(String(Math.max(0, diff)))
    } else {
      setPaymentTermDays('30')
    }
    setNotes(invoice.notes ?? '')
    setLines(invoiceLinesToDraft(invoice.lineItems))
    const ms = invoice.lineItems.map((l) => l.milestoneId).filter(Boolean) as string[]
    setSelectedMilestoneIds([...new Set(ms)])
    setErrors({})
    setLineError('')
  }, [open, mode, invoice?.id, liveProjects])

  const milestoneKey = selectedMilestoneIds.slice().sort().join(',')

  useEffect(() => {
    if (!open || mode !== 'create' || !project) return
    setLines((prev) => {
      const manual = prev.filter((l) => l.lineSource === 'manual')
      const auto = buildAutoDraftLines(
        selectedMilestoneIds,
        selectedPo ? flattenClientPoMilestones(selectedPo) : flattenBaselineMilestones(baseline),
        projectInvoices,
        project.id,
        services,
        sacCodes,
      )
      if (selectedMilestoneIds.length === 0) return manual
      return [...auto, ...manual]
    })
  }, [
    open,
    mode,
    project?.id,
    milestoneKey,
    selectedPo,
    baseline,
    projectInvoices,
    services,
    sacCodes,
  ])

  const onProjectChange = useCallback((p: Project | null) => {
    setProject(p)
    setSelectedPoId('')
    setSelectedMilestoneIds([])
    setLines([])
  }, [])

  const onPoChange = useCallback((value: string) => {
    setSelectedPoId(value)
    setSelectedMilestoneIds([])
    setLines((prev) => prev.filter((l) => l.lineSource === 'manual'))
  }, [])

  const toggleMilestone = (id: string) => {
    if (mode === 'edit') return
    setSelectedMilestoneIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const poMilestones = useMemo(() => flattenClientPoMilestones(selectedPo), [selectedPo])
  const flatMilestones = useMemo(
    () => (selectedPo ? poMilestones : flattenBaselineMilestones(baseline)),
    [selectedPo, poMilestones, baseline],
  )
  const billedByMilestone = useMemo(
    () => (project ? sumBilledPerMilestone(projectInvoices, project.id) : new Map()),
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
    }
    setLineError(le)
    setErrors(e)
    return Object.keys(e).length === 0 && !le
  }

  function buildPayload(sendNow: boolean): Record<string, unknown> {
    const payloadLines = lines.map((l, idx) => {
      const taxed = computeLineItemTaxBreakdown(l.amount, l.labourCessRate ?? 0, l.gstRate)
      return {
        id: l.id.startsWith('tmp-') ? `li-new-${idx}` : l.id,
        serviceId: l.serviceId,
        serviceName: l.serviceName,
        sacCode: l.sacCode,
        amount: l.amount,
        labourCessRate: l.labourCessRate ?? 0,
        labourCessAmount: taxed.labourCessAmount,
        taxableAmount: taxed.taxableAmount,
        gstRate: l.gstRate,
        gstAmount: taxed.gstAmount,
        milestoneId: l.milestoneId,
        baselineServiceId: l.baselineServiceId,
        lineSource: l.lineSource,
      }
    })
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
      milestoneId: selectedMilestoneIds[0] || payloadLines.find((l) => l.milestoneId)?.milestoneId,
      milestoneName:
        selectedMilestoneIds.length === 1
          ? flattenClientPoMilestones(selectedPo).find((m) => m.milestoneId === selectedMilestoneIds[0])
              ?.milestoneName
          : undefined,
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
  const roll = useMemo(
    () =>
      rollupsFromLineItems(
        lines.map((l) => ({
          id: l.id,
          serviceId: l.serviceId,
          serviceName: l.serviceName,
          sacCode: l.sacCode,
          amount: l.amount,
          labourCessRate: l.labourCessRate,
          labourCessAmount: l.labourCessAmount,
          taxableAmount: l.taxableAmount,
          gstRate: l.gstRate,
          gstAmount: l.gstAmount,
        })),
      ),
    [lines],
  )

  function formatLabourCessPercent(rate: number | null): string {
    if (rate === null) return '—'
    const rounded = Math.round(rate * 100) / 100
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`
  }

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
    { label: 'Select a client PO', value: '' },
    ...projectPos.map((po: ClientPO) => ({
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

        {project && (
          <FormSection title="PO selection">
            <FormField label="Client PO">
              <Select
                size="sm"
                placeholder="Select a client PO"
                value={selectedPoId}
                onChange={(v) => onPoChange(String(v))}
                options={poSelectOptions}
                fullWidth
                disabled={mode === 'edit'}
              />
            </FormField>
            {projectPos.length === 0 && !baselineLoading && (
              <Typography variant="body2" color="text.secondary">
                No client POs found for this project.
              </Typography>
            )}
          </FormSection>
        )}

        {project && (
          <FormSection title="Bill from project">
            {!selectedPoId && (
              <Typography variant="body2" color="text.secondary">
                Select a client PO to load its milestones.
              </Typography>
            )}
            {selectedPoId && baselineLoading && (
              <Typography variant="body2" color="text.secondary">
                Loading PO milestones…
              </Typography>
            )}
            {selectedPo && (
              <Stack spacing={2}>
                {flatMilestones.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No milestones found on this PO.
                  </Typography>
                ) : (
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
                            disabled={readOnlyPickers || rem <= 0}
                          />
                        )
                      })}
                    </Stack>
                  </Box>
                )}
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
            projectSourced={!!project && (!!selectedPo || !!baseline)}
            allowEmpty
            allowManualAdd={false}
            showLabourCessColumn
          />
        </FormSection>

        <FormSection title="Invoice details">
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormField label="Invoice date" required error={errors.invoiceDate}>
                <DatePicker value={invoiceDate} onChange={handleInvoiceDateChange} fullWidth size="sm" />
              </FormField>
              <FormField label="Due date" required error={errors.dueDate}>
                <DatePicker
                  value={dueDate}
                  onChange={handleDueDateChange}
                  minDate={minDue}
                  fullWidth
                  size="sm"
                />
              </FormField>
            </Stack>
            <FormField
              label="Payment Duration"
              required
              hint={!invoiceDate ? 'Select an invoice date first' : 'Number of days from invoice date'}
            >
              <Input
                type="number"
                value={paymentTermDays}
                onChange={handlePaymentTermDaysChange}
                placeholder="e.g. 30"
                size="sm"
                disabled={!invoiceDate}
              />
            </FormField>
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
                  ₹{formatInr(roll.baseAmount)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Labour cess (%)
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatLabourCessPercent(roll.labourCessRatePercent)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Labour cess amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(roll.labourCessAmount)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Taxable amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(roll.taxableAmount)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  GST amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{formatInr(roll.gstAmount)}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>
                  Final invoice amount
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  ₹{formatInr(roll.grossAmount)}
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
