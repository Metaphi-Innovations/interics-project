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
import {
  StatusBadge,
  Input,
  Button,
  useToast,
  Modal,
  FileUpload,
  Tag,
} from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import {
  payVendorInvoice,
  updateVendorMilestonePayment,
} from '../../../../slices/live/thunk'
import type { VendorMilestonePayment } from '../../../../slices/live/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'

const DEFAULT_TDS_PERCENT = 10

const PAYMENT_MODES = ['Bank Transfer', 'Cheque', 'Cash'] as const

function milestoneStatusBadge(
  status: VendorMilestonePayment['status'],
): { type: StatusType; label: string } {
  switch (status) {
    case 'PendingInvoice':
      return { type: 'draft', label: 'Pending Invoice' }
    case 'InvoiceUploaded':
      return { type: 'pending', label: 'Invoice Uploaded' }
    case 'PaymentGenerated':
      return { type: 'in_progress', label: 'Payment Generated' }
    case 'Paid':
      return { type: 'active', label: 'Paid' }
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

function invoiceAmountDisplay(v: VendorMilestonePayment): number {
  return v.invoiceAmount ?? v.amount
}

function SummaryStrip({
  totalVendorPOValue,
  rows,
}: {
  totalVendorPOValue: number
  rows: VendorMilestonePayment[]
}) {
  const invoicedStatuses: VendorMilestonePayment['status'][] = [
    'InvoiceUploaded',
    'PaymentGenerated',
    'Paid',
  ]
  const totalInvoiced = rows
    .filter((r) => invoicedStatuses.includes(r.status))
    .reduce((s, r) => s + (r.invoiceAmount ?? r.amount), 0)
  const totalPaid = rows
    .filter((r) => r.status === 'Paid')
    .reduce((s, r) => s + (r.paidAmount ?? 0), 0)
  const outstanding = Math.max(0, totalVendorPOValue - totalPaid)

  const metrics = [
    { label: 'TOTAL VENDOR VALUE', value: totalVendorPOValue },
    { label: 'TOTAL INVOICED', value: totalInvoiced },
    { label: 'TOTAL PAID', value: totalPaid, highlight: true },
    {
      label: 'OUTSTANDING',
      value: outstanding,
      color: outstanding > 0 ? 'warning.main' : 'success.main',
    },
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

function VendorServiceCell({ row }: { row: VendorMilestonePayment }) {
  return (
    <Stack gap={0.5} alignItems="flex-start">
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
        {row.vendorName}
      </Typography>
      <Tag label={row.serviceName} size="sm" color={tokens.color.neutral[300]} />
    </Stack>
  )
}

function AmountBreakdownCell({ row }: { row: VendorMilestonePayment }) {
  const inv = invoiceAmountDisplay(row)
  const showTds =
    row.status === 'PaymentGenerated' ||
    row.status === 'Paid' ||
    (row.tdsAmount != null && row.tdsAmount > 0)

  if (!showTds) {
    return (
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
        Invoice: ₹{formatCurrency(inv)}
      </Typography>
    )
  }

  const pct = row.tdsPercent ?? DEFAULT_TDS_PERCENT
  return (
    <Stack gap={0.25}>
      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
        Invoice: ₹{formatCurrency(inv)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
        TDS ({pct}%): -₹{formatCurrency(row.tdsAmount ?? 0)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
        Net Payable: ₹{formatCurrency(row.netPayable ?? inv - (row.tdsAmount ?? 0))}
      </Typography>
    </Stack>
  )
}

// ─── Upload Invoice Drawer ────────────────────────────────────────────────────

interface UploadDrawerProps {
  open: boolean
  row: VendorMilestonePayment | null
  projectId: string
  onClose: () => void
}

function UploadInvoiceDrawer({ open, row, projectId, onClose }: UploadDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !row) return
    setInvoiceNumber('')
    setInvoiceDate('')
    setInvoiceAmount(String(row.amount))
    setAttachmentUrl(null)
  }, [open, row?.id])

  async function handleSubmit() {
    if (!row) return
    if (!invoiceNumber.trim() || !invoiceDate || !invoiceAmount.trim()) {
      showToast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    const amt = Number(invoiceAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast({ title: 'Enter a valid invoice amount', variant: 'error' })
      return
    }
    const due = new Date(invoiceDate)
    due.setDate(due.getDate() + 30)
    const dueDate = due.toISOString().slice(0, 10)
    try {
      await dispatch(
        updateVendorMilestonePayment({
          projectId,
          id: row.id,
          data: {
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate,
            invoiceAmount: amt,
            dueDate,
            attachmentUrl: attachmentUrl ?? null,
            status: 'InvoiceUploaded',
          },
        }),
      ).unwrap()
      showToast({ title: 'Invoice uploaded', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to save invoice', variant: 'error' })
    }
  }

  if (!row) return null

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Upload Vendor Invoice"
      subtitle={row.vendorName}
      width={520}
      onSubmit={handleSubmit}
      submitLabel="Save"
      submitLoading={saving}
    >
      <FormSection title="Invoice Details" columns={1}>
        <FormField label="Vendor">
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.vendorName}
          </Typography>
        </FormField>
        <FormField label="Service">
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.serviceName}
          </Typography>
        </FormField>
        <FormField label="Milestone">
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.milestoneName}
          </Typography>
        </FormField>
        <FormField label="Milestone amount">
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
            ₹{formatCurrency(row.amount)}
          </Typography>
        </FormField>
      </FormSection>

      <FormSection title="Upload Invoice" columns={2}>
        <FormField label="Invoice Number" required>
          <Input value={invoiceNumber} onChange={(v) => setInvoiceNumber(v)} size="sm" />
        </FormField>
        <FormField label="Invoice Date" required>
          <Input type="date" value={invoiceDate} onChange={(v) => setInvoiceDate(v)} size="sm" />
        </FormField>
        <FormField label="Invoice Amount" required>
          <Input
            type="number"
            value={invoiceAmount}
            onChange={(v) => setInvoiceAmount(v)}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Attach File (optional)" hint="PDF">
            <FileUpload
              accept="application/pdf,.pdf"
              maxFiles={1}
              onUpload={(files) => {
                const f = files[0]
                setAttachmentUrl(f ? `local://${f.name}` : null)
              }}
              helperText={attachmentUrl ? `Selected: ${attachmentUrl.replace('local://', '')}` : undefined}
            />
          </FormField>
        </Box>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Generate Payment Modal ───────────────────────────────────────────────────

interface PayModalProps {
  open: boolean
  row: VendorMilestonePayment | null
  projectId: string
  onClose: () => void
}

function GeneratePaymentModal({ open, row, projectId, onClose }: PayModalProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [paymentDate, setPaymentDate] = useState('')
  const [tdsPercent, setTdsPercent] = useState(DEFAULT_TDS_PERCENT)
  const [paymentMode, setPaymentMode] = useState<string>(PAYMENT_MODES[0])
  const [referenceNumber, setReferenceNumber] = useState('')

  const baseAmount = row ? invoiceAmountDisplay(row) : 0
  const tdsAmount = Math.round((baseAmount * tdsPercent) / 100)
  const netPayable = Math.round(baseAmount - tdsAmount)

  useEffect(() => {
    if (!open || !row) return
    setPaymentDate('')
    setTdsPercent(DEFAULT_TDS_PERCENT)
    setPaymentMode(PAYMENT_MODES[0])
    setReferenceNumber('')
  }, [open, row?.id])

  async function handleSubmit() {
    if (!row) return
    if (!paymentDate || !referenceNumber.trim()) {
      showToast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    try {
      await dispatch(
        payVendorInvoice({
          projectId,
          id: row.id,
          data: {
            paidAmount: netPayable,
            paidDate: paymentDate,
            paymentMode,
            referenceNumber: referenceNumber.trim(),
            tdsPercent,
            tdsAmount,
            netPayable,
          },
        }),
      ).unwrap()
      showToast({ title: 'Payment recorded', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to record payment', variant: 'error' })
    }
  }

  if (!row) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Payment"
      subtitle="Record vendor payment against uploaded invoice"
      size="sm"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ width: 1 }}>
          <Button variant="outlined" size="sm" label="Cancel" onClick={onClose} />
          <Button
            variant="contained"
            size="sm"
            label="Save"
            loading={saving}
            onClick={() => void handleSubmit()}
          />
        </Stack>
      }
    >
      <Stack gap={2}>
        <FormSection title="Invoice Details" columns={1}>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            <strong>{row.vendorName}</strong> · {row.serviceName}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
            Milestone: {row.milestoneName}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            Invoice #: {row.invoiceNumber}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
            Invoice amount: ₹{formatCurrency(baseAmount)}
          </Typography>
        </FormSection>

        <FormSection title="Payment Details" columns={2}>
          <FormField label="Payment Date" required>
            <Input type="date" value={paymentDate} onChange={(v) => setPaymentDate(v)} size="sm" />
          </FormField>
          <FormField label="TDS %" required>
            <Input
              type="number"
              value={String(tdsPercent)}
              onChange={(v) => setTdsPercent(Number(v) || 0)}
              size="sm"
            />
          </FormField>
          <FormField label="TDS Amount">
            <Typography variant="body2" sx={{ fontSize: 13, pt: 1 }}>
              ₹{formatCurrency(tdsAmount)}
            </Typography>
          </FormField>
          <FormField label="Net Payable">
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, pt: 1 }}>
              ₹{formatCurrency(netPayable)}
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
              {PAYMENT_MODES.map((m) => (
                <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>
                  {m}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormField>
          <FormField label="Reference / UTR Number" required>
            <Input value={referenceNumber} onChange={(v) => setReferenceNumber(v)} size="sm" />
          </FormField>
        </FormSection>

        <Box
          sx={{
            bgcolor: tokens.color.neutral[50],
            borderRadius: 2,
            p: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 12, mb: 1 }}>
            Payment Preview
          </Typography>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
              Invoice Amount
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              ₹{formatCurrency(baseAmount)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
              TDS ({tdsPercent}%)
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main' }}>
              -₹{formatCurrency(tdsAmount)}
            </Typography>
          </Stack>
          <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>
              Net Payable
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
              ₹{formatCurrency(netPayable)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Modal>
  )
}

// ─── PaymentsTab ──────────────────────────────────────────────────────────────

interface PaymentsTabProps {
  projectId: string
  totalVendorPOValue: number
}

export default function PaymentsTab({ projectId, totalVendorPOValue }: PaymentsTabProps) {
  const { vendorInvoices } = useAppSelector((s) => s.live)
  const showToast = useToast((s) => s.showToast)

  const [uploadRow, setUploadRow] = useState<VendorMilestonePayment | null>(null)
  const [payRow, setPayRow] = useState<VendorMilestonePayment | null>(null)

  const projectRows = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const pendingRows = useMemo(
    () => projectRows.filter((r) => r.status === 'PendingInvoice'),
    [projectRows],
  )

  const bottomRows = useMemo(
    () => projectRows.filter((r) => r.status !== 'PendingInvoice'),
    [projectRows],
  )

  return (
    <>
      <SummaryStrip totalVendorPOValue={totalVendorPOValue} rows={projectRows} />

      <WorkspaceSection title="Pending Invoice" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Vendor / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingRows.length === 0 && (
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
                  All vendor invoices have been uploaded
                </TableCell>
              </TableRow>
            )}
            {pendingRows.map((row) => {
              const st = milestoneStatusBadge(row.status)
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <VendorServiceCell row={row} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {row.milestoneName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      ₹{formatCurrency(row.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Button
                      size="sm"
                      variant="contained"
                      label="Upload Invoice"
                      onClick={() => setUploadRow(row)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <WorkspaceSection title="Vendor Invoices & Payments" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Vendor / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Invoice #</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount Breakdown</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Due Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bottomRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  sx={{
                    ...TABLE_CELL_SX,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                    py: 3,
                  }}
                >
                  No vendor invoices uploaded yet
                </TableCell>
              </TableRow>
            )}
            {bottomRows.map((row) => {
              const st = milestoneStatusBadge(row.status)
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <VendorServiceCell row={row} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {row.milestoneName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}
                    >
                      {row.invoiceNumber ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <AmountBreakdownCell row={row} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {row.dueDate ? formatDate(row.dueDate) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {row.status === 'InvoiceUploaded' && (
                        <Button
                          size="sm"
                          variant="contained"
                          label="Generate Payment"
                          onClick={() => setPayRow(row)}
                        />
                      )}
                      {(row.status === 'PaymentGenerated' || row.status === 'Paid') && (
                        <Button
                          size="sm"
                          variant="text"
                          label="View"
                          onClick={() =>
                            showToast({
                              title: `${row.invoiceNumber ?? row.id}`,
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

      <UploadInvoiceDrawer
        open={!!uploadRow}
        row={uploadRow}
        projectId={projectId}
        onClose={() => setUploadRow(null)}
      />
      <GeneratePaymentModal
        open={!!payRow}
        row={payRow}
        projectId={projectId}
        onClose={() => setPayRow(null)}
      />
    </>
  )
}
