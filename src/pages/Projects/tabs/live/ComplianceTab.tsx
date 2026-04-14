import { useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  LinearProgress,
  IconButton as MuiIconButton,
} from '@mui/material'
import {
  Visibility,
  Download,
  CheckCircle,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchComplianceData } from '../../../../slices/live/thunk'
import { StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '../../../../utils/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLakh(value: number): string {
  return (value / 100000).toFixed(2) + ' L'
}

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: '10px',
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: '12px',
  px: 2,
}

function statusBadgeType(status: 'filed' | 'pending' | 'overdue'): StatusType {
  switch (status) {
    case 'filed':   return 'completed'
    case 'pending': return 'pending'
    case 'overdue': return 'cancelled'
  }
}

function statusLabel(status: 'filed' | 'pending' | 'overdue'): string {
  switch (status) {
    case 'filed':   return 'Filed'
    case 'pending': return 'Pending'
    case 'overdue': return 'Overdue'
  }
}

// ─── ComplianceTab ────────────────────────────────────────────────────────────

interface ComplianceTabProps {
  projectId: string
}

export default function ComplianceTab({ projectId }: ComplianceTabProps) {
  const theme = useTheme()
  const dispatch = useAppDispatch()
  const complianceData = useAppSelector((s) => s.live.complianceData)

  useEffect(() => {
    dispatch(fetchComplianceData(projectId))
  }, [dispatch, projectId])

  if (!complianceData) {
    return (
      <Box sx={{ py: 4 }}>
        <LinearProgress />
      </Box>
    )
  }

  const { gstSummary, tdsSummary, monthlyTracker, pendingActions } = complianceData

  return (
    <Stack gap={3}>
      {/* Top Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {/* GST Summary */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.info.main, 0.04),
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}
          >
            GST Summary
          </Typography>

          <Stack gap={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                GST Collected (Output Tax)
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatLakh(gstSummary.collected)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                GST Paid (Input Tax)
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatLakh(gstSummary.paid)}
              </Typography>
            </Stack>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 0.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                  Net GST Payable
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontSize: 14, fontWeight: 700, color: 'primary.main' }}
                >
                  ₹{formatLakh(gstSummary.netPayable)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* TDS Summary */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.warning.main, 0.04),
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: 'text.secondary', display: 'block', mb: 1.5 }}
          >
            TDS Summary
          </Typography>

          <Stack gap={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                TDS Deducted (Client)
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatCurrency(tdsSummary.deducted)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                TDS Deposited
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                ₹{formatCurrency(tdsSummary.deposited)}
              </Typography>
            </Stack>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 0.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                  Pending Deposit
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: tdsSummary.pending > 0 ? 'error.main' : 'success.main',
                  }}
                >
                  ₹{formatCurrency(tdsSummary.pending)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Monthly Compliance Tracker */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: 13 }}>
            Monthly Compliance Tracker
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Month</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>GST Collected</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>GST Paid</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Net GST</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>TDS Deducted</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>TDS Deposited</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {monthlyTracker.map((row) => (
              <TableRow key={row.month} hover>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                    {row.month}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(row.gstCollected)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(row.gstPaid)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'primary.main' }}>
                    ₹{formatCurrency(row.netGst)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(row.tdsDeducted)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatCurrency(row.tdsDeposited)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <StatusBadge status={statusBadgeType(row.status)} label={statusLabel(row.status)} />
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Stack direction="row" gap={0.5}>
                    <MuiIconButton size="small">
                      <Visibility sx={{ fontSize: 15 }} />
                    </MuiIconButton>
                    <MuiIconButton size="small">
                      <Download sx={{ fontSize: 15 }} />
                    </MuiIconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Pending Compliance Actions */}
      {pendingActions.length > 0 ? (
        <Alert
          severity="warning"
          sx={{ borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, fontSize: 13 }}>
            Pending Compliance Actions
          </Typography>
          <Stack gap={0.5}>
            {pendingActions.map((action, idx) => (
              <Typography key={idx} variant="body2" sx={{ fontSize: 12 }}>
                • {action}
              </Typography>
            ))}
          </Stack>
        </Alert>
      ) : (
        <Alert
          severity="success"
          icon={<CheckCircle fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
            All compliance up to date
          </Typography>
        </Alert>
      )}
    </Stack>
  )
}
