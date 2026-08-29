import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { WorkspaceSection } from '@/components/templates'
import { Badge, ConfirmDialog, StatusBadge, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import { deleteVendorPO, fetchVendorPOs } from '@/slices/baseline/thunk'
import type { VendorInvoice, VendorPayment } from '@/slices/live/types'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchPayments, fetchVendorInvoices } from '@/slices/live/thunk'
import { dropdownsApi } from '@/api/dropdownsApi'
import { isDueDateOverdue, MONEY_EPS } from '@/pages/Projects/tabs/live/clientInvoiceUtils'
import {
  PayableAmountBreakdownColumn,
  PayableDueDateCell,
  PayableInvoiceDetailsColumn,
  PayablePaymentSummaryColumn,
  PayableStatusCell,
} from '@/pages/Projects/tabs/live/projectLivePayableMilestoneColumns'
import {
  resolvePayableMilestoneAmounts,
  resolvePayableMilestoneDueDate,
  resolvePayableMilestonePaymentSummary,
} from '@/pages/Projects/tabs/live/projectLivePayableMilestoneDisplay'
import { resolvePitchVersionForProject } from '@/store/selectors/pitchSelectors'
import {
  buildVendorPOMilestoneOverviewRows,
  vendorMilestoneTypeLabel,
  type VendorPOMilestoneOverviewRow,
  type VendorServiceNameCatalogEntry,
} from '@/pages/Projects/tabs/live/vendorPOHelpers'
import {
  flattenVendorPoMilestones,
} from '@/pages/Finance/utils/vendorBillable'
import {
  findVendorInvoicesForMilestone,
  vendorMilestoneIsBilled,
} from '@/pages/Projects/tabs/live/milestonePaymentStatus'
import {
  projectLivePayableBillingPhase,
  projectLivePayableBillingStatusBadge,
  projectLivePayablePaymentPhase,
  projectLivePayablePaymentStatusBadge,
  findPayableInvoiceEligibleForPayment,
  findPayableInvoiceForView,
  vendorInvoiceOutstanding,
} from '@/pages/Projects/tabs/live/vendorProjectLivePayableStatus'
import {
  shouldShowPayableRecordPayment,
  shouldShowPayableViewInvoice,
} from '@/pages/Projects/tabs/live/projectLivePayableActions'
import { ProjectLiveRowActionMenu } from '@/pages/Projects/tabs/live/ProjectLiveRowActionMenu'
import {
  UploadVendorInvoiceDrawer,
  VendorPayableWorkflowDrawer,
  buildProjectVendorOptionsFromVendorPOs,
  computeMilestonePayableStatus,
  invoiceMatchesRow,
  type VendorMilestoneEntry,
  type VendorPayableDrawerFocus,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement'
import type { ParsedPayableContext } from '@/utils/payableNavigation'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: 1.5,
  px: 2,
} as const

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: 1.5,
  px: 2,
  boxSizing: 'border-box' as const,
} as const

