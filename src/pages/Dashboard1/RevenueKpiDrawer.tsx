/**
 * Dashboard 1 — Revenue KPI detail drawer.
 * View-only listing table for the selected KPI.
 */
import { useMemo, useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { X } from 'lucide-react'
import { SearchInput, Select, StatusBadge } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import type { RevenueKpi } from './dashboard1Data'

export type ClickableKpiId =
  | 'total-po'
  | 'live-po'
  | 'pending-claim'
  | 'paid-vendors'
  | 'payable'

export const CLICKABLE_KPI_IDS: Set<string> = new Set<string>([
  'total-po',
  'live-po',
  'pending-claim',
  'paid-vendors',
  'payable',
])

interface DrawerColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  format?: 'currency' | 'date' | 'status'
}

interface DrawerConfig {
  columns: DrawerColumn[]
  rows: Record<string, string | number>[]
  totalKey: string
}

const TOTAL_PO_ROWS = [
  { project: 'Acme Corp - Head Office', status: 'Live', poNumber: 'PO-2025-001', poDate: '12 Apr 2025', poValue: 12_500_000 },
  { project: 'Green Villa Lobby', status: 'Live', poNumber: 'PO-2025-002', poDate: '18 May 2025', poValue: 8_200_000 },
  { project: 'NovaTech Workspace', status: 'Live', poNumber: 'PO-2025-003', poDate: '03 Jun 2025', poValue: 11_500_000 },
  { project: 'Horizon Campus Phase 1', status: 'Completed', poNumber: 'PO-2024-018', poDate: '10 Jan 2024', poValue: 9_800_000 },
  { project: 'Pulse Clinic Fit-out', status: 'Completed', poNumber: 'PO-2024-022', poDate: '22 Mar 2024', poValue: 4_200_000 },
  { project: 'Grand Oak Hospitality', status: 'Archived', poNumber: 'PO-2023-009', poDate: '05 Sep 2023', poValue: 2_300_000 },
]

const LIVE_PO_ROWS = [
  { project: 'Acme Corp - Head Office', poNumber: 'PO-2025-001', poDate: '12 Apr 2025', poValue: 12_500_000 },
  { project: 'Green Villa Lobby', poNumber: 'PO-2025-002', poDate: '18 May 2025', poValue: 8_200_000 },
  { project: 'NovaTech Workspace', poNumber: 'PO-2025-003', poDate: '03 Jun 2025', poValue: 11_500_000 },
]

const PENDING_CLAIM_ROWS = [
  { project: 'Acme Corp - Head Office', invoiceNo: 'INV-2025-014', invoiceAmount: 2_500_000, amountReceived: 1_800_000, pending: 700_000, dueDate: '15 Sep 2025', status: 'Overdue' },
  { project: 'Green Villa Lobby', invoiceNo: 'INV-2025-018', invoiceAmount: 1_600_000, amountReceived: 0, pending: 1_600_000, dueDate: '30 Sep 2025', status: 'Pending' },
  { project: 'NovaTech Workspace', invoiceNo: 'INV-2025-021', invoiceAmount: 3_200_000, amountReceived: 800_000, pending: 2_400_000, dueDate: '10 Oct 2025', status: 'Partially Paid' },
  { project: 'NovaTech Workspace', invoiceNo: 'INV-2025-025', invoiceAmount: 1_900_000, amountReceived: 200_000, pending: 1_700_000, dueDate: '25 Oct 2025', status: 'Pending' },
]

