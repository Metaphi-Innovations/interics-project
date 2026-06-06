import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Button } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVersions } from '../../../../slices/pitch/thunk'
import { fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { formatCurrency } from '../../../../utils/formatters'
import { AddVendorPODrawer } from './VendorPOBillingDrawers'
import {
  buildVendorOfferRows,
  deriveVendorOptions,
  resolvePitchVersionForProject,
} from './vendorPOHelpers'

const SUBSECTION_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  p: 2,
  bgcolor: 'background.paper',
  height: '100%',
  minWidth: 0,
} as const

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

function SubsectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="subtitle1" sx={{ fontSize: 15, fontWeight: 600 }}>
      {children}
    </Typography>
  )
}

function VendorOffersSection({
  rows,
  onAddPO,
}: {
  rows: ReturnType<typeof buildVendorOfferRows>
  onAddPO: (vendorId: string) => void
}) {
  return (
    <Box sx={SUBSECTION_SX}>
      <Stack sx={{ mb: 1.5 }}>
        <SubsectionTitle>Vendor Offers</SubsectionTitle>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          Read-only summary from the Pitch tab.
        </Typography>
      </Stack>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {['Vendor Name', 'Category', 'Service', 'Offer Amount', 'Action'].map((h) => (
                <TableCell key={h} sx={TABLE_HEADER_SX}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ ...TABLE_CELL_SX, textAlign: 'center', color: 'text.secondary' }}>
                  No vendor offers on file. Add vendor offers on the Pitch tab.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.mapping.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>{row.mapping.vendorName || '—'}</TableCell>
                  <TableCell sx={TABLE_CELL_SX}>{row.categoryName}</TableCell>
                  <TableCell sx={TABLE_CELL_SX}>{row.serviceName}</TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                    ₹{formatCurrency(row.mapping.value)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Button
                      size="sm"
                      variant="outlined"
                      color="primary"
                      label="Add PO"
                      onClick={() => onAddPO(row.mapping.vendorId)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}

interface VendorPOPitchSummaryProps {
  projectId: string
}

export function VendorPOPitchSummary({ projectId }: VendorPOPitchSummaryProps) {
  const dispatch = useAppDispatch()
  const { activeVersion, versions, loading: pitchLoading } = useAppSelector((s) => s.pitch)

  const [addPOOpen, setAddPOOpen] = useState(false)
  const [addPOVendorId, setAddPOVendorId] = useState<string | undefined>(undefined)

  useEffect(() => {
    void dispatch(fetchVersions(projectId))
    void dispatch(fetchVendorPOs(projectId))
  }, [dispatch, projectId])

  const pitchVersion = useMemo(
    () => resolvePitchVersionForProject(projectId, activeVersion, versions),
    [activeVersion, versions, projectId],
  )

  const vendorRows = useMemo(() => buildVendorOfferRows(pitchVersion), [pitchVersion])
  const vendorOptions = useMemo(() => deriveVendorOptions(pitchVersion), [pitchVersion])

  const loading = pitchLoading && !pitchVersion

  function handleAddPO(vendorId: string) {
    setAddPOVendorId(vendorId)
    setAddPOOpen(true)
  }

  function handleCloseAddPO() {
    setAddPOOpen(false)
    setAddPOVendorId(undefined)
  }

  return (
    <>
      <Box
        component="section"
        aria-label="Vendor PO pitch summary"
        sx={{
          width: '100%',
          mb: 3,
          p: { xs: 2, md: 3 },
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: tokens.borderRadius.xl,
          bgcolor: 'background.paper',
          boxShadow: tokens.shadow.sm,
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: 11 }}>
          Execution workspace for vendor offers from the Pitch tab.
        </Typography>

        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2 }}>
            Loading vendor summary…
          </Typography>
        ) : (
          <VendorOffersSection rows={vendorRows} onAddPO={handleAddPO} />
        )}
      </Box>

      <AddVendorPODrawer
        open={addPOOpen}
        onClose={handleCloseAddPO}
        projectId={projectId}
        vendors={vendorOptions}
        initialVendorId={addPOVendorId}
      />
    </>
  )
}
