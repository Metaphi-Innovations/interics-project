import { useRef, useState } from 'react'
import { Box, CircularProgress, FormControl, MenuItem, Select as MuiSelect } from '@mui/material'
import { FormField } from '@/components/templates/DrawerForm'
import {
  AutocompleteField,
  DatePicker,
  Input,
  RichTextEditor,
  dateFromIso,
  isoFromDate,
} from '@/design-system/components'
import {
  COUNTRIES,
  INDIAN_CITIES,
  INDIAN_STATES,
  digitsOnly,
} from '@/constants/locations'
import { lookupPincodeLocation } from '@/utils/pincodeLookup'
import { useAppSelector } from '@/store/hooks'
import { ProjectTypesField } from './ProjectTypesField'

export const PROJECT_DETAIL_TOOLBAR = [
  'bold',
  'italic',
  'underline',
  'divider',
  'bulletList',
  'orderedList',
  'divider',
  'undo',
  'redo',
] as const

export interface ProjectSetupFormValues {
  name: string
  projectTypes: string[]
  sector: string
  address: string
  city: string
  state: string
  country: string
  pincode: string
  carpetArea: string
  headcount: string
  startDate: string
  expectedEndDate: string
  workstations: string
  cabins: string
  meetingRooms: string
  services: string
  supportFunction: string
}

export interface ProjectSetupFormErrors {
  name?: string
  projectTypes?: string
  sector?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  startDate?: string
  expectedEndDate?: string
}

interface FieldChangeProps {
  values: ProjectSetupFormValues
  onChange: (patch: Partial<ProjectSetupFormValues>) => void
}

interface SetupFieldsProps extends FieldChangeProps {
  errors: ProjectSetupFormErrors
}

export function validateProjectSetupForm(values: ProjectSetupFormValues): ProjectSetupFormErrors {
  const errors: ProjectSetupFormErrors = {}
  if (!values.name.trim()) errors.name = 'Project name is required'
  if (values.projectTypes.length === 0) {
    errors.projectTypes = 'Select at least one project type'
  }
  if (!values.sector) errors.sector = 'Sector is required'
  if (values.pincode.trim() && !/^\d+$/.test(values.pincode.trim())) {
    errors.pincode = 'PIN code must be numeric'
  }
  return errors
}

