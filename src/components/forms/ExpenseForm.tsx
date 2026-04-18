import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import {
  Box,
  Stack,
  Typography,
  MenuItem,
  Select,
  TextField,
  Autocomplete,
  Alert,
} from '@mui/material'
import type { PitchVersion, PlannedExpense, PitchService, VendorMapping } from '@/slices/pitch/reducer'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { ExpenseType } from '@/slices/live/types'
import type { CreateExpenseBody } from '@/api/liveApi'
import { Input, FileUpload } from '@/design-system/components'
import { FormField, FormSection } from '@/components/templates/DrawerForm'
import { tokens } from '@/design-system/tokens'
import { formatCurrency, formatInr } from '@/utils/formatters'
import { flattenBaselineMilestones, flattenBaselineServices } from '@/pages/Finance/utils/projectBillable'
import { redistributeCommonPercents, vendorValueTotalsByVendorId } from '@/utils/pitchPlannedExpenses'
import { computeCommonAllocationsFromVendorPOs, findServiceInBaseline } from '@/components/forms/expenseFormUtils'

function findServiceInPitchVersion(
  version: PitchVersion | null | undefined,
  serviceId: string,
): PitchService | undefined {
  if (!version) return undefined
  for (const cat of version.categories) {
    const s = cat.services.find((svc) => svc.id === serviceId)
    if (s) return s
  }
  return undefined
}

function findVendorMappingForPlannedEdit(
  v: PitchVersion,
  ed: PlannedExpense,
): { serviceId: string; mappingId: string } | null {
  if (ed.type !== 'vendor' || !ed.vendorId) return null
  if (ed.serviceId) {
    const svc = findServiceInPitchVersion(v, ed.serviceId)
    const map = svc?.vendorMappings.find((m) => m.vendorId === ed.vendorId)
    if (svc && map) return { serviceId: svc.id, mappingId: map.id }
  }
  for (const cat of v.categories) {
    for (const s of cat.services) {
      const map = s.vendorMappings.find((m) => m.vendorId === ed.vendorId)
      if (map) return { serviceId: s.id, mappingId: map.id }
    }
  }
  return null
}

export type ExpenseFormData =
  | { mode: 'live_expense'; projectId: string; data: CreateExpenseBody }
  | { mode: 'planned_expense'; expense: PlannedExpense }

export interface ExpenseFormProps {
  context: 'pitch' | 'live' | 'global'
  projectId?: string
  pitchVersionId?: string
  pitchVersion?: PitchVersion | null
  baseline?: Baseline | null
  vendorPOs?: VendorPO[]
  projectOptions?: { id: string; label: string }[]
  selectedProjectId?: string
  onSelectedProjectIdChange?: (projectId: string) => void
  editingPlannedExpense?: PlannedExpense | null
  open?: boolean
  onSubmit: (data: ExpenseFormData) => void
  onCancel: () => void
  onValidityChange?: (valid: boolean) => void
}

export type ExpenseFormHandle = {
  submit: () => void
}

const typeCardSx = (active: boolean) => ({
  p: 2,
  borderRadius: 2,
  border: '2px solid',
  borderColor: active ? tokens.color.primary[500] : tokens.color.neutral[200],
  bgcolor: active ? tokens.color.primary[50] : 'background.paper',
  cursor: 'pointer',
  transition: 'border-color 0.15s, background-color 0.15s',
  flex: 1,
  minWidth: 0,
})

