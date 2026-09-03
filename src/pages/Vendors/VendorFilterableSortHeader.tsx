import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Badge,
  Box,
  IconButton,
  MenuItem,
  MenuList,
  Popover,
  Stack,
  TableCell,
  Typography,
} from '@mui/material'
import Grow from '@mui/material/Grow'
import { alpha, useTheme } from '@mui/material/styles'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import { Check, Filter, Search, X } from 'lucide-react'
import { Button, DatePicker, Input, dateFromIso, isoFromDate } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'

export type VendorColumnFilterOption = { value: string; label: string }

type VendorFilterMode = 'options' | 'date'

type VendorFilterableSortHeaderProps = {
  label: string
  field?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  sortable?: boolean
  filterable?: boolean
  filterMode?: VendorFilterMode
  filterValue: string
  filterOptions?: VendorColumnFilterOption[]
  onFilter: (value: string) => void
  sx?: object
}

export function VendorFilterableSortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  sortable = true,
  filterable = true,
  filterMode = 'options',
  filterValue,
  filterOptions = [],
  onFilter,
  sx,
}: VendorFilterableSortHeaderProps) {
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
        {filterable ? (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex', flexShrink: 0 }}>
            <VendorColumnFilterPopover
              columnLabel={label}
              mode={filterMode}
              value={filterValue}
              options={filterOptions}
              onApply={onFilter}
            />
          </Box>
        ) : null}
      </Stack>
    </TableCell>
  )
}

function VendorColumnFilterPopover({
  columnLabel,
  mode,
  value,
  options,
  onApply,
}: {
  columnLabel: string
  mode: VendorFilterMode
  value: string
  options: VendorColumnFilterOption[]
  onApply: (value: string) => void
}) {
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [draftDate, setDraftDate] = useState(value)
  const open = Boolean(anchorEl)
  const isDate = mode === 'date'
  const active = Boolean(value)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setDraftDate(value)
  }, [open, value])

  const selectedLabel = options.find((option) => option.value === value)?.label || (value ? value : 'All')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q),
    )
  }, [options, query])

  function openFilter(e: MouseEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  function closeFilter() {
    setAnchorEl(null)
    setQuery('')
  }

  function selectValue(next: string) {
    onApply(next)
    closeFilter()
  }

  function applyDate() {
    onApply(draftDate)
    closeFilter()
  }

  const activeSummary = isDate ? value : selectedLabel
  const showAllOption = !query.trim()

  return (
    <>
      <IconButton
        size="small"
        aria-label={active ? `${columnLabel}: ${activeSummary}` : `Filter ${columnLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openFilter}
        sx={{
          width: 22,
          height: 22,
          p: 0,
          ml: 0.25,
          borderRadius: tokens.borderRadius.md,
          color: active || open ? 'primary.main' : tokens.color.neutral[400],
          bgcolor: active || open ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
          transition: tokens.transition.fast,
          '&:hover': {
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          },
        }}
      >
        <Badge
          variant="dot"
          invisible={!active}
          color="primary"
          overlap="circular"
          sx={{
            '& .MuiBadge-badge': {
              width: 6,
              height: 6,
              minWidth: 6,
              top: 1,
              right: 1,
              border: `1.5px solid ${theme.palette.background.paper}`,
            },
          }}
        >
          <Filter size={13} strokeWidth={2.25} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closeFilter}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        transitionDuration={160}
        slots={{ transition: Grow }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              width: isDate ? 300 : 280,
              mt: 0.75,
              p: 0,
              overflow: 'hidden',
              borderRadius: tokens.borderRadius.xl,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: tokens.shadow.lg,
              bgcolor: 'background.paper',
            },
          },
        }}
        disableRestoreFocus
        disableScrollLock
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: 'flex', flexDirection: 'column', maxHeight: 420 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            sx={{
              px: 1.5,
              pt: 1.25,
              pb: 1,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.semibold,
                  color: 'text.primary',
                  lineHeight: 1.3,
                }}
              >
                Filter {columnLabel}
              </Typography>
              {active ? (
                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: tokens.fontSize.xs,
                    color: 'primary.main',
                    fontWeight: tokens.fontWeight.medium,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeSummary}
                </Typography>
              ) : (
                <Typography sx={{ mt: 0.25, fontSize: tokens.fontSize.xs, color: 'text.secondary' }}>
                  {isDate ? 'Pick a date' : 'Choose a value'}
                </Typography>
              )}
            </Box>
            {active ? (
              <Button
                size="sm"
                variant="text"
                color="primary"
                label="Clear"
                onClick={() => selectValue('')}
                sx={{ minWidth: 0, px: 1, height: 28, flexShrink: 0 }}
              />
            ) : (
              <IconButton
                size="small"
                aria-label="Close filter"
                onClick={closeFilter}
                sx={{
                  width: 28,
                  height: 28,
                  color: tokens.color.neutral[400],
                  '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
                }}
              >
                <X size={14} />
              </IconButton>
            )}
          </Stack>

          {isDate ? (
            <Stack gap={1.25} sx={{ px: 1.5, py: 1.5 }}>
              <DatePicker
                label={columnLabel}
                size="sm"
                fullWidth
                value={dateFromIso(draftDate)}
                onChange={(date) => setDraftDate(isoFromDate(date))}
              />
              <Stack direction="row" justifyContent="flex-end" gap={1}>
                <Button size="sm" variant="text" label="Cancel" onClick={closeFilter} />
                <Button size="sm" variant="contained" label="Apply" onClick={applyDate} />
              </Stack>
            </Stack>
          ) : (
            <>
              <Box sx={{ px: 1.25, pt: 1.25, pb: 0.75 }}>
                <Input
                  size="sm"
                  fullWidth
                  autoFocus
                  value={query}
                  onChange={setQuery}
                  placeholder="Search values"
                  startAdornment={<Search size={14} color={tokens.color.neutral[400]} />}
                />
              </Box>

              <MenuList
                dense
                disablePadding
                sx={{
                  px: 0.75,
                  pb: 0.75,
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {showAllOption ? (
                  <VendorFilterOptionItem
                    label="All"
                    selected={!value}
                    onSelect={() => selectValue('')}
                  />
                ) : null}
                {filtered.map((option) => (
                  <VendorFilterOptionItem
                    key={option.value}
                    label={option.label}
                    selected={value === option.value}
                    onSelect={() => selectValue(option.value)}
                  />
                ))}
                {filtered.length === 0 ? (
                  <Typography
                    sx={{
                      px: 1.25,
                      py: 1.5,
                      display: 'block',
                      fontSize: tokens.fontSize.sm,
                      color: 'text.secondary',
                      textAlign: 'center',
                    }}
                  >
                    No matching values
                  </Typography>
                ) : null}
              </MenuList>
            </>
          )}
        </Box>
      </Popover>
    </>
  )
}

function VendorFilterOptionItem({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  const theme = useTheme()
  return (
    <MenuItem
      selected={selected}
      onClick={onSelect}
      sx={{
        borderRadius: tokens.borderRadius.md,
        mx: 0.25,
        my: 0.15,
        px: 1.25,
        py: 0.75,
        fontSize: tokens.fontSize.sm,
        gap: 1,
        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: 'primary.main',
          fontWeight: tokens.fontWeight.medium,
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.14) },
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
      {selected ? <Check size={14} strokeWidth={2.5} /> : null}
    </MenuItem>
  )
}