/** Same Project Setup fields as Create Project. */
export function ProjectSetupFields({ values, errors, onChange }: SetupFieldsProps) {
  const sectors = useAppSelector((s) => s.settings.sectors)
  const activeSectors = sectors.filter((s) => s.status === 'active')
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false)
  const [pincodeLookupError, setPincodeLookupError] = useState<string | undefined>()
  const pincodeLookupSeq = useRef(0)

  function set(key: keyof ProjectSetupFormValues, value: string | string[]) {
    onChange({ [key]: value })
  }

  async function resolvePincode(pin: string) {
    const seq = ++pincodeLookupSeq.current
    setPincodeLookupLoading(true)
    setPincodeLookupError(undefined)
    try {
      const location = await lookupPincodeLocation(pin)
      if (seq !== pincodeLookupSeq.current) return
      onChange({
        pincode: location.pincode,
        city: location.city,
        state: location.state,
      })
    } catch {
      if (seq !== pincodeLookupSeq.current) return
      setPincodeLookupError('Could not resolve city/state for this pincode')
    } finally {
      if (seq === pincodeLookupSeq.current) {
        setPincodeLookupLoading(false)
      }
    }
  }

  function handlePincodeChange(raw: string) {
    const pin = digitsOnly(raw).slice(0, 6)
    set('pincode', pin)
    setPincodeLookupError(undefined)
    if (pin.length < 6) {
      pincodeLookupSeq.current += 1
      setPincodeLookupLoading(false)
      return
    }
    void resolvePincode(pin)
  }

  const pincodeError = errors.pincode || pincodeLookupError

  return (
    <>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <FormField label="Project Name" required error={errors.name}>
          <Input
            value={values.name}
            onChange={(v) => set('name', v)}
            placeholder="e.g. Acme Corp - Head Office Redesign"
            size="sm"
            error={Boolean(errors.name)}
          />
        </FormField>
      </Box>

      <FormField label="Project Scope" required error={errors.projectTypes}>
        <ProjectTypesField
          value={values.projectTypes}
          onChange={(v) => set('projectTypes', v)}
          error={Boolean(errors.projectTypes)}
        />
      </FormField>

      <FormField label="Sector" required error={errors.sector}>
        <FormControl fullWidth size="small" error={Boolean(errors.sector)}>
          <MuiSelect
            value={values.sector}
            onChange={(e) => set('sector', e.target.value)}
            displayEmpty
            sx={{ fontSize: 13, '& .MuiOutlinedInput-root': { minHeight: 40 } }}
          >
            <MenuItem value="" disabled sx={{ fontSize: 13 }}>
              Select sector…
            </MenuItem>
            {activeSectors.map((s) => (
              <MenuItem key={s.id} value={s.name} sx={{ fontSize: 13 }}>
                {s.name}
              </MenuItem>
            ))}
            {values.sector && !activeSectors.some((s) => s.name === values.sector) ? (
              <MenuItem value={values.sector} sx={{ fontSize: 13 }}>
                {values.sector}
              </MenuItem>
            ) : null}
          </MuiSelect>
        </FormControl>
      </FormField>

      <Box sx={{ gridColumn: '1 / -1' }}>
        <FormField label="Address" error={errors.address}>
          <Input
            value={values.address}
            onChange={(v) => set('address', v)}
            placeholder="Street, building, landmark"
            size="sm"
            error={Boolean(errors.address)}
          />
        </FormField>
      </Box>

      <FormField
        label="PIN Code"
        error={pincodeError}
        hint={pincodeLookupLoading ? 'Looking up city & state…' : 'City and state auto-fill'}
      >
        <Input
          value={values.pincode}
          onChange={handlePincodeChange}
          placeholder="e.g. 110001"
          size="sm"
          error={Boolean(pincodeError)}
          maxLength={6}
          endAdornment={
            pincodeLookupLoading ? <CircularProgress color="inherit" size={16} /> : undefined
          }
        />
      </FormField>

      <FormField label="Country" error={errors.country}>
        <AutocompleteField
          options={[...COUNTRIES]}
          value={values.country || null}
          onChange={(v) => set('country', v ?? '')}
          getOptionLabel={(o) => o}
          isOptionEqualToValue={(a, b) => a === b}
          placeholder="Search country…"
          error={Boolean(errors.country)}
          size="sm"
        />
      </FormField>

      <FormField label="State" error={errors.state}>
        <AutocompleteField
          options={[...INDIAN_STATES]}
          value={values.state || null}
          onChange={(v) => set('state', v ?? '')}
          getOptionLabel={(o) => o}
          isOptionEqualToValue={(a, b) => a === b}
          placeholder="Search state…"
          error={Boolean(errors.state)}
          size="sm"
        />
      </FormField>

      <FormField label="City" error={errors.city}>
        <AutocompleteField
          options={[...INDIAN_CITIES]}
          value={values.city || null}
          onChange={(v) => set('city', v ?? '')}
          getOptionLabel={(o) => o}
          isOptionEqualToValue={(a, b) => a === b}
          placeholder="Search city…"
          error={Boolean(errors.city)}
          size="sm"
        />
      </FormField>

      <FormField label="Carpet Area (sq ft)">
        <Input
          type="number"
          value={values.carpetArea}
          onChange={(v) => set('carpetArea', v)}
          placeholder="e.g. 4500"
          size="sm"
        />
      </FormField>

      <FormField label="Headcount">
        <Input
          type="number"
          value={values.headcount}
          onChange={(v) => set('headcount', v)}
          placeholder="e.g. 120"
          size="sm"
        />
      </FormField>

      <FormField label="Expected Start Date" error={errors.startDate}>
        <DatePicker
          value={dateFromIso(values.startDate)}
          onChange={(d) => set('startDate', isoFromDate(d))}
          fullWidth
          size="sm"
        />
      </FormField>

      <FormField label="Expected End Date" error={errors.expectedEndDate}>
        <DatePicker
          value={dateFromIso(values.expectedEndDate)}
          onChange={(d) => set('expectedEndDate', isoFromDate(d))}
          fullWidth
          size="sm"
          minDate={dateFromIso(values.startDate) ?? undefined}
        />
      </FormField>
    </>
  )
}

/** Same optional Project Details fields as Create Project. */
export function ProjectDetailsFields({ values, onChange }: FieldChangeProps) {
  function set(key: keyof ProjectSetupFormValues, value: string) {
    onChange({ [key]: value })
  }

  return (
    <>
      <RichTextEditor
        label="Workstations"
        value={values.workstations}
        onChange={(html) => set('workstations', html)}
        placeholder="Describe workstation requirements…"
        minHeight={120}
        toolbar={[...PROJECT_DETAIL_TOOLBAR]}
      />

      <RichTextEditor
        label="Cabins"
        value={values.cabins}
        onChange={(html) => set('cabins', html)}
        placeholder="Describe cabin requirements…"
        minHeight={120}
        toolbar={[...PROJECT_DETAIL_TOOLBAR]}
      />

      <RichTextEditor
        label="Meeting Rooms"
        value={values.meetingRooms}
        onChange={(html) => set('meetingRooms', html)}
        placeholder="Describe meeting room requirements…"
        minHeight={120}
        toolbar={[...PROJECT_DETAIL_TOOLBAR]}
      />

      <RichTextEditor
        label="Services"
        value={values.services}
        onChange={(html) => set('services', html)}
        placeholder="Describe services requirements…"
        minHeight={120}
        toolbar={[...PROJECT_DETAIL_TOOLBAR]}
      />

      <RichTextEditor
        label="Support Function"
        value={values.supportFunction}
        onChange={(html) => set('supportFunction', html)}
        placeholder="Describe support function requirements…"
        minHeight={120}
        toolbar={[...PROJECT_DETAIL_TOOLBAR]}
      />
    </>
  )
}
