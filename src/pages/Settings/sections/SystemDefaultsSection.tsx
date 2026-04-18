import { useState, useEffect } from 'react'
import { Box, Typography, TextField, MenuItem, Divider } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { Button } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSystemDefaults, updateSystemDefaults } from '@/slices/settings/thunk'
import type { SystemDefaults } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'

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

function getLabelForValue(field: SelectField, value: string | number): string {
  return field.options.find(o => o.value === value)?.label ?? String(value)
}

export default function SystemDefaultsSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { systemDefaults, saving } = useAppSelector(s => s.settings)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<SystemDefaults>(systemDefaults)

  useEffect(() => {
    dispatch(fetchSystemDefaults())
  }, [dispatch])

  useEffect(() => {
    setForm(systemDefaults)
  }, [systemDefaults])

  const handleSave = () => {
    dispatch(updateSystemDefaults(form))
      .unwrap()
      .then(() => {
        setIsEditing(false)
        success('System defaults saved')
      })
      .catch(() => error('Failed to save'))
  }

  const handleCancel = () => {
    setIsEditing(false)
    setForm(systemDefaults)
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
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#107E68', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              {group}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {isEditing ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {fields.map(f => (
                  <TextField
                    key={f.key}
                    select
                    size="small"
                    label={f.label}
                    disabled={f.readOnly}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  >
                    {f.options.map(o => (
                      <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </TextField>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {fields.map(f => (
                  <Box
                    key={f.key}
                    sx={{ py: 1.5, px: 2, borderBottom: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 0.25 }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>
                      {f.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {getLabelForValue(f, form[f.key] as string | number)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {isEditing && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 2, mt: 2, borderTop: '1px solid #F0F0F0' }}>
          <Button size="sm" variant="outlined" color="secondary" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
