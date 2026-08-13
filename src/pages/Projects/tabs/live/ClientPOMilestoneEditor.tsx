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

const MILESTONE_GRID_COLUMNS_WITH_SERVICE =
  'minmax(120px, 1fr) minmax(0, 1fr) 72px 96px 36px'

const MILESTONE_GRID_COLUMNS_NO_SERVICE = 'minmax(0, 1fr) 72px 96px 36px'

const MILESTONE_HEADER_LABELS_WITH_SERVICE = [
  'Service',
  'Milestone Name',
  'Percentage (%)',
  'Value (₹)',
  'Action',
] as const

const MILESTONE_HEADER_LABELS_NO_SERVICE = [
  'Milestone Name',
  'Percentage (%)',
  'Value (₹)',
  'Action',
] as const

function milestoneGridColumns(hideServiceColumn: boolean): string {
  return hideServiceColumn
    ? MILESTONE_GRID_COLUMNS_NO_SERVICE
    : MILESTONE_GRID_COLUMNS_WITH_SERVICE
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
}

function MilestoneEditorHeader({ hideServiceColumn = false }: { hideServiceColumn?: boolean }) {
  const labels = hideServiceColumn
    ? MILESTONE_HEADER_LABELS_NO_SERVICE
    : MILESTONE_HEADER_LABELS_WITH_SERVICE
  const pctIdx = hideServiceColumn ? 1 : 2
  const valueIdx = hideServiceColumn ? 2 : 3
  const actionIdx = hideServiceColumn ? 3 : 4

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: milestoneGridColumns(hideServiceColumn),
        gap: 1,
        alignItems: 'center',
        px: 1.5,
        py: 1,
        bgcolor: tokens.color.neutral[50],
        borderBottom: `1px solid ${tokens.color.neutral[100]}`,
      }}
    >
      {labels.map((label, i) => (
        <Typography
          key={label}
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color.neutral[500],
            letterSpacing: 0.5,
            textAlign: i === pctIdx || i === valueIdx ? 'right' : 'left',
            ...(i === actionIdx ? { textAlign: 'center' } : {}),
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  )
}

function RetentionRow({
  retention,
  poValue,
  hideServiceColumn,
  onUpdate,
  onRemove,
}: {
  retention: ClientPORetention
  poValue: number
  hideServiceColumn: boolean
  onUpdate: (patch: Partial<ClientPORetention>) => void
  onRemove: () => void
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: milestoneGridColumns(hideServiceColumn),
        gap: 1,
        alignItems: 'center',
        px: 1.5,
        pb: 1,
      }}
    >
      {!hideServiceColumn ? <Box /> : null}
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
        <MuiChip
          label="Retention"
          size="small"
          sx={{ height: 20, fontSize: 9, fontWeight: 600, flexShrink: 0 }}
        />
        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
          Retention
        </Typography>
      </Stack>
      <TextField
        size="small"
        type="number"
        value={rateInputDisplay(retention.percentage)}
        onChange={(e) => {
          const percentage = parseRateInput(e.target.value)
          onUpdate({
            percentage,
            value: calcValue(poValue, percentage),
          })
        }}
        onFocus={selectRateInputOnFocus}
        inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
        placeholder="%"
      />
      <TextField
        size="small"
        type="number"
        value={rateInputDisplay(retention.value)}
        onChange={(e) => {
          const value = parseRateInput(e.target.value)
          onUpdate({
            value,
            percentage: calcPercentage(poValue, value),
          })
        }}
        onFocus={selectRateInputOnFocus}
        inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
        placeholder="₹"
      />
      <MuiIconButton
        size="small"
        aria-label="Remove retention"
        onClick={onRemove}
        sx={{ color: 'error.main', p: '2px', justifySelf: 'center' }}
      >
        <Delete sx={{ fontSize: 14 }} />
      </MuiIconButton>
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
}: ClientPOMilestoneEditorProps) {
  const theme = useTheme()
  const validation = validateClientPOMilestonePercents(milestones)
  const totalPct = validation.currentPct
  const isBalanced = Math.abs(totalPct - 100) < CLIENT_PO_MILESTONE_PCT_EPS
  const namedMilestones = milestones.filter((m) => m.name.trim())
  const hasBreakdown = namedMilestones.length > 0 || milestones.some((m) => m.retention)

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
    const { retention: _removed, ...rest } = next[idx]
    next[idx] = rest as ClientPOMilestone
    onChange(next)
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography
          component="span"
          variant="overline"
          sx={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.8,
            color: 'text.secondary',
          }}
        >
          Milestones
        </Typography>
        <MuiButton
          size="small"
          variant="outlined"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={addMilestoneRow}
          disabled={disabled || serviceOptions.length === 0}
          sx={{ fontSize: 11 }}
        >
          Add Milestone
        </MuiButton>
      </Stack>

      <Box
        sx={{
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: 1.5,
          overflow: 'hidden',
        }}
      >
        <MilestoneEditorHeader hideServiceColumn={hideServiceColumn} />

        {milestones.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 12, py: 2, px: 1.5, textAlign: 'center' }}
          >
            No milestones yet. Click Add Milestone to create one.
          </Typography>
        ) : (
          milestones.map((m, idx) => (
            <Box
              key={m.id}
              sx={{
                borderBottom:
                  idx < milestones.length - 1
                    ? `1px solid ${tokens.color.neutral[100]}`
                    : 'none',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: milestoneGridColumns(hideServiceColumn),
                  gap: 1,
                  alignItems: 'center',
                  px: 1.5,
                  py: 1,
                }}
              >
                {!hideServiceColumn ? (
                  <Select
                    size="small"
                    fullWidth
                    displayEmpty
                    value={m.serviceId}
                    onChange={(e) => updateMilestone(idx, { serviceId: e.target.value })}
                    disabled={disabled}
                    sx={{ fontSize: 12 }}
                  >
                    <MenuItem value="" sx={{ fontSize: 12 }}>
                      Select service
                    </MenuItem>
                    {serviceOptions.map((opt) => (
                      <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: 12 }}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                ) : null}
                <TextField
                  size="small"
                  fullWidth
                  value={m.name}
                  onChange={(e) => updateMilestone(idx, { name: e.target.value })}
                  placeholder="Milestone name"
                  disabled={disabled}
                  inputProps={{ style: { fontSize: 12 } }}
                />
                <TextField
                  size="small"
                  type="number"
                  value={rateInputDisplay(m.percentage)}
                  onChange={(e) =>
                    updateMilestone(idx, { percentage: parseRateInput(e.target.value) })
                  }
                  onFocus={selectRateInputOnFocus}
                  disabled={disabled}
                  inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
                  placeholder="%"
                />
                <TextField
                  size="small"
                  type="number"
                  value={rateInputDisplay(m.value)}
                  onChange={(e) =>
                    updateMilestone(idx, { value: parseRateInput(e.target.value) })
                  }
                  onFocus={selectRateInputOnFocus}
                  disabled={disabled}
                  inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
                  placeholder="₹"
                />
                <MuiIconButton
                  size="small"
                  aria-label="Remove milestone"
                  onClick={() => removeMilestone(idx)}
                  disabled={disabled}
                  sx={{ color: 'error.main', p: '2px', justifySelf: 'center' }}
                >
                  <Delete sx={{ fontSize: 14 }} />
                </MuiIconButton>
              </Box>

              {m.retention ? (
                <RetentionRow
                  retention={m.retention}
                  poValue={poValue}
                  hideServiceColumn={hideServiceColumn}
                  onUpdate={(patch) => updateRetention(idx, patch)}
                  onRemove={() => removeRetention(idx)}
                />
              ) : (
                <Box sx={{ px: 1.5, pb: 1 }}>
                  <MuiButton
                    size="small"
                    variant="text"
                    startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={() => addRetention(idx)}
                    disabled={disabled}
                    sx={{
                      fontSize: 11,
                      color: 'primary.main',
                      ml: hideServiceColumn ? 1 : 2,
                      py: 0.25,
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                    }}
                  >
                    Add Retention Milestone
                  </MuiButton>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>

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
