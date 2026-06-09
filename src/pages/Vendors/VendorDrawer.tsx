import { useState, useEffect, useRef } from 'react'
import { Box, Stack, TextField, MenuItem, Autocomplete, Chip as MuiChip, Typography } from '@mui/material'
import { DrawerForm, FormSection, FormField } from '../../components/templates'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createVendor, updateVendor } from '../../slices/vendors/thunk'
import { useToast, Button, DatePicker } from '@/design-system/components'
import type { Vendor } from '../../slices/vendors/reducer'
import { buildVendorComplianceSnapshot } from '../../utils/vendorCompliance'

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

const COMPLIANCE_ACCEPT = '.pdf,application/pdf,image/*'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  website: string
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
  website: '',
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

function fileToDoc(file: File): { name: string; url: string } {
  return { name: file.name, url: URL.createObjectURL(file) }
}

function toIsoDate(d: Date | null): string | null {
  if (!d) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function parseIsoDate(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
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

interface CompactComplianceDocRowProps {
  label: string
  file: File | null
  existing?: { name: string; url: string } | null
  onFileSelect: (file: File | null) => void
}

function CompactComplianceDocRow({
  label,
  file,
  existing,
  onFileSelect,
}: CompactComplianceDocRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displayName = file?.name ?? existing?.name ?? null
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setFileBlobUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setFileBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const viewUrl = file ? fileBlobUrl : (existing?.url ?? null)

  function openDocument() {
    if (!viewUrl) return
    window.open(viewUrl, '_blank', 'noopener,noreferrer')
  }

  function downloadDocument() {
    if (!viewUrl || !displayName) return
    const a = document.createElement('a')
    a.href = viewUrl
    a.download = displayName
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <FormField label={label}>
      <input
        ref={inputRef}
        type="file"
        accept={COMPLIANCE_ACCEPT}
        hidden
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null
          onFileSelect(picked)
          e.target.value = ''
        }}
      />
      {!displayName ? (
        <Button
          type="button"
          variant="outlined"
          color="secondary"
          size="sm"
          label="Upload"
          onClick={() => inputRef.current?.click()}
        />
      ) : (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{ minHeight: 28 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: 12,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
          <Stack direction="row" gap={0.25} flexShrink={0}>
            <Button
              type="button"
              variant="text"
              color="primary"
              size="sm"
              label="View"
              onClick={openDocument}
            />
            <Button
              type="button"
              variant="text"
              color="primary"
              size="sm"
              label="Download"
              onClick={downloadDocument}
            />
            <Button
              type="button"
              variant="text"
              color="secondary"
              size="sm"
              label="Replace"
              onClick={() => inputRef.current?.click()}
            />
          </Stack>
        </Stack>
      )}
    </FormField>
  )
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
  const [bankChequeFile, setBankChequeFile] = useState<File | null>(null)
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | null>(null)

  useEffect(() => {
    if (open) {
      setGstCertFile(null)
      setPanDocFile(null)
      setBankChequeFile(null)
      setInsuranceFile(null)
      if (vendor && mode === 'edit') {
        setForm({
          name: vendor.name,
          website: vendor.website ?? '',
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
        setInsuranceExpiry(parseIsoDate(vendor.compliance?.insurance?.expiryDate))
      } else {
        setForm(defaultForm)
        setInsuranceExpiry(null)
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
        ? fileToDoc(gstCertFile)
        : mode === 'edit'
          ? (vendor?.gstDocument ?? null)
          : null

    const panDocument =
      panDocFile !== null
        ? fileToDoc(panDocFile)
        : mode === 'edit'
          ? (vendor?.panDocument ?? null)
          : null

    const bankChequeDocument =
      bankChequeFile !== null
        ? fileToDoc(bankChequeFile)
        : mode === 'edit'
          ? (vendor?.bankChequeDocument ?? null)
          : null

    const insuranceDocument =
      insuranceFile !== null
        ? fileToDoc(insuranceFile)
        : mode === 'edit'
          ? (vendor?.insuranceDocument ?? null)
          : null

    const insuranceExpiryIso = toIsoDate(insuranceExpiry)

    const compliance = buildVendorComplianceSnapshot(
      {
        gstDocument,
        panDocument,
        bankChequeDocument,
        insuranceDocument,
        gstin: form.gstStatus === 'Registered' ? form.gstin.trim() : null,
        pan: form.pan.trim() || null,
        gstStatus: form.gstStatus,
      },
      insuranceExpiryIso,
    )

    const payload = {
      name: form.name.trim(),
      website: form.website.trim() || null,
      gstStatus: form.gstStatus,
      gstin: form.gstStatus === 'Registered' ? form.gstin.trim() : null,
      pan: form.pan.trim() || null,
      gstDocument,
      panDocument,
      bankChequeDocument,
      insuranceDocument,
      compliance,
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
      <FormSection title="Vendor Details" columns={2} divider={false}>
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
        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField label="Website" hint="Company site (https optional)">
            <TextField
              fullWidth
              size="small"
              type="url"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://example.com"
            />
          </FormField>
        </Box>
      </FormSection>

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

        <FormField label="PAN Number" hint="10-character PAN">
          <TextField
            fullWidth
            size="small"
            value={form.pan}
            onChange={(e) => update('pan', e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
          />
        </FormField>
      </FormSection>

      <FormSection title="Compliance Documents" columns={2}>
        <CompactComplianceDocRow
          label="GST Certificate"
          file={gstCertFile}
          existing={mode === 'edit' ? vendor?.gstDocument : null}
          onFileSelect={setGstCertFile}
        />
        <CompactComplianceDocRow
          label="PAN Card"
          file={panDocFile}
          existing={mode === 'edit' ? vendor?.panDocument : null}
          onFileSelect={setPanDocFile}
        />
        <CompactComplianceDocRow
          label="Cancelled Cheque"
          file={bankChequeFile}
          existing={mode === 'edit' ? vendor?.bankChequeDocument : null}
          onFileSelect={setBankChequeFile}
        />
        <CompactComplianceDocRow
          label="Insurance Document"
          file={insuranceFile}
          existing={mode === 'edit' ? vendor?.insuranceDocument : null}
          onFileSelect={setInsuranceFile}
        />

        <Box sx={{ gridColumn: 'span 2' }}>
          <FormField
            label="Insurance Expiry Date"
            hint="Track insurance expiry when a policy is uploaded"
          >
            <DatePicker value={insuranceExpiry} onChange={setInsuranceExpiry} fullWidth size="sm" />
          </FormField>
        </Box>
      </FormSection>

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
