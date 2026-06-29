import { Fragment } from 'react'
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

export function createEmptyVendorPOMilestoneRow(): VendorPOMilestoneRow {
  return {
    id: `vpo-ml-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: '',
    percentage: 0,
    value: 0,
  }
}

export interface VendorPORetentionRow {
  percentage: number
  amount: number
}

export interface VendorPOFinalMilestoneRow {
  name: string
  percentage: number
  amount: number
}

interface VendorPOMilestoneEditorProps {
  poValue: number
  milestones: VendorPOMilestoneRow[]
  retention: VendorPORetentionRow | null
  finalMilestone: VendorPOFinalMilestoneRow | null
  onMilestonesChange: (next: VendorPOMilestoneRow[]) => void
  onRetentionChange: (next: VendorPORetentionRow | null) => void
  onFinalMilestoneChange: (next: VendorPOFinalMilestoneRow | null) => void
  /** Lighter styling when nested inside a service card. */
  embedded?: boolean
  /** When true, only render the regular milestones table (no final / retention). */
  regularOnly?: boolean
}

const GRID_COLUMNS = 'minmax(0, 1fr) 72px 104px 36px'
/** Mirrors CategoryServiceFields — name column aligns with Category dropdown. */
const CARD_CATEGORY_ALIGN_GRID = 'repeat(2, minmax(0, 1fr))'
const CARD_MILESTONE_VALUE_GRID = 'minmax(0, 1fr) minmax(0, 1.4fr) 28px'
const CARD_FIELD_GAP = 1.5

const MILESTONE_FIELD_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
} as const

const MILESTONE_INPUT_SX = {
  width: '100%',
  minWidth: 0,
  '& .MuiInputBase-input': { fontSize: 11 },
  '& .MuiInputBase-root': { width: '100%' },
} as const

const CARD_ACTION_CELL_SX = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const

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
  finalMilestone: VendorPOFinalMilestoneRow | null,
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
    finalMilestone: finalMilestone
      ? {
          name: finalMilestone.name,
          percentage: finalMilestone.percentage,
          amount: finalMilestone.amount,
        }
      : undefined,
    isMeasurable: false,
  }
}

function balanceLabel(totalPct: number): string {
  if (Math.abs(totalPct - 100) < VENDOR_MILESTONE_PCT_EPS) return 'Balanced'
  if (totalPct < 100) return `Remaining ${(100 - totalPct).toFixed(1)}%`
  return `Exceeded ${(totalPct - 100).toFixed(1)}%`
}

function CardMilestoneFieldHeader() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: CARD_CATEGORY_ALIGN_GRID,
        gap: CARD_FIELD_GAP,
        alignItems: 'end',
        mb: 0.5,
      }}
    >
      <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
        Milestone Name
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: CARD_MILESTONE_VALUE_GRID,
          gap: 1,
          alignItems: 'end',
          minWidth: 0,
        }}
      >
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          %
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          Value (₹)
        </Typography>
        <Box aria-hidden sx={{ width: 28 }} />
      </Box>
    </Box>
  )
}

export function VendorPOMilestoneEditor({
  poValue,
  milestones,
  retention,
  finalMilestone,
  onMilestonesChange,
  onRetentionChange,
  onFinalMilestoneChange,
  embedded = false,
  regularOnly = false,
}: VendorPOMilestoneEditorProps) {
  const theme = useTheme()
  const isCardMilestoneList = embedded && regularOnly
  const validation = validateVendorMilestonePercents(
    toValidationMapping(poValue, milestones, retention, finalMilestone),
  )
  const totalPct = regularOnly
    ? milestones.reduce((sum, m) => sum + m.percentage, 0)
    : validation.currentPct
  const isBalanced = Math.abs(totalPct - 100) < VENDOR_MILESTONE_PCT_EPS
  const hasBreakdown = regularOnly
    ? milestones.length > 0
    : milestones.length > 0 || Boolean(retention) || Boolean(finalMilestone)

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
    onMilestonesChange([...milestones, createEmptyVendorPOMilestoneRow()])
  }

  function removeMilestone(idx: number) {
    if (isCardMilestoneList && milestones.length <= 1) return
    const next = milestones.filter((_, i) => i !== idx)
    onMilestonesChange(
      isCardMilestoneList && next.length === 0 ? [createEmptyVendorPOMilestoneRow()] : next,
    )
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

  function updateFinalMilestone(
    field: keyof VendorPOFinalMilestoneRow,
    val: string | number,
  ) {
    if (!finalMilestone) return
    const next = { ...finalMilestone, [field]: val }
    if (field === 'percentage') {
      next.amount = calcValue(poValue, Number(val))
    } else if (field === 'amount') {
      next.percentage = calcPercentage(poValue, Number(val))
    }
    onFinalMilestoneChange(next)
  }

  return (
    <Box
      sx={{
        bgcolor: embedded ? 'transparent' : tokens.color.neutral[50],
        borderRadius: embedded ? 0 : 2,
        p: embedded ? 0 : 1.5,
        border: embedded ? 'none' : '1px solid',
        borderColor: 'divider',
      }}
    >
      {!embedded ? (
        <Typography
          variant="caption"
          sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}
        >
          MILESTONES
        </Typography>
      ) : null}

      {isCardMilestoneList ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <CardMilestoneFieldHeader />
          {milestones.map((m, idx) => {
            const isLast = idx === milestones.length - 1
            const isOnly = milestones.length === 1

            return (
              <Box
                key={m.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: CARD_CATEGORY_ALIGN_GRID,
                  gap: CARD_FIELD_GAP,
                  alignItems: 'center',
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  value={m.name}
                  onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                  placeholder="Milestone name"
                  sx={MILESTONE_INPUT_SX}
                />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: CARD_MILESTONE_VALUE_GRID,
                    gap: 1,
                    alignItems: 'center',
                    minWidth: 0,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={m.percentage}
                    onChange={(e) => updateMilestone(idx, 'percentage', Number(e.target.value))}
                    placeholder="%"
                    sx={MILESTONE_INPUT_SX}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={m.value}
                    onChange={(e) => updateMilestone(idx, 'value', Number(e.target.value))}
                    placeholder="₹ VALUE"
                    sx={MILESTONE_INPUT_SX}
                  />
                  <Box sx={CARD_ACTION_CELL_SX}>
                    {!isOnly && isLast ? (
                      <MuiIconButton
                        size="small"
                        aria-label="Add milestone row"
                        onClick={addMilestone}
                        sx={{ color: 'primary.main', width: 28, height: 28, p: 0.25 }}
                      >
                        <Add sx={{ fontSize: 16 }} />
                      </MuiIconButton>
                    ) : null}
                    {!isOnly && !isLast ? (
                      <MuiIconButton
                        size="small"
                        aria-label="Remove milestone row"
                        onClick={() => removeMilestone(idx)}
                        sx={{ color: 'error.main', width: 28, height: 28, p: 0.25 }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </MuiIconButton>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: GRID_COLUMNS,
            gap: 1,
            alignItems: 'center',
            px: embedded ? 0 : 1,
          }}
        >
          {milestones.map((m, idx) => (
            <Fragment key={m.id}>
              <TextField
                size="small"
                fullWidth
                value={m.name}
                onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                placeholder="Milestone name"
                sx={MILESTONE_INPUT_SX}
              />
              <TextField
                size="small"
                fullWidth
                type="number"
                value={m.percentage}
                onChange={(e) => updateMilestone(idx, 'percentage', Number(e.target.value))}
                placeholder="%"
                sx={MILESTONE_INPUT_SX}
              />
              <TextField
                size="small"
                fullWidth
                type="number"
                value={m.value}
                onChange={(e) => updateMilestone(idx, 'value', Number(e.target.value))}
                placeholder="₹ VALUE"
                sx={MILESTONE_INPUT_SX}
              />
              <Box sx={CARD_ACTION_CELL_SX}>
                <MuiIconButton
                  size="small"
                  aria-label="Remove milestone row"
                  onClick={() => removeMilestone(idx)}
                  sx={{ color: 'error.main', width: 28, height: 28, p: 0.25 }}
                >
                  <Delete sx={{ fontSize: 16 }} />
                </MuiIconButton>
              </Box>
            </Fragment>
          ))}
        </Box>
      )}

      {regularOnly ? null : (
        <>
      <Divider sx={{ my: 2 }} />

      <Typography
        variant="caption"
        sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}
      >
        FINAL MILESTONE
      </Typography>

      <Box
        sx={{
          borderRadius: 1,
          p: 1.5,
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        {!finalMilestone ? (
          <Stack gap={1}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              No final milestone defined
            </Typography>
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={() => onFinalMilestoneChange({ name: '', percentage: 0, amount: 0 })}
              sx={{ fontSize: 12, alignSelf: 'flex-start' }}
            >
              Add Final Milestone
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
            <TextField
              size="small"
              value={finalMilestone.name}
              onChange={(e) => updateFinalMilestone('name', e.target.value)}
              placeholder="Milestone name"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={finalMilestone.percentage}
              onChange={(e) => updateFinalMilestone('percentage', Number(e.target.value))}
              placeholder="%"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={finalMilestone.amount}
              onChange={(e) => updateFinalMilestone('amount', Number(e.target.value))}
              placeholder="₹ VALUE"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <MuiIconButton
              size="small"
              onClick={() => onFinalMilestoneChange(null)}
              sx={{ color: 'error.main' }}
            >
              <Delete sx={{ fontSize: 16 }} />
            </MuiIconButton>
          </Box>
        )}
      </Box>

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
              Add Retention
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
              placeholder="%"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={retention.amount}
              onChange={(e) => updateRetention('amount', Number(e.target.value))}
              placeholder="₹ VALUE"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <MuiIconButton size="small" onClick={() => onRetentionChange(null)} sx={{ color: 'error.main' }}>
              <Delete sx={{ fontSize: 16 }} />
            </MuiIconButton>
          </Box>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mt: 1.5 }}>
        Total of milestones, retention, and final milestone must equal 100%.
      </Typography>

      {!validation.valid && hasBreakdown && !regularOnly && (validation.pctMessage || validation.structureMessage) ? (
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
        </>
      )}
    </Box>
  )
}

export function buildVendorPOMilestonePayload(
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
  finalMilestone: VendorPOFinalMilestoneRow | null,
): import('@/slices/baseline/reducer').VendorPOMilestone[] {
  const rows: import('@/slices/baseline/reducer').VendorPOMilestone[] = milestones
    .filter((m) => m.name.trim())
    .map((m) => ({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
      dueDate: null,
      status: 'Pending' as const,
      kind: 'regular' as const,
    }))
  if (retention && (retention.percentage > 0 || retention.amount > 0)) {
    rows.push({
      id: `vpo-ret-${Date.now()}`,
      name: 'Retention',
      percentage: retention.percentage,
      value: retention.amount,
      dueDate: null,
      status: 'Pending',
      kind: 'retention',
    })
  }
  if (
    finalMilestone &&
    finalMilestone.name.trim() &&
    (finalMilestone.percentage > 0 || finalMilestone.amount > 0)
  ) {
    rows.push({
      id: `vpo-final-${Date.now()}`,
      name: finalMilestone.name.trim(),
      percentage: finalMilestone.percentage,
      value: finalMilestone.amount,
      dueDate: null,
      status: 'Pending',
      kind: 'final',
    })
  }
  return rows
}

export function isVendorPOMilestoneBreakdownValid(
  poValue: number,
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
  finalMilestone: VendorPOFinalMilestoneRow | null,
): boolean {
  const hasBreakdown = milestones.length > 0 || Boolean(retention) || Boolean(finalMilestone)
  if (!hasBreakdown) return true
  return validateVendorMilestonePercents(
    toValidationMapping(poValue, milestones, retention, finalMilestone),
  ).valid
}
