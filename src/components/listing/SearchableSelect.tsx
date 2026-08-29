import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import {
  Box,
  FormHelperText,
  IconButton,
  MenuItem,
  MenuList,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import Grow from '@mui/material/Grow'
import { alpha, useTheme } from '@mui/material/styles'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { tokens } from '@/design-system/tokens'
import { Button, Input } from '@/design-system/components'
import type { ColumnFilterOption } from './ColumnFilterPopover'

export type SearchableSelectOption = ColumnFilterOption

export interface SearchableSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  error?: boolean
  helperText?: string
  required?: boolean
  disabled?: boolean
  fullWidth?: boolean
  placeholder?: string
  size?: 'small' | 'medium'
  clearable?: boolean
  id?: string
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
      <Check
        size={14}
        strokeWidth={2.25}
        style={{ opacity: selected ? 1 : 0, flexShrink: 0 }}
      />
      <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
    </MenuItem>
  )
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  error = false,
  helperText,
  required = false,
  disabled = false,
  fullWidth = false,
  placeholder = 'Select…',
  size = 'small',
  clearable = false,
  id,
}: SearchableSelectProps) {
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState('')
  const open = Boolean(anchorEl)
  const fieldId = id ?? (label ? `searchable-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? (value ? value : '')

  useEffect(() => {
    if (!open) return
    setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q),
    )
  }, [options, query])

  function openSelect(event: MouseEvent<HTMLElement>) {
    if (disabled) return
    setAnchorEl(event.currentTarget)
  }

  function closeSelect() {
    setAnchorEl(null)
    setQuery('')
  }

  function selectValue(next: string) {
    onChange(next)
    closeSelect()
  }

  return (
    <Box sx={{ width: fullWidth ? '100%' : undefined }}>
      <TextField
        id={fieldId}
        size={size}
        fullWidth={fullWidth}
        label={label}
        required={required}
        value={selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        onClick={openSelect}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              color={disabled ? tokens.color.neutral[300] : tokens.color.neutral[500]}
            />
          ),
        }}
        inputProps={{
          'aria-haspopup': 'listbox',
          'aria-expanded': open,
        }}
        sx={{
          '& .MuiInputBase-root': { cursor: disabled ? 'default' : 'pointer' },
          '& .MuiInputBase-input': { cursor: disabled ? 'default' : 'pointer' },
        }}
        error={error}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closeSelect}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        transitionDuration={160}
        slots={{ transition: Grow }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              width: anchorEl?.clientWidth ? Math.max(anchorEl.clientWidth, 280) : 280,
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
          onClick={(event) => event.stopPropagation()}
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
                }}
              >
                {label ?? 'Select'}
              </Typography>
              {selectedLabel ? (
                <Typography
                  sx={{
                    fontSize: tokens.fontSize.xs,
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedLabel}
                </Typography>
              ) : null}
            </Box>
            <Stack direction="row" alignItems="center" gap={0.5}>
              {clearable && value ? (
                <Button
                  size="sm"
                  variant="text"
                  label="Clear"
                  onClick={() => selectValue('')}
                />
              ) : null}
              <IconButton size="small" aria-label="Close" onClick={closeSelect}>
                <X size={14} />
              </IconButton>
            </Stack>
          </Stack>

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
            {filtered.map((option) => (
              <FilterOptionItem
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
        </Box>
      </Popover>

      {helperText ? <FormHelperText error={error}>{helperText}</FormHelperText> : null}
    </Box>
  )
}
