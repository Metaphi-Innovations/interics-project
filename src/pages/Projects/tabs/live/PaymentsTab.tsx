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
import { Add, Lock } from '@mui/icons-material'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../../components/templates/DrawerForm'
import { StatusBadge, Input } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { payVendorInvoice } from '../../../../slices/live/thunk'
import type { VendorInvoice } from '../../../../slices/live/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import { useToast } from '@/design-system/components'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function viStatusType(status: VendorInvoice['status']): { type: StatusType; label: string } {
  switch (status) {
    case 'Paid':     return { type: 'active',      label: 'Paid' }
    case 'Approved': return { type: 'in_progress', label: 'Approved' }
    case 'Pending':  return { type: 'pending',     label: 'Pending' }
    case 'On Hold':  return { type: 'inactive',    label: 'On Hold' }
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

function SummaryStrip({ vendorInvoices }: { vendorInvoices: VendorInvoice[] }) {
  const totalPayable = vendorInvoices.reduce((s, v) => s + v.amount, 0)
  const paid = vendorInvoices.reduce((s, v) => s + v.paidAmount, 0)
  const outstanding = totalPayable - paid
  const tds = vendorInvoices.reduce((s, v) => s + v.tdsAmount, 0)

  const metrics = [
    { label: 'TOTAL PAYABLE', value: totalPayable },
    { label: 'PAID', value: paid, highlight: true },
    { label: 'OUTSTANDING', value: outstanding, color: outstanding > 0 ? 'warning.main' : 'success.main' },
    { label: 'TDS DEDUCTED', value: tds },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
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
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}>
            {m.label}
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: 15, mt: '2px', color: m.color ?? (m.highlight ? 'primary.main' : 'text.primary') }}
          >
            ₹{formatCurrency(m.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Pay Vendor Drawer ────────────────────────────────────────────────────────

interface PayDrawerProps {
  open: boolean
  invoice: VendorInvoice | null
  projectId: string
  onClose: () => void
}

function PayVendorDrawer({ open, invoice, projectId, onClose }: PayDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [paidAmount, setPaidAmount] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentMode, setPaymentMode] = useState('NEFT')

  async function handleSubmit() {
    if (!invoice || !paidDate || !paymentReference) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(payVendorInvoice({
        projectId,
        id: invoice.id,
        data: {
          paidAmount: Number(paidAmount) || invoice.netPayable,
          paidDate,
          paymentReference,
          paymentMode,
        },
      })).unwrap()
      toast.success('Vendor payment recorded')
      onClose()
    } catch {
      toast.error('Failed to record payment')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Record Vendor Payment"
      subtitle={invoice?.invoiceNumber ?? ''}
      onSubmit={handleSubmit}
      submitLabel="Record Payment"
      submitLoading={saving}
    >
      {/* Payment summary */}
      {invoice && (
        <Box sx={{ bgcolor: tokens.color.neutral[50], borderRadius: 2, p: '12px 16px', mb: 2 }}>
          {[
            { label: 'Invoice Amount', value: `₹${formatCurrency(invoice.amount)}` },
            { label: `TDS (${invoice.tdsRate}%)`, value: `-₹${formatCurrency(invoice.tdsAmount)}` },
          ].map((r) => (
            <Stack key={r.label} direction="row" justifyContent="space-between" sx={{ mb: '4px' }}>
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>{r.label}</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{r.value}</Typography>
            </Stack>
          ))}
          <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 1 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>Net Payable</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>₹{formatCurrency(invoice.netPayable)}</Typography>
          </Stack>
        </Box>
      )}

      <FormSection title="Payment Details" columns={2}>
        <FormField label="Paid Amount" required>
          <Input
            type="number"
            value={paidAmount || String(invoice?.netPayable ?? '')}
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
        <FormField label="Payment Reference" required>
          <Input
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="NEFT/RTGS/Cheque reference"
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
            {['NEFT', 'RTGS', 'Cheque', 'UPI'].map((m) => (
              <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>{m}</MenuItem>
            ))}
          </MuiSelect>
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── PaymentsTab ──────────────────────────────────────────────────────────────

interface PaymentsTabProps {
  projectId: string
}

export default function PaymentsTab({ projectId }: PaymentsTabProps) {
  const { vendorInvoices } = useAppSelector((s) => s.live)
  const [payInvoice, setPayInvoice] = useState<VendorInvoice | null>(null)

  // Group by vendor
  const vendorGroups = vendorInvoices.reduce<Record<string, { vendorName: string; vendorPOId: string; invoices: VendorInvoice[] }>>(
    (acc, vi) => {
      if (!acc[vi.vendorId]) {
        acc[vi.vendorId] = { vendorName: vi.vendorName, vendorPOId: vi.vendorPOId, invoices: [] }
      }
      acc[vi.vendorId].invoices.push(vi)
      return acc
    },
    {},
  )

  return (
    <>
      <SummaryStrip vendorInvoices={vendorInvoices} />

      {Object.entries(vendorGroups).map(([vendorId, group]) => (
        <WorkspaceSection
          key={vendorId}
          title={group.vendorName}
          subtitle={`PO: ${group.vendorPOId}`}
          noPadding
          action={
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<Add sx={{ fontSize: 14 }} />}
              sx={{ fontSize: 12, height: 30 }}
            >
              Add Invoice
            </MuiButton>
          }
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={TABLE_HEADER_SX}>Invoice #</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Milestone</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Amount</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {group.invoices.map((vi) => {
                const st = viStatusType(vi.status)
                return (
                  <TableRow key={vi.id} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}>
                        {vi.invoiceNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                        {formatDate(vi.invoiceDate)}
                      </Typography>
                    </TableCell>

                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{vi.milestoneName}</Typography>
                    </TableCell>

                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>Base: ₹{formatCurrency(vi.amount)}</Typography>
                      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>TDS ({vi.tdsRate}%): -₹{formatCurrency(vi.tdsAmount)}</Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>Net Payable: ₹{formatCurrency(vi.netPayable)}</Typography>
                    </TableCell>

                    <TableCell sx={TABLE_CELL_SX}>
                      <StatusBadge status={st.type} label={st.label} />
                    </TableCell>

                    <TableCell sx={TABLE_CELL_SX}>
                      {vi.status === 'Paid' ? (
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <Lock sx={{ fontSize: 12, color: tokens.color.neutral[400] }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>{vi.paymentReference}</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{formatDate(vi.paidDate)}</Typography>
                          </Box>
                        </Stack>
                      ) : (
                        <Stack direction="row" gap={0.5}>
                          {(vi.status === 'Pending' || vi.status === 'Approved') && (
                            <MuiButton
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => setPayInvoice(vi)}
                              sx={{ fontSize: 11, height: 26, px: 1 }}
                            >
                              Pay
                            </MuiButton>
                          )}
                          {vi.status === 'Pending' && (
                            <MuiButton size="small" variant="outlined" sx={{ fontSize: 11, height: 26, px: 1 }}>
                              Approve
                            </MuiButton>
                          )}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </WorkspaceSection>
      ))}

      {Object.keys(vendorGroups).length === 0 && (
        <WorkspaceSection title="Vendor Invoices" noPadding>
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No vendor invoices yet</Typography>
          </Box>
        </WorkspaceSection>
      )}

      <PayVendorDrawer
        open={!!payInvoice}
        invoice={payInvoice}
        projectId={projectId}
        onClose={() => setPayInvoice(null)}
      />
    </>
  )
}
