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
import { parseSettingsApiError } from '@/modules/system-settings/shared/api-errors'
import { uploadProjectDocumentFile } from '@/api/uploadFileApi'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVendors } from '../../../../slices/vendors/thunk'
import { createVendorPO, fetchBaseline, fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { fetchVersions } from '../../../../slices/pitch/thunk'
import { dropdownsApi } from '@/api/dropdownsApi'
import type { PitchService } from '../../../../slices/pitch/reducer'
import {
  resolveOfferVersionForProject,
  resolvePitchServiceForMasterSelection,
} from './vendorPOHelpers'
import { dropdownCategoryOptions, dropdownServiceOptions } from './clientPOServiceOptions'
import {
  VendorOfferMilestoneCardEditor,
  VendorOfferRetentionCardEditor,
  createVendorOfferMilestoneCard,
  createVendorOfferRetentionCard,
  groupAllCardsByService,
  isMilestoneCardConfigured,
  isRetentionCardConfigured,
  buildVendorOfferGlobalMilestonePayload,
  type VendorOfferMilestoneCard,
  type VendorOfferRetentionCard,
  type GroupedServiceMilestones,
} from './VendorOfferMilestoneCards'
import { validateVendorOfferGlobalPercents } from '@/utils/vendorMilestones'

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
  const { saving: baselineSaving } = useAppSelector((s) => s.baseline)
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const { activeVersion, versions } = useAppSelector((s) => s.pitch)
  const { baseline } = useAppSelector((s) => s.baseline)
  const [masterCategories, setMasterCategories] = useState<
    Array<{ value: string; label: string }>
  >([])
  const [masterServices, setMasterServices] = useState<
    Array<{ value: string; label: string; categoryId: string }>
  >([])

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
  const [fieldErrors, setFieldErrors] = useState<{
    poNumber?: string
    poDate?: string
    poValue?: string
    vendorId?: string
    milestones?: string
  }>({})

  const baselineForProject = baseline?.projectId === projectId ? baseline : null

  const offerSnapshot = useMemo(
    () =>
      resolveOfferVersionForProject(
        projectId,
        activeVersion,
        versions,
        baselineForProject,
      ),
    [activeVersion, versions, projectId, baselineForProject],
  )

  /** Prefer baseline categories for Live service linking; fall back to pitch-shaped snapshot. */
  const serviceCatalog = useMemo(() => {
    if (baselineForProject?.categories?.length) {
      return { categories: baselineForProject.categories }
    }
    return offerSnapshot
  }, [baselineForProject, offerSnapshot])

  const serviceTargets = useMemo(() => listServiceTargets(serviceCatalog), [serviceCatalog])

  const categoryOptions = useMemo(
    () => dropdownCategoryOptions(masterCategories),
    [masterCategories],
  )
  const serviceOptions = useMemo(() => dropdownServiceOptions(masterServices), [masterServices])

  const vendorOptions = useMemo(
    () =>
      vendorItems
        .filter((v) => v.status === 'Active')
        .map((v) => ({ id: v.id, label: v.name })),
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
      void dispatch(fetchVendors({ pageSize: 100, status: 'Active' }))
      void dispatch(fetchBaseline(projectId))
      void dispatch(fetchVersions(projectId))
      let cancelled = false
      void (async () => {
        try {
          const [cats, svcs] = await Promise.all([
            dropdownsApi.getCategories(),
            dropdownsApi.getServices(),
          ])
          if (cancelled) return
          setMasterCategories(cats)
          setMasterServices(svcs)
        } catch {
          if (!cancelled) {
            setMasterCategories([])
            setMasterServices([])
          }
        }
      })()
      return () => {
        cancelled = true
      }
    }
    setMasterCategories([])
    setMasterServices([])
    return undefined
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
      setFieldErrors({})
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
    if (
      key === 'poNumber' ||
      key === 'poDate' ||
      key === 'poValue' ||
      key === 'vendorId'
    ) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }
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
    setFieldErrors((prev) => ({ ...prev, poValue: undefined }))
  }

  function resolveServiceTarget(group: GroupedServiceMilestones): ServiceTarget | undefined {
    const masterCat = categoryOptions.find((c) => c.id === group.categoryId)
    const masterSvc = serviceOptions.find((s) => s.id === group.serviceId)

    const fromMaster = resolvePitchServiceForMasterSelection(serviceCatalog, {
      masterCategoryId: group.categoryId,
      masterServiceId: group.serviceId,
      masterCategoryName: masterCat?.label,
      masterServiceName: masterSvc?.label,
    })
    if (fromMaster) return fromMaster

    const fromTargets = serviceTargets.find(
      (t) => t.service.id === group.serviceId || t.service.subcategoryId === group.serviceId,
    )
    if (fromTargets) return fromTargets

    // Live offers are independent of Pitch — fall back to master service ids for linking.
    if (!group.serviceId.trim()) return undefined
    const label = masterSvc?.label ?? group.serviceId
    return {
      categoryId: group.categoryId,
      categoryName: masterCat?.label ?? '',
      service: {
        id: group.serviceId,
        name: label,
        subcategoryId: group.serviceId,
        subcategoryName: label,
        customName: null,
        value: 0,
        clientMilestones: [],
        vendorMappings: [],
        milestonesTotal: 0,
      },
    }
  }

  function validateForm(): boolean {
    const next: typeof fieldErrors = {}
    if (!form.poNumber.trim()) next.poNumber = 'PO number is required'
    if (!form.poDate) next.poDate = 'PO date is required'
    const offerValue = Number(form.poValue)
    if (!form.poValue.trim()) next.poValue = 'PO value is required'
    else if (!Number.isFinite(offerValue) || offerValue <= 0) {
      next.poValue = 'Enter a valid PO value greater than 0'
    }
    if (!form.vendorId) next.vendorId = 'Vendor is required'
    if (!hasConfiguredEntries || groupedForSave.length === 0) {
      next.milestones = 'Add at least one milestone or retention entry'
    }

    // Collect ALL milestone rows across services (do not drop empty names with %).
    const allMilestoneRows = milestoneCards.flatMap((card) => card.milestones)
    const configuredRetentions = retentionCards.filter(isRetentionCardConfigured)
    const retentionPctOnce = configuredRetentions.reduce((s, r) => s + (Number(r.percentage) || 0), 0)
    const retentionName =
      configuredRetentions.length === 1
        ? configuredRetentions[0]?.name
        : configuredRetentions.length > 1
          ? configuredRetentions.map((r) => r.name).join(', ')
          : undefined

    const pctValidation = validateVendorOfferGlobalPercents({
      milestones: allMilestoneRows.map((m) => ({
        name: m.name,
        percentage: m.percentage,
      })),
      retention:
        configuredRetentions.length > 0
          ? { name: retentionName, percentage: retentionPctOnce }
          : null,
    })
    if (!pctValidation.valid) {
      next.milestones =
        pctValidation.nameMessage ??
        pctValidation.pctMessage ??
        pctValidation.structureMessage ??
        'Milestone percentages must equal 100%'
    }

    setFieldErrors(next)
    const keys = Object.keys(next)
    if (keys.length > 0) {
      toast({
        title: next.milestones ?? 'Please fill in all required fields',
        variant: 'error',
      })
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (!validateForm()) return

    const offerValue = Number(form.poValue)
    const executedValue = Number(form.executedValue) || offerValue
    const vendor = vendorItems.find((v) => v.id === form.vendorId)
    let documentUrl: string | null = null
    let fileName: string | null = null
    if (form.file) {
      try {
        const uploaded = await uploadProjectDocumentFile(form.file)
        documentUrl = uploaded.viewUrl
        fileName = uploaded.originalName || form.file.name
      } catch (err) {
        const parsed = parseSettingsApiError(err, 'Failed to upload offer document')
        toast({ title: parsed.message, variant: 'error' })
        return
      }
    }

    try {
      const linkedServiceIds: string[] = []
      for (const group of groupedForSave) {
        const target = resolveServiceTarget(group)
        if (!target) {
          toast({
            title: 'Select a category and service on each milestone or retention entry',
            variant: 'error',
          })
          return
        }
        const linkedServiceId =
          target.service.subcategoryId?.trim() ||
          group.serviceId.trim() ||
          target.service.id
        if (linkedServiceId && !linkedServiceIds.includes(linkedServiceId)) {
          linkedServiceIds.push(linkedServiceId)
        }
      }

      if (linkedServiceIds.length === 0) {
        toast({
          title: 'Select a category and service on each milestone or retention entry',
          variant: 'error',
        })
        return
      }

      const milestonePayload = buildVendorOfferGlobalMilestonePayload(
        milestoneCards.filter(isMilestoneCardConfigured),
        retentionCards.filter(isRetentionCardConfigured),
      )

      await dispatch(
        createVendorPO({
          projectId,
          data: {
            vendorId: form.vendorId,
            vendorName: vendor?.name ?? '',
            poNumber: form.poNumber,
            poDate: form.poDate,
            poValue: offerValue,
            executedValue,
            milestones: milestonePayload,
            linkedBaselineServiceIds: linkedServiceIds,
            status: 'Draft',
            documentUrl,
            fileName,
          },
        }),
      ).unwrap()

      await dispatch(fetchBaseline(projectId)).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      toast({
        title: 'Vendor offer saved successfully',
        variant: 'success',
      })
      onClose()
    } catch (err) {
      const parsed = parseSettingsApiError(err, 'Failed to save vendor offer')
      setFieldErrors((prev) => ({
        ...prev,
        poNumber: parsed.fieldErrors.poNumber ?? prev.poNumber,
        poDate: parsed.fieldErrors.poDate ?? prev.poDate,
        poValue: parsed.fieldErrors.poValue ?? prev.poValue,
        vendorId: parsed.fieldErrors.vendorId ?? prev.vendorId,
        milestones: parsed.fieldErrors.milestones ?? prev.milestones,
      }))
      toast({ title: parsed.message, variant: 'error' })
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
      submitLoading={baselineSaving}
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
          <FormField label="PO Number" required error={fieldErrors.poNumber}>
            <TextField
              fullWidth
              size="small"
              value={form.poNumber}
              onChange={(e) => setField('poNumber', e.target.value)}
              placeholder="PO-VND-…"
              error={Boolean(fieldErrors.poNumber)}
            />
          </FormField>
          <FormField label="PO Date" required error={fieldErrors.poDate}>
            <DatePicker
              value={dateFromIso(form.poDate)}
              onChange={(d) => setField('poDate', isoFromDate(d))}
              fullWidth
              size="sm"
              error={Boolean(fieldErrors.poDate)}
            />
          </FormField>
          <FormField label="PO Value (₹)" required error={fieldErrors.poValue}>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.poValue}
              onChange={(e) => handlePoValueChange(e.target.value)}
              placeholder="0"
              error={Boolean(fieldErrors.poValue)}
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
            <FormField label="Vendor" required error={fieldErrors.vendorId}>
              <Autocomplete
                size="small"
                fullWidth
                options={vendorOptions}
                value={selectedVendor}
                onChange={(_, next) => setField('vendorId', next?.id ?? '')}
                getOptionLabel={(opt) => opt.label}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search vendor…"
                    error={Boolean(fieldErrors.vendorId)}
                    sx={{ '& input': { fontSize: 12 } }}
                  />
                )}
              />
            </FormField>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {fieldErrors.milestones ? (
        <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 1 }}>
          {fieldErrors.milestones}
        </Typography>
      ) : null}

      <MilestoneSectionPanel
        title="Milestones"
        addLabel="Add Milestone"
        onAdd={() => {
          setFieldErrors((prev) => ({ ...prev, milestones: undefined }))
          setMilestoneCards((prev) => [
            ...prev,
            createVendorOfferMilestoneCard(categoryOptions, serviceOptions),
          ])
        }}
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
        onAdd={() => {
          setFieldErrors((prev) => ({ ...prev, milestones: undefined }))
          setRetentionCards([
            createVendorOfferRetentionCard(categoryOptions, serviceOptions),
          ])
        }}
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
