import { useState, useEffect, useRef } from 'react'
import { Box, Stack, TextField, MenuItem, Autocomplete, Chip as MuiChip, Typography } from '@mui/material'
import { DrawerForm, FormSection, FormField } from '../../components/templates'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createVendor, updateVendor } from '../../slices/vendors/thunk'
import { useToast, Button } from '@/design-system/components'
import type { Vendor } from '../../slices/vendors/reducer'

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
]

const VENDOR_TAGS = [
  'Civil', 'Furniture', 'FF&E', 'Lighting', 'MEP', 'HVAC',
  'Flooring', 'Material', 'Contractor', 'Consultancy', 'Design', 'Electrical',
]

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  type: 'Measurable' | 'Non-measurable' | ''
  gstStatus: 'Registered' | 'Unregistered'
  gstin: string
  pan: string
  contactPerson: string
  designation: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  tags: string[]
  paymentTerms: string
  notes: string
}

const defaultForm: FormState = {
  name: '',
  type: '',
  gstStatus: 'Unregistered',
  gstin: '',
  pan: '',
  contactPerson: '',
  designation: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  tags: [],
  paymentTerms: '',
  notes: '',
}

export interface VendorDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  vendor?: Vendor | null
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.type) errors.type = 'Type is required'
  if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person is required'
  if (!form.phone.trim()) errors.phone = 'Phone is required'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Invalid email format'
  }
  if (!form.city.trim()) errors.city = 'City is required'
  if (!form.state) errors.state = 'State is required'
  if (form.gstStatus === 'Registered') {
    if (!form.gstin.trim()) {
      errors.gstin = 'GSTIN is required for registered vendors'
    } else if (!GSTIN_REGEX.test(form.gstin)) {
      errors.gstin = 'Invalid GSTIN (e.g. 29ABCDE1234F1Z5)'
    }
  }
  return errors
}

// ─── VendorDrawer ─────────────────────────────────────────────────────────────

