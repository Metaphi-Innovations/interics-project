import { useMemo, useState, type MouseEvent } from 'react'
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Button } from '@/design-system/components'
import { WorkspaceSection } from '@/components/templates'
import { tokens } from '@/design-system/tokens'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import { formatCurrency } from '@/utils/formatters'
import { buildLiveVendorOfferRows } from '@/pages/Projects/tabs/live/vendorPOHelpers'
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

const MENU_ITEM_SX = { fontSize: 12, py: 0.75 } as const

const VENDOR_OFFER_COL_COUNT = 6
const VENDOR_OFFER_ACTION_WIDTH_PX = 56
const VENDOR_OFFER_DATA_COL_WIDTH = `calc((100% - ${VENDOR_OFFER_ACTION_WIDTH_PX}px) / 5)`

const VENDOR_OFFER_COLUMNS = [
  'Vendor Name',
  'Category',
  'Service',
  'Offer Amount',
  'Notes / Tags',
  'Action',
] as const

function OfferRowActions({
  canView,
  onView,
}: {
  canView: boolean
  onView: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }

  function close() {
    setAnchor(null)
  }

  return (
    <>
      <IconButton size="small" onClick={open} aria-label="Row actions" sx={{ p: 0.5 }}>
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { elevation: 2 } }}
      >
        <MenuItem
          dense
          disabled={!canView}
          sx={MENU_ITEM_SX}
          onClick={() => {
            onView()
            close()
          }}
        >
          View
        </MenuItem>
      </Menu>
    </>
  )
}

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
  const vendorRows = useMemo(
    () => buildLiveVendorOfferRows(vendorPOs, projectId, baseline),
    [vendorPOs, projectId, baseline],
  )
  const [viewVendorPO, setViewVendorPO] = useState<VendorPO | null>(null)

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
                  vendorRows.map((row) => (
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
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 32,
                          }}
                        >
                          <OfferRowActions
                            canView
                            onView={() => setViewVendorPO(row.po)}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
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
