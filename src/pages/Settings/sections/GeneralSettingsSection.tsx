import { useState } from 'react'
import { Box, Typography, TextField, MenuItem, Divider } from '@mui/material'
import { Edit, Upload } from '@mui/icons-material'
import { Button } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { updateCompanyProfile } from '@/slices/settings/thunk'
import type { CompanyProfile } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'

interface FieldErrors {
  gstin?: string
  pan?: string
  pincode?: string
  email?: string
}

const COMPANY_TYPE_OPTIONS = [
  { value: 'pvt_ltd', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
]

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        borderBottom: '1px solid #F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

function GroupTitle({ label }: { label: string }) {
  return (
    <Box sx={{ px: 2, pt: 2, pb: 0.5, gridColumn: '1 / -1' }}>
      <Typography
        variant="caption"
        sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#107E68', textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Divider sx={{ mt: 0.5 }} />
    </Box>
  )
}

export default function GeneralSettingsSection() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const { companyProfile, saving } = useAppSelector(s => s.settings)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<CompanyProfile>(companyProfile)
  const [errors, setErrors] = useState<FieldErrors>({})

  const handleEdit = () => {
    setEditForm(companyProfile)
    setErrors({})
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm(companyProfile)
    setErrors({})
  }

  const validate = (): boolean => {
    const newErrors: FieldErrors = {}
    if (editForm.gstin && !GSTIN_REGEX.test(editForm.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format'
    }
    if (editForm.pan && !PAN_REGEX.test(editForm.pan)) {
      newErrors.pan = 'Invalid PAN format (e.g. ABCDE1234F)'
    }
    if (editForm.pincode && !/^\d{6}$/.test(editForm.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits'
    }
    if (editForm.email && !EMAIL_REGEX.test(editForm.email)) {
      newErrors.email = 'Invalid email address'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    dispatch(updateCompanyProfile(editForm))
      .unwrap()
      .then(() => {
        setIsEditing(false)
        toast({ message: 'Company profile saved', severity: 'success' })
      })
      .catch(() => {
        toast({ message: 'Failed to save profile', severity: 'error' })
      })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setEditForm(prev => ({ ...prev, logoUrl: ev.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const field = (key: keyof CompanyProfile) => ({
    value: (editForm[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  const companyTypeLabel =
    COMPANY_TYPE_OPTIONS.find(o => o.value === companyProfile.companyType)?.label ?? companyProfile.companyType

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>General Settings</Typography>
          <Typography variant="caption" color="text.secondary">Company identity and contact</Typography>
        </Box>
        {!isEditing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEdit}
          >
            <Edit sx={{ fontSize: 14, mr: 0.5 }} /> Edit
          </Button>
        )}
      </Box>

      {/* VIEW MODE */}
      {!isEditing && (
        <Box>
          {/* Logo */}
          <Box sx={{ px: 2, pb: 2, borderBottom: '1px solid #F0F0F0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 1 }}>
              COMPANY LOGO
            </Typography>
            {companyProfile.logoUrl ? (
              <Box component="img" src={companyProfile.logoUrl} alt="logo" sx={{ height: 48, borderRadius: '6px', border: '1px solid #E0E0E0' }} />
            ) : (
              <Box sx={{ width: 96, height: 48, bgcolor: '#F3F4F6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.disabled">No logo</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <GroupTitle label="Company Identity" />
            <LabelValue label="Company Name" value={companyProfile.companyName} />
            <LabelValue label="GSTIN" value={companyProfile.gstin} />
            <LabelValue label="PAN" value={companyProfile.pan} />
            <LabelValue label="Company Type" value={companyTypeLabel} />

            <GroupTitle label="Contact" />
            <LabelValue label="Email" value={companyProfile.email} />
            <LabelValue label="Phone" value={companyProfile.phone} />
            <LabelValue label="Website" value={companyProfile.website} />

            <GroupTitle label="Address" />
            <LabelValue label="Address Line 1" value={companyProfile.addressLine1} />
            <LabelValue label="Address Line 2" value={companyProfile.addressLine2} />
            <LabelValue label="City" value={companyProfile.city} />
            <LabelValue label="State" value={companyProfile.state} />
            <LabelValue label="Pincode" value={companyProfile.pincode} />
          </Box>
        </Box>
      )}

      {/* EDIT MODE */}
      {isEditing && (
        <Box>
          {/* Logo upload */}
          <Box sx={{ px: 2, pb: 2, borderBottom: '1px solid #F0F0F0', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', display: 'block', mb: 1 }}>
              COMPANY LOGO
            </Typography>
            <Box
              component="label"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                border: '1px dashed #D0D0D0',
                borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: '#F8FAFB',
                '&:hover': { borderColor: '#107E68' },
              }}
            >
              <Upload sx={{ fontSize: 20, color: 'text.disabled' }} />
              <Box>
                <Typography variant="body2">Upload Logo</Typography>
                <Typography variant="caption" color="text.secondary">PNG or JPG, max 2MB</Typography>
              </Box>
              <input type="file" hidden accept=".png,.jpg,.jpeg" onChange={handleLogoUpload} />
            </Box>
            {editForm.logoUrl && (
              <Box component="img" src={editForm.logoUrl} alt="preview" sx={{ ml: 2, height: 40, borderRadius: '6px', border: '1px solid #E0E0E0', verticalAlign: 'middle' }} />
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2 }}>
            <GroupTitle label="Company Identity" />
            <TextField size="small" label="Company Name" {...field('companyName')} />
            <TextField
              size="small"
              label="GSTIN"
              {...field('gstin')}
              error={!!errors.gstin}
              helperText={errors.gstin}
              onBlur={() => {
                if (editForm.gstin && !GSTIN_REGEX.test(editForm.gstin)) {
                  setErrors(e => ({ ...e, gstin: 'Invalid GSTIN format' }))
                } else {
                  setErrors(e => ({ ...e, gstin: undefined }))
                }
              }}
            />
            <TextField
              size="small"
              label="PAN"
              {...field('pan')}
              error={!!errors.pan}
              helperText={errors.pan}
              onBlur={() => {
                if (editForm.pan && !PAN_REGEX.test(editForm.pan)) {
                  setErrors(e => ({ ...e, pan: 'Invalid PAN (e.g. ABCDE1234F)' }))
                } else {
                  setErrors(e => ({ ...e, pan: undefined }))
                }
              }}
            />
            <TextField
              select
              size="small"
              label="Company Type"
              value={editForm.companyType}
              onChange={e => setEditForm(prev => ({ ...prev, companyType: e.target.value as CompanyProfile['companyType'] }))}
            >
              {COMPANY_TYPE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>

            <GroupTitle label="Contact" />
            <TextField
              size="small"
              label="Email"
              {...field('email')}
              error={!!errors.email}
              helperText={errors.email}
              onBlur={() => {
                if (editForm.email && !EMAIL_REGEX.test(editForm.email)) {
                  setErrors(e => ({ ...e, email: 'Invalid email address' }))
                } else {
                  setErrors(e => ({ ...e, email: undefined }))
                }
              }}
            />
            <TextField size="small" label="Phone" {...field('phone')} />
            <TextField size="small" label="Website" {...field('website')} sx={{ gridColumn: '1 / -1' }} />

            <GroupTitle label="Address" />
            <TextField size="small" label="Address Line 1" {...field('addressLine1')} sx={{ gridColumn: '1 / -1' }} />
            <TextField size="small" label="Address Line 2" {...field('addressLine2')} sx={{ gridColumn: '1 / -1' }} />
            <TextField size="small" label="City" {...field('city')} />
            <TextField size="small" label="State" {...field('state')} />
            <TextField
              size="small"
              label="Pincode"
              {...field('pincode')}
              error={!!errors.pincode}
              helperText={errors.pincode}
              onBlur={() => {
                if (editForm.pincode && !/^\d{6}$/.test(editForm.pincode)) {
                  setErrors(e => ({ ...e, pincode: 'Pincode must be 6 digits' }))
                } else {
                  setErrors(e => ({ ...e, pincode: undefined }))
                }
              }}
            />
          </Box>

          {/* Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2, mt: 2, borderTop: '1px solid #F0F0F0' }}>
            <Button size="sm" variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}