export function VendorDrawer({ open, onClose, mode, vendor }: VendorDrawerProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.vendors.saving)
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [gstCertFile, setGstCertFile] = useState<File | null>(null)
  const [panDocFile, setPanDocFile] = useState<File | null>(null)
  const gstFileInputRef = useRef<HTMLInputElement>(null)
  const panFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setGstCertFile(null)
      setPanDocFile(null)
      if (vendor && mode === 'edit') {
        setForm({
          name: vendor.name,
          type: vendor.type,
          gstStatus: vendor.gstStatus,
          gstin: vendor.gstin ?? '',
          pan: vendor.pan ?? '',
          contactPerson: vendor.contactPerson,
          designation: vendor.designation ?? '',
          phone: vendor.phone,
          email: vendor.email,
          address: vendor.address ?? '',
          city: vendor.city,
          state: vendor.state,
          pincode: vendor.pincode ?? '',
          tags: vendor.tags,
          paymentTerms: vendor.paymentTerms ?? '',
          notes: vendor.notes ?? '',
        })
      } else {
        setForm(defaultForm)
      }
      setErrors({})
    }
  }, [open, vendor, mode])

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const gstDocument =
      gstCertFile !== null
        ? { name: gstCertFile.name, url: URL.createObjectURL(gstCertFile) }
        : mode === 'edit'
          ? (vendor?.gstDocument ?? null)
          : null

    const panDocument =
      panDocFile !== null
        ? { name: panDocFile.name, url: URL.createObjectURL(panDocFile) }
        : mode === 'edit'
          ? (vendor?.panDocument ?? null)
          : null

    const payload = {
      name: form.name.trim(),
      type: form.type as 'Measurable' | 'Non-measurable',
      gstStatus: form.gstStatus,
      gstin: form.gstStatus === 'Registered' ? form.gstin.trim() : null,
      pan: form.pan.trim() || null,
      gstDocument,
      panDocument,
      contactPerson: form.contactPerson.trim(),
      designation: form.designation.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim() || null,
      city: form.city.trim(),
      state: form.state,
      pincode: form.pincode.trim() || null,
      tags: form.tags,
      paymentTerms: form.paymentTerms || null,
      notes: form.notes.trim() || null,
      status: (vendor?.status ?? 'Active') as 'Active' | 'Inactive',
      activeProjects: vendor?.activeProjects ?? 0,
      totalPayables: vendor?.totalPayables ?? 0,
    }

    try {
      if (mode === 'add') {
        await dispatch(createVendor(payload)).unwrap()
      } else {
        await dispatch(updateVendor({ id: vendor!.id, data: payload })).unwrap()
      }
      showToast({ title: 'Vendor saved', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to save vendor', variant: 'error' })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add Vendor' : 'Edit Vendor'}
      subtitle="Fill in vendor details and compliance information"
      onSubmit={handleSubmit}
      submitLabel={mode === 'add' ? 'Save Vendor' : 'Update Vendor'}
      submitLoading={saving}
    >
      {/* ── Vendor Details ───────────────────────────────────────────── */}
      <FormSection title="Vendor Details" columns={2}>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Vendor Name" required error={errors.name}>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. BuildWell Constructions"
              error={!!errors.name}
            />
          </FormField>
        </Box>

        <FormField label="Vendor Type" required error={errors.type}>
          <TextField
            fullWidth
            size="small"
            select
            value={form.type}
            onChange={(e) => update('type', e.target.value as 'Measurable' | 'Non-measurable')}
            error={!!errors.type}
          >
            <MenuItem value="Measurable">Measurable</MenuItem>
            <MenuItem value="Non-measurable">Non-measurable</MenuItem>
          </TextField>
        </FormField>
      </FormSection>

      {/* ── Tax & Compliance ─────────────────────────────────────────── */}
      <FormSection title="Tax & Compliance" columns={2}>
        <FormField label="GST Status">
          <TextField
            fullWidth
            size="small"
            select
            value={form.gstStatus}
            onChange={(e) => {
              const val = e.target.value as 'Registered' | 'Unregistered'
              update('gstStatus', val)
              if (val === 'Unregistered') update('gstin', '')
            }}
          >
            <MenuItem value="Registered">Registered</MenuItem>
            <MenuItem value="Unregistered">Unregistered</MenuItem>
          </TextField>
        </FormField>

        <FormField
          label="GSTIN"
          required={form.gstStatus === 'Registered'}
          hint="15-digit GST number"
          error={errors.gstin}
        >
          <TextField
            fullWidth
            size="small"
            value={form.gstin}
            onChange={(e) => update('gstin', e.target.value.toUpperCase())}
            placeholder="29ABCDE1234F1Z5"
            disabled={form.gstStatus === 'Unregistered'}
            error={!!errors.gstin}
          />
        </FormField>

        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Upload GST Certificate" hint="PDF or image (optional)">
            <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
              <input
                ref={gstFileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setGstCertFile(file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                size="sm"
                onClick={() => gstFileInputRef.current?.click()}
              >
                {gstCertFile || (mode === 'edit' && vendor?.gstDocument) ? 'Replace' : 'Upload'}
              </Button>
              {(gstCertFile?.name ?? (mode === 'edit' ? vendor?.gstDocument?.name : undefined)) && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  {gstCertFile?.name ?? vendor?.gstDocument?.name}
                </Typography>
              )}
            </Stack>
          </FormField>
        </Box>

        <FormField label="PAN Number" hint="10-character PAN">
          <TextField
            fullWidth
            size="small"
            value={form.pan}
            onChange={(e) => update('pan', e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
          />
        </FormField>

        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Upload PAN Document" hint="PDF or image (optional)">
            <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
              <input
                ref={panFileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPanDocFile(file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                size="sm"
                onClick={() => panFileInputRef.current?.click()}
              >
                {panDocFile || (mode === 'edit' && vendor?.panDocument) ? 'Replace' : 'Upload'}
              </Button>
              {(panDocFile?.name ?? (mode === 'edit' ? vendor?.panDocument?.name : undefined)) && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  {panDocFile?.name ?? vendor?.panDocument?.name}
                </Typography>
              )}
            </Stack>
          </FormField>
        </Box>
      </FormSection>

      {/* ── Contact Details ──────────────────────────────────────────── */}
      <FormSection title="Contact Details" columns={2}>
        <FormField label="Contact Person" required error={errors.contactPerson}>
          <TextField
            fullWidth
            size="small"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="Full name"
            error={!!errors.contactPerson}
          />
        </FormField>

        <FormField label="Designation">
          <TextField
            fullWidth
            size="small"
            value={form.designation}
            onChange={(e) => update('designation', e.target.value)}
            placeholder="e.g. Managing Director"
          />
        </FormField>

        <FormField label="Phone" required error={errors.phone}>
          <TextField
            fullWidth
            size="small"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+91 98765 43210"
            error={!!errors.phone}
          />
        </FormField>

        <FormField label="Email" required error={errors.email}>
          <TextField
            fullWidth
            size="small"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="name@company.com"
            error={!!errors.email}
          />
        </FormField>
      </FormSection>

      {/* ── Address ─────────────────────────────────────────────────── */}
      <FormSection title="Address" columns={2}>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Address">
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Building, Street"
            />
          </FormField>
        </Box>

        <FormField label="City" required error={errors.city}>
          <TextField
            fullWidth
            size="small"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="City"
            error={!!errors.city}
          />
        </FormField>

        <FormField label="State" required error={errors.state}>
          <TextField
            fullWidth
            size="small"
            select
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            error={!!errors.state}
          >
            {INDIAN_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </FormField>

        <FormField label="Pincode">
          <TextField
            fullWidth
            size="small"
            value={form.pincode}
            onChange={(e) => update('pincode', e.target.value)}
            placeholder="560001"
          />
        </FormField>
      </FormSection>

      {/* ── Vendor Profile ───────────────────────────────────────────── */}
      <FormSection title="Vendor Profile" columns={2}>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Specialization Tags">
            <Autocomplete
              multiple
              freeSolo
              options={VENDOR_TAGS}
              value={form.tags}
              onChange={(_, newValue) => update('tags', newValue as string[])}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <MuiChip
                    variant="outlined"
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={form.tags.length === 0 ? 'e.g. Civil, Furniture, MEP' : ''}
                />
              )}
            />
          </FormField>
        </Box>

        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Notes">
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Internal notes about this vendor"
            />
          </FormField>
        </Box>
      </FormSection>
    </DrawerForm>
  )
}
