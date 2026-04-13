import { useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Button as MuiButton,
} from '@mui/material'
import dayjs from 'dayjs'
import { DrawerForm, FormSection } from '@/components/templates'
import { StatusBadge, Button, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendorInvoiceById } from '@/slices/payables/thunk'
import type { VendorInvoice } from '@/slices/payables/reducer'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'

export function vendorInvoiceStatusToBadgeType(status: VendorInvoice['status']): StatusType {
  if (status === 'draft') return 'invoice_draft'
  return status as StatusType
}

export interface VendorInvoiceDetailDrawerProps {
  open: boolean
  onClose: () => void
  invoiceId: string | null
  onEdit: (inv: VendorInvoice) => void
  onRecordPayment: (inv: VendorInvoice) => void
}

export function VendorInvoiceDetailDrawer({
  open,
  onClose,
  invoiceId,
  onEdit,
  onRecordPayment,
}: VendorInvoiceDetailDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const inv = useAppSelector((s) => s.payables.selectedInvoice)
  const detailLoading = useAppSelector((s) => s.payables.detailLoading)

  useEffect(() => {
    if (open && invoiceId) {
      dispatch(fetchVendorInvoiceById(invoiceId)).catch(() => {
        showToast({ title: 'Failed to load invoice', variant: 'error' })
      })
    }
  }, [open, invoiceId, dispatch, showToast])

  if (!inv && !detailLoading) {
    return (
      <DrawerForm open={open} onClose={onClose} title="Vendor invoice" width={620} hideFooter>
        <Typography variant="body2" color="text.secondary">
          Select an invoice
        </Typography>
      </DrawerForm>
    )
  }

  const v = inv
  const canEdit = v?.status === 'draft'
  const canPay = v && v.status !== 'paid' && v.status !== 'draft'

  const footerBar = (
    <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: '20px', py: '14px' }}>
      <MuiButton variant="outlined" size="small" onClick={onClose} sx={{ height: 32 }}>
        Close
      </MuiButton>
    </Stack>
  )

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Vendor invoice"
      subtitle={v?.vendorName}
      width={620}
      hideFooter={!v}
      footer={v ? footerBar : undefined}
    >
      {detailLoading && !v ? (
        <Typography variant="body2">Loading…</Typography>
      ) : v ? (
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
              {v.invoiceNo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {v.projectName}
            </Typography>
            {v.poNo ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                PO: {v.poNo}
              </Typography>
            ) : null}
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
              <StatusBadge status={vendorInvoiceStatusToBadgeType(v.status)} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
              {canEdit && (
                <Button variant="outlined" size="sm" onClick={() => onEdit(v)}>
                  Edit
                </Button>
              )}
              {canPay && (
                <Button variant="contained" size="sm" onClick={() => onRecordPayment(v)}>
                  Record Payment
                </Button>
              )}
            </Stack>
          </Box>

          <FormSection title="Details">
            <Stack direction="row" flexWrap="wrap" spacing={2} sx={{ columnGap: 3, rowGap: 2 }}>
              <Box sx={{ minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">
                  Invoice date
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dayjs(v.invoiceDate).format('DD MMM YYYY')}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">
                  Due date
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dayjs(v.dueDate).format('DD MMM YYYY')}
                </Typography>
              </Box>
            </Stack>
          </FormSection>

          <FormSection title="Line items">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }} align="right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {v.lineItems.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell sx={{ fontSize: 12 }}>{l.name}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="right">
                        ₹{formatCurrency(l.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
                <Typography variant="body2" fontWeight={700}>
                  Invoice total
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  ₹{formatCurrency(v.totalAmount)}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Paid (bank)
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: tokens.color.success[600] }}>
                  ₹{formatCurrency(v.totalPaid)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  TDS deducted
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                  ₹{formatCurrency(v.tdsDeducted)}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: `1px solid ${tokens.color.neutral[200]}`, my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>
                  Balance
                </Typography>
                {v.balance <= 0 ? (
                  <Typography variant="body2" fontWeight={700} sx={{ color: tokens.color.success[600] }}>
                    Nil
                  </Typography>
                ) : (
                  <Typography variant="body2" fontWeight={700} sx={{ color: tokens.color.error[600] }}>
                    ₹{formatCurrency(v.balance)}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Box>

          <FormSection title="Payment history">
            {v.payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No payments recorded yet
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Paid (bank)</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>TDS</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Mode</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {v.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ fontSize: 12 }}>{dayjs(p.date).format('DD MMM YYYY')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(p.amountPaid)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(p.tdsDeducted)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{p.paymentMode.replace('_', ' ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {canPay && (
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" size="sm" onClick={() => onRecordPayment(v)}>
                  + Record Payment
                </Button>
              </Box>
            )}
          </FormSection>

          {v.notes ? (
            <FormSection title="Notes">
              <Typography variant="body2" color="text.secondary">
                {v.notes}
              </Typography>
            </FormSection>
          ) : null}
        </Stack>
      ) : null}
    </DrawerForm>
  )
}
