import { useState, useMemo } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { Lock, ExpandMore, ExpandLess, Download, Visibility, CreditCard } from '@mui/icons-material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Baseline, ClientPO, VendorPO } from '@/slices/baseline/reducer'
import type { PitchCategory, PitchService } from '@/slices/pitch/reducer'
import { WorkspaceSection } from '@/components/templates'
import { tokens } from '@/design-system/tokens'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { computeBaselineReadiness } from '@/utils/baselineReadiness'
import {
  deriveClientMilestoneDisplayStatus,
  deriveVendorMappingMilestoneDisplayStatus,
} from '@/utils/baselineMilestoneStatus'
import { Button } from '@/design-system/components'

function serviceVendorTotal(svc: PitchService): number {
  return (svc.vendorMappings ?? []).reduce((s, vm) => s + vm.value, 0)
}

function serviceMargin(svc: PitchService): { rupees: number; pct: number } {
  const client = svc.value
  const vendor = serviceVendorTotal(svc)
  const rupees = client - vendor
  const pct = client > 0 ? (rupees / client) * 100 : 0
  return { rupees, pct }
}

/** Readiness banner + checklist */
export function BaselineReadinessBlock({
  baseline,
  vendorPOs,
  clientPOs,
}: {
  baseline: Baseline
  vendorPOs: VendorPO[]
  clientPOs: ClientPO[]
}) {
  const theme = useTheme()
  const { percent, rows } = useMemo(
    () => computeBaselineReadiness(baseline, vendorPOs, clientPOs),
    [baseline, vendorPOs, clientPOs],
  )

  function rowIcon(r: BaselineReadinessRow) {
    if (r.state === 'ok') return '✓'
    return '⚠'
  }

  return (
    <Box
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>
        Project Readiness: {percent}%
      </Typography>
      <LinearProgressLite value={percent} />
      <Stack sx={{ mt: 2, gap: 0.75 }}>
        {rows.map((r) => (
          <Typography key={r.id} variant="body2" sx={{ fontSize: 12 }}>
            {rowIcon(r)} {r.label}
          </Typography>
        ))}
      </Stack>
    </Box>
  )
}

