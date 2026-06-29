import type { ReactNode } from 'react'
import {
  Box,
  IconButton as MuiIconButton,
  MenuItem,
  Select as MuiSelect,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Delete } from '@mui/icons-material'
import { tokens } from '@/design-system/tokens'
import { VENDOR_MILESTONE_PCT_EPS } from '@/utils/vendorMilestones'
import {
  VendorPOMilestoneEditor,
  createEmptyVendorPOMilestoneRow,
  type VendorPOMilestoneRow,
} from './VendorPOMilestoneEditor'
import type { VendorPOMilestone } from '@/slices/baseline/reducer'

export interface CategoryOption {
  id: string
  label: string
}

export interface ServiceOption {
  id: string
  label: string
  categoryId: string
}

interface ServiceScopedCard {
  id: string
  categoryId: string
  serviceId: string
}

export interface VendorOfferMilestoneCard extends ServiceScopedCard {
  milestones: VendorPOMilestoneRow[]
}

export interface VendorOfferFinalMilestoneCard extends ServiceScopedCard {
  name: string
  percentage: number
  value: number
}

export interface VendorOfferRetentionCard extends ServiceScopedCard {
  name: string
  percentage: number
  value: number
}

const CARD_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: tokens.borderRadius.lg,
  bgcolor: 'background.paper',
  overflow: 'hidden',
} as const

const CARD_VALUE_ROW_GRID = 'minmax(0, 1fr) minmax(0, 1.4fr) 28px'

const MILESTONE_FIELD_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
} as const

function CardValueFieldHeader({ nameLabel }: { nameLabel: string }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 1.5,
        alignItems: 'end',
        mb: 0.5,
      }}
    >
      <Typography variant="caption" sx={MILESTONE_FIELD_HEADER_SX}>
        {nameLabel}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: CARD_VALUE_ROW_GRID,
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
  }
}

export function createVendorOfferFinalMilestoneCard(
  categoryOptions: CategoryOption[],
  serviceOptions: ServiceOption[],
): VendorOfferFinalMilestoneCard {
  const { categoryId, serviceId } = defaultCategoryService(categoryOptions, serviceOptions)
  return {
    id: newCardId('final-card'),
    categoryId,
    serviceId,
    name: '',
    percentage: 0,
    value: 0,
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

function CategoryServiceFields({
  categoryId,
  serviceId,
  categoryOptions,
  serviceOptions,
  onCategoryChange,
  onServiceChange,
}: {
  categoryId: string
  serviceId: string
  categoryOptions: CategoryOption[]
  serviceOptions: ServiceOption[]
  onCategoryChange: (categoryId: string, serviceId: string) => void
  onServiceChange: (serviceId: string) => void
}) {
  const servicesForCategory = serviceOptions.filter((s) => s.categoryId === categoryId)
  const selectedCategory = categoryOptions.find((c) => c.id === categoryId)
  const selectedService = servicesForCategory.find((s) => s.id === serviceId)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1.5,
        flex: 1,
        minWidth: 0,
      }}
    >
      <MuiSelect
        value={categoryId}
        onChange={(e) => {
          const nextCategoryId = e.target.value
          const firstService = serviceOptions.find((s) => s.categoryId === nextCategoryId)
          onCategoryChange(nextCategoryId, firstService?.id ?? '')
        }}
        size="small"
        fullWidth
        displayEmpty
        renderValue={(selected) =>
          selected ? (
            selectedCategory?.label ?? ''
          ) : (
            <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
              Category
            </Typography>
          )
        }
        sx={{ fontSize: 12 }}
      >
        <MenuItem value="" disabled sx={{ fontSize: 12 }}>
          Category
        </MenuItem>
        {categoryOptions.map((c) => (
          <MenuItem key={c.id} value={c.id} sx={{ fontSize: 12 }}>
            {c.label}
          </MenuItem>
        ))}
      </MuiSelect>
      <MuiSelect
        value={serviceId}
        onChange={(e) => onServiceChange(e.target.value)}
        size="small"
        fullWidth
        displayEmpty
        disabled={!categoryId}
        renderValue={(selected) =>
          selected ? (
            selectedService?.label ?? ''
          ) : (
            <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
              Service
            </Typography>
          )
        }
        sx={{ fontSize: 12 }}
      >
        <MenuItem value="" disabled sx={{ fontSize: 12 }}>
          Service
        </MenuItem>
        {servicesForCategory.map((s) => (
          <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
            {s.label}
          </MenuItem>
        ))}
      </MuiSelect>
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
        sx={{ color: 'error.main' }}
      >
        <Delete sx={{ fontSize: 16 }} />
      </MuiIconButton>
    </Stack>
  )
}

interface MilestoneCardEditorProps {
  card: VendorOfferMilestoneCard
  categoryOptions: CategoryOption[]
  serviceOptions: ServiceOption[]
  milestoneBaseValue: number
  onChange: (patch: Partial<VendorOfferMilestoneCard>) => void
  onRemove: () => void
}

