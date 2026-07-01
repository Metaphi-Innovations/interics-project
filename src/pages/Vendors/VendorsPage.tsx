import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Box,
  Stack,
  Typography,
  Chip as MuiChip,
  Card as MuiCard,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  Link as MuiLink,
  Rating,
} from '@mui/material'
import {
  VerifiedUser,
  LocationOn,
  Circle,
} from '@mui/icons-material'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme, alpha } from '@mui/material/styles'
import { Truck, Plus, MoreHorizontal, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchVendors, deleteVendor } from '../../slices/vendors/thunk'
import { setFilters, resetFilters, setPage, setSortConfig } from '../../slices/vendors/reducer'
import type { Vendor } from '../../slices/vendors/reducer'
import { ListingTemplate } from '../../components/templates'
import type { FilterField, ColumnItem } from '../../components/templates/ListingTemplate'
import { VendorDrawer } from './VendorDrawer'
import { PendingVendorContactsTable } from './PendingVendorContactsTable'
import { PendingVendorViewDrawer } from './PendingVendorViewDrawer'
import { useToast, Modal, Button } from '@/design-system/components'
import { vendorsApi } from '@/api/vendorsApi'
import { normalizeListResponse } from '@/utils/normalizeListResponse'
import { isPendingVendor } from '@/utils/vendorProfileStatus'
import { getInitials, getAvatarColor, toSlug } from '../../utils/formatters'
import { getSpecializationTagSx } from '../../utils/specializationTagStyles'
import { tokens } from '@/design-system/tokens'
import { formatVendorRating, normalizeVendorRating } from '../../utils/vendorRating'

const VENDOR_ACTION_WIDTH_PX = 60
const VENDOR_CELL_PAD_X = '14px'

type ContactsTab = 'active' | 'pending'

type VendorTableVisibleColumns = {
  website: boolean
  location: boolean
  specialization: boolean
  rating: boolean
}

function vendorDataColCount(visible: VendorTableVisibleColumns): number {
  return (
    1 +
    (visible.website ? 1 : 0) +
    (visible.location ? 1 : 0) +
    (visible.specialization ? 1 : 0) +
    (visible.rating ? 1 : 0)
  )
}

function vendorColWidth(visible: VendorTableVisibleColumns): string {
  return `calc((100% - ${VENDOR_ACTION_WIDTH_PX}px) / ${vendorDataColCount(visible)})`
}

const TABLE_HEADER_CELL_SX = {
  fontSize: 11,
  fontWeight: 600,
  color: 'text.secondary',
  py: '8px',
  px: VENDOR_CELL_PAD_X,
  borderBottom: `2px solid ${tokens.color.neutral[100]}`,
  verticalAlign: 'bottom' as const,
  boxSizing: 'border-box' as const,
}

const TABLE_HEADER_ACTION_SX = {
  ...TABLE_HEADER_CELL_SX,
  width: VENDOR_ACTION_WIDTH_PX,
  minWidth: VENDOR_ACTION_WIDTH_PX,
  maxWidth: VENDOR_ACTION_WIDTH_PX,
  whiteSpace: 'nowrap' as const,
}

const TABLE_CELL_SX = {
  py: '7px',
  px: VENDOR_CELL_PAD_X,
  verticalAlign: 'top' as const,
  boxSizing: 'border-box' as const,
}

const TABLE_CELL_RATING_SX = {
  ...TABLE_CELL_SX,
  verticalAlign: 'middle' as const,
}

const TABLE_CELL_ACTION_SX = {
  py: '7px',
  px: VENDOR_CELL_PAD_X,
  width: VENDOR_ACTION_WIDTH_PX,
  minWidth: VENDOR_ACTION_WIDTH_PX,
  maxWidth: VENDOR_ACTION_WIDTH_PX,
  verticalAlign: 'middle' as const,
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
}

