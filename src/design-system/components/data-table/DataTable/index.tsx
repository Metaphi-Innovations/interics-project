import { useState, Fragment } from 'react'
import {
  Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, IconButton, Skeleton,
  Card, CardContent, Typography, useTheme, useMediaQuery, Divider,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { Column, TableState, BulkAction } from '../types'
import ColumnHeader from '../ColumnHeader'
import EmptyState from '../EmptyState'
import ExpandedRow from '../ExpandedRow'
import InlineEdit from '../InlineEdit'
import TableToolbar from '../TableToolbar'
import Pagination from '../Pagination'

export interface DataTableProps {
  columns: Column[]
  data: any[]
  rowKey: string
  loading?: boolean
  total?: number
  state: TableState
  onStateChange: (state: TableState) => void
  onRowClick?: (row: any) => void
  onCellEdit?: (rowId: string, columnKey: string, value: any) => void
  renderExpanded?: (row: any) => React.ReactNode
  bulkActions?: BulkAction[]
  emptyState?: {
    title: string
    description?: string
    action?: { label: string; onClick: () => void }
  }
  stickyHeader?: boolean
  height?: string | number
  title?: string
  actions?: React.ReactNode
}

function getHideDisplay(hideBelow?: 'sm' | 'md' | 'lg' | 'xl') {
  if (!hideBelow) return undefined
  return { xs: 'none', [hideBelow]: 'table-cell' }
}

function SkeletonRows({ count, cols }: { count: number; cols: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(cols)].map((__, j) => (
            <TableCell key={j} sx={{ py: 1.5, px: 2 }}>
              <Skeleton variant="text" width="80%" height={20} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export default function DataTable({
  columns,
  data,
  rowKey,
  loading = false,
  total,
  state,
  onStateChange,
  onRowClick,
  onCellEdit,
  renderExpanded,
  bulkActions,
  emptyState,
  stickyHeader = true,
  height = 'auto',
  title,
  actions,
}: DataTableProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isDark = theme.palette.mode === 'dark'

  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null)

  // Theme colors
  const headerBg = isDark
    ? alpha(theme.palette.common.white, 0.03)
    : alpha(theme.palette.text.primary, 0.02)
  const evenRowBg = isDark
    ? alpha(theme.palette.common.white, 0.02)
    : alpha(theme.palette.primary.main, 0.02)
  const hoverBg = isDark
    ? alpha(theme.palette.common.white, 0.04)
    : alpha(theme.palette.primary.main, 0.04)
  const selectedBg = alpha(theme.palette.primary.main, 0.08)

  const totalCols = columns.length
    + (bulkActions ? 1 : 0)
    + (renderExpanded ? 1 : 0)

  const totalRows = total ?? data.length

  // State handlers
  const handleSort = (key: string) => {
    let dir = state.sortDirection
    if (state.sortKey !== key) dir = 'asc'
    else if (dir === 'asc') dir = 'desc'
    else if (dir === 'desc') dir = null
    else dir = 'asc'
    onStateChange({ ...state, sortKey: dir === null ? null : key, sortDirection: dir })
  }

  const handleColumnSearch = (key: string, value: string) => {
    onStateChange({ ...state, page: 0, columnSearch: { ...state.columnSearch, [key]: value } })
  }

  const handleGlobalSearch = (value: string) => {
    onStateChange({ ...state, page: 0, searchQuery: value })
  }

  const handleRowSelect = (rowId: string, checked: boolean) => {
    const next = checked
      ? [...state.selectedRows, rowId]
      : state.selectedRows.filter(id => id !== rowId)
    onStateChange({ ...state, selectedRows: next })
  }

  const handleSelectAll = (checked: boolean) => {
    onStateChange({ ...state, selectedRows: checked ? data.map(r => String(r[rowKey])) : [] })
  }

  const handleToggleExpand = (rowId: string) => {
    const isOpen = state.expandedRows.includes(rowId)
    onStateChange({
      ...state,
      expandedRows: isOpen ? state.expandedRows.filter(id => id !== rowId) : [...state.expandedRows, rowId],
    })
  }

  const selectedData = data.filter(r => state.selectedRows.includes(String(r[rowKey])))

  // ── Mobile card view ──────────────────────────────────────────────
  const mobileView = (
    <Box>
      <TableToolbar
        title={title}
        searchValue={state.searchQuery}
        onSearch={handleGlobalSearch}
        filters={state.filters}
        onFiltersChange={(filters) => onStateChange({ ...state, filters, page: 0 })}
        columns={columns}
        selectedCount={state.selectedRows.length}
        selectedRows={selectedData}
        bulkActions={bulkActions}
        onBulkAction={(action, rows) => action.onClick(rows)}
        onDeselectAll={() => onStateChange({ ...state, selectedRows: [] })}
        actions={actions}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
        {loading && [...Array(3)].map((_, i) => (
          <Card key={i} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Skeleton width="60%" height={22} />
              <Skeleton width="40%" height={18} />
            </CardContent>
          </Card>
        ))}
        {!loading && data.length === 0 && (
          <EmptyState
            variant={state.searchQuery || state.filters.length > 0 ? 'no-results' : 'no-data'}
            title={emptyState?.title}
            description={emptyState?.description}
            action={emptyState?.action}
          />
        )}
        {!loading && data.map((row) => {
          const rowId = String(row[rowKey])
          const isSelected = state.selectedRows.includes(rowId)
          // find action column
          const actionCol = columns.find(c => !c.label && c.render)
          const dataColumns = columns.filter(c => c !== actionCol && c.hideBelow !== 'sm')
          return (
            <Card
              key={rowId}
              variant="outlined"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default', bgcolor: isSelected ? selectedBg : undefined }}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  {bulkActions && (
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onClick={(e) => { e.stopPropagation(); handleRowSelect(rowId, !isSelected) }}
                      sx={{ p: 0 }}
                    />
                  )}
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {columns[0].render ? columns[0].render(row[columns[0].key], row) : row[columns[0].key]}
                  </Typography>
                  {actionCol && actionCol.render && (
                    <Box onClick={(e) => e.stopPropagation()}>
                      {actionCol.render(row[actionCol.key], row)}
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {dataColumns.slice(1).map((col) => (
                    <Box key={col.key} sx={{ display: 'flex', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                        {col.label}:
                      </Typography>
                      <Typography variant="caption">
                        {col.render
                          ? col.render(row[col.key], row)
                          : col.formatValue
                            ? col.formatValue(row[col.key])
                            : String(row[col.key] ?? '')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>
      <Divider sx={{ mt: 2 }} />
      <Pagination
        page={state.page}
        pageSize={state.pageSize}
        total={totalRows}
        onPage={(p) => onStateChange({ ...state, page: p })}
        onPageSize={(s) => onStateChange({ ...state, pageSize: s, page: 0 })}
        loading={loading}
      />
    </Box>
  )

  // ── Desktop table view ─────────────────────────────────────────────
  const tableView = (
    <Box>
      <TableToolbar
        title={title}
        searchValue={state.searchQuery}
        onSearch={handleGlobalSearch}
        filters={state.filters}
        onFiltersChange={(filters) => onStateChange({ ...state, filters, page: 0 })}
        columns={columns}
        selectedCount={state.selectedRows.length}
        selectedRows={selectedData}
        bulkActions={bulkActions}
        onBulkAction={(action, rows) => action.onClick(rows)}
        onDeselectAll={() => onStateChange({ ...state, selectedRows: [] })}
        actions={actions}
      />

      <TableContainer
        sx={{
          maxHeight: height !== 'auto' ? height : undefined,
          overflowX: 'auto',
          mt: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Table stickyHeader={stickyHeader} size="small">
          {/* Header */}
          <TableHead>
            <TableRow>
              {bulkActions && (
                <TableCell
                  padding="checkbox"
                  sx={{ bgcolor: headerBg, position: 'sticky', top: 0, zIndex: 3, borderBottom: '2px solid', borderColor: 'divider', width: '40px' }}
                >
                  <Checkbox
                    size="small"
                    indeterminate={state.selectedRows.length > 0 && state.selectedRows.length < data.length}
                    checked={data.length > 0 && state.selectedRows.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{
                    bgcolor: headerBg,
                    position: col.sticky ? 'sticky' : stickyHeader ? 'sticky' : undefined,
                    left: col.sticky ? 0 : undefined,
                    top: stickyHeader ? 0 : undefined,
                    zIndex: col.sticky ? 4 : 3,
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    width: col.width,
                    minWidth: col.minWidth,
                    boxShadow: col.sticky ? '4px 0 4px -2px rgba(0,0,0,0.08)' : undefined,
                    display: getHideDisplay(col.hideBelow),
                    verticalAlign: 'top',
                    py: '6px',
                    px: '12px',
                  }}
                >
                  <ColumnHeader
                    column={col}
                    sortKey={state.sortKey}
                    sortDirection={state.sortDirection}
                    onSort={handleSort}
                    searchValue={state.columnSearch[col.key] ?? ''}
                    onSearch={handleColumnSearch}
                    filterCount={state.filters.filter(f => f.columnKey === col.key).length}
                  />
                </TableCell>
              ))}
              {renderExpanded && (
                <TableCell sx={{ bgcolor: headerBg, position: 'sticky', top: 0, zIndex: 3, width: 48, borderBottom: '2px solid', borderColor: 'divider' }} />
              )}
            </TableRow>
          </TableHead>

          {/* Body */}
          <TableBody>
            {loading && <SkeletonRows count={5} cols={totalCols} />}
            {!loading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalCols} sx={{ border: 0 }}>
                  <EmptyState
                    variant={state.searchQuery || state.filters.length > 0 || Object.values(state.columnSearch).some(Boolean) ? 'no-results' : 'no-data'}
                    title={emptyState?.title}
                    description={emptyState?.description}
                    action={emptyState?.action}
                  />
                </TableCell>
              </TableRow>
            )}
            {!loading && data.map((row, rowIndex) => {
              const rowId = String(row[rowKey])
              const isSelected = state.selectedRows.includes(rowId)
              const isExpanded = state.expandedRows.includes(rowId)
              const isEven = rowIndex % 2 === 1
              const rowBg = isSelected ? selectedBg : isEven ? evenRowBg : undefined

              return (
                <Fragment key={rowId}>
                  <TableRow
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={{
                      bgcolor: rowBg,
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': { bgcolor: isSelected ? selectedBg : hoverBg },
                    }}
                  >
                    {/* Checkbox */}
                    {bulkActions && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onClick={(e) => { e.stopPropagation(); handleRowSelect(rowId, !isSelected) }}
                        />
                      </TableCell>
                    )}

                    {/* Data cells */}
                    {columns.map((col) => {
                      const cellValue = row[col.key]
                      const isEditing = editingCell?.rowId === rowId && editingCell?.columnKey === col.key

                      return (
                        <TableCell
                          key={col.key}
                          sx={{
                            py: '8px',
                            px: '12px',
                            fontSize: 12,
                            lineHeight: '18px',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            position: col.sticky ? 'sticky' : undefined,
                            left: col.sticky ? 0 : undefined,
                            zIndex: col.sticky ? 1 : undefined,
                            bgcolor: col.sticky
                              ? (isSelected ? selectedBg : isEven ? evenRowBg : theme.palette.background.paper)
                              : undefined,
                            boxShadow: col.sticky ? '4px 0 4px -2px rgba(0,0,0,0.08)' : undefined,
                            display: getHideDisplay(col.hideBelow),
                            textAlign: col.align,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: col.width ? undefined : 240,
                            cursor: col.editable ? 'text' : undefined,
                          }}
                          onClick={col.editable ? (e) => { e.stopPropagation(); setEditingCell({ rowId, columnKey: col.key }) } : undefined}
                        >
                          {isEditing ? (
                            <InlineEdit
                              value={cellValue}
                              column={col}
                              onSave={(val) => {
                                onCellEdit?.(rowId, col.key, val)
                                setEditingCell(null)
                              }}
                              onCancel={() => setEditingCell(null)}
                            />
                          ) : col.render
                            ? col.render(cellValue, row)
                            : col.formatValue
                              ? col.formatValue(cellValue)
                              : (cellValue == null ? '' : String(cellValue))}
                        </TableCell>
                      )
                    })}

                    {/* Expand button */}
                    {renderExpanded && (
                      <TableCell
                        sx={{
                          py: 0.5, px: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton size="small" onClick={() => handleToggleExpand(rowId)}>
                          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expanded content */}
                  {renderExpanded && (
                    <ExpandedRow key={`${rowId}-expanded`} colSpan={totalCols} open={isExpanded}>
                      {renderExpanded(row)}
                    </ExpandedRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Pagination
        page={state.page}
        pageSize={state.pageSize}
        total={totalRows}
        onPage={(p) => onStateChange({ ...state, page: p })}
        onPageSize={(s) => onStateChange({ ...state, pageSize: s, page: 0 })}
        loading={loading}
      />
    </Box>
  )

  return isMobile ? mobileView : tableView
}
