import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, MenuItem, Select, Typography } from '@mui/material'
import { DrawerForm, FormField, FormSection } from '@/components/templates/DrawerForm'
import {
  AutocompleteField,
  DatePicker,
  dateFromIso,
  FileUpload,
  Input,
  isoFromDate,
  useToast,
} from '@/design-system/components'
import { DEFAULT_GST_RATE } from '@/config/billingRates'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchVendorInvoices, uploadVendorInvoice } from '@/slices/live/thunk'
import { formatCurrency } from '@/utils/formatters'
import {
  DEFAULT_TDS_PERCENT,
  calcVendorInvoiceNetPayable,
  calcVendorInvoiceTdsAmount,
  TDS_RATE_OPTIONS,
} from './utils'
import type {
  EligibleInvoiceUploadEntry,
  ProjectVendorOption,
} from './eligibleInvoiceUpload'

export type { EligibleInvoiceUploadEntry, ProjectVendorOption }

export interface UploadVendorInvoiceInitialSelection {
  projectId: string
  vendorId: string
  serviceId?: string
  milestoneId?: string
}

interface ProjectOption {
  projectId: string
  projectName: string
}

interface VendorOption {
  vendorId: string
  vendorName: string
}

interface FormErrors {
  project?: string
  vendor?: string
  milestone?: string
  invoiceNumber?: string
  invoiceDate?: string
  baseAmount?: string
  tdsRate?: string
}

function gstOnBase(base: number, rate: number): number {
  return Math.round((base * rate) / 100)
}

function milestoneOptionKey(entry: EligibleInvoiceUploadEntry): string {
  return `${entry.projectId}::${entry.row.vendorId}::${entry.row.serviceId}::${entry.milestone.id}`
}

