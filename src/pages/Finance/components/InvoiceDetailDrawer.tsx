import { useEffect } from 'react'
import {
  Box,
  Grid,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material'
import dayjs from 'dayjs'
import { Plus } from 'lucide-react'
import { DrawerForm, FormSection } from '@/components/templates'
import { StatusBadge, Button, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchInvoiceById } from '@/slices/receivables/thunk'
import type { Invoice } from '@/slices/receivables/reducer'
import { InvoiceLineItems } from './InvoiceLineItems'
import { tokens } from '@/design-system/tokens'
import { mapInvoiceStatus } from '../BillingsPage'

export function invoiceStatusToBadgeType(status: Invoice['status']): StatusType {
  if (status === 'draft') return 'invoice_draft'
  return status as StatusType
}

export interface InvoiceDetailDrawerProps {
  open: boolean
  onClose: () => void
  invoiceId: string | null
  onEdit: (inv: Invoice) => void
  onRecordPayment: (inv: Invoice) => void
  onSend: (inv: Invoice) => void
  onDownloadPdf: (inv: Invoice) => void
}

export function InvoiceDetailDrawer({
  open,
  onClose,
  invoiceId,
  onEdit,
  onRecordPayment,
  onSend,
  onDownloadPdf,
}: InvoiceDetailDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const rawInvoice = useAppSelector((s) => s.receivables.selectedItem)
  const invoice = rawInvoice ? { ...rawInvoice, status: mapInvoiceStatus(rawInvoice) as Invoice['status'] } : null
  const detailLoading = useAppSelector((s) => s.receivables.detailLoading)
  const { services, sacCodes } = useAppSelector((s) => s.settings)

  useEffect(() => {
    if (open && invoiceId) {
      dispatch(fetchInvoiceById(invoiceId)).catch(() => {
        showToast({ title: 'Failed to load invoice', variant: 'error' })
      })
    }
  }, [open, invoiceId, dispatch, showToast])

  if (!invoice && !detailLoading) {
    return (
      <DrawerForm open={open} onClose={onClose} title="Invoice" width={560} hideFooter>
        <Typography variant="body2" color="text.secondary">
          Select an invoice
        </Typography>
      </DrawerForm>
    )
  }

  const inv = invoice
  const canEdit = inv?.status === 'draft'
  const canPay = inv && inv.status !== 'paid' && inv.status !== 'draft'
  const canSend = inv?.status === 'draft'

  const footerBar = inv ? (
    <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: '20px', py: '14px' }}>
      {canEdit ? (
        <Button variant="outlined" size="sm" onClick={() => onEdit(inv)}>
          Edit
        </Button>
      ) : null}
      {canSend ? (
        <Button variant="soft" size="sm" color="primary" onClick={() => onSend(inv)}>
          Send
        </Button>
      ) : null}
      <Button variant="outlined" size="sm" onClick={() => onDownloadPdf(inv)}>
        Download Invoice
      </Button>
    </Stack>
  ) : null

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Invoice"
      subtitle={inv?.clientName}
      width={560}
      hideFooter={!inv}
      footer={footerBar ?? undefined}
    >
      {detailLoading && !inv ? (
        <Typography variant="body2">Loading…</Typography>
      ) : inv ? (
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ minWidth: 0 }}>
              <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: 18 }}>
                {inv.invoiceNo}
              </Typography>
              <StatusBadge status={invoiceStatusToBadgeType(inv.status)} />
            </Stack>
          </Stack>

          <FormSection title="Invoice details">
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Invoice date
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dayjs(inv.invoiceDate).format('DD MMM YYYY')}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Due date
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dayjs(inv.dueDate).format('DD MMM YYYY')}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Project
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {inv.projectName}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Client
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {inv.clientName}
                </Typography>
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Line items">
            <InvoiceLineItems mode="read" lines={inv.lineItems} services={services} sacCodes={sacCodes} />
          </FormSection>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${tokens.color.neutral[200]}`,
            }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Base amount
                </Typography>
                <Typography variant="body2">₹{inv.baseAmount.toLocaleString('en-IN')}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  + GST
                </Typography>
                <Typography variant="body2">₹{inv.gstAmount.toLocaleString('en-IN')}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>
                  Invoice total
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  ₹{inv.totalAmount.toLocaleString('en-IN')}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total received
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
                  ₹{inv.totalReceived.toLocaleString('en-IN')}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  TDS deducted
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                  ₹{inv.tdsDeducted.toLocaleString('en-IN')}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>
                  Balance pending
                </Typography>
                {inv.balance <= 0 ? (
                  <Typography variant="body2" fontWeight={700} sx={{ color: tokens.color.success[600] }}>
                    Nil
                  </Typography>
                ) : (
                  <Typography variant="body2" fontWeight={700} sx={{ color: tokens.color.error[600] }}>
                    ₹{inv.balance.toLocaleString('en-IN')}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Box>

          <FormSection title="Payment history">
            {inv.payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No payments recorded yet
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Amount received</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>TDS</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Net received</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Mode</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inv.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ fontSize: 12 }}>{dayjs(p.date).format('DD MMM YYYY')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{p.amountReceived.toLocaleString('en-IN')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{p.tdsDeducted.toLocaleString('en-IN')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{p.netReceived.toLocaleString('en-IN')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{p.paymentMode.replace('_', ' ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {canPay && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  size="sm"
                  startIcon={<Plus size={14} strokeWidth={2} />}
                  onClick={() => onRecordPayment(inv)}
                >
                  Record Payment
                </Button>
              </Box>
            )}
          </FormSection>

          <FormSection title="Activity">
            <Stack spacing={1.5} sx={{ borderLeft: `2px solid ${tokens.color.neutral[200]}`, pl: 2 }}>
              <Typography variant="body2">
                <strong>Invoice created</strong> — {dayjs(inv.createdAt).format('DD MMM YYYY, HH:mm')}
              </Typography>
              {inv.status !== 'draft' && (
                <Typography variant="body2">
                  <strong>Invoice sent</strong> — {dayjs(inv.updatedAt).format('DD MMM YYYY, HH:mm')}
                </Typography>
              )}
              {inv.payments.map((p) => (
                <Typography key={p.id} variant="body2">
                  <strong>Payment of ₹{p.amountReceived.toLocaleString('en-IN')} received</strong> —{' '}
                  {dayjs(p.date).format('DD MMM YYYY')}
                </Typography>
              ))}
            </Stack>
          </FormSection>

          {inv.notes && (
            <FormSection title="Notes">
              <Typography variant="body2" color="text.secondary">
                {inv.notes}
              </Typography>
            </FormSection>
          )}
        </Stack>
      ) : null}
    </DrawerForm>
  )
}
