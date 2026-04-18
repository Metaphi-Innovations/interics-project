import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Grid,
  Divider,
  Chip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ArrowRight } from 'lucide-react'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField } from '../../../../components/templates/DrawerForm'
import {
  StatusBadge,
  Input,
  Button,
  DatePicker,
  Textarea,
  useToast,
} from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { DEFAULT_GST_RATE, DEFAULT_TDS_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createInvoice, fetchInvoices } from '../../../../slices/live/thunk'
import type { ClientInvoice, ClientInvoiceLineItem } from '../../../../slices/live/types'
import { formatDate, formatInr } from '../../../../utils/formatters'
import { BILLABLE_BY_PROJECT, type BillableMilestone } from './billableMilestones'
import {
  InvoiceLineItems,
  computeGst,
  type DraftLineItem,
} from '@/pages/Finance/components/InvoiceLineItems'
import { sacCodeForService } from '@/pages/Finance/utils/projectBillable'
import { fetchServices, fetchSACCodes } from '@/slices/settings/thunk'
import { RecordClientInvoicePaymentModal } from './RecordClientInvoicePaymentModal'
import {
  balancePending,
  isDueDateOverdue,
  MONEY_EPS,
  rollupsFromLineItems,
  totalReceivedBank,
  totalTdsFromPayments,
} from './clientInvoiceUtils'

function milestoneRowKey(m: Pick<BillableMilestone, 'milestoneId' | 'serviceId'>): string {
  return `${m.milestoneId}:${m.serviceId}`
}

function findInvoiceForMilestone(
  invoices: ClientInvoice[],
  m: Pick<BillableMilestone, 'milestoneId' | 'serviceId'>,
): ClientInvoice | undefined {
  return invoices.find((i) => i.milestoneId === m.milestoneId && i.serviceId === m.serviceId)
}

function hasInvoiceForMilestone(invoices: ClientInvoice[], m: BillableMilestone): boolean {
  return findInvoiceForMilestone(invoices, m) != null
}

function gstOnBase(base: number, rate: number): number {
  return Math.round((base * rate) / 100)
}

function tdsOnBase(base: number, rate: number): number {
  return Math.round((base * rate) / 100)
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

type MilestoneBillPhase = 'not_invoiced' | 'invoiced' | 'overdue' | 'paid'

function milestoneBillPhase(inv: ClientInvoice | undefined): MilestoneBillPhase {
  if (!inv) return 'not_invoiced'
  if (inv.status === 'paid' || balancePending(inv) <= MONEY_EPS) return 'paid'
  if (isDueDateOverdue(inv.dueDate) && balancePending(inv) > MONEY_EPS) return 'overdue'
  return 'invoiced'
}

function milestoneStatusBadge(phase: MilestoneBillPhase): { type: StatusType; label: string } {
  switch (phase) {
    case 'not_invoiced':
      return { type: 'draft', label: 'Not Invoiced' }
    case 'invoiced':
      return { type: 'sent', label: 'Invoiced' }
    case 'paid':
      return { type: 'paid', label: 'Paid' }
    case 'overdue':
      return { type: 'overdue', label: 'Overdue' }
  }
}

function invoiceRowBadge(inv: ClientInvoice): { type: StatusType; label: string } {
  if (inv.status === 'paid' || balancePending(inv) <= MONEY_EPS) return { type: 'paid', label: 'Paid' }
  if (inv.status === 'draft') return { type: 'invoice_draft', label: 'Draft' }
  const overdue = isDueDateOverdue(inv.dueDate) && balancePending(inv) > MONEY_EPS
  if (overdue) return { type: 'overdue', label: 'Overdue' }
  if (inv.status === 'partially_paid') return { type: 'partially_paid', label: 'Partially Paid' }
  return { type: 'sent', label: 'Invoiced' }
}

const SECTION_HEADER_SX = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'text.secondary',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
}

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: 1.5,
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: 1.5,
  px: 2,
}

