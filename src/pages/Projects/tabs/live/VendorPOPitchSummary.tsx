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
import { WorkspaceSection } from '../../../../components/templates'
import { tokens } from '@/design-system/tokens'
import { useAppSelector } from '../../../../store/hooks'
import { formatCurrency } from '../../../../utils/formatters'
import { AddVendorOfferDrawer } from './AddVendorOfferDrawer'
import { AddVendorPODrawer } from './VendorPOBillingDrawers'
import { buildVendorOfferRows, collectMatchingServiceIds, deriveVendorOptions } from './vendorPOHelpers'
import { useLiveOfferVersion } from './useLiveOfferVersion'

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
  vendorMappingId: string
  linkedServiceIds: string[]
}

export function VendorPOPitchSummary({ projectId }: VendorPOPitchSummaryProps) {
  const { baseline } = useAppSelector((s) => s.baseline)
  const { offerVersion, loading } = useLiveOfferVersion(projectId)

  const [addOfferOpen, setAddOfferOpen] = useState(false)
  const [addPOOpen, setAddPOOpen] = useState(false)
  const [addPOContext, setAddPOContext] = useState<AddPOContext | null>(null)

  const baselineForProject = useMemo(
    () => (baseline?.projectId === projectId ? baseline : null),
    [baseline, projectId],
  )

  const vendorRows = useMemo(() => buildVendorOfferRows(offerVersion), [offerVersion])
  const vendorOptions = useMemo(() => deriveVendorOptions(offerVersion), [offerVersion])

  function handleAddPO(row: (typeof vendorRows)[number]) {
    const linkedServiceIds = collectMatchingServiceIds(
      row,
      baselineForProject,
      offerVersion,
      projectId,
    )
    setAddPOContext({
      vendorId: row.mapping.vendorId,
      vendorName: row.mapping.vendorName,
      categoryName: row.categoryName,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      offerAmount: row.mapping.value,
      vendorMappingId: row.mapping.id,
      linkedServiceIds,
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
                '& .MuiTableCell-root': { wordBreak: 'break-word' },
                '& .MuiTableCell-root:not(.vendor-offer-action-cell)': { verticalAlign: 'top' },
              }}
            >
              <TableHead>
                <TableRow>
                  {['Vendor Name', 'Category', 'Service', 'Offer Amount', 'Notes / Tags', 'Action'].map((h) => (
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
                      <TableCell className="vendor-offer-action-cell" sx={ACTION_CELL_SX}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 32,
                          }}
                        >
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
        linkedServiceIds={addPOContext?.linkedServiceIds}
        linkedVendorMappingId={addPOContext?.vendorMappingId}
        initialVendorName={addPOContext?.vendorName}
        initialCategoryName={addPOContext?.categoryName}
        initialServiceName={addPOContext?.serviceName}
        initialPoValue={addPOContext?.offerAmount}
      />
    </>
  )
}
