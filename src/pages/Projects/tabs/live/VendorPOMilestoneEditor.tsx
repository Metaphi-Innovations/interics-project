import {
  Alert,
  Box,
  Button as MuiButton,
  Chip as MuiChip,
  Divider,
  IconButton as MuiIconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { tokens } from '@/design-system/tokens'
import { VENDOR_MILESTONE_PCT_EPS, validateVendorMilestonePercents } from '@/utils/vendorMilestones'
import type { VendorMapping, VendorMilestone } from '@/slices/pitch/reducer'

export interface VendorPOMilestoneRow {
  id: string
  name: string
  percentage: number
  value: number
}

export interface VendorPORetentionRow {
  percentage: number
  amount: number
}

interface VendorPOMilestoneEditorProps {
  poValue: number
  milestones: VendorPOMilestoneRow[]
  retention: VendorPORetentionRow | null
  onMilestonesChange: (next: VendorPOMilestoneRow[]) => void
  onRetentionChange: (next: VendorPORetentionRow | null) => void
}

const GRID_COLUMNS = '1fr 80px 130px 36px'

function calcValue(poValue: number, percentage: number): number {
  if (!poValue || !percentage) return 0
  return Math.round((percentage / 100) * poValue)
}

function calcPercentage(poValue: number, value: number): number {
  if (!poValue || !value) return 0
  return Math.round((value / poValue) * 100)
}

function toValidationMapping(
  poValue: number,
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
): VendorMapping {
  return {
    id: 'po-temp',
    vendorId: '',
    vendorName: '',
    value: poValue,
    percentage: 100,
    milestones: milestones.map(
      (m): VendorMilestone => ({
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        value: m.value,
      }),
    ),
    retention: retention ?? undefined,
    isMeasurable: false,
  }
}

function balanceLabel(totalPct: number): string {
  if (Math.abs(totalPct - 100) < VENDOR_MILESTONE_PCT_EPS) return 'Balanced'
  if (totalPct < 100) return `Remaining ${(100 - totalPct).toFixed(1)}%`
  return `Exceeded ${(totalPct - 100).toFixed(1)}%`
}

export function VendorPOMilestoneEditor({
  poValue,
  milestones,
  retention,
  onMilestonesChange,
  onRetentionChange,
}: VendorPOMilestoneEditorProps) {
  const theme = useTheme()
  const validation = validateVendorMilestonePercents(
    toValidationMapping(poValue, milestones, retention),
  )
  const totalPct = validation.currentPct
  const isBalanced = Math.abs(totalPct - 100) < VENDOR_MILESTONE_PCT_EPS
  const hasBreakdown = milestones.length > 0 || Boolean(retention)

  function updateMilestone(idx: number, field: keyof VendorPOMilestoneRow, val: string | number) {
    const next = milestones.map((m, i) => {
      if (i !== idx) return m
      const row = { ...m, [field]: val }
      if (field === 'percentage') {
        row.value = calcValue(poValue, Number(val))
      } else if (field === 'value') {
        row.percentage = calcPercentage(poValue, Number(val))
      }
      return row
    })
    onMilestonesChange(next)
  }

  function addMilestone() {
    onMilestonesChange([
      ...milestones,
      { id: `vpo-ml-${Date.now()}`, name: '', percentage: 0, value: 0 },
    ])
  }

  function removeMilestone(idx: number) {
    onMilestonesChange(milestones.filter((_, i) => i !== idx))
  }

  function updateRetention(field: 'percentage' | 'amount', val: number) {
    if (!retention) return
    const next = { ...retention }
    if (field === 'percentage') {
      next.percentage = val
      next.amount = calcValue(poValue, val)
    } else {
      next.amount = val
      next.percentage = calcPercentage(poValue, val)
    }
    onRetentionChange(next)
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
      <Typography
        variant="caption"
        sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}
      >
        MILESTONES
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
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
            sx={{
              fontSize: 10,
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {h}
          </Typography>
        ))}
      </Box>

      {milestones.map((m, idx) => (
        <Box
          key={m.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: GRID_COLUMNS,
            gap: 1,
            alignItems: 'center',
            mb: 0.75,
          }}
        >
          <TextField
            size="small"
            value={m.name}
            onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
            placeholder="Milestone name"
            sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
          />
          <TextField
            size="small"
            type="number"
            value={m.percentage}
            onChange={(e) => updateMilestone(idx, 'percentage', Number(e.target.value))}
            sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
          />
          <TextField
            size="small"
            type="number"
            value={m.value}
            onChange={(e) => updateMilestone(idx, 'value', Number(e.target.value))}
            sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
          />
          <MuiIconButton size="small" onClick={() => removeMilestone(idx)} sx={{ color: 'error.main' }}>
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
        Add Milestone
      </MuiButton>

      <Divider sx={{ my: 2 }} />

      <Typography
        variant="caption"
        sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}
      >
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
        {!retention ? (
          <Stack gap={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              No retention defined
            </Typography>
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={() => onRetentionChange({ percentage: 0, amount: 0 })}
              sx={{ fontSize: 12, alignSelf: 'flex-start' }}
            >
              Add Retention Milestone
            </MuiButton>
          </Stack>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLUMNS,
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
              value={retention.percentage}
              onChange={(e) => updateRetention('percentage', Number(e.target.value))}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={retention.amount}
              onChange={(e) => updateRetention('amount', Number(e.target.value))}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <MuiIconButton size="small" onClick={() => onRetentionChange(null)} sx={{ color: 'error.main' }}>
              <Delete sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mt: 1.5 }}>
        Total of milestones and retention must equal 100%.
      </Typography>

      {!validation.valid && hasBreakdown && (validation.pctMessage || validation.structureMessage) ? (
        <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>
          {validation.structureMessage ?? validation.pctMessage}
        </Alert>
      ) : null}

      {hasBreakdown ? (
        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            Balance status:
          </Typography>
          <MuiChip
            label={balanceLabel(totalPct)}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: isBalanced
                ? alpha(theme.palette.success.main, 0.12)
                : totalPct > 100
                  ? alpha(theme.palette.error.main, 0.12)
                  : alpha(theme.palette.warning.main, 0.12),
              color: isBalanced
                ? tokens.color.success[700]
                : totalPct > 100
                  ? tokens.color.error[700]
                  : tokens.color.warning[800],
            }}
          />
        </Stack>
      ) : null}
    </Box>
  )
}

export function buildVendorPOMilestonePayload(
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
): import('@/slices/baseline/reducer').VendorPOMilestone[] {
  const rows = milestones
    .filter((m) => m.name.trim())
    .map((m) => ({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
      dueDate: null,
      status: 'Pending' as const,
    }))
  if (retention && (retention.percentage > 0 || retention.amount > 0)) {
    rows.push({
      id: `vpo-ret-${Date.now()}`,
      name: 'Retention',
      percentage: retention.percentage,
      value: retention.amount,
      dueDate: null,
      status: 'Pending',
    })
  }
  return rows
}

export function isVendorPOMilestoneBreakdownValid(
  poValue: number,
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
): boolean {
  const hasBreakdown = milestones.length > 0 || Boolean(retention)
  if (!hasBreakdown) return true
  return validateVendorMilestonePercents(
    toValidationMapping(poValue, milestones, retention),
  ).valid
}
