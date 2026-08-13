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
import type { MilestonePaymentStatusLabel } from './milestonePaymentStatus'
import { VENDOR_MILESTONE_PCT_EPS, validateVendorMilestonePercents } from '@/utils/vendorMilestones'
import type { VendorMapping, VendorMilestone } from '@/slices/pitch/reducer'
import { parseRateInput, rateInputDisplay, selectRateInputOnFocus } from './rateInput'

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

interface VendorPOMilestoneEditorProps {
  poValue: number
  milestones: VendorPOMilestoneRow[]
  retention: VendorPORetentionRow | null
  onMilestonesChange: (next: VendorPOMilestoneRow[]) => void
  onRetentionChange: (next: VendorPORetentionRow | null) => void
  /** Lighter styling when nested inside a service card. */
  embedded?: boolean
  /** When true, only render the regular milestones table (no retention). */
  regularOnly?: boolean
  /** Embedded card: milestones table plus aligned retention row. */
  cardWithRetention?: boolean
  /** Lock structure and all fields (preview / read-only mode). */
  readOnly?: boolean
  /**
   * Lock names and add/remove controls, but allow editing % / value
   * for unpaid milestones (e.g. Update Executed Value).
   */
  structureLocked?: boolean
  /** Optional payment status per milestone row id (regular rows only). */
  milestoneStatuses?: Record<string, MilestonePaymentStatusLabel>
  retentionStatus?: MilestonePaymentStatusLabel
}

const GRID_COLUMNS = 'repeat(3, minmax(0, 1fr)) 28px'
/** Two-column header row — Category | Service. */
export const CARD_CATEGORY_ALIGN_GRID = 'repeat(2, minmax(0, 1fr))'
/** Milestone row: equal-width name | % | value columns. */
export const CARD_MILESTONE_ROW_GRID = 'repeat(3, minmax(0, 1fr))'
const CARD_MILESTONE_ROW_GRID_WITH_ACTION = 'repeat(3, minmax(0, 1fr)) 28px'
const CARD_STATUS_COL = '56px'
const CARD_MILESTONE_ROW_GRID_WITH_STATUS = `repeat(3, minmax(0, 1fr)) ${CARD_STATUS_COL}`
const CARD_MILESTONE_ROW_GRID_WITH_STATUS_AND_ACTION =
  `repeat(3, minmax(0, 1fr)) ${CARD_STATUS_COL} 28px`
export const CARD_FIELD_GAP = 1.5
/** Matches CardHeader delete IconButton slot so fields line up with category row. */
export const CARD_HEADER_ACTION_SLOT = 34

export function cardMilestoneRowGrid(showAction: boolean, showStatus = false): string {
  if (showStatus) {
    return showAction
      ? CARD_MILESTONE_ROW_GRID_WITH_STATUS_AND_ACTION
      : CARD_MILESTONE_ROW_GRID_WITH_STATUS
  }
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

export function CardAlignedRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <Box aria-hidden sx={{ width: CARD_HEADER_ACTION_SLOT, flexShrink: 0 }} />
    </Stack>
  )
}

function MilestoneStatusDisplay({
  status,
}: {
  status?: import('./milestonePaymentStatus').MilestonePaymentStatusLabel
}) {
  if (!status) {
    return (
      <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
        —
      </Typography>
    )
  }
  return (
    <Typography
      variant="body2"
      sx={{
        fontSize: 11,
        fontWeight: 600,
        color: status === 'Paid' ? 'success.main' : 'text.secondary',
      }}
    >
      {status}
    </Typography>
  )
}

function CardMilestoneFieldHeader({
  showActionColumn,
  showStatusColumn,
}: {
  showActionColumn: boolean
  showStatusColumn: boolean
}) {
  return (
    <CardAlignedRow>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cardMilestoneRowGrid(showActionColumn, showStatusColumn),
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
        {showStatusColumn ? (
          <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
            Status
          </Typography>
        ) : null}
        {showActionColumn ? <Box aria-hidden sx={{ width: 28 }} /> : null}
      </Box>
    </CardAlignedRow>
  )
}

function CardRetentionFieldHeader({
  showActionColumn,
  showStatusColumn,
}: {
  showActionColumn: boolean
  showStatusColumn: boolean
}) {
  return (
    <CardAlignedRow>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cardMilestoneRowGrid(showActionColumn, showStatusColumn),
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
        {showStatusColumn ? (
          <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
            Status
          </Typography>
        ) : null}
        {showActionColumn ? <Box aria-hidden sx={{ width: 28 }} /> : null}
      </Box>
    </CardAlignedRow>
  )
}

