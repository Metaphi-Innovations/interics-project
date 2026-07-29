import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Autocomplete,
  Box,
  Divider,
  Stack,
  TextField,
  Typography,
  Button as MuiButton,
} from '@mui/material'
import { Add, Upload } from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { useToast, DatePicker, dateFromIso, isoFromDate } from '@/design-system/components'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVendors } from '../../../../slices/vendors/thunk'
import { fetchVersions, updateVendorMapping } from '../../../../slices/pitch/thunk'
import { createVendorPO, fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { fetchCategories, fetchServices } from '../../../../slices/settings/thunk'
import type { PitchService, VendorMapping, VendorMilestone } from '../../../../slices/pitch/reducer'
import { resolveOfferVersionForProject } from './vendorPOHelpers'
import { masterCategoryOptions, masterServiceOptions } from './clientPOServiceOptions'
import {
  VendorOfferMilestoneCardEditor,
  VendorOfferRetentionCardEditor,
  createVendorOfferMilestoneCard,
  createVendorOfferRetentionCard,
  groupAllCardsByService,
  isMilestoneCardConfigured,
  isRetentionCardConfigured,
  buildVendorPOMilestonePayloadFromGroup,
  type VendorOfferMilestoneCard,
  type VendorOfferRetentionCard,
  type GroupedServiceMilestones,
} from './VendorOfferMilestoneCards'

const PO_SECTION_TITLE_SX = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
}

interface ServiceTarget {
  categoryId: string
  categoryName: string
  service: PitchService
}

function listServiceTargets(
  version: { categories: { id: string; categoryName: string; services: PitchService[] }[] } | null,
): ServiceTarget[] {
  if (!version) return []
  const targets: ServiceTarget[] = []
  for (const cat of version.categories) {
    for (const svc of cat.services) {
      if (!svc.subcategoryId && !svc.name) continue
      targets.push({ categoryId: cat.id, categoryName: cat.categoryName, service: svc })
    }
  }
  return targets
}

function pct(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function pitchMappingFromGroup(group: GroupedServiceMilestones): {
  milestones: VendorMilestone[]
  retention?: VendorMapping['retention']
} {
  const milestones = group.milestones
    .filter((m) => m.name.trim())
    .map((m) => ({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    }))

  const firstRetention = group.retentions.find((r) => r.name.trim())

  return {
    milestones,
    retention: firstRetention
      ? { percentage: firstRetention.percentage, amount: firstRetention.value }
      : undefined,
  }
}

function generatePoNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `PO-VND-${stamp}-${String(Date.now()).slice(-4)}`
}

function MilestoneSectionPanel({
  title,
  addLabel,
  onAdd,
  addDisabled,
  isEmpty,
  showAddButton = true,
  children,
}: {
  title: string
  addLabel: string
  onAdd: () => void
  addDisabled?: boolean
  isEmpty: boolean
  showAddButton?: boolean
  children?: ReactNode
}) {
  const theme = useTheme()

  const addButton = showAddButton ? (
    <MuiButton
      size="small"
      variant="outlined"
      startIcon={<Add sx={{ fontSize: 16 }} />}
      onClick={onAdd}
      disabled={addDisabled}
      sx={{ fontSize: 12, alignSelf: 'flex-start' }}
    >
      {addLabel}
    </MuiButton>
  ) : null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        component="span"
        variant="overline"
        sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1 }}
      >
        {title}
      </Typography>
      {isEmpty ? (
        addButton ? (
          <Box
            sx={{
              borderRadius: 1,
              p: 1.5,
              bgcolor: alpha(theme.palette.text.primary, 0.04),
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            }}
          >
            {addButton}
          </Box>
        ) : null
      ) : (
        <Stack gap={1.5}>
          {children}
          {addButton}
        </Stack>
      )}
    </Box>
  )
}

