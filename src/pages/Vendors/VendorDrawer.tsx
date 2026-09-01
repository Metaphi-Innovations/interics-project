import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  Autocomplete,
  Chip as MuiChip,
  Typography,
  CircularProgress,
} from '@mui/material'
import { DrawerForm, FormSection, FormField } from '../../components/templates'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createVendor, updateVendor, createVendorContact, updateVendorContact } from '../../slices/vendors/thunk'
import { useToast, Button } from '@/design-system/components'
import { validateVendorForm, vendorsService } from '@/modules/vendors'
import {
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { clearFieldError } from '@/modules/system-settings/shared/api-errors'
import { INDIAN_STATES, digitsOnly } from '@/constants/locations'
import { lookupPincodeLocation } from '@/utils/pincodeLookup'
import { extractIndianMobileDigits, sanitizeMobileInput } from '@/utils/mobile'
import type { Vendor } from '../../slices/vendors/reducer'

// ─── Constants ────────────────────────────────────────────────────────────────

const VENDOR_TAGS = [
  'Civil', 'Furniture', 'FF&E', 'Lighting', 'MEP', 'HVAC',
  'Flooring', 'Material', 'Contractor', 'Consultancy', 'Design', 'Electrical',
]

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

export interface VendorDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  vendor?: Vendor | null
  onCompleted?: () => void
}

// ─── VendorDrawer ─────────────────────────────────────────────────────────────

