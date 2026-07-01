import { Fragment, type ReactNode } from 'react'
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
import { READONLY_DISABLED_TEXTFIELD_SX } from './readOnlyFieldStyles'
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
  /** Embedded card: milestones table plus aligned retention row (no final milestone). */
  cardWithRetention?: boolean
  /** Lock structure and percentages; values still reflect props (e.g. executed-value preview). */
  readOnly?: boolean
  /** Optional payment status per milestone row id (regular rows only). */
  milestoneStatuses?: Record<string, import('./milestonePaymentStatus').MilestonePaymentStatusLabel>
  retentionStatus?: import('./milestonePaymentStatus').MilestonePaymentStatusLabel
  finalMilestoneStatus?: import('./milestonePaymentStatus').MilestonePaymentStatusLabel
}

const GRID_COLUMNS = 'repeat(3, minmax(0, 1fr)) 28px'
/** Two-column header row — Category | Service. */
export const CARD_CATEGORY_ALIGN_GRID = 'repeat(2, minmax(0, 1fr))'
/** Milestone row: equal-width name | % | value columns. */
export const CARD_MILESTONE_ROW_GRID = 'repeat(3, minmax(0, 1fr))'
const CARD_MILESTONE_ROW_GRID_WITH_ACTION = 'repeat(3, minmax(0, 1fr)) 28px'
export const CARD_FIELD_GAP = 1.5
/** Matches CardHeader delete IconButton slot so fields line up with category row. */
export const CARD_HEADER_ACTION_SLOT = 34

export function cardMilestoneRowGrid(showAction: boolean): string {
  return showAction ? CARD_MILESTONE_ROW_GRID_WITH_ACTION : CARD_MILESTONE_ROW_GRID
}

/** @deprecated Use cardMilestoneRowGrid — kept for any external imports. */
export function cardMilestoneValueGrid(showAction: boolean): string {
  return cardMilestoneRowGrid(showAction)
}

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

export function CardAlignedRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <Box aria-hidden sx={{ width: CARD_HEADER_ACTION_SLOT, flexShrink: 0 }} />
    </Stack>
  )
}

function CardMilestoneFieldHeader({ showActionColumn }: { showActionColumn: boolean }) {
  return (
    <CardAlignedRow>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cardMilestoneRowGrid(showActionColumn),
          gap: CARD_FIELD_GAP,
          alignItems: 'end',
          mb: 0.5,
        }}
      >
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          Milestone Name
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          %
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          Value (₹)
        </Typography>
        {showActionColumn ? <Box aria-hidden sx={{ width: 28 }} /> : null}
      </Box>
    </CardAlignedRow>
  )
}

