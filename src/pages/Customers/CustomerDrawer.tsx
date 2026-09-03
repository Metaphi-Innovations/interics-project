import { useState, useEffect, useRef } from 'react'
import { Box, Stack, TextField, MenuItem, Typography, CircularProgress } from '@mui/material'
import { DrawerForm, FormSection, FormField } from '../../components/templates'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { createCustomer, updateCustomer } from '../../slices/customers/thunk'
import { useToast, Button } from '@/design-system/components'
import type { Contact, Customer } from '../../slices/customers/reducer'
import { fetchSectors } from '../../slices/settings/thunk'
import {
  customersService,
  validateCustomerForm,
  gstinRequired,
  type CustomerFormInput,
} from '@/modules/customers'
import {
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'
import { INDIAN_STATES, digitsOnly } from '@/constants/locations'
import { lookupPincodeLocation } from '@/utils/pincodeLookup'
import { extractIndianMobileDigits, sanitizeMobileInput } from '@/utils/mobile'

type GstStatus = Customer['gstStatus']

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  sector: string
  gstStatus: GstStatus
  gstin: string
  pan: string
  contactPerson: string
  designation: string
  phone: string
  email: string
  secondaryContactPerson: string
  secondaryDesignation: string
  secondaryPhone: string
  secondaryEmail: string
  showSecondaryContact: boolean
  city: string
  state: string
  address: string
  pincode: string
  tags: string[]
  notes: string
}

const defaultForm: FormState = {
  name: '',
  sector: '',
  gstStatus: 'Unregistered',
  gstin: '',
  pan: '',
  contactPerson: '',
  designation: '',
  phone: '',
  email: '',
  secondaryContactPerson: '',
  secondaryDesignation: '',
  secondaryPhone: '',
  secondaryEmail: '',
  showSecondaryContact: false,
  city: '',
  state: '',
  address: '',
  pincode: '',
  tags: [],
  notes: '',
}

function getSecondaryContact(contacts?: Contact[]): Contact | undefined {
  return contacts?.find((contact) => !contact.isPrimary)
}

function snapshotForm(form: FormState, gstFile?: File | null, panFile?: File | null): string {
  return JSON.stringify({
    ...form,
    gstCertFileName: gstFile?.name ?? '',
    panDocFileName: panFile?.name ?? '',
  })
}

export interface CustomerDrawerProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  customer?: Customer | null
  onSuccess?: (customer: Customer) => void
}

// ─── CustomerDrawer ───────────────────────────────────────────────────────────

