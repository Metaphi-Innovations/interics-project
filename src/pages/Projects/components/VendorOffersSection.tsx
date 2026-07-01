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
import { Button } from '@/design-system/components'
import { WorkspaceSection } from '@/components/templates'
import { tokens } from '@/design-system/tokens'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { PitchVersion } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'
import {
  buildVendorOfferRows,
  findVendorPOForOfferRow,
} from '@/pages/Projects/tabs/live/vendorPOHelpers'
import { ViewVendorPODrawer } from '@/pages/Projects/tabs/live/VendorPOBillingDrawers'

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
const VENDOR_OFFER_COL_WIDTH = `${100 / VENDOR_OFFER_COL_COUNT}%`

const VENDOR_OFFER_COLUMNS = [
  'Vendor Name',
  'Category',
  'Service',
  'Offer Amount',
  'Notes / Tags',
  'Action',
] as const

export interface VendorOffersSectionProps {
  offerVersion: PitchVersion | null
  loading?: boolean
  onAddOffer: () => void
  projectId: string
  vendorPOs: VendorPO[]
  baseline: Baseline | null
}

export function VendorOffersSection({
  offerVersion,
  loading = false,
  onAddOffer,
  projectId,
  vendorPOs,
  baseline,
}: VendorOffersSectionProps) {
  const vendorRows = buildVendorOfferRows(offerVersion)
  const [viewVendorPO, setViewVendorPO] = useState<VendorPO | null>(null)

  const poByOfferRowKey = useMemo(() => {
    const map = new Map<string, VendorPO>()
    for (const row of vendorRows) {
      const po = findVendorPOForOfferRow(row, vendorPOs, projectId)
      if (po) map.set(`${row.mapping.id}-${row.serviceId}`, po)
    }
    return map
  }, [vendorRows, vendorPOs, projectId])

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
                {Array.from({ length: VENDOR_OFFER_COL_COUNT }, (_, index) => (
                  <col key={index} style={{ width: VENDOR_OFFER_COL_WIDTH }} />
                ))}
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
                      No vendor offers on file. Add a vendor offer or map vendors on the Pitch tab.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorRows.map((row) => {
                    const rowKey = `${row.mapping.id}-${row.serviceId}`
                    const linkedPo = poByOfferRowKey.get(rowKey)

                    return (
                      <TableRow key={rowKey} hover>
                        <TableCell sx={TABLE_CELL_SX}>{row.mapping.vendorName || '—'}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>{row.categoryName}</TableCell>
                        <TableCell sx={TABLE_CELL_SX}>{row.serviceName}</TableCell>
                        <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                          ₹{formatCurrency(row.mapping.value)}
                        </TableCell>
                        <TableCell sx={{ ...TABLE_CELL_SX, color: 'text.secondary' }}>
                          {row.mapping.notes?.trim() || '—'}
                        </TableCell>
                        <TableCell className="vendor-offer-action-cell" sx={ACTION_CELL_SX}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              minHeight: 32,
                            }}
                          >
                            {linkedPo ? (
                              <Button
                                size="sm"
                                variant="outlined"
                                color="primary"
                                label="View"
                                onClick={() => setViewVendorPO(linkedPo)}
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
        )}
      </WorkspaceSection>

      <ViewVendorPODrawer
        open={!!viewVendorPO}
        onClose={() => setViewVendorPO(null)}
        projectId={projectId}
        po={viewVendorPO}
        baseline={baseline}
      />
    </>
  )
}
