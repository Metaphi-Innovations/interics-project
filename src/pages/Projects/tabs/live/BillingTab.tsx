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
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createInvoice, fetchInvoices } from '../../../../slices/live/thunk'
import type { ClientInvoice, ClientInvoiceLineItem } from '../../../../slices/live/types'
import { formatDate, formatInr } from '../../../../utils/formatters'
import { buildBillableFromClientPOs, type BillableMilestone } from './billableMilestones'
import { fetchClientPO } from '../../../../slices/baseline/thunk'
import {
  InvoiceLineItems,
  type DraftLineItem,
} from '@/pages/Finance/components/InvoiceLineItems'
import { sacCodeForService } from '@/pages/Finance/utils/projectBillable'
import { fetchServices, fetchSACCodes } from '@/slices/settings/thunk'
import { RecordClientInvoicePaymentModal } from './RecordClientInvoicePaymentModal'
import { BillingPitchSummary } from './BillingPitchSummary'
import {
  balancePending,
  computeLineItemTaxBreakdown,
  isDueDateOverdue,
  MONEY_EPS,
  rollupsFromLineItems,
  totalReceivedBank,
  totalTdsFromPayments,
  type InvoiceLineRollups,
} from './clientInvoiceUtils'
import { downloadClientInvoiceDocument } from './downloadClientInvoice'

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

const RECEIVABLES_COLUMN_COUNT = 7
const RECEIVABLES_COL_WIDTH = `${100 / RECEIVABLES_COLUMN_COUNT}%`

const RECEIVABLES_TABLE_HEADER_SX = {
  ...TABLE_HEADER_SX,
  width: RECEIVABLES_COL_WIDTH,
} as const

const RECEIVABLES_TABLE_CELL_SX = {
  ...TABLE_CELL_SX,
  width: RECEIVABLES_COL_WIDTH,
} as const

const RECEIVABLES_STATUS_HEADER_SX = {
  ...RECEIVABLES_TABLE_HEADER_SX,
  textAlign: 'center',
} as const

const RECEIVABLES_STATUS_CELL_SX = {
  ...RECEIVABLES_TABLE_CELL_SX,
  textAlign: 'center',
  verticalAlign: 'middle',
} as const

const RECEIVABLES_ACTION_HEADER_SX = {
  ...RECEIVABLES_TABLE_HEADER_SX,
  textAlign: 'center',
} as const

const RECEIVABLES_ACTION_CELL_SX = {
  ...RECEIVABLES_TABLE_CELL_SX,
  textAlign: 'center',
  verticalAlign: 'middle',
} as const

const RECEIVABLES_ACTION_BUTTON_SX = {
  minWidth: 132,
  px: 1.5,
  fontSize: 11,
  whiteSpace: 'nowrap',
} as const

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
        GST ({gstRate}%): ₹{formatInr(gstAmount)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Gross: ₹{formatInr(gross)}
      </Typography>
    </Stack>
  )
}