export function CustomerDrawer({ open, onClose, mode, customer, onSuccess }: CustomerDrawerProps) {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.customers.saving)
  const customers = useAppSelector((s) => s.customers.items)
  const sectors = useAppSelector((s) => s.settings.sectors)
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [gstCertFile, setGstCertFile] = useState<File | null>(null)
  const [panDocFile, setPanDocFile] = useState<File | null>(null)
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false)
  const gstFileInputRef = useRef<HTMLInputElement>(null)
  const panFileInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const pincodeLookupSeq = useRef(0)
  const initialSnapshotRef = useRef(snapshotForm(defaultForm))

  const activeSectors = sectors.filter((s) => s.status === 'active')

  function seedForm(nextForm: FormState) {
    setForm(nextForm)
    initialSnapshotRef.current = snapshotForm(nextForm)
  }

  useEffect(() => {
    if (!open) return
    dispatch(fetchSectors())
    setGstCertFile(null)
    setPanDocFile(null)
    setErrors({})
    setPincodeLookupLoading(false)

    let cancelled = false

    async function hydrate() {
      if (customer && mode === 'edit') {
        // Seed from list row immediately so the form is never blank while detail loads
        const seedFromList: FormState = {
          name: customer.name,
          sector: customer.sector ?? '',
          gstStatus: customer.gstStatus,
          gstin: customer.gstin ?? '',
          pan: customer.pan ?? '',
          contactPerson: customer.contactPerson,
          designation: customer.designation ?? '',
          phone: extractIndianMobileDigits(customer.phone),
          email: customer.email.trim(),
          secondaryContactPerson: '',
          secondaryDesignation: '',
          secondaryPhone: '',
          secondaryEmail: '',
          showSecondaryContact: false,
          city: customer.city,
          state: customer.state,
          address: customer.address ?? '',
          pincode: customer.pincode ?? '',
          tags: customer.tags,
          notes: customer.notes ?? '',
        }
        seedForm(seedFromList)
        try {
          const full = await customersService.getById(customer.id)
          if (cancelled) return
          const secondary = getSecondaryContact(full.contacts)
          const hydrated: FormState = {
            name: full.name || customer.name,
            sector: full.sector || customer.sector || '',
            gstStatus: full.gstStatus || customer.gstStatus,
            gstin: full.gstin ?? customer.gstin ?? '',
            pan: full.pan ?? customer.pan ?? '',
            contactPerson: full.contactPerson || customer.contactPerson,
            designation: full.designation ?? customer.designation ?? '',
            phone: extractIndianMobileDigits(full.phone || customer.phone),
            email: (full.email || customer.email).trim(),
            secondaryContactPerson: secondary?.name ?? '',
            secondaryDesignation: secondary?.designation ?? '',
            secondaryPhone: extractIndianMobileDigits(secondary?.phone ?? ''),
            secondaryEmail: secondary?.email?.trim() ?? '',
            showSecondaryContact: Boolean(secondary),
            city: full.city || customer.city,
            state: full.state || customer.state,
            address: full.address ?? customer.address ?? '',
            pincode: full.pincode ?? customer.pincode ?? '',
            tags: full.tags?.length ? full.tags : customer.tags,
            notes: full.notes ?? customer.notes ?? '',
          }
          seedForm(hydrated)
        } catch {
          // Keep the list-row seed already applied above
        }
      } else {
        seedForm(defaultForm)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [open, customer, mode, dispatch])

  useEffect(() => {
    if (!open) return
    const isDirty = snapshotForm(form, gstCertFile, panDocFile) !== initialSnapshotRef.current
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [open, form, gstCertFile, panDocFile])

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((errs) => clearFieldError(errs, field))
  }

  function updateGstStatus(value: GstStatus) {
    setForm((f) => ({
      ...f,
      gstStatus: value,
      gstin: value === 'Registered' ? f.gstin : '',
    }))
    setErrors((errs) => clearFieldError(clearFieldError(errs, 'gstStatus'), 'gstin'))
  }

  function clearSecondaryContact() {
    setForm((f) => ({
      ...f,
      secondaryContactPerson: '',
      secondaryDesignation: '',
      secondaryPhone: '',
      secondaryEmail: '',
      showSecondaryContact: false,
    }))
    setErrors((errs) =>
      clearFieldError(
        clearFieldError(
          clearFieldError(clearFieldError(errs, 'secondaryContactPerson'), 'secondaryDesignation'),
          'secondaryPhone',
        ),
        'secondaryEmail',
      ),
    )
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
    if (saving || submittingRef.current) return
    submittingRef.current = true

    const payload: CustomerFormInput = {
      name: form.name.trim(),
      sector: form.sector,
      gstStatus: form.gstStatus,
      gstin: form.gstin.trim(),
      pan: form.pan.trim(),
      contactPerson: form.contactPerson.trim(),
      designation: form.designation.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      secondaryContactPerson: form.showSecondaryContact ? form.secondaryContactPerson.trim() : '',
      secondaryDesignation: form.showSecondaryContact ? form.secondaryDesignation.trim() : '',
      secondaryPhone: form.showSecondaryContact ? form.secondaryPhone.trim() : '',
      secondaryEmail: form.showSecondaryContact ? form.secondaryEmail.trim() : '',
      city: form.city.trim(),
      state: form.state,
      address: form.address.trim(),
      pincode: form.pincode.trim(),
      tags: form.tags,
      notes: form.notes.trim(),
      gstCertificateFile: gstCertFile,
      panDocumentFile: panDocFile,
    }

    const errs = validateCustomerForm(payload, {
      existingCustomers: customers,
      excludeId: mode === 'edit' ? customer?.id : undefined,
    })
    setErrors(errs)
    if (hasErrors(errs)) {
      submittingRef.current = false
      showToast({
        title: firstErrorMessage(errs, 'Please fix the highlighted fields'),
        variant: 'error',
      })
      return
    }

    try {
      if (mode === 'add') {
        const result = await dispatch(createCustomer(payload)).unwrap()
        showToast({ title: 'Customer saved', variant: 'success' })
        onClose()
        onSuccess?.(result)
        return
      } else {
        const result = await dispatch(updateCustomer({ id: customer!.id, data: payload })).unwrap()
        showToast({ title: 'Customer saved', variant: 'success' })
        onClose()
        onSuccess?.(result)
        return
      }
    } catch (err) {
      const parsed = parseSettingsApiError(
        err,
        'Failed to save customer',
        customersService.fieldAliases,
      )
      if (Object.keys(parsed.fieldErrors).length) {
        setErrors(parsed.fieldErrors)
      }
      showToast({ title: parsed.message, variant: 'error' })
    } finally {
      submittingRef.current = false
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
        <FormField label="GST Status" required error={errors.gstStatus}>
          <TextField
            fullWidth
            size="small"
            select
            value={form.gstStatus}
            onChange={(e) => {
              const val = e.target.value as GstStatus
              updateGstStatus(val)
            }}
            error={!!errors.gstStatus}
          >
            <MenuItem value="Registered">Registered</MenuItem>
            <MenuItem value="Unregistered">Unregistered</MenuItem>
            {form.gstStatus !== 'Registered' && form.gstStatus !== 'Unregistered' ? (
              <MenuItem value={form.gstStatus} disabled>
                {form.gstStatus}
              </MenuItem>
            ) : null}
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
            error={!!errors.gstin}
            disabled={!gstinRequired(form.gstStatus)}
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

        <FormField label="PAN Number" hint="10-character PAN" error={errors.pan}>
          <TextField
            fullWidth
            size="small"
            value={form.pan}
            onChange={(e) => update('pan', e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            error={!!errors.pan}
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

        <FormField label="Designation" error={errors.designation}>
          <TextField
            fullWidth
            size="small"
            value={form.designation}
            onChange={(e) => update('designation', e.target.value)}
            placeholder="e.g. Director"
            error={!!errors.designation}
          />
        </FormField>

        <FormField label="Phone" required error={errors.phone} hint="10-digit mobile starting with 6-9">
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

        <FormField label="Email" required error={errors.email}>
          <TextField
            fullWidth
            size="small"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            onBlur={(e) => update('email', e.target.value.trim())}
            placeholder="name@company.com"
            error={!!errors.email}
          />
        </FormField>
      </FormSection>

      {/* Secondary Contact */}
      <FormSection title="Secondary Contact" columns={2}>
        {!form.showSecondaryContact ? (
          <Box sx={{ gridColumn: 'span 2' }}>
            <Button
              type="button"
              variant="outlined"
              color="secondary"
              size="sm"
              onClick={() => update('showSecondaryContact', true)}
            >
              Add Secondary Contact
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="text"
                color="secondary"
                size="sm"
                onClick={clearSecondaryContact}
              >
                Remove Secondary Contact
              </Button>
            </Box>

            <FormField label="Secondary Contact Person" error={errors.secondaryContactPerson}>
              <TextField
                fullWidth
                size="small"
                value={form.secondaryContactPerson}
                onChange={(e) => update('secondaryContactPerson', e.target.value)}
                placeholder="Full name"
                error={!!errors.secondaryContactPerson}
              />
            </FormField>

            <FormField label="Secondary Designation" error={errors.secondaryDesignation}>
              <TextField
                fullWidth
                size="small"
                value={form.secondaryDesignation}
                onChange={(e) => update('secondaryDesignation', e.target.value)}
                placeholder="e.g. Finance Manager"
                error={!!errors.secondaryDesignation}
              />
            </FormField>

            <FormField
              label="Secondary Phone"
              error={errors.secondaryPhone}
              hint="10-digit mobile starting with 6-9"
            >
              <TextField
                fullWidth
                size="small"
                type="tel"
                value={form.secondaryPhone}
                onChange={(e) => update('secondaryPhone', sanitizeMobileInput(e.target.value))}
                placeholder="9876543210"
                inputProps={{ inputMode: 'numeric', maxLength: 10 }}
                error={!!errors.secondaryPhone}
              />
            </FormField>

            <FormField label="Secondary Email" error={errors.secondaryEmail}>
              <TextField
                fullWidth
                size="small"
                type="email"
                value={form.secondaryEmail}
                onChange={(e) => update('secondaryEmail', e.target.value)}
                onBlur={(e) => update('secondaryEmail', e.target.value.trim())}
                placeholder="name@company.com"
                error={!!errors.secondaryEmail}
              />
            </FormField>
          </>
        )}
      </FormSection>

      {/* Address */}
      <FormSection title="Address" columns={3}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Address" required error={errors.address}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Building, Street"
              error={!!errors.address}
            />
          </FormField>
        </Box>

        <FormField
          label="Pincode"
          required
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
            {form.state && !(INDIAN_STATES as readonly string[]).includes(form.state) ? (
              <MenuItem value={form.state}>{form.state}</MenuItem>
            ) : null}
          </TextField>
        </FormField>
      </FormSection>

      {/* ── Additional ──────────────────────────────────────────────── */}
      <FormSection title="Additional" columns={1}>
        <FormField label="Notes" error={errors.notes}>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Internal notes about this customer"
            error={!!errors.notes}
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}