function LinearProgressLite({ value }: { value: number }) {
  return (
    <Box sx={{ height: 8, borderRadius: 1, bgcolor: tokens.color.neutral[100], overflow: 'hidden', position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.min(100, Math.max(0, value))}%`,
          bgcolor: tokens.color.primary[500],
          borderRadius: 1,
          transition: 'width 0.2s ease',
        }}
      />
    </Box>
  )
}

interface LockedFinancialHierarchyProps {
  categories: PitchCategory[]
}

/** Service → vendor → milestones (read-only). */
export function LockedFinancialHierarchy({ categories }: LockedFinancialHierarchyProps) {
  const theme = useTheme()
  const [openServiceId, setOpenServiceId] = useState<string | null>(null)
  const [openVendorKey, setOpenVendorKey] = useState<string | null>(null)

  return (
    <WorkspaceSection
      title="Locked Financial Structure"
      subtitle="Financial Baseline (Locked) — service, vendor, and milestone hierarchy (read-only)"
    >
      <Stack spacing={1}>
        {categories.flatMap((cat) =>
          cat.services.map((svc) => {
            const margin = serviceMargin(svc)
            const vendorTotal = serviceVendorTotal(svc)
            const expanded = openServiceId === svc.id
            const keyPrefix = `${cat.id}-${svc.id}`
            return (
              <Box
                key={svc.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => setOpenServiceId(expanded ? null : svc.id)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    bgcolor: expanded ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
                    '&:hover': { bgcolor: tokens.color.neutral[50] },
                  }}
                >
                  <Box sx={{ color: 'text.secondary' }}>
                    {expanded ? <ExpandLess sx={{ fontSize: 20 }} /> : <ExpandMore sx={{ fontSize: 20 }} />}
                  </Box>
                  <Lock sx={{ fontSize: 16, color: tokens.color.neutral[400] }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                      {svc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      {cat.categoryName}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        Client value
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        ₹{formatCurrency(svc.value)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        Vendor total
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        ₹{formatCurrency(vendorTotal)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        Margin
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'success.main' }}>
                        ₹{formatCurrency(margin.rupees)} ({margin.pct.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
                <Collapse in={expanded}>
                  <Divider />
                  <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary' }}>
                      Vendors
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      {(svc.vendorMappings ?? []).map((vm) => {
                        /* Margin contribution: allocate service-level margin by vendor share of client value. */
                        const client = svc.value
                        const svcMargin = client - vendorTotal
                        const share = client > 0 ? vm.value / client : 0
                        const contribution = svcMargin * share
                        const vk = `${keyPrefix}-${vm.id}`
                        const vOpen = openVendorKey === vk
                        return (
                          <Box key={vm.id} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenVendorKey(vOpen ? null : vk)
                              }}
                              sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: tokens.color.neutral[50] } }}
                            >
                              {vOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                                  {vm.vendorName}
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ fontSize: 11 }}>
                                Allocated ₹{formatCurrency(vm.value)}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: 11, color: 'success.main', fontWeight: 600 }}>
                                Contribution ₹{formatCurrency(contribution)}
                              </Typography>
                            </Stack>
                            <Collapse in={vOpen}>
                              <Box sx={{ px: 2, pb: 1.5, pl: 5 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontSize: 10 }}>Milestone</TableCell>
                                      <TableCell sx={{ fontSize: 10 }}>%</TableCell>
                                      <TableCell sx={{ fontSize: 10 }}>Amount</TableCell>
                                      <TableCell sx={{ fontSize: 10 }}>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {vm.milestones.map((m, idx) => (
                                      <TableRow key={m.id}>
                                        <TableCell sx={{ fontSize: 11 }}>{m.name}</TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>{m.percentage}%</TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>₹{formatCurrency(m.value)}</TableCell>
                                        <TableCell sx={{ fontSize: 11 }}>
                                          {deriveVendorMappingMilestoneDisplayStatus(vm.milestones, idx)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </Box>
                        )
                      })}
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            )
          }),
        )}
      </Stack>
    </WorkspaceSection>
  )
}

/** Not mounted from TransitionTab State C while the section is hidden; wire back when Client vs Vendor Mapping is required again. */
export function ClientVendorMappingSection({ categories }: { categories: PitchCategory[] }) {
  return (
    <WorkspaceSection
      title="Client vs Vendor Mapping"
      subtitle="Profitability visibility by service"
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
            {['Service', 'Client value', 'Vendor cost', 'Margin (₹)', 'Margin (%)'].map((h) => (
              <TableCell key={h} sx={{ fontSize: 10, fontWeight: 700 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.flatMap((cat) =>
            cat.services.map((svc) => {
              const m = serviceMargin(svc)
              const v = serviceVendorTotal(svc)
              return (
                <TableRow key={svc.id}>
                  <TableCell sx={{ fontSize: 12 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {svc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cat.categoryName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(svc.value)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(v)}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>₹{formatCurrency(m.rupees)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{m.pct.toFixed(1)}%</TableCell>
                </TableRow>
              )
            }),
          )}
        </TableBody>
      </Table>
    </WorkspaceSection>
  )
}

/** Not mounted from TransitionTab State C while the section is hidden; wire back when Milestone Overview is required again. */
export function MilestoneOverviewSection({ categories }: { categories: PitchCategory[] }) {
  const clientRows = categories.flatMap((cat) =>
    cat.services.flatMap((svc) =>
      svc.clientMilestones.map((m, idx) => ({
        key: `${svc.id}-${m.id}`,
        service: svc.name,
        name: m.name,
        pct: m.percentage,
        amount: m.value,
        status: deriveClientMilestoneDisplayStatus(svc.clientMilestones, idx),
      })),
    ),
  )
  const vendorRows = categories.flatMap((cat) =>
    cat.services.flatMap((svc) =>
      (svc.vendorMappings ?? []).flatMap((vm) =>
        vm.milestones.map((m, idx) => ({
          key: `${svc.id}-${vm.id}-${m.id}`,
          service: svc.name,
          vendor: vm.vendorName,
          name: m.name,
          pct: m.percentage,
          amount: m.value,
          status: deriveVendorMappingMilestoneDisplayStatus(vm.milestones, idx),
        })),
      ),
    ),
  )

  return (
    <WorkspaceSection title="Milestone Overview" subtitle="Client and vendor milestones for execution">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, mb: 1, display: 'block' }}>
            Client milestones
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 10 }}>Name</TableCell>
                <TableCell sx={{ fontSize: 10 }}>%</TableCell>
                <TableCell sx={{ fontSize: 10 }}>Amount</TableCell>
                <TableCell sx={{ fontSize: 10 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientRows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell sx={{ fontSize: 11 }}>
                    <Typography variant="body2" sx={{ fontSize: 11 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.service}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{r.pct}%</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>₹{formatCurrency(r.amount)}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11, mb: 1, display: 'block' }}>
            Vendor milestones
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 10 }}>Name</TableCell>
                <TableCell sx={{ fontSize: 10 }}>%</TableCell>
                <TableCell sx={{ fontSize: 10 }}>Amount</TableCell>
                <TableCell sx={{ fontSize: 10 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendorRows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell sx={{ fontSize: 11 }}>
                    <Typography variant="body2" sx={{ fontSize: 11 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.vendor} · {r.service}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{r.pct}%</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>₹{formatCurrency(r.amount)}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    </WorkspaceSection>
  )
}

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const documentAccordionSx = {
  boxShadow: 'none',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  '&:before': { display: 'none' },
  overflow: 'hidden',
  mb: 1,
}

export function DocumentsTraceabilitySection({
  clientPOs,
  categories,
  vendorPOs,
}: {
  clientPOs: ClientPO[]
  categories: PitchCategory[]
  vendorPOs: VendorPO[]
}) {
  const quotationRows = useMemo(() => {
    const out: { fileName: string; link: string; uploadedAt: string; detail: string }[] = []
    for (const cat of categories) {
      for (const svc of cat.services) {
        for (const vm of svc.vendorMappings ?? []) {
          const q = vm.quotation
          if (q?.fileName) {
            out.push({
              fileName: q.fileName,
              link: q.fileUrl ?? '',
              uploadedAt: q.uploadedAt,
              detail: `${vm.vendorName} · ${svc.name}`,
            })
          }
        }
      }
    }
    return out
  }, [categories])

  return (
    <WorkspaceSection
      title="Documents"
      subtitle="Traceability: client PO files, vendor quotations, and vendor PO attachments"
    >
      <Stack spacing={1}>
        <Accordion defaultExpanded sx={documentAccordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
              Client POs
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                ({clientPOs.length})
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            {clientPOs.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No client POs on file.
              </Typography>
            ) : (
              clientPOs.map((po) => (
                <DocRow
                  key={po.id}
                  fileName={po.fileName ?? `${po.poNumber}.pdf`}
                  detail={`Client · ${po.poNumber}`}
                  uploadedAt={po.uploadedAt ?? po.startDate}
                  url={po.documentUrl}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion sx={documentAccordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
              Vendor quotations
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                ({quotationRows.length})
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            {quotationRows.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No quotations on file.
              </Typography>
            ) : (
              quotationRows.map((r, i) => (
                <DocRow
                  key={`${r.fileName}-${i}`}
                  fileName={r.fileName}
                  detail={r.detail}
                  uploadedAt={r.uploadedAt}
                  url={r.link || null}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion sx={documentAccordionSx}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
              Vendor PO files
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                ({vendorPOs.length})
              </Typography>
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
            {vendorPOs.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No vendor POs on file.
              </Typography>
            ) : (
              vendorPOs.map((vpo) => (
                <DocRow
                  key={vpo.id}
                  fileName={vpo.fileName ?? `${vpo.poNumber}.pdf`}
                  detail={`${vpo.vendorName} · ${vpo.poNumber}`}
                  uploadedAt={vpo.poDate}
                  url={vpo.documentUrl ?? null}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>
      </Stack>
    </WorkspaceSection>
  )
}

function DocRow({
  fileName,
  detail,
  uploadedAt,
  url,
}: {
  fileName: string
  detail: string
  uploadedAt: string
  url: string | null
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      spacing={1}
      sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Box>
        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
          {fileName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {detail} · Uploaded {formatDate(uploadedAt)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          size="sm"
          disabled={!url}
          startIcon={<Visibility sx={{ fontSize: 14 }} />}
          label="View"
          onClick={() => url && openUrl(url)}
        />
        <Button
          variant="outlined"
          size="sm"
          disabled={!url}
          startIcon={<Download sx={{ fontSize: 14 }} />}
          label="Download"
          onClick={() => url && openUrl(url)}
        />
      </Stack>
    </Stack>
  )
}

function statusChipLabel(s: VendorPO['status']): string {
  return s
}

/** Not mounted from TransitionTab State C while the section is hidden; wire back when Vendor PO overview is required again. */
export function StructuredVendorPOList({
  vendorPOs,
  categories,
  onTrackPayments,
}: {
  vendorPOs: VendorPO[]
  categories: PitchCategory[]
  onTrackPayments: (vpo: VendorPO) => void
}) {
  const serviceNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) {
      for (const s of c.services) m.set(s.id, s.name)
    }
    return m
  }, [categories])

  return (
    <WorkspaceSection title="Vendor Purchase Orders" subtitle="Issued vendor POs and execution (expand to view)">
      <Accordion
        defaultExpanded
        sx={{
          ...documentAccordionSx,
          mb: 0,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            minHeight: 48,
            '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: 1 },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14 }}>
              {'Issued vendor POs & execution'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {vendorPOs.length === 0
                ? 'No vendor POs yet'
                : `${vendorPOs.length} PO${vendorPOs.length === 1 ? '' : 's'} · values, terms, and payment actions`}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
          {vendorPOs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              No vendor POs yet. Issue vendor POs from the actions panel.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {vendorPOs.map((vpo) => {
                const linked =
                  vpo.linkedBaselineServiceIds?.map((id) => serviceNameById.get(id) ?? id).join(', ') ?? '—'
                return (
                  <Box
                    key={vpo.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 14 }}>
                            {vpo.vendorName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {vpo.poNumber}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: alpha(tokens.color.primary[500], 0.12),
                            color: tokens.color.primary[700],
                          }}
                        >
                          {statusChipLabel(vpo.status)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Linked services: {linked}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            PO value
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            ₹{formatCurrency(vpo.poValue)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            Payment terms
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {vpo.paymentTerms ?? '—'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ pt: 1 }}>
                        <Button
                          variant="outlined"
                          size="sm"
                          disabled={!vpo.documentUrl}
                          startIcon={<Visibility sx={{ fontSize: 14 }} />}
                          label="View PO"
                          onClick={() => vpo.documentUrl && openUrl(vpo.documentUrl)}
                        />
                        <Button
                          variant="outlined"
                          size="sm"
                          disabled={!vpo.documentUrl}
                          startIcon={<Download sx={{ fontSize: 14 }} />}
                          label="Download"
                          onClick={() => vpo.documentUrl && openUrl(vpo.documentUrl)}
                        />
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="sm"
                          startIcon={<CreditCard sx={{ fontSize: 14 }} />}
                          label="Track Payments"
                          onClick={() => onTrackPayments(vpo)}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    </WorkspaceSection>
  )
}
