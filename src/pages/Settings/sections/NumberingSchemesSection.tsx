import { useState, useEffect } from 'react'
import { Box, Typography, TextField } from '@mui/material'
import { SearchableSelect } from '@/components/listing'
import { Edit } from '@mui/icons-material'
import { Button } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchNumberingSchemes, updateNumberingSchemes } from '@/slices/settings/thunk'
import type { NumberingSchemes } from '@/slices/settings/reducer'
import { useToast } from '@/design-system/components'

const PROJECT_FORMATS: NumberingSchemes['projectFormat'][] = ['PRJ-YY-###', 'PRJ-YYYY-###', 'PRJ-###']
const INVOICE_FORMATS: NumberingSchemes['invoiceFormat'][] = ['INV-YYYY-###', 'INV-YY-###']

function generatePreview(prefix: string, format: string): string {
  // Count how many dash-segments the prefix itself has, then skip that many from format
  const prefixSegments = prefix.split('-').length
  const formatParts = format.split('-')
  const withPrefix = [prefix, ...formatParts.slice(prefixSegments)].join('-')
  return withPrefix
    .replace('YYYY', '2024')
    .replace('YY', '24')
    .replace('###', '001')
}

interface SchemeGroupProps {
  title: string
  prefixLabel: string
  prefixKey: keyof NumberingSchemes
  formatKey?: keyof NumberingSchemes
  formatOptions?: string[]
  form: NumberingSchemes
  isEditing: boolean
  onChange: (key: keyof NumberingSchemes, value: string) => void
}

function SchemeGroup({
  title, prefixLabel, prefixKey, formatKey, formatOptions, form, isEditing, onChange,
}: SchemeGroupProps) {
  const prefix = form[prefixKey] as string
  const format = formatKey ? (form[formatKey] as string) : `${prefix}-YYYY-###`
  const preview = generatePreview(prefix, format)

  return (
    <Box sx={{ p: 2, borderBottom: '1px solid #F0F0F0' }}>
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#107E68', textTransform: 'uppercase', display: 'block', mb: 1 }}>
        {title}
      </Typography>
      {isEditing ? (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label={prefixLabel}
            value={prefix}
            onChange={e => onChange(prefixKey, e.target.value)}
            sx={{ width: 140 }}
          />
          {formatKey && formatOptions && (
            <Box sx={{ width: 180 }}>
              <SearchableSelect
                label="Format"
                fullWidth
                value={format}
                onChange={(next) => onChange(formatKey, next)}
                options={formatOptions.map((f) => ({ value: f, label: f }))}
              />
            </Box>
          )}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              bgcolor: '#F8FAFB',
              border: '1px solid #E8EEEC',
              borderRadius: '6px',
              alignSelf: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">Preview:</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
              {preview}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Prefix</Typography>
            <Typography variant="body2" fontWeight={500}>{prefix}</Typography>
          </Box>
          {formatKey && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Format</Typography>
              <Typography variant="body2" fontWeight={500}>{format}</Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Preview</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#107E68' }}>{preview}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default function NumberingSchemesSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { numberingSchemes, saving } = useAppSelector(s => s.settings)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<NumberingSchemes>(numberingSchemes)

  useEffect(() => {
    dispatch(fetchNumberingSchemes())
  }, [dispatch])

  useEffect(() => {
    setForm(numberingSchemes)
  }, [numberingSchemes])

  const onChange = (key: keyof NumberingSchemes, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  const handleSave = () => {
    dispatch(updateNumberingSchemes(form))
      .unwrap()
      .then(() => {
        setIsEditing(false)
        success('Numbering schemes saved')
      })
      .catch(() => error('Failed to save'))
  }

  const handleCancel = () => {
    setIsEditing(false)
    setForm(numberingSchemes)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Numbering Schemes</Typography>
          <Typography variant="caption" color="text.secondary">Configure ID formats for all records</Typography>
        </Box>
        {!isEditing && (
          <Button variant="outlined" color="secondary" size="sm" onClick={() => setIsEditing(true)}>
            <Edit sx={{ fontSize: 14, mr: 0.5 }} /> Edit
          </Button>
        )}
      </Box>

      <Box sx={{ border: '1px solid #F0F0F0', borderRadius: '8px', overflow: 'hidden' }}>
        <SchemeGroup
          title="Projects"
          prefixLabel="Prefix"
          prefixKey="projectPrefix"
          formatKey="projectFormat"
          formatOptions={PROJECT_FORMATS}
          form={form}
          isEditing={isEditing}
          onChange={onChange}
        />
        <SchemeGroup
          title="Invoices"
          prefixLabel="Prefix"
          prefixKey="invoicePrefix"
          formatKey="invoiceFormat"
          formatOptions={INVOICE_FORMATS}
          form={form}
          isEditing={isEditing}
          onChange={onChange}
        />
        <SchemeGroup
          title="Client PO"
          prefixLabel="Prefix"
          prefixKey="clientPOPrefix"
          form={form}
          isEditing={isEditing}
          onChange={onChange}
        />
        <SchemeGroup
          title="Vendor PO"
          prefixLabel="Prefix"
          prefixKey="vendorPOPrefix"
          form={form}
          isEditing={isEditing}
          onChange={onChange}
        />
        <SchemeGroup
          title="Expenses"
          prefixLabel="Prefix"
          prefixKey="expensePrefix"
          form={form}
          isEditing={isEditing}
          onChange={onChange}
        />
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