function CardRetentionFieldHeader({ showActionColumn }: { showActionColumn: boolean }) {
  return (
    <CardAlignedRow>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cardMilestoneRowGrid(showActionColumn),
          gap: CARD_FIELD_GAP,
          alignItems: 'end',
          mb: 0.5,
          mt: 1.5,
        }}
      >
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          Retention
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          %
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          Value (₹)
        </Typography>
        {showActionColumn ? <Box aria-hidden sx={{ width: 28 }} /> : null}
      </Box>
    </CardAlignedRow>
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
  cardWithRetention = false,
  readOnly = false,
  retentionStatus: _retentionStatus,
  finalMilestoneStatus: _finalMilestoneStatus,
}: VendorPOMilestoneEditorProps) {
  const theme = useTheme()
  const isCardMilestoneList = embedded && (regularOnly || cardWithRetention)
  const showStandaloneFinalRetention = !regularOnly && !cardWithRetention
  const validation = validateVendorMilestonePercents(
    toValidationMapping(poValue, milestones, retention, cardWithRetention ? null : finalMilestone),
  )
  const totalPct = regularOnly
    ? milestones.reduce((sum, m) => sum + m.percentage, 0)
    : cardWithRetention
      ? milestones.reduce((sum, m) => sum + m.percentage, 0) + (retention?.percentage ?? 0)
      : validation.currentPct
  const isBalanced = Math.abs(totalPct - 100) < VENDOR_MILESTONE_PCT_EPS
  const hasBreakdown = regularOnly
    ? milestones.length > 0
    : cardWithRetention
      ? milestones.length > 0 || Boolean(retention)
      : milestones.length > 0 || Boolean(retention) || Boolean(finalMilestone)
  const showActionColumn = !readOnly && isCardMilestoneList && milestones.length > 1
  const showRetentionActionColumn =
    !readOnly && (showActionColumn || (cardWithRetention && Boolean(retention)))
  const standaloneGridColumns = readOnly ? 'repeat(3, minmax(0, 1fr))' : GRID_COLUMNS

  function updateMilestone(idx: number, field: keyof VendorPOMilestoneRow, val: string | number) {
    if (readOnly) return
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
    if (readOnly) return
    onMilestonesChange([...milestones, createEmptyVendorPOMilestoneRow()])
  }

  function removeMilestone(idx: number) {
    if (readOnly) return
    if (isCardMilestoneList && milestones.length <= 1) return
    const next = milestones.filter((_, i) => i !== idx)
    onMilestonesChange(
      isCardMilestoneList && next.length === 0 ? [createEmptyVendorPOMilestoneRow()] : next,
    )
  }

  function updateRetention(field: 'percentage' | 'amount', val: number) {
    if (readOnly || !retention) return
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
    if (readOnly || !finalMilestone) return
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
        ...(readOnly ? READONLY_DISABLED_TEXTFIELD_SX : {}),
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
          <CardMilestoneFieldHeader showActionColumn={showActionColumn} />
          {milestones.map((m, idx) => {
            const isLast = idx === milestones.length - 1

            return (
              <CardAlignedRow key={m.id}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: cardMilestoneRowGrid(showActionColumn),
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
                    disabled={readOnly}
                    sx={MILESTONE_INPUT_SX}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={m.percentage}
                    onChange={(e) => updateMilestone(idx, 'percentage', Number(e.target.value))}
                    placeholder="%"
                    disabled={readOnly}
                    sx={MILESTONE_INPUT_SX}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={m.value}
                    onChange={(e) => updateMilestone(idx, 'value', Number(e.target.value))}
                    placeholder="₹ VALUE"
                    disabled={readOnly}
                    sx={MILESTONE_INPUT_SX}
                  />
                  {showActionColumn ? (
                    <Box sx={CARD_ACTION_CELL_SX}>
                      {isLast ? (
                        <MuiIconButton
                          size="small"
                          aria-label="Add milestone row"
                          onClick={addMilestone}
                          sx={{ color: 'primary.main', width: 28, height: 28, p: 0.25 }}
                        >
                          <Add sx={{ fontSize: 16 }} />
                        </MuiIconButton>
                      ) : (
                        <MuiIconButton
                          size="small"
                          aria-label="Remove milestone row"
                          onClick={() => removeMilestone(idx)}
                          sx={{ color: 'error.main', width: 28, height: 28, p: 0.25 }}
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </MuiIconButton>
                      )}
                    </Box>
                  ) : null}
                </Box>
              </CardAlignedRow>
            )
          })}
          {cardWithRetention ? (
            <>
              <CardRetentionFieldHeader showActionColumn={showRetentionActionColumn} />
              {!readOnly && !retention ? (
                <CardAlignedRow>
                  <MuiButton
                    size="small"
                    variant="text"
                    startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={() => onRetentionChange({ percentage: 0, amount: 0 })}
                    sx={{
                      fontSize: 11,
                      color: 'primary.main',
                      py: 0.25,
                      alignSelf: 'flex-start',
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                    }}
                  >
                    Add Retention
                  </MuiButton>
                </CardAlignedRow>
              ) : retention ? (
                <CardAlignedRow>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: cardMilestoneRowGrid(showRetentionActionColumn),
                      gap: CARD_FIELD_GAP,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      size="small"
                      fullWidth
                      value="Retention"
                      disabled
                      sx={MILESTONE_INPUT_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={retention.percentage}
                      onChange={(e) => updateRetention('percentage', Number(e.target.value))}
                      placeholder="%"
                      disabled={readOnly}
                      sx={MILESTONE_INPUT_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={retention.amount}
                      onChange={(e) => updateRetention('amount', Number(e.target.value))}
                      placeholder="₹ VALUE"
                      disabled={readOnly}
                      sx={MILESTONE_INPUT_SX}
                    />
                    {showRetentionActionColumn ? (
                      <Box sx={CARD_ACTION_CELL_SX}>
                        <MuiIconButton
                          size="small"
                          aria-label="Remove retention"
                          onClick={() => onRetentionChange(null)}
                          sx={{ color: 'error.main', width: 28, height: 28, p: 0.25 }}
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </MuiIconButton>
                      </Box>
                    ) : null}
                  </Box>
                </CardAlignedRow>
              ) : null}
            </>
          ) : null}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: standaloneGridColumns,
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
                disabled={readOnly}
                sx={MILESTONE_INPUT_SX}
              />
              <TextField
                size="small"
                fullWidth
                type="number"
                value={m.percentage}
                onChange={(e) => updateMilestone(idx, 'percentage', Number(e.target.value))}
                placeholder="%"
                disabled={readOnly}
                sx={MILESTONE_INPUT_SX}
              />
              <TextField
                size="small"
                fullWidth
                type="number"
                value={m.value}
                onChange={(e) => updateMilestone(idx, 'value', Number(e.target.value))}
                placeholder="₹ VALUE"
                disabled={readOnly}
                sx={MILESTONE_INPUT_SX}
              />
              {!readOnly ? (
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
              ) : null}
            </Fragment>
          ))}
        </Box>
      )}

      {showStandaloneFinalRetention ? (
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
        {!readOnly && !finalMilestone ? (
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
        ) : finalMilestone ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: standaloneGridColumns,
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              value={finalMilestone.name}
              onChange={(e) => updateFinalMilestone('name', e.target.value)}
              placeholder="Milestone name"
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={finalMilestone.percentage}
              onChange={(e) => updateFinalMilestone('percentage', Number(e.target.value))}
              placeholder="%"
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={finalMilestone.amount}
              onChange={(e) => updateFinalMilestone('amount', Number(e.target.value))}
              placeholder="₹ VALUE"
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            {!readOnly ? (
              <MuiIconButton
                size="small"
                onClick={() => onFinalMilestoneChange(null)}
                sx={{ color: 'error.main' }}
              >
                <Delete sx={{ fontSize: 16 }} />
              </MuiIconButton>
            ) : null}
          </Box>
        ) : null}
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
        {!readOnly && !retention ? (
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
        ) : retention ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: standaloneGridColumns,
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
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={retention.amount}
              onChange={(e) => updateRetention('amount', Number(e.target.value))}
              placeholder="₹ VALUE"
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            {!readOnly ? (
              <MuiIconButton size="small" onClick={() => onRetentionChange(null)} sx={{ color: 'error.main' }}>
                <Delete sx={{ fontSize: 16 }} />
              </MuiIconButton>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mt: 1.5 }}>
        Total of milestones, retention, and final milestone must equal 100%.
      </Typography>

      {!validation.valid && hasBreakdown && showStandaloneFinalRetention && (validation.pctMessage || validation.structureMessage) ? (
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
      ) : null}
    </Box>
  )
}