function getVendorWebsiteHref(raw: string | null | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function formatVendorWebsiteLabel(raw: string | null | undefined): string | null {
  const href = getVendorWebsiteHref(raw)
  if (!href) return null
  try {
    const u = new URL(href)
    return u.hostname
  } catch {
    return raw!.replace(/^https?:\/\//i, '').replace(/\/$/, '') || null
  }
}

function getTotalVendorProjectCount(vendor: Vendor): number {
  const fd = vendor.financialDetails
  if (fd) return fd.activeProjects + fd.completedProjects
  return vendor.activeProjects
}

function VendorRatingCell({ vendor }: { vendor: Vendor }) {
  const rating = normalizeVendorRating(vendor.rating)
  if (rating == null) {
    return (
      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
        —
      </Typography>
    )
  }
  return (
    <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <Rating
        value={rating}
        readOnly
        size="small"
        precision={0.1}
        sx={{ fontSize: 14, color: tokens.color.warning[500], flexShrink: 0 }}
      />
      <Typography
        variant="body2"
        noWrap
        sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', minWidth: 0 }}
      >
        {formatVendorRating(rating)}
      </Typography>
    </Stack>
  )
}

function VendorAvatar({ name }: { name: string }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: getAvatarColor(name).bg,
        color: getAvatarColor(name).text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </Box>
  )
}

// ─── Row Actions Menu ─────────────────────────────────────────────────────────

interface RowActionsProps {
  vendor: Vendor
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

function RowActions({ vendor, onView, onEdit, onDelete }: RowActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  function open(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    setAnchor(e.currentTarget)
  }
  function close() { setAnchor(null) }

  return (
    <>
      <MuiIconButton size="small" onClick={open} sx={{ color: tokens.color.neutral[400] }}>
        <MoreHorizontal size={16} />
      </MuiIconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => { onView(); close() }} sx={{ fontSize: 13, gap: 1 }}>
          <Eye size={14} /> View
        </MenuItem>
        <MenuItem onClick={() => { onEdit(); close() }} sx={{ fontSize: 13, gap: 1 }}>
          <Pencil size={14} /> Edit
        </MenuItem>
        <Divider />
        {vendor.activeProjects > 0 ? (
          <Tooltip title="Cannot delete vendor with active projects" placement="left">
            <span>
              <MenuItem disabled sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
                <Trash2 size={14} /> Delete
              </MenuItem>
            </span>
          </Tooltip>
        ) : (
          <MenuItem onClick={() => { onDelete(); close() }} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
            <Trash2 size={14} /> Delete
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

// ─── Sort Header Cell ──────────────────────────────────────────────────────────

interface SortHeaderProps {
  label: string
  field: string
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  sx?: object
}

function SortHeader({ label, field, sortField, sortDirection, onSort, sx }: SortHeaderProps) {
  const isActive = sortField === field
  function handleClick() {
    if (isActive) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'asc')
    }
  }
  return (
    <TableCell
      sx={{
        fontSize: 11,
        fontWeight: isActive ? 700 : 600,
        color: isActive ? 'primary.main' : 'text.secondary',
        py: '8px',
        px: VENDOR_CELL_PAD_X,
        borderBottom: `2px solid ${tokens.color.neutral[100]}`,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { color: 'primary.main' },
        ...sx,
      }}
      onClick={handleClick}
    >
      <Stack direction="row" alignItems="center" gap="2px">
        {label}
        {isActive
          ? sortDirection === 'asc'
            ? <KeyboardArrowUpIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          : <UnfoldMoreIcon sx={{ fontSize: 14, color: tokens.color.neutral[300] }} />
        }
      </Stack>
    </TableCell>
  )
}

// ─── Vendor Table ─────────────────────────────────────────────────────────────

interface VendorTableProps {
  items: Vendor[]
  loading: boolean
  visibleColumns: VendorTableVisibleColumns
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: string, direction: 'asc' | 'desc') => void
  onView: (id: string) => void
  onProjects: (vendor: Vendor, e?: React.MouseEvent) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function VendorTable({
  items,
  loading,
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  onView,
  onProjects: _onProjects,
  onEdit,
  onDelete,
}: VendorTableProps) {
  const theme = useTheme()
  const tagMode = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const colWidth = vendorColWidth(visibleColumns)
  const headDataSx = { ...TABLE_HEADER_CELL_SX, width: colWidth, minWidth: 0 }
  const cellDataSx = { ...TABLE_CELL_SX, width: colWidth, minWidth: 0, overflow: 'hidden' }
  const colCount = vendorDataColCount(visibleColumns) + 1

  return (
    <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0 }}>
          <colgroup>
            <col style={{ width: colWidth }} />
            {visibleColumns.website && <col style={{ width: colWidth }} />}
            {visibleColumns.location && <col style={{ width: colWidth }} />}
            {visibleColumns.specialization && <col style={{ width: colWidth }} />}
            {visibleColumns.rating && <col style={{ width: colWidth }} />}
            <col style={{ width: `${VENDOR_ACTION_WIDTH_PX}px` }} />
          </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <SortHeader
              label="Vendor Name"
              field="name"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={onSort}
              sx={{ ...headDataSx, verticalAlign: 'bottom' }}
            />
            {visibleColumns.website && (
              <TableCell sx={{ ...headDataSx, display: { xs: 'none', sm: 'table-cell' } }}>
                Website
              </TableCell>
            )}
            {visibleColumns.location && (
              <SortHeader
                label="Location"
                field="city"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sx={{ ...headDataSx, display: { xs: 'none', md: 'table-cell' }, verticalAlign: 'bottom' }}
              />
            )}
            {visibleColumns.specialization && (
              <TableCell sx={{ ...headDataSx, display: { xs: 'none', lg: 'table-cell' } }}>
                Specialization
              </TableCell>
            )}
            {visibleColumns.rating && (
              <SortHeader
                label="Rating"
                field="rating"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
                sx={{ ...headDataSx, display: { xs: 'none', md: 'table-cell' }, verticalAlign: 'bottom' }}
              />
            )}
            <TableCell sx={TABLE_HEADER_ACTION_SX}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading &&
            [...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(colCount)].map((__, j) => (
                  <TableCell key={j} sx={{ py: '10px', px: VENDOR_CELL_PAD_X }}>
                    <Skeleton variant="text" width="80%" height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} sx={{ border: 0 }}>
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Truck size={32} color={tokens.color.neutral[300]} />
                  <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>
                    No vendors found
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add your first vendor to get started
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            items.map((vendor) => {
              const href = getVendorWebsiteHref(vendor.website)
              const host = formatVendorWebsiteLabel(vendor.website)
              return (
                <TableRow
                  key={vendor.id}
                  onClick={() => onView(vendor.id)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: hoverBg },
                    '&:last-child td': { border: 0 },
                  }}
                >
                  <TableCell sx={cellDataSx}>
                    <Stack direction="row" alignItems="center" gap={1.25}>
                      <VendorAvatar name={vendor.name} />
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12, lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {vendor.name}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {visibleColumns.website && (
                    <TableCell
                      sx={{ ...cellDataSx, display: { xs: 'none', sm: 'table-cell' } }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {href && host ? (
                        <MuiLink
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          underline="hover"
                          sx={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {host}
                        </MuiLink>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.location && (
                    <TableCell sx={{ ...cellDataSx, display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {vendor.city}, {vendor.state}
                      </Typography>
                    </TableCell>
                  )}

                  {visibleColumns.specialization && (
                    <TableCell sx={{ ...cellDataSx, display: { xs: 'none', lg: 'table-cell' } }}>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                        {vendor.tags.map((tag) => {
                          const c = getSpecializationTagSx(tag, tagMode)
                          return (
                            <MuiChip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10,
                                bgcolor: c.bg,
                                color: c.color,
                                border: 'none',
                                '& .MuiChip-label': { px: '6px' },
                              }}
                            />
                          )
                        })}
                        {vendor.tags.length === 0 ? (
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
                            —
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                  )}

                  {visibleColumns.rating && (
                    <TableCell
                      sx={{
                        ...TABLE_CELL_RATING_SX,
                        width: colWidth,
                        minWidth: 0,
                        overflow: 'hidden',
                        display: { xs: 'none', md: 'table-cell' },
                      }}
                    >
                      <VendorRatingCell vendor={vendor} />
                    </TableCell>
                  )}

                  <TableCell sx={TABLE_CELL_ACTION_SX} onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      vendor={vendor}
                      onView={() => onView(vendor.id)}
                      onEdit={() => onEdit(vendor)}
                      onDelete={() => onDelete(vendor)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
        </Table>
    </TableContainer>
  )
}

// ─── Vendor Grid Card ─────────────────────────────────────────────────────────

interface VendorGridCardProps {
  vendor: Vendor
  onView: (id: string) => void
  onProjects: (vendor: Vendor, e?: React.MouseEvent) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function VendorGridCard({ vendor, onView, onProjects: _onProjects, onEdit, onDelete }: VendorGridCardProps) {
  const theme = useTheme()
  const tagMode = theme.palette.mode === 'dark' ? 'dark' : 'light'
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const host = formatVendorWebsiteLabel(vendor.website)
  const href = getVendorWebsiteHref(vendor.website)

  return (
    <MuiCard
      elevation={0}
      onClick={() => onView(vendor.id)}
      sx={{
        p: 2,
        border: `1px solid ${tokens.color.neutral[100]}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: tokens.shadow.md },
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <VendorAvatar name={vendor.name} />
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vendor.name}
          </Typography>
        </Stack>
        <MuiIconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
          sx={{ flexShrink: 0 }}
        >
          <MoreHorizontal size={16} />
        </MuiIconButton>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { onView(vendor.id); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Eye size={14} /> View
          </MenuItem>
          <MenuItem onClick={() => { onEdit(vendor); setAnchor(null) }} sx={{ fontSize: 13, gap: 1 }}>
            <Pencil size={14} /> Edit
          </MenuItem>
          <Divider />
          {vendor.activeProjects > 0 ? (
            <Tooltip title="Cannot delete vendor with active projects" placement="left">
              <span>
                <MenuItem disabled sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
                  <Trash2 size={14} /> Delete
                </MenuItem>
              </span>
            </Tooltip>
          ) : (
            <MenuItem onClick={() => { onDelete(vendor); setAnchor(null) }} sx={{ fontSize: 13, gap: 1, color: 'error.main' }}>
              <Trash2 size={14} /> Delete
            </MenuItem>
          )}
        </Menu>
      </Stack>

      <Divider sx={{ my: '10px' }} />

      {href && host ? (
        <MuiLink
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          variant="caption"
          sx={{ fontSize: 11, display: 'block', mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {host}
        </MuiLink>
      ) : null}

      <Stack direction="row" alignItems="center" gap="5px" sx={{ mb: 1 }}>
        <LocationOn sx={{ fontSize: 11, color: 'text.secondary', flexShrink: 0 }} />
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vendor.city}, {vendor.state}
        </Typography>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap sx={{ mb: 1 }}>
        {vendor.tags.map((tag) => {
          const c = getSpecializationTagSx(tag, tagMode)
          return (
            <MuiChip
              key={tag}
              label={tag}
              size="small"
              sx={{ height: 20, fontSize: 10, bgcolor: c.bg, color: c.color, border: 'none', '& .MuiChip-label': { px: '6px' } }}
            />
          )
        })}
      </Stack>

      <Divider sx={{ my: '10px' }} />

      <Box>
        <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>
          Rating
        </Typography>
        <VendorRatingCell vendor={vendor} />
      </Box>
    </MuiCard>
  )
}

// ─── Vendors Grid ─────────────────────────────────────────────────────────────

interface VendorsGridProps {
  items: Vendor[]
  loading: boolean
  onView: (id: string) => void
  onProjects: (vendor: Vendor, e?: React.MouseEvent) => void
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function VendorsGrid({ items, loading, onView, onProjects, onEdit, onDelete }: VendorsGridProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1,1fr)', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
          gap: '12px',
          p: 2,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Truck size={32} color={tokens.color.neutral[300]} />
        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 500 }}>No vendors found</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1,1fr)', md: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' },
        gap: '12px',
        p: 2,
      }}
    >
      {items.map((vendor) => (
        <VendorGridCard
          key={vendor.id}
          vendor={vendor}
          onView={onView}
          onProjects={onProjects}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </Box>
  )
}

// ─── Simple Pagination ────────────────────────────────────────────────────────

interface SimplePaginationProps {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}

function SimplePagination({ page, pageSize, total, onPage }: SimplePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const from = Math.min((page - 1) * pageSize + 1, total)
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
      <MuiIconButton size="small" disabled={page >= totalPages} onClick={() => onPage(page + 1)} sx={{ p: '4px' }}>
        <ChevronRight size={16} />
      </MuiIconButton>
    </Stack>
  )
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  vendor: Vendor | null
  onConfirm: () => void
  onClose: () => void
}

function ConfirmDeleteDialog({ vendor, onConfirm, onClose }: ConfirmDeleteProps) {
  return (
    <Modal
      open={!!vendor}
      onClose={onClose}
      title="Delete Vendor"
      size="xs"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="outlined" color="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="contained" color="error" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2">
        Are you sure you want to delete <strong>{vendor?.name}</strong>? This action cannot be undone.
      </Typography>
    </Modal>
  )
}

// ─── VendorsPage ──────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const dispatch = useAppDispatch()
  const { items: rawItems, loading, pagination, filters, sortConfig } = useAppSelector((s) => s.vendors)
  const items = rawItems ?? []
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [visibleColumns, setVisibleColumns] = useState<VendorTableVisibleColumns>({
    website: true,
    location: true,
    specialization: true,
    rating: true,
  })
  const [contactsTab, setContactsTab] = useState<ContactsTab>('active')
  const [pendingViewVendor, setPendingViewVendor] = useState<Vendor | null>(null)
  const [pendingViewOpen, setPendingViewOpen] = useState(false)
  const [tabCounts, setTabCounts] = useState({ active: 0, pending: 0 })

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshTabCounts = useCallback(async () => {
    try {
      const [activeRes, pendingRes] = await Promise.all([
        vendorsApi.getAll({ page: 1, pageSize: 1, profileStatus: 'complete' }),
        vendorsApi.getAll({ page: 1, pageSize: 1, profileStatus: 'pending' }),
      ])
      setTabCounts({
        active: normalizeListResponse<Vendor>(activeRes.data).total,
        pending: normalizeListResponse<Vendor>(pendingRes.data).total,
      })
    } catch {
      // Tab counts are non-blocking; listing fetch still drives the table.
    }
  }, [])

  const profileStatusFilter = contactsTab === 'pending' ? 'pending' : 'complete'

  function buildFetchParams(page = pagination.page) {
    return {
      page,
      pageSize: pagination.pageSize,
      search: filters.search || undefined,
      profileStatus: profileStatusFilter as 'pending' | 'complete',
      ...(contactsTab === 'active'
        ? {
            status: filters.status || undefined,
            gstStatus: filters.gstStatus || undefined,
            state: filters.state || undefined,
          }
        : {}),
    }
  }

  // ── Initial fetch ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchVendors(buildFetchParams(1)))
    void refreshTabCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // ── Computed ──────────────────────────────────────────────────────

  // Sort items client-side
  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    if (!sortConfig.field) return 0
    if (sortConfig.field === 'projects') {
      const av = getTotalVendorProjectCount(a)
      const bv = getTotalVendorProjectCount(b)
      return sortConfig.direction === 'asc' ? av - bv : bv - av
    }
    if (sortConfig.field === 'rating') {
      const av = normalizeVendorRating(a.rating) ?? -1
      const bv = normalizeVendorRating(b.rating) ?? -1
      return sortConfig.direction === 'asc' ? av - bv : bv - av
    }
    const field = sortConfig.field as keyof Vendor
    const aVal = a[field]
    const bVal = b[field]
    if (aVal === bVal) return 0
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    }
    const aStr = String(aVal ?? '').toLowerCase()
    const bStr = String(bVal ?? '').toLowerCase()
    const cmp = aStr < bStr ? -1 : 1
    return sortConfig.direction === 'asc' ? cmp : -cmp
  }), [items, sortConfig])

  const contactsTabs = useMemo(
    () => [
      { label: 'Active Contacts', value: 'active', count: tabCounts.active },
      { label: 'Pending Contacts', value: 'pending', count: tabCounts.pending },
    ],
    [tabCounts],
  )

  const columnsConfig: ColumnItem[] = [
    { field: 'website', label: 'Website', visible: visibleColumns.website },
    { field: 'location', label: 'Location', visible: visibleColumns.location },
    { field: 'specialization', label: 'Specialization', visible: visibleColumns.specialization },
    { field: 'rating', label: 'Rating', visible: visibleColumns.rating },
  ]

  // Filter config
  const filterConfig: FilterField[] = [
    {
      field: 'status',
      label: 'Status',
      type: 'select',
      icon: <Circle sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
    {
      field: 'gstStatus',
      label: 'GST Status',
      type: 'select',
      icon: <VerifiedUser sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Registered', value: 'Registered' },
        { label: 'Unregistered', value: 'Unregistered' },
      ],
    },
    {
      field: 'state',
      label: 'State',
      type: 'select',
      icon: <LocationOn sx={{ fontSize: 12 }} />,
      options: [
        { label: 'All', value: '' },
        { label: 'Karnataka', value: 'Karnataka' },
        { label: 'Maharashtra', value: 'Maharashtra' },
        { label: 'Delhi', value: 'Delhi' },
        { label: 'Gujarat', value: 'Gujarat' },
      ],
    },
  ]

  // ── Handlers ──────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    dispatch(setFilters({ search: value }))
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      dispatch(setPage(1))
      dispatch(fetchVendors(buildFetchParams(1)))
    }, 300)
  }

  function handleFilterChange(newFilters: Record<string, unknown>) {
    setActiveFilters(newFilters)
    const params: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(newFilters)) {
      params[k] = (v as string) || undefined
    }
    dispatch(setFilters(params as { search?: string; status?: string; gstStatus?: string; state?: string }))
    dispatch(setPage(1))
    dispatch(fetchVendors({ ...buildFetchParams(1), ...params }))
  }

  function handleFilterReset() {
    setActiveFilters({})
    dispatch(resetFilters())
    dispatch(setPage(1))
    dispatch(fetchVendors(buildFetchParams(1)))
  }

  function handleSortChange(field: string, direction: 'asc' | 'desc') {
    dispatch(setSortConfig({ field, direction }))
  }

  function handlePageChange(p: number) {
    dispatch(setPage(p))
    dispatch(fetchVendors(buildFetchParams(p)))
  }

  function handleContactsTabChange(tab: string) {
    const next = tab as ContactsTab
    setContactsTab(next)
    dispatch(setPage(1))
    dispatch(
      fetchVendors({
        page: 1,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        profileStatus: next === 'pending' ? 'pending' : 'complete',
        ...(next === 'active'
          ? {
              status: filters.status || undefined,
              gstStatus: filters.gstStatus || undefined,
              state: filters.state || undefined,
            }
          : {}),
      }),
    )
  }

  function handleVendorCompleted() {
    setContactsTab('active')
    dispatch(setPage(1))
    void refreshTabCounts()
    dispatch(
      fetchVendors({
        page: 1,
        pageSize: pagination.pageSize,
        search: filters.search || undefined,
        profileStatus: 'complete',
        status: filters.status || undefined,
        gstStatus: filters.gstStatus || undefined,
        state: filters.state || undefined,
      }),
    )
  }

  function handleColumnVisibilityChange(field: string, visible: boolean) {
    setVisibleColumns((prev) => ({ ...prev, [field]: visible } as VendorTableVisibleColumns))
  }

  function openAddDrawer() {
    setDrawerMode('add')
    setEditingVendor(null)
    setDrawerOpen(true)
  }

  function openEditDrawer(vendor: Vendor) {
    setDrawerMode('edit')
    setEditingVendor(vendor)
    setDrawerOpen(true)
  }

  function handleDrawerClose() {
    setDrawerOpen(false)
    setEditingVendor(null)
    void refreshTabCounts()
  }

  function handleNavigateToVendor(id: string) {
    const vendor = items.find((v) => v.id === id)
    if (vendor) {
      navigate(`/vendors/${toSlug(vendor.name)}`)
    }
  }

  function handleNavigateToVendorProjects(vendor: Vendor, e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    navigate(`/vendors/${toSlug(vendor.name)}?tab=projects`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await dispatch(deleteVendor(deleteTarget.id)).unwrap()
      showToast({ title: 'Vendor deleted', variant: 'success' })
      void refreshTabCounts()
    } catch (err) {
      showToast({ title: (err as string) || 'Failed to delete vendor', variant: 'error' })
    }
    setDeleteTarget(null)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <ListingTemplate
        icon={<Truck size={20} />}
        title="Vendors"
        subtitle="Vendor directory and procurement relationships"
        tabs={contactsTabs}
        activeTab={contactsTab}
        onTabChange={handleContactsTabChange}
        primaryAction={
          contactsTab === 'active'
            ? {
                label: 'Add Vendor',
                onClick: openAddDrawer,
                startIcon: <Plus size={16} strokeWidth={2} />,
              }
            : undefined
        }
        searchPlaceholder={
          contactsTab === 'pending'
            ? 'Search by name, mobile, or email…'
            : 'Search by name, contact, or specialization...'
        }
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        filterConfig={contactsTab === 'active' ? filterConfig : undefined}
        activeFilters={contactsTab === 'active' ? activeFilters : undefined}
        onFilterChange={contactsTab === 'active' ? handleFilterChange : undefined}
        onFilterReset={contactsTab === 'active' ? handleFilterReset : undefined}
        columns={contactsTab === 'active' ? columnsConfig : undefined}
        onColumnVisibilityChange={
          contactsTab === 'active' ? handleColumnVisibilityChange : undefined
        }
        showViewToggle={contactsTab === 'active'}
        onViewModeChange={(mode) => setViewMode(mode === 'grid' ? 'grid' : 'table')}
        clipCardContent={false}
      >
        {contactsTab === 'pending' ? (
          <PendingVendorContactsTable
            items={sortedItems}
            loading={loading}
            onView={(vendor) => {
              setPendingViewVendor(vendor)
              setPendingViewOpen(true)
            }}
            onUpdate={openEditDrawer}
          />
        ) : viewMode === 'grid' ? (
          <VendorsGrid
            items={sortedItems}
            loading={loading}
            onView={handleNavigateToVendor}
            onProjects={handleNavigateToVendorProjects}
            onEdit={openEditDrawer}
            onDelete={setDeleteTarget}
          />
        ) : (
          <VendorTable
            items={sortedItems}
            loading={loading}
            visibleColumns={visibleColumns}
            sortField={sortConfig.field}
            sortDirection={sortConfig.direction}
            onSort={handleSortChange}
            onView={handleNavigateToVendor}
            onProjects={handleNavigateToVendorProjects}
            onEdit={openEditDrawer}
            onDelete={setDeleteTarget}
          />
        )}

        {pagination.total > 0 && (
          <SimplePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPage={handlePageChange}
          />
        )}
      </ListingTemplate>

      <VendorDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        mode={drawerMode}
        vendor={editingVendor}
        onCompleted={
          editingVendor && isPendingVendor(editingVendor) ? handleVendorCompleted : undefined
        }
      />

      <PendingVendorViewDrawer
        open={pendingViewOpen}
        vendor={pendingViewVendor}
        onClose={() => {
          setPendingViewOpen(false)
          setPendingViewVendor(null)
        }}
      />

      <ConfirmDeleteDialog
        vendor={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
