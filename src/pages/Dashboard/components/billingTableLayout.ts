import type { SxProps } from '@mui/material'
import type { Theme } from '@mui/material/styles'

/**
 * Balanced 8-column grid: wider Project, equal financial cols, compact Status.
 * Uniform columnGap; per-cell padding applied via BillingTableCell.
 */
export const BILLING_TABLE_GRID =
  'minmax(0, 1.1fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.05fr) minmax(0, 1.05fr) minmax(0, 1.05fr) minmax(0, 1fr) minmax(92px, 0.9fr)'

/** Uniform space between columns */
export const BILLING_TABLE_COLUMN_GAP = 1.5

/** Horizontal padding inside every header/data cell */
export const BILLING_TABLE_CELL_PX = 1

/** Padding from table card edges to first/last column content */
export const BILLING_TABLE_EDGE_PX = 1.5

export const BILLING_TABLE_ROW_SX: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: BILLING_TABLE_GRID,
  columnGap: BILLING_TABLE_COLUMN_GAP,
  px: BILLING_TABLE_EDGE_PX,
  py: 1.25,
  minHeight: 44,
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
}

export type BillingTableAlign = 'left' | 'right' | 'center'

export interface BillingTableColumnDef {
  key: string
  label: string
  align: BillingTableAlign
}

export const RECEIVABLES_TABLE_COLUMNS: BillingTableColumnDef[] = [
  { key: 'client', label: 'Client', align: 'left' },
  { key: 'project', label: 'Project', align: 'left' },
  { key: 'invoiceNo', label: 'Invoice No.', align: 'left' },
  { key: 'invoiceAmount', label: 'Invoice Amount', align: 'left' },
  { key: 'received', label: 'Received', align: 'left' },
  { key: 'outstanding', label: 'Outstanding', align: 'left' },
  { key: 'dueDate', label: 'Due Date', align: 'left' },
  { key: 'status', label: 'Status', align: 'center' },
]

export const PAYABLES_TABLE_COLUMNS: BillingTableColumnDef[] = [
  { key: 'vendor', label: 'Vendor', align: 'left' },
  { key: 'project', label: 'Project', align: 'left' },
  { key: 'billNo', label: 'Bill No.', align: 'left' },
  { key: 'amount', label: 'Amount', align: 'left' },
  { key: 'paid', label: 'Paid', align: 'left' },
  { key: 'outstanding', label: 'Outstanding', align: 'left' },
  { key: 'dueDate', label: 'Due Date', align: 'left' },
  { key: 'status', label: 'Status', align: 'center' },
]

/** @deprecated Use RECEIVABLES_TABLE_COLUMNS */
export const RECEIVABLES_TABLE_HEADERS = RECEIVABLES_TABLE_COLUMNS.map((c) => c.label)

/** @deprecated Use PAYABLES_TABLE_COLUMNS */
export const PAYABLES_TABLE_HEADERS = PAYABLES_TABLE_COLUMNS.map((c) => c.label)
