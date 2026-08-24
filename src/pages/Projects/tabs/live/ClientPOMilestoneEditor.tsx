import {
  Alert,
  Box,
  Button as MuiButton,
  Chip as MuiChip,
  IconButton as MuiIconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { tokens } from '@/design-system/tokens'
import type { ClientPOMilestone, ClientPORetention } from '@/slices/baseline/reducer'
import type { ClientInvoice } from '@/slices/live/types'
import {
  CLIENT_PO_MILESTONE_PCT_EPS,
  balanceLabel,
  validateClientPOMilestonePercents,
} from '@/utils/clientPOMilestones'
import {
  serviceNameForOption,
  type ClientPOServiceOption,
} from './clientPOServiceOptions'
import { recalculateClientPOMilestonesForExecutedValue } from './poExecutedValueRules'
import { parseRateInput, rateInputDisplay, selectRateInputOnFocus } from './rateInput'

// Simple 3-column grid: Name | % | Value(₹)  +  optional delete column
const INPUT_ROW_COLS = 'minmax(0,1fr) 80px 96px'
const INPUT_ROW_COLS_WITH_DELETE = 'minmax(0,1fr) 80px 96px 32px'

function FieldLabelRow({ leftLabel, withDelete = false }: { leftLabel: string; withDelete?: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: withDelete ? INPUT_ROW_COLS_WITH_DELETE : INPUT_ROW_COLS,
        gap: 1,
        px: 1.5,
        pt: 1,
        pb: 0.25,
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
        {leftLabel}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textAlign: 'right' }}>
        %
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textAlign: 'right' }}>
        Value (₹)
      </Typography>
      {withDelete && <Box />}
    </Box>
  )
}

function calcValue(poValue: number, percentage: number): number {
  if (!poValue || !percentage) return 0
  return Math.round((percentage / 100) * poValue)
}

function calcPercentage(poValue: number, value: number): number {
  if (!poValue || !value) return 0
  return Math.round((value / poValue) * 100)
}

function emptyMilestoneRow(): ClientPOMilestone {
  return {
    id: `cpm-${Date.now()}`,
    serviceId: '',
    serviceName: '',
    name: '',
    percentage: 0,
    value: 0,
  }
}

export function milestonePayloadFromEditor(milestones: ClientPOMilestone[]): ClientPOMilestone[] {
  return milestones
    .filter((m) => m.name.trim())
    .map((m) => ({
      id: m.id,
      serviceId: m.serviceId,
      serviceName: m.serviceName,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
      ...(m.retention ? { retention: { ...m.retention } } : {}),
    }))
}

export function validateNamedMilestones(
  milestones: ClientPOMilestone[],
  showError: (message: string) => void,
  requireService: boolean,
): boolean {
  const named = milestones.filter((m) => m.name.trim())
  if (requireService && named.some((m) => !m.serviceId)) {
    showError('Select a service for each milestone')
    return false
  }
  const validation = validateClientPOMilestonePercents(milestones)
  if (!validation.valid && validation.pctMessage) {
    showError(validation.pctMessage)
    return false
  }
  return true
}

interface ClientPOMilestoneEditorProps {
  poValue: number
  milestones: ClientPOMilestone[]
  onChange: (next: ClientPOMilestone[]) => void
  serviceOptions: ClientPOServiceOption[]
  hideServiceColumn?: boolean
  disabled?: boolean
  /** When false, hides Add Milestone (edit PO). Default true. */
  allowAddMilestone?: boolean
  lockedMilestoneIds?: Set<string>
  lockedRetentionIds?: Set<string>
}

// RetentionRow: simple 3-col row matching the milestone input row, with delete icon
function RetentionRow({
  retention,
  poValue,
  onUpdate,
  onRemove,
  disabled = false,
}: {
  retention: ClientPORetention
  poValue: number
  onUpdate: (patch: Partial<ClientPORetention>) => void
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: INPUT_ROW_COLS_WITH_DELETE,
        gap: 1,
        alignItems: 'center',
        px: 1.5,
        pb: 1,
      }}
    >
      <TextField
        size="small"
        fullWidth
        value="Retention"
        disabled
        sx={{ minWidth: 0 }}
        inputProps={{ style: { fontSize: 12 } }}
      />
      <TextField
        size="small"
        type="number"
        value={rateInputDisplay(retention.percentage)}
        sx={{ minWidth: 0 }}
        onChange={(e) => {
          const percentage = parseRateInput(e.target.value)
          onUpdate({ percentage, value: calcValue(poValue, percentage) })
        }}
        onFocus={selectRateInputOnFocus}
        disabled={disabled}
        inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
        placeholder="%"
      />
      <TextField
        size="small"
        type="number"
        value={rateInputDisplay(retention.value)}
        sx={{ minWidth: 0 }}
        onChange={(e) => {
          const value = parseRateInput(e.target.value)
          onUpdate({ value, percentage: calcPercentage(poValue, value) })
        }}
        onFocus={selectRateInputOnFocus}
        disabled={disabled}
        inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
        placeholder="₹"
      />
      {disabled ? (
        <Box sx={{ width: 32, justifySelf: 'center' }} />
      ) : (
        <MuiIconButton
          size="small"
          aria-label="Remove retention"
          onClick={onRemove}
          sx={{ color: 'error.main', p: '2px', justifySelf: 'center' }}
        >
          <Delete sx={{ fontSize: 14 }} />
        </MuiIconButton>
      )}
    </Box>
  )
}

