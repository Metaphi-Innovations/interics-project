import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { WorkspaceSection } from '@/components/templates'
import { Button } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { VendorInvoice } from '@/slices/live/types'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchVendorInvoices } from '@/slices/live/thunk'
import { formatCurrency } from '@/utils/formatters'
import {
  buildVendorPOMilestoneOverviewRows,
  vendorMilestoneTypeLabel,
  type VendorPOMilestoneOverviewRow,
} from '@/pages/Projects/tabs/live/vendorPOHelpers'
import { AddVendorInvoiceDrawer } from '@/pages/Projects/tabs/live/vendorSettlement/AddVendorInvoiceDrawer'
import { VendorInvoiceDetailModal } from '@/pages/Projects/tabs/live/vendorSettlement/SettlementModals'
import {
  findInvoiceForMilestone,
  invoiceMatchesRow,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement/utils'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: 1.5,
  px: 2,
} as const

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: 1.5,
  px: 2,
} as const

const ACTION_COL_WIDTH = 148

const ACTION_CELL_SX = {
  ...TABLE_CELL_SX,
  width: ACTION_COL_WIDTH,
  minWidth: ACTION_COL_WIDTH,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  px: 1,
}

const ACTION_BUTTON_SX = {
  minWidth: 132,
  px: 1.5,
  fontSize: 11,
  whiteSpace: 'nowrap',
} as const

function rowToVendorContext(row: VendorPOMilestoneOverviewRow): VendorServiceRow | null {
  if (!row.vendorId || !row.serviceId) return null
  return {
    vendorId: row.vendorId,
    vendorName: row.vendor,
    serviceId: row.serviceId,
    serviceName: row.serviceName || row.service,
  }
}

export interface VendorMilestonesSectionProps {
  projectId: string
  vendorPOs: VendorPO[]
  baseline: Baseline | null
}

export function VendorMilestonesSection({
  projectId,
  vendorPOs,
  baseline,
}: VendorMilestonesSectionProps) {
  const dispatch = useAppDispatch()
  const { vendorInvoices, expenses } = useAppSelector((s) => s.live)

  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false)
  const [invoiceContext, setInvoiceContext] = useState<VendorServiceRow | null>(null)
  const [presetMilestoneId, setPresetMilestoneId] = useState<string | undefined>(undefined)
  const [viewInvoice, setViewInvoice] = useState<VendorInvoice | null>(null)

  useEffect(() => {
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses(projectId))
  }, [dispatch, projectId])

  const milestoneRows = buildVendorPOMilestoneOverviewRows(vendorPOs, projectId, baseline)

  const projectScopedInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )

  function openUploadInvoice(row: VendorPOMilestoneOverviewRow) {
    const context = rowToVendorContext(row)
    if (!context) return
    setInvoiceContext(context)
    setPresetMilestoneId(row.milestoneId)
    setAddInvoiceOpen(true)
  }

  function closeUploadInvoice() {
    setAddInvoiceOpen(false)
    setInvoiceContext(null)
    setPresetMilestoneId(undefined)
  }

  return (
    <WorkspaceSection title="Vendor Milestones" noPadding>
      <Box sx={{ width: '100%', overflow: 'hidden' }}>
        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& .MuiTableCell-root': { verticalAlign: 'middle', wordBreak: 'break-word' },
          }}
        >
          <TableHead>
            <TableRow>
              {[
                'PO Number',
                'Vendor',
                'Service',
                'Milestone',
                'Percentage',
                'Value',
                'Status',
                'Action',
              ].map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    ...TABLE_HEADER_SX,
                    ...(col === 'Action'
                      ? { width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH, textAlign: 'center' }
                      : {}),
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {milestoneRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  sx={{
                    ...TABLE_CELL_SX,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                    py: 3,
                  }}
                >
                  No vendor milestones yet. Add a vendor PO with milestone breakdown.
                </TableCell>
              </TableRow>
            ) : (
              milestoneRows.map((row) => {
                const context = rowToVendorContext(row)
                const milestoneVm = {
                  id: row.milestoneId,
                  name: row.name,
                  percentage: row.pct,
                  value: row.amount,
                }
                const existingInvoice =
                  context &&
                  findInvoiceForMilestone(
                    projectScopedInvoices.filter((inv) => invoiceMatchesRow(inv, context)),
                    milestoneVm,
                  )
                const canUpload = Boolean(context) && !existingInvoice

                return (
                  <TableRow key={row.key} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}
                      >
                        {row.poNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'primary.main' }}>
                        {row.vendor}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.service}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        {row.name}
                      </Typography>
                      <Chip
                        label={vendorMilestoneTypeLabel(row.milestoneType)}
                        size="small"
                        sx={{ mt: 0.5, fontSize: 10, height: 18 }}
                      />
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.pct}%</TableCell>
                    <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                      ₹{formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.status}</TableCell>
                    <TableCell sx={ACTION_CELL_SX}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        {canUpload ? (
                          <Button
                            size="sm"
                            variant="contained"
                            color="primary"
                            label="Upload Invoice"
                            onClick={() => openUploadInvoice(row)}
                            sx={ACTION_BUTTON_SX}
                          />
                        ) : existingInvoice ? (
                          <Button
                            size="sm"
                            variant="outlined"
                            color="primary"
                            label="View Invoice"
                            onClick={() => setViewInvoice(existingInvoice)}
                            sx={ACTION_BUTTON_SX}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                            —
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Box>

      <AddVendorInvoiceDrawer
        open={addInvoiceOpen}
        onClose={closeUploadInvoice}
        projectId={projectId}
        context={invoiceContext}
        presetMilestoneId={presetMilestoneId}
        baseline={baseline}
        vendorPOs={vendorPOs}
      />

      <VendorInvoiceDetailModal
        open={!!viewInvoice}
        invoice={viewInvoice}
        expenses={expenses}
        onClose={() => setViewInvoice(null)}
      />
    </WorkspaceSection>
  )
}