export function VendorOfferMilestoneCardEditor({
  card,
  categoryOptions,
  serviceOptions,
  milestoneBaseValue,
  onChange,
  onRemove,
}: MilestoneCardEditorProps) {
  return (
    <Box sx={CARD_SX}>
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
      <Box sx={{ p: 1.5 }}>
        <VendorPOMilestoneEditor
          embedded
          regularOnly
          poValue={milestoneBaseValue}
          milestones={card.milestones}
          retention={null}
          finalMilestone={null}
          onMilestonesChange={(milestones) => onChange({ milestones })}
          onRetentionChange={() => undefined}
          onFinalMilestoneChange={() => undefined}
        />
      </Box>
    </Box>
  )
}

interface ValueRowCardEditorProps {
  card: VendorOfferFinalMilestoneCard | VendorOfferRetentionCard
  categoryOptions: CategoryOption[]
  serviceOptions: ServiceOption[]
  milestoneBaseValue: number
  nameLabel: string
  onChange: (patch: Partial<VendorOfferFinalMilestoneCard>) => void
  onRemove: () => void
  removeLabel: string
}

function ValueRowCardEditor({
  card,
  categoryOptions,
  serviceOptions,
  milestoneBaseValue,
  nameLabel,
  onChange,
  onRemove,
  removeLabel,
}: ValueRowCardEditorProps) {
  function updateField(field: 'name' | 'percentage' | 'value', val: string | number) {
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
      <Box sx={{ p: 1.5 }}>
        <CardValueFieldHeader nameLabel="Milestone Name" />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            fullWidth
            value={card.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder={nameLabel}
            sx={{ '& .MuiInputBase-input': { fontSize: 11 }, '& .MuiInputBase-root': { width: '100%' } }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: CARD_VALUE_ROW_GRID,
              gap: 1,
              alignItems: 'center',
              minWidth: 0,
            }}
          >
            <TextField
              size="small"
              fullWidth
              type="number"
              value={card.percentage}
              onChange={(e) => updateField('percentage', Number(e.target.value))}
              placeholder="%"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 }, '& .MuiInputBase-root': { width: '100%' } }}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              value={card.value}
              onChange={(e) => updateField('value', Number(e.target.value))}
              placeholder="₹ VALUE"
              sx={{ '& .MuiInputBase-input': { fontSize: 11 }, '& .MuiInputBase-root': { width: '100%' } }}
            />
            <Box aria-hidden sx={{ width: 28, height: 28 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export function VendorOfferFinalMilestoneCardEditor(
  props: Omit<ValueRowCardEditorProps, 'nameLabel' | 'removeLabel'> & {
    card: VendorOfferFinalMilestoneCard
    onChange: (patch: Partial<VendorOfferFinalMilestoneCard>) => void
  },
) {
  return (
    <ValueRowCardEditor
      {...props}
      nameLabel="Final milestone name"
      removeLabel="Remove final milestone card"
    />
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
  finalMilestones: VendorOfferFinalMilestoneCard[]
  retentions: VendorOfferRetentionCard[]
}

export function isMilestoneCardConfigured(card: VendorOfferMilestoneCard): boolean {
  return Boolean(
    card.categoryId &&
      card.serviceId &&
      card.milestones.some((m) => m.name.trim()),
  )
}

export function isFinalMilestoneCardConfigured(card: VendorOfferFinalMilestoneCard): boolean {
  return Boolean(
    card.categoryId &&
      card.serviceId &&
      card.name.trim() &&
      (card.percentage > 0 || card.value > 0),
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
  finalCards: VendorOfferFinalMilestoneCard[],
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
      finalMilestones: [],
      retentions: [],
    }
    map.set(serviceId, group)
    return group
  }

  for (const card of milestoneCards) {
    if (!card.serviceId || !card.categoryId) continue
    ensure(card.serviceId, card.categoryId).milestones.push(...card.milestones)
  }
  for (const card of finalCards) {
    if (!card.serviceId || !card.categoryId) continue
    ensure(card.serviceId, card.categoryId).finalMilestones.push(card)
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
    group.finalMilestones.reduce((sum, m) => sum + m.percentage, 0) +
    group.retentions.reduce((sum, m) => sum + m.percentage, 0)

  const hasEntries =
    group.milestones.length > 0 ||
    group.finalMilestones.length > 0 ||
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
    }))

  for (const final of group.finalMilestones) {
    if (!final.name.trim() || (final.percentage <= 0 && final.value <= 0)) continue
    rows.push({
      id: `vpo-final-${final.id}`,
      name: final.name.trim(),
      percentage: final.percentage,
      value: final.value,
      dueDate: null,
      status: 'Pending',
      kind: 'final',
    })
  }

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
    })
  }

  return rows
}
