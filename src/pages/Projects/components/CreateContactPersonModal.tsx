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
import { useAppDispatch } from '@/store/hooks'
import { createCustomerContact } from '@/slices/customers/thunk'
import { createVendorContact } from '@/slices/vendors/thunk'
import type { Contact } from '@/slices/customers/reducer'
import type { Vendor } from '@/slices/vendors/reducer'
import { useToast } from '@/design-system/components'
import { getVendorContactsList } from '@/utils/vendorContacts'
import {
  contactPhoneExists,
  type ProjectContactOption,
  type ProjectContactSource,
} from '../projectCreateHelpers'

interface CreateContactPersonModalProps {
  open: boolean
  onClose: () => void
  customerId: string
  customerName: string
  vendors: Vendor[]
  existingCustomerContacts: Contact[]
  onSaved: (contact: ProjectContactOption) => void
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
  vendorId?: string
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
  vendors: Vendor[],
): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Contact person name is required'
  if (!form.contactType) errors.contactType = 'Contact type is required'

  const existingContacts =
    form.contactType === 'vendor'
      ? (() => {
          const vendor = vendors.find((v) => v.id === form.vendorId)
          return vendor ? normalizeContacts(getVendorContactsList(vendor)) : []
        })()
      : existingCustomerContacts

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

  if (form.contactType === 'vendor' && !form.vendorId) {
    errors.vendorId = 'Please select a vendor'
  }

  return errors
}

function normalizeContacts(contacts: Contact[] | undefined): Contact[] {
  return contacts ?? []
}

export function CreateContactPersonModal({
  open,
  onClose,
  customerId,
  customerName,
  vendors,
  existingCustomerContacts,
  onSaved,
}: CreateContactPersonModalProps) {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === form.vendorId) ?? null,
    [vendors, form.vendorId],
  )

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setErrors({})
      setSaving(false)
    }
  }, [open])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  async function handleSave() {
    const nextErrors = validateForm(form, existingCustomerContacts, vendors)
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
        onSaved({
          ...result.contact,
          sourceType: 'customer',
          entityId: customerId,
          entityName: customerName,
        })
      } else {
        const vendor = selectedVendor
        if (!vendor) return

        const vendorContacts = normalizeContacts(getVendorContactsList(vendor))
        const result = await dispatch(
          createVendorContact({
            vendorId: vendor.id,
            data: {
              ...payload,
              isPrimary: vendorContacts.length === 0,
            },
          }),
        ).unwrap()
        onSaved({
          ...result.contact,
          sourceType: 'vendor',
          entityId: vendor.id,
          entityName: vendor.name,
        })
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Add Contact Person</DialogTitle>
      <DialogContent>
        <Box
          display="grid"
          sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 1 }}
        >
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <TypographyField
              label="Contact Person Name"
              required
              value={form.name}
              onChange={(v) => setField('name', v)}
              error={errors.name}
              placeholder="Full name"
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
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <TypographyField
              label="Designation"
              value={form.designation}
              onChange={(v) => setField('designation', v)}
              placeholder="e.g. Managing Director"
            />
          </Box>
          <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
            <SelectField
              label="Contact Type"
              required
              value={form.contactType}
              onChange={(v) => {
                setField('contactType', v as ProjectContactSource)
                if (v === 'customer') {
                  setField('vendorId', '')
                }
              }}
              error={errors.contactType}
              options={CONTACT_TYPE_OPTIONS}
            />
          </Box>
          {form.contactType === 'vendor' ? (
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
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
                fullWidth
                size="small"
                options={vendors}
                getOptionLabel={(v) => v.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={selectedVendor}
                onChange={(_, val) => setField('vendorId', val?.id ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search vendors…"
                    error={Boolean(errors.vendorId)}
                    helperText={errors.vendorId}
                    sx={{ '& input': { fontSize: 13 } }}
                  />
                )}
              />
            </Box>
          ) : null}
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
