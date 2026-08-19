import { useMemo, useState } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  RowDeleteAction,
  RowEditAction,
  RowIconActionsGroup,
  RowViewAction,
} from '@/components/listing/RowIconActions'
import { Button } from '@/design-system/components'
import { WorkspaceSection } from '@/components/templates'
import { tokens } from '@/design-system/tokens'
import { useAppSelector } from '@/store/hooks'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import { formatCurrency } from '@/utils/formatters'
import { buildLiveVendorOfferRows } from '@/pages/Projects/tabs/live/vendorPOHelpers'
import {
  canDeleteVendorPO,
  DeleteVendorPODialog,
  EditVendorPODrawer,
  ViewVendorPODrawer,
} from '@/pages/Projects/tabs/live/VendorPOBillingDrawers'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  bgcolor: tokens.color.neutral[50],
  py: 1.25,
  px: 1.5,
} as const

const TABLE_CELL_SX = {
  fontSize: 12,
  py: 1.25,
  px: 1.5,
  verticalAlign: 'top' as const,
}

const ACTION_HEADER_SX = {
  ...TABLE_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const ACTION_CELL_SX = {
  ...TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const VENDOR_OFFER_COL_COUNT = 6
const VENDOR_OFFER_ACTION_WIDTH_PX = 96
const VENDOR_OFFER_DATA_COL_WIDTH = `calc((100% - ${VENDOR_OFFER_ACTION_WIDTH_PX}px) / 5)`

const VENDOR_OFFER_COLUMNS = [
  'Vendor Name',
  'Category',
  'Service',
  'Offer Amount',
  'Notes / Tags',
  'Action',
] as const

export interface VendorOffersSectionProps {
  loading?: boolean
  onAddOffer: () => void
  projectId: string
  vendorPOs: VendorPO[]
  baseline: Baseline | null
}

export function VendorOffersSection({
  loading = false,
  onAddOffer,
  projectId,
  vendorPOs,
  baseline,
}: VendorOffersSectionProps) {
  const { vendorInvoices } = useAppSelector((s) => s.live)

  const vendorRows = useMemo(
    () => buildLiveVendorOfferRows(vendorPOs, projectId, baseline),
    [vendorPOs, projectId, baseline],
  )

  const projectVendorInvoices = useMemo(
    () => vendorInvoices.filter((i) => i.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const [viewVendorPO, setViewVendorPO] = useState<VendorPO | null>(null)
  const [editVendorPO, setEditVendorPO] = useState<VendorPO | null>(null)
  const [deleteVendorPO, setDeleteVendorPO] = useState<VendorPO | null>(null)

  return (
    <>
      <WorkspaceSection
        title="Vendor Offers"
        noPadding
        action={
          <Button
            size="sm"
            variant="contained"
            color="primary"
            label="Add Vendor Offer"
            onClick={onAddOffer}
          />
        }
      >
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, px: 2 }}>
            Loading vendor offers…
          </Typography>
        ) : (
          <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <Table
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                '& .MuiTableCell-root': { wordBreak: 'break-word' },
                '& .MuiTableCell-root:not(.vendor-offer-action-cell)': { verticalAlign: 'top' },
              }}
            >
              <colgroup>
                {Array.from({ length: 5 }, (_, index) => (
                  <col key={index} style={{ width: VENDOR_OFFER_DATA_COL_WIDTH }} />
                ))}
                <col style={{ width: `${VENDOR_OFFER_ACTION_WIDTH_PX}px` }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  {VENDOR_OFFER_COLUMNS.map((h) => (
                    <TableCell key={h} sx={h === 'Action' ? ACTION_HEADER_SX : TABLE_HEADER_SX}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {vendorRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={VENDOR_OFFER_COL_COUNT}
                      sx={{
                        ...TABLE_CELL_SX,
                        textAlign: 'center',
                        color: 'text.secondary',
                        fontSize: 13,
                        py: 3,
                      }}
                    >
                      No Live vendor offers on file. Add a vendor offer here (independent of Pitch).
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorRows.map((row) => {
                    const canDelete = canDeleteVendorPO(
                      row.po.milestones ?? [],
                      projectVendorInvoices,
                    )
                    return (
                      <TableRow key={row.key} hover>
                        <TableCell sx={TABLE_CELL_SX}>{row.vendorName}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>{row.categoryName}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>{row.serviceName}</TableCell>
                        <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                          ₹{formatCurrency(row.offerAmount)}
                        </TableCell>
                        <TableCell sx={{ ...TABLE_CELL_SX, color: 'text.secondary' }}>
                          {row.notes || '—'}
                        </TableCell>
                        <TableCell className="vendor-offer-action-cell" sx={ACTION_CELL_SX}>
                          <RowIconActionsGroup>
                            <RowViewAction onClick={() => setViewVendorPO(row.po)} />
                            <RowEditAction onClick={() => setEditVendorPO(row.po)} />
                            <RowDeleteAction
                              onClick={() => setDeleteVendorPO(row.po)}
                              disabled={!canDelete}
                              disabledReason="Cannot delete — milestones are billed or paid"
                            />
                          </RowIconActionsGroup>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </WorkspaceSection>

      <ViewVendorPODrawer
        open={!!viewVendorPO}
        onClose={() => setViewVendorPO(null)}
        projectId={projectId}
        po={viewVendorPO}
        baseline={baseline}
      />
      <EditVendorPODrawer
        open={!!editVendorPO}
        onClose={() => setEditVendorPO(null)}
        projectId={projectId}
        po={editVendorPO}
        baseline={baseline}
      />
      <DeleteVendorPODialog
        open={!!deleteVendorPO}
        po={deleteVendorPO}
        projectId={projectId}
        onClose={() => setDeleteVendorPO(null)}
      />
    </>
  )
}
