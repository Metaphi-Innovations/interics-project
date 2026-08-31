import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Collapse,
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
  IconButton,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField } from '../../../../components/templates/DrawerForm'
import {
  Badge,
  Button,
  DatePicker,
  Input,
  Modal,
  StatusBadge,
  Textarea,
  useToast,
} from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
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
  calcClientInvoiceTdsAmount,
  computeLineItemTaxBreakdown,
  isDueDateOverdue,
  MONEY_EPS,
  resolveClientServiceGstRate,
  rollupsFromLineItems,
  totalReceivedBank,
  type InvoiceLineRollups,
} from './clientInvoiceUtils'
import { downloadClientInvoiceDocument } from './downloadClientInvoice'
import { receivablesApi } from '@/api/receivablesApi'
import { convertDraftToTax } from '@/slices/receivables/thunk'
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import {
  clientInvoiceStatusBadges,
  milestoneBillingPhase,
  milestoneBillingStatusBadge,
  milestonePaymentPhase,
  milestonePaymentStatusBadge,
} from './clientMilestoneBillingStatus'
import {
  resolveReceivableMilestoneAmounts,
  resolveReceivableMilestonePaymentSummary,
} from './projectLiveReceivableMilestoneDisplay'
import {
  clientMilestoneIsBilled,
  findClientInvoiceForMilestone,
  findClientInvoicesForMilestone,
} from './milestonePaymentStatus'
import { ProjectLiveRowActionMenu } from './ProjectLiveRowActionMenu'
import {
  findDraftInvoiceForMilestone,
  findTaxInvoiceEligibleForPayment,
} from './projectLiveReceivableActions'
import {
  buildClientPoReceivableGroups,
  clientPOReceivablePaymentStatusColor,
} from './clientPOReceivableGroups'
import type { Baseline } from '@/slices/baseline/reducer'
import type { Service } from '@/slices/settings/reducer'

