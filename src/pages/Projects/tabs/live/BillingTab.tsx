import { useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button as MuiButton,
  Select as MuiSelect,
  MenuItem,
} from '@mui/material'
import { Add, Receipt } from '@mui/icons-material'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../../components/templates/DrawerForm'
import { StatusBadge, Input } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createInvoice, recordReceipt } from '../../../../slices/live/thunk'
import type { Invoice } from '../../../../slices/live/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import { useToast } from '@/design-system/components'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function invoiceStatusType(status: Invoice['status']): { type: StatusType; label: string } {
  switch (status) {
    case 'Paid':     return { type: 'active',      label: 'Paid' }
    case 'Sent':     return { type: 'in_progress', label: 'Sent' }
    case 'Overdue':  return { type: 'at_risk',     label: 'Overdue' }
    case 'Draft':    return { type: 'draft',        label: 'Draft' }
    case 'Cancelled':return { type: 'cancelled',   label: 'Cancelled' }
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

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ invoices }: { invoices: Invoice[] }) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0)
  const received = invoices.reduce((s, i) => s + i.paidAmount, 0)
  const outstanding = totalInvoiced - received
  const tds = invoices.reduce((s, i) => s + i.tdsAmount, 0)

  const metrics = [
    { label: 'TOTAL INVOICED', value: totalInvoiced },
    { label: 'RECEIVED', value: received, highlight: true },
    { label: 'OUTSTANDING', value: outstanding, color: outstanding > 0 ? 'warning.main' : 'success.main' },
    { label: 'TDS DEDUCTED', value: tds },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
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

// ─── Generate Invoice Drawer ──────────────────────────────────────────────────

interface GenerateDrawerProps {
  open: boolean
  projectId: string
  onClose: () => void
}

const GST_RATES = [0, 5, 12, 18, 28]

function GenerateInvoiceDrawer({ open, projectId, onClose }: GenerateDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [milestoneId, setMilestoneId] = useState('cm-001')
  const [milestoneName, setMilestoneName] = useState('Mobilization')
  const [serviceId, setServiceId] = useState('ps-001')
  const [serviceName, setServiceName] = useState('Interior Design')
  const [amount, setAmount] = useState(300000)
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [gstRate, setGstRate] = useState(18)
  const [tdsRate, setTdsRate] = useState(10)

  const gstAmount = Math.round(amount * gstRate / 100)
  const grossAmount = amount + gstAmount
  const tdsAmount = Math.round(amount * tdsRate / 100)
  const netReceivable = grossAmount - tdsAmount

  async function handleSubmit() {
    if (!invoiceDate || !dueDate) {
      toast.error('Please fill in all required fields')
      return
    }
    const invoiceNumber = `INV-${new Date().getFullYear().toString().slice(2)}-${String(Math.floor(Math.random() * 900) + 100)}`
    try {
      await dispatch(createInvoice({
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
          tdsRate,
          tdsAmount,
          grossAmount,
          netReceivable,
          status: 'Draft',
          paidAmount: 0,
          paidDate: null,
          receiptReference: null,
        },
      })).unwrap()
      toast.success('Invoice generated')
      onClose()
    } catch {
      toast.error('Failed to generate invoice')
    }
  }

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
              onChange={(e) => {
                setMilestoneId(e.target.value)
                if (e.target.value === 'cm-001') { setMilestoneName('Mobilization'); setAmount(300000); setServiceId('ps-001'); setServiceName('Interior Design') }
                if (e.target.value === 'cm-002') { setMilestoneName('Design Draft'); setAmount(600000); setServiceId('ps-001'); setServiceName('Interior Design') }
                if (e.target.value === 'cm-004') { setMilestoneName('Mobilization'); setAmount(500000); setServiceId('ps-002'); setServiceName('Civil Works') }
              }}
              size="small"
              fullWidth
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="cm-001" sx={{ fontSize: 12 }}>Mobilization — Interior Design — ₹3L</MenuItem>
              <MenuItem value="cm-002" sx={{ fontSize: 12 }}>Design Draft — Interior Design — ₹6L</MenuItem>
              <MenuItem value="cm-004" sx={{ fontSize: 12 }}>Mobilization — Civil Works — ₹5L</MenuItem>
            </MuiSelect>
          </FormField>
        </Box>
        <FormField label="Invoice Date" required>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            size="sm"
          />
        </FormField>
        <FormField label="Due Date" required>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            size="sm"
          />
        </FormField>
      </FormSection>

      <FormSection title="Tax Details" columns={2}>
        <FormField label="GST Rate">
          <MuiSelect
            value={gstRate}
            onChange={(e) => setGstRate(Number(e.target.value))}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {GST_RATES.map((r) => (
              <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>{r}%</MenuItem>
            ))}
          </MuiSelect>
        </FormField>
        <FormField label="TDS Rate" hint="TDS rate as per agreement">
          <Input
            type="number"
            value={tdsRate.toString()}
            onChange={(e) => setTdsRate(Number(e.target.value))}
            size="sm"
          />
        </FormField>
      </FormSection>

      {/* Preview card */}
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
          { label: `Base Amount`, value: `₹${formatCurrency(amount)}` },
          { label: `GST (${gstRate}%)`, value: `+₹${formatCurrency(gstAmount)}` },
        ].map((r) => (
          <Stack key={r.label} direction="row" justifyContent="space-between" sx={{ mb: '4px' }}>
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>{r.label}</Typography>
            <Typography variant="body2" sx={{ fontSize: 12 }}>{r.value}</Typography>
          </Stack>
        ))}
        <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
        <Stack direction="row" justifyContent="space-between" sx={{ mb: '4px' }}>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>Gross</Typography>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>₹{formatCurrency(grossAmount)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: '4px' }}>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>TDS ({tdsRate}%)</Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main' }}>-₹{formatCurrency(tdsAmount)}</Typography>
        </Stack>
        <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>Net Receivable</Typography>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>₹{formatCurrency(netReceivable)}</Typography>
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
  const toast = useToast()

  const [paidAmount, setPaidAmount] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [receiptReference, setReceiptReference] = useState('')
  const [paymentMode, setPaymentMode] = useState('NEFT')

  async function handleSubmit() {
    if (!invoice || !paidDate || !receiptReference) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(recordReceipt({
        projectId,
        invoiceId: invoice.id,
        data: {
          paidAmount: Number(paidAmount) || invoice.netReceivable,
          paidDate,
          receiptReference,
          paymentMode,
        },
      })).unwrap()
      toast.success('Payment receipt recorded')
      onClose()
    } catch {
      toast.error('Failed to record receipt')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Record Payment Receipt"
      subtitle={invoice?.invoiceNumber ?? ''}
      onSubmit={handleSubmit}
      submitLabel="Record"
      submitLoading={saving}
    >
      <FormSection title="Payment Details" columns={2}>
        <FormField label="Paid Amount" required>
          <Input
            type="number"
            value={paidAmount || String(invoice?.netReceivable ?? '')}
            onChange={(e) => setPaidAmount(e.target.value)}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <FormField label="Payment Date" required>
          <Input
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            size="sm"
          />
        </FormField>
        <FormField label="Reference Number" required>
          <Input
            value={receiptReference}
            onChange={(e) => setReceiptReference(e.target.value)}
            placeholder="NEFT/RTGS reference number"
            size="sm"
          />
        </FormField>
        <FormField label="Payment Mode">
          <MuiSelect
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI'].map((m) => (
              <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>{m}</MenuItem>
            ))}
          </MuiSelect>
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
  const { invoices } = useAppSelector((s) => s.live)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null)

  return (
    <>
      <SummaryStrip invoices={invoices} />

      <WorkspaceSection
        title="Client Invoices"
        noPadding
        action={
          <MuiButton
            size="small"
            variant="contained"
            startIcon={<Add sx={{ fontSize: 14 }} />}
            onClick={() => setGenerateOpen(true)}
            sx={{ fontSize: 12, height: 30 }}
          >
            Generate Invoice
          </MuiButton>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Invoice #</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount Breakdown</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>TDS & Net</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Due Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ ...TABLE_CELL_SX, textAlign: 'center', color: 'text.secondary' }}>
                  <Stack alignItems="center" gap={1} py={4}>
                    <Receipt sx={{ fontSize: 32, color: tokens.color.neutral[300] }} />
                    <Typography variant="body2" color="text.secondary">No invoices yet</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {invoices.map((inv) => {
              const isOverdue = inv.status === 'Overdue'
              const st = invoiceStatusType(inv.status)
              return (
                <TableRow key={inv.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: 12, fontFamily: 'monospace', color: 'primary.main', cursor: 'pointer', fontWeight: 500 }}
                    >
                      {inv.invoiceNumber}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {formatDate(inv.invoiceDate)}
                    </Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{inv.milestoneName}</Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: tokens.color.neutral[400] }}>{inv.serviceName}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>Base: ₹{formatCurrency(inv.amount)}</Typography>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>GST ({inv.gstRate}%): +₹{formatCurrency(inv.gstAmount)}</Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>Gross: ₹{formatCurrency(inv.grossAmount)}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>TDS ({inv.tdsRate}%): -₹{formatCurrency(inv.tdsAmount)}</Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'primary.main' }}>Net: ₹{formatCurrency(inv.netReceivable)}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, color: isOverdue ? 'error.main' : 'text.primary' }}>
                      {formatDate(inv.dueDate)}
                    </Typography>
                    {isOverdue && (
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'error.main' }}>Overdue</Typography>
                    )}
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {(inv.status === 'Sent' || inv.status === 'Overdue') && (
                        <MuiButton
                          size="small"
                          variant="contained"
                          onClick={() => setReceiptInvoice(inv)}
                          sx={{ fontSize: 11, height: 26, px: 1 }}
                        >
                          Record Receipt
                        </MuiButton>
                      )}
                      {inv.status === 'Overdue' && (
                        <MuiButton size="small" variant="outlined" sx={{ fontSize: 11, height: 26, px: 1 }}>
                          Send Reminder
                        </MuiButton>
                      )}
                      {inv.status === 'Draft' && (
                        <>
                          <MuiButton size="small" variant="contained" sx={{ fontSize: 11, height: 26, px: 1 }}>Send</MuiButton>
                          <MuiButton size="small" variant="outlined" sx={{ fontSize: 11, height: 26, px: 1 }}>Edit</MuiButton>
                        </>
                      )}
                      {inv.status === 'Paid' && (
                        <MuiButton size="small" variant="text" sx={{ fontSize: 11, height: 26, px: 1 }}>View</MuiButton>
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
        onClose={() => setGenerateOpen(false)}
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
