import { useState, useEffect, useRef } from 'react'
import { Box, Stack, TextField, MenuItem, Typography } from '@mui/material'
import { DrawerForm, FormSection, FormField } from '../../components/templates'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createCustomer, updateCustomer } from '../../slices/customers/thunk'
import { useToast, Button } from '@/design-system/components'
import type { Customer } from '../../slices/customers/reducer'
import { fetchSectors } from '../../slices/settings/thunk'

type GstStatus = Customer['gstStatus']

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

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

function gstinRequired(status: GstStatus): boolean {
  return status !== 'Unregistered'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  type: 'Company' | 'Individual' | ''
  sector: string
  gstStatus: GstStatus
  gstin: string
  pan: string
  contactPerson: string
  designation: string
  phone: string
  email: string
  city: string
  state: string
  address: string
  pincode: string
  tags: string[]
  notes: string
}

const defaultForm: FormState = {
  name: '',
  type: '',
  sector: '',
  gstStatus: 'Unregistered',
  gstin: '',
  pan: '',
  contactPerson: '',
  designation: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  address: '',
  pincode: '',
  tags: [],
  notes: '',
}

export interface CustomerDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  customer?: Customer | null
  onSuccess?: (customer: Customer) => void
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.sector) errors.sector = 'Sector is required'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Invalid email format'
  }
  if (!form.city.trim()) errors.city = 'City is required'
  if (!form.state) errors.state = 'State is required'
  if (gstinRequired(form.gstStatus)) {
    if (!form.gstin.trim()) {
      errors.gstin = 'GSTIN is required for this GST status'
    } else if (!GSTIN_REGEX.test(form.gstin)) {
      errors.gstin = 'Invalid GSTIN (e.g. 29ABCDE1234F1Z5)'
    }
  }
  return errors
}

// ─── CustomerDrawer ───────────────────────────────────────────────────────────

