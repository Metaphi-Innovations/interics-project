import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Badge,
  Box,
  IconButton,
  MenuItem,
  MenuList,
  Popover,
  Stack,
  Typography,
} from '@mui/material'
import Grow from '@mui/material/Grow'
import { alpha, useTheme } from '@mui/material/styles'
import { Check, Filter, Search, X } from 'lucide-react'
import { tokens } from '@/design-system/tokens'
import { Button, DatePicker, Input, dateFromIso, isoFromDate } from '@/design-system/components'

export type ColumnFilterOption = { value: string; label: string }

export type DualDateFilterValue = {
  start: string
  end: string
}

type ColumnFilterPopoverBase = {
  columnLabel: string
  disabled?: boolean
}

export type ColumnFilterPopoverProps =
  | (ColumnFilterPopoverBase & {
      mode?: 'options' | 'date'
      value: string
      options?: ColumnFilterOption[]
      onApply: (value: string) => void
      dualValue?: never
      onApplyDual?: never
      startLabel?: never
      endLabel?: never
    })
  | (ColumnFilterPopoverBase & {
      mode: 'dual-date'
      dualValue: DualDateFilterValue
      onApplyDual: (value: DualDateFilterValue) => void
      value?: never
      options?: never
      onApply?: never
      startLabel?: string
      endLabel?: string
    })

export function ColumnFilterPopover(props: ColumnFilterPopoverProps) {
  const theme = useTheme()
  const { columnLabel, disabled } = props
  const isDualDate = props.mode === 'dual-date'
  const isDate = !isDualDate && props.mode === 'date'

  const dualValue: DualDateFilterValue = isDualDate
    ? props.dualValue
    : { start: '', end: '' }
  const singleValue = isDualDate ? '' : props.value
  const onApplySingle = isDualDate ? undefined : props.onApply
  const onApplyDualDate = isDualDate ? props.onApplyDual : undefined

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const [draftDate, setDraftDate] = useState(singleValue)
  const [draftStart, setDraftStart] = useState(dualValue.start)
  const [draftEnd, setDraftEnd] = useState(dualValue.end)
  const open = Boolean(anchorEl)

  const active = isDualDate
    ? Boolean(dualValue.start || dualValue.end)
    : Boolean(singleValue)

  useEffect(() => {
    if (!open) return
    setQuery('')
    if (isDualDate) {
      setDraftStart(dualValue.start)
      setDraftEnd(dualValue.end)
    } else {
      setDraftDate(singleValue)
    }
  }, [open, isDualDate, singleValue, dualValue.start, dualValue.end])

  const options = isDualDate ? [] : (props.options ?? [])
  const selectedLabel =
    options.find((o) => o.value === singleValue)?.label || (singleValue ? singleValue : 'All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, query])

  function openFilter(e: MouseEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    setAnchorEl(e.currentTarget)
  }

  function closeFilter() {
    setAnchorEl(null)
    setQuery('')
  }

  function selectValue(next: string) {
    if (!onApplySingle) return
    onApplySingle(next)
    closeFilter()
  }

  function applyDate() {
    if (!onApplySingle) return
    onApplySingle(draftDate)
    closeFilter()
  }

  function applyDualDate() {
    if (!onApplyDualDate) return
    onApplyDualDate({ start: draftStart, end: draftEnd })
    closeFilter()
  }

  function resetDualDate() {
    if (!onApplyDualDate) return
    setDraftStart('')
    setDraftEnd('')
    onApplyDualDate({ start: '', end: '' })
    closeFilter()
  }

  const activeSummary = isDualDate
    ? [dualValue.start, dualValue.end].filter(Boolean).join(' · ')
    : isDate
      ? singleValue
      : selectedLabel

  const ariaLabel = active
    ? `${columnLabel}: ${activeSummary}`
    : `Filter ${columnLabel}`

  const startLabel = isDualDate ? (props.startLabel ?? 'Expected Start Date') : ''
  const endLabel = isDualDate ? (props.endLabel ?? 'Expected End Date') : ''

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openFilter}
        disabled={disabled}
        sx={{
          width: 22,
          height: 22,
          p: 0,
          ml: 0.25,
          borderRadius: tokens.borderRadius.md,
          color: active || open ? 'primary.main' : tokens.color.neutral[400],
          bgcolor:
            active || open ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
          transition: tokens.transition.fast,
          '&:hover': {
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          },
          '&.Mui-disabled': { color: tokens.color.neutral[300] },
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
              width: isDualDate ? 320 : isDate ? 300 : 280,
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
                  {isDualDate ? 'Pick start and/or end dates' : isDate ? 'Pick a date' : 'Choose a value'}
                </Typography>
              )}
            </Box>
            {!isDualDate && active ? (
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

          {isDualDate ? (
            <Stack gap={1.25} sx={{ px: 1.5, py: 1.5 }}>
              <DatePicker
                label={startLabel}
                size="sm"
                fullWidth
                value={dateFromIso(draftStart)}
                onChange={(d) => setDraftStart(isoFromDate(d))}
              />
              <DatePicker
                label={endLabel}
                size="sm"
                fullWidth
                value={dateFromIso(draftEnd)}
                onChange={(d) => setDraftEnd(isoFromDate(d))}
              />
              <Stack direction="row" justifyContent="flex-end" gap={1}>
                <Button size="sm" variant="text" label="Reset" onClick={resetDualDate} />
                <Button size="sm" variant="contained" label="Apply" onClick={applyDualDate} />
              </Stack>
            </Stack>
          ) : isDate ? (
            <Stack gap={1.25} sx={{ px: 1.5, py: 1.5 }}>
              <DatePicker
                label={columnLabel}
                size="sm"
                fullWidth
                value={dateFromIso(draftDate)}
                onChange={(d) => setDraftDate(isoFromDate(d))}
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
                <FilterOptionItem
                  label="All"
                  selected={!singleValue}
                  onSelect={() => selectValue('')}
                />
                {filtered.map((opt) => (
                  <FilterOptionItem
                    key={opt.value}
                    label={opt.label}
                    selected={singleValue === opt.value}
                    onSelect={() => selectValue(opt.value)}
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

function FilterOptionItem({
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
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Box>
      {selected ? <Check size={14} strokeWidth={2.5} /> : null}
    </MenuItem>
  )
}
