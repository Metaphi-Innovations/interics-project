import type { ReactNode } from 'react'
import {
  Autocomplete,
  Box,
  IconButton as MuiIconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Trash2 } from 'lucide-react'
import { tokens } from '@/design-system/tokens'
import { ROW_ICON_ACTION_BUTTON_DANGER_SX } from '@/components/listing/rowIconActionStyles'
import { VENDOR_MILESTONE_PCT_EPS } from '@/utils/vendorMilestones'
import {
  VendorPOMilestoneEditor,
  CardAlignedRow,
  CARD_CATEGORY_ALIGN_GRID,
  CARD_FIELD_GAP,
  cardMilestoneRowGrid,
  createEmptyVendorPOMilestoneRow,
  type VendorPOMilestoneRow,
} from './VendorPOMilestoneEditor'
import type { MilestonePaymentStatusLabel } from './milestonePaymentStatus'
import type { VendorPOMilestone } from '@/slices/baseline/reducer'
import { parseRateInput, rateInputDisplay, selectRateInputOnFocus } from './rateInput'
import type {
  CategoryOption,
  ServiceOption,
  VendorOfferMilestoneCard,
  VendorOfferRetentionCard,
} from './vendorPOCardHydration'

export type {
  CategoryOption,
  ServiceOption,
  VendorOfferMilestoneCard,
  VendorOfferRetentionCard,
} from './vendorPOCardHydration'
export {
  resolveMasterCategoryServiceIds,
  vendorPOCardsFromMilestones,
  flattenVendorPOCardsForEditor,
  mergeExecutedValueIntoVendorPOCards,
} from './vendorPOCardHydration'

const CARD_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: tokens.borderRadius.lg,
  bgcolor: 'background.paper',
  overflow: 'hidden',
} as const

const MILESTONE_FIELD_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
} as const

function CardValueFieldHeader({ nameLabel }: { nameLabel: string }) {
  return (
    <CardAlignedRow>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cardMilestoneRowGrid(false),
          gap: CARD_FIELD_GAP,
          alignItems: 'end',
          mb: 0.5,
        }}
      >
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          {nameLabel}
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          %
        </Typography>
        <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
          Value (₹)
        </Typography>
      </Box>
    </CardAlignedRow>
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

function newCardId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultCategoryService(
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
): { categoryId: string; serviceId: string } {
  const categoryId = categoryOptions[0]?.id ?? ''
  const serviceId = serviceOptions.find((s) => s.categoryId === categoryId)?.id ?? ''
  return { categoryId, serviceId }
}

export function createVendorOfferMilestoneCard(
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
): VendorOfferMilestoneCard {
  const { categoryId, serviceId } = defaultCategoryService(categoryOptions, serviceOptions)
  return {
    id: newCardId('milestone-card'),
    categoryId,
    serviceId,
    milestones: [createEmptyVendorPOMilestoneRow()],
    retention: null,
  }
}

export function createVendorOfferRetentionCard(
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
): VendorOfferRetentionCard {
  const { categoryId, serviceId } = defaultCategoryService(categoryOptions, serviceOptions)
  return {
    id: newCardId('retention-card'),
    categoryId,
    serviceId,
    name: 'Retention',
    percentage: 0,
    value: 0,
  }
}

function ReadOnlyCategoryServiceField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  )
}