export function CustomerDrawer({ open, onClose, mode, customer, onSuccess }: CustomerDrawerProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.customers.saving)
  const sectors = useAppSelector((s) => s.settings.sectors)
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [gstCertFile, setGstCertFile] = useState<File | null>(null)
  const [panDocFile, setPanDocFile] = useState<File | null>(null)
  const gstFileInputRef = useRef<HTMLInputElement>(null)
  const panFileInputRef = useRef<HTMLInputElement>(null)

  const activeSectors = sectors.filter((s) => s.status === 'active')

  useEffect(() => {
    if (open) {
      dispatch(fetchSectors())
    }
  }, [open, dispatch])

  useEffect(() => {
    if (open) {
      setGstCertFile(null)
      setPanDocFile(null)
      if (customer && mode === 'edit') {
        setForm({
          name: customer.name,
          type: customer.type,
          sector: customer.sector ?? '',
          gstStatus: customer.gstStatus,
          gstin: customer.gstin ?? '',
          pan: customer.pan ?? '',
          contactPerson: customer.contactPerson,
          designation: customer.designation ?? '',
          phone: customer.phone,
          email: customer.email,
          city: customer.city,
          state: customer.state,
          address: customer.address ?? '',
          pincode: customer.pincode ?? '',
          tags: customer.tags,
          notes: customer.notes ?? '',
        })
      } else {
        setForm(defaultForm)
      }
      setErrors({})
    }
  }, [open, customer, mode])

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
          ? (customer?.gstDocument ?? null)
          : null

    const panDocument =
      panDocFile !== null
        ? { name: panDocFile.name, url: URL.createObjectURL(panDocFile) }
        : mode === 'edit'
          ? (customer?.panDocument ?? null)
          : null

    const payload = {
      name: form.name.trim(),
      type: form.type as 'Company' | 'Individual',
      sector: form.sector,
      gstStatus: form.gstStatus,
      gstin: gstinRequired(form.gstStatus) ? form.gstin.trim() : null,
      pan: form.pan.trim() || null,
      gstDocument,
      panDocument,
      contactPerson: form.contactPerson.trim(),
      designation: form.designation.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      state: form.state,
      address: form.address.trim() || null,
      pincode: form.pincode.trim() || null,
      tags: form.tags,
      notes: form.notes.trim() || null,
      status: (customer?.status ?? 'Active') as 'Active' | 'Inactive',
      activeProjects: customer?.activeProjects ?? 0,
      totalReceivables: customer?.totalReceivables ?? 0,
    }

    try {
      if (mode === 'add') {
        const result = await dispatch(createCustomer(payload)).unwrap()
        showToast({ title: 'Customer saved', variant: 'success' })
        onClose()
        onSuccess?.(result)
        return
      } else {
        await dispatch(updateCustomer({ id: customer!.id, data: payload })).unwrap()
      }
      showToast({ title: 'Customer saved', variant: 'success' })
      onClose()
    } catch {
      showToast({ title: 'Failed to save customer', variant: 'error' })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add Customer' : 'Edit Customer'}
      subtitle={
        mode === 'add'
          ? 'Fill in the details to create a new customer'
          : 'Update customer information'
      }
      onSubmit={handleSubmit}
      submitLabel={mode === 'add' ? 'Save Customer' : 'Update Customer'}
      submitLoading={saving}
    >
      {/* ── Business Details ─────────────────────────────────────────── */}
      <FormSection title="Business Details" columns={2}>
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Customer Name" required error={errors.name}>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Acme Corp"
              error={!!errors.name}
            />
          </FormField>
        </Box>

        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Sector" required error={errors.sector}>
            <TextField
              fullWidth
              size="small"
              select
              value={form.sector}
              onChange={(e) => update('sector', e.target.value)}
              error={!!errors.sector}
            >
              <MenuItem value="" disabled>
                Select sector…
              </MenuItem>
              {activeSectors.map((s) => (
                <MenuItem key={s.id} value={s.name}>
                  {s.name}
                </MenuItem>
              ))}
              {form.sector && !activeSectors.some((s) => s.name === form.sector) ? (
                <MenuItem value={form.sector}>{form.sector}</MenuItem>
              ) : null}
            </TextField>
          </FormField>
        </Box>
      </FormSection>

      {/* ── Tax & Compliance ────────────────────────────────────────── */}
      <FormSection title="Tax & Compliance" columns={2}>
        <FormField label="GST Status">
          <TextField
            fullWidth
            size="small"
            select
            value={form.gstStatus}
            onChange={(e) => {
              const val = e.target.value as GstStatus
              update('gstStatus', val)
              if (val === 'Unregistered') update('gstin', '')
            }}
          >
            <MenuItem value="Registered">Registered</MenuItem>
            <MenuItem value="Unregistered">Unregistered</MenuItem>
            <MenuItem value="Composition">Composition</MenuItem>
            <MenuItem value="SEZ">SEZ</MenuItem>
          </TextField>
        </FormField>

        <FormField
          label="GSTIN"
          required={gstinRequired(form.gstStatus)}
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
                {gstCertFile || (mode === 'edit' && customer?.gstDocument) ? 'Replace' : 'Upload'}
              </Button>
              {(gstCertFile?.name ?? (mode === 'edit' ? customer?.gstDocument?.name : undefined)) && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  {gstCertFile?.name ?? customer?.gstDocument?.name}
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
                {panDocFile || (mode === 'edit' && customer?.panDocument) ? 'Replace' : 'Upload'}
              </Button>
              {(panDocFile?.name ?? (mode === 'edit' ? customer?.panDocument?.name : undefined)) && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  {panDocFile?.name ?? customer?.panDocument?.name}
                </Typography>
              )}
            </Stack>
          </FormField>
        </Box>
      </FormSection>

      {/* ── Primary Contact ──────────────────────────────────────────── */}
      <FormSection title="Primary Contact" columns={2}>
        <FormField label="Contact Person">
          <TextField
            fullWidth
            size="small"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="Full name"
          />
        </FormField>

        <FormField label="Designation">
          <TextField
            fullWidth
            size="small"
            value={form.designation}
            onChange={(e) => update('designation', e.target.value)}
            placeholder="e.g. Director"
          />
        </FormField>

        <FormField label="Phone">
          <TextField
            fullWidth
            size="small"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+91 98765 43210"
          />
        </FormField>

        <FormField label="Email" error={errors.email}>
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

      {/* ── Additional ──────────────────────────────────────────────── */}
      <FormSection title="Additional" columns={1}>
        <FormField label="Notes">
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Internal notes about this customer"
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}
