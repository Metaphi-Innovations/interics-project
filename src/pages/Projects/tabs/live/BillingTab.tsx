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
  Select as MuiSelect,
  MenuItem,
} from '@mui/material'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../../components/templates/DrawerForm'
import { StatusBadge, Input, Button, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createInvoice, recordReceipt, updateInvoice } from '../../../../slices/live/thunk'
import type { Invoice } from '../../../../slices/live/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'

// ─── Demo billable milestones (per project) — align with MSW invoice seeds ───

interface BillableMilestone {
  milestoneId: string
  milestoneName: string
  serviceId: string
  serviceName: string
  baseAmount: number
}

const BILLABLE_BY_PROJECT: Record<string, BillableMilestone[]> = {
  'p-001': [
    {
      milestoneId: 'cm-001',
      milestoneName: 'Mobilization',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 300000,
    },
    {
      milestoneId: 'cm-002',
      milestoneName: 'Design Draft',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 600000,
    },
    {
      milestoneId: 'cm-004',
      milestoneName: 'Mobilization',
      serviceId: 'ps-002',
      serviceName: 'Civil Works',
      baseAmount: 500000,
    },
    {
      milestoneId: 'cm-005',
      milestoneName: 'Final Handover',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 450000,
    },
  ],
  'p-002': [
    {
      milestoneId: 'cm-101',
      milestoneName: 'Design phase',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 420000,
    },
    {
      milestoneId: 'cm-102',
      milestoneName: 'Site execution',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 280000,
    },
    {
      milestoneId: 'cm-103',
      milestoneName: 'Snagging',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 150000,
    },
  ],
  'p-004': [
    {
      milestoneId: 'cm-401',
      milestoneName: 'Concept',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 195000,
    },
    {
      milestoneId: 'cm-402',
      milestoneName: 'Documentation',
      serviceId: 'ps-001',
      serviceName: 'Interior Design',
      baseAmount: 120000,
    },
  ],
}

/** Default GST % (would come from org settings in production). */
const DEFAULT_GST_RATE = 18

const GST_RATES = [0, 5, 12, 18, 28]

function milestoneRowKey(m: Pick<BillableMilestone, 'milestoneId' | 'serviceId'>): string {
  return `${m.milestoneId}:${m.serviceId}`
}

function hasInvoiceForMilestone(invoices: Invoice[], m: BillableMilestone): boolean {
  return invoices.some(
    (i) => i.milestoneId === m.milestoneId && i.serviceId === m.serviceId,
  )
}

