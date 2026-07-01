import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  TextField,
  CircularProgress,
  FormControl,
  Select as MuiSelect,
  MenuItem,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createCustomerContact } from '@/slices/customers/thunk'
import { createVendorContact, fetchVendors } from '@/slices/vendors/thunk'
import { fetchProjects } from '@/slices/projects/thunk'
import type { Contact } from '@/slices/customers/reducer'
import { useToast } from '@/design-system/components'
import { getVendorContactsList } from '@/utils/vendorContacts'
import {
  fetchLinkedVendorsForProjects,
  projectIdsForLinkedVendors,
  type LinkedVendorOption,
} from '@/utils/linkedCustomerVendors'
import {
  contactPhoneExists,
  FORM_CONTROL_INPUT_SX,
  type ProjectContactSource,
} from '../projectCreateHelpers'

interface CreateContactPersonModalProps {
  open: boolean
  onClose: () => void
  customerId: string
  /** When set, linked vendors are resolved for this project (and customer). */
  projectId?: string
  existingCustomerContacts: Contact[]
  /** Called only when a customer contact is saved (added to project dropdown). */
  onSaved?: (contact: Contact) => void
}

interface FormState {
  name: string
  phone: string
  email: string
  designation: string
  contactType: ProjectContactSource
  vendorId: string
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
  contactType?: string
  vendor?: string
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  designation: '',
  contactType: 'customer',
  vendorId: '',
}

const CONTACT_TYPE_OPTIONS: { value: ProjectContactSource; label: string }[] = [
  { value: 'customer', label: 'Customer Contact' },
  { value: 'vendor', label: 'Vendor Contact' },
]

function validateForm(
  form: FormState,
  existingCustomerContacts: Contact[],
  existingVendorContacts: Contact[],
): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Contact person name is required'
  if (!form.contactType) errors.contactType = 'Contact type is required'

  if (form.contactType === 'vendor' && !form.vendorId.trim()) {
    errors.vendor = 'Vendor is required.'
  }

  const existingContacts =
    form.contactType === 'vendor' ? existingVendorContacts : existingCustomerContacts

  if (!form.phone.trim()) {
    errors.phone = 'Mobile number is required'
  } else if (contactPhoneExists(existingContacts, form.phone)) {
    errors.phone =
      form.contactType === 'vendor'
        ? 'A contact with this mobile number already exists for this vendor'
        : 'A contact with this mobile number already exists for this customer'
  }

  const email = form.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address'
  }

  return errors
}