export function ClientPOMilestoneEditor({
  poValue,
  milestones,
  onChange,
  serviceOptions,
  hideServiceColumn = false,
  disabled = false,
  allowAddMilestone = true,
  lockedMilestoneIds,
  lockedRetentionIds,
}: ClientPOMilestoneEditorProps) {
  const theme = useTheme()
  const validation = validateClientPOMilestonePercents(milestones)
  const totalPct = validation.currentPct
  const isBalanced = Math.abs(totalPct - 100) < CLIENT_PO_MILESTONE_PCT_EPS
  const namedMilestones = milestones.filter((m) => m.name.trim())
  const hasBreakdown = namedMilestones.length > 0 || milestones.some((m) => m.retention)

  const categoryOptions = Array.from(
    new Map(
      serviceOptions
        .filter((o) => Boolean(o.categoryId))
        .map((o) => [o.categoryId, o.categoryName] as const),
    ),
  )
    .map(([id, name]) => ({ id, label: name || id }))
    .sort((a, b) => a.label.localeCompare(b.label))

  function updateMilestone(idx: number, patch: Partial<ClientPOMilestone>): void {
    const next = [...milestones]
    next[idx] = { ...next[idx], ...patch }
    if (patch.serviceId !== undefined) {
      next[idx].serviceName = serviceNameForOption(serviceOptions, patch.serviceId)
    }
    if (patch.percentage !== undefined) {
      next[idx].value = calcValue(poValue, Number(patch.percentage))
    } else if (patch.value !== undefined) {
      next[idx].percentage = calcPercentage(poValue, Number(patch.value))
    }
    onChange(next)
  }

  function updateRetention(idx: number, patch: Partial<ClientPORetention>): void {
    const current = milestones[idx].retention
    if (!current) return
    const next = [...milestones]
    next[idx] = {
      ...next[idx],
      retention: { ...current, ...patch },
    }
    onChange(next)
  }

  function addMilestoneRow(): void {
    const defaultService = serviceOptions[0]
    onChange([
      ...milestones,
      {
        ...emptyMilestoneRow(),
        id: `cpm-${Date.now()}-${milestones.length}`,
        serviceId: defaultService?.id ?? '',
        serviceName: defaultService?.label ?? '',
      },
    ])
  }

  function removeMilestone(idx: number): void {
    onChange(milestones.filter((_, i) => i !== idx))
  }

  function addRetention(idx: number): void {
    if (milestones[idx].retention) return
    const next = [...milestones]
    next[idx] = {
      ...next[idx],
      retention: { percentage: 0, value: 0 },
    }
    onChange(next)
  }

  function removeRetention(idx: number): void {
    const next = [...milestones]
    next[idx] = { ...next[idx], retention: undefined }
    onChange(next)
  }

  return (
    <Box>
      <Typography
        component="span"
        variant="overline"
        sx={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: 'text.secondary', display: 'block', mb: 1 }}
      >
        Milestones
      </Typography>

      <Box>
        {milestones.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 12, py: 1, textAlign: 'center' }}
          >
            {allowAddMilestone
              ? 'No milestones yet. Click Add Milestone to create one.'
              : 'No milestones yet.'}
          </Typography>
        ) : (
          milestones.map((m, idx) => {
            const mileLocked = lockedMilestoneIds?.has(m.id) ?? false
            const retLocked = lockedRetentionIds?.has(m.id) ?? false
            const rowDisabled = disabled || mileLocked
            const rowServiceOpt = serviceOptions.find((o) => o.id === m.serviceId)
            const rowCategoryId = rowServiceOpt?.categoryId ?? ''
            const rowServiceOptions = serviceOptions.filter((o) => o.categoryId === rowCategoryId)

            return (
              <Box
                key={m.id}
                sx={{
                  border: `1px solid ${tokens.color.neutral[100]}`,
                  borderRadius: 1.5,
                  mb: 1.5,
                  overflow: 'hidden',
                }}
              >
                {/* Category + Service dropdowns row with delete icon */}
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{ px: 1.5, pt: 1, pb: 1 }}
                >
                  {!hideServiceColumn ? (
                    <>
                      <Select
                        size="small"
                        displayEmpty
                        value={rowCategoryId}
                        onChange={(e) => {
                          const nextCategoryId = String(e.target.value)
                          const nextService = serviceOptions.find((o) => o.categoryId === nextCategoryId)
                          updateMilestone(idx, { serviceId: nextService?.id ?? '' })
                        }}
                        disabled={rowDisabled}
                        sx={{ fontSize: 12, flex: 1, minWidth: 0 }}
                      >
                        <MenuItem value="" sx={{ fontSize: 12 }}>Category</MenuItem>
                        {categoryOptions.map((c) => (
                          <MenuItem key={c.id} value={c.id} sx={{ fontSize: 12 }}>{c.label}</MenuItem>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        displayEmpty
                        value={m.serviceId}
                        onChange={(e) => updateMilestone(idx, { serviceId: String(e.target.value) })}
                        disabled={rowDisabled}
                        sx={{ fontSize: 12, flex: 1, minWidth: 0 }}
                      >
                        <MenuItem value="" sx={{ fontSize: 12 }}>Service</MenuItem>
                        {rowServiceOptions.map((opt) => (
                          <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: 12 }}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                    </>
                  ) : null}
                  {mileLocked ? (
                    <Box sx={{ width: 32, flexShrink: 0 }} />
                  ) : (
                    <MuiIconButton
                      size="small"
                      aria-label="Remove milestone"
                      onClick={() => removeMilestone(idx)}
                      disabled={disabled}
                      sx={{ color: 'error.main', p: '4px', flexShrink: 0 }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </MuiIconButton>
                  )}
                </Stack>

                {/* Milestone Name / % / Value row */}
                <FieldLabelRow leftLabel="Milestone Name" />
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: INPUT_ROW_COLS,
                    gap: 1,
                    px: 1.5,
                    pb: 1,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    sx={{ minWidth: 0 }}
                    value={m.name}
                    onChange={(e) => updateMilestone(idx, { name: e.target.value })}
                    placeholder="Milestone name"
                    disabled={rowDisabled}
                    inputProps={{ style: { fontSize: 12 } }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={rateInputDisplay(m.percentage)}
                    sx={{ minWidth: 0 }}
                    onChange={(e) => updateMilestone(idx, { percentage: parseRateInput(e.target.value) })}
                    onFocus={selectRateInputOnFocus}
                    disabled={rowDisabled}
                    inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
                    placeholder="%"
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={rateInputDisplay(m.value)}
                    sx={{ minWidth: 0 }}
                    onChange={(e) => updateMilestone(idx, { value: parseRateInput(e.target.value) })}
                    onFocus={selectRateInputOnFocus}
                    disabled={rowDisabled}
                    inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
                    placeholder="₹"
                  />
                </Box>

                {/* Retention section */}
                {m.retention ? (
                  <>
                    <FieldLabelRow leftLabel="Retention" withDelete />
                    <RetentionRow
                      retention={m.retention}
                      poValue={poValue}
                      onUpdate={(patch) => updateRetention(idx, patch)}
                      onRemove={() => removeRetention(idx)}
                      disabled={disabled || retLocked}
                    />
                  </>
                ) : (
                  <Box sx={{ px: 1.5, pb: 1 }}>
                    <MuiButton
                      size="small"
                      variant="text"
                      startIcon={<Add sx={{ fontSize: 13 }} />}
                      onClick={() => addRetention(idx)}
                      disabled={disabled}
                      sx={{
                        fontSize: 11,
                        color: 'primary.main',
                        py: 0.25,
                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                      }}
                    >
                      Add Retention
                    </MuiButton>
                  </Box>
                )}
              </Box>
            )
          })
        )}
      </Box>

      {allowAddMilestone ? (
        <MuiButton
          size="small"
          variant="outlined"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={addMilestoneRow}
          disabled={disabled || serviceOptions.length === 0}
          sx={{ fontSize: 11, mt: 1 }}
        >
          Add Milestone
        </MuiButton>
      ) : null}

      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mt: 1.5 }}>
        Total of milestones and retention must equal 100%.
      </Typography>

      {!validation.valid && hasBreakdown && validation.pctMessage ? (
        <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>
          {validation.pctMessage}
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

/** Recalculate milestone amounts when PO / executed value changes.
 * Paid milestones (by invoice status) keep percentage and value locked.
 */
export function applyPoValueToMilestones(
  milestones: ClientPOMilestone[],
  poValue: number,
  invoices: ClientInvoice[] = [],
): ClientPOMilestone[] {
  if (poValue <= 0) return milestones
  return recalculateClientPOMilestonesForExecutedValue(milestones, poValue, invoices)
}
