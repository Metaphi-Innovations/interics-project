import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { WorkspaceSection } from '@/components/templates'
import { Badge, Button, ConfirmDialog, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import type { Baseline, VendorPO } from '@/slices/baseline/reducer'
import { deleteVendorPO, fetchVendorPOs } from '@/slices/baseline/thunk'
import type { VendorInvoice } from '@/slices/live/types'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchExpenses, fetchVendorInvoices } from '@/slices/live/thunk'
import { formatCurrency } from '@/utils/formatters'
import {
  buildVendorPOMilestoneOverviewRows,
  vendorMilestoneTypeLabel,
  type VendorPOMilestoneOverviewRow,
} from '@/pages/Projects/tabs/live/vendorPOHelpers'
import {
  UploadVendorInvoiceDrawer,
  buildEligibleVendorInvoiceUploadEntries,
  buildProjectVendorOptionsFromVendorPOs,
  findInvoiceForMilestone,
  invoiceMatchesRow,
  type VendorServiceRow,
} from '@/pages/Projects/tabs/live/vendorSettlement'
import { vendorMilestonePaymentStatus } from '@/pages/Projects/tabs/live/milestonePaymentStatus'
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

const PARENT_COL_COUNT = 5

type OverallStatus = 'Paid' | 'Partial' | 'Unpaid'
type InvoiceStatus = 'Uploaded' | 'Partial' | 'Pending'

interface VendorPOGroup {
  poId: string
  poNumber: string
  vendorId: string
  vendor: string
  milestones: VendorPOMilestoneOverviewRow[]
  overallStatus: OverallStatus
  invoiceStatus: InvoiceStatus
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
      const milestoneVm = {
        id: m.milestoneId,
        name: m.name,
        percentage: m.pct,
        value: m.amount,
      }
      const existingInvoice =
        context &&
        findInvoiceForMilestone(
          projectScopedInvoices.filter((inv) => invoiceMatchesRow(inv, context)),
          milestoneVm,
        )
      if (existingInvoice) {
        uploadedCount += 1
        if (vendorMilestonePaymentStatus([existingInvoice], m.milestoneId) === 'Paid') {
          paidCount += 1
        }
      }
    }

    const total = milestones.length
    const overallStatus: OverallStatus =
      paidCount === 0 ? 'Unpaid' : paidCount === total ? 'Paid' : 'Partial'
    const invoiceStatus: InvoiceStatus =
      uploadedCount === 0 ? 'Pending' : uploadedCount === total ? 'Uploaded' : 'Partial'

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

