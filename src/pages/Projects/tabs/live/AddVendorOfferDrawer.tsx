import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Divider,
  MenuItem,
  Select as MuiSelect,
  Stack,
  TextField,
  Typography,
  Button as MuiButton,
} from '@mui/material'
import { Upload } from '@mui/icons-material'
import { useToast } from '@/design-system/components'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVendors } from '../../../../slices/vendors/thunk'
import { fetchVersions, updateVendorMapping } from '../../../../slices/pitch/thunk'
import type { PitchService, VendorMapping, VendorMilestone } from '../../../../slices/pitch/reducer'
import type { VendorPOMilestone } from '../../../../slices/baseline/reducer'
import { resolveOfferVersionForProject } from './vendorPOHelpers'
import {
  VendorPOMilestoneEditor,
  buildVendorPOMilestonePayload,
  isVendorPOMilestoneBreakdownValid,
  type VendorPOMilestoneRow,
  type VendorPORetentionRow,
} from './VendorPOMilestoneEditor'

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

function pitchMilestonesFromPayload(payload: VendorPOMilestone[]): {
  milestones: VendorMilestone[]
  retention?: VendorMapping['retention']
} {
  const retentionRow = payload.find((m) => m.name === 'Retention')
  const milestones = payload
    .filter((m) => m.name !== 'Retention')
    .map((m) => ({
      id: m.id,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    }))
  const retention = retentionRow
    ? { percentage: retentionRow.percentage, amount: retentionRow.value }
    : undefined
  return { milestones, retention }
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
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const { activeVersion, versions } = useAppSelector((s) => s.pitch)
  const { baseline } = useAppSelector((s) => s.baseline)

  const [form, setForm] = useState({
    vendorId: '',
    categoryId: '',
    serviceId: '',
    poDate: '',
    poValue: '',
    file: null as File | null,
  })
  const [milestones, setMilestones] = useState<VendorPOMilestoneRow[]>([])
  const [retention, setRetention] = useState<VendorPORetentionRow | null>(null)

  const baselineForProject =
    baseline?.projectId === projectId ? baseline : null

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
  const singleTarget = serviceTargets.length === 1 ? serviceTargets[0] : null
  const needsServicePicker = serviceTargets.length > 1

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of serviceTargets) {
      map.set(t.categoryId, t.categoryName)
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [serviceTargets])

  const selectedTarget = useMemo(() => {
    if (singleTarget) return singleTarget
    return serviceTargets.find((t) => t.service.id === form.serviceId) ?? null
  }, [singleTarget, serviceTargets, form.serviceId])

  const servicesForCategory = useMemo(
    () => serviceTargets.filter((t) => t.categoryId === form.categoryId),
    [serviceTargets, form.categoryId],
  )

  const vendorOptions = useMemo(
    () => vendorItems.map((v) => ({ id: v.id, label: v.name })),
    [vendorItems],
  )

  const selectedVendor = vendorOptions.find((v) => v.id === form.vendorId) ?? null
  const poValueNumber = Number(form.poValue) || 0

  const milestonesValid = useMemo(
    () => isVendorPOMilestoneBreakdownValid(poValueNumber, milestones, retention),
    [poValueNumber, milestones, retention],
  )

  useEffect(() => {
    if (open) {
      void dispatch(fetchVendors({ pageSize: 500 }))
      void dispatch(fetchVersions(projectId))
    }
  }, [open, dispatch, projectId])

  useEffect(() => {
    if (!open) {
      setForm({ vendorId: '', categoryId: '', serviceId: '', poDate: '', poValue: '', file: null })
      setMilestones([])
      setRetention(null)
    }
  }, [open])

  useEffect(() => {
    if (singleTarget && open) {
      setForm((prev) => ({
        ...prev,
        categoryId: singleTarget.categoryId,
        serviceId: singleTarget.service.id,
      }))
    }
  }, [singleTarget, open])

  useEffect(() => {
    if (poValueNumber <= 0) return
    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        value: Math.round((m.percentage / 100) * poValueNumber),
      })),
    )
    setRetention((prev) =>
      prev ? { ...prev, amount: Math.round((prev.percentage / 100) * poValueNumber) } : null,
    )
  }, [poValueNumber])

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.vendorId || !form.poDate || !form.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (!milestonesValid) {
      toast({ title: 'Milestone and retention percentages must equal 100%', variant: 'error' })
      return
    }
    if (!selectedTarget) {
      toast({ title: 'Add a client offer service on the Pitch tab first', variant: 'error' })
      return
    }
    if (needsServicePicker && !form.serviceId) {
      toast({ title: 'Select a service for this vendor offer', variant: 'error' })
      return
    }

    const offerValue = Number(form.poValue)
    if (!Number.isFinite(offerValue) || offerValue <= 0) {
      toast({ title: 'Enter a valid offer amount', variant: 'error' })
      return
    }
    if (!pitchVersion) {
      toast({ title: 'No pitch version found for this project', variant: 'error' })
      return
    }

    const { service } = selectedTarget
    const vendor = vendorItems.find((v) => v.id === form.vendorId)
    const existing = service.vendorMappings ?? []
    if (existing.some((m) => m.vendorId === form.vendorId)) {
      toast({ title: 'This vendor already has an offer on the selected service', variant: 'error' })
      return
    }

    const milestonePayload = buildVendorPOMilestonePayload(milestones, retention)
    const { milestones: pitchMilestones, retention: pitchRetention } =
      pitchMilestonesFromPayload(milestonePayload)

    const quotation = form.file
      ? {
          fileName: form.file.name,
          fileUrl: URL.createObjectURL(form.file),
          uploadedAt: new Date().toISOString(),
        }
      : undefined

    const newMapping: VendorMapping = {
      id: `vm-${Date.now()}`,
      vendorId: form.vendorId,
      vendorName: vendor?.name ?? '',
      value: offerValue,
      percentage: pct(offerValue, service.value),
      milestones: pitchMilestones,
      retention: pitchRetention,
      isMeasurable: false,
      ...(quotation ? { quotation } : {}),
    }

    try {
      await dispatch(
        updateVendorMapping({
          projectId,
          versionId: pitchVersion.id,
          serviceId: service.id,
          mappings: [...existing, newMapping],
        }),
      ).unwrap()
      void dispatch(fetchVersions(projectId))
      toast({ title: 'Vendor offer saved successfully', variant: 'success' })
      onClose()
    } catch {
      toast({ title: 'Failed to save vendor offer', variant: 'error' })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Vendor Offer"
      subtitle="Record vendor offer details"
      onSubmit={handleSubmit}
      submitLoading={saving}
      submitLabel="Save Offer"
    >
      <Box sx={{ mb: 3 }}>
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

          {needsServicePicker ? (
            <>
              <FormField label="Category" required>
                <MuiSelect
                  value={form.categoryId}
                  onChange={(e) => {
                    const catId = e.target.value
                    const firstInCat = serviceTargets.find((t) => t.categoryId === catId)
                    setForm((prev) => ({
                      ...prev,
                      categoryId: catId,
                      serviceId: firstInCat?.service.id ?? '',
                    }))
                  }}
                  size="small"
                  fullWidth
                  displayEmpty
                  sx={{ fontSize: 12 }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: 12 }}>
                    Select category…
                  </MenuItem>
                  {categoryOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: 12 }}>
                      {c.label}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </FormField>
              <FormField label="Service" required>
                <MuiSelect
                  value={form.serviceId}
                  onChange={(e) => setField('serviceId', e.target.value)}
                  size="small"
                  fullWidth
                  displayEmpty
                  disabled={!form.categoryId}
                  sx={{ fontSize: 12 }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: 12 }}>
                    Select service…
                  </MenuItem>
                  {servicesForCategory.map((t) => (
                    <MenuItem key={t.service.id} value={t.service.id} sx={{ fontSize: 12 }}>
                      {t.service.subcategoryName ?? t.service.name ?? '—'}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </FormField>
            </>
          ) : null}

          <FormField label="PO Date" required>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={form.poDate}
              onChange={(e) => setField('poDate', e.target.value)}
            />
          </FormField>
          <FormField label="PO Value (₹)" required>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.poValue}
              onChange={(e) => setField('poValue', e.target.value)}
              placeholder=""
            />
          </FormField>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <VendorPOMilestoneEditor
        poValue={poValueNumber}
        milestones={milestones}
        retention={retention}
        onMilestonesChange={setMilestones}
        onRetentionChange={setRetention}
      />
    </DrawerForm>
  )
}
