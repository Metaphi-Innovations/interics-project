import { Autocomplete, Chip as MuiChip, TextField } from '@mui/material'
import { PROJECT_TYPE_OPTIONS } from '../projectTypes'

interface ProjectTypesFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: boolean
  placeholder?: string
}

/** Multi-select project types — same Autocomplete + chip pattern as vendor Specialization Tags. */
export function ProjectTypesField({
  value,
  onChange,
  error,
  placeholder = 'Select project types…',
}: ProjectTypesFieldProps) {
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={[...PROJECT_TYPE_OPTIONS]}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <MuiChip
            variant="outlined"
            label={option}
            size="small"
            {...getTagProps({ index })}
            key={option}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          error={error}
          placeholder={value.length === 0 ? placeholder : ''}
          sx={{ '& input': { fontSize: 13 } }}
        />
      )}
    />
  )
}