function CategoryServiceFields({
  categoryId,
  serviceId,
  categoryOptions,
  serviceOptions,
  onCategoryChange,
  onServiceChange,
  readOnly = false,
}: {
  categoryId: string
  serviceId: string
  categoryOptions: CategoryOption[]
  serviceOptions: ServiceOption[]
  onCategoryChange: (categoryId: string, serviceId: string) => void
  onServiceChange: (serviceId: string) => void
  readOnly?: boolean
}) {
  const servicesForCategory = serviceOptions.filter((s) => s.categoryId === categoryId)
  const selectedCategory = categoryOptions.find((c) => c.id === categoryId) ?? null
  const selectedService = servicesForCategory.find((s) => s.id === serviceId) ?? null

  if (readOnly) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: CARD_CATEGORY_ALIGN_GRID,
          gap: CARD_FIELD_GAP,
          flex: 1,
          minWidth: 0,
        }}
      >
        <ReadOnlyCategoryServiceField label="Category" value={selectedCategory?.label ?? '—'} />
        <ReadOnlyCategoryServiceField label="Service" value={selectedService?.label ?? '—'} />
      </Box>
    )
  }

  const autocompleteSx = {
    '& .MuiInputBase-root': { fontSize: 12, minHeight: 40 },
    '& .MuiInputBase-input': { fontSize: 12 },
  } as const

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: CARD_CATEGORY_ALIGN_GRID,
        gap: CARD_FIELD_GAP,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Autocomplete
        size="small"
        options={categoryOptions}
        value={selectedCategory}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onChange={(_, next) => {
          const nextCategoryId = next?.id ?? ''
          const firstService = serviceOptions.find((s) => s.categoryId === nextCategoryId)
          onCategoryChange(nextCategoryId, firstService?.id ?? '')
        }}
        renderInput={(params) => (
          <TextField {...params} placeholder="Category" sx={autocompleteSx} />
        )}
        noOptionsText="No categories"
      />
      <Autocomplete
        size="small"
        options={servicesForCategory}
        value={selectedService}
        disabled={!categoryId}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        onChange={(_, next) => onServiceChange(next?.id ?? '')}
        renderInput={(params) => (
          <TextField {...params} placeholder="Service" sx={autocompleteSx} />
        )}
        noOptionsText={categoryId ? 'No services' : 'Select a category first'}
      />
    </Box>
  )
}

