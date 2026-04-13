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
import { fetchVendorPOById, issueVendorPO } from '@/slices/payables/thunk'
import type { VendorPO } from '@/slices/payables/reducer'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'

export function poStatusToBadgeType(status: VendorPO['status']): StatusType {
  if (status === 'issued') return 'issued'
  return 'invoice_draft'
}

export interface VendorPODetailDrawerProps {
  open: boolean
  onClose: () => void
  poId: string | null
  onEdit: (po: VendorPO) => void
  onIssued?: () => void
}

export function VendorPODetailDrawer({ open, onClose, poId, onEdit, onIssued }: VendorPODetailDrawerProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const po = useAppSelector((s) => s.payables.selectedPO)
  const detailLoading = useAppSelector((s) => s.payables.detailLoading)
  const saving = useAppSelector((s) => s.payables.saving)

  useEffect(() => {
    if (open && poId) {
      dispatch(fetchVendorPOById(poId)).catch(() => {
        showToast({ title: 'Failed to load PO', variant: 'error' })
      })
    }
  }, [open, poId, dispatch, showToast])

  async function handleIssue() {
    if (!po) return
    try {
      await dispatch(issueVendorPO(po.id)).unwrap()
      showToast({ title: 'PO issued', variant: 'success' })
      onIssued?.()
    } catch (e) {
      showToast({ title: String(e), variant: 'error' })
    }
  }

  if (!po && !detailLoading) {
    return (
      <DrawerForm open={open} onClose={onClose} title="Vendor PO" width={620} hideFooter>
        <Typography variant="body2" color="text.secondary">
          Select a purchase order
        </Typography>
      </DrawerForm>
    )
  }

  const p = po
  const canEdit = p?.status === 'draft'
  const canIssue = p?.status === 'draft'

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
      title="Vendor PO"
      subtitle={p?.vendorName}
      width={620}
      hideFooter={!p}
      footer={p ? footerBar : undefined}
    >
      {detailLoading && !p ? (
        <Typography variant="body2">Loading…</Typography>
      ) : p ? (
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
              {p.poNo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {p.projectName}
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
              <StatusBadge status={poStatusToBadgeType(p.status)} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
              {canEdit && (
                <Button variant="outlined" size="sm" onClick={() => onEdit(p)}>
                  Edit
                </Button>
              )}
              {canIssue && (
                <Button variant="contained" size="sm" onClick={handleIssue} loading={saving}>
                  Issue PO
                </Button>
              )}
            </Stack>
          </Box>

          <FormSection title="Details">
            <Stack direction="row" flexWrap="wrap" spacing={2} sx={{ columnGap: 3, rowGap: 2 }}>
              <Box sx={{ minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">
                  PO date
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {dayjs(p.poDate).format('DD MMM YYYY')}
                </Typography>
              </Box>
              {p.validUntil ? (
                <Box sx={{ minWidth: 140 }}>
                  <Typography variant="caption" color="text.secondary">
                    Valid until
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {dayjs(p.validUntil).format('DD MMM YYYY')}
                  </Typography>
                </Box>
              ) : null}
              {p.paymentTerms ? (
                <Box sx={{ minWidth: 140 }}>
                  <Typography variant="caption" color="text.secondary">
                    Payment terms
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {p.paymentTerms}
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </FormSection>

          <FormSection title="Line items">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Service / work</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Qty</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Rate</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {p.lineItems.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell sx={{ fontSize: 12 }}>{l.serviceName}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{l.description || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{l.quantity}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(l.rate)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>₹{formatCurrency(l.amount)}</TableCell>
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
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle2" fontWeight={700}>
                Total PO value
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                ₹{formatCurrency(p.totalValue)}
              </Typography>
            </Stack>
          </Box>

          {p.notes ? (
            <FormSection title="Notes">
              <Typography variant="body2" color="text.secondary">
                {p.notes}
              </Typography>
            </FormSection>
          ) : null}
        </Stack>
      ) : null}
    </DrawerForm>
  )
}
