import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material'
import { WorkspaceSection } from '../../../../components/templates'
import { Avatar, Badge, Button } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchBaseline, fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import {
  baselineVendorServiceRows,
  computeVendorCardCounts,
  itemsSummary,
  SettlementRightPanel,
  PaymentDetailModal,
  TABLE_CELL_SX,
  TABLE_HEADER_SX,
  vendorServiceKey,
  type VendorServiceRow,
} from './vendorSettlement'

interface PaymentsTabProps {
  projectId: string
}

export default function PaymentsTab({ projectId }: PaymentsTabProps) {
  const dispatch = useAppDispatch()
  const { vendorInvoices, payments, expenses, reimbursements } = useAppSelector((s) => s.live)
  const { baseline, vendorPOs } = useAppSelector((s) => s.baseline)

  const [viewPayment, setViewPayment] = useState<(typeof payments)[0] | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    void dispatch(fetchBaseline(projectId))
    void dispatch(fetchVendorPOs(projectId))
  }, [dispatch, projectId])

  const baselineForProject = baseline?.projectId === projectId ? baseline : null
  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((po) => po.projectId === projectId),
    [vendorPOs, projectId],
  )
  const vendorRows = useMemo(() => baselineVendorServiceRows(baselineForProject), [baselineForProject])

  useEffect(() => {
    if (vendorRows.length === 0) {
      setSelectedKey(null)
      return
    }
    const first = vendorServiceKey(vendorRows[0])
    setSelectedKey((k) => (k && vendorRows.some((r) => vendorServiceKey(r) === k) ? k : first))
  }, [vendorRows])

  const selectedRow = useMemo(() => {
    if (!selectedKey) return null
    return vendorRows.find((r) => vendorServiceKey(r) === selectedKey) ?? null
  }, [selectedKey, vendorRows])

  const projectInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )
  const projectPayments = useMemo(
    () => payments.filter((p) => p.projectId === projectId),
    [payments, projectId],
  )
  const projectExpenses = useMemo(
    () => expenses.filter((e) => e.projectId === projectId),
    [expenses, projectId],
  )
  const projectReimb = useMemo(
    () => reimbursements.filter((r) => r.projectId === projectId),
    [reimbursements, projectId],
  )

  const countsForCard = useCallback(
    (row: VendorServiceRow) =>
      computeVendorCardCounts(
        baselineForProject,
        projectInvoices,
        projectExpenses,
        projectReimb,
        row,
        projectVendorPOs,
      ),
    [baselineForProject, projectInvoices, projectExpenses, projectReimb, projectVendorPOs],
  )

  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems="stretch"
        gap={2}
        sx={{ mb: 2, minHeight: { md: 480 } }}
      >
        <Box
          sx={{
            width: { xs: 1, md: 280 },
            flexShrink: 0,
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: 'background.paper',
            maxHeight: { md: '70vh' },
            overflow: 'auto',
          }}
        >
          <Typography variant="overline" sx={{ px: 2, pt: 2, fontSize: 10, letterSpacing: 0.6 }}>
            Vendors
          </Typography>
          {vendorRows.length === 0 && (
            <Typography variant="body2" sx={{ p: 2, fontSize: 12, color: 'text.secondary' }}>
              No vendors in baseline. Finalize baseline to map vendors.
            </Typography>
          )}
          <Stack gap={1} sx={{ p: 2, pt: 1 }}>
            {vendorRows.map((row) => {
              const key = vendorServiceKey(row)
              const selected = key === selectedKey
              const c = countsForCard(row)
              return (
                <Box
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedKey(key)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedKey(key)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: selected ? tokens.color.primary[500] : tokens.color.neutral[100],
                    bgcolor: selected ? tokens.color.primary[50] : 'background.paper',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                >
                  <Stack direction="row" gap={1.5} alignItems="flex-start">
                    <Avatar name={row.vendorName} size="sm" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                        {row.vendorName}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {row.serviceName}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700, mt: 0.75 }}>
                        ₹{formatCurrency(c.outstanding)}
                      </Typography>
                      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                        {c.pendingInv > 0 && (
                          <Badge label={String(c.pendingInv)} variant="soft" color="info" size="sm" />
                        )}
                        {c.pendingExp > 0 && (
                          <Badge label={String(c.pendingExp)} variant="soft" color="warning" size="sm" />
                        )}
                        {c.pendingRmb > 0 && (
                          <Badge label={String(c.pendingRmb)} variant="soft" color="primary" size="sm" />
                        )}
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.75,
                          fontSize: 11,
                          fontWeight: 600,
                          color: c.allSettled ? 'success.main' : 'warning.main',
                        }}
                      >
                        {c.allSettled ? 'All settled' : 'Payment pending'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </Box>

        <SettlementRightPanel
          projectId={projectId}
          baseline={baselineForProject}
          selectedRow={selectedRow}
        />
      </Stack>

      <WorkspaceSection title="Payment History" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Vendor</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Items</TableCell>
              <TableCell sx={TABLE_HEADER_SX} align="right">
                Invoice Total
              </TableCell>
              <TableCell sx={TABLE_HEADER_SX} align="right">
                Deductions
              </TableCell>
              <TableCell sx={TABLE_HEADER_SX} align="right">
                Reimbursements
              </TableCell>
              <TableCell sx={TABLE_HEADER_SX} align="right">
                Net Paid
              </TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Reference</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ ...TABLE_CELL_SX, textAlign: 'center', py: 3 }}>
                  No payments recorded
                </TableCell>
              </TableRow>
            )}
            {projectPayments.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={TABLE_CELL_SX}>{formatDate(p.paymentDate)}</TableCell>
                <TableCell sx={TABLE_CELL_SX}>{p.vendorName}</TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {itemsSummary(p)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX} align="right">
                  ₹{formatCurrency(p.invoiceTotal)}
                </TableCell>
                <TableCell sx={TABLE_CELL_SX} align="right">
                  ₹{formatCurrency(p.expenseDeductions)}
                </TableCell>
                <TableCell sx={TABLE_CELL_SX} align="right">
                  ₹{formatCurrency(p.reimbursementAdditions)}
                </TableCell>
                <TableCell sx={TABLE_CELL_SX} align="right">
                  ₹{formatCurrency(p.netPaid)}
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>{p.referenceNumber ?? '—'}</TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Button size="sm" variant="outlined" label="View" onClick={() => setViewPayment(p)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <PaymentDetailModal
        open={!!viewPayment}
        payment={viewPayment}
        onClose={() => setViewPayment(null)}
      />
    </>
  )
}