function CardHeader({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode
  onRemove: () => void
  removeLabel: string
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      sx={{
        px: 1.5,
        py: 1.25,
        bgcolor: tokens.color.neutral[50],
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {children}
      <MuiIconButton
        size="small"
        aria-label={removeLabel}
        onClick={onRemove}
        sx={ROW_ICON_ACTION_BUTTON_DANGER_SX}
      >
        <Trash2 size={14} strokeWidth={2} />
      </MuiIconButton>
    </Stack>
  )
}

interface MilestoneCardEditorProps {
  card: VendorOfferMilestoneCard
  categoryOptions: CategoryOption[]
  serviceOptions: ServiceOption[]
  milestoneBaseValue: number
  includeRetention?: boolean
  readOnly?: boolean
  /** Global structure lock when any milestone on this PO is invoice-covered. */
  structureLocked?: boolean
  milestoneStatuses?: Record<string, MilestonePaymentStatusLabel>
  retentionStatus?: MilestonePaymentStatusLabel
  onChange: (patch: Partial<VendorOfferMilestoneCard>) => void
  onRemove: () => void
}

export function VendorOfferMilestoneCardEditor({
  card,
  categoryOptions,
  serviceOptions,
  milestoneBaseValue,
  includeRetention = false,
  readOnly = false,
  structureLocked = false,
  milestoneStatuses,
  retentionStatus,
  onChange,
  onRemove,
}: MilestoneCardEditorProps) {
  const lockStructure = readOnly || structureLocked

  return (
    <Box sx={CARD_SX}>
      {lockStructure ? (
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            bgcolor: tokens.color.neutral[50],
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CategoryServiceFields
            categoryId={card.categoryId}
            serviceId={card.serviceId}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            onCategoryChange={() => undefined}
            onServiceChange={() => undefined}
            readOnly
          />
        </Box>
      ) : (
        <CardHeader onRemove={onRemove} removeLabel="Remove milestone card">
          <CategoryServiceFields
            categoryId={card.categoryId}
            serviceId={card.serviceId}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            onCategoryChange={(categoryId, serviceId) => onChange({ categoryId, serviceId })}
            onServiceChange={(serviceId) => onChange({ serviceId })}
          />
        </CardHeader>
      )}
      <Box sx={{ p: 1.5 }}>
        <VendorPOMilestoneEditor
          embedded
          readOnly={readOnly}
          structureLocked={structureLocked}
          regularOnly={!includeRetention}
          cardWithRetention={includeRetention}
          poValue={milestoneBaseValue}
          milestones={card.milestones}
          retention={card.retention ?? null}
          milestoneStatuses={milestoneStatuses}
          retentionStatus={retentionStatus}
          onMilestonesChange={(milestones) => onChange({ milestones })}
          onRetentionChange={(retention) => onChange({ retention })}
        />
      </Box>
    </Box>
  )
}

interface ValueRowCardEditorProps {
  card: VendorOfferRetentionCard
  categoryOptions: CategoryOption[]
  serviceOptions: ServiceOption[]
  milestoneBaseValue: number
  nameLabel: string
  readOnly?: boolean
  onChange: (patch: Partial<VendorOfferRetentionCard>) => void
  onRemove: () => void
  removeLabel: string
}

function ValueRowCardEditor({
  card,
  categoryOptions,
  serviceOptions,
  milestoneBaseValue,
  nameLabel,
  readOnly = false,
  onChange,
  onRemove,
  removeLabel,
}: ValueRowCardEditorProps) {
  function updateField(field: 'name' | 'percentage' | 'value', val: string | number) {
    if (readOnly) return
    if (field === 'name') {
      onChange({ name: String(val) })
      return
    }
    if (field === 'percentage') {
      onChange({
        percentage: Number(val),
        value: calcValue(milestoneBaseValue, Number(val)),
      })
      return
    }
    onChange({
      value: Number(val),
      percentage: calcPercentage(milestoneBaseValue, Number(val)),
    })
  }

  return (
    <Box sx={CARD_SX}>
      {readOnly ? (
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            bgcolor: tokens.color.neutral[50],
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CategoryServiceFields
            categoryId={card.categoryId}
            serviceId={card.serviceId}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            onCategoryChange={() => undefined}
            onServiceChange={() => undefined}
            readOnly
          />
        </Box>
      ) : (
        <CardHeader onRemove={onRemove} removeLabel={removeLabel}>
          <CategoryServiceFields
            categoryId={card.categoryId}
            serviceId={card.serviceId}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            onCategoryChange={(categoryId, serviceId) => onChange({ categoryId, serviceId })}
            onServiceChange={(serviceId) => onChange({ serviceId })}
          />
        </CardHeader>
      )}
      <Box sx={{ p: 1.5 }}>
        <CardValueFieldHeader nameLabel="Milestone Name" />
        <CardAlignedRow>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: cardMilestoneRowGrid(false),
              gap: CARD_FIELD_GAP,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              fullWidth
              value={card.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={nameLabel}
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 }, '& .MuiInputBase-root': { width: '100%' } }}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              value={rateInputDisplay(card.percentage)}
              onChange={(e) => updateField('percentage', parseRateInput(e.target.value))}
              onFocus={selectRateInputOnFocus}
              placeholder="%"
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 }, '& .MuiInputBase-root': { width: '100%' } }}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              value={rateInputDisplay(card.value)}
              onChange={(e) => updateField('value', parseRateInput(e.target.value))}
              onFocus={selectRateInputOnFocus}
              placeholder="₹ VALUE"
              disabled={readOnly}
              sx={{ '& .MuiInputBase-input': { fontSize: 11 }, '& .MuiInputBase-root': { width: '100%' } }}
            />
          </Box>
        </CardAlignedRow>
      </Box>
    </Box>
  )
}

export function VendorOfferRetentionCardEditor(
  props: Omit<ValueRowCardEditorProps, 'nameLabel' | 'removeLabel'> & {
    card: VendorOfferRetentionCard
    onChange: (patch: Partial<VendorOfferRetentionCard>) => void
  },
) {
  return (
    <ValueRowCardEditor
      {...props}
      nameLabel="Retention name"
      removeLabel="Remove retention card"
    />
  )
}

export interface GroupedServiceMilestones {
  serviceId: string
  categoryId: string
  milestones: VendorPOMilestoneRow[]
  retentions: VendorOfferRetentionCard[]
}

export function isMilestoneCardConfigured(card: VendorOfferMilestoneCard): boolean {
  return Boolean(
    card.categoryId &&
      card.serviceId &&
      card.milestones.some((m) => m.name.trim()),
  )
}

export function isRetentionCardConfigured(card: VendorOfferRetentionCard): boolean {
  return Boolean(
    card.categoryId &&
      card.serviceId &&
      card.name.trim() &&
      (card.percentage > 0 || card.value > 0),
  )
}

