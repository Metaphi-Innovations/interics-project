import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Button, useToast } from '@/design-system/components'
import { UploadedDocumentLink } from '@/components/documents/UploadedDocumentLink'
import { tokens } from '@/design-system/tokens'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchVendorInvoices } from '@/slices/live/thunk'
import { formatCurrency } from '@/utils/formatters'
import {
  buildVendorPOMilestoneOverviewRows,
  vendorMilestoneTypeLabel,
  type VendorPOMilestoneOverviewRow,
} from '@/pages/Projects/tabs/live/vendorPOHelpers'
import { AddVendorInvoiceDrawer } from '@/pages/Projects/tabs/live/vendorSettlement/AddVendorInvoiceDrawer'
import {
  findInvoiceForMilestone,
  invoiceMatchesRow,
  vendorInvoiceDocumentFileName,
  vendorInvoiceDocumentOpenUrl,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement/utils'
import { vendorMilestonePaymentStatus } from '@/pages/Projects/tabs/live/milestonePaymentStatus'
import type { ParsedPayableContext } from '@/utils/payableNavigation'

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
  boxSizing: 'border-box' as const,
} as const

const VENDOR_MILESTONE_COL_COUNT = 9
const VENDOR_MILESTONE_COL_WIDTH = `${100 / VENDOR_MILESTONE_COL_COUNT}%`

const CENTER_CELL_SX = {
  ...TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

const CENTER_HEADER_SX = {
  ...TABLE_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

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
  payableContext?: ParsedPayableContext
}

export function VendorMilestonesSection({
  projectId,
  vendorPOs,
  baseline,
  payableContext,
}: VendorMilestonesSectionProps) {
  const dispatch = useAppDispatch()
  const showToast = useToast((s) => s.showToast)
  const { vendorInvoices } = useAppSelector((s) => s.live)

  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false)
  const [invoiceContext, setInvoiceContext] = useState<VendorServiceRow | null>(null)
  const [presetMilestoneId, setPresetMilestoneId] = useState<string | undefined>(undefined)

  useEffect(() => {
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses(projectId))
  }, [dispatch, projectId])

  const milestoneRows = buildVendorPOMilestoneOverviewRows(vendorPOs, projectId, baseline)
  const payableFocusHandled = useRef(false)

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

  useEffect(() => {
    if (payableFocusHandled.current) return
    if (payableContext?.focus !== 'invoice' || !payableContext.milestoneId) return
    const row = milestoneRows.find((r) => r.milestoneId === payableContext.milestoneId)
    if (!row) return
    payableFocusHandled.current = true
    openUploadInvoice(row)
    window.setTimeout(() => {
      document.getElementById('vendor-milestones-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 200)
  }, [payableContext, milestoneRows])

  useEffect(() => {
    if (!payableContext?.focus || payableContext.focus === 'invoice') return
    window.setTimeout(() => {
      document.getElementById('vendor-milestones-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 200)
  }, [payableContext?.focus])

  return (
    <WorkspaceSection title="Vendor Milestones" noPadding>
      <Box id="vendor-milestones-section" sx={{ width: '100%', overflow: 'hidden' }}>
        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& .MuiTableCell-root': { verticalAlign: 'middle', wordBreak: 'break-word' },
          }}
        >
          <colgroup>
            {Array.from({ length: VENDOR_MILESTONE_COL_COUNT }, (_, index) => (
              <col key={index} style={{ width: VENDOR_MILESTONE_COL_WIDTH }} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              {[
                'PO Number',
                'Vendor',
                'Service',
                'Milestone',
                'Percentage',
                'Status',
                'Value',
                'Invoice',
                'Action',
              ].map((col) => (
                <TableCell
                  key={col}
                  sx={
                    col === 'Status' || col === 'Action'
                      ? CENTER_HEADER_SX
                      : TABLE_HEADER_SX
                  }
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
                  colSpan={9}
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
                const milestoneStatus = existingInvoice
                  ? vendorMilestonePaymentStatus([existingInvoice], row.milestoneId)
                  : 'Unpaid'

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
                    <TableCell sx={CENTER_CELL_SX}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: milestoneStatus === 'Paid' ? 'success.main' : 'text.secondary',
                        }}
                      >
                        {milestoneStatus}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                      ₹{formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        {existingInvoice?.documentUrl &&
                        vendorInvoiceDocumentFileName(existingInvoice) ? (
                          <UploadedDocumentLink
                            fileName={vendorInvoiceDocumentFileName(existingInvoice)!}
                            documentUrl={vendorInvoiceDocumentOpenUrl(existingInvoice.documentUrl)}
                            onOpenFailed={() =>
                              showToast({
                                title: 'Unable to open document',
                                description:
                                  'The invoice file is no longer available in this session. Upload it again.',
                                variant: 'error',
                              })
                            }
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                            —
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={CENTER_CELL_SX}>
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

    </WorkspaceSection>
  )
}