export function buildVendorPOMilestonePayload(
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
  finalMilestone: VendorPOFinalMilestoneRow | null,
): import('@/slices/baseline/reducer').VendorPOMilestone[] {
  return buildVendorPOMilestonePayloadForUpdate(
    milestones,
    retention,
    finalMilestone,
    [],
  )
}

export function vendorPOMilestoneEditorStateFromPo(
  po: Pick<import('@/slices/baseline/reducer').VendorPO, 'milestones'>,
): {
  milestones: VendorPOMilestoneRow[]
  retention: VendorPORetentionRow | null
  finalMilestone: VendorPOFinalMilestoneRow | null
} {
  const milestones: VendorPOMilestoneRow[] = []
  let retention: VendorPORetentionRow | null = null
  let finalMilestone: VendorPOFinalMilestoneRow | null = null

  for (const m of po.milestones) {
    const kind = m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
    if (kind === 'retention') {
      retention = { percentage: m.percentage, amount: m.value }
      continue
    }
    if (kind === 'final') {
      finalMilestone = {
        name: m.name,
        percentage: m.percentage,
        amount: m.value,
      }
      continue
    }
    milestones.push({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    })
  }

  return { milestones, retention, finalMilestone }
}

export function buildVendorPOMilestonePayloadForUpdate(
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
  finalMilestone: VendorPOFinalMilestoneRow | null,
  existingMilestones: import('@/slices/baseline/reducer').VendorPOMilestone[],
): import('@/slices/baseline/reducer').VendorPOMilestone[] {
  const existingById = new Map(existingMilestones.map((m) => [m.id, m]))
  const existingRetention = existingMilestones.find(
    (m) => m.kind === 'retention' || m.name.trim().toLowerCase() === 'retention',
  )
  const existingFinal = existingMilestones.find((m) => m.kind === 'final')

  const rows: import('@/slices/baseline/reducer').VendorPOMilestone[] = milestones
    .filter((m) => m.name.trim())
    .map((m) => {
      const prev = existingById.get(m.id)
      return {
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        value: m.value,
        dueDate: prev?.dueDate ?? null,
        status: prev?.status ?? 'Pending',
        kind: 'regular' as const,
      }
    })

  if (retention && (retention.percentage > 0 || retention.amount > 0)) {
    rows.push({
      id: existingRetention?.id ?? `vpo-ret-${Date.now()}`,
      name: existingRetention?.name ?? 'Retention',
      percentage: retention.percentage,
      value: retention.amount,
      dueDate: existingRetention?.dueDate ?? null,
      status: existingRetention?.status ?? 'Pending',
      kind: 'retention',
    })
  }

  if (
    finalMilestone &&
    finalMilestone.name.trim() &&
    (finalMilestone.percentage > 0 || finalMilestone.amount > 0)
  ) {
    rows.push({
      id: existingFinal?.id ?? `vpo-final-${Date.now()}`,
      name: finalMilestone.name.trim(),
      percentage: finalMilestone.percentage,
      value: finalMilestone.amount,
      dueDate: existingFinal?.dueDate ?? null,
      status: existingFinal?.status ?? 'Pending',
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
