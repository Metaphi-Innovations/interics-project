import type { ReactNode } from 'react'
import { Box, Stack, TableCell } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import { tokens } from '@/design-system/tokens'
import { ColumnFilterPopover, type ColumnFilterOption } from './ColumnFilterPopover'

export function FilterableSortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  filterValue,
  filterOptions,
  onFilter,
  sortable = true,
  sx,
}: {
  label: string
  field?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  filterValue: string
  filterOptions: ColumnFilterOption[]
  onFilter: (value: string) => void
  sortable?: boolean
  sx?: object
}) {
  const canSort = Boolean(sortable && field && onSort)
  const isActive = Boolean(canSort && sortField === field)

  return (
    <TableCell
      onClick={
        canSort
          ? () => onSort!(field!, isActive && sortDirection === 'asc' ? 'desc' : 'asc')
          : undefined
      }
      sx={{
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        cursor: canSort ? 'pointer' : 'default',
        userSelect: 'none',
        verticalAlign: 'middle',
        ...(canSort ? { '&:hover': { color: 'primary.main' } } : {}),
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={0.25}
        sx={{ display: 'inline-flex', maxWidth: '100%', minWidth: 0, verticalAlign: 'middle' }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </Box>
        {canSort ? (
          isActive ? (
            sortDirection === 'asc' ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />
            ) : (
              <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />
            )
          ) : (
            <UnfoldMoreIcon sx={{ fontSize: 14, color: tokens.color.neutral[300], flexShrink: 0 }} />
          )
        ) : null}
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex', flexShrink: 0 }}>
          <ColumnFilterPopover
            columnLabel={label}
            value={filterValue}
            options={filterOptions}
            onApply={onFilter}
          />
        </Box>
      </Stack>
    </TableCell>
  )
}

export function FilterableHeaderCell({
  label,
  filterValue,
  filterOptions,
  onFilter,
  sx,
  children,
}: {
  label: string
  filterValue: string
  filterOptions: ColumnFilterOption[]
  onFilter: (value: string) => void
  sx?: object
  children?: ReactNode
}) {
  return (
    <TableCell sx={{ verticalAlign: 'middle', ...sx }}>
      <Stack
        direction="row"
        alignItems="center"
        gap={0.25}
        sx={{ display: 'inline-flex', maxWidth: '100%', minWidth: 0 }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {children ?? label}
        </Box>
        <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
          <ColumnFilterPopover
            columnLabel={label}
            value={filterValue}
            options={filterOptions}
            onApply={onFilter}
          />
        </Box>
      </Stack>
    </TableCell>
  )
}
