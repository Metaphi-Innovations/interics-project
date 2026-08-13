import { useEffect, useMemo, useState } from 'react'
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
import { WorkspaceSection } from '../../../../components/templates'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { formatCurrency } from '../../../../utils/formatters'
import { AddVendorOfferDrawer } from './AddVendorOfferDrawer'
import { buildLiveVendorOfferRows } from './vendorPOHelpers'

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
  verticalAlign: 'middle' as const,
}

interface VendorPOPitchSummaryProps {
  projectId: string
}

/** Live Contract Vendor Offers — lists Live Vendor POs only (independent of Pitch mappings). */
export function VendorPOPitchSummary({ projectId }: VendorPOPitchSummaryProps) {
  const dispatch = useAppDispatch()
  const { baseline, vendorPOs, loading } = useAppSelector((s) => s.baseline)

  const [addOfferOpen, setAddOfferOpen] = useState(false)

  useEffect(() => {
    void dispatch(fetchVendorPOs(projectId))
  }, [dispatch, projectId])

  const baselineForProject = useMemo(
    () => (baseline?.projectId === projectId ? baseline : null),
    [baseline, projectId],
  )

  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((po) => po.projectId === projectId),
    [vendorPOs, projectId],
  )

  const vendorRows = useMemo(
    () => buildLiveVendorOfferRows(projectVendorPOs, projectId, baselineForProject),
    [projectVendorPOs, projectId, baselineForProject],
  )

  const showLoading = loading && vendorRows.length === 0

  return (
    <>
      <WorkspaceSection
        title="Vendor Offers"
        action={
          <Button
            size="sm"
            variant="contained"
            color="primary"
            label="Add Vendor Offer"
            onClick={() => setAddOfferOpen(true)}
          />
        }
        noPadding
      >
        {showLoading ? (
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
              <TableHead>
                <TableRow>
                  {['Vendor Name', 'Category', 'Service', 'Offer Amount', 'Notes / Tags'].map((h) => (
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
                      colSpan={5}
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </WorkspaceSection>

      <AddVendorOfferDrawer
        open={addOfferOpen}
        onClose={() => setAddOfferOpen(false)}
        projectId={projectId}
      />
    </>
  )
}