export function UploadVendorInvoiceDrawer({
  open,
  onClose,
  eligibleEntries,
  projectVendors,
  /** When set, Project is locked to this id (no Project dropdown). Used on Project → Live → Payable. */
  projectId: lockedProjectId,
  projectName: lockedProjectName,
  initialSelection,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  eligibleEntries: EligibleInvoiceUploadEntry[]
  /** Vendors from approved Vendor POs; falls back to eligible-entry vendors when omitted. */
  projectVendors?: ProjectVendorOption[]
  /** Lock drawer to a single project — hides the Project field. */
  projectId?: string
  projectName?: string
  initialSelection?: UploadVendorInvoiceInitialSelection | null
  /** Called after a successful upload (invoices already refreshed). */
  onUploaded?: (projectId: string) => void
}) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const isProjectScoped = Boolean(lockedProjectId)

  const [project, setProject] = useState<ProjectOption | null>(null)
  const [vendor, setVendor] = useState<VendorOption | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<EligibleInvoiceUploadEntry | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [tdsRate, setTdsRate] = useState(DEFAULT_TDS_PERCENT)
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)
  const [documentFileName, setDocumentFileName] = useState<string | undefined>(undefined)
  const [errors, setErrors] = useState<FormErrors>({})
  const initializedRef = useRef(false)

  const lockedProjectOption = useMemo((): ProjectOption | null => {
    if (!lockedProjectId) return null
    const nameFromVendors = projectVendors?.find((v) => v.projectId === lockedProjectId)?.projectName
    const nameFromEntries = eligibleEntries.find((e) => e.projectId === lockedProjectId)?.projectName
    return {
      projectId: lockedProjectId,
      projectName: lockedProjectName || nameFromVendors || nameFromEntries || '',
    }
  }, [lockedProjectId, lockedProjectName, projectVendors, eligibleEntries])

  const projectOptions = useMemo((): ProjectOption[] => {
    if (isProjectScoped && lockedProjectOption) return [lockedProjectOption]
    const map = new Map<string, string>()
    for (const v of projectVendors ?? []) {
      map.set(v.projectId, v.projectName)
    }
    for (const entry of eligibleEntries) {
      map.set(entry.projectId, entry.projectName)
    }
    return [...map.entries()]
      .map(([projectId, projectName]) => ({ projectId, projectName }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName))
  }, [eligibleEntries, projectVendors, isProjectScoped, lockedProjectOption])

  const activeProjectId = project?.projectId ?? lockedProjectId

  const vendorOptions = useMemo((): VendorOption[] => {
    if (!activeProjectId) return []
    if (projectVendors && projectVendors.length > 0) {
      return projectVendors
        .filter((v) => v.projectId === activeProjectId)
        .map((v) => ({ vendorId: v.vendorId, vendorName: v.vendorName }))
        .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
    }
    const map = new Map<string, string>()
    for (const entry of eligibleEntries) {
      if (entry.projectId !== activeProjectId) continue
      map.set(entry.row.vendorId, entry.row.vendorName)
    }
    return [...map.entries()]
      .map(([vendorId, vendorName]) => ({ vendorId, vendorName }))
      .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
  }, [eligibleEntries, activeProjectId, projectVendors])

  const milestoneOptions = useMemo((): EligibleInvoiceUploadEntry[] => {
    if (!activeProjectId || !vendor) return []
    return eligibleEntries
      .filter(
        (e) =>
          e.projectId === activeProjectId && e.row.vendorId === vendor.vendorId,
      )
      .slice()
      .sort((a, b) => {
        const byName = a.milestone.name.localeCompare(b.milestone.name)
        if (byName !== 0) return byName
        return a.row.serviceName.localeCompare(b.row.serviceName)
      })
  }, [eligibleEntries, activeProjectId, vendor])

  const milestoneNeedsServiceLabel = useMemo(() => {
    const serviceIds = new Set(milestoneOptions.map((e) => e.row.serviceId))
    return serviceIds.size > 1
  }, [milestoneOptions])

  function resetForm() {
    setProject(isProjectScoped ? lockedProjectOption : null)
    setVendor(null)
    setSelectedEntry(null)
    setInvoiceNumber('')
    setInvoiceDate('')
    setBaseAmount('')
    setTdsRate(DEFAULT_TDS_PERCENT)
    setDocumentUrl(undefined)
    setDocumentFileName(undefined)
    setErrors({})
  }

  useEffect(() => {
    if (!open) {
      initializedRef.current = false
      resetForm()
      return
    }
    if (initializedRef.current) return

    if (!initialSelection) {
      initializedRef.current = true
      resetForm()
      return
    }

    const matching = eligibleEntries.filter((e) => {
      if (e.projectId !== initialSelection.projectId) return false
      if (e.row.vendorId !== initialSelection.vendorId) return false
      if (initialSelection.serviceId && e.row.serviceId !== initialSelection.serviceId) {
        return false
      }
      return true
    })
    if (matching.length === 0) {
      // Eligible list may still be loading — retry when entries update.
      return
    }

    initializedRef.current = true
    const first = matching[0]
    setProject({ projectId: first.projectId, projectName: first.projectName })
    setVendor({ vendorId: first.row.vendorId, vendorName: first.row.vendorName })
    const preset =
      (initialSelection.milestoneId
        ? matching.find((e) => e.milestone.id === initialSelection.milestoneId)
        : undefined) ?? matching[0]
    setSelectedEntry(preset)
    setInvoiceNumber('')
    setInvoiceDate('')
    setBaseAmount(preset.milestone.value > 0 ? String(preset.milestone.value) : '')
    setTdsRate(DEFAULT_TDS_PERCENT)
    setDocumentUrl(undefined)
    setDocumentFileName(undefined)
    setErrors({})
  }, [open, initialSelection, eligibleEntries, isProjectScoped, lockedProjectOption])

  // Project-scoped: always lock project. Multi-project: preselect when only one option.
  useEffect(() => {
    if (!open || initialSelection || project) return
    if (isProjectScoped && lockedProjectOption) {
      setProject(lockedProjectOption)
      return
    }
    if (projectOptions.length === 1) {
      setProject(projectOptions[0])
    }
  }, [open, initialSelection, project, projectOptions, isProjectScoped, lockedProjectOption])

  useEffect(() => {
    if (!selectedEntry || selectedEntry.milestone.value <= 0) return
    setBaseAmount(String(selectedEntry.milestone.value))
  }, [selectedEntry])

  function clearError(key: keyof FormErrors) {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleProjectChange(next: ProjectOption | null) {
    setProject(next)
    setVendor(null)
    setSelectedEntry(null)
    clearError('project')
    setErrors((prev) => ({ ...prev, vendor: undefined, milestone: undefined }))
  }

  function handleVendorChange(next: VendorOption | null) {
    setVendor(next)
    setSelectedEntry(null)
    clearError('vendor')
    setErrors((prev) => ({ ...prev, milestone: undefined }))
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!isProjectScoped && !project) next.project = 'Project is required'
    if (!vendor) next.vendor = 'Vendor is required'
    if (!selectedEntry) next.milestone = 'Milestone is required'
    if (!invoiceNumber.trim()) next.invoiceNumber = 'Invoice number is required'
    const base = Number(baseAmount)
    if (!baseAmount.trim() || !Number.isFinite(base) || base <= 0) {
      next.baseAmount = 'Enter a valid invoice amount'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    const resolvedProject = project ?? lockedProjectOption
    if (!validate() || !resolvedProject || !vendor || !selectedEntry) return

    const base = Number(baseAmount)
    const gstRate = DEFAULT_GST_RATE
    const gstAmount = gstOnBase(base, gstRate)
    const tdsAmount = calcVendorInvoiceTdsAmount(base, tdsRate)
    const netPayable = calcVendorInvoiceNetPayable(base, 0, tdsRate, 0)

    try {
      await dispatch(
        uploadVendorInvoice({
          projectId: selectedEntry.projectId,
          data: {
            vendorId: selectedEntry.row.vendorId,
            vendorName: selectedEntry.row.vendorName,
            serviceId: selectedEntry.row.serviceId,
            serviceName: selectedEntry.row.serviceName,
            milestoneId: selectedEntry.milestone.id,
            milestoneName: selectedEntry.milestone.name,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate,
            baseAmount: base,
            gstRate,
            gstAmount,
            tdsRate,
            tdsAmount,
            linkedExpenseIds: [],
            expenseDeductions: 0,
            linkedAdditionExpenseIds: [],
            expenseAdditions: 0,
            netPayable,
            status: 'not_paid',
            documentUrl,
            fileName: documentFileName,
            projectName: selectedEntry.projectName,
          },
        }),
      ).unwrap()
      await dispatch(fetchVendorInvoices(selectedEntry.projectId)).unwrap()
      onUploaded?.(selectedEntry.projectId)
      toast.success('Vendor invoice uploaded')
      onClose()
    } catch {
      toast.error('Failed to upload vendor invoice')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Upload Invoice"
      subtitle="Add a vendor invoice to Payable"
      width={560}
      onSubmit={() => void handleSubmit()}
      submitLabel="Save Invoice"
      submitLoading={saving}
      submitDisabled={saving}
    >
      <FormSection title="Details" columns={1} divider={false}>
        {!isProjectScoped && (
          <FormField label="Project" required error={errors.project}>
            <AutocompleteField
              options={projectOptions}
              value={project}
              onChange={handleProjectChange}
              getOptionLabel={(o) => o.projectName}
              isOptionEqualToValue={(a, b) => a.projectId === b.projectId}
              placeholder={
                projectOptions.length === 0
                  ? 'No projects with Vendor POs'
                  : 'Search project…'
              }
              disabled={projectOptions.length === 0}
              error={Boolean(errors.project)}
              size="sm"
            />
          </FormField>
        )}

        <FormField label="Vendor" required error={errors.vendor}>
          <AutocompleteField
            options={vendorOptions}
            value={vendor}
            onChange={handleVendorChange}
            getOptionLabel={(o) => o.vendorName}
            isOptionEqualToValue={(a, b) => a.vendorId === b.vendorId}
            placeholder={
              !activeProjectId
                ? 'Select a project first'
                : vendorOptions.length === 0
                  ? 'No vendors with Vendor POs'
                  : 'Search vendor…'
            }
            disabled={!activeProjectId || vendorOptions.length === 0}
            error={Boolean(errors.vendor)}
            size="sm"
          />
        </FormField>

        <FormField label="Milestone" required error={errors.milestone}>
          <AutocompleteField
            options={milestoneOptions}
            value={selectedEntry}
            onChange={(next) => {
              setSelectedEntry(next)
              clearError('milestone')
            }}
            getOptionLabel={(o) => {
              const amount =
                o.milestone.value > 0
                  ? `${o.milestone.name} · ₹${formatCurrency(o.milestone.value)}`
                  : o.milestone.name
              if (!milestoneNeedsServiceLabel) return amount
              return `${amount} · ${o.row.serviceName}`
            }}
            isOptionEqualToValue={(a, b) => milestoneOptionKey(a) === milestoneOptionKey(b)}
            placeholder={
              !activeProjectId
                ? 'Select a project first'
                : !vendor
                  ? 'Select a vendor first'
                  : milestoneOptions.length === 0
                    ? 'No uninvoiced milestones'
                    : 'Search milestone…'
            }
            disabled={!activeProjectId || !vendor || milestoneOptions.length === 0}
            error={Boolean(errors.milestone)}
            size="sm"
          />
        </FormField>
      </FormSection>

      <FormSection title="Invoice Details" columns={2}>
        <FormField label="Invoice Number" required error={errors.invoiceNumber}>
          <Input
            value={invoiceNumber}
            onChange={(v) => {
              setInvoiceNumber(v)
              clearError('invoiceNumber')
            }}
            size="sm"
            error={Boolean(errors.invoiceNumber)}
          />
        </FormField>
        <FormField label="Invoice Date" error={errors.invoiceDate}>
          <DatePicker
            value={dateFromIso(invoiceDate)}
            onChange={(d) => {
              setInvoiceDate(isoFromDate(d))
              clearError('invoiceDate')
            }}
            fullWidth
            size="sm"
            error={Boolean(errors.invoiceDate)}
          />
        </FormField>
        <FormField label="Invoice Amount" required error={errors.baseAmount}>
          <Input
            type="number"
            value={baseAmount}
            onChange={(v) => {
              setBaseAmount(v)
              clearError('baseAmount')
            }}
            size="sm"
            error={Boolean(errors.baseAmount)}
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <FormField label="TDS" error={errors.tdsRate}>
          <Select
            size="small"
            fullWidth
            value={tdsRate}
            onChange={(e) => {
              setTdsRate(Number(e.target.value))
              clearError('tdsRate')
            }}
            error={Boolean(errors.tdsRate)}
            sx={{ fontSize: 12 }}
          >
            {TDS_RATE_OPTIONS.map((rate) => (
              <MenuItem key={rate} value={rate} sx={{ fontSize: 12 }}>
                {rate}%
              </MenuItem>
            ))}
          </Select>
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Upload Invoice Document" hint="Optional">
            <FileUpload
              accept="application/pdf,.pdf"
              maxFiles={1}
              label="Upload Invoice"
              onUpload={(files) => {
                const f = files[0]
                if (f) {
                  setDocumentUrl(URL.createObjectURL(f))
                  setDocumentFileName(f.name)
                } else {
                  setDocumentUrl(undefined)
                  setDocumentFileName(undefined)
                }
              }}
            />
          </FormField>
        </Box>
      </FormSection>
    </DrawerForm>
  )
}