function milestoneRowKey(m: Pick<BillableMilestone, 'milestoneId' | 'serviceId'>): string {
  return `${m.milestoneId}:${m.serviceId}`
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
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

const RECEIVABLE_PARENT_COL_COUNT = 4

const RECEIVABLE_PARENT_CENTER_HEADER_SX = {
  ...TABLE_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

const RECEIVABLE_PARENT_CENTER_CELL_SX = {
  ...TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

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
  labourCess = 0,
  tdsRate,
  tdsAmount,
  net,
}: {
  base: number
  gstRate: number
  gstAmount: number
  labourCess?: number
  tdsRate?: number | null
  tdsAmount: number
  net: number
}) {
  return (
    <Stack gap={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Base: ₹{formatInr(base)}
      </Typography>
      {labourCess > MONEY_EPS ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Labour cess: ₹{formatInr(labourCess)}
        </Typography>
      ) : null}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        GST ({gstRate}%): ₹{formatInr(gstAmount)}
      </Typography>
      {tdsAmount > 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          TDS ({tdsRate ?? 0}%): −₹{formatInr(tdsAmount)}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Net: ₹{formatInr(net)}
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
  labourCess = 0,
  received,
  outstanding,
}: {
  tds: number
  labourCess?: number
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
      {labourCess > MONEY_EPS ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Labour cess: ₹{formatInr(labourCess)}
        </Typography>
      ) : null}
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

function ClientInvoiceTaxSummary({
  roll,
  tdsAmount = 0,
  tdsRate,
  showNetPayable = true,
}: {
  roll: InvoiceLineRollups
  tdsAmount?: number
  tdsRate?: number | null
  showNetPayable?: boolean
}) {
  const netPayable = roll.grossAmount - tdsAmount
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
      {tdsAmount > 0 ? (
        <ReadOnlySummaryRow
          label={tdsRate != null ? `TDS (${tdsRate}%)` : 'TDS'}
          value={`−₹${formatInr(tdsAmount)}`}
          valueSx={{ color: 'text.secondary' }}
        />
      ) : null}
      {showNetPayable ? (
        <>
          <Divider sx={{ my: 1 }} />
          <ReadOnlySummaryRow
            label="Net payable"
            value={`₹${formatInr(netPayable)}`}
            valueSx={{ fontWeight: 700, typography: 'body1' }}
          />
        </>
      ) : null}
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
  editingInvoice?: ClientInvoice | null
  onClose: () => void
  onSaved?: () => void
}

function GenerateInvoiceDrawer({
  open,
  projectId,
  projectName,
  clientId,
  clientName,
  preset,
  editingInvoice = null,
  onClose,
  onSaved,
}: GenerateDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const { services, sacCodes } = useAppSelector((s) => s.settings)
  const baseline = useAppSelector((s) => s.baseline.baseline)
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
    setFieldErrors({})
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber)
      setInvoiceDate(editingInvoice.invoiceDate ? new Date(editingInvoice.invoiceDate) : new Date())
      setDueDate(editingInvoice.dueDate ? new Date(editingInvoice.dueDate) : null)
      setNotes(editingInvoice.notes ?? '')
      setLines(
        (editingInvoice.lineItems ?? []).map((li) => ({
          id: li.id,
          serviceId: li.serviceId,
          serviceName: li.serviceName,
          sacCode: li.sacCode,
          amount: li.amount,
          labourCessRate: li.labourCessRate ?? 0,
          labourCessAmount: li.labourCessAmount ?? 0,
          taxableAmount: li.taxableAmount ?? li.amount,
          gstRate: li.gstRate,
          gstAmount: li.gstAmount,
          milestoneId: li.milestoneId,
          lineSource: 'milestone' as const,
        })),
      )
      return
    }
    setInvoiceNumber('')
    setInvoiceDate(new Date())
    setDueDate(null)
    setNotes('')
    const svc = services.find((s) => s.id === preset.serviceId)
    const sac = sacCodeForService(sacCodes, svc)
    const gstRate = resolveClientServiceGstRate(preset.serviceId, baseline, services)
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
  }, [open, preset, editingInvoice, services, sacCodes, baseline])

  const roll = useMemo(() => rollupsFromLineItems(lineItemsToPayload(lines)), [lines])
  const tdsAmount = calcClientInvoiceTdsAmount(roll.baseAmount, preset?.tdsRate)
  const invoiceNet = roll.grossAmount - tdsAmount

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

  async function handleSubmit() {
    if (!preset) return
    if (!validateForm()) return
    const invDate = toIsoDate(invoiceDate)
    const due = toIsoDate(dueDate)
    const payload = {
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
      tdsAmount: calcClientInvoiceTdsAmount(roll.baseAmount, preset.tdsRate),
      tdsRate: preset.tdsRate ?? null,
      netReceivable: roll.grossAmount - calcClientInvoiceTdsAmount(roll.baseAmount, preset.tdsRate),
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invDate,
      dueDate: due,
      status: 'draft' as const,
      payments: [],
      notes: notes.trim() || undefined,
    }
    try {
      if (editingInvoice) {
        await receivablesApi.update(editingInvoice.id, {
          projectId,
          clientId,
          clientName,
          projectName,
          invoiceNo: invoiceNumber.trim(),
          invoiceDate: invDate,
          dueDate: due,
          lineItems: payload.lineItems,
          notes: payload.notes,
          clientPoId: preset.clientPoId,
          milestoneId: preset.milestoneId,
          milestoneName: preset.milestoneName,
          serviceId: preset.serviceId,
          serviceName: preset.serviceName,
        })
        showToast({ title: 'Draft invoice updated', variant: 'success' })
      } else {
        await dispatch(
          createInvoice({
            projectId,
            projectName,
            clientId,
            clientName,
            sendNow: false,
            data: payload,
          }),
        ).unwrap()
        showToast({ title: 'Draft invoice created', variant: 'success' })
      }
      void dispatch(fetchInvoices(projectId))
      onSaved?.()
      onClose()
    } catch (err) {
      const fallback = editingInvoice ? 'Failed to update invoice' : 'Failed to generate invoice'
      showToast({
        title: typeof err === 'string' ? err : parseSettingsApiError(err, fallback).message,
        variant: 'error',
      })
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
      title={editingInvoice ? 'Edit Draft Invoice' : 'Generate Invoice'}
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
            label={editingInvoice ? 'Save Draft' : 'Generate Invoice'}
            endIcon={<ArrowRight size={16} />}
            onClick={() => void handleSubmit()}
            loading={saving}
          />
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
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
            <Box component="span" color="text.secondary" sx={{ mx: 1 }}>
              ·
            </Box>
            <Box component="span" color="text.secondary">
              {preset.serviceName}
            </Box>
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mt: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Invoice Amount (base)
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  color: 'primary.main',
                }}
              >
                ₹{formatInr(preset.baseAmount)}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Invoice Net
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                ₹{formatInr(invoiceNet)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box>
          <SectionHeader>Line items</SectionHeader>
          <Box sx={{ mt: 1 }}>
            <InvoiceLineItems
              mode="read"
              lines={lines}
              services={services}
              sacCodes={sacCodes}
              onChange={setLines}
              editableLabourCessInReadMode
              projectSourced
              allowEmpty={false}
              manualAddCollapsed
              allowManualAdd={false}
              hideSacColumn
              showLabourCessColumn
              showTdsColumn
              tdsRate={preset.tdsRate ?? null}
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
            <ClientInvoiceTaxSummary
              roll={roll}
              tdsAmount={tdsAmount}
              tdsRate={preset.tdsRate}
              showNetPayable
            />
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

  const billingBadges = clientInvoiceStatusBadges(invoice)
  const bal = balancePending(invoice)
  const showPay = bal > MONEY_EPS
  const bankReceived = totalReceivedBank(invoice.payments)
  const tdsTotal = invoice.tdsAmount
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
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {billingBadges.map((badge) => (
              <StatusBadge key={badge.label} status={badge.type} label={badge.label} />
            ))}
          </Stack>
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
              label="Record Payment"
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
              showTdsColumn
              tdsRate={invoice.tdsRate ?? null}
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
            <ClientInvoiceTaxSummary
              roll={roll}
              tdsAmount={tdsTotal}
              tdsRate={invoice.tdsRate}
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

// ─── Receivable milestone row (nested under PO group) ─────────────────────────

interface ReceivableMilestoneTableRowProps {
  m: BillableMilestone
  projectInvoices: ClientInvoice[]
  baseline: Baseline | null
  services: Service[]
  clientPoById: Map<string, { tdsRate: number | null | undefined }>
  onGenerate: (row: BillableMilestone) => void
  onEditDraft: (invoice: ClientInvoice, row: BillableMilestone) => void
  onView: (invoice: ClientInvoice) => void
  onConvertTax: (invoice: ClientInvoice) => void
  onPayment: (invoice: ClientInvoice, milestoneId: string) => void
}

function ReceivableMilestoneTableRow({
  m,
  projectInvoices,
  baseline,
  services,
  clientPoById,
  onGenerate,
  onEditDraft,
  onView,
  onConvertTax,
  onPayment,
}: ReceivableMilestoneTableRowProps) {
  const inv = findClientInvoiceForMilestone(
    projectInvoices,
    m.milestoneId,
    m.serviceId,
    m.milestoneName,
  )
  const coveringInvoices = findClientInvoicesForMilestone(
    projectInvoices,
    m.milestoneId,
    m.serviceId,
    m.milestoneName,
  )
  const draftInv = findDraftInvoiceForMilestone(coveringInvoices)
  const paymentEligibleInv = findTaxInvoiceEligibleForPayment(coveringInvoices, balancePending)
  const milestoneInvoices = inv ? [inv] : []
  const isBilled = clientMilestoneIsBilled(
    projectInvoices,
    m.milestoneId,
    m.serviceId,
    m.milestoneName,
  )
  const poTdsRate = clientPoById.get(m.clientPoId)?.tdsRate ?? null
  const billingPhase = milestoneBillingPhase(milestoneInvoices)
  const paymentPhase = milestonePaymentPhase(milestoneInvoices, m.milestoneId)
  const billingBadge = milestoneBillingStatusBadge(billingPhase)
  const paymentBadge = milestonePaymentStatusBadge(paymentPhase)
  const dueOverdue =
    inv != null && balancePending(inv) > MONEY_EPS && isDueDateOverdue(inv.dueDate)

  const rowAmounts = resolveReceivableMilestoneAmounts(m, inv, poTdsRate, baseline, services)
  const paymentSummary = resolveReceivableMilestonePaymentSummary(inv, m.milestoneId, rowAmounts)
  const { base, gstRate, gstAmount, labourCess, tdsAmount, net } = rowAmounts
  const tds = paymentSummary?.tds ?? 0
  const received = paymentSummary?.received ?? 0
  const outstanding = paymentSummary?.outstanding ?? 0

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
            onView={() => onView(inv)}
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
          labourCess={labourCess}
          tdsRate={inv?.tdsRate ?? poTdsRate}
          tdsAmount={tdsAmount}
          net={net}
        />
      </TableCell>
      <TableCell sx={RECEIVABLES_TABLE_CELL_SX}>
        {inv ? (
          <PaymentSummaryColumn
            tds={tds}
            labourCess={labourCess}
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
          <Stack direction="column" gap={0.5} alignItems="center">
            <StatusBadge status={billingBadge.type} label={billingBadge.label} />
            <StatusBadge status={paymentBadge.type} label={paymentBadge.label} />
          </Stack>
        </Box>
      </TableCell>
      <TableCell sx={RECEIVABLES_ACTION_CELL_SX} align="center">
        <ProjectLiveRowActionMenu
          items={
            !isBilled
              ? [
                  {
                    label: 'Generate Invoice',
                    onClick: () => onGenerate(m),
                  },
                ]
              : [
                  {
                    label: 'View',
                    onClick: () => onView(inv!),
                  },
                  {
                    label: 'Convert to Tax Invoice',
                    onClick: () => onConvertTax(draftInv!),
                    hidden: draftInv == null,
                  },
                  {
                    label: 'Edit Draft',
                    onClick: () => onEditDraft(draftInv!, m),
                    hidden: draftInv == null,
                  },
                  {
                    label: 'Record Payment',
                    onClick: () => onPayment(paymentEligibleInv!, m.milestoneId),
                    hidden: paymentEligibleInv == null,
                  },
                ]
          }
        />
      </TableCell>
    </TableRow>
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
  const theme = useTheme()
  const { invoices } = useAppSelector((s) => s.live)
  const clientPOs = useAppSelector((s) => s.baseline.clientPOs)
  const baseline = useAppSelector((s) => s.baseline.baseline)
  const { services } = useAppSelector((s) => s.settings)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatePreset, setGeneratePreset] = useState<BillableMilestone | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<ClientInvoice | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<ClientInvoice | null>(null)
  const [paymentMilestoneId, setPaymentMilestoneId] = useState<string | undefined>()
  const [viewInvoice, setViewInvoice] = useState<ClientInvoice | null>(null)
  const [convertTaxTarget, setConvertTaxTarget] = useState<ClientInvoice | null>(null)
  const [convertingTax, setConvertingTax] = useState(false)
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null)
  const showToast = useToast((s) => s.showToast)

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

  const poGroups = useMemo(
    () => buildClientPoReceivableGroups(billableTemplates, clientPOs, projectInvoices),
    [billableTemplates, clientPOs, projectInvoices],
  )

  const clientPoById = useMemo(() => {
    const map = new Map<string, { tdsRate: number | null | undefined }>()
    for (const po of clientPOs) {
      map.set(po.id, { tdsRate: po.tdsRate })
    }
    return map
  }, [clientPOs])

  function openGenerate(row: BillableMilestone) {
    setEditingInvoice(null)
    setGeneratePreset(row)
    setGenerateOpen(true)
  }

  function openEditDraft(invoice: ClientInvoice, row: BillableMilestone) {
    setEditingInvoice(invoice)
    setGeneratePreset(row)
    setGenerateOpen(true)
  }

  function closeGenerate() {
    setGenerateOpen(false)
    setGeneratePreset(null)
    setEditingInvoice(null)
  }

  function openPayment(inv: ClientInvoice, milestoneId: string) {
    setPaymentInvoice(inv)
    setPaymentMilestoneId(milestoneId)
  }

  async function confirmConvertTax() {
    if (!convertTaxTarget) return
    setConvertingTax(true)
    try {
      await dispatch(convertDraftToTax(convertTaxTarget.id)).unwrap()
      showToast({ title: 'Converted to tax invoice', variant: 'success' })
      void dispatch(fetchInvoices(projectId))
    } catch (e) {
      showToast({ title: String(e), variant: 'error' })
    } finally {
      setConvertingTax(false)
      setConvertTaxTarget(null)
    }
  }

  const viewInvoiceResolved = useMemo(() => {
    if (!viewInvoice) return null
    return projectInvoices.find((i) => i.id === viewInvoice.id) ?? viewInvoice
  }, [projectInvoices, viewInvoice])

  const paymentInvoiceResolved = useMemo(() => {
    if (!paymentInvoice) return null
    return projectInvoices.find((i) => i.id === paymentInvoice.id) ?? paymentInvoice
  }, [projectInvoices, paymentInvoice])

  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const expandedBg = alpha(theme.palette.primary.main, 0.03)

  function togglePoExpanded(poId: string) {
    setExpandedPoId((prev) => (prev === poId ? null : poId))
  }

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
              '& .MuiTableCell-root': { verticalAlign: 'middle', wordBreak: 'break-word' },
            }}
          >
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...TABLE_HEADER_SX, width: 44, px: 1 }} />
                <TableCell sx={TABLE_HEADER_SX}>PO Number</TableCell>
                <TableCell sx={RECEIVABLE_PARENT_CENTER_HEADER_SX}>Total Milestones</TableCell>
                <TableCell sx={RECEIVABLE_PARENT_CENTER_HEADER_SX}>Payment Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poGroups.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={RECEIVABLE_PARENT_COL_COUNT}
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
              ) : (
                poGroups.map((group) => {
                  const isExpanded = expandedPoId === group.poId
                  return (
                    <Fragment key={group.poId}>
                      <TableRow
                        hover
                        onClick={() => togglePoExpanded(group.poId)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isExpanded ? expandedBg : undefined,
                          '&:hover': { bgcolor: hoverBg },
                          '& td': { borderBottom: isExpanded ? 'none' : undefined },
                        }}
                      >
                        <TableCell sx={{ ...TABLE_CELL_SX, px: 1, width: 44 }}>
                          <IconButton
                            size="small"
                            aria-label={isExpanded ? 'Collapse milestones' : 'Expand milestones'}
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePoExpanded(group.poId)
                            }}
                            sx={{ p: 0.5 }}
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} strokeWidth={1.75} />
                            ) : (
                              <ChevronRight size={16} strokeWidth={1.75} />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={TABLE_CELL_SX}>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}
                          >
                            {group.poNumber}
                          </Typography>
                        </TableCell>
                        <TableCell sx={RECEIVABLE_PARENT_CENTER_CELL_SX}>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                            {group.milestones.length}
                          </Typography>
                        </TableCell>
                        <TableCell sx={RECEIVABLE_PARENT_CENTER_CELL_SX}>
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Badge
                              label={group.paymentStatus}
                              variant="soft"
                              color={clientPOReceivablePaymentStatusColor(group.paymentStatus)}
                              size="sm"
                            />
                          </Box>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell
                          colSpan={RECEIVABLE_PARENT_COL_COUNT}
                          sx={{
                            p: 0,
                            borderBottom: isExpanded
                              ? `1px solid ${tokens.color.neutral[100]}`
                              : 'none',
                          }}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box
                              sx={{
                                px: 2,
                                py: 1.5,
                                bgcolor: alpha(theme.palette.text.primary, 0.02),
                              }}
                            >
                              <Table
                                size="small"
                                sx={{
                                  tableLayout: 'fixed',
                                  width: '100%',
                                  bgcolor: 'background.paper',
                                  border: `1px solid ${tokens.color.neutral[100]}`,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  '& .MuiTableCell-root': {
                                    verticalAlign: 'top',
                                    wordBreak: 'break-word',
                                  },
                                }}
                              >
                                <colgroup>
                                  {Array.from({ length: RECEIVABLES_COLUMN_COUNT }, (_, index) => (
                                    <col key={index} style={{ width: RECEIVABLES_COL_WIDTH }} />
                                  ))}
                                </colgroup>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>
                                      Milestone / Service
                                    </TableCell>
                                    <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>
                                      Invoice Details
                                    </TableCell>
                                    <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>Due Date</TableCell>
                                    <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>
                                      Amount Breakdown
                                    </TableCell>
                                    <TableCell sx={RECEIVABLES_TABLE_HEADER_SX}>
                                      Payment Summary
                                    </TableCell>
                                    <TableCell sx={RECEIVABLES_STATUS_HEADER_SX}>Status</TableCell>
                                    <TableCell sx={RECEIVABLES_ACTION_HEADER_SX} align="center">
                                      Action
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {group.milestones.map((m) => (
                                    <ReceivableMilestoneTableRow
                                      key={milestoneRowKey(m)}
                                      m={m}
                                      projectInvoices={projectInvoices}
                                      baseline={baseline}
                                      services={services}
                                      clientPoById={clientPoById}
                                      onGenerate={openGenerate}
                                      onEditDraft={openEditDraft}
                                      onView={setViewInvoice}
                                      onConvertTax={setConvertTaxTarget}
                                      onPayment={openPayment}
                                    />
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  )
                })
              )}
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
        editingInvoice={editingInvoice}
        onClose={closeGenerate}
        onSaved={() => {
          void dispatch(fetchInvoices(projectId))
        }}
      />
      <RecordClientInvoicePaymentModal
        open={!!paymentInvoice}
        projectId={projectId}
        invoice={paymentInvoiceResolved}
        targetMilestoneId={paymentMilestoneId}
        paymentEntryMode="project_live"
        onClose={() => {
          setPaymentInvoice(null)
          setPaymentMilestoneId(undefined)
        }}
      />
      <ViewInvoiceDrawer
        open={!!viewInvoice}
        invoice={viewInvoiceResolved}
        projectName={projectName}
        onClose={() => setViewInvoice(null)}
        onRecordPayment={() => {
          if (!viewInvoiceResolved) return
          const eligible = findTaxInvoiceEligibleForPayment(
            findClientInvoicesForMilestone(
              projectInvoices,
              viewInvoiceResolved.milestoneId,
              viewInvoiceResolved.serviceId,
              viewInvoiceResolved.milestoneName,
            ),
            balancePending,
          )
          if (eligible) openPayment(eligible, viewInvoiceResolved.milestoneId)
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
      <Modal
        open={!!convertTaxTarget}
        onClose={() => setConvertTaxTarget(null)}
        title="Convert as tax invoice?"
        size="xs"
        footer={
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setConvertTaxTarget(null)}
              disabled={convertingTax}
            >
              Cancel
            </Button>
            <Button variant="contained" size="sm" onClick={confirmConvertTax} loading={convertingTax}>
              Convert
            </Button>
          </Stack>
        }
      >
        <Typography variant="body2">
          Convert <strong>{convertTaxTarget?.invoiceNumber}</strong> to a tax invoice? This cannot be
          undone.
        </Typography>
      </Modal>
    </>
  )
}
