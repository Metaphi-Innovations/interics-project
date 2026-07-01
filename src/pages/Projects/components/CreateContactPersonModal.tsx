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
import { createPendingVendor, fetchVendors } from '@/slices/vendors/thunk'
import type { Contact } from '@/slices/customers/reducer'
import { useToast } from '@/design-system/components'
import { getVendorContactsList } from '@/utils/vendorContacts'
import { isActiveVendorContact } from '@/utils/vendorProfileStatus'
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

interface VendorOption {
  id: string
  label: string
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
  existingVendorPhones: string[],
): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Contact person name is required'
  if (!form.contactType) errors.contactType = 'Contact type is required'

  if (form.contactType === 'vendor' && !form.vendorId.trim()) {
    errors.vendor = 'Vendor is required.'
  }

  const trimmedPhone = form.phone.trim()
  if (!trimmedPhone) {
    errors.phone = 'Mobile number is required'
  } else if (form.contactType === 'vendor') {
    if (
      existingVendorPhones.some((p) => p === trimmedPhone) ||
      contactPhoneExists(existingVendorContacts, trimmedPhone)
    ) {
      errors.phone = 'A contact with this mobile number already exists'
    }
  } else if (contactPhoneExists(existingCustomerContacts, trimmedPhone)) {
    errors.phone = 'A contact with this mobile number already exists for this customer'
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
  projectId: _projectId,
  existingCustomerContacts,
  onSaved,
}: CreateContactPersonModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const vendors = useAppSelector((s) => s.vendors.items ?? [])
  const vendorsLoading = useAppSelector((s) => s.vendors.loading)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const activeVendorOptions = useMemo<VendorOption[]>(
    () =>
      vendors
        .filter((v) => v.status === 'Active' && isActiveVendorContact(v))
        .map((v) => ({ id: v.id, label: v.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [vendors],
  )

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === form.vendorId) ?? null,
    [vendors, form.vendorId],
  )

  const existingVendorContacts = useMemo(
    () => (selectedVendor ? getVendorContactsList(selectedVendor) : []),
    [selectedVendor],
  )

  const existingVendorPhones = useMemo(
    () => vendors.map((v) => v.phone.trim()).filter(Boolean),
    [vendors],
  )

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setErrors({})
      setSaving(false)
      return
    }

    void dispatch(
      fetchVendors({
        pageSize: 500,
        status: 'Active',
        profileStatus: 'complete',
      }),
    )
  }, [open, dispatch])

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
    const nextErrors = validateForm(
      form,
      existingCustomerContacts,
      existingVendorContacts,
      existingVendorPhones,
    )
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
        const vendor = selectedVendor
        if (!vendor) {
          setErrors((prev) => ({ ...prev, vendor: 'Vendor is required.' }))
          return
        }

        await dispatch(
          createPendingVendor({
            vendorId: vendor.id,
            vendorName: vendor.name,
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            designation: payload.designation,
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
                options={activeVendorOptions}
                onChange={(vendorId) => setField('vendorId', vendorId)}
                error={errors.vendor}
                loading={vendorsLoading}
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
  loading,
}: {
  value: string
  options: VendorOption[]
  onChange: (vendorId: string) => void
  error?: string
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
        loading={loading}
        options={options}
        value={selected}
        onChange={(_, next) => onChange(next?.id ?? '')}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select Vendor"
            error={Boolean(error)}
            helperText={error}
            sx={FORM_CONTROL_INPUT_SX}
          />
        )}
      />
    </Box>
  )
}
