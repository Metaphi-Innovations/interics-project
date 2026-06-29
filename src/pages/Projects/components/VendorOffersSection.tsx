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
import type { PitchVersion } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'
import { buildVendorOfferRows } from '@/pages/Projects/tabs/live/vendorPOHelpers'

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

const VENDOR_OFFER_COLUMNS = [
  'Vendor Name',
  'Category',
  'Service',
  'Offer Amount',
  'Notes / Tags',
] as const

export interface VendorOffersSectionProps {
  offerVersion: PitchVersion | null
  loading?: boolean
  onAddOffer: () => void
}

export function VendorOffersSection({
  offerVersion,
  loading = false,
  onAddOffer,
}: VendorOffersSectionProps) {
  const vendorRows = buildVendorOfferRows(offerVersion)

  return (
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
            }}
          >
            <TableHead>
              <TableRow>
                {VENDOR_OFFER_COLUMNS.map((h) => (
                  <TableCell key={h} sx={TABLE_HEADER_SX}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {vendorRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={VENDOR_OFFER_COLUMNS.length}
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
                vendorRows.map((row) => (
                    <TableRow key={`${row.mapping.id}-${row.serviceId}`} hover>
                      <TableCell sx={TABLE_CELL_SX}>{row.mapping.vendorName || '—'}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{row.categoryName}</TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{row.serviceName}</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                        ₹{formatCurrency(row.mapping.value)}
                      </TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, color: 'text.secondary' }}>
                        {row.mapping.notes?.trim() || '—'}
                      </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </WorkspaceSection>
  )
}
