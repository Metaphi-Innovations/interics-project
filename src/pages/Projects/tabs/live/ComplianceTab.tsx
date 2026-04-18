import { useMemo } from 'react'
import {
  Box,
  Stack,
  Typography,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material'
import { WorkspaceSection } from '../../../../components/templates'
import { StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppSelector } from '../../../../store/hooks'
import type { ClientInvoice, VendorPayment } from '../../../../slices/live/reducer'
import { formatInr, formatDate } from '../../../../utils/formatters'
import {
  balancePending,
  effectiveGstPercent,
  isDueDateOverdue,
  MONEY_EPS,
} from '@/pages/Projects/tabs/live/clientInvoiceUtils'

function invoiceRowBadge(inv: ClientInvoice): { type: StatusType; label: string } {
  if (inv.status === 'paid' || balancePending(inv) <= MONEY_EPS) return { type: 'paid', label: 'Paid' }
  if (inv.status === 'draft') return { type: 'invoice_draft', label: 'Draft' }
  const overdue = isDueDateOverdue(inv.dueDate) && balancePending(inv) > MONEY_EPS
  if (overdue) return { type: 'overdue', label: 'Overdue' }
  if (inv.status === 'partially_paid') return { type: 'partially_paid', label: 'Partially Paid' }
  return { type: 'sent', label: 'Invoiced' }
}

function vendorTdsRatePercent(p: VendorPayment): string {
  if (p.invoiceTotal <= 0) return '—'
  const pct = (100 * p.tdsDeducted) / p.invoiceTotal
  return `${Math.round(pct * 10) / 10}%`
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

interface ComplianceTabProps {
  projectId: string
  clientName: string
}

export default function ComplianceTab({ projectId, clientName }: ComplianceTabProps) {
  const { invoices, payments } = useAppSelector((s) => s.live)

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  const projectPayments = useMemo(
    () => payments.filter((p) => p.projectId === projectId),
    [payments, projectId],
  )

  const gstCollected = useMemo(
    () => projectInvoices.reduce((s, i) => s + i.gstAmount, 0),
    [projectInvoices],
  )
  const gstPayable = gstCollected
  const clientTds = useMemo(
    () => projectInvoices.reduce((s, i) => s + i.tdsAmount, 0),
    [projectInvoices],
  )
  const vendorTds = useMemo(
    () => projectPayments.reduce((s, p) => s + p.tdsDeducted, 0),
    [projectPayments],
  )
  const netTaxPosition = gstCollected - (clientTds + vendorTds)

  const totalGstInTable = gstCollected
  const totalClientTdsInTable = clientTds
  const totalVendorTdsInTable = vendorTds

  if (projectInvoices.length === 0) {
    return (
      <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          No compliance data yet. Generate invoices to see GST and TDS.
        </Typography>
      </Box>
    )
  }

  type SummaryCard = {
    key: string
    overline: string
    caption?: string
    value: number
    valueColor?: string
  }

  const summaryCards: SummaryCard[] = [
    { key: 'gst-collected', overline: 'GST COLLECTED', value: gstCollected },
    { key: 'gst-payable', overline: 'GST PAYABLE', value: gstPayable },
    {
      key: 'client-tds',
      overline: 'CLIENT TDS',
      caption: 'TDS Deducted by Client',
      value: clientTds,
    },
    {
      key: 'vendor-tds',
      overline: 'VENDOR TDS',
      caption: 'TDS Deducted on Vendors',
      value: vendorTds,
    },
    {
      key: 'net-tax',
      overline: 'NET TAX POSITION',
      value: netTaxPosition,
      valueColor: netTaxPosition >= 0 ? 'text.primary' : 'error.main',
    },
  ]

  return (
    <Stack gap={2}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
        }}
      >
        {summaryCards.map((m) => (
          <Box
            key={m.key}
            sx={{
              p: 2,
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
            >
              {m.overline}
            </Typography>
            {m.caption != null && (
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
                {m.caption}
              </Typography>
            )}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: 15,
                mt: 0.5,
                color: m.valueColor ?? 'text.primary',
              }}
            >
              ₹{formatInr(m.value)}
            </Typography>
          </Box>
        ))}
      </Box>

      <WorkspaceSection title="GST on Client Invoices" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Number</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Base Amount (₹)</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>GST Rate</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>GST Amount (₹)</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectInvoices.map((inv) => {
              const st = invoiceRowBadge(inv)
              return (
                <TableRow key={inv.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {inv.invoiceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {inv.milestoneName}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {inv.serviceName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {formatDate(inv.invoiceDate)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      ₹{formatInr(inv.baseAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {effectiveGstPercent(inv)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      ₹{formatInr(inv.gstAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow>
              <TableCell colSpan={5} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                Total GST
              </TableCell>
              <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                ₹{formatInr(totalGstInTable)}
              </TableCell>
              <TableCell sx={{ ...TABLE_CELL_SX, borderBottom: 'none' }} />
            </TableRow>
          </TableBody>
        </Table>
      </WorkspaceSection>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <WorkspaceSection title="TDS Deducted by Client" noPadding>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice Number</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Client Name</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Gross Amount</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Rate</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Amount</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectInvoices.map((inv) => {
                  const st = invoiceRowBadge(inv)
                  return (
                    <TableRow key={`tds-${inv.id}`} hover>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {inv.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {clientName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {formatDate(inv.invoiceDate)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          ₹{formatInr(inv.grossAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }} color="text.secondary">
                          At payment
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          ₹{formatInr(inv.tdsAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <StatusBadge status={st.type} label={st.label} />
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow>
                  <TableCell colSpan={5} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                    Total
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                    ₹{formatInr(totalClientTdsInTable)}
                  </TableCell>
                  <TableCell sx={{ borderBottom: 'none' }} />
                </TableRow>
              </TableBody>
            </Table>
          </WorkspaceSection>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <WorkspaceSection title="TDS Deducted on Vendors" noPadding>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Payment Reference</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Vendor Name</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Payment Date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice Total</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Rate</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{ ...TABLE_CELL_SX, textAlign: 'center', color: 'text.secondary' }}
                    >
                      No vendor payments
                    </TableCell>
                  </TableRow>
                ) : (
                  projectPayments.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {p.referenceNumber ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {p.vendorName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {formatDate(p.paymentDate)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          ₹{formatInr(p.invoiceTotal)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {vendorTdsRatePercent(p)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          ₹{formatInr(p.tdsDeducted)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {projectPayments.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ ...TABLE_CELL_SX, borderBottom: 'none' }} />
                    <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                      ₹{formatInr(totalVendorTdsInTable)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </WorkspaceSection>
        </Grid>
      </Grid>
    </Stack>
  )
}
