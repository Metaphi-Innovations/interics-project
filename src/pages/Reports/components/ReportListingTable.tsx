import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useTheme, alpha } from '@mui/material/styles'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import type { ReportColumn, ReportListingRow } from '../reportsConfig'

const ACTION_WIDTH_PX = 56
const CELL_PAD_X = '14px'
const DEFAULT_PAGE_SIZE = 10

function dataColWidth(columnCount: number): string {
  return `calc((100% - ${ACTION_WIDTH_PX}px) / ${Math.max(columnCount, 1)})`
}

const TABLE_HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: '8px',
  px: CELL_PAD_X,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  boxSizing: 'border-box' as const,
  lineHeight: 1.35,
}

const TABLE_HEADER_ACTION_SX = {
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  py: '8px',
  px: CELL_PAD_X,
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  whiteSpace: 'nowrap' as const,
  boxSizing: 'border-box' as const,
  textAlign: 'center' as const,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  py: '7px',
  px: CELL_PAD_X,
  verticalAlign: 'top' as const,
  boxSizing: 'border-box' as const,
}

const TABLE_CELL_ACTION_SX = {
  py: '7px',
  px: CELL_PAD_X,
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }

function statusToBadgeType(status: string): StatusType {
  const map: Record<string, StatusType> = {
    paid: 'paid',
    partial: 'partial',
    overdue: 'overdue',
    pending: 'pending',
    good: 'active',
    average: 'pending',
    excellent: 'completed',
  }
  return map[status.toLowerCase()] ?? 'pending'
}

function formatStatusLabel(status: string): string {
  if (!status) return '—'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatCellValue(
  value: string | number,
  format: ReportColumn['format'],
): string {
  if (format === 'currency' && typeof value === 'number') {
    return `₹${formatCurrency(value)}`
  }
  if (format === 'percent' && typeof value === 'number') {
    return `${value}%`
  }
  return String(value ?? '—')
}

function downloadReportCsv(reportName: string, columns: ReportColumn[], rows: ReportListingRow[]) {
  const headers = columns.map((c) => c.label)
  const dataRows = rows.map((row) =>
    columns.map((col) => {
      const val = row[col.key]
      if (col.format === 'currency' && typeof val === 'number') return val
      if (col.format === 'percent' && typeof val === 'number') return `${val}%`
      return String(val ?? '')
    }),
  )
  const esc = (c: string | number) => {
    const s = String(c)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers, ...dataRows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reportName.toLowerCase().replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface SimplePaginationProps {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}

function SimplePagination({ page, pageSize, total, onPage }: SimplePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      gap={1}
      sx={{ p: '10px 14px', borderTop: `1px solid ${tokens.color.neutral[100]}` }}
    >
      <Typography variant="caption" color="text.secondary">
        {total === 0 ? '0' : `${from}–${to}`} of {total}
      </Typography>
      <MuiIconButton size="small" disabled={page <= 1} onClick={() => onPage(page - 1)} sx={{ p: '4px' }}>
        <ChevronLeft size={16} />
      </MuiIconButton>
      <MuiIconButton
        size="small"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        sx={{ p: '4px' }}
      >
        <ChevronRight size={16} />
      </MuiIconButton>
    </Stack>
  )
}

function RowActions({
  onView,
  onDownload,
}: {
  onView: () => void
  onDownload: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  return (
    <>
      <MuiIconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        aria-label="More actions"
        sx={{ color: tokens.color.neutral[400], p: 0.5 }}
      >
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </MuiIconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { elevation: 2 } }}
      >
        <MenuItem
          sx={menuItemSx}
          onClick={() => {
            onView()
            setAnchor(null)
          }}
        >
          View
        </MenuItem>
        <MenuItem
          sx={menuItemSx}
          onClick={() => {
            onDownload()
            setAnchor(null)
          }}
        >
          Download
        </MenuItem>
      </Menu>
    </>
  )
}

interface ReportListingTableProps {
  reportName: string
  columns: ReportColumn[]
  rows: ReportListingRow[]
  onViewRow: (row: ReportListingRow) => void
}

export function ReportListingTable({
  reportName,
  columns,
  rows,
  onViewRow,
}: ReportListingTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const [page, setPage] = useState(1)
  const pageSize = DEFAULT_PAGE_SIZE

  const colWidth = dataColWidth(columns.length)
  const headDataSx = { ...TABLE_HEADER_CELL_SX, width: colWidth }
  const cellDataSx = { ...TABLE_CELL_SX, width: colWidth }

  useEffect(() => {
    setPage(1)
  }, [reportName, rows.length])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [page, pageSize, rows])

  if (rows.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No report data available.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
      <TableContainer sx={{ overflow: 'visible', width: '100%', maxWidth: '100%' }}>
        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              {columns.map((col) => (
                <TableCell key={col.key} align="left" sx={headDataSx}>
                  {col.label}
                </TableCell>
              ))}
              <TableCell align="center" sx={TABLE_HEADER_ACTION_SX}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ '&:hover': { bgcolor: hoverBg }, '&:last-child td': { border: 0 } }}
              >
                {columns.map((col) => {
                  const value = row[col.key]
                  return (
                    <TableCell key={col.key} align="left" sx={cellDataSx}>
                      {col.format === 'status' && typeof value === 'string' ? (
                        <StatusBadge status={statusToBadgeType(value)} label={formatStatusLabel(value)} />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: 12,
                            fontWeight: col.format === 'currency' ? 500 : 400,
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {formatCellValue(value, col.format)}
                        </Typography>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell align="center" sx={TABLE_CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    onView={() => onViewRow(row)}
                    onDownload={() => downloadReportCsv(reportName, columns, [row])}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <SimplePagination
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPage={setPage}
      />
    </Box>
  )
}
