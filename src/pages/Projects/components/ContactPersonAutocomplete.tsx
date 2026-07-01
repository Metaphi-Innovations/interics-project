import { forwardRef, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import {
  Autocomplete,
  TextField,
  Chip as MuiChip,
  Box,
  Divider,
  Button as MuiButton,
  Typography,
} from '@mui/material'
import type { Contact } from '@/slices/customers/reducer'
import { getInitials, getAvatarColor } from '@/utils/formatters'
import { FORM_CONTROL_INPUT_SX } from '../projectCreateHelpers'

interface ContactListboxProps extends HTMLAttributes<HTMLUListElement> {
  children?: ReactNode
  onCreateClick?: () => void
}

const ContactListbox = forwardRef<HTMLUListElement, ContactListboxProps>(
  function ContactListbox({ children, onCreateClick, ...props }, ref) {
    return (
      <ul ref={ref} {...props} style={{ ...props.style, padding: 0, margin: 0 }}>
        {children}
        {onCreateClick ? (
          <>
            <Divider component="li" sx={{ my: 0.5, listStyle: 'none' }} />
            <Box component="li" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              <MuiButton
                fullWidth
                size="small"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCreateClick()
                }}
                sx={{
                  justifyContent: 'flex-start',
                  px: 2,
                  py: 1,
                  fontSize: 13,
                  textTransform: 'none',
                  fontWeight: 500,
                  color: 'primary.main',
                }}
              >
                + Create New Contact Person
              </MuiButton>
            </Box>
          </>
        ) : null}
      </ul>
    )
  },
)

export function filterContacts(
  options: Contact[],
  { inputValue }: { inputValue: string },
) {
  const q = inputValue.trim().toLowerCase()
  if (!q) return options
  return options.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.designation ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q),
  )
}

export function renderContactAutocompleteOption(
  props: HTMLAttributes<HTMLLIElement>,
  option: Contact,
) {
  const colors = getAvatarColor(option.name)

  return (
    <Box
      component="li"
      {...props}
      sx={{
        display: 'flex !important',
        flexDirection: 'row !important',
        gap: 1,
        alignItems: 'center !important',
        py: '8px !important',
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '6px',
          bgcolor: colors.bg,
          color: colors.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {getInitials(option.name)}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>
          {option.name}
        </Typography>
        {option.designation ? (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.35 }}>
            {option.designation}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

export interface ContactPersonAutocompleteProps {
  contacts: Contact[]
  value: Contact[]
  error?: string
  placeholder?: string
  onChange: (contacts: Contact[]) => void
  onCreateClick?: () => void
  renderOption?: (props: HTMLAttributes<HTMLLIElement>, option: Contact) => React.ReactNode
}

export function ContactPersonAutocomplete({
  contacts,
  value,
  error,
  placeholder = 'Search by name…',
  onChange,
  onCreateClick,
  renderOption = renderContactAutocompleteOption,
}: ContactPersonAutocompleteProps) {
  const ListboxWithCreate = useMemo(
    () =>
      forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(function Listbox(
        listboxProps,
        ref,
      ) {
        return (
          <ContactListbox
            {...listboxProps}
            ref={ref}
            onCreateClick={onCreateClick}
          />
        )
      }),
    [onCreateClick],
  )

  return (
    <Autocomplete
      multiple
      fullWidth
      size="small"
      options={contacts}
      filterOptions={filterContacts}
      disableCloseOnSelect
      getOptionLabel={(c) => c.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      value={value}
      onChange={(_, val) => onChange(val)}
      renderOption={renderOption}
      limitTags={2}
      noOptionsText={onCreateClick ? 'No contacts found' : 'Select a customer first'}
      slots={{ listbox: ListboxWithCreate }}
      slotProps={{
        listbox: {
          sx: {
            '& .MuiAutocomplete-option': {
              display: 'flex !important',
              flexDirection: 'row !important',
              alignItems: 'center !important',
            },
          },
        },
      }}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <MuiChip
            {...getTagProps({ index })}
            key={option.id}
            label={option.name}
            size="small"
            sx={{ height: 22, fontSize: 11 }}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          placeholder={placeholder}
          error={Boolean(error)}
          helperText={error}
          sx={FORM_CONTROL_INPUT_SX}
        />
      )}
    />
  )
}
