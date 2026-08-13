import { useState, useEffect, type ReactNode } from 'react'
import { Box, Typography, TextField, MenuItem, Divider } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { Button, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSystemDefaults, updateSystemDefaults } from '@/slices/settings/thunk'
import type { SystemDefaults } from '@/slices/settings/reducer'
import { tokens, TREND_COLORS } from '@/design-system/tokens'
import {
  requiredText,
  paginationSize,
  collectErrors,
  hasErrors,
  firstErrorMessage,
} from '@/modules/system-settings/shared/settings-validation'
import { parseSettingsApiError, clearFieldError } from '@/modules/system-settings/shared/api-errors'

interface SelectField {
  key: keyof SystemDefaults
  label: string
  options: { value: string | number; label: string }[]
  readOnly?: boolean
}

const FIELDS: { group: string; fields: SelectField[] }[] = [
  {
    group: 'Financial',
    fields: [
      {
        key: 'currency',
        label: 'Currency',
        readOnly: true,
        options: [{ value: 'INR', label: 'INR — Indian Rupee' }],
      },
      {
        key: 'financialYearStart',
        label: 'Financial Year Start',
        options: [
          { value: 'april', label: 'April' },
          { value: 'january', label: 'January' },
        ],
      },
      {
        key: 'defaultTaxRegime',
        label: 'Default Tax Regime',
        options: [
          { value: 'gst', label: 'GST' },
          { value: 'non_gst', label: 'Non-GST' },
        ],
      },
    ],
  },
  {
    group: 'Project Defaults',
    fields: [
      {
        key: 'defaultProjectType',
        label: 'Default Project Type',
        options: [
          { value: 'design', label: 'Design' },
          { value: 'design_and_build', label: 'Design & Build' },
        ],
      },
      {
        key: 'defaultPaginationSize',
        label: 'Default Pagination',
        options: [
          { value: 10, label: '10 records/page' },
          { value: 25, label: '25 records/page' },
          { value: 50, label: '50 records/page' },
          { value: 100, label: '100 records/page' },
        ],
      },
      {
        key: 'dateFormat',
        label: 'Date Format',
        options: [
          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
        ],
      },
    ],
  },
  {
    group: 'Archival',
    fields: [
      {
        key: 'autoArchiveDays',
        label: 'Auto-archive Completed Projects',
        options: [
          { value: 0, label: 'Never' },
          { value: 30, label: 'After 30 days' },
          { value: 60, label: 'After 60 days' },
          { value: 90, label: 'After 90 days' },
        ],
      },
    ],
  },
]

const FIELD_LABEL_COLOR = TREND_COLORS.neutral.color

const FIELD_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
  alignItems: 'start',
} as const

function DefaultsFormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <Typography
        component="span"
        variant="caption"
        sx={{ fontWeight: 500, color: FIELD_LABEL_COLOR, fontSize: '11px' }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  )
}

function getLabelForValue(field: SelectField, value: string | number): string {
  return field.options.find(o => o.value === value)?.label ?? String(value)
}

function updateFormValue(
  key: keyof SystemDefaults,
  rawValue: string,
): string | number {
  if (key === 'defaultPaginationSize' || key === 'autoArchiveDays') {
    return Number(rawValue)
  }
  return rawValue
}

export default function SystemDefaultsSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { systemDefaults, saving } = useAppSelector(s => s.settings)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<SystemDefaults>(systemDefaults)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    dispatch(fetchSystemDefaults())
  }, [dispatch])

  useEffect(() => {
    setForm(systemDefaults)
  }, [systemDefaults])

  const handleSave = () => {
    const next = collectErrors([
      ['currency', requiredText(String(form.currency ?? ''), 'Currency')],
      ['financialYearStart', requiredText(String(form.financialYearStart ?? ''), 'Financial Year Start')],
      ['defaultTaxRegime', requiredText(String(form.defaultTaxRegime ?? ''), 'Default Tax Regime')],
      ['defaultProjectType', requiredText(String(form.defaultProjectType ?? ''), 'Default Project Type')],
      ['defaultPaginationSize', paginationSize(form.defaultPaginationSize)],
      ['dateFormat', requiredText(String(form.dateFormat ?? ''), 'Date Format')],
      ['autoArchiveDays', form.autoArchiveDays === null || form.autoArchiveDays === undefined
        ? 'Auto-archive setting is required'
        : undefined],
    ])
    setFieldErrors(next)
    if (hasErrors(next)) {
      error(firstErrorMessage(next, 'Please fix the highlighted fields'))
      return
    }
    dispatch(updateSystemDefaults(form))
      .unwrap()
      .then(() => {
        setIsEditing(false)
        success('System defaults saved')
      })
      .catch((err) => {
        const parsed = parseSettingsApiError(err, 'Failed to save')
        if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors)
        error(parsed.message)
      })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setForm(systemDefaults)
    setFieldErrors({})
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>System Defaults</Typography>
          <Typography variant="caption" color="text.secondary">Global defaults applied across the platform</Typography>
        </Box>
        {!isEditing && (
          <Button variant="outlined" color="secondary" size="sm" onClick={() => setIsEditing(true)}>
            <Edit sx={{ fontSize: 14, mr: 0.5 }} /> Edit
          </Button>
        )}
      </Box>

      <Box>
        {FIELDS.map(({ group, fields }) => (
          <Box key={group} sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1px',
                color: FIELD_LABEL_COLOR,
                textTransform: 'uppercase',
                display: 'block',
                mb: 0.5,
              }}
            >
              {group}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={FIELD_GRID_SX}>
              {fields.map((field) => (
                <DefaultsFormField key={field.key} label={field.label}>
                  {isEditing ? (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      disabled={field.readOnly}
                      value={form[field.key]}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          [field.key]: updateFormValue(field.key, e.target.value),
                        }))
                        setFieldErrors(errors => clearFieldError(errors, field.key))
                      }}
                      error={!!fieldErrors[field.key]}
                      helperText={fieldErrors[field.key]}
                    >
                      {field.options.map((option) => (
                        <MenuItem key={String(option.value)} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Typography variant="body2" fontWeight={500} sx={{ minHeight: 34, display: 'flex', alignItems: 'center' }}>
                      {getLabelForValue(field, form[field.key] as string | number)}
                    </Typography>
                  )}
                </DefaultsFormField>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {isEditing && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2, mt: 2, borderTop: `1px solid ${tokens.color.neutral[100]}` }}>
          <Button size="sm" variant="outlined" color="secondary" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