function invoiceStatusColor(status: InvoiceStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'Uploaded') return 'success'
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
  const { vendorInvoices } = useAppSelector((s) => s.live)
  const project = useAppSelector((s) =>
    (s.projects.items ?? []).find((p) => p.id === projectId),
  )
  const resolvedProjectName = projectName || project?.name || ''

  const [uploadOpen, setUploadOpen] = useState(false)
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VendorPOGroup | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [initialSelection, setInitialSelection] = useState<{
    projectId: string
    vendorId: string
    serviceId: string
    milestoneId?: string
  } | null>(null)

  useEffect(() => {
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses(projectId))
  }, [dispatch, projectId])

  const milestoneRows = useMemo(
    () => buildVendorPOMilestoneOverviewRows(vendorPOs, projectId, baseline),
    [vendorPOs, projectId, baseline],
  )
  const payableFocusHandled = useRef(false)

  const projectScopedInvoices = useMemo(
    () => vendorInvoices.filter((v) => v.projectId === projectId),
    [vendorInvoices, projectId],
  )

  const poGroups = useMemo(
    () => buildPoGroups(milestoneRows, projectScopedInvoices),
    [milestoneRows, projectScopedInvoices],
  )

  const eligibleEntries = useMemo(
    () =>
      buildEligibleVendorInvoiceUploadEntries(
        [{ id: projectId, name: resolvedProjectName }],
        { [projectId]: vendorPOs },
        { [projectId]: baseline },
        vendorInvoices,
      ),
    [projectId, resolvedProjectName, vendorPOs, baseline, vendorInvoices],
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
    serviceId: string
    milestoneId?: string
  }) {
    setInitialSelection(
      prefill
        ? {
            projectId,
            vendorId: prefill.vendorId,
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
    <WorkspaceSection
      title="Vendor Milestones"
      noPadding
      action={
        <Button
          size="sm"
          variant="contained"
          color="primary"
          label="Upload Invoice"
          onClick={() => openUploadInvoice()}
          disabled={projectVendorOptions.length === 0}
        />
      }
    >
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
              <TableCell sx={CENTER_HEADER_SX}>Overall Status</TableCell>
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
                              }}
                            >
                              <TableHead>
                                <TableRow>
                                  {[
                                    'Service',
                                    'Milestone',
                                    'Percentage',
                                    'Status',
                                    'Value',
                                    'Invoice Status',
                                    'Action',
                                  ].map((col) => (
                                    <TableCell
                                      key={col}
                                      sx={
                                        col === 'Status' ||
                                        col === 'Percentage' ||
                                        col === 'Invoice Status' ||
                                        col === 'Action'
                                          ? { ...NESTED_HEADER_SX, textAlign: 'center' }
                                          : NESTED_HEADER_SX
                                      }
                                    >
                                      {col}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {group.milestones.map((row, milestoneIndex) => {
                                  const context = rowToVendorContext(row)
                                  const milestoneVm = {
                                    id: row.milestoneId,
                                    name: row.name,
                                    percentage: row.pct,
                                    value: row.amount,
                                  }
                                  const existingInvoice =
                                    context &&
                                    findInvoiceForMilestone(
                                      projectScopedInvoices.filter((inv) =>
                                        invoiceMatchesRow(inv, context),
                                      ),
                                      milestoneVm,
                                    )
                                  const milestoneStatus = existingInvoice
                                    ? vendorMilestonePaymentStatus(
                                        [existingInvoice],
                                        row.milestoneId,
                                      )
                                    : 'Unpaid'
                                  const milestoneInvoiceStatus: InvoiceStatus = existingInvoice
                                    ? 'Uploaded'
                                    : 'Pending'

                                  return (
                                    <TableRow key={row.key}>
                                      <TableCell sx={NESTED_CELL_SX}>{row.service}</TableCell>
                                      <TableCell sx={NESTED_CELL_SX}>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontSize: 12, fontWeight: 600 }}
                                        >
                                          {row.name}
                                        </Typography>
                                        <Chip
                                          label={vendorMilestoneTypeLabel(row.milestoneType)}
                                          size="small"
                                          sx={{ mt: 0.5, fontSize: 10, height: 18 }}
                                        />
                                      </TableCell>
                                      <TableCell
                                        sx={{ ...NESTED_CELL_SX, textAlign: 'center' }}
                                      >
                                        {row.pct}%
                                      </TableCell>
                                      <TableCell
                                        sx={{ ...NESTED_CELL_SX, textAlign: 'center' }}
                                      >
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color:
                                              milestoneStatus === 'Paid'
                                                ? 'success.main'
                                                : 'text.secondary',
                                          }}
                                        >
                                          {milestoneStatus}
                                        </Typography>
                                      </TableCell>
                                      <TableCell sx={{ ...NESTED_CELL_SX, fontWeight: 600 }}>
                                        ₹{formatCurrency(row.amount)}
                                      </TableCell>
                                      <TableCell
                                        sx={{ ...NESTED_CELL_SX, textAlign: 'center' }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                          <Badge
                                            label={milestoneInvoiceStatus}
                                            variant="soft"
                                            color={invoiceStatusColor(milestoneInvoiceStatus)}
                                            size="sm"
                                          />
                                        </Box>
                                      </TableCell>
                                      <TableCell
                                        sx={{ ...NESTED_CELL_SX, textAlign: 'center' }}
                                      >
                                        {milestoneIndex === 0 ? (
                                          <IconButton
                                            size="small"
                                            aria-label={`Delete vendor PO ${group.poNumber}`}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setDeleteTarget(group)
                                            }}
                                            sx={{
                                              p: 0.75,
                                              color: tokens.color.error[500],
                                              '&:hover': {
                                                bgcolor: alpha(tokens.color.error[500], 0.08),
                                              },
                                            }}
                                          >
                                            <Trash2 size={16} strokeWidth={1.75} />
                                          </IconButton>
                                        ) : null}
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
        projectId={projectId}
        projectName={resolvedProjectName}
        eligibleEntries={eligibleEntries}
        projectVendors={projectVendorOptions}
        initialSelection={initialSelection}
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