export function CreateContactPersonModal({
  open,
  onClose,
  customerId,
  projectId,
  existingCustomerContacts,
  onSaved,
}: CreateContactPersonModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const vendors = useAppSelector((s) => s.vendors.items ?? [])

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [linkedVendors, setLinkedVendors] = useState<LinkedVendorOption[]>([])
  const [loadingLinkedVendors, setLoadingLinkedVendors] = useState(false)

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === form.vendorId) ?? null,
    [vendors, form.vendorId],
  )

  const existingVendorContacts = useMemo(
    () => (selectedVendor ? getVendorContactsList(selectedVendor) : []),
    [selectedVendor],
  )

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setErrors({})
      setSaving(false)
      setLinkedVendors([])
      setLoadingLinkedVendors(false)
      return
    }

    void dispatch(fetchProjects({ pageSize: 500 }))
    void dispatch(fetchVendors({ pageSize: 500 }))
  }, [open, dispatch])

  useEffect(() => {
    if (!open || !customerId) {
      setLinkedVendors([])
      return
    }

    const ids = projectIdsForLinkedVendors(customerId, projects, projectId)
    if (ids.length === 0) {
      setLinkedVendors([])
      return
    }

    let cancelled = false
    setLoadingLinkedVendors(true)
    void fetchLinkedVendorsForProjects(ids)
      .then((options) => {
        if (!cancelled) setLinkedVendors(options)
      })
      .catch(() => {
        if (!cancelled) setLinkedVendors([])
      })
      .finally(() => {
        if (!cancelled) setLoadingLinkedVendors(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, customerId, projectId, projects])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'contactType' && value !== 'vendor') {
        next.vendorId = ''
      }
      return next
    })
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    if (key === 'contactType' || key === 'vendorId') {
      setErrors((prev) => ({ ...prev, vendor: undefined }))
    }
  }

  async function handleSave() {
    const nextErrors = validateForm(form, existingCustomerContacts, existingVendorContacts)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      designation: form.designation.trim(),
    }

    try {
      setSaving(true)

      if (form.contactType === 'customer') {
        const result = await dispatch(
          createCustomerContact({
            customerId,
            data: {
              ...payload,
              isPrimary: existingCustomerContacts.length === 0,
            },
          }),
        ).unwrap()
        onSaved?.(result.contact)
      } else {
        await dispatch(
          createVendorContact({
            vendorId: form.vendorId,
            data: {
              ...payload,
              isPrimary: existingVendorContacts.length === 0,
            },
          }),
        ).unwrap()
      }

      showToast({ title: 'Contact person saved', variant: 'success' })
      onClose()
    } catch (err: unknown) {
      const message =
        typeof err === 'string' ? err : 'Failed to save contact person'
      if (message.toLowerCase().includes('mobile')) {
        setErrors((prev) => ({ ...prev, phone: message }))
      } else {
        showToast({ title: message, variant: 'error' })
      }
    } finally {
      setSaving(false)
    }
  }

  const showVendorField = form.contactType === 'vendor'
  const vendorFieldDisabled =
    loadingLinkedVendors || linkedVendors.length === 0 || !customerId

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Add Contact Person</DialogTitle>
      <DialogContent>
        <Box
          display="grid"
          sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1 }}
        >
          <TypographyField
            label="Contact Person Name"
            required
            value={form.name}
            onChange={(v) => setField('name', v)}
            error={errors.name}
            placeholder="Full name"
          />
          <Box>
            <SelectField
              label="Contact Type"
              required
              value={form.contactType}
              onChange={(v) => setField('contactType', v as ProjectContactSource)}
              error={errors.contactType}
              options={CONTACT_TYPE_OPTIONS}
            />
          </Box>
          <TypographyField
            label="Mobile Number"
            required
            value={form.phone}
            onChange={(v) => setField('phone', v)}
            error={errors.phone}
            placeholder="+91 98765 43210"
          />
          <TypographyField
            label="Email Address"
            value={form.email}
            onChange={(v) => setField('email', v)}
            error={errors.email}
            placeholder="name@company.com"
          />
          <Box
            sx={{
              gridColumn: { xs: '1', sm: '1 / -1' },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: showVendorField ? '1fr 1fr' : '1fr' },
              gap: 1.5,
            }}
          >
            <TypographyField
              label="Designation"
              value={form.designation}
              onChange={(v) => setField('designation', v)}
              placeholder="e.g. Managing Director"
            />
            {showVendorField ? (
              <VendorSelectField
                value={form.vendorId}
                options={linkedVendors}
                onChange={(vendorId) => setField('vendorId', vendorId)}
                error={errors.vendor}
                disabled={vendorFieldDisabled}
                loading={loadingLinkedVendors}
              />
            ) : null}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          Save Contact
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

function TypographyField({
  label,
  required,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}) {
  return (
    <Box>
      <Box
        component="span"
        sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}
      >
        {label}
        {required ? (
          <Box component="span" sx={{ color: 'error.main' }}>
            {' '}
            *
          </Box>
        ) : null}
      </Box>
      <TextField
        fullWidth
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        error={Boolean(error)}
        helperText={error}
        sx={{ '& input': { fontSize: 13 } }}
      />
    </Box>
  )
}

function SelectField({
  label,
  required,
  value,
  onChange,
  error,
  options,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  error?: string
  options: { value: string; label: string }[]
}) {
  return (
    <Box>
      <Box
        component="span"
        sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}
      >
        {label}
        {required ? (
          <Box component="span" sx={{ color: 'error.main' }}>
            {' '}
            *
          </Box>
        ) : null}
      </Box>
      <FormControl fullWidth size="small" error={Boolean(error)}>
        <MuiSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          sx={{ fontSize: 13 }}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
              {opt.label}
            </MenuItem>
          ))}
        </MuiSelect>
        {error ? (
          <Box component="span" sx={{ fontSize: 11, color: 'error.main', mt: 0.5 }}>
            {error}
          </Box>
        ) : null}
      </FormControl>
    </Box>
  )
}

function VendorSelectField({
  value,
  options,
  onChange,
  error,
  disabled,
  loading,
}: {
  value: string
  options: LinkedVendorOption[]
  onChange: (vendorId: string) => void
  error?: string
  disabled?: boolean
  loading?: boolean
}) {
  const selected = options.find((opt) => opt.id === value) ?? null

  return (
    <Box>
      <Box
        component="span"
        sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}
      >
        Vendor
        <Box component="span" sx={{ color: 'error.main' }}>
          {' '}
          *
        </Box>
      </Box>
      <Autocomplete
        size="small"
        fullWidth
        disabled={disabled}
        loading={loading}
        options={options}
        value={selected}
        onChange={(_, next) => onChange(next?.id ?? '')}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select Linked Vendor"
            error={Boolean(error)}
            helperText={error}
            sx={FORM_CONTROL_INPUT_SX}
          />
        )}
      />
    </Box>
  )
}