export function VendorPOMilestoneEditor({
  poValue,
  milestones,
  retention,
  onMilestonesChange,
  onRetentionChange,
  embedded = false,
  regularOnly = false,
  cardWithRetention = false,
  readOnly = false,
  structureLocked = false,
  milestoneStatuses,
  retentionStatus,
}: VendorPOMilestoneEditorProps) {
  const theme = useTheme()
  const isCardMilestoneList = embedded && (regularOnly || cardWithRetention)
  const showStandaloneRetention = !regularOnly && !cardWithRetention
  const validation = validateVendorMilestonePercents(
    toValidationMapping(poValue, milestones, retention),
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
      : milestones.length > 0 || Boolean(retention)
  const lockStructure = readOnly || structureLocked
  const showActionColumn = !lockStructure && isCardMilestoneList && milestones.length > 1
  const showRetentionActionColumn =
    !lockStructure && (showActionColumn || (cardWithRetention && Boolean(retention)))
  const showStatusColumn = milestoneStatuses !== undefined
  const standaloneGridColumns = lockStructure ? 'repeat(3, minmax(0, 1fr))' : GRID_COLUMNS

  function isMilestonePaid(id: string): boolean {
    return milestoneStatuses?.[id] === 'Paid'
  }

  function isRetentionPaid(): boolean {
    return retentionStatus === 'Paid'
  }

  function isMilestoneFieldDisabled(id: string): boolean {
    return readOnly || isMilestonePaid(id)
  }

  function isRetentionFieldDisabled(): boolean {
    return readOnly || isRetentionPaid()
  }

  function updateMilestone(idx: number, field: keyof VendorPOMilestoneRow, val: string | number) {
    const row = milestones[idx]
    if (!row) return
    if (readOnly || isMilestonePaid(row.id)) return
    if (lockStructure && field === 'name') return
    const next = milestones.map((m, i) => {
      if (i !== idx) return m
      const updated = { ...m, [field]: val }
      if (field === 'percentage') {
        updated.value = calcValue(poValue, Number(val))
      } else if (field === 'value') {
        updated.percentage = calcPercentage(poValue, Number(val))
      }
      return updated
    })
    onMilestonesChange(next)
  }

  function addMilestone() {
    if (lockStructure) return
    onMilestonesChange([...milestones, createEmptyVendorPOMilestoneRow()])
  }

  function removeMilestone(idx: number) {
    if (lockStructure) return
    if (isCardMilestoneList && milestones.length <= 1) return
    const row = milestones[idx]
    if (row && isMilestonePaid(row.id)) return
    const next = milestones.filter((_, i) => i !== idx)
    onMilestonesChange(
      isCardMilestoneList && next.length === 0 ? [createEmptyVendorPOMilestoneRow()] : next,
    )
  }

  function updateRetention(field: 'percentage' | 'amount', val: number) {
    if (readOnly || !retention || isRetentionPaid()) return
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
          <CardMilestoneFieldHeader
            showActionColumn={showActionColumn}
            showStatusColumn={showStatusColumn}
          />
          {milestones.map((m, idx) => {
            const isLast = idx === milestones.length - 1
            const rowDisabled = isMilestoneFieldDisabled(m.id)

            return (
              <CardAlignedRow key={m.id}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: cardMilestoneRowGrid(showActionColumn, showStatusColumn),
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
                    disabled={lockStructure || rowDisabled}
                    sx={MILESTONE_INPUT_SX}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={rateInputDisplay(m.percentage)}
                    onChange={(e) =>
                      updateMilestone(idx, 'percentage', parseRateInput(e.target.value))
                    }
                    onFocus={selectRateInputOnFocus}
                    placeholder="%"
                    disabled={rowDisabled}
                    sx={MILESTONE_INPUT_SX}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    value={rateInputDisplay(m.value)}
                    onChange={(e) =>
                      updateMilestone(idx, 'value', parseRateInput(e.target.value))
                    }
                    onFocus={selectRateInputOnFocus}
                    placeholder="₹ VALUE"
                    disabled={rowDisabled}
                    sx={MILESTONE_INPUT_SX}
                  />
                  {showStatusColumn ? (
                    <MilestoneStatusDisplay status={milestoneStatuses?.[m.id]} />
                  ) : null}
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
                          disabled={isMilestonePaid(m.id)}
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
              <CardRetentionFieldHeader
                showActionColumn={showRetentionActionColumn}
                showStatusColumn={showStatusColumn}
              />
              {!lockStructure && !retention ? (
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
                      gridTemplateColumns: cardMilestoneRowGrid(
                        showRetentionActionColumn,
                        showStatusColumn,
                      ),
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
                      value={rateInputDisplay(retention.percentage)}
                      onChange={(e) =>
                        updateRetention('percentage', parseRateInput(e.target.value))
                      }
                      onFocus={selectRateInputOnFocus}
                      placeholder="%"
                      disabled={isRetentionFieldDisabled()}
                      sx={MILESTONE_INPUT_SX}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={rateInputDisplay(retention.amount)}
                      onChange={(e) =>
                        updateRetention('amount', parseRateInput(e.target.value))
                      }
                      onFocus={selectRateInputOnFocus}
                      placeholder="₹ VALUE"
                      disabled={isRetentionFieldDisabled()}
                      sx={MILESTONE_INPUT_SX}
                    />
                    {showStatusColumn ? (
                      <MilestoneStatusDisplay status={retentionStatus} />
                    ) : null}
                    {showRetentionActionColumn ? (
                      <Box sx={CARD_ACTION_CELL_SX}>
                        <MuiIconButton
                          size="small"
                          aria-label="Remove retention"
                          onClick={() => onRetentionChange(null)}
                          disabled={isRetentionPaid()}
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
          {milestones.map((m, idx) => {
            const rowDisabled = isMilestoneFieldDisabled(m.id)
            return (
              <Fragment key={m.id}>
                <TextField
                  size="small"
                  fullWidth
                  value={m.name}
                  onChange={(e) => updateMilestone(idx, 'name', e.target.value)}
                  placeholder="Milestone name"
                  disabled={lockStructure || rowDisabled}
                  sx={MILESTONE_INPUT_SX}
                />
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  value={rateInputDisplay(m.percentage)}
                  onChange={(e) =>
                    updateMilestone(idx, 'percentage', parseRateInput(e.target.value))
                  }
                  onFocus={selectRateInputOnFocus}
                  placeholder="%"
                  disabled={rowDisabled}
                  sx={MILESTONE_INPUT_SX}
                />
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  value={rateInputDisplay(m.value)}
                  onChange={(e) =>
                    updateMilestone(idx, 'value', parseRateInput(e.target.value))
                  }
                  onFocus={selectRateInputOnFocus}
                  placeholder="₹ VALUE"
                  disabled={rowDisabled}
                  sx={MILESTONE_INPUT_SX}
                />
                {!lockStructure ? (
                  <Box sx={CARD_ACTION_CELL_SX}>
                    <MuiIconButton
                      size="small"
                      aria-label="Remove milestone row"
                      onClick={() => removeMilestone(idx)}
                      disabled={isMilestonePaid(m.id)}
                      sx={{ color: 'error.main', width: 28, height: 28, p: 0.25 }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </MuiIconButton>
                  </Box>
                ) : null}
              </Fragment>
            )
          })}
        </Box>
      )}

      {showStandaloneRetention ? (
        <>
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
        {!lockStructure && !retention ? (
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
              value={rateInputDisplay(retention.percentage)}
              onChange={(e) =>
                updateRetention('percentage', parseRateInput(e.target.value))
              }
              onFocus={selectRateInputOnFocus}
              placeholder="%"
              disabled={isRetentionFieldDisabled()}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            <TextField
              size="small"
              type="number"
              value={rateInputDisplay(retention.amount)}
              onChange={(e) => updateRetention('amount', parseRateInput(e.target.value))}
              onFocus={selectRateInputOnFocus}
              placeholder="₹ VALUE"
              disabled={isRetentionFieldDisabled()}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 } }}
            />
            {!lockStructure ? (
              <MuiIconButton
                size="small"
                onClick={() => onRetentionChange(null)}
                disabled={isRetentionPaid()}
                sx={{ color: 'error.main' }}
              >
                <Delete sx={{ fontSize: 16 }} />
              </MuiIconButton>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mt: 1.5 }}>
        Total of milestones and retention must equal 100%.
      </Typography>

      {!validation.valid && hasBreakdown && showStandaloneRetention && (validation.pctMessage || validation.structureMessage) ? (
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
): import('@/slices/baseline/reducer').VendorPOMilestone[] {
  return buildVendorPOMilestonePayloadForUpdate(
    milestones,
    retention,
    [],
  )
}

export function vendorPOMilestoneEditorStateFromPo(
  po: Pick<import('@/slices/baseline/reducer').VendorPO, 'milestones'>,
): {
  milestones: VendorPOMilestoneRow[]
  retention: VendorPORetentionRow | null
} {
  const milestones: VendorPOMilestoneRow[] = []
  let retention: VendorPORetentionRow | null = null

  for (const m of po.milestones) {
    const kind = m.kind ?? (m.name.trim().toLowerCase() === 'retention' ? 'retention' : 'regular')
    if (kind === 'retention') {
      retention = { percentage: m.percentage, amount: m.value }
      continue
    }
    // Legacy kind === 'final' (and any other non-retention) → regular milestone.
    milestones.push({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    })
  }

  return { milestones, retention }
}

export function buildVendorPOMilestonePayloadForUpdate(
  milestones: VendorPOMilestoneRow[],
  retention: VendorPORetentionRow | null,
  existingMilestones: import('@/slices/baseline/reducer').VendorPOMilestone[],
): import('@/slices/baseline/reducer').VendorPOMilestone[] {
  const existingById = new Map(existingMilestones.map((m) => [m.id, m]))
  const existingRetention = existingMilestones.find(
    (m) => m.kind === 'retention' || m.name.trim().toLowerCase() === 'retention',
  )

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
