import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { SxProps, Theme } from '@mui/material/styles'

export interface DatePickerProps {
  label?: string
  value?: Date | null
  onChange?: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  error?: boolean
  helperText?: string
  required?: boolean
  size?: 'sm' | 'md'
  fullWidth?: boolean
  format?: string
  disablePast?: boolean
  disableFuture?: boolean
  sx?: SxProps<Theme>
}

/** Parse `YYYY-MM-DD` (or other dayjs-parsable) strings into a local Date for DatePicker. */
export function dateFromIso(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null
  const d = dayjs(iso.trim())
  return d.isValid() ? d.toDate() : null
}

/** Format a DatePicker value as `YYYY-MM-DD` for APIs / form string state. */
export function isoFromDate(date: Date | null | undefined): string {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

export default function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  error = false,
  helperText,
  required = false,
  size = 'md',
  fullWidth = false,
  format = 'DD/MM/YYYY',
  disablePast = false,
  disableFuture = false,
  sx,
}: DatePickerProps) {
  const inputHeight = size === 'sm' ? '36px' : '42px'
  const dayjsValue = value ? dayjs(value) : null
  const dayjsMin = minDate ? dayjs(minDate) : undefined
  const dayjsMax = maxDate ? dayjs(maxDate) : undefined

  const handleChange = (newVal: Dayjs | null) => {
    onChange?.(newVal ? newVal.toDate() : null)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        label={label}
        value={dayjsValue}
        onChange={handleChange}
        minDate={dayjsMin}
        maxDate={dayjsMax}
        disabled={disabled}
        disablePast={disablePast}
        disableFuture={disableFuture}
        format={format}
        slotProps={{
          textField: {
            error,
            helperText,
            required,
            size: 'small',
            fullWidth,
            sx: [
              { '& .MuiInputBase-root': { height: inputHeight } },
              ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ],
          },
        }}
      />
    </LocalizationProvider>
  )
}