export function VendorDrawer({ open, onClose, mode, vendor, onCompleted }: VendorDrawerProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.vendors.saving)
  const existingVendors = useAppSelector((s) => s.vendors.items ?? [])
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [gstCertFile, setGstCertFile] = useState<File | null>(null)
  const [panDocFile, setPanDocFile] = useState<File | null>(null)
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false)
  const gstFileInputRef = useRef<HTMLInputElement>(null)
  const panFileInputRef = useRef<HTMLInputElement>(null)
  const pincodeLookupSeq = useRef(0)

  useEffect(() => {
    if (open) {
      setGstCertFile(null)
      setPanDocFile(null)
      setPincodeLookupLoading(false)
      pincodeLookupSeq.current += 1
      if (vendor && mode === 'edit') {
        setForm({
          name: vendor.name,
          website: vendor.website ?? '',
          gstStatus: vendor.gstStatus,
          gstin: vendor.gstin ?? '',
          pan: vendor.pan ?? '',
          contactPerson: vendor.contactPerson ?? '',
          designation: vendor.designation ?? '',
          phone: extractIndianMobileDigits(vendor.phone),
          email: vendor.email ?? '',
          address: vendor.address ?? '',
          city: vendor.city === 'Unknown' ? '' : vendor.city,
          state: vendor.state === 'Unknown' ? '' : vendor.state,
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
    setErrors((errs) => clearFieldError(errs, field))
  }

  async function resolvePincode(pin: string) {
    const seq = ++pincodeLookupSeq.current
    setPincodeLookupLoading(true)
    setErrors((errs) =>
      clearFieldError(clearFieldError(clearFieldError(errs, 'pincode'), 'city'), 'state'),
    )
    try {
      const location = await lookupPincodeLocation(pin)
      if (seq !== pincodeLookupSeq.current) return
      setForm((f) => ({
        ...f,
        pincode: location.pincode,
        city: location.city,
        state: location.state,
      }))
    } catch {
      if (seq !== pincodeLookupSeq.current) return
      setErrors((errs) => ({
        ...errs,
        pincode: 'Could not resolve city/state for this pincode',
      }))
    } finally {
      if (seq === pincodeLookupSeq.current) {
        setPincodeLookupLoading(false)
      }
    }
  }

  function handlePincodeChange(raw: string) {
    const pin = digitsOnly(raw).slice(0, 6)
    update('pincode', pin)
    if (pin.length < 6) {
      pincodeLookupSeq.current += 1
      setPincodeLookupLoading(false)
      return
    }
    void resolvePincode(pin)
  }

  async function handleSubmit() {
    const wasPending = vendor?.profileStatus === 'pending'

    const payload = {
      name: form.name.trim(),
      website: form.website.trim() || null,
      gstStatus: form.gstStatus,
      gstin: form.gstin.trim() || null,
      pan: form.pan.trim() || null,
      contactPerson: form.contactPerson.trim(),
      designation: form.designation.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim() || null,
      tags: form.tags,
      notes: form.notes.trim() || null,
      gstCertificateFile: gstCertFile,
      panCardFile: panDocFile,
    }

    const errs = validateVendorForm(payload, {
      existingVendors,
      excludeId: mode === 'edit' ? vendor?.id : undefined,
    })
    setErrors(errs)
    if (hasErrors(errs)) {
      showToast({
        title: firstErrorMessage(errs, 'Please fix the highlighted fields'),
        variant: 'error',
      })
      return
    }

    try {
      if (mode === 'add') {
        await dispatch(createVendor(payload)).unwrap()
        showToast({ title: 'Vendor saved', variant: 'success' })
        onCompleted?.()
      } else {
        await dispatch(updateVendor({ id: vendor!.id, data: payload })).unwrap()

        // Sync primary contact via contact API (with id) so edit doesn't create duplicates.
        const contactName = form.contactPerson.trim()
        const contactPhone = form.phone.trim()
        const contactEmail = form.email.trim()
        const contactDesignation = form.designation.trim()
        const hasContactDetails = Boolean(contactName && contactPhone && contactEmail)

        if (hasContactDetails) {
          let existingContacts = vendor!.contacts ?? []
          // List rows often omit contacts[]; load detail so we update by id instead of duplicating.
          if (!existingContacts.length) {
            try {
              const full = await vendorsService.getById(vendor!.id)
              existingContacts = full.contacts ?? []
            } catch {
              existingContacts = []
            }
          }

          const primary =
            existingContacts.find((c) => c.isPrimary) ?? existingContacts[0] ?? null
          const primaryId = primary?.id?.trim() ?? ''
          const canUpdateExisting =
            Boolean(primaryId) &&
            !primaryId.startsWith('vc-local-') &&
            !primaryId.startsWith('pending-')

          if (canUpdateExisting) {
            await dispatch(
              updateVendorContact({
                vendorId: vendor!.id,
                contactId: primaryId,
                data: {
                  name: contactName,
                  phone: contactPhone,
                  email: contactEmail,
                  designation: contactDesignation || undefined,
                  isPrimary: true,
                },
              }),
            ).unwrap()
          } else {
            await dispatch(
              createVendorContact({
                vendorId: vendor!.id,
                data: {
                  name: contactName,
                  phone: contactPhone,
                  email: contactEmail,
                  designation: contactDesignation,
                  isPrimary: true,
                },
              }),
            ).unwrap()
          }
        }

        if (wasPending) {
          showToast({ title: 'Vendor contact updated successfully.', variant: 'success' })
          onCompleted?.()
        } else {
          showToast({ title: 'Vendor saved', variant: 'success' })
        }
      }
      onClose()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Failed to save vendor'
      showToast({ title: message, variant: 'error' })
    }
  }

  const completingPending = mode === 'edit' && vendor?.profileStatus === 'pending'

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add Vendor' : completingPending ? 'Update Vendor' : 'Edit Vendor'}
      subtitle={
        mode === 'add' || completingPending
          ? 'Complete the remaining vendor details'
          : 'Fill in vendor details and tax information'
      }
      onSubmit={handleSubmit}
      submitLabel={mode === 'add' ? 'Save' : 'Update Vendor'}
      cancelLabel="Cancel"
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
        <FormField label="Contact Person" error={errors.contactPerson}>
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

        <FormField label="Phone" error={errors.phone} hint="10-digit mobile starting with 6–9">
          <TextField
            fullWidth
            size="small"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', sanitizeMobileInput(e.target.value))}
            placeholder="9876543210"
            inputProps={{ inputMode: 'numeric', maxLength: 10 }}
            error={!!errors.phone}
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

      <FormSection title="Billing Address" columns={2}>
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

        <FormField
          label="Pincode"
          error={errors.pincode}
          hint={pincodeLookupLoading ? 'Looking up city & state…' : 'City and state auto-fill'}
        >
          <TextField
            fullWidth
            size="small"
            value={form.pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            placeholder="560001"
            inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            error={!!errors.pincode}
            InputProps={{
              endAdornment: pincodeLookupLoading ? (
                <CircularProgress color="inherit" size={16} />
              ) : undefined,
            }}
          />
        </FormField>

        <FormField label="City" error={errors.city}>
          <TextField
            fullWidth
            size="small"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="City"
            error={!!errors.city}
          />
        </FormField>

        <FormField label="State" error={errors.state}>
          <TextField
            fullWidth
            size="small"
            select
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            error={!!errors.state}
          >
            <MenuItem value="">
              Select state…
            </MenuItem>
            {INDIAN_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </FormField>
      </FormSection>

      <FormSection title="Tax & Compliance" columns={2}>
        <FormField label="GST Status">
          <TextField
            fullWidth
            size="small"
            select
            value={form.gstStatus}
            onChange={(e) => update('gstStatus', e.target.value as 'Registered' | 'Unregistered')}
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

        <FormField label="Upload PAN / Income Tax" hint="PDF or image (optional)">
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