function SectionHeader({ children }: { children: string }) {
  return (
    <Typography variant="caption" component="div" sx={SECTION_HEADER_SX}>
      {children}
    </Typography>
  )
}

function AmountBreakdownColumn({
  base,
  gstRate,
  gstAmount,
  gross,
}: {
  base: number
  gstRate: number
  gstAmount: number
  gross: number
}) {
  return (
    <Stack gap={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Base: ₹{formatInr(base)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        GST ({gstRate}%): +₹{formatInr(gstAmount)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Gross: ₹{formatInr(gross)}
      </Typography>
    </Stack>
  )
}

function TdsColumn({
  tdsLabel,
  tdsAmount,
  netReceivable,
}: {
  tdsLabel: string
  tdsAmount: number
  netReceivable: number
}) {
  return (
    <Stack gap={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {tdsLabel}: −₹{formatInr(tdsAmount)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
        Net Receivable: ₹{formatInr(netReceivable)}
      </Typography>
    </Stack>
  )
}

function ReadOnlySummaryRow({
  label,
  value,
  valueSx,
}: {
  label: string
  value: string
  valueSx?: object
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', pl: 2, ...valueSx }}>
        {value}
      </Typography>
    </Stack>
  )
}

function lineItemsToPayload(lines: DraftLineItem[]): ClientInvoiceLineItem[] {
  return lines.map((li) => ({
    id: li.id,
    serviceId: li.serviceId,
    serviceName: li.serviceName,
    sacCode: li.sacCode || '—',
    amount: li.amount,
    gstRate: li.gstRate,
    gstAmount: li.gstAmount,
    milestoneId: li.milestoneId,
    lineSource: li.lineSource === 'manual' ? 'manual' : 'milestone',
  }))
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ invoices }: { invoices: ClientInvoice[] }) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.grossAmount, 0)
  const received = invoices.reduce((s, i) => s + totalReceivedBank(i.payments), 0)
  const outstanding = invoices.reduce((s, i) => s + balancePending(i), 0)
  const tds = invoices.reduce((s, i) => s + totalTdsFromPayments(i.payments), 0)

  const metrics = [
    { label: 'TOTAL INVOICED', value: totalInvoiced },
    { label: 'RECEIVED', value: received, highlight: true },
    {
      label: 'OUTSTANDING',
      value: outstanding,
      color: outstanding > MONEY_EPS ? 'warning.main' : 'success.main',
    },
    { label: 'TDS DEDUCTED', value: tds },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 2,
      }}
    >
      {metrics.map((m) => (
        <Box
          key={m.label}
          sx={{
            p: 2,
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: m.highlight ? tokens.color.primary[50] : 'background.paper',
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
          >
            {m.label}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: 15,
              mt: 0.25,
              color: m.color ?? (m.highlight ? 'primary.main' : 'text.primary'),
            }}
          >
            ₹{formatInr(m.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Generate Invoice Drawer ─────────────────────────────────────────────────

interface GenerateDrawerProps {
  open: boolean
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  preset: BillableMilestone | null
  onClose: () => void
}

function GenerateInvoiceDrawer({
  open,
  projectId,
  projectName,
  clientId,
  clientName,
  preset,
  onClose,
}: GenerateDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const { services, sacCodes } = useAppSelector((s) => s.settings)
  const showToast = useToast((s) => s.showToast)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLineItem[]>([])

  useEffect(() => {
    if (!open || !preset) return
    setInvoiceNumber('')
    setInvoiceDate(new Date())
    setDueDate(null)
    setNotes('')
    const svc = services.find((s) => s.id === preset.serviceId)
    const sac = sacCodeForService(sacCodes, svc)
    const gstRate = svc?.gstRate ?? DEFAULT_GST_RATE
    const amount = preset.baseAmount
    const gstAmount = computeGst(amount, gstRate)
    setLines([
      {
        id: `tmp-${preset.milestoneId}-${preset.serviceId}`,
        serviceId: preset.serviceId,
        serviceName: preset.serviceName,
        sacCode: sac || '—',
        amount,
        gstRate,
        gstAmount,
        milestoneId: preset.milestoneId,
        lineSource: 'milestone',
      },
    ])
  }, [open, preset, services, sacCodes])

  const roll = useMemo(() => {
    const items: ClientInvoiceLineItem[] = lines.map((li) => ({
      id: li.id,
      serviceId: li.serviceId,
      serviceName: li.serviceName,
      sacCode: li.sacCode || '—',
      amount: li.amount,
      gstRate: li.gstRate,
      gstAmount: li.gstAmount,
      milestoneId: li.milestoneId,
      lineSource: li.lineSource === 'manual' ? 'manual' : 'milestone',
    }))
    return rollupsFromLineItems(items)
  }, [lines])

  async function handleSubmit() {
    if (!preset) return
    const invDate = toIsoDate(invoiceDate)
    const due = toIsoDate(dueDate)
    if (!invoiceNumber.trim() || !invDate || !due) {
      showToast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (!lines.length || lines.some((l) => !l.serviceId || l.amount <= 0)) {
      showToast({ title: 'Add at least one valid line item', variant: 'error' })
      return
    }
    try {
      await dispatch(
        createInvoice({
          projectId,
          projectName,
          clientId,
          clientName,
          sendNow: true,
          data: {
            milestoneId: preset.milestoneId,
            milestoneName: preset.milestoneName,
            serviceId: preset.serviceId,
            serviceName: preset.serviceName,
            lineItems: lineItemsToPayload(lines),
            baseAmount: roll.baseAmount,
            gstAmount: roll.gstAmount,
            grossAmount: roll.grossAmount,
            tdsAmount: 0,
            netReceivable: roll.grossAmount,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate: invDate,
            dueDate: due,
            status: 'sent',
            payments: [],
            notes: notes.trim() || undefined,
          },
        }),
      ).unwrap()
      void dispatch(fetchInvoices(projectId))
      showToast({ title: 'Invoice generated', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to generate invoice', variant: 'error' })
    }
  }

  if (!preset) return null

  const subtitle = (
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
      <Chip
        label={preset.milestoneName}
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'primary.main',
          color: 'primary.main',
          fontWeight: 500,
        }}
      />
      <Chip
        label={preset.serviceName}
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'primary.main',
          color: 'primary.main',
          fontWeight: 500,
        }}
      />
    </Stack>
  )

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Generate Invoice"
      subtitle={subtitle}
      width={560}
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 2.5, py: 1.75 }}>
          <Button variant="text" size="sm" label="Cancel" onClick={onClose} disabled={saving} />
          <Button
            variant="contained"
            color="primary"
            size="sm"
            label="Generate Invoice"
            endIcon={<ArrowRight size={16} />}
            onClick={() => void handleSubmit()}
            loading={saving}
          />
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Box>
          <SectionHeader>Milestone & amounts</SectionHeader>
          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 1,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2">
              <Box component="span" color="text.secondary">
                Milestone:{' '}
              </Box>
              <Box component="span" fontWeight={600}>
                {preset.milestoneName}
              </Box>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Box component="span" color="text.secondary">
                Service:{' '}
              </Box>
              <Box component="span" fontWeight={600}>
                {preset.serviceName}
              </Box>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <Box component="span" color="text.secondary">
                Base Value:{' '}
              </Box>
              <Box component="span" fontWeight={600}>
                ₹{formatInr(preset.baseAmount)}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Box>
          <SectionHeader>Line items</SectionHeader>
          <Box sx={{ mt: 1 }}>
            <InvoiceLineItems
              mode="edit"
              lines={lines}
              services={services}
              sacCodes={sacCodes}
              onChange={setLines}
              projectSourced
              allowEmpty={false}
              manualAddCollapsed
            />
          </Box>
        </Box>

        <Box>
          <SectionHeader>Invoice details</SectionHeader>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormField label="Invoice Number" required>
              <Input
                value={invoiceNumber}
                onChange={setInvoiceNumber}
                placeholder="e.g. INV-2026-001"
                size="sm"
              />
            </FormField>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormField label="Invoice Date" required>
                  <DatePicker value={invoiceDate} onChange={setInvoiceDate} fullWidth size="sm" />
                </FormField>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormField label="Due Date" required>
                  <DatePicker value={dueDate} onChange={setDueDate} fullWidth size="sm" />
                </FormField>
              </Box>
            </Stack>
            <FormField label="Notes">
              <Textarea
                value={notes}
                onChange={setNotes}
                placeholder="Optional"
                minRows={2}
                fullWidth
              />
            </FormField>
          </Stack>
        </Box>

        <Box>
          <SectionHeader>Summary</SectionHeader>
          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 1,
              bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ReadOnlySummaryRow label="Base amount" value={`₹${formatInr(roll.baseAmount)}`} />
            <ReadOnlySummaryRow label="+ GST" value={`₹${formatInr(roll.gstAmount)}`} />
            <Divider sx={{ my: 1 }} />
            <ReadOnlySummaryRow
              label="Invoice Total"
              value={`₹${formatInr(roll.grossAmount)}`}
              valueSx={{ fontWeight: 700, typography: 'body1' }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', fontStyle: 'italic' }}>
              TDS will be captured when payment is recorded
            </Typography>
          </Box>
        </Box>
      </Stack>
    </DrawerForm>
  )
}

// ─── View Invoice Drawer ─────────────────────────────────────────────────────

interface ViewInvoiceDrawerProps {
  open: boolean
  invoice: ClientInvoice | null
  projectName: string
  onClose: () => void
  onRecordPayment: () => void
  onDownloadPdf: () => void
}

function ViewInvoiceDrawer({
  open,
  invoice,
  projectName,
  onClose,
  onRecordPayment,
  onDownloadPdf,
}: ViewInvoiceDrawerProps) {
  const { services, sacCodes } = useAppSelector((s) => s.settings)

  if (!invoice) return null

  const st = invoiceRowBadge(invoice)
  const bal = balancePending(invoice)
  const showPay = bal > MONEY_EPS
  const bankReceived = totalReceivedBank(invoice.payments)
  const tdsTotal = totalTdsFromPayments(invoice.payments)
  const roll = rollupsFromLineItems(invoice.lineItems)

  const headerActions = (
    <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
      {showPay && (
        <Button
          size="sm"
          variant="contained"
          color="primary"
          label="Record Payment"
          onClick={onRecordPayment}
        />
      )}
      <Button size="sm" variant="outlined" color="primary" label="Download PDF" onClick={onDownloadPdf} />
    </Stack>
  )

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={invoice.invoiceNumber}
      subtitle={
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {projectName}
          </Typography>
          <StatusBadge status={st.type} label={st.label} />
        </Stack>
      }
      width={560}
      headerActions={headerActions}
      footer={
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 2.5, py: 1.75 }}>
          <Button variant="text" size="sm" label="Close" onClick={onClose} />
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Box>
          <SectionHeader>Invoice details</SectionHeader>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Invoice date
              </Typography>
              <Typography variant="body2" display="block">
                {formatDate(invoice.invoiceDate)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Due date
              </Typography>
              <Typography
                variant="body2"
                display="block"
                color={
                  showPay && isDueDateOverdue(invoice.dueDate) ? 'error.main' : 'text.primary'
                }
              >
                {formatDate(invoice.dueDate)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Milestone
              </Typography>
              <Typography variant="body2" display="block">
                {invoice.milestoneName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Service
              </Typography>
              <Typography variant="body2" display="block">
                {invoice.serviceName}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box>
          <SectionHeader>Line items</SectionHeader>
          <Box sx={{ mt: 1 }}>
            <InvoiceLineItems mode="read" lines={invoice.lineItems} services={services} sacCodes={sacCodes} />
          </Box>
        </Box>

        <Box>
          <SectionHeader>Summary</SectionHeader>
          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 1,
              bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ReadOnlySummaryRow label="Base amount" value={`₹${formatInr(roll.baseAmount)}`} />
            <ReadOnlySummaryRow label="+ GST" value={`₹${formatInr(roll.gstAmount)}`} />
            <Divider sx={{ my: 1 }} />
            <ReadOnlySummaryRow
              label="Invoice Total"
              value={`₹${formatInr(roll.grossAmount)}`}
              valueSx={{ fontWeight: 700, typography: 'body1' }}
            />
            <Divider sx={{ my: 1 }} />
            <ReadOnlySummaryRow
              label="Total received"
              value={`₹${formatInr(bankReceived)}`}
              valueSx={{
                color: bankReceived > 0 ? 'success.main' : 'text.secondary',
              }}
            />
            <ReadOnlySummaryRow
              label="TDS deducted"
              value={`₹${formatInr(tdsTotal)}`}
              valueSx={{ color: 'text.secondary' }}
            />
            <Divider sx={{ my: 1 }} />
            <ReadOnlySummaryRow
              label="Balance pending"
              value={`₹${formatInr(bal)}`}
              valueSx={{
                fontWeight: 700,
                typography: 'body1',
                color: bal > MONEY_EPS ? 'error.main' : 'success.main',
              }}
            />
          </Box>
        </Box>
      </Stack>
    </DrawerForm>
  )
}

// ─── BillingTab ───────────────────────────────────────────────────────────────

interface BillingTabProps {
  projectId: string
  projectName: string
  clientId: string
  clientName: string
}

export default function BillingTab({ projectId, projectName, clientId, clientName }: BillingTabProps) {
  const dispatch = useAppDispatch()
  const { invoices } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatePreset, setGeneratePreset] = useState<BillableMilestone | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<ClientInvoice | null>(null)
  const [viewInvoice, setViewInvoice] = useState<ClientInvoice | null>(null)

  useEffect(() => {
    dispatch(fetchServices())
    dispatch(fetchSACCodes())
  }, [dispatch])

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  const billableTemplates = BILLABLE_BY_PROJECT[projectId] ?? []

  function openGenerate(row: BillableMilestone) {
    if (hasInvoiceForMilestone(projectInvoices, row)) return
    setGeneratePreset(row)
    setGenerateOpen(true)
  }

  function closeGenerate() {
    setGenerateOpen(false)
    setGeneratePreset(null)
  }

  function openPayment(inv: ClientInvoice) {
    setPaymentInvoice(inv)
  }

  const viewInvoiceResolved = useMemo(() => {
    if (!viewInvoice) return null
    return projectInvoices.find((i) => i.id === viewInvoice.id) ?? viewInvoice
  }, [projectInvoices, viewInvoice])

  return (
    <>
      <SummaryStrip invoices={projectInvoices} />

      <WorkspaceSection title="Milestones to Invoice" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount Breakdown</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>TDS</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billableTemplates.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  sx={{
                    ...TABLE_CELL_SX,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                    py: 3,
                  }}
                >
                  No billing milestones configured for this project
                </TableCell>
              </TableRow>
            )}
            {billableTemplates.map((m) => {
              const inv = findInvoiceForMilestone(projectInvoices, m)
              const phase = milestoneBillPhase(inv)
              const badge = milestoneStatusBadge(phase)

              let base: number
              let gstRate: number
              let gstAmount: number
              let gross: number
              let tdsAmt: number
              let netRec: number
              let tdsLabel: string

              if (inv) {
                const roll = rollupsFromLineItems(inv.lineItems)
                base = roll.baseAmount
                gstRate = inv.baseAmount > 0 ? Math.round((100 * inv.gstAmount) / inv.baseAmount) : DEFAULT_GST_RATE
                gstAmount = inv.gstAmount
                gross = inv.grossAmount
                const paidTds = totalTdsFromPayments(inv.payments)
                tdsAmt = paidTds > 0 ? paidTds : tdsOnBase(base, DEFAULT_TDS_RATE)
                tdsLabel = paidTds > 0 ? 'TDS' : `TDS (${DEFAULT_TDS_RATE}%)`
                netRec = balancePending(inv)
              } else {
                base = m.baseAmount
                gstRate = DEFAULT_GST_RATE
                gstAmount = gstOnBase(m.baseAmount, DEFAULT_GST_RATE)
                gross = base + gstAmount
                tdsAmt = tdsOnBase(base, DEFAULT_TDS_RATE)
                tdsLabel = `TDS (${DEFAULT_TDS_RATE}%)`
                netRec = gross - tdsAmt
              }

              return (
                <TableRow key={milestoneRowKey(m)} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {m.milestoneName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.serviceName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <AmountBreakdownColumn
                      base={base}
                      gstRate={gstRate}
                      gstAmount={gstAmount}
                      gross={gross}
                    />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <TdsColumn tdsLabel={tdsLabel} tdsAmount={tdsAmt} netReceivable={netRec} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={badge.type} label={badge.label} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    {phase === 'not_invoiced' ? (
                      <Button
                        size="sm"
                        variant="contained"
                        color="primary"
                        label="Generate Invoice"
                        onClick={() => openGenerate(m)}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="outlined"
                        color="primary"
                        label="View Invoice"
                        onClick={() => inv && setViewInvoice(inv)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <WorkspaceSection title="Client Invoices" noPadding>
        {projectInvoices.length === 0 ? (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No invoices generated yet
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Invoice No</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Due Date</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Amount Breakdown</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>TDS Amount</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Net Receivable</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projectInvoices.map((inv) => {
                const st = invoiceRowBadge(inv)
                const dueOverdue =
                  balancePending(inv) > MONEY_EPS && isDueDateOverdue(inv.dueDate)
                const showReceipt = balancePending(inv) > MONEY_EPS

                return (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {inv.milestoneName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inv.serviceName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography
                        variant="body2"
                        onClick={() => setViewInvoice(inv)}
                        sx={{
                          color: 'primary.main',
                          cursor: 'pointer',
                          fontWeight: 500,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {inv.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2">{formatDate(inv.invoiceDate)}</Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography
                        variant="body2"
                        color={dueOverdue ? 'error.main' : 'text.primary'}
                      >
                        {formatDate(inv.dueDate)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <AmountBreakdownColumn
                        base={inv.baseAmount}
                        gstRate={
                          inv.baseAmount > 0
                            ? Math.round((100 * inv.gstAmount) / inv.baseAmount)
                            : DEFAULT_GST_RATE
                        }
                        gstAmount={inv.gstAmount}
                        gross={inv.grossAmount}
                      />
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2">₹{formatInr(totalTdsFromPayments(inv.payments))}</Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        ₹{formatInr(balancePending(inv))}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <StatusBadge status={st.type} label={st.label} />
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Stack direction="row" gap={0.5} flexWrap="wrap">
                        <Button
                          size="sm"
                          variant="outlined"
                          color="primary"
                          label="View"
                          onClick={() => setViewInvoice(inv)}
                        />
                        {showReceipt && (
                          <Button
                            size="sm"
                            variant="outlined"
                            color="primary"
                            label="Record Payment"
                            onClick={() => openPayment(inv)}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </WorkspaceSection>

      <GenerateInvoiceDrawer
        open={generateOpen}
        projectId={projectId}
        projectName={projectName}
        clientId={clientId}
        clientName={clientName}
        preset={generatePreset}
        onClose={closeGenerate}
      />
      <RecordClientInvoicePaymentModal
        open={!!paymentInvoice}
        projectId={projectId}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
      />
      <ViewInvoiceDrawer
        open={!!viewInvoice}
        invoice={viewInvoiceResolved}
        projectName={projectName}
        onClose={() => setViewInvoice(null)}
        onRecordPayment={() => {
          if (viewInvoice) openPayment(viewInvoice)
        }}
        onDownloadPdf={() =>
          showToast({ title: 'PDF download is not available in this demo', variant: 'info' })
        }
      />
    </>
  )
}
