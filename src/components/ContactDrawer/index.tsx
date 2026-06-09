import { useState, useEffect } from 'react'
import { Box, Stack, FormControlLabel, Switch } from '@mui/material'
import { DrawerForm, FormSection, FormField } from '../templates'
import { Input } from '@/design-system/components'
import type { Contact } from '../../slices/customers/reducer'

interface ContactDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  contact?: Contact | null
  onSave: (contact: Omit<Contact, 'id'> & { id?: string }) => void
}

interface FormState {
  name: string
  designation: string
  phone: string
  email: string
  isPrimary: boolean
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
}

const empty: FormState = {
  name: '',
  designation: '',
  phone: '',
  email: '',
  isPrimary: false,
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Full name is required'
  if (!form.phone.trim()) errors.phone = 'Phone number is required'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  }
  return errors
}

export function ContactDrawer({ open, onClose, mode, contact, onSave }: ContactDrawerProps) {
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && contact) {
        setForm({
          name: contact.name,
          designation: contact.designation,
          phone: contact.phone,
          email: contact.email,
          isPrimary: contact.isPrimary,
        })
      } else {
        setForm(empty)
      }
      setErrors({})
    }
  }, [open, mode, contact])

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [field]: undefined }))
    }
  }

  function handleSubmit() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    const payload: Omit<Contact, 'id'> & { id?: string } = {
      name: form.name.trim(),
      designation: form.designation.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      isPrimary: form.isPrimary,
    }
    if (mode === 'edit' && contact) {
      payload.id = contact.id
    }
    onSave(payload)
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add Contact' : 'Edit Contact'}
      subtitle={mode === 'add' ? 'Add a new contact person for this record' : 'Update contact details'}
      onSubmit={handleSubmit}
      submitLabel={mode === 'add' ? 'Add Contact' : 'Save Changes'}
      width={440}
    >
      <FormSection title="Contact Details" divider={false}>
        <FormField label="Full Name" required error={errors.name}>
          <Input
            placeholder="e.g. Rajesh Kumar"
            value={form.name}
            onChange={(v) => set('name', v)}
            error={!!errors.name}
            size="sm"
          />
        </FormField>

        <FormField label="Designation / Title">
          <Input
            placeholder="e.g. Managing Director"
            value={form.designation}
            onChange={(v) => set('designation', v)}
            size="sm"
          />
        </FormField>

        <FormField label="Phone" required error={errors.phone}>
          <Input
            placeholder="+91 9876543210"
            value={form.phone}
            onChange={(v) => set('phone', v)}
            error={!!errors.phone}
            size="sm"
          />
        </FormField>

        <FormField label="Email" required error={errors.email}>
          <Input
            placeholder="name@company.com"
            value={form.email}
            onChange={(v) => set('email', v)}
            error={!!errors.email}
            size="sm"
          />
        </FormField>
      </FormSection>

      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Box>
            <Box sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
              Set as Primary Contact
            </Box>
            <Box sx={{ fontSize: 11, color: 'text.secondary', mt: '2px' }}>
              Shown on Overview and the Customers listing
            </Box>
          </Box>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={form.isPrimary}
                onChange={(e) => set('isPrimary', e.target.checked)}
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Stack>
      </Box>
    </DrawerForm>
  )
}
