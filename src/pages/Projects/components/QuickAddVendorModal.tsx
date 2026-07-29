import { useEffect, useState } from 'react'
import { Box, Stack, TextField, Typography } from '@mui/material'
import { Button, Modal, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createVendor } from '@/slices/vendors/thunk'
import type { Vendor } from '@/slices/vendors/reducer'

interface FormState {
  name: string
  contactPerson: string
  phone: string
  email: string
}

const EMPTY_FORM: FormState = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
}

export interface QuickAddVendorModalProps {
  open: boolean
  onClose: () => void
  onCreated: (vendor: Vendor) => void
}

export function QuickAddVendorModal({ open, onClose, onCreated }: QuickAddVendorModalProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.vendors.saving)
  const { showToast } = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
    setErrors({})
  }, [open])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = 'Vendor name is required'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return

    const contactPerson = form.contactPerson.trim()
    const phone = form.phone.trim()
    const email = form.email.trim()
    const contacts =
      contactPerson || phone || email
        ? [
            {
              id: `tmp-${Date.now()}`,
              name: contactPerson || form.name.trim(),
              phone,
              email,
              designation: '',
              isPrimary: true,
            },
          ]
        : []

    try {
      const vendor = await dispatch(
        createVendor({
          name: form.name.trim(),
          gstin: null,
          pan: null,
          gstStatus: 'Unregistered',
          website: null,
          contactPerson: contactPerson || form.name.trim(),
          designation: null,
          phone,
          email,
          city: '',
          state: '',
          address: null,
          pincode: null,
          tags: [],
          paymentTerms: null,
          notes: null,
          status: 'Inactive',
          profileStatus: 'pending',
          rating: null,
          activeProjects: 0,
          totalPayables: 0,
          contacts,
        }),
      ).unwrap()
      showToast({ title: 'Vendor created', variant: 'success' })
      onCreated(vendor)
      onClose()
    } catch {
      showToast({ title: 'Failed to create vendor', variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Vendor"
      size="sm"
      loading={saving}
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
          <Button variant="outlined" color="secondary" size="sm" label="Cancel" onClick={onClose} disabled={saving} />
          <Button
            variant="contained"
            color="primary"
            size="sm"
            label={saving ? 'Saving…' : 'Save Vendor'}
            onClick={() => void handleSave()}
            disabled={saving}
          />
        </Stack>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 12 }}>
        Quickly create a vendor without leaving project setup.
      </Typography>
      <Box
        display="grid"
        sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}
      >
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <FieldLabel label="Vendor Name" required />
          <TextField
            fullWidth
            size="small"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. BuildWell Constructions"
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
        </Box>
        <Box>
          <FieldLabel label="Contact Person" />
          <TextField
            fullWidth
            size="small"
            value={form.contactPerson}
            onChange={(e) => setField('contactPerson', e.target.value)}
            placeholder="Full name"
          />
        </Box>
        <Box>
          <FieldLabel label="Mobile Number" />
          <TextField
            fullWidth
            size="small"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="+91 98765 43210"
          />
        </Box>
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <FieldLabel label="Email ID" />
          <TextField
            fullWidth
            size="small"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="name@company.com"
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
        </Box>
      </Box>
    </Modal>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Box component="span" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
      {label}
      {required ? ' *' : ''}
    </Box>
  )
}