export const ExpenseForm = forwardRef<ExpenseFormHandle, ExpenseFormProps>(function ExpenseForm(
  {
    context,
    projectId,
    pitchVersion,
    baseline,
    vendorPOs = [],
    projectOptions = [],
    selectedProjectId,
    onSelectedProjectIdChange,
    editingPlannedExpense,
    open = true,
    onSubmit,
    onValidityChange,
  },
  ref,
) {
  const isPitch = context === 'pitch'
  const isLiveOrGlobal = context === 'live' || context === 'global'

  const effectiveProjectId =
    context === 'global' ? (selectedProjectId ?? '') : (projectId ?? '')

  const [liveType, setLiveType] = useState<ExpenseType>('additional')
  const [pitchType, setPitchType] = useState<PlannedExpense['type']>('additional')

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)

  const [serviceId, setServiceId] = useState('')
  const [mappingId, setMappingId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')

  const [commonSelectedIds, setCommonSelectedIds] = useState<string[]>([])
  const [commonPercents, setCommonPercents] = useState<Record<string, number>>({})

  const baselineServices = useMemo(() => flattenBaselineServices(baseline ?? null), [baseline])
  const milestonesForService = useMemo(() => {
    const all = flattenBaselineMilestones(baseline ?? null)
    if (!serviceId) return []
    return all.filter((m) => m.baselineServiceId === serviceId)
  }, [baseline, serviceId])

  const vendorMappingOptionsLive = useMemo((): (VendorMapping & { serviceName: string })[] => {
    const svc = findServiceInBaseline(baseline ?? null, serviceId)
    if (!svc) return []
    return svc.vendorMappings.map((m) => ({ ...m, serviceName: svc.name }))
  }, [baseline, serviceId])

  const selectedMappingLive = useMemo(() => {
    return vendorMappingOptionsLive.find((m) => m.id === mappingId)
  }, [vendorMappingOptionsLive, mappingId])

  const pitchServicesFlat = useMemo(() => {
    if (!pitchVersion) return [] as { id: string; name: string }[]
    const out: { id: string; name: string }[] = []
    for (const cat of pitchVersion.categories) {
      for (const s of cat.services) {
        out.push({ id: s.id, name: s.name })
      }
    }
    return out
  }, [pitchVersion])

  const selectedPitchService = useMemo(() => {
    return findServiceInPitchVersion(pitchVersion ?? null, serviceId)
  }, [pitchVersion, serviceId])

  const vendorMappingOptionsPitch = useMemo((): (VendorMapping & { serviceName: string })[] => {
    if (!selectedPitchService) return []
    return selectedPitchService.vendorMappings.map((m) => ({
      ...m,
      serviceName: selectedPitchService.name,
    }))
  }, [selectedPitchService])

  const selectedMappingPitch = useMemo(() => {
    return vendorMappingOptionsPitch.find((m) => m.id === mappingId)
  }, [vendorMappingOptionsPitch, mappingId])

  const milestonesForPitchService = useMemo(() => {
    return selectedPitchService?.clientMilestones ?? []
  }, [selectedPitchService])

  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((p) => p.projectId === effectiveProjectId),
    [vendorPOs, effectiveProjectId],
  )

  const commonPreviewLive = useMemo(() => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return []
    return computeCommonAllocationsFromVendorPOs(n, projectVendorPOs)
  }, [amount, projectVendorPOs])

  const totalPoWeight = useMemo(() => {
    const rows = projectVendorPOs
    const by = new Map<string, number>()
    for (const p of rows) by.set(p.vendorId, (by.get(p.vendorId) ?? 0) + p.poValue)
    return [...by.values()].reduce((a, b) => a + b, 0)
  }, [projectVendorPOs])

  const vendorOptionsInPitchVersion = useMemo(() => {
    if (!pitchVersion) return [] as { id: string; label: string; value: number }[]
    return [...vendorValueTotalsByVendorId(pitchVersion).entries()].map(([id, { name: n, value: v }]) => ({
      id,
      label: n,
      value: v,
    }))
  }, [pitchVersion])

  const amountNum = typeof amount === 'number' ? amount : Number(amount) || 0
  const commonPctSum = commonSelectedIds.reduce((s, id) => s + (commonPercents[id] ?? 0), 0)
  const commonPctOk =
    pitchType !== 'common' || commonSelectedIds.length === 0 || Math.abs(commonPctSum - 100) < 0.01

  const resetLiveDependent = useCallback((next: ExpenseType) => {
    setServiceId('')
    setMappingId('')
    setMilestoneId('')
    if (next !== 'additional') return
  }, [])

  const resetPitchDependent = useCallback((next: PlannedExpense['type']) => {
    setServiceId('')
    setMappingId('')
    setMilestoneId('')
    setCommonSelectedIds([])
    setCommonPercents({})
    if (next !== 'additional') return
  }, [])

  useEffect(() => {
    if (!open || !isPitch) return
    const v = pitchVersion
    const ed = editingPlannedExpense
    if (!v) return
    if (ed) {
      setPitchType(ed.type)
      setDescription(ed.name)
      setAmount(String(ed.amount))
      setMilestoneId(ed.milestoneId ?? '')
      if (ed.type === 'vendor' && ed.vendorId) {
        const vm = findVendorMappingForPlannedEdit(v, ed)
        if (vm) {
          setServiceId(vm.serviceId)
          setMappingId(vm.mappingId)
        } else {
          setServiceId(ed.serviceId ?? '')
          setMappingId('')
        }
      } else {
        setServiceId(ed.serviceId ?? '')
        setMappingId('')
      }
      if (ed.type === 'common' && ed.vendorSplits?.length) {
        setCommonSelectedIds(ed.vendorSplits.map((s) => s.vendorId))
        const p: Record<string, number> = {}
        ed.vendorSplits.forEach((s) => {
          p[s.vendorId] = s.percentage
        })
        setCommonPercents(p)
      } else {
        setCommonSelectedIds([])
        setCommonPercents({})
      }
    } else {
      setPitchType('additional')
      setDescription('')
      setAmount('')
      setServiceId('')
      setMappingId('')
      setMilestoneId('')
      setCommonSelectedIds([])
      setCommonPercents({})
    }
  }, [open, isPitch, pitchVersion, editingPlannedExpense])

  useEffect(() => {
    if (!open || isPitch) return
    setLiveType('additional')
    setDescription('')
    setAmount('')
    setDate('')
    setDocumentUrl(undefined)
    setServiceId('')
    setMappingId('')
    setMilestoneId('')
  }, [open, isPitch, effectiveProjectId])

  function handleLiveTypeChange(next: ExpenseType) {
    setLiveType(next)
    resetLiveDependent(next)
  }

  function handlePitchTypeChange(next: PlannedExpense['type']) {
    setPitchType(next)
    resetPitchDependent(next)
  }

  function handleCommonVendorsPitchChange(vals: { id: string; label: string; value: number }[]) {
    if (!pitchVersion) return
    const ids = vals.map((v) => v.id)
    setCommonSelectedIds(ids)
    setCommonPercents(redistributeCommonPercents(ids, pitchVersion))
  }

  const canSubmit = useMemo(() => {
    if (context === 'global' && !selectedProjectId) return false
    if (isLiveOrGlobal && !effectiveProjectId) return false
    if (isPitch && !pitchVersion) return false

    if (isPitch) {
      const nameOk = description.trim().length > 0
      const amtOk = amountNum > 0
      if (!nameOk || !amtOk) return false
      if (pitchType === 'additional') return true
      if (pitchType === 'vendor') return Boolean(serviceId && selectedMappingPitch)
      return commonSelectedIds.length > 0 && commonPctOk
    }

    if (!description.trim() || !date || amountNum <= 0) return false
    if (liveType === 'vendor_linked') return Boolean(serviceId && selectedMappingLive)
    if (liveType === 'common') return totalPoWeight > 0
    return true
  }, [
    context,
    selectedProjectId,
    isLiveOrGlobal,
    effectiveProjectId,
    isPitch,
    pitchVersion,
    description,
    amountNum,
    date,
    pitchType,
    liveType,
    serviceId,
    selectedMappingPitch,
    selectedMappingLive,
    commonSelectedIds.length,
    commonPctOk,
    totalPoWeight,
  ])

  useEffect(() => {
    onValidityChange?.(canSubmit)
  }, [canSubmit, onValidityChange])

  const submit = useCallback(() => {
    if (!canSubmit) return

    if (isPitch && pitchVersion) {
      const baseId = editingPlannedExpense?.id ?? `pe-${Date.now()}`
      let expense: PlannedExpense
      if (pitchType === 'additional') {
        expense = { id: baseId, type: 'additional', name: description.trim(), amount: amountNum }
      } else if (pitchType === 'vendor') {
        const map = selectedMappingPitch
        const svc = selectedPitchService
        const ms = milestonesForPitchService.find((m) => m.id === milestoneId)
        if (!map || !svc) return
        expense = {
          id: baseId,
          type: 'vendor',
          name: description.trim(),
          amount: amountNum,
          vendorId: map.vendorId,
          serviceId: svc.id,
          serviceName: svc.name,
          milestoneId: ms?.id,
          milestoneName: ms?.name,
        }
      } else {
        const vendorSplits = commonSelectedIds.map((vid) => {
          const pct = commonPercents[vid] ?? 0
          return {
            vendorId: vid,
            percentage: pct,
            amount: Math.round((amountNum * pct) / 100),
          }
        })
        expense = {
          id: baseId,
          type: 'common',
          name: description.trim(),
          amount: amountNum,
          vendorSplits,
        }
      }
      onSubmit({ mode: 'planned_expense', expense })
      return
    }

    const pid = effectiveProjectId
    if (!pid) return

    if (liveType === 'vendor_linked') {
      const svc = findServiceInBaseline(baseline ?? null, serviceId)
      const ms = milestonesForService.find((m) => m.milestoneId === milestoneId)
      if (!selectedMappingLive) return
      const data: CreateExpenseBody = {
        type: 'vendor_linked',
        description: description.trim(),
        amount: amountNum,
        date,
        documentUrl,
        serviceId,
        serviceName: svc?.name ?? '',
        vendorId: selectedMappingLive.vendorId,
        vendorName: selectedMappingLive.vendorName,
        milestoneId: ms ? ms.milestoneId : undefined,
        milestoneName: ms ? ms.milestoneName : undefined,
        status: 'pending',
      }
      onSubmit({ mode: 'live_expense', projectId: pid, data })
      return
    }

    if (liveType === 'common') {
      const allocations = computeCommonAllocationsFromVendorPOs(amountNum, projectVendorPOs)
      if (allocations.length === 0) return
      const data: CreateExpenseBody = {
        type: 'common',
        description: description.trim(),
        amount: amountNum,
        date,
        documentUrl,
        vendorAllocations: allocations,
        status: 'pending',
      }
      onSubmit({ mode: 'live_expense', projectId: pid, data })
      return
    }

    const data: CreateExpenseBody = {
      type: 'additional',
      description: description.trim(),
      amount: amountNum,
      date,
      documentUrl,
      status: 'pending',
    }
    onSubmit({ mode: 'live_expense', projectId: pid, data })
  }, [
    canSubmit,
    isPitch,
    pitchVersion,
    pitchType,
    editingPlannedExpense,
    description,
    amountNum,
    selectedMappingPitch,
    selectedPitchService,
    milestonesForPitchService,
    milestoneId,
    commonSelectedIds,
    commonPercents,
    liveType,
    effectiveProjectId,
    baseline,
    serviceId,
    date,
    documentUrl,
    selectedMappingLive,
    milestonesForService,
    projectVendorPOs,
    onSubmit,
  ])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  const showDateDoc = isLiveOrGlobal

  return (
    <Stack gap={0}>
      {context === 'global' && (
        <FormSection title="Project" columns={1}>
          <FormField label="Project" required>
            <Select
              size="small"
              displayEmpty
              value={selectedProjectId ?? ''}
              onChange={(e) => onSelectedProjectIdChange?.(e.target.value)}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select project
              </MenuItem>
              {projectOptions.map((p) => (
                <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
        </FormSection>
      )}

      <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
        Type
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mb: 2 }}>
        {isPitch ? (
          <>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handlePitchTypeChange('additional')}
              onKeyDown={(e) => e.key === 'Enter' && handlePitchTypeChange('additional')}
              sx={typeCardSx(pitchType === 'additional')}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                Additional
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Project cost
                <br />
                no vendor
              </Typography>
            </Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handlePitchTypeChange('vendor')}
              onKeyDown={(e) => e.key === 'Enter' && handlePitchTypeChange('vendor')}
              sx={typeCardSx(pitchType === 'vendor')}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                Vendor Linked
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Linked to a
                <br />
                vendor
              </Typography>
            </Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handlePitchTypeChange('common')}
              onKeyDown={(e) => e.key === 'Enter' && handlePitchTypeChange('common')}
              sx={typeCardSx(pitchType === 'common')}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                Common
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Split across
                <br />
                vendors
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handleLiveTypeChange('additional')}
              onKeyDown={(e) => e.key === 'Enter' && handleLiveTypeChange('additional')}
              sx={typeCardSx(liveType === 'additional')}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                Additional
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Project cost
                <br />
                no vendor
              </Typography>
            </Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handleLiveTypeChange('vendor_linked')}
              onKeyDown={(e) => e.key === 'Enter' && handleLiveTypeChange('vendor_linked')}
              sx={typeCardSx(liveType === 'vendor_linked')}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                Vendor Linked
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Linked to a
                <br />
                vendor
              </Typography>
            </Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => handleLiveTypeChange('common')}
              onKeyDown={(e) => e.key === 'Enter' && handleLiveTypeChange('common')}
              sx={typeCardSx(liveType === 'common')}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                Common
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Split across
                <br />
                all vendors
              </Typography>
            </Box>
          </>
        )}
      </Stack>

      {isPitch && pitchType === 'vendor' && pitchVersion && (
        <FormSection title="Scope" columns={1}>
          <FormField label="Service" required>
            <Select
              size="small"
              displayEmpty
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value)
                setMappingId('')
                setMilestoneId('')
              }}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select service
              </MenuItem>
              {pitchServicesFlat.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField label="Vendor" required>
            <Select
              size="small"
              displayEmpty
              value={mappingId}
              onChange={(e) => setMappingId(e.target.value)}
              fullWidth
              disabled={!serviceId || vendorMappingOptionsPitch.length === 0}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select vendor
              </MenuItem>
              {vendorMappingOptionsPitch.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: 12 }}>
                  {m.vendorName}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField label="Milestone (reference only)" hint="Optional tracking">
            <Select
              size="small"
              displayEmpty
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              fullWidth
              disabled={!serviceId}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                None
              </MenuItem>
              {milestonesForPitchService.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: 12 }}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormField>
        </FormSection>
      )}

      {!isPitch && liveType === 'vendor_linked' && (
        <FormSection title="Scope" columns={1}>
          <FormField label="Service" required>
            <Select
              size="small"
              displayEmpty
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value)
                setMappingId('')
                setMilestoneId('')
              }}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select service
              </MenuItem>
              {baselineServices.map((s) => (
                <MenuItem key={s.baselineServiceId} value={s.baselineServiceId} sx={{ fontSize: 12 }}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField label="Vendor" required>
            <Select
              size="small"
              displayEmpty
              value={mappingId}
              onChange={(e) => setMappingId(e.target.value)}
              fullWidth
              disabled={!serviceId || vendorMappingOptionsLive.length === 0}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select vendor
              </MenuItem>
              {vendorMappingOptionsLive.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: 12 }}>
                  {m.vendorName}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Milestone (reference only)"
            hint="This is for tracking only, not payment grouping"
          >
            <Select
              size="small"
              displayEmpty
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              fullWidth
              disabled={!serviceId}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                None
              </MenuItem>
              {milestonesForService.map((m) => (
                <MenuItem key={m.milestoneId} value={m.milestoneId} sx={{ fontSize: 12 }}>
                  {m.milestoneName}
                </MenuItem>
              ))}
            </Select>
          </FormField>
        </FormSection>
      )}

      <FormSection title="Details" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label={isPitch ? 'Expense name' : 'Description'} required>
            <Input value={description} onChange={setDescription} size="sm" />
          </FormField>
        </Box>
        <FormField label="Amount ₹" required>
          <Input
            type="number"
            value={amount}
            onChange={setAmount}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        {showDateDoc && (
          <FormField label="Date" required>
            <Input type="date" value={date} onChange={setDate} size="sm" />
          </FormField>
        )}
      </FormSection>

      {isPitch && pitchType === 'common' && pitchVersion && (
        <Stack gap={1.5} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Vendors
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block' }}>
            Split is auto-calculated based on vendor value. You can override percentages.
          </Typography>
          <Autocomplete
            multiple
            options={vendorOptionsInPitchVersion}
            getOptionLabel={(o) => o.label}
            value={vendorOptionsInPitchVersion.filter((o) => commonSelectedIds.includes(o.id))}
            onChange={(_, vals) => handleCommonVendorsPitchChange(vals)}
            renderInput={(params) => (
              <TextField {...params} size="small" placeholder="Select vendors…" sx={{ '& input': { fontSize: 12 } }} />
            )}
            size="small"
          />
          {commonSelectedIds.length > 0 && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 600, mt: 0.5 }}>
                Split preview
              </Typography>
              {commonSelectedIds.map((id) => {
                const opt = vendorOptionsInPitchVersion.find((o) => o.id === id)
                const pct = commonPercents[id] ?? 0
                const rowAmt = Math.round((amountNum * pct) / 100)
                return (
                  <Stack key={id} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography sx={{ flex: 1, minWidth: 120, fontSize: 12 }}>{opt?.label ?? id}</Typography>
                    <TextField
                      size="small"
                      type="number"
                      label="%"
                      value={pct}
                      onChange={(e) =>
                        setCommonPercents((prev) => ({
                          ...prev,
                          [id]: Number(e.target.value),
                        }))}
                      sx={{ width: 100, '& input': { fontSize: 12 } }}
                    />
                    <Typography variant="body2" sx={{ fontSize: 12, minWidth: 100 }}>
                      ₹{formatInr(rowAmt)}
                    </Typography>
                  </Stack>
                )
              })}
              {!commonPctOk && (
                <Alert severity="error" sx={{ fontSize: 12 }}>
                  Total % must equal 100%.
                </Alert>
              )}
            </>
          )}
        </Stack>
      )}

      {!isPitch && liveType === 'common' && (
        <>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            This amount will be split across all mapped vendors proportionally by their PO value.
          </Typography>
          <Box
            sx={{
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 2,
              p: 2,
              mb: 2,
              bgcolor: tokens.color.neutral[50],
            }}
          >
            <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
              Allocation preview
            </Typography>
            {totalPoWeight <= 0 ? (
              <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main', mt: 1 }}>
                No vendor PO values for this project. Add vendor POs in baseline first.
              </Typography>
            ) : commonPreviewLive.length === 0 ? (
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
                Enter an amount to preview split.
              </Typography>
            ) : (
              commonPreviewLive.map((row) => (
                <Stack
                  key={row.vendorId}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 1 }}
                >
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {row.vendorName}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {row.allocationPercent}% · ₹{formatCurrency(row.allocationAmount)}
                  </Typography>
                </Stack>
              ))
            )}
          </Box>
        </>
      )}

      {showDateDoc && (
        <FormSection title="Document" columns={1}>
          <FileUpload
            accept="image/*,.pdf"
            label="Attach document (optional)"
            onUpload={(files) => {
              const f = files[0]
              setDocumentUrl(f ? `local://${f.name}` : undefined)
            }}
          />
        </FormSection>
      )}
    </Stack>
  )
})
