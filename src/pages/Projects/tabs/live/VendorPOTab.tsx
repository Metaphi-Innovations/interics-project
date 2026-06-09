import { useEffect, useMemo } from 'react'
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
import { WorkspaceSection } from '../../../../components/templates'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchBaseline, fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { formatCurrency } from '../../../../utils/formatters'
import { VendorPOPitchSummary } from './VendorPOPitchSummary'
import { buildVendorPOMilestoneOverviewRows } from './vendorPOHelpers'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: 1.5,
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: 1.5,
  px: 2,
}

interface VendorPOTabProps {
  projectId: string
}

export default function VendorPOTab({ projectId }: VendorPOTabProps) {
  const dispatch = useAppDispatch()
  const { baseline, vendorPOs } = useAppSelector((s) => s.baseline)

  useEffect(() => {
    void dispatch(fetchBaseline(projectId))
    void dispatch(fetchVendorPOs(projectId))
  }, [dispatch, projectId])

  const baselineForProject = baseline?.projectId === projectId ? baseline : null
  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((po) => po.projectId === projectId),
    [vendorPOs, projectId],
  )

  const milestoneRows = useMemo(
    () => buildVendorPOMilestoneOverviewRows(projectVendorPOs, projectId, baselineForProject),
    [projectVendorPOs, projectId, baselineForProject],
  )

  return (
    <>
      <VendorPOPitchSummary projectId={projectId} />

      <WorkspaceSection title="Vendor Milestones" noPadding>
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
                {['PO', 'Vendor', 'Service', 'Milestone', 'Percentage', 'Value', 'Status'].map((col) => (
                  <TableCell key={col} sx={TABLE_HEADER_SX}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {milestoneRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
                milestoneRows.map((row) => (
                  <TableRow key={row.key} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>
                        {row.poNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.vendor}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.service}</TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                        {row.name}
                      </Typography>
                      {row.isRetention && (
                        <Chip label="Retention" size="small" sx={{ mt: 0.5, fontSize: 10, height: 18 }} />
                      )}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.pct}%</TableCell>
                    <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                      ₹{formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>{row.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </WorkspaceSection>
    </>
  )
}