const PAID_VENDORS_ROWS = [
  { vendor: 'BuildWell Constructions', project: 'Acme Corp - Head Office', invoiceNo: 'VINV-2025-032', payable: 3_200_000, paid: 3_200_000, paymentDate: '20 Jul 2025' },
  { vendor: 'ElectroTech Solutions', project: 'Green Villa Lobby', invoiceNo: 'VINV-2025-041', payable: 1_800_000, paid: 1_800_000, paymentDate: '05 Aug 2025' },
  { vendor: 'Craft Studio Design', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-048', payable: 2_900_000, paid: 2_900_000, paymentDate: '12 Aug 2025' },
  { vendor: 'AquaFlow Systems', project: 'Acme Corp - Head Office', invoiceNo: 'VINV-2025-055', payable: 1_650_000, paid: 1_650_000, paymentDate: '18 Aug 2025' },
  { vendor: 'Nova Acoustics', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-060', payable: 1_650_000, paid: 1_650_000, paymentDate: '25 Aug 2025' },
]

const PAYABLE_ROWS = [
  { vendor: 'BuildWell Constructions', project: 'Green Villa Lobby', invoiceNo: 'VINV-2025-062', payable: 1_400_000, dueDate: '30 Sep 2025', status: 'Due' },
  { vendor: 'ElectroTech Solutions', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-065', payable: 950_000, dueDate: '05 Oct 2025', status: 'Due' },
  { vendor: 'Craft Studio Design', project: 'Acme Corp - Head Office', invoiceNo: 'VINV-2025-068', payable: 1_200_000, dueDate: '15 Oct 2025', status: 'Upcoming' },
  { vendor: 'AquaFlow Systems', project: 'NovaTech Workspace', invoiceNo: 'VINV-2025-071', payable: 1_300_000, dueDate: '20 Oct 2025', status: 'Upcoming' },
]

function getDrawerConfig(kpiId: ClickableKpiId): DrawerConfig {
  switch (kpiId) {
    case 'total-po':
      return {
        columns: [
          { key: 'project', label: 'Project Name' },
          { key: 'status', label: 'Project Status', format: 'status' },
          { key: 'poNumber', label: 'PO Number' },
          { key: 'poDate', label: 'PO Date', format: 'date' },
          { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency' },
        ],
        rows: TOTAL_PO_ROWS,
        totalKey: 'poValue',
      }
    case 'live-po':
      return {
        columns: [
          { key: 'project', label: 'Project Name' },
          { key: 'poNumber', label: 'PO Number' },
          { key: 'poDate', label: 'PO Date', format: 'date' },
          { key: 'poValue', label: 'PO Value', align: 'right', format: 'currency' },
        ],
        rows: LIVE_PO_ROWS,
        totalKey: 'poValue',
      }
    case 'pending-claim':
      return {
        columns: [
          { key: 'project', label: 'Project' },
          { key: 'invoiceNo', label: 'Invoice No.' },
          { key: 'invoiceAmount', label: 'Invoice Amount', align: 'right', format: 'currency' },
          { key: 'amountReceived', label: 'Amount Received', align: 'right', format: 'currency' },
          { key: 'pending', label: 'Pending Amount', align: 'right', format: 'currency' },
          { key: 'dueDate', label: 'Due Date', format: 'date' },
          { key: 'status', label: 'Status', format: 'status' },
        ],
        rows: PENDING_CLAIM_ROWS,
        totalKey: 'pending',
      }
    case 'paid-vendors':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor' },
          { key: 'project', label: 'Project' },
          { key: 'invoiceNo', label: 'Invoice No.' },
          { key: 'payable', label: 'Payable Amount', align: 'right', format: 'currency' },
          { key: 'paid', label: 'Amount Paid', align: 'right', format: 'currency' },
          { key: 'paymentDate', label: 'Payment Date', format: 'date' },
        ],
        rows: PAID_VENDORS_ROWS,
        totalKey: 'paid',
      }
    case 'payable':
      return {
        columns: [
          { key: 'vendor', label: 'Vendor' },
          { key: 'project', label: 'Project' },
          { key: 'invoiceNo', label: 'Invoice No.' },
          { key: 'payable', label: 'Payable Amount', align: 'right', format: 'currency' },
          { key: 'dueDate', label: 'Due Date', format: 'date' },
          { key: 'status', label: 'Status', format: 'status' },
        ],
        rows: PAYABLE_ROWS,
        totalKey: 'payable',
      }
  }
}

const STATUS_TYPE_BY_LABEL: Record<string, StatusType> = {
  Live: 'live',
  Completed: 'completed',
  Archived: 'archived',
  Overdue: 'overdue',
  Pending: 'pending',
  'Partially Paid': 'partially_paid',
  Due: 'payment_pending',
  Upcoming: 'issued',
}

function formatCell(value: string | number, format?: DrawerColumn['format']): string {
  if (format === 'currency' && typeof value === 'number') return `₹${formatCurrency(value)}`
  return String(value)
}

function renderCell(value: string | number, format?: DrawerColumn['format']) {
  if (format === 'status') {
    const label = String(value)
    const status = STATUS_TYPE_BY_LABEL[label] ?? 'draft'
    return <StatusBadge status={status} label={label} size="small" />
  }
  return formatCell(value, format)
}

const FILTER_CONTROL_SX = { minWidth: 148, flex: '0 0 auto' } as const

export interface RevenueKpiDrawerProps {
  open: boolean
  onClose: () => void
  kpi: RevenueKpi | null
}

export function RevenueKpiDrawer({ open, onClose, kpi }: RevenueKpiDrawerProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | number>('all')

  const config = kpi && CLICKABLE_KPI_IDS.has(kpi.id)
    ? getDrawerConfig(kpi.id as ClickableKpiId)
    : null

  const statusColumn = config?.columns.find((col) => col.format === 'status')

  const statusOptions = useMemo(() => {
    if (!config || !statusColumn) return []
    const values = Array.from(
      new Set(config.rows.map((row) => String(row[statusColumn.key] ?? '')).filter(Boolean)),
    )
    return [
      { label: 'All Status', value: 'all' },
      ...values.map((value) => ({ label: value, value })),
    ]
  }, [config, statusColumn])

  const visibleRows = useMemo(() => {
    if (!config) return []
    const query = search.trim().toLowerCase()

    return config.rows.filter((row) => {
      if (statusColumn && statusFilter !== 'all' && String(row[statusColumn.key]) !== String(statusFilter)) {
        return false
      }

      if (query) {
        const matchesSearch = config.columns.some((col) => {
          if (col.format === 'currency') return false
          return String(row[col.key] ?? '').toLowerCase().includes(query)
        })
        if (!matchesSearch) return false
      }

      return true
    })
  }, [config, search, statusColumn, statusFilter])

  if (!kpi || !config) return null

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.18)' } },
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '78%', md: 880 },
          maxWidth: 960,
          minWidth: { sm: 640 },
          boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ pr: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
            {kpi.title}
          </Typography>
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.4,
              lineHeight: 1.2,
              mt: 0.5,
            }}
          >
            ₹{formatCurrency(kpi.value)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
            {kpi.subtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ mt: -0.5 }}>
          <X size={18} />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          pb: 2,
          flexShrink: 0,
        }}
      >
        <SearchInput
          size="sm"
          placeholder="Search..."
          value={search}
          onChange={setSearch}
          debounce={200}
          sx={{ flex: '1 1 180px', minWidth: 160, maxWidth: 280 }}
        />
        {statusColumn ? (
          <Select
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            sx={FILTER_CONTROL_SX}
          />
        ) : null}
      </Box>

      <Box sx={{ px: 3, pb: 3, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TableContainer
          sx={{
            overflowX: 'auto',
            overflowY: 'auto',
            minHeight: 0,
            border: `1px solid ${tokens.color.neutral[200]}`,
            borderRadius: 1,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              tableLayout: 'auto',
              '& .MuiTableCell-head': {
                fontSize: 12,
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: tokens.color.neutral[50],
                borderBottom: `1px solid ${tokens.color.neutral[200]}`,
                py: 1,
                px: 1.5,
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
              },
              '& .MuiTableCell-body': {
                fontSize: 13,
                py: 1,
                px: 1.5,
                borderBottom: `1px solid ${tokens.color.neutral[100]}`,
                whiteSpace: 'nowrap',
                color: 'text.primary',
              },
            }}
          >
            <TableHead>
              <TableRow>
                {config.columns.map((col) => (
                  <TableCell key={col.key} align={col.align ?? 'left'}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row, idx) => (
                <TableRow key={idx} hover={false}>
                  {config.columns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'left'}>
                      {renderCell(row[col.key], col.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={config.columns.length} sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No records match the current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Drawer>
  )
}