function isDueDateOverdue(dueDate: string): boolean {
  const d = new Date(dueDate)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function invoiceStatusType(status: Invoice['status']): { type: StatusType; label: string } {
  switch (status) {
    case 'Paid':
      return { type: 'paid', label: 'Paid' }
    case 'Sent':
      return { type: 'sent', label: 'Sent' }
    case 'Overdue':
      return { type: 'overdue', label: 'Overdue' }
    case 'Generated':
      return { type: 'invoice_draft', label: 'Generated' }
    case 'Cancelled':
      return { type: 'cancelled', label: 'Cancelled' }
  }
}

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: '10px',
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: '12px',
  px: 2,
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
      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
        Base: ₹{formatCurrency(base)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
        GST ({gstRate}%): +₹{formatCurrency(gstAmount)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
        Gross: ₹{formatCurrency(gross)}
      </Typography>
    </Stack>
  )
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ invoices }: { invoices: Invoice[] }) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.grossAmount, 0)
  const received = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding = totalInvoiced - received
  const tds = invoices.reduce((s, i) => s + (i.receiptTdsAmount ?? 0), 0)

  const metrics = [
    { label: 'TOTAL INVOICED', value: totalInvoiced },
    { label: 'RECEIVED', value: received, highlight: true },
    {
      label: 'OUTSTANDING',
      value: outstanding,
      color: outstanding > 0 ? 'warning.main' : 'success.main',
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
            p: '14px 16px',
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
              mt: '2px',
              color: m.color ?? (m.highlight ? 'primary.main' : 'text.primary'),
            }}
          >
            ₹{formatCurrency(m.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Generate Invoice Drawer ────────────────────────────────────────────────────

interface GenerateDrawerProps {
  open: boolean
  projectId: string
  preset: BillableMilestone | null
  onClose: () => void
}

function GenerateInvoiceDrawer({ open, projectId, preset, onClose }: GenerateDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [milestoneId, setMilestoneId] = useState('')
  const [milestoneName, setMilestoneName] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [amount, setAmount] = useState(0)
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [gstRate, setGstRate] = useState(DEFAULT_GST_RATE)

  useEffect(() => {
    if (!open || !preset) return
    setMilestoneId(preset.milestoneId)
    setMilestoneName(preset.milestoneName)
    setServiceId(preset.serviceId)
    setServiceName(preset.serviceName)
    setAmount(preset.baseAmount)
    setInvoiceDate('')
    setDueDate('')
    setGstRate(DEFAULT_GST_RATE)
  }, [open, preset])

  const gstAmount = Math.round((amount * gstRate) / 100)
  const grossAmount = amount + gstAmount

  async function handleSubmit() {
    if (!preset || !invoiceDate || !dueDate) {
      showToast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    const yy = String(new Date().getFullYear()).slice(2)
    const invoiceNumber = `LIV-${yy}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`
    try {
      await dispatch(
        createInvoice({
          projectId,
          data: {
            invoiceNumber,
            invoiceDate,
            dueDate,
            milestoneId,
            milestoneName,
            serviceId,
            serviceName,
            amount,
            gstRate,
            gstAmount,
            grossAmount,
            netReceivable: grossAmount,
            status: 'Generated',
            paidAmount: 0,
            paidDate: null,
            receiptReference: null,
            paymentMode: null,
            receiptTdsRate: null,
            receiptTdsAmount: 0,
          },
        }),
      ).unwrap()
      showToast({ title: 'Invoice generated', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to generate invoice', variant: 'error' })
    }
  }

  if (!preset) return null

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Generate Invoice"
      subtitle="Create client invoice for milestone"
      onSubmit={handleSubmit}
      submitLabel="Generate"
      submitLoading={saving}
    >
      <FormSection title="Invoice Details" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Milestone" required>
            <MuiSelect
              value={milestoneId}
              disabled
              size="small"
              fullWidth
              sx={{ fontSize: 12 }}
            >
              <MenuItem value={milestoneId} sx={{ fontSize: 12 }}>
                {milestoneName} — {serviceName} — ₹{formatCurrency(amount)}
              </MenuItem>
            </MuiSelect>
          </FormField>
        </Box>
        <FormField label="Invoice Date" required>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(v) => setInvoiceDate(v)}
            size="sm"
          />
        </FormField>
        <FormField label="Due Date" required>
          <Input type="date" value={dueDate} onChange={(v) => setDueDate(v)} size="sm" />
        </FormField>
      </FormSection>

      <FormSection title="Tax Details" columns={2}>
        <FormField label="GST Rate" hint="Pre-filled from settings; editable">
          <MuiSelect
            value={gstRate}
            onChange={(e) => setGstRate(Number(e.target.value))}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {GST_RATES.map((r) => (
              <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>
                {r}%
              </MenuItem>
            ))}
          </MuiSelect>
        </FormField>
      </FormSection>

      <Box
        sx={{
          bgcolor: tokens.color.neutral[50],
          borderRadius: 2,
          p: '12px 16px',
          mt: 1,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 12, mb: 1 }}>
          Invoice Preview
        </Typography>
        {[
          { label: 'Base Amount', value: `₹${formatCurrency(amount)}` },
          { label: `GST (${gstRate}%)`, value: `+₹${formatCurrency(gstAmount)}` },
        ].map((r) => (
          <Stack key={r.label} direction="row" justifyContent="space-between" sx={{ mb: '4px' }}>
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
              {r.label}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              {r.value}
            </Typography>
          </Stack>
        ))}
        <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>
            Gross
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
            ₹{formatCurrency(grossAmount)}
          </Typography>
        </Stack>
      </Box>
    </DrawerForm>
  )
}

// ─── Record Receipt Drawer ────────────────────────────────────────────────────

interface ReceiptDrawerProps {
  open: boolean
  invoice: Invoice | null
  projectId: string
  onClose: () => void
}

function RecordReceiptDrawer({ open, invoice, projectId, onClose }: ReceiptDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [amountReceived, setAmountReceived] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [receiptTdsRate, setReceiptTdsRate] = useState(10)
  const [receiptReference, setReceiptReference] = useState('')
  const [paymentMode, setPaymentMode] = useState('NEFT')

  useEffect(() => {
    if (!open || !invoice) return
    setAmountReceived(String(invoice.grossAmount))
    setPaidDate('')
    setReceiptTdsRate(10)
    setReceiptReference('')
    setPaymentMode('NEFT')
  }, [open, invoice?.id])

  const receiptTdsAmount =
    invoice != null ? Math.round((invoice.amount * receiptTdsRate) / 100) : 0
  const grossReceived = Number(amountReceived) || 0
  const netReceived = Math.round(grossReceived - receiptTdsAmount)

  async function handleSubmit() {
    if (!invoice || !paidDate || !receiptReference.trim()) {
      showToast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (grossReceived <= 0 || netReceived < 0) {
      showToast({ title: 'Enter a valid amount received', variant: 'error' })
      return
    }
    try {
      await dispatch(
        recordReceipt({
          projectId,
          invoiceId: invoice.id,
          data: {
            paidAmount: netReceived,
            paidDate,
            receiptReference: receiptReference.trim(),
            paymentMode,
            receiptTdsRate,
            receiptTdsAmount,
            netReceived,
          },
        }),
      ).unwrap()
      showToast({ title: 'Payment receipt recorded', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to record receipt', variant: 'error' })
    }
  }

  if (!invoice) return null

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Record Payment Receipt"
      subtitle={invoice.invoiceNumber}
      onSubmit={handleSubmit}
      submitLabel="Record"
      submitLoading={saving}
    >
      <FormSection title="Receipt" columns={2}>
        <FormField label="Amount Received" required hint="Gross credited before TDS withheld">
          <Input
            type="number"
            value={amountReceived}
            onChange={(v) => setAmountReceived(v)}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <FormField label="Receipt Date" required>
          <Input type="date" value={paidDate} onChange={(v) => setPaidDate(v)} size="sm" />
        </FormField>
        <FormField label="TDS Deduction %" required>
          <Input
            type="number"
            value={String(receiptTdsRate)}
            onChange={(v) => setReceiptTdsRate(Number(v) || 0)}
            size="sm"
          />
        </FormField>
        <FormField label="TDS Amount">
          <Typography variant="body2" sx={{ fontSize: 13, pt: 1 }}>
            ₹{formatCurrency(receiptTdsAmount)}
          </Typography>
        </FormField>
        <FormField label="Net Received">
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, pt: 1 }}>
            ₹{formatCurrency(netReceived)}
          </Typography>
        </FormField>
        <FormField label="Payment Mode" required>
          <MuiSelect
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI'].map((m) => (
              <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>
                {m}
              </MenuItem>
            ))}
          </MuiSelect>
        </FormField>
        <FormField label="Reference / UTR number" required>
          <Input
            value={receiptReference}
            onChange={(v) => setReceiptReference(v)}
            placeholder="NEFT / RTGS / UTR"
            size="sm"
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── BillingTab ───────────────────────────────────────────────────────────────

interface BillingTabProps {
  projectId: string
}

export default function BillingTab({ projectId }: BillingTabProps) {
  const dispatch = useAppDispatch()
  const { invoices } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generatePreset, setGeneratePreset] = useState<BillableMilestone | null>(null)
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null)

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  const billableTemplates = BILLABLE_BY_PROJECT[projectId] ?? []

  const milestonesToInvoice = useMemo(
    () => billableTemplates.filter((m) => !hasInvoiceForMilestone(projectInvoices, m)),
    [billableTemplates, projectInvoices],
  )

  function openGenerate(row: BillableMilestone) {
    setGeneratePreset(row)
    setGenerateOpen(true)
  }

  function closeGenerate() {
    setGenerateOpen(false)
    setGeneratePreset(null)
  }

  async function handleSendReminder(inv: Invoice) {
    try {
      if (inv.status === 'Generated') {
        await dispatch(
          updateInvoice({
            projectId,
            invoiceId: inv.id,
            data: { status: 'Sent' },
          }),
        ).unwrap()
      }
      showToast({ title: 'Reminder sent', variant: 'success' })
    } catch {
      showToast({ title: 'Could not update invoice', variant: 'error' })
    }
  }

  return (
    <>
      <SummaryStrip invoices={projectInvoices} />

      <WorkspaceSection title="Milestones to Invoice" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount Breakdown</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {milestonesToInvoice.length === 0 && billableTemplates.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{
                    ...TABLE_CELL_SX,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                    py: 3,
                  }}
                >
                  All milestones have been invoiced
                </TableCell>
              </TableRow>
            )}
            {billableTemplates.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
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
            {milestonesToInvoice.map((m) => {
              const gstAmount = Math.round((m.baseAmount * DEFAULT_GST_RATE) / 100)
              const gross = m.baseAmount + gstAmount
              return (
                <TableRow key={milestoneRowKey(m)} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {m.milestoneName}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {m.serviceName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <AmountBreakdownColumn
                      base={m.baseAmount}
                      gstRate={DEFAULT_GST_RATE}
                      gstAmount={gstAmount}
                      gross={gross}
                    />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status="draft" label="Not Invoiced" />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Button
                      size="sm"
                      variant="contained"
                      label="Generate Invoice"
                      onClick={() => openGenerate(m)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <WorkspaceSection title="Client Invoices" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount Breakdown</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Due Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectInvoices.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{
                    ...TABLE_CELL_SX,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                    py: 3,
                  }}
                >
                  No invoices generated yet
                </TableCell>
              </TableRow>
            )}
            {projectInvoices.map((inv) => {
              const st = invoiceStatusType(inv.status)
              const dueOverdueVisual = inv.status !== 'Paid' && isDueDateOverdue(inv.dueDate)
              const showReceipt =
                inv.status === 'Generated' || inv.status === 'Sent' || inv.status === 'Overdue'
              const showReminder =
                inv.status === 'Generated' || inv.status === 'Sent' || inv.status === 'Overdue'
              const receiptPrimary = inv.status === 'Overdue'

              return (
                <TableRow key={inv.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {inv.milestoneName}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
                      {inv.invoiceNumber} · {formatDate(inv.invoiceDate)} · {inv.serviceName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <AmountBreakdownColumn
                      base={inv.amount}
                      gstRate={inv.gstRate}
                      gstAmount={inv.gstAmount}
                      gross={inv.grossAmount}
                    />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {formatDate(inv.invoiceDate)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: 12,
                        color: dueOverdueVisual ? 'error.main' : 'text.primary',
                      }}
                    >
                      {formatDate(inv.dueDate)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {showReceipt && (
                        <Button
                          size="sm"
                          variant={receiptPrimary ? 'contained' : 'outlined'}
                          label="Record Receipt"
                          onClick={() => setReceiptInvoice(inv)}
                        />
                      )}
                      {showReminder && (
                        <Button
                          size="sm"
                          variant="outlined"
                          label="Send Reminder"
                          onClick={() => void handleSendReminder(inv)}
                        />
                      )}
                      {inv.status === 'Paid' && (
                        <Button
                          size="sm"
                          variant="text"
                          label="View"
                          onClick={() =>
                            showToast({
                              title: `Invoice ${inv.invoiceNumber}`,
                              variant: 'info',
                            })
                          }
                        />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <GenerateInvoiceDrawer
        open={generateOpen}
        projectId={projectId}
        preset={generatePreset}
        onClose={closeGenerate}
      />
      <RecordReceiptDrawer
        open={!!receiptInvoice}
        invoice={receiptInvoice}
        projectId={projectId}
        onClose={() => setReceiptInvoice(null)}
      />
    </>
  )
}