const CENTER_CELL_SX = {
  ...TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

const CENTER_HEADER_SX = {
  ...TABLE_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

const NESTED_HEADER_SX = {
  ...TABLE_HEADER_SX,
  bgcolor: tokens.color.neutral[50],
  py: 1,
} as const

const NESTED_CELL_SX = {
  ...TABLE_CELL_SX,
  bgcolor: 'transparent',
  py: 1.25,
} as const

const PAYABLES_COLUMN_COUNT = 7
const PAYABLES_COL_WIDTH = `${100 / PAYABLES_COLUMN_COUNT}%`

const PAYABLES_TABLE_HEADER_SX = {
  ...NESTED_HEADER_SX,
  width: PAYABLES_COL_WIDTH,
} as const

const PAYABLES_TABLE_CELL_SX = {
  ...NESTED_CELL_SX,
  width: PAYABLES_COL_WIDTH,
  verticalAlign: 'top',
} as const

const PAYABLES_STATUS_HEADER_SX = {
  ...PAYABLES_TABLE_HEADER_SX,
  textAlign: 'center' as const,
} as const

const PAYABLES_STATUS_CELL_SX = {
  ...PAYABLES_TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

const PAYABLES_ACTION_CELL_SX = {
  ...PAYABLES_TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
} as const

const PAYABLES_NESTED_HEADERS = [
  'Milestone / Service',
  'Invoice Details',
  'Due Date',
  'Amount Breakdown',
  'Payment Summary',
  'Status',
] as const

const PARENT_COL_COUNT = 5

type OverallStatus = 'Paid' | 'Partial' | 'Unpaid'
type InvoiceBillingLabel = 'Not Invoiced' | 'Partially Invoiced' | 'Fully Invoiced'

interface VendorPOGroup {
  poId: string
  poNumber: string
  vendorId: string
  vendor: string
  milestones: VendorPOMilestoneOverviewRow[]
  overallStatus: OverallStatus
  invoiceStatus: InvoiceBillingLabel
}

function rowToVendorContext(row: VendorPOMilestoneOverviewRow): VendorServiceRow | null {
  if (!row.vendorId || !row.serviceId) return null
  return {
    vendorId: row.vendorId,
    vendorName: row.vendor,
    serviceId: row.serviceId,
    serviceName: row.serviceName || row.service,
  }
}

function buildPoGroups(
  milestoneRows: VendorPOMilestoneOverviewRow[],
  projectScopedInvoices: VendorInvoice[],
  projectPayments: VendorPayment[],
): VendorPOGroup[] {
  const byPo = new Map<string, VendorPOMilestoneOverviewRow[]>()
  for (const row of milestoneRows) {
    const list = byPo.get(row.poId) ?? []
    list.push(row)
    byPo.set(row.poId, list)
  }

  const groups: VendorPOGroup[] = []
  for (const [, milestones] of byPo) {
    const first = milestones[0]
    let paidCount = 0
    let uploadedCount = 0

    for (const m of milestones) {
      const context = rowToVendorContext(m)
      const isBilled =
        context != null &&
        vendorMilestoneIsBilled(
          projectScopedInvoices.filter((inv) => invoiceMatchesRow(inv, context)),
          m.milestoneId,
          m.serviceId,
          m.name,
        )
      if (isBilled) {
        uploadedCount += 1
        const covering = findVendorInvoicesForMilestone(
          projectScopedInvoices.filter((inv) => invoiceMatchesRow(inv, context!)),
          m.milestoneId,
          m.serviceId,
          m.name,
        )
        if (
          projectLivePayablePaymentPhase(covering, projectPayments) === 'paid'
        ) {
          paidCount += 1
        }
      }
    }

    const total = milestones.length
    const overallStatus: OverallStatus =
      paidCount === 0 ? 'Unpaid' : paidCount === total ? 'Paid' : 'Partial'
    const invoiceStatus: InvoiceBillingLabel =
      uploadedCount === 0
        ? 'Not Invoiced'
        : uploadedCount === total
          ? 'Fully Invoiced'
          : 'Partially Invoiced'

    groups.push({
      poId: first.poId,
      poNumber: first.poNumber,
      vendorId: first.vendorId,
      vendor: first.vendor,
      milestones,
      overallStatus,
      invoiceStatus,
    })
  }

  return groups.sort((a, b) => {
    const byVendor = a.vendor.localeCompare(b.vendor)
    if (byVendor !== 0) return byVendor
    return a.poNumber.localeCompare(b.poNumber)
  })
}

function overallStatusColor(status: OverallStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'Paid') return 'success'
  if (status === 'Partial') return 'warning'
  return 'neutral'
}

export interface VendorMilestonesSectionProps {
  projectId: string
  projectName?: string
  vendorPOs: VendorPO[]
  baseline: Baseline | null
  payableContext?: ParsedPayableContext
}

export function VendorMilestonesSection({
  projectId,
  projectName = '',
  vendorPOs,
  baseline,
  payableContext,
}: VendorMilestonesSectionProps) {
  const dispatch = useAppDispatch()
  const theme = useTheme()
  const toast = useToast()
  const { vendorInvoices, payments } = useAppSelector((s) => s.live)
  const project = useAppSelector((s) =>
    (s.projects.items ?? []).find((p) => p.id === projectId),
  )
  const { activeVersion, versions } = useAppSelector((s) => s.pitch)
  const resolvedProjectName = projectName || project?.name || ''

  const [masterServiceCatalog, setMasterServiceCatalog] = useState<VendorServiceNameCatalogEntry[]>(
    [],
  )
  const [uploadOpen, setUploadOpen] = useState(false)
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VendorPOGroup | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [initialSelection, setInitialSelection] = useState<{
    projectId: string
    vendorId: string
    vendorPoId?: string
    serviceId: string
    milestoneId?: string
  } | null>(null)
  const [workflowDrawer, setWorkflowDrawer] = useState<{
    entry: VendorMilestoneEntry
    invoiceId: string
    focus: VendorPayableDrawerFocus
  } | null>(null)

  useEffect(() => {
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses({ projectId }))
    void dispatch(fetchPayments(projectId))
    let cancelled = false
    void dropdownsApi
      .getServices()
      .then((rows) => {
        if (cancelled) return
        setMasterServiceCatalog(rows.map((r) => ({ id: r.value, name: r.label })))
      })
      .catch(() => {
        if (!cancelled) setMasterServiceCatalog([])
      })
    return () => {
      cancelled = true
    }
  }, [dispatch, projectId])

  const serviceNameCatalog = useMemo((): VendorServiceNameCatalogEntry[] => {
    const catalog: VendorServiceNameCatalogEntry[] = [...masterServiceCatalog]

    const appendFromCategories = (
      categories:
        | {
            services: {
              id: string
              name?: string | null
              subcategoryId?: string | null
              subcategoryName?: string | null
              customName?: string | null
            }[]
          }[]
        | undefined,
    ) => {
      for (const cat of categories ?? []) {
        for (const svc of cat.services ?? []) {
          const label = (svc.subcategoryName ?? svc.name ?? svc.customName ?? '').trim()
          if (!label) continue
          catalog.push({ id: svc.id, name: label })
          if (svc.subcategoryId?.trim()) {
            catalog.push({ id: svc.subcategoryId, name: label })
          }
        }
      }
    }

    appendFromCategories(baseline?.categories)
    const pitchVersion = resolvePitchVersionForProject(projectId, activeVersion, versions)
    if (pitchVersion?.projectId === projectId) {
      appendFromCategories(pitchVersion.categories)
    }
    return catalog
  }, [masterServiceCatalog, baseline, projectId, activeVersion, versions])

  const milestoneRows = useMemo(
    () => buildVendorPOMilestoneOverviewRows(vendorPOs, projectId, baseline, serviceNameCatalog),
    [vendorPOs, projectId, baseline, serviceNameCatalog],
  )
  const payableFocusHandled = useRef(false)

  const projectScopedInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const projectScopedPayments = useMemo(
    () => payments.filter((p) => p.projectId === projectId),
    [payments, projectId],
  )

  const poGroups = useMemo(
    () => buildPoGroups(milestoneRows, projectScopedInvoices, projectScopedPayments),
    [milestoneRows, projectScopedInvoices, projectScopedPayments],
  )

  const projectVendorOptions = useMemo(
    () =>
      buildProjectVendorOptionsFromVendorPOs(
        [{ id: projectId, name: resolvedProjectName }],
        { [projectId]: vendorPOs },
      ),
    [projectId, resolvedProjectName, vendorPOs],
  )

  function openUploadInvoice(prefill?: {
    vendorId: string
    vendorPoId: string
    serviceId: string
    milestoneId?: string
  }) {
    setInitialSelection(
      prefill
        ? {
            projectId,
            vendorId: prefill.vendorId,
            vendorPoId: prefill.vendorPoId,
            serviceId: prefill.serviceId,
            milestoneId: prefill.milestoneId,
          }
        : null,
    )
    setUploadOpen(true)
  }

  function closeUploadInvoice() {
    setUploadOpen(false)
    setInitialSelection(null)
  }

  function buildWorkflowEntry(row: VendorPOMilestoneOverviewRow): VendorMilestoneEntry | null {
    const context = rowToVendorContext(row)
    if (!context) return null
    return {
      projectId,
      projectName: resolvedProjectName,
      row: context,
      milestone: {
        id: row.milestoneId,
        name: row.name,
        percentage: row.pct,
        value: row.amount,
      },
    }
  }

  function openPayableWorkflow(
    row: VendorPOMilestoneOverviewRow,
    invoiceId: string,
    focus: VendorPayableDrawerFocus,
  ) {
    const entry = buildWorkflowEntry(row)
    if (!entry) return
    setWorkflowDrawer({ entry, invoiceId, focus })
  }

  function closePayableWorkflow() {
    setWorkflowDrawer(null)
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchPayments(projectId))
  }

  function togglePoExpanded(poId: string) {
    setExpandedPoId((prev) => (prev === poId ? null : poId))
  }

  async function handleDeleteVendorPO() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await dispatch(deleteVendorPO({ projectId, poId: deleteTarget.poId })).unwrap()
      await dispatch(fetchVendorPOs(projectId)).unwrap()
      if (expandedPoId === deleteTarget.poId) setExpandedPoId(null)
      toast.success('Vendor PO deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete vendor PO')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (payableFocusHandled.current) return
    if (payableContext?.focus !== 'invoice' || !payableContext.milestoneId) return
    const row = milestoneRows.find((r) => r.milestoneId === payableContext.milestoneId)
    if (!row?.vendorId || !row.serviceId) return
    payableFocusHandled.current = true
    setExpandedPoId(row.poId)
    openUploadInvoice({
      vendorId: row.vendorId,
      vendorPoId: row.poId,
      serviceId: row.serviceId,
      milestoneId: row.milestoneId,
    })
    window.setTimeout(() => {
      document.getElementById('vendor-milestones-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 200)
  }, [payableContext, milestoneRows])

  useEffect(() => {
    if (!payableContext?.focus || payableContext.focus === 'invoice') return
    window.setTimeout(() => {
      document.getElementById('vendor-milestones-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 200)
  }, [payableContext?.focus])

  const hoverBg = alpha(theme.palette.primary.main, 0.04)
  const expandedBg = alpha(theme.palette.primary.main, 0.03)

  return (
    <WorkspaceSection title="Vendor Milestones" noPadding>
      <Box id="vendor-milestones-section" sx={{ width: '100%', overflow: 'hidden' }}>
        <Table
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& .MuiTableCell-root': { verticalAlign: 'middle', wordBreak: 'break-word' },
          }}
        >
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...TABLE_HEADER_SX, width: 44, px: 1 }} />
              <TableCell sx={TABLE_HEADER_SX}>Vendor</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>PO Number</TableCell>
              <TableCell sx={CENTER_HEADER_SX}>Total Milestones</TableCell>
              <TableCell sx={CENTER_HEADER_SX}>Payment Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {poGroups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={PARENT_COL_COUNT}
                  sx={{
                    ...TABLE_CELL_SX,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontSize: 13,
                    py: 3,
                  }}
                >
                  No vendor milestones yet. Add a vendor PO with milestone breakdown.
                </TableCell>
              </TableRow>
            ) : (
              poGroups.map((group) => {
                const isExpanded = expandedPoId === group.poId
                return (
                  <Fragment key={group.poId}>
                    <TableRow
                      hover
                      onClick={() => togglePoExpanded(group.poId)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isExpanded ? expandedBg : undefined,
                        '&:hover': { bgcolor: hoverBg },
                        '& td': { borderBottom: isExpanded ? 'none' : undefined },
                      }}
                    >
                      <TableCell sx={{ ...TABLE_CELL_SX, px: 1, width: 44 }}>
                        <IconButton
                          size="small"
                          aria-label={isExpanded ? 'Collapse milestones' : 'Expand milestones'}
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePoExpanded(group.poId)
                          }}
                          sx={{ p: 0.5 }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} strokeWidth={1.75} />
                          ) : (
                            <ChevronRight size={16} strokeWidth={1.75} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12, color: 'primary.main' }}>
                          {group.vendor}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}
                        >
                          {group.poNumber}
                        </Typography>
                      </TableCell>
                      <TableCell sx={CENTER_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                          {group.milestones.length}
                        </Typography>
                      </TableCell>
                      <TableCell sx={CENTER_CELL_SX}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Badge
                            label={group.overallStatus}
                            variant="soft"
                            color={overallStatusColor(group.overallStatus)}
                            size="sm"
                          />
                        </Box>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell
                        colSpan={PARENT_COL_COUNT}
                        sx={{
                          p: 0,
                          borderBottom: isExpanded
                            ? `1px solid ${tokens.color.neutral[100]}`
                            : 'none',
                        }}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              px: 2,
                              py: 1.5,
                              bgcolor: alpha(theme.palette.text.primary, 0.02),
                            }}
                          >
                            <Table
                              size="small"
                              sx={{
                                tableLayout: 'fixed',
                                width: '100%',
                                bgcolor: 'background.paper',
                                border: `1px solid ${tokens.color.neutral[100]}`,
                                borderRadius: 1,
                                overflow: 'hidden',
                                '& .MuiTableCell-root': {
                                  verticalAlign: 'top',
                                  wordBreak: 'break-word',
                                },
                              }}
                            >
                              <colgroup>
                                {Array.from({ length: PAYABLES_COLUMN_COUNT }, (_, index) => (
                                  <col key={index} style={{ width: PAYABLES_COL_WIDTH }} />
                                ))}
                              </colgroup>
                              <TableHead>
                                <TableRow>
                                  {PAYABLES_NESTED_HEADERS.map((col) => (
                                    <TableCell
                                      key={col}
                                      sx={
                                        col === 'Status'
                                          ? PAYABLES_STATUS_HEADER_SX
                                          : PAYABLES_TABLE_HEADER_SX
                                      }
                                    >
                                      {col}
                                    </TableCell>
                                  ))}
                                  <TableCell sx={PAYABLES_ACTION_CELL_SX} align="center" />
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {group.milestones.map((row) => {
                                  const context = rowToVendorContext(row)
                                  const scopedInvoices = context
                                    ? projectScopedInvoices.filter((inv) =>
                                        invoiceMatchesRow(inv, context),
                                      )
                                    : []
                                  const milestoneInvoices = context
                                    ? findVendorInvoicesForMilestone(
                                        scopedInvoices,
                                        row.milestoneId,
                                        row.serviceId,
                                        row.name,
                                      )
                                    : []
                                  const vendorPo = vendorPOs.find((po) => po.id === group.poId)
                                  const flatMilestone = vendorPo
                                    ? flattenVendorPoMilestones(vendorPo).find(
                                        (m) => m.milestoneId === row.milestoneId,
                                      )
                                    : undefined
                                  const isBilled =
                                    context != null &&
                                    vendorMilestoneIsBilled(
                                      scopedInvoices,
                                      row.milestoneId,
                                      row.serviceId,
                                      row.name,
                                    )
                                  const billingPhase =
                                    projectLivePayableBillingPhase(milestoneInvoices)
                                  const paymentPhase = projectLivePayablePaymentPhase(
                                    milestoneInvoices,
                                    projectScopedPayments,
                                  )
                                  const billingBadge =
                                    projectLivePayableBillingStatusBadge(billingPhase)
                                  const paymentBadge =
                                    projectLivePayablePaymentStatusBadge(paymentPhase)
                                  const showRecordPayment = shouldShowPayableRecordPayment(
                                    billingPhase,
                                    paymentPhase,
                                  )
                                  const showViewInvoice = shouldShowPayableViewInvoice(billingPhase)
                                  const viewInvoice = findPayableInvoiceForView(milestoneInvoices)
                                  const paymentEligibleInv = findPayableInvoiceEligibleForPayment(
                                    milestoneInvoices,
                                    projectScopedPayments,
                                  )
                                  const serviceLabel =
                                    row.serviceName && row.serviceName !== '—'
                                      ? row.serviceName
                                      : row.service
                                  const amounts = resolvePayableMilestoneAmounts(
                                    row,
                                    viewInvoice,
                                    vendorPo,
                                  )
                                  const paymentSummary = resolvePayableMilestonePaymentSummary(
                                    viewInvoice,
                                    projectScopedPayments,
                                  )
                                  const dueDate = resolvePayableMilestoneDueDate(
                                    viewInvoice,
                                    vendorPo,
                                    row.milestoneId,
                                  )
                                  const dueOverdue =
                                    viewInvoice != null &&
                                    vendorInvoiceOutstanding(viewInvoice, projectScopedPayments) >
                                      MONEY_EPS &&
                                    dueDate != null &&
                                    isDueDateOverdue(dueDate)

                                  return (
                                    <TableRow key={row.key}>
                                      <TableCell sx={PAYABLES_TABLE_CELL_SX}>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 600, lineHeight: 1.35 }}
                                        >
                                          {row.name}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                        >
                                          {serviceLabel}
                                        </Typography>
                                        <Chip
                                          label={vendorMilestoneTypeLabel(row.milestoneType)}
                                          size="small"
                                          sx={{ mt: 0.5, fontSize: 10, height: 18 }}
                                        />
                                      </TableCell>
                                      <TableCell sx={PAYABLES_TABLE_CELL_SX}>
                                        {viewInvoice ? (
                                          <PayableInvoiceDetailsColumn
                                            invoiceNumber={viewInvoice.invoiceNumber}
                                            invoiceDate={viewInvoice.invoiceDate}
                                            onView={() =>
                                              openPayableWorkflow(row, viewInvoice.id, 'details')
                                            }
                                          />
                                        ) : (
                                          <Typography variant="body2" color="text.disabled">
                                            —
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell sx={PAYABLES_TABLE_CELL_SX}>
                                        <PayableDueDateCell
                                          dueDate={dueDate}
                                          overdue={dueOverdue}
                                        />
                                      </TableCell>
                                      <TableCell sx={PAYABLES_TABLE_CELL_SX}>
                                        <PayableAmountBreakdownColumn {...amounts} />
                                      </TableCell>
                                      <TableCell sx={PAYABLES_TABLE_CELL_SX}>
                                        {paymentSummary ? (
                                          <PayablePaymentSummaryColumn {...paymentSummary} />
                                        ) : (
                                          <Typography variant="caption" color="text.disabled">
                                            —
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell sx={PAYABLES_STATUS_CELL_SX}>
                                        <PayableStatusCell>
                                          <Stack direction="column" gap={0.5} alignItems="center">
                                            <StatusBadge
                                              status={billingBadge.type}
                                              label={billingBadge.label}
                                              size="small"
                                            />
                                            <StatusBadge
                                              status={paymentBadge.type}
                                              label={paymentBadge.label}
                                              size="small"
                                            />
                                          </Stack>
                                        </PayableStatusCell>
                                      </TableCell>
                                      <TableCell sx={PAYABLES_ACTION_CELL_SX} align="center">
                                        <ProjectLiveRowActionMenu
                                          alwaysShowTrigger
                                          items={[
                                            {
                                              label: 'Upload Invoice',
                                              onClick: () =>
                                                openUploadInvoice({
                                                  vendorId: row.vendorId!,
                                                  vendorPoId: group.poId,
                                                  serviceId: row.serviceId!,
                                                  milestoneId: row.milestoneId,
                                                }),
                                              hidden: !(context && flatMilestone && !isBilled),
                                            },
                                            {
                                              label: 'View Invoice',
                                              onClick: () =>
                                                openPayableWorkflow(
                                                  row,
                                                  viewInvoice!.id,
                                                  'details',
                                                ),
                                              hidden: !(showViewInvoice && viewInvoice),
                                            },
                                            {
                                              label: 'Record Payment',
                                              onClick: () =>
                                                openPayableWorkflow(
                                                  row,
                                                  paymentEligibleInv!.id,
                                                  'payment',
                                                ),
                                              hidden: !(showRecordPayment && paymentEligibleInv),
                                            },
                                          ]}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </Box>

      <UploadVendorInvoiceDrawer
        open={uploadOpen}
        onClose={closeUploadInvoice}
        vendorInvoices={projectScopedInvoices}
        allVendorPOs={vendorPOs}
        projectId={projectId}
        projectName={resolvedProjectName}
        projectVendors={projectVendorOptions}
        initialSelection={initialSelection}
      />

      <VendorPayableWorkflowDrawer
        key={
          workflowDrawer
            ? `${workflowDrawer.invoiceId}-${workflowDrawer.entry.milestone.id}-${workflowDrawer.focus}`
            : 'closed'
        }
        open={workflowDrawer != null}
        onClose={closePayableWorkflow}
        entry={workflowDrawer?.entry ?? null}
        baseline={baseline}
        focus={workflowDrawer?.focus ?? 'details'}
        readOnly={workflowDrawer?.focus === 'details'}
        invoiceId={workflowDrawer?.invoiceId}
        paymentStatus={
          workflowDrawer
            ? computeMilestonePayableStatus(
                projectScopedInvoices.find((inv) => inv.id === workflowDrawer.invoiceId),
              )
            : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (deleting) return
          setDeleteTarget(null)
        }}
        onConfirm={() => void handleDeleteVendorPO()}
        loading={deleting}
        variant="destructive"
        title="Delete vendor PO?"
        description={
          deleteTarget
            ? `This will permanently remove ${deleteTarget.poNumber} and its milestones. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </WorkspaceSection>
  )
}
