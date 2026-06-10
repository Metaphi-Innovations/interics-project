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
import { fetchVersions } from '../../../../slices/pitch/thunk'
import { formatCurrency } from '../../../../utils/formatters'
import { AddVendorOfferDrawer } from './AddVendorOfferDrawer'
import { AddVendorPODrawer } from './VendorPOBillingDrawers'
import {
  buildVendorOfferRows,
  deriveVendorOptions,
  resolvePitchVersionForProject,
} from './vendorPOHelpers'

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

interface AddPOContext {
  vendorId: string
  vendorName: string
  categoryName: string
  serviceId: string
  serviceName: string
  offerAmount: number
}

export function VendorPOPitchSummary({ projectId }: VendorPOPitchSummaryProps) {
  const dispatch = useAppDispatch()
  const { activeVersion, versions, loading: pitchLoading } = useAppSelector((s) => s.pitch)

  const [addOfferOpen, setAddOfferOpen] = useState(false)
  const [addPOOpen, setAddPOOpen] = useState(false)
  const [addPOContext, setAddPOContext] = useState<AddPOContext | null>(null)

  useEffect(() => {
    void dispatch(fetchVersions(projectId))
  }, [dispatch, projectId])

  const pitchVersion = useMemo(
    () => resolvePitchVersionForProject(projectId, activeVersion, versions),
    [activeVersion, versions, projectId],
  )

  const vendorRows = useMemo(() => buildVendorOfferRows(pitchVersion), [pitchVersion])
  const vendorOptions = useMemo(() => deriveVendorOptions(pitchVersion), [pitchVersion])
  const loading = pitchLoading && !pitchVersion

  function handleAddPO(row: (typeof vendorRows)[number]) {
    setAddPOContext({
      vendorId: row.mapping.vendorId,
      vendorName: row.mapping.vendorName,
      categoryName: row.categoryName,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      offerAmount: row.mapping.value,
    })
    setAddPOOpen(true)
  }

  function handleCloseAddPO() {
    setAddPOOpen(false)
    setAddPOContext(null)
  }

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
                '& .MuiTableCell-root': { verticalAlign: 'top', wordBreak: 'break-word' },
              }}
            >
              <TableHead>
                <TableRow>
                  {['Vendor Name', 'Category', 'Service', 'Offer Amount', 'Notes / Tags', 'Action'].map((h) => (
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
                      colSpan={6}
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
                      <TableCell sx={TABLE_CELL_SX}>
                        <Button
                          size="sm"
                          variant="outlined"
                          color="primary"
                          label="Add PO"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddPO(row)
                          }}
                        />
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

      <AddVendorPODrawer
        open={addPOOpen}
        onClose={handleCloseAddPO}
        projectId={projectId}
        vendors={vendorOptions}
        initialVendorId={addPOContext?.vendorId}
        initialServiceId={addPOContext?.serviceId}
        initialVendorName={addPOContext?.vendorName}
        initialCategoryName={addPOContext?.categoryName}
        initialServiceName={addPOContext?.serviceName}
        initialPoValue={addPOContext?.offerAmount}
      />
    </>
  )
}
