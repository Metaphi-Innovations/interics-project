import { useMemo } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import type { GSTRate } from '@/slices/settings/reducer'
import { formatGstRateLabel } from './poTaxDisplay'

function formatGstOptionLabel(row: GSTRate): string {
  return `${row.slabName} (${formatGstRateLabel(row.rate)})`
}

function filterGstOptions(options: GSTRate[], inputValue: string): GSTRate[] {
  const q = inputValue.trim().toLowerCase()
  if (!q) return options
  return options.filter(
    (row) =>
      row.slabName.toLowerCase().includes(q) ||
      String(row.rate).includes(q) ||
      formatGstRateLabel(row.rate).toLowerCase().includes(q),
  )
}

export function PoGstRateSelect({
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  allowEmpty = false,
}: {
  value: number | null
  options: GSTRate[]
  onChange: (rate: number | null) => void
  disabled?: boolean
  required?: boolean
  allowEmpty?: boolean
}) {
  const selected = useMemo(() => {
    if (value == null || !Number.isFinite(value)) return null
    return options.find((row) => row.rate === value) ?? null
  }, [options, value])

  return (
    <Autocomplete
      size="small"
      fullWidth
      disabled={disabled}
      options={options}
      value={selected}
      onChange={(_, next) => onChange(next?.rate ?? null)}
      getOptionLabel={formatGstOptionLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts, state) => filterGstOptions(opts, state.inputValue)}
      disableClearable={!allowEmpty}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          placeholder="Search or select GST rate…"
          sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
        />
      )}
      slotProps={{
        paper: {
          sx: { '& .MuiAutocomplete-option': { fontSize: 12 } },
        },
      }}
    />
  )
}

export function isActiveGstRate(rate: number | null, options: GSTRate[]): boolean {
  if (rate == null || !Number.isFinite(rate)) return false
  return options.some((row) => row.status === 'active' && row.rate === rate)
}
