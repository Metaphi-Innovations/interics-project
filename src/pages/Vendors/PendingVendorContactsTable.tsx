import { useState } from 'react'
import {
  Box,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Skeleton,
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
import type { Vendor } from '@/slices/vendors/reducer'
import { tokens } from '@/design-system/tokens'
import { formatDate } from '@/utils/formatters'
import {
  VendorFilterableSortHeader,
  type VendorColumnFilterOption,
} from './VendorFilterableSortHeader'

const ACTION_WIDTH_PX = 84
const CELL_PAD_X = '14px'
const LISTING_EDGE_PAD = CELL_PAD_X

const CENTER_CELL_CONTENT_SX = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 1,
} as const

const HEADER_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: '8px',
  px: CELL_PAD_X,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
}

const HEADER_ACTION_SX = {
  ...HEADER_SX,
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  pl: 0,
  pr: LISTING_EDGE_PAD,
  textAlign: 'center' as const,
}

const CELL_SX = {
  fontSize: 12,
  py: '7px',
  px: CELL_PAD_X,
  verticalAlign: 'middle' as const,
  boxSizing: 'border-box' as const,
}

const CELL_ACTION_SX = {
  ...CELL_SX,
  width: ACTION_WIDTH_PX,
  minWidth: ACTION_WIDTH_PX,
  maxWidth: ACTION_WIDTH_PX,
  pl: 0,
  pr: LISTING_EDGE_PAD,
  textAlign: 'center' as const,
}

const menuItemSx = { fontSize: 12, minHeight: 32, py: 0.5 }

function colWidth(columnCount: number): string {
  return `calc((100% - ${ACTION_WIDTH_PX}px) / ${columnCount})`
}

interface PendingRowActionsProps {
  onView: () => void
  onUpdate: () => void
}

function PendingRowActions({ onView, onUpdate }: PendingRowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  return (
    <>
      <MuiIconButton
        size="small"
        aria-label="Row actions"
        onClick={(e) => {
          e.stopPropagation()
          setAnchor(e.currentTarget)
        }}
        sx={{ p: 0.25 }}
      >
        <MoreVertIcon sx={{ fontSize: 14 }} />
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
            onUpdate()
            setAnchor(null)
          }}
        >
          Update Data
        </MenuItem>
      </Menu>
    </>
  )
}

export interface PendingVendorContactsTableProps {
  items: Vendor[]
  loading: boolean
  columnFilters: {
    contactPerson: string
    mobile: string
    email: string
    designation: string
    createdOn: string
  }
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  contactPersonOptions: VendorColumnFilterOption[]
  mobileOptions: VendorColumnFilterOption[]
  emailOptions: VendorColumnFilterOption[]
  designationOptions: VendorColumnFilterOption[]
  createdOnOptions: VendorColumnFilterOption[]
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onColumnFilter: (
    field: 'contactPerson' | 'mobile' | 'email' | 'designation' | 'createdOn',
    value: string,
  ) => void
  onView: (vendor: Vendor) => void
  onUpdate: (vendor: Vendor) => void
}

export function PendingVendorContactsTable({
  items,
  loading,
  columnFilters,
  sortField,
  sortDirection,
  contactPersonOptions,
  mobileOptions,
  emailOptions,
  designationOptions,
  createdOnOptions,
  onSort,
  onColumnFilter,
  onView,
  onUpdate,
}: PendingVendorContactsTableProps) {
  const theme = useTheme()
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const width = colWidth(5)
  const headSx = { ...HEADER_SX, width, minWidth: 0 }
  const cellSx = { ...CELL_SX, width, minWidth: 0 }

  if (loading) {
    return (
      <Stack spacing={1} sx={{ p: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={36} />
        ))}
      </Stack>
    )
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No pending vendor contacts.
        </Typography>
      </Box>
    )
  }

  return (
    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
        <colgroup>
          {[...Array(5)].map((_, i) => (
            <col key={i} style={{ width }} />
          ))}
          <col style={{ width: ACTION_WIDTH_PX }} />
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <VendorFilterableSortHeader
              label="Contact Person Name"
              field="contactPerson"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.contactPerson}
              filterOptions={contactPersonOptions}
              onFilter={(value) => onColumnFilter('contactPerson', value)}
              sx={headSx}
            />
            <VendorFilterableSortHeader
              label="Mobile Number"
              field="mobile"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.mobile}
              filterOptions={mobileOptions}
              onFilter={(value) => onColumnFilter('mobile', value)}
              sx={headSx}
            />
            <VendorFilterableSortHeader
              label="Email Address"
              field="email"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.email}
              filterOptions={emailOptions}
              onFilter={(value) => onColumnFilter('email', value)}
              sx={headSx}
            />
            <VendorFilterableSortHeader
              label="Designation"
              field="designation"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterValue={columnFilters.designation}
              filterOptions={designationOptions}
              onFilter={(value) => onColumnFilter('designation', value)}
              sx={headSx}
            />
            <VendorFilterableSortHeader
              label="Created On"
              field="createdOn"
              sortField={sortField ?? undefined}
              sortDirection={sortDirection}
              onSort={onSort}
              filterMode="date"
              filterValue={columnFilters.createdOn}
              filterOptions={createdOnOptions}
              onFilter={(value) => onColumnFilter('createdOn', value)}
              sx={headSx}
            />
            <TableCell sx={HEADER_ACTION_SX}>
              <Box sx={CENTER_CELL_CONTENT_SX}>Action</Box>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((vendor) => (
            <TableRow
              key={vendor.id}
              hover
              sx={{
                '&:hover': { bgcolor: hoverBg },
                '&:hover td': { bgcolor: hoverBg },
                '&:last-child td': { border: 0 },
              }}
            >
              <TableCell sx={cellSx}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                  {vendor.contactPerson}
                </Typography>
              </TableCell>
              <TableCell sx={cellSx}>{vendor.phone}</TableCell>
              <TableCell sx={cellSx}>{vendor.email}</TableCell>
              <TableCell sx={cellSx}>{vendor.designation || '—'}</TableCell>
              <TableCell sx={cellSx}>{formatDate(vendor.createdAt)}</TableCell>
              <TableCell sx={CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                <Box sx={CENTER_CELL_CONTENT_SX}>
                  <PendingRowActions
                    onView={() => onView(vendor)}
                    onUpdate={() => onUpdate(vendor)}
                  />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