function InvoiceDetailsColumn({
  invoiceNumber,
  invoiceDate,
  onView,
}: {
  invoiceNumber: string
  invoiceDate: string
  onView: () => void
}) {
  return (
    <Stack gap={0.25}>
      <Typography
        variant="body2"
        onClick={onView}
        sx={{
          color: 'primary.main',
          cursor: 'pointer',
          fontWeight: 500,
          lineHeight: 1.35,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        {invoiceNumber}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {formatDate(invoiceDate)}
      </Typography>
    </Stack>
  )
}

function PaymentSummaryColumn({
  tds,
  received,
  outstanding,
}: {
  tds: number
  received: number
  outstanding: number
}) {
  const outstandingColor =
    outstanding > MONEY_EPS ? tokens.color.error[600] : tokens.color.success[600]
  return (
    <Stack gap={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        TDS: ₹{formatInr(tds)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Received: ₹{formatInr(received)}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: outstandingColor }}>
        Outstanding: ₹{formatInr(outstanding)}
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

function formatLabourCessPercent(rate: number | null): string {
  if (rate === null) return '—'
  const rounded = Math.round(rate * 100) / 100
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`
}

function ClientInvoiceTaxSummary({ roll }: { roll: InvoiceLineRollups }) {
  return (
    <>
      <ReadOnlySummaryRow label="Base amount" value={`₹${formatInr(roll.baseAmount)}`} />
      <ReadOnlySummaryRow
        label="Labour cess (%)"
        value={formatLabourCessPercent(roll.labourCessRatePercent)}
      />
      <ReadOnlySummaryRow label="Labour cess amount" value={`₹${formatInr(roll.labourCessAmount)}`} />
      <ReadOnlySummaryRow label="Taxable amount" value={`₹${formatInr(roll.taxableAmount)}`} />
      <ReadOnlySummaryRow label="GST amount" value={`₹${formatInr(roll.gstAmount)}`} />
      <Divider sx={{ my: 1 }} />
      <ReadOnlySummaryRow
        label="Final invoice amount"
        value={`₹${formatInr(roll.grossAmount)}`}
        valueSx={{ fontWeight: 700, typography: 'body1' }}
      />
    </>
  )
}

function lineItemsToPayload(lines: DraftLineItem[]): ClientInvoiceLineItem[] {
  return lines.map((li) => ({
    id: li.id,
    serviceId: li.serviceId,
    serviceName: li.serviceName,
    sacCode: li.sacCode || '—',
    amount: li.amount,
    labourCessRate: li.labourCessRate,
    labourCessAmount: li.labourCessAmount,
    taxableAmount: li.taxableAmount,
    gstRate: li.gstRate,
    gstAmount: li.gstAmount,
    milestoneId: li.milestoneId,
    lineSource: li.lineSource === 'manual' ? 'manual' : 'milestone',
  }))
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
  const [fieldErrors, setFieldErrors] = useState<{
    invoiceNumber?: string
    lines?: string
  }>({})

  useEffect(() => {
    if (!open || !preset) return
    setInvoiceNumber('')
    setInvoiceDate(new Date())
    setDueDate(null)
    setNotes('')
    setFieldErrors({})
    const svc = services.find((s) => s.id === preset.serviceId)
    const sac = sacCodeForService(sacCodes, svc)
    const gstRate = svc?.gstRate ?? DEFAULT_GST_RATE
    const amount = preset.baseAmount
    const taxed = computeLineItemTaxBreakdown(amount, 0, gstRate)
    setLines([
      {
        id: `tmp-${preset.milestoneId}-${preset.serviceId}`,
        serviceId: preset.serviceId,
        serviceName: preset.serviceName,
        sacCode: sac || '—',
        amount,
        labourCessRate: 0,
        labourCessAmount: taxed.labourCessAmount,
        taxableAmount: taxed.taxableAmount,
        gstRate,
        gstAmount: taxed.gstAmount,
        milestoneId: preset.milestoneId,
        lineSource: 'milestone',
      },
    ])
  }, [open, preset, services, sacCodes])

  const roll = useMemo(() => rollupsFromLineItems(lineItemsToPayload(lines)), [lines])

  function handleDownloadDraft() {
    if (!preset) return
    if (!lines.length) {
      showToast({ title: 'Add line items before downloading', variant: 'error' })
      return
    }
    downloadClientInvoiceDocument({
      invoiceNumber: invoiceNumber.trim() || 'Draft Invoice',
      invoiceDate: toIsoDate(invoiceDate),
      dueDate: toIsoDate(dueDate),
      projectName,
      clientName,
      notes: notes.trim() || undefined,
      milestoneName: preset.milestoneName,
      serviceName: preset.serviceName,
      lineItems: lines.map((l) => ({
        serviceName: l.serviceName,
        amount: l.amount,
        labourCessRate: l.labourCessRate,
        gstRate: l.gstRate,
        labourCessAmount: l.labourCessAmount,
        taxableAmount: l.taxableAmount,
        gstAmount: l.gstAmount,
      })),
    })
  }

  function validateForm(): boolean {
    const next: typeof fieldErrors = {}
    if (!invoiceNumber.trim()) next.invoiceNumber = 'Invoice number is required'
    if (!lines.length || lines.some((l) => !l.serviceId || l.amount <= 0)) {
      next.lines = 'Add at least one valid line item'
    }
    setFieldErrors(next)
    const keys = Object.keys(next)
    if (keys.length > 0) {
      showToast({
        title: next.invoiceNumber ?? next.lines ?? 'Please fill in all required fields',
        variant: 'error',
      })
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (!preset) return
    if (!validateForm()) return
    const invDate = toIsoDate(invoiceDate)
    const due = toIsoDate(dueDate)
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
            clientPoId: preset.clientPoId,
            lineItems: lineItemsToPayload(lines),
            baseAmount: roll.baseAmount,
            labourCessAmount: roll.labourCessAmount,
            taxableAmount: roll.taxableAmount,
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
      width={680}
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 2.5, py: 1.75 }}>
          <Button
            size="sm"
            variant="outlined"
            color="primary"
            label="Download Invoice"
            onClick={handleDownloadDraft}
            disabled={saving}
          />
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
          <SectionHeader>Line items</SectionHeader>
          <Box sx={{ mt: 1 }}>
            <InvoiceLineItems
              mode="edit"
              lines={lines}
              services={services}
              sacCodes={sacCodes}
              onChange={(next) => {
                setLines(next)
                setFieldErrors((prev) => ({ ...prev, lines: undefined }))
              }}
              projectSourced
              allowEmpty={false}
              manualAddCollapsed
              allowManualAdd={false}
              hideSacColumn
              showLabourCessColumn
              error={fieldErrors.lines}
            />
          </Box>
        </Box>

        <Box>
          <SectionHeader>Invoice details</SectionHeader>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormField label="Invoice Number" required error={fieldErrors.invoiceNumber}>
              <Input
                value={invoiceNumber}
                onChange={(v) => {
                  setInvoiceNumber(v)
                  setFieldErrors((prev) => ({ ...prev, invoiceNumber: undefined }))
                }}
                placeholder="e.g. INV-2026-001"
                size="sm"
                error={Boolean(fieldErrors.invoiceNumber)}
              />
            </FormField>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormField label="Invoice Date">
                  <DatePicker value={invoiceDate} onChange={setInvoiceDate} fullWidth size="sm" />
                </FormField>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormField label="Due Date">
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
            <ClientInvoiceTaxSummary roll={roll} />
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

  const phase = milestoneBillPhase(invoice)
  const badge = milestoneStatusBadge(phase)
  const bal = balancePending(invoice)
  const showPay = bal > MONEY_EPS
  const bankReceived = totalReceivedBank(invoice.payments)
  const tdsTotal = totalTdsFromPayments(invoice.payments)
  const roll = rollupsFromLineItems(invoice.lineItems)

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      hideCloseButton
      title={invoice.invoiceNumber}
      subtitle={
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {projectName}
          </Typography>
          <StatusBadge status={badge.type} label={badge.label} />
        </Stack>
      }
      width={560}
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 2.5, py: 1.75 }}>
          <Button
            size="sm"
            variant="outlined"
            color="secondary"
            label="Cancel"
            onClick={onClose}
          />
          <Button
            size="sm"
            variant="contained"
            color="primary"
            label="Download Invoice"
            onClick={onDownloadPdf}
          />
          {showPay ? (
            <Button
              size="sm"
              variant="contained"
              color="primary"
              label="Record Invoice"
              onClick={onRecordPayment}
            />
          ) : null}
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
            <InvoiceLineItems
              mode="read"
              lines={invoice.lineItems}
              services={services}
              sacCodes={sacCodes}
              hideSacColumn
              showLabourCessColumn
            />
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
            <ClientInvoiceTaxSummary roll={roll} />
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
  const clientPOs = useAppSelector((s) => s.baseline.clientPOs)
  const showToast = useToast((s) => s.showToast)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatePreset, setGeneratePreset] = useState<BillableMilestone | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<ClientInvoice | null>(null)
  const [viewInvoice, setViewInvoice] = useState<ClientInvoice | null>(null)

  useEffect(() => {
    dispatch(fetchServices())
    dispatch(fetchSACCodes())
    void dispatch(fetchClientPO(projectId))
  }, [dispatch, projectId])

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  const billableTemplates = useMemo(
    () => buildBillableFromClientPOs(clientPOs, projectId),
    [clientPOs, projectId],
  )

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
      <BillingPitchSummary projectId={projectId} />

      <WorkspaceSection title="Receivables" noPadding>
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& .MuiTableCell-root': { verticalAlign: 'top', wordBreak: 'break-word' },
          }}
        >
          <colgroup>
            {Array.from({ length: RECEIVABLES_COLUMN_COUNT }, (_, index) => (
              <col key={index} style={{ width: RECEIVABLES_COL_WIDTH }} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>Invoice Details</TableCell>
              <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>Due Date</TableCell>
              <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>Amount Breakdown</TableCell>
              <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>Payment Summary</TableCell>
              <TableCell sx={RECEIVABLES_STATUS_HEADER_SX}>Status</TableCell>
              <TableCell sx={RECEIVABLES_ACTION_HEADER_SX} align="center">
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {billableTemplates.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={RECEIVABLES_COLUMN_COUNT}
                  sx={{
                    ...RECEIVABLES_TABLE_CELL_SX,
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
              const dueOverdue =
                inv != null && balancePending(inv) > MONEY_EPS && isDueDateOverdue(inv.dueDate)

              let base: number
              let gstRate: number
              let gstAmount: number
              let gross: number
              if (inv) {
                const roll = rollupsFromLineItems(inv.lineItems)
                base = roll.baseAmount
                gstRate =
                  inv.baseAmount > 0
                    ? Math.round((100 * inv.gstAmount) / inv.baseAmount)
                    : DEFAULT_GST_RATE
                gstAmount = inv.gstAmount
                gross = inv.grossAmount
              } else {
                base = m.baseAmount
                gstRate = DEFAULT_GST_RATE
                gstAmount = gstOnBase(m.baseAmount, DEFAULT_GST_RATE)
                gross = base + gstAmount
              }

              const tds = inv ? totalTdsFromPayments(inv.payments) : 0
              const received = inv ? totalReceivedBank(inv.payments) : 0
              const outstanding = inv ? balancePending(inv) : 0

              return (
                <TableRow key={milestoneRowKey(m)} hover>
                  <TableCell sx={RECEIVABLES_TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                      {m.milestoneName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {m.serviceName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={RECEIVABLES_TABLE_CELL_SX}>
                    {inv ? (
                      <InvoiceDetailsColumn
                        invoiceNumber={inv.invoiceNumber}
                        invoiceDate={inv.invoiceDate}
                        onView={() => setViewInvoice(inv)}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={RECEIVABLES_TABLE_CELL_SX}>
                    <Typography
                      variant="body2"
                      color={inv ? (dueOverdue ? 'error.main' : 'text.primary') : 'text.disabled'}
                    >
                      {inv ? formatDate(inv.dueDate) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={RECEIVABLES_TABLE_CELL_SX}>
                    <AmountBreakdownColumn
                      base={base}
                      gstRate={gstRate}
                      gstAmount={gstAmount}
                      gross={gross}
                    />
                  </TableCell>
                  <TableCell sx={RECEIVABLES_TABLE_CELL_SX}>
                    {inv ? (
                      <PaymentSummaryColumn
                        tds={tds}
                        received={received}
                        outstanding={outstanding}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={RECEIVABLES_STATUS_CELL_SX}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <StatusBadge status={badge.type} label={badge.label} />
                    </Box>
                  </TableCell>
                  <TableCell sx={RECEIVABLES_ACTION_CELL_SX} align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      {phase === 'not_invoiced' ? (
                        <Button
                          size="sm"
                          variant="contained"
                          color="primary"
                          label="Draft invoice"
                          onClick={() => openGenerate(m)}
                          sx={RECEIVABLES_ACTION_BUTTON_SX}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="outlined"
                          color="primary"
                          label="View invoice"
                          onClick={() => inv && setViewInvoice(inv)}
                          sx={RECEIVABLES_ACTION_BUTTON_SX}
                        />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </Box>
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
        onDownloadPdf={() => {
          if (!viewInvoiceResolved) return
          downloadClientInvoiceDocument({
            invoiceNumber: viewInvoiceResolved.invoiceNumber,
            invoiceDate: viewInvoiceResolved.invoiceDate,
            dueDate: viewInvoiceResolved.dueDate,
            projectName,
            clientName: viewInvoiceResolved.clientName ?? clientName,
            notes: viewInvoiceResolved.notes,
            milestoneName: viewInvoiceResolved.milestoneName,
            serviceName: viewInvoiceResolved.serviceName,
            lineItems: viewInvoiceResolved.lineItems.map((l) => ({
              serviceName: l.serviceName,
              amount: l.amount,
              labourCessRate: l.labourCessRate,
              gstRate: l.gstRate,
              labourCessAmount: l.labourCessAmount,
              taxableAmount: l.taxableAmount,
              gstAmount: l.gstAmount,
            })),
          })
        }}
      />
    </>
  )
}
