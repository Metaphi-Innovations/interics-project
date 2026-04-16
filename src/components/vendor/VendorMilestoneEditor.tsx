import {
  Box,
  Stack,
  Typography,
  TextField,
  Divider,
  Alert,
  IconButton as MuiIconButton,
  Button as MuiButton,
  Chip as MuiChip,
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import type { VendorMapping, VendorMilestone } from '@/slices/pitch/reducer'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { validateVendorMilestonePercents } from '@/utils/vendorMilestones'

export interface VendorMilestoneEditorProps {
  mapping: VendorMapping
  onChange: (next: VendorMapping) => void
}

function updateMilestoneAt(
  m: VendorMapping,
  vIdx: number,
  field: keyof VendorMilestone,
  val: string | number,
): VendorMapping {
  const vendorTotal = m.value
  const milestones = (m.milestones ?? []).map((vm, vi) => {
    if (vi !== vIdx) return vm
    const next = { ...vm, [field]: val }
    if (field === 'percentage') {
      next.value = Math.round((Number(val) / 100) * vendorTotal)
    } else if (field === 'value') {
      next.percentage = vendorTotal > 0 ? Math.round((Number(val) / vendorTotal) * 100) : 0
    }
    return next
  })
  return { ...m, milestones }
}

function updateRetentionField(
  m: VendorMapping,
  field: 'percentage' | 'amount',
  val: number,
): VendorMapping {
  if (!m.retention) return m
  const vendorTotal = m.value
  const retention = { ...m.retention }
  if (field === 'percentage') {
    retention.percentage = val
    retention.amount = Math.round((val / 100) * vendorTotal)
  } else {
    retention.amount = val
    retention.percentage = vendorTotal > 0 ? Math.round((val / vendorTotal) * 100) : 0
  }
  return { ...m, retention }
}

export function VendorMilestoneEditor({ mapping, onChange }: VendorMilestoneEditorProps) {
  const theme = useTheme()
  const milestoneList = mapping.milestones ?? []
  const mappingForValidation: VendorMapping = { ...mapping, milestones: milestoneList }
  const validation = validateVendorMilestonePercents(mappingForValidation)
  const vendorMilestoneTotal =
    milestoneList.reduce((sum, x) => sum + x.value, 0) + (mapping.retention?.amount ?? 0)

  function addMilestone() {
    onChange({
      ...mapping,
      milestones: [
        ...milestoneList,
        { id: `vml-${Date.now()}`, name: '', percentage: 0, value: 0 },
      ],
    })
  }

  function removeMilestone(vIdx: number) {
    onChange({
      ...mapping,
      milestones: milestoneList.filter((_, vi) => vi !== vIdx),
    })
  }

  function addRetention() {
    if (mapping.retention) return
    onChange({
      ...mapping,
      retention: { percentage: 0, amount: 0 },
    })
  }

  function removeRetention() {
    const next = { ...mapping }
    delete next.retention
    onChange(next)
  }

  return (
    <Box
      sx={{
        bgcolor: tokens.color.neutral[50],
        borderRadius: 2,
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
        MILESTONES
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 130px 36px',
          gap: 1,
          px: 1,
          py: 0.5,
          mb: 0.5,
        }}
      >
        {['NAME', '%', '₹ VALUE', ''].map((h) => (
          <Typography
            key={h || 'sp'}
            variant="caption"
            sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            {h}
          </Typography>
        ))}
      </Box>

      {milestoneList.map((vm, vIdx) => (
        <Box
          key={vm.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 130px 36px',
            gap: 1,
            alignItems: 'center',
            mb: 0.75,
          }}
        >
          <TextField
            size="small"
            value={vm.name}
            onChange={(e) => onChange(updateMilestoneAt(mapping, vIdx, 'name', e.target.value))}
            placeholder="Milestone name"
            sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
          />
          <TextField
            size="small"
            type="number"
            value={vm.percentage}
            onChange={(e) => onChange(updateMilestoneAt(mapping, vIdx, 'percentage', Number(e.target.value)))}
            sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
          />
          <TextField
            size="small"
            type="number"
            value={vm.value}
            onChange={(e) => onChange(updateMilestoneAt(mapping, vIdx, 'value', Number(e.target.value)))}
            sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
          />
          <MuiIconButton size="small" onClick={() => removeMilestone(vIdx)} sx={{ color: 'error.main' }}>
            <Delete sx={{ fontSize: 14 }} />
          </MuiIconButton>
        </Box>
      ))}

      <MuiButton
        size="small"
        variant="text"
        startIcon={<Add sx={{ fontSize: 16 }} />}
        onClick={addMilestone}
        sx={{
          fontSize: 12,
          color: 'primary.main',
          padding: '4px 8px',
          mt: 0.5,
          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
        }}
      >
        + Add Milestone
      </MuiButton>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
        RETENTION
      </Typography>

      <Box
        sx={{
          borderRadius: 1,
          p: 1.5,
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        {!mapping.retention ? (
          <Stack gap={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              No retention defined
            </Typography>
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={addRetention}
              sx={{ fontSize: 12, alignSelf: 'flex-start' }}
            >
              + Add Retention Milestone
            </MuiButton>
          </Stack>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 130px 36px',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Stack direction="row" alignItems="center" gap={0.5}>
              <MuiChip label="Retention" size="small" sx={{ height: 20, fontSize: 9, fontWeight: 600 }} />
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                Retention
              </Typography>
            </Stack>
            <TextField
              size="small"
              type="number"
              value={mapping.retention.percentage}
              onChange={(e) => onChange(updateRetentionField(mapping, 'percentage', Number(e.target.value)))}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={mapping.retention.amount}
              onChange={(e) => onChange(updateRetentionField(mapping, 'amount', Number(e.target.value)))}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <MuiIconButton size="small" onClick={removeRetention} sx={{ color: 'error.main' }}>
              <Delete sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mt: 1.5 }}>
        Total of milestones and retention must equal 100%.
      </Typography>

      {!validation.valid && (validation.pctMessage || validation.structureMessage) && (
        <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>
          {validation.structureMessage ?? validation.pctMessage}
        </Alert>
      )}

      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
          Allocated vs vendor total:
        </Typography>
        <MuiChip
          label={
            vendorMilestoneTotal === mapping.value
              ? 'Balanced'
              : `₹${formatCurrency(mapping.value - vendorMilestoneTotal)} unalloc.`
          }
          size="small"
          sx={{
            height: 18,
            fontSize: 10,
            bgcolor:
              vendorMilestoneTotal === mapping.value
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.warning.main, 0.12),
          }}
        />
      </Stack>
    </Box>
  )
}
