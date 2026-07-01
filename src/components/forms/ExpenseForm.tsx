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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import type { PitchVersion, PlannedExpense, PitchService, VendorMapping } from '@/slices/pitch/reducer'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import type { ExpenseType } from '@/slices/live/types'
import type { CreateExpenseBody } from '@/api/liveApi'
import { Input, FileUpload } from '@/design-system/components'
import { FormField, FormSection } from '@/components/templates/DrawerForm'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { flattenBaselineMilestones, flattenBaselineServices } from '@/pages/Finance/utils/projectBillable'
import { vendorValueTotalsByVendorId } from '@/utils/pitchPlannedExpenses'
import {
  computeAllocationsForVendors,
  computeCommonExpenseAllocations,
  findServiceInBaseline,
  getBuildVendorsFromPOs,
} from '@/components/forms/expenseFormUtils'

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
  onSubmitLabelChange?: (label: string) => void
}

export type ExpenseFormHandle = {
  submit: () => void
}

type PitchExpenseType = PlannedExpense['type']

const EXPENSE_TYPE_OPTIONS = {
  additional: 'Additional Expense',
  vendorLinked: 'Vendor Linked Expense',
  common: 'Common Expense (Split Across Build Vendors)',
  internal: 'Internal Expense',
} as const

const COMMON_EXPENSE_SPLIT_METHOD = 'proportional_po' as const

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
    onSubmitLabelChange,
  },
  ref,
) {
  const isPitch = context === 'pitch'
  const isLiveOrGlobal = context === 'live' || context === 'global'

  const effectiveProjectId =
    context === 'global' ? (selectedProjectId ?? '') : (projectId ?? '')

  const [liveType, setLiveType] = useState<ExpenseType>('common')
  const [pitchType, setPitchType] = useState<PitchExpenseType>('common')

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)

  const [serviceId, setServiceId] = useState('')
  const [mappingId, setMappingId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')

  const [paidByVendorId, setPaidByVendorId] = useState('')

  const liveTypeOptions: { value: ExpenseType; label: string }[] = [
    { value: 'additional', label: EXPENSE_TYPE_OPTIONS.additional },
    { value: 'vendor_linked', label: EXPENSE_TYPE_OPTIONS.vendorLinked },
    { value: 'common', label: EXPENSE_TYPE_OPTIONS.common },
    { value: 'office_expenses', label: EXPENSE_TYPE_OPTIONS.internal },
  ]
  const pitchTypeOptions: { value: PitchExpenseType; label: string }[] = [
    { value: 'additional', label: EXPENSE_TYPE_OPTIONS.additional },
    { value: 'vendor', label: EXPENSE_TYPE_OPTIONS.vendorLinked },
    { value: 'common', label: EXPENSE_TYPE_OPTIONS.common },
    { value: 'office_expenses', label: EXPENSE_TYPE_OPTIONS.internal },
  ]

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

  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((p) => p.projectId === effectiveProjectId),
    [vendorPOs, effectiveProjectId],
  )

  const buildVendors = useMemo(
    () => getBuildVendorsFromPOs(projectVendorPOs),
    [projectVendorPOs],
  )

  const pitchBuildVendors = useMemo(() => {
    if (projectVendorPOs.length > 0) {
      return getBuildVendorsFromPOs(projectVendorPOs)
    }
    if (!pitchVersion) return [] as { vendorId: string; vendorName: string; poSum: number }[]
    return [...vendorValueTotalsByVendorId(pitchVersion).entries()]
      .filter(([, v]) => v.value > 0)
      .map(([vendorId, v]) => ({
        vendorId,
        vendorName: v.name,
        poSum: v.value,
      }))
      .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
  }, [projectVendorPOs, pitchVersion])

  const isCommonExpense = isPitch ? pitchType === 'common' : liveType === 'common'
  const commonVendors = isPitch ? pitchBuildVendors : buildVendors

  const commonPreview = useMemo(() => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return []
    if (!isPitch) {
      return computeCommonExpenseAllocations(n, projectVendorPOs, COMMON_EXPENSE_SPLIT_METHOD)
    }
    return computeAllocationsForVendors(
      n,
      pitchBuildVendors.map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        weight: v.poSum,
      })),
      COMMON_EXPENSE_SPLIT_METHOD,
    )
  }, [amount, isPitch, projectVendorPOs, pitchBuildVendors])

  const totalCommonWeight = useMemo(
    () => commonVendors.reduce((s, v) => s + v.poSum, 0),
    [commonVendors],
  )

  const amountNum = typeof amount === 'number' ? amount : Number(amount) || 0

  const resetLiveDependent = useCallback((next: ExpenseType) => {
    setServiceId('')
    setMappingId('')
    setMilestoneId('')
    setPaidByVendorId('')
    void next
  }, [])

  const resetPitchDependent = useCallback((next: PitchExpenseType) => {
    setServiceId('')
    setMappingId('')
    setMilestoneId('')
    setPaidByVendorId('')
    void next
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
      if (ed.type === 'common') {
        setPaidByVendorId(ed.paidByVendorId ?? '')
      } else {
        setPaidByVendorId('')
      }
    } else {
      setPitchType('common')
      setDescription('')
      setAmount('')
      setDate('')
      setDocumentUrl(undefined)
      setServiceId('')
      setMappingId('')
      setMilestoneId('')
      setPaidByVendorId('')
    }
  }, [open, isPitch, pitchVersion, editingPlannedExpense])

  useEffect(() => {
    if (!open || isPitch) return
    setLiveType('common')
    setDescription('')
    setAmount('')
    setDate('')
    setDocumentUrl(undefined)
    setServiceId('')
    setMappingId('')
    setMilestoneId('')
    setPaidByVendorId('')
  }, [open, isPitch, effectiveProjectId])

  useEffect(() => {
    if (isPitch) {
      onSubmitLabelChange?.(pitchType === 'reimbursable_expenses' ? 'Add Reimbursement' : 'Save')
      return
    }
    if (!isLiveOrGlobal) return
    onSubmitLabelChange?.(liveType === 'reimbursable_expenses' ? 'Add Reimbursement' : 'Save')
  }, [isPitch, pitchType, isLiveOrGlobal, liveType, onSubmitLabelChange])

  function handleLiveTypeChange(next: ExpenseType) {
    setLiveType(next)
    resetLiveDependent(next)
  }

  function handlePitchTypeChange(next: PitchExpenseType) {
    setPitchType(next)
    resetPitchDependent(next)
  }

  const canSubmit = useMemo(() => {
    if (context === 'global' && !selectedProjectId) return false
    if (isLiveOrGlobal && !effectiveProjectId) return false
    if (isPitch && !pitchVersion) return false

    if (isPitch) {
      const nameOk = description.trim().length > 0
      const amtOk = amountNum > 0
      if (!nameOk || !amtOk) return false
      if (pitchType === 'additional' || pitchType === 'office_expenses') {
        return true
      }
      if (pitchType === 'vendor') return Boolean(serviceId && selectedMappingPitch)
      if (pitchType === 'reimbursable_expenses') return Boolean(serviceId && selectedMappingPitch)
      if (pitchType === 'common') {
        return pitchBuildVendors.length > 0 && totalCommonWeight > 0 && Boolean(paidByVendorId)
      }
      return false
    }

    if (amountNum <= 0) return false
    if (liveType === 'vendor_linked' || liveType === 'reimbursable_expenses') {
      return Boolean(serviceId && selectedMappingLive)
    }
    if (liveType === 'common') {
      return buildVendors.length > 0 && totalCommonWeight > 0 && Boolean(paidByVendorId)
    }
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
    totalCommonWeight,
    pitchBuildVendors.length,
    buildVendors.length,
    paidByVendorId,
  ])

  useEffect(() => {
    onValidityChange?.(canSubmit)
  }, [canSubmit, onValidityChange])

  const submit = useCallback(() => {
    if (!canSubmit) return

    if (isPitch && pitchVersion) {
      const baseId = editingPlannedExpense?.id ?? `pe-${Date.now()}`
      let expense: PlannedExpense
      if (pitchType === 'additional' || pitchType === 'office_expenses') {
        expense = {
          id: baseId,
          type: pitchType,
          name: description.trim(),
          amount: amountNum,
          date: date || undefined,
          documentUrl,
        }
      } else if (pitchType === 'vendor' || pitchType === 'reimbursable_expenses') {
        const map = selectedMappingPitch
        const svc = selectedPitchService
        if (!map || !svc) return
        expense = {
          id: baseId,
          type: pitchType,
          name: description.trim(),
          amount: amountNum,
          vendorId: map.vendorId,
          serviceId: svc.id,
          serviceName: svc.name,
          milestoneId: milestoneId || undefined,
          milestoneName:
            milestonesForService.find((m) => m.milestoneId === milestoneId)?.milestoneName ?? undefined,
          date: date || undefined,
          documentUrl,
        }
      } else {
        const allocations = computeAllocationsForVendors(
          amountNum,
          pitchBuildVendors.map((v) => ({
            vendorId: v.vendorId,
            vendorName: v.vendorName,
            weight: v.poSum,
          })),
          COMMON_EXPENSE_SPLIT_METHOD,
        )
        if (allocations.length === 0) return
        const payer = pitchBuildVendors.find((v) => v.vendorId === paidByVendorId)
        if (!payer) return
        const vendorSplits = allocations.map((a) => ({
          vendorId: a.vendorId,
          percentage: a.allocationPercent,
          amount: a.allocationAmount,
        }))
        expense = {
          id: baseId,
          type: 'common',
          name: description.trim(),
          amount: amountNum,
          vendorSplits,
          splitMethod: COMMON_EXPENSE_SPLIT_METHOD,
          paidByVendorId: payer.vendorId,
          paidByVendorName: payer.vendorName,
        }
      }
      onSubmit({ mode: 'planned_expense', expense })
      return
    }

    const pid = effectiveProjectId
    if (!pid) return

    if (liveType === 'vendor_linked' || liveType === 'reimbursable_expenses') {
      const svc = findServiceInBaseline(baseline ?? null, serviceId)
      const ms = milestonesForService.find((m) => m.milestoneId === milestoneId)
      if (!selectedMappingLive) return
      const data: CreateExpenseBody = {
        type: liveType,
        description: description.trim(),
        amount: amountNum,
        date: date || '',
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
      const allocations = computeCommonExpenseAllocations(
        amountNum,
        projectVendorPOs,
        COMMON_EXPENSE_SPLIT_METHOD,
      )
      if (allocations.length === 0) return
      const payer = buildVendors.find((v) => v.vendorId === paidByVendorId)
      if (!payer) return
      const data: CreateExpenseBody = {
        type: 'common',
        description: description.trim(),
        amount: amountNum,
        date: date || '',
        documentUrl,
        splitMethod: COMMON_EXPENSE_SPLIT_METHOD,
        paidByVendorId: payer.vendorId,
        paidByVendorName: payer.vendorName,
        vendorAllocations: allocations,
        status: 'pending',
      }
      onSubmit({ mode: 'live_expense', projectId: pid, data })
      return
    }

    const data: CreateExpenseBody = {
      type: liveType === 'office_expenses' ? 'office_expenses' : 'additional',
      description: description.trim(),
      amount: amountNum,
      date: date || '',
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
    pitchBuildVendors,
    liveType,
    effectiveProjectId,
    baseline,
    serviceId,
    date,
    documentUrl,
    selectedMappingLive,
    milestonesForService,
    projectVendorPOs,
    paidByVendorId,
    buildVendors,
    onSubmit,
  ])

  useImperativeHandle(ref, () => ({ submit }), [submit])

  const showDateDoc =
    isLiveOrGlobal ||
    (isPitch && (pitchType === 'office_expenses' || pitchType === 'reimbursable_expenses'))
  const showLiveDateDoc = isLiveOrGlobal
  const isReimbursable = !isPitch && liveType === 'reimbursable_expenses'
  const isPitchReimbursable = isPitch && pitchType === 'reimbursable_expenses'

  return (
    <Stack gap={0}>
      <FormSection title="Expense Type" columns={1} divider={false}>
        <FormField label="Type" required>
          {isPitch ? (
            <Select
              size="small"
              value={pitchType}
              onChange={(e) => handlePitchTypeChange(e.target.value as PitchExpenseType)}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              {pitchTypeOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 12 }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <Select
              size="small"
              value={liveType}
              onChange={(e) => handleLiveTypeChange(e.target.value as ExpenseType)}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              {liveTypeOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 12 }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          )}
        </FormField>
        {isCommonExpense && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: -0.5 }}>
            Split across mapped build vendors. Other vendors&apos; shares are recovered through payable
            adjustments.
          </Typography>
        )}
        {(isPitch ? pitchType === 'vendor' : liveType === 'vendor_linked') && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: -0.5 }}>
            Link this expense directly to the selected vendor.
          </Typography>
        )}
        {(isPitch ? pitchType === 'additional' : liveType === 'additional') && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: -0.5 }}>
            Project-level expense without vendor allocation.
          </Typography>
        )}
        {(isPitch ? pitchType === 'office_expenses' : liveType === 'office_expenses') && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: -0.5 }}>
            Absorbed internally without vendor debit.
          </Typography>
        )}
      </FormSection>

      <FormSection title="Expense Details" columns={2}>
        {context === 'global' && (
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
        )}
        <FormField label={isPitch ? 'Expense name' : 'Description'} required={isPitch}>
          <Input value={description} onChange={setDescription} size="sm" />
        </FormField>
        <FormField label="Amount" required>
          <Input
            type="number"
            value={amount}
            onChange={setAmount}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        {(showLiveDateDoc || showDateDoc) && (
          <FormField
            label={isReimbursable || isPitchReimbursable ? 'Date vendor made the payment' : 'Date'}
          >
            <Input type="date" value={date} onChange={setDate} size="sm" />
          </FormField>
        )}
      </FormSection>

      {isPitch && (pitchType === 'vendor' || pitchType === 'reimbursable_expenses') && pitchVersion && (
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
          <FormField
            label={isPitchReimbursable ? 'Milestone Reference' : 'Milestone (reference only)'}
            hint={
              isPitchReimbursable
                ? 'For reference only — does not affect payment grouping'
                : 'This is for tracking only, not payment grouping'
            }
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

      {!isPitch && (liveType === 'vendor_linked' || liveType === 'reimbursable_expenses') && (
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
            label={isReimbursable ? 'Milestone Reference' : 'Milestone (reference only)'}
            hint={
              isReimbursable
                ? 'For reference only — does not affect payment grouping'
                : 'This is for tracking only, not payment grouping'
            }
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

      {isCommonExpense && (isPitch ? pitchVersion : true) && (
        <FormSection title="Allocation" columns={1}>
          <Box
            sx={{
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 2,
              p: 2,
              bgcolor: tokens.color.neutral[50],
            }}
          >
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="overline" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
                Allocation Preview
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                ₹{formatCurrency(amountNum > 0 ? amountNum : 0)}
              </Typography>
            </Stack>

            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, display: 'block', mb: 1 }}>
              Affected Build Vendors
            </Typography>

            {commonVendors.length === 0 ? (
              <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main' }}>
                {isPitch && projectVendorPOs.length === 0
                  ? 'No mapped vendors on this version. Add vendor mappings first.'
                  : 'No mapped build vendors for this project. Add vendor POs first.'}
              </Typography>
            ) : totalCommonWeight <= 0 ? (
              <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main' }}>
                No vendor PO values for proportional split. Add vendor PO values first.
              </Typography>
            ) : commonPreview.length === 0 ? (
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                Enter an amount to preview allocation.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600, py: 1 }}>Vendor Name</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11, fontWeight: 600, py: 1 }}>
                        Allocated Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commonPreview.map((row) => (
                      <TableRow key={row.vendorId}>
                        <TableCell sx={{ fontSize: 12, py: 1 }}>{row.vendorName}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, py: 1 }}>
                          ₹{formatCurrency(row.allocationAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, borderTop: `2px solid ${tokens.color.neutral[200]}` }}>
                        Total Allocated
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: 12, fontWeight: 700, borderTop: `2px solid ${tokens.color.neutral[200]}` }}
                      >
                        ₹{formatCurrency(commonPreview.reduce((s, r) => s + r.allocationAmount, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </FormSection>
      )}

      {isCommonExpense && (isPitch ? pitchVersion : true) && (
        <FormSection title="Paid By" columns={1}>
          <FormField label="Paid By" required>
            <Select
              size="small"
              displayEmpty
              value={paidByVendorId}
              onChange={(e) => setPaidByVendorId(e.target.value)}
              fullWidth
              disabled={commonVendors.length === 0}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select vendor
              </MenuItem>
              {commonVendors.map((v) => (
                <MenuItem key={v.vendorId} value={v.vendorId} sx={{ fontSize: 12 }}>
                  {v.vendorName}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            Vendor who initially paid this common expense. Other vendors&apos; shares are recovered
            through payable adjustments.
          </Typography>
        </FormSection>
      )}

      {(showLiveDateDoc || showDateDoc) && (
        <FormSection title="Attach Document" columns={1}>
          <FileUpload
            accept="image/*,.pdf"
            label={isReimbursable || isPitchReimbursable ? 'Supporting receipt / proof' : 'Attach document (optional)'}
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