export function groupAllCardsByService(
  milestoneCards: VendorOfferMilestoneCard[],
  retentionCards: VendorOfferRetentionCard[],
): GroupedServiceMilestones[] {
  const map = new Map<string, GroupedServiceMilestones>()

  function ensure(serviceId: string, categoryId: string): GroupedServiceMilestones {
    const existing = map.get(serviceId)
    if (existing) return existing
    const group: GroupedServiceMilestones = {
      serviceId,
      categoryId,
      milestones: [],
      retentions: [],
    }
    map.set(serviceId, group)
    return group
  }

  for (const card of milestoneCards) {
    if (!card.serviceId || !card.categoryId) continue
    ensure(card.serviceId, card.categoryId).milestones.push(...card.milestones)
  }
  for (const card of retentionCards) {
    if (!card.serviceId || !card.categoryId) continue
    ensure(card.serviceId, card.categoryId).retentions.push(card)
  }

  return Array.from(map.values())
}

export function isGroupedServiceValid(
  milestoneBaseValue: number,
  group: GroupedServiceMilestones,
): boolean {
  const totalPct =
    group.milestones.reduce((sum, m) => sum + m.percentage, 0) +
    group.retentions.reduce((sum, m) => sum + m.percentage, 0)

  const hasEntries =
    group.milestones.length > 0 ||
    group.retentions.length > 0

  if (!hasEntries) return true
  if (milestoneBaseValue <= 0) return false
  return Math.abs(totalPct - 100) < VENDOR_MILESTONE_PCT_EPS
}

export function buildVendorPOMilestonePayloadFromGroup(
  group: GroupedServiceMilestones,
): VendorPOMilestone[] {
  const rows: VendorPOMilestone[] = group.milestones
    .filter((m) => m.name.trim())
    .map((m) => ({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
      dueDate: null,
      status: 'Pending' as const,
      kind: 'regular' as const,
      serviceId: group.serviceId,
    }))

  for (const retention of group.retentions) {
    if (!retention.name.trim() || (retention.percentage <= 0 && retention.value <= 0)) continue
    rows.push({
      id: `vpo-ret-${retention.id}`,
      name: retention.name.trim(),
      percentage: retention.percentage,
      value: retention.value,
      dueDate: null,
      status: 'Pending',
      kind: 'retention',
      serviceId: group.serviceId,
    })
  }

  return rows
}

/** Map milestone/retention row ids → service id from card editor state (for GST persistence). */
export function milestoneServiceIdsFromCards(
  milestoneCards: VendorOfferMilestoneCard[],
  retentionCards: VendorOfferRetentionCard[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const card of milestoneCards) {
    const serviceId = card.serviceId?.trim()
    if (!serviceId) continue
    for (const m of card.milestones) {
      if (m.id?.trim()) map.set(m.id.trim(), serviceId)
    }
  }
  for (const retention of retentionCards) {
    const serviceId = retention.serviceId?.trim()
    if (!serviceId) continue
    const id = retention.id?.trim()
    if (id) {
      map.set(id, serviceId)
      map.set(`vpo-ret-${id}`, serviceId)
    }
  }
  return map
}

/**
 * Build a single Vendor PO milestone payload for the whole offer:
 * all service milestones + each retention card exactly once.
 */
export function buildVendorOfferGlobalMilestonePayload(
  milestoneCards: VendorOfferMilestoneCard[],
  retentionCards: VendorOfferRetentionCard[],
): VendorPOMilestone[] {
  const rows: VendorPOMilestone[] = []
  for (const card of milestoneCards) {
    for (const m of card.milestones) {
      if (!m.name.trim()) continue
      rows.push({
        id: m.id,
        name: m.name,
        percentage: m.percentage,
        value: m.value,
        dueDate: null,
        status: 'Pending',
        kind: 'regular',
        serviceId: card.serviceId,
      })
    }
  }
  for (const retention of retentionCards) {
    if (!retention.name.trim() || (retention.percentage <= 0 && retention.value <= 0)) continue
    rows.push({
      id: `vpo-ret-${retention.id}`,
      name: retention.name.trim(),
      percentage: retention.percentage,
      value: retention.value,
      dueDate: null,
      status: 'Pending',
      kind: 'retention',
      serviceId: retention.serviceId,
    })
  }
  return rows
}
