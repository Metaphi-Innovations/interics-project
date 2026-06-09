import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import {
  BILLING_TABLE_CELL_PX,
  BILLING_TABLE_COLUMN_GAP,
  BILLING_TABLE_GRID,
  BILLING_TABLE_ROW_SX,
  type BillingTableAlign,
  type BillingTableColumnDef,
} from './billingTableLayout'

export type DashboardTableColumn = BillingTableColumnDef

interface DashboardDataTableProps {
  columns: BillingTableColumnDef[]
  rows: ReactNode[]
  emptyMessage: string
  tableHeaderBg: string
}

function cellJustify(align: BillingTableAlign): string {
  if (align === 'right') return 'flex-end'
  if (align === 'center') return 'center'
  return 'flex-start'
}

export function BillingTableCell({
  align,
  children,
  variant = 'caption',
}: {
  align: BillingTableAlign
  children: ReactNode
  variant?: 'caption' | 'body2'
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: cellJustify(align),
        minWidth: 0,
        width: '100%',
        px: BILLING_TABLE_CELL_PX,
        boxSizing: 'border-box',
      }}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Typography
          variant={variant}
          sx={{
            minWidth: 0,
            maxWidth: '100%',
            textAlign: align,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </Typography>
      ) : (
        children
      )}
    </Box>
  )
}

export function BillingTableHeaderCell({
  align,
  label,
}: {
  align: BillingTableAlign
  label: string
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: cellJustify(align),
        minWidth: 0,
        width: '100%',
        px: BILLING_TABLE_CELL_PX,
        boxSizing: 'border-box',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textTransform: 'uppercase',
          fontSize: 10,
          fontWeight: 600,
          textAlign: align,
          width: '100%',
          minWidth: 0,
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

export function BillingTableStatusCell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        width: '100%',
        px: BILLING_TABLE_CELL_PX,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export function DashboardDataTable({
  columns,
  rows,
  emptyMessage,
  tableHeaderBg,
}: DashboardDataTableProps) {
  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Box
        sx={{
          ...BILLING_TABLE_ROW_SX,
          py: 0.75,
          bgcolor: tableHeaderBg,
          borderRadius: 1,
          mb: 0.5,
        }}
      >
        {columns.map((col) => (
          <BillingTableHeaderCell key={col.key} align={col.align} label={col.label} />
        ))}
      </Box>
      {rows.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 4 }}
        >
          {emptyMessage}
        </Typography>
      ) : (
        <Box sx={{ width: '100%', minWidth: 0 }}>{rows}</Box>
      )}
    </Box>
  )
}

export function billingTableRowSx(isLast: boolean): object {
  return {
    ...BILLING_TABLE_ROW_SX,
    borderBottom: isLast ? 'none' : '1px solid',
    borderColor: 'divider',
    columnGap: BILLING_TABLE_COLUMN_GAP,
    gridTemplateColumns: BILLING_TABLE_GRID,
  }
}
