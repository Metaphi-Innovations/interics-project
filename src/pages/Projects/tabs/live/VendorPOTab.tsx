import { useEffect, useMemo } from 'react'
import {
  Box,
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
import { fetchVersions } from '../../../../slices/pitch/thunk'
import { formatCurrency } from '../../../../utils/formatters'
import { deriveVendorMappingMilestoneDisplayStatus } from '@/utils/baselineMilestoneStatus'
import { VendorPOPitchSummary } from './VendorPOPitchSummary'
import { buildVendorMilestoneOverviewRows, resolvePitchVersionForProject } from './vendorPOHelpers'

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
  const { activeVersion, versions } = useAppSelector((s) => s.pitch)

  useEffect(() => {
    void dispatch(fetchVersions(projectId))
  }, [dispatch, projectId])

  const pitchVersion = useMemo(
    () => resolvePitchVersionForProject(projectId, activeVersion, versions),
    [activeVersion, versions, projectId],
  )

  const milestoneRows = useMemo(
    () => buildVendorMilestoneOverviewRows(pitchVersion),
    [pitchVersion],
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
                {[
                  'Milestone',
                  'Vendor / Service',
                  'Percentage',
                  'Value',
                  'Retention',
                  'Allocation Status',
                  'Status',
                ].map((col) => (
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
                    No vendor milestones yet. Configure vendor mapping breakdown on a service offer.
                  </TableCell>
                </TableRow>
              ) : (
                milestoneRows.map((row, idx) => {
                  const siblingMilestones = milestoneRows
                    .filter((r) => r.vendor === row.vendor && r.service === row.service)
                    .filter((r) => r.name !== 'Retention')
                  const statusIdx = siblingMilestones.findIndex((r) => r.key === row.key)
                  const displayStatus =
                    row.name === 'Retention'
                      ? 'Retention'
                      : deriveVendorMappingMilestoneDisplayStatus(
                          siblingMilestones.map((r) => ({
                            id: r.key,
                            name: r.name,
                            percentage: r.pct,
                            value: r.amount,
                          })),
                          statusIdx >= 0 ? statusIdx : idx,
                        )

                  return (
                    <TableRow key={row.key} hover>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                          {row.category}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {row.vendor}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                          {row.service}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{row.pct}%</TableCell>
                      <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                        ₹{formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        {row.retentionAmount > 0 ? `₹${formatCurrency(row.retentionAmount)}` : '—'}
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="caption" sx={{ fontSize: 11 }}>
                          {row.allocationStatus}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>{displayStatus}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Box>
      </WorkspaceSection>
    </>
  )
}