export interface AddVendorOfferDrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function AddVendorOfferDrawer({ open, onClose, projectId }: AddVendorOfferDrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast((s) => s.showToast)
  const { saving } = useAppSelector((s) => s.pitch)
  const { saving: baselineSaving } = useAppSelector((s) => s.baseline)
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const { activeVersion, versions } = useAppSelector((s) => s.pitch)
  const { baseline } = useAppSelector((s) => s.baseline)
  const categories = useAppSelector((s) => s.settings.categories)
  const services = useAppSelector((s) => s.settings.services)

  const [form, setForm] = useState({
    poNumber: '',
    poDate: '',
    poValue: '',
    executedValue: '',
    vendorId: '',
    file: null as File | null,
  })
  const [milestoneCards, setMilestoneCards] = useState<VendorOfferMilestoneCard[]>([])
  const [retentionCards, setRetentionCards] = useState<VendorOfferRetentionCard[]>([])

  const baselineForProject = baseline?.projectId === projectId ? baseline : null

  const pitchVersion = useMemo(
    () =>
      resolveOfferVersionForProject(
        projectId,
        activeVersion,
        versions,
        baselineForProject,
      ),
    [activeVersion, versions, projectId, baselineForProject],
  )

  const serviceTargets = useMemo(() => listServiceTargets(pitchVersion), [pitchVersion])

  const categoryOptions = useMemo(() => masterCategoryOptions(categories), [categories])
  const serviceOptions = useMemo(() => masterServiceOptions(services), [services])

  const vendorOptions = useMemo(
    () => vendorItems.map((v) => ({ id: v.id, label: v.name })),
    [vendorItems],
  )

  const selectedVendor = vendorOptions.find((v) => v.id === form.vendorId) ?? null
  const poValueNumber = Number(form.poValue) || 0
  const executedValueNumber = Number(form.executedValue) || poValueNumber
  const milestoneBaseValue = executedValueNumber

  const hasConfiguredEntries = useMemo(
    () =>
      milestoneCards.some(isMilestoneCardConfigured) ||
      retentionCards.some(isRetentionCardConfigured),
    [milestoneCards, retentionCards],
  )

  const groupedForSave = useMemo(
    () =>
      groupAllCardsByService(
        milestoneCards.filter(isMilestoneCardConfigured),
        retentionCards.filter(isRetentionCardConfigured),
      ),
    [milestoneCards, retentionCards],
  )

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendors({ pageSize: 500 }))
      void dispatch(fetchVersions(projectId))
      void dispatch(fetchCategories())
      void dispatch(fetchServices())
    }
  }, [open, dispatch, projectId])

  useEffect(() => {
    if (!open) {
      setForm({
        poNumber: '',
        poDate: '',
        poValue: '',
        executedValue: '',
        vendorId: '',
        file: null,
      })
      setMilestoneCards([])
      setRetentionCards([])
    }
  }, [open])

  useEffect(() => {
    if (!open || form.poNumber) return
    setForm((prev) => ({ ...prev, poNumber: generatePoNumber() }))
  }, [open, form.poNumber])

  useEffect(() => {
    if (milestoneBaseValue <= 0) return

    setMilestoneCards((prev) => {
      let changed = false
      const next = prev.map((card) => {
        let cardChanged = false
        const milestones = card.milestones.map((m) => {
          const value = Math.round((m.percentage / 100) * milestoneBaseValue)
          if (m.value === value) return m
          cardChanged = true
          return { ...m, value }
        })
        let retention = card.retention ?? null
        if (retention) {
          const amount = Math.round((retention.percentage / 100) * milestoneBaseValue)
          if (retention.amount !== amount) {
            cardChanged = true
            retention = { ...retention, amount }
          }
        }
        if (!cardChanged) return card
        changed = true
        return { ...card, milestones, retention }
      })
      return changed ? next : prev
    })

    setRetentionCards((prev) => {
      let changed = false
      const next = prev.map((row) => {
        const amount = Math.round((row.percentage / 100) * milestoneBaseValue)
        if (row.value === amount) return row
        changed = true
        return { ...row, value: amount }
      })
      return changed ? next : prev
    })
  }, [milestoneBaseValue])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePoValueChange(value: string) {
    setForm((prev) => {
      const oldPo = Number(prev.poValue) || 0
      const oldExec = prev.executedValue ? Number(prev.executedValue) : oldPo
      const syncExec = !prev.executedValue || oldExec === oldPo
      return {
        ...prev,
        poValue: value,
        executedValue: syncExec ? value : prev.executedValue,
      }
    })
  }

  function findServiceTarget(serviceId: string): ServiceTarget | undefined {
    return serviceTargets.find(
      (t) => t.service.id === serviceId || t.service.subcategoryId === serviceId,
    )
  }

  async function handleSubmit() {
    if (!form.poNumber.trim() || !form.poDate || !form.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (!form.vendorId) {
      toast({ title: 'Please select a vendor', variant: 'error' })
      return
    }
    if (!hasConfiguredEntries || groupedForSave.length === 0) {
      toast({ title: 'Add at least one milestone or retention entry', variant: 'error' })
      return
    }

    const offerValue = Number(form.poValue)
    if (!Number.isFinite(offerValue) || offerValue <= 0) {
      toast({ title: 'Enter a valid offer amount', variant: 'error' })
      return
    }
    const executedValue = Number(form.executedValue) || offerValue
    const vendor = vendorItems.find((v) => v.id === form.vendorId)
    const documentUrl = form.file ? URL.createObjectURL(form.file) : null
    const quotation = form.file
      ? {
          fileName: form.file.name,
          fileUrl: documentUrl!,
          uploadedAt: new Date().toISOString(),
        }
      : undefined

    try {
      for (const [index, group] of groupedForSave.entries()) {
        const target = findServiceTarget(group.serviceId)
        const milestonePayload = buildVendorPOMilestonePayloadFromGroup(group)
        let mappingId: string | undefined

        if (target && pitchVersion) {
          const existing = target.service.vendorMappings ?? []
          const { milestones: pitchMilestones, retention } = pitchMappingFromGroup(group)
          mappingId = `vm-${Date.now()}-${index}-${group.serviceId}`

          await dispatch(
            updateVendorMapping({
              projectId,
              versionId: pitchVersion.id,
              serviceId: target.service.id,
              mappings: [
                ...existing,
                {
                  id: mappingId,
                  vendorId: form.vendorId,
                  vendorName: vendor?.name ?? '',
                  value: offerValue,
                  executedValue,
                  percentage: pct(offerValue, target.service.value),
                  milestones: pitchMilestones,
                  retention,
                  isMeasurable: false,
                  ...(quotation ? { quotation } : {}),
                },
              ],
            }),
          ).unwrap()
        }

        await dispatch(
          createVendorPO({
            projectId,
            data: {
              vendorId: form.vendorId,
              vendorName: vendor?.name ?? '',
              poNumber: groupedForSave.length > 1 ? `${form.poNumber}-${index + 1}` : form.poNumber,
              poDate: form.poDate,
              poValue: offerValue,
              executedValue,
              milestones: milestonePayload,
              linkedBaselineServiceIds: [group.serviceId],
              linkedVendorMappingId: mappingId,
              status: 'Draft',
              documentUrl,
              fileName: form.file?.name ?? null,
            },
          }),
        ).unwrap()
      }

      void dispatch(fetchVersions(projectId))
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({
        title:
          groupedForSave.length === 1
            ? 'Vendor offer saved successfully'
            : `Vendor offers saved for ${groupedForSave.length} services`,
        variant: 'success',
      })
      onClose()
    } catch {
      toast({ title: 'Failed to save vendor offer', variant: 'error' })
    }
  }

  const cardsDisabled = categoryOptions.length === 0

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Vendor Offer"
      subtitle="Record vendor offer details"
      onSubmit={handleSubmit}
      submitLoading={saving || baselineSaving}
      submitLabel="Save Offer"
    >
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: form.file ? 0.5 : 1.5 }}
        >
          <Typography component="span" variant="overline" sx={PO_SECTION_TITLE_SX}>
            PO Details
          </Typography>
          <MuiButton
            variant="outlined"
            component="label"
            size="small"
            startIcon={<Upload />}
            sx={{ fontSize: 12 }}
          >
            Upload PO Document
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx"
              onChange={(e) => setField('file', e.target.files?.[0] ?? null)}
            />
          </MuiButton>
        </Stack>
        {form.file ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1.5, textAlign: 'right', fontSize: 11 }}
          >
            {form.file.name}
          </Typography>
        ) : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1.5,
          }}
        >
          <FormField label="PO Number" required>
            <TextField
              fullWidth
              size="small"
              value={form.poNumber}
              onChange={(e) => setField('poNumber', e.target.value)}
              placeholder="PO-VND-…"
            />
          </FormField>
          <FormField label="PO Date" required>
            <DatePicker
              value={dateFromIso(form.poDate)}
              onChange={(d) => setField('poDate', isoFromDate(d))}
              fullWidth
              size="sm"
            />
          </FormField>
          <FormField label="PO Value (₹)" required>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.poValue}
              onChange={(e) => handlePoValueChange(e.target.value)}
              placeholder="0"
            />
          </FormField>
          <FormField label="Executed Value (₹)">
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.executedValue}
              onChange={(e) => setField('executedValue', e.target.value)}
              placeholder="0"
            />
          </FormField>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormField label="Vendor" required>
              <Autocomplete
                size="small"
                fullWidth
                options={vendorOptions}
                value={selectedVendor}
                onChange={(_, next) => setField('vendorId', next?.id ?? '')}
                getOptionLabel={(opt) => opt.label}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search vendor…" sx={{ '& input': { fontSize: 12 } }} />
                )}
              />
            </FormField>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <MilestoneSectionPanel
        title="Milestones"
        addLabel="Add Milestone"
        onAdd={() =>
          setMilestoneCards((prev) => [
            ...prev,
            createVendorOfferMilestoneCard(categoryOptions, serviceOptions),
          ])
        }
        addDisabled={cardsDisabled}
        isEmpty={milestoneCards.length === 0}
      >
        {milestoneCards.map((card) => (
          <VendorOfferMilestoneCardEditor
            key={card.id}
            card={card}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            milestoneBaseValue={milestoneBaseValue}
            onChange={(patch) =>
              setMilestoneCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
              )
            }
            onRemove={() => setMilestoneCards((prev) => prev.filter((c) => c.id !== card.id))}
          />
        ))}
      </MilestoneSectionPanel>

      <MilestoneSectionPanel
        title="Retention"
        addLabel="Add Retention"
        onAdd={() =>
          setRetentionCards([
            createVendorOfferRetentionCard(categoryOptions, serviceOptions),
          ])
        }
        addDisabled={cardsDisabled}
        isEmpty={retentionCards.length === 0}
        showAddButton={retentionCards.length === 0}
      >
        {retentionCards.map((card) => (
          <VendorOfferRetentionCardEditor
            key={card.id}
            card={card}
            categoryOptions={categoryOptions}
            serviceOptions={serviceOptions}
            milestoneBaseValue={milestoneBaseValue}
            onChange={(patch) =>
              setRetentionCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
              )
            }
            onRemove={() => setRetentionCards((prev) => prev.filter((c) => c.id !== card.id))}
          />
        ))}
      </MilestoneSectionPanel>
    </DrawerForm>
  )
}
