import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  MenuItem,
  Select,
  Link,
  Button as MuiButton,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Plus } from 'lucide-react'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../../components/templates/DrawerForm'
import {
  Button,
  Input,
  FileUpload,
  StatusBadge,
  useToast,
} from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createReimbursement, fetchReimbursements } from '../../../../slices/live/thunk'
import { fetchBaseline } from '../../../../slices/baseline/thunk'
import type { Reimbursement } from '../../../../slices/live/reducer'
import type { Baseline } from '../../../../slices/baseline/reducer'
import type { PitchService, VendorMapping } from '../../../../slices/pitch/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findPitchService(baseline: Baseline | null, serviceId: string): PitchService | undefined {
  if (!baseline) return undefined
  for (const cat of baseline.categories) {
    const s = cat.services.find((svc) => svc.id === serviceId)
    if (s) return s
  }
  return undefined
}

function baselineVendors(
  baseline: Baseline | null,
): { vendorId: string; vendorName: string }[] {
  const map = new Map<string, string>()
  if (!baseline) return []
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      for (const m of svc.vendorMappings) {
        map.set(m.vendorId, m.vendorName)
      }
    }
  }
  return [...map.entries()]
    .map(([vendorId, vendorName]) => ({ vendorId, vendorName }))
    .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
}

function servicesForVendor(baseline: Baseline | null, vendorId: string): PitchService[] {
  if (!baseline || !vendorId) return []
  const out: PitchService[] = []
  for (const cat of baseline.categories) {
    for (const svc of cat.services) {
      if (svc.vendorMappings.some((m) => m.vendorId === vendorId)) {
        out.push(svc)
      }
    }
  }
  return out
}

function findVendorMapping(
  baseline: Baseline | null,
  vendorId: string,
  serviceId: string,
): VendorMapping | undefined {
  const svc = findPitchService(baseline, serviceId)
  return svc?.vendorMappings.find((m) => m.vendorId === vendorId)
}

function reimbursementStatusDisplay(
  status: Reimbursement['status'],
): { status: StatusType; label: string } {
  switch (status) {
    case 'pending':
      return { status: 'pending', label: 'Pending' }
    case 'included_in_payment':
      return { status: 'paid', label: 'Included in Payment' }
  }
}

type ReimbursementFilter = 'all' | 'pending' | 'included'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: '10px',
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: '12px',
  px: 2,
}

// ─── Summary ────────────────────────────────────────────────────────────────────

function SummaryStrip({ rows }: { rows: Reimbursement[] }) {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const included = rows
    .filter((r) => r.status === 'included_in_payment')
    .reduce((s, r) => s + r.amount, 0)

  const metrics = [
    { label: 'Total', value: total },
    { label: 'Pending', value: pending },
    { label: 'Included in Payment', value: included },
    { label: 'Settled', value: included },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 2,
      }}
    >
      {metrics.map((m) => (
        <Box
          key={m.label}
          sx={{
            p: 2,
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
          >
            {m.label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, mt: 0.5 }}>
            ₹{formatCurrency(m.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── View drawer ────────────────────────────────────────────────────────────────

function ViewReimbursementDrawer({
  open,
  row,
  paymentLabel,
  onClose,
  onNavigateToPayments,
}: {
  open: boolean
  row: Reimbursement | null
  paymentLabel: string | null
  onClose: () => void
  onNavigateToPayments?: () => void
}) {
  if (!row) return null

  const st = reimbursementStatusDisplay(row.status)
  const showPaymentLink =
    row.status === 'included_in_payment' && row.linkedPaymentId && paymentLabel

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Reimbursement details"
      width={520}
      footer={
        <Box sx={{ px: '20px', py: '14px', display: 'flex', justifyContent: 'flex-end' }}>
          <MuiButton variant="outlined" size="small" onClick={onClose} sx={{ height: 32 }}>
            Close
          </MuiButton>
        </Box>
      }
    >
      <Stack gap={2} sx={{ py: 0.5 }}>
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          <StatusBadge status={st.status} label={st.label} size="small" />
        </Stack>

        {showPaymentLink && (
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => {
              onNavigateToPayments?.()
              onClose()
            }}
            sx={{
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              textAlign: 'left',
              border: 'none',
              background: 'none',
              p: 0,
              color: 'primary.main',
            }}
          >
            Included in Payment: {paymentLabel}
          </Link>
        )}

        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Vendor
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.vendorName}
          </Typography>
        </Stack>
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Service
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.serviceName}
          </Typography>
        </Stack>
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Milestone Ref
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, fontStyle: row.milestoneName ? 'normal' : 'italic', color: row.milestoneName ? 'text.primary' : 'text.secondary' }}>
            {row.milestoneName ?? '—'}
          </Typography>
        </Stack>
        <Stack gap={0.5}>
          <Typography variant="caption" color="text.secondary">
            Description
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.description}
          </Typography>
        </Stack>
        <Stack direction="row" gap={4} flexWrap="wrap">
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
              ₹{formatCurrency(row.amount)}
            </Typography>
          </Stack>
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {formatDate(row.date)}
            </Typography>
          </Stack>
        </Stack>
        {row.documentUrl && (
          <Stack gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              Document
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {row.documentUrl.replace(/^local:\/\//, '')}
            </Typography>
          </Stack>
        )}
      </Stack>
    </DrawerForm>
  )
}

// ─── Add drawer ─────────────────────────────────────────────────────────────────

interface AddReimbursementDrawerProps {
  open: boolean
  projectId: string
  baseline: Baseline | null
  onClose: () => void
}

function AddReimbursementDrawer({
  open,
  projectId,
  baseline,
  onClose,
}: AddReimbursementDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [vendorId, setVendorId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(undefined)

  const vendors = useMemo(() => baselineVendors(baseline), [baseline])
  const services = useMemo(() => servicesForVendor(baseline, vendorId), [baseline, vendorId])
  const mapping = useMemo(
    () => findVendorMapping(baseline, vendorId, serviceId),
    [baseline, vendorId, serviceId],
  )
  const milestoneOptions = mapping?.milestones ?? []

  useEffect(() => {
    if (!open) {
      setVendorId('')
      setServiceId('')
      setMilestoneId('')
      setDescription('')
      setAmount('')
      setDate('')
      setDocumentUrl(undefined)
    }
  }, [open])

  const resetAfterVendor = useCallback(() => {
    setServiceId('')
    setMilestoneId('')
  }, [])

  const handleSubmit = async () => {
    const n = Number(amount)
    if (!vendorId || !serviceId || !description.trim() || !date || !Number.isFinite(n) || n <= 0) {
      toast.error('Please fill in all required fields')
      return
    }
    const svc = findPitchService(baseline, serviceId)
    const v = vendors.find((x) => x.vendorId === vendorId)
    const ms = milestoneOptions.find((m) => m.id === milestoneId)
    try {
      await dispatch(
        createReimbursement({
          projectId,
          data: {
            vendorId,
            vendorName: v?.vendorName ?? '',
            serviceId,
            serviceName: svc?.name ?? '',
            milestoneId: ms?.id,
            milestoneName: ms?.name,
            description: description.trim(),
            amount: n,
            date,
            documentUrl,
            status: 'pending',
          },
        }),
      ).unwrap()
      toast.success('Reimbursement added')
      await dispatch(fetchReimbursements(projectId)).unwrap()
      onClose()
    } catch {
      toast.error('Failed to add reimbursement')
    }
  }

  const amountNum = Number(amount)
  const submitDisabled =
    saving ||
    !vendorId ||
    !serviceId ||
    !description.trim() ||
    !date ||
    !Number.isFinite(amountNum) ||
    amountNum <= 0

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Reimbursement"
      subtitle="Record amount paid by vendor on company's behalf"
      width={520}
      onSubmit={handleSubmit}
      submitLabel="Add Reimbursement"
      submitLoading={saving}
      submitDisabled={submitDisabled}
    >
      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(tokens.color.info[500], 0.35)}`,
          bgcolor: alpha(tokens.color.info[500], 0.08),
        }}
      >
        <Typography variant="body2" sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.5 }}>
          This amount will be added to the vendor&apos;s next payment settlement. TDS is calculated
          on invoice value only and does not apply to reimbursements.
        </Typography>
      </Box>

      <FormSection title="Scope" columns={1}>
        <FormField label="Vendor" required>
          <Select
            size="small"
            displayEmpty
            value={vendorId}
            onChange={(e) => {
              setVendorId(e.target.value)
              resetAfterVendor()
            }}
            fullWidth
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="" sx={{ fontSize: 12 }}>
              Select vendor
            </MenuItem>
            {vendors.map((v) => (
              <MenuItem key={v.vendorId} value={v.vendorId} sx={{ fontSize: 12 }}>
                {v.vendorName}
              </MenuItem>
            ))}
          </Select>
        </FormField>
        <FormField label="Service" required>
          <Select
            size="small"
            displayEmpty
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value)
              setMilestoneId('')
            }}
            fullWidth
            disabled={!vendorId || services.length === 0}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="" sx={{ fontSize: 12 }}>
              Select service
            </MenuItem>
            {services.map((s) => (
              <MenuItem key={s.id} value={s.id} sx={{ fontSize: 12 }}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Milestone Reference"
          hint="For reference only — does not affect payment grouping"
        >
          <Select
            size="small"
            displayEmpty
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            fullWidth
            disabled={!vendorId || !serviceId || milestoneOptions.length === 0}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="" sx={{ fontSize: 12 }}>
              None
            </MenuItem>
            {milestoneOptions.map((m) => (
              <MenuItem key={m.id} value={m.id} sx={{ fontSize: 12 }}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Details" columns={1}>
        <FormField label="Description" required>
          <Input
            value={description}
            onChange={setDescription}
            size="sm"
            placeholder="What did the vendor pay for?"
          />
        </FormField>
        <FormField label="Amount ₹" required>
          <Input
            type="number"
            value={amount}
            onChange={setAmount}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <FormField label="Date vendor made the payment" required>
          <Input type="date" value={date} onChange={setDate} size="sm" />
        </FormField>
      </FormSection>

      <FormSection title="Document" columns={1}>
        <FileUpload
          accept="image/*,.pdf"
          label="Supporting receipt / proof"
          onUpload={(files) => {
            const f = files[0]
            setDocumentUrl(f ? `local://${f.name}` : undefined)
          }}
        />
      </FormSection>
    </DrawerForm>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export interface ReimbursementTabProps {
  projectId: string
  onNavigateToPayments?: () => void
}

export default function ReimbursementTab({ projectId, onNavigateToPayments }: ReimbursementTabProps) {
  const dispatch = useAppDispatch()
  const { reimbursements, payments } = useAppSelector((s) => s.live)
  const { baseline } = useAppSelector((s) => s.baseline)

  const [filter, setFilter] = useState<ReimbursementFilter>('all')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [addOpen, setAddOpen] = useState(false)
  const [viewRow, setViewRow] = useState<Reimbursement | null>(null)

  useEffect(() => {
    void dispatch(fetchBaseline(projectId))
  }, [dispatch, projectId])

  const projectRows = useMemo(
    () => reimbursements.filter((r) => r.projectId === projectId),
    [reimbursements, projectId],
  )

  const filtered = useMemo(() => {
    let rows = projectRows
    if (filter === 'pending') rows = rows.filter((r) => r.status === 'pending')
    if (filter === 'included') rows = rows.filter((r) => r.status === 'included_in_payment')
    return [...rows].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      const da = new Date(a.date).getTime()
      const db = new Date(b.date).getTime()
      return (da - db) * mul
    })
  }, [projectRows, filter, sortDir])

  function handleSortDate() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  const paymentLabelForView = useMemo(() => {
    if (!viewRow?.linkedPaymentId) return null
    const p = payments.find((x) => x.id === viewRow.linkedPaymentId)
    return p?.id ?? viewRow.linkedPaymentId
  }, [viewRow, payments])

  const baselineForProject = baseline?.projectId === projectId ? baseline : null

  const pills: { id: ReimbursementFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'included', label: 'Included in Payment' },
  ]

  return (
    <>
      <SummaryStrip rows={projectRows} />

      <WorkspaceSection
        title="Reimbursements"
        noPadding
        action={
          <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mr: 1 }}>
              {pills.map((p) => {
                const selected = filter === p.id
                return (
                  <Box
                    key={p.id}
                    component="button"
                    type="button"
                    onClick={() => setFilter(p.id)}
                    sx={{
                      border: '1px solid',
                      borderColor: selected ? tokens.color.primary[500] : tokens.color.neutral[200],
                      bgcolor: selected ? tokens.color.primary[50] : 'background.paper',
                      color: 'text.primary',
                      px: 2,
                      py: 0.75,
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {p.label}
                  </Box>
                )
              })}
            </Stack>
            <Button
              size="sm"
              variant="contained"
              color="primary"
              label="Add Reimbursement"
              startIcon={<Plus size={14} strokeWidth={2} />}
              onClick={() => setAddOpen(true)}
            />
          </Stack>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Vendor</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone Ref</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Description</TableCell>
              <TableCell sx={TABLE_HEADER_SX} align="right">
                Amount
              </TableCell>
              <TableCell sx={TABLE_HEADER_SX}>
                <TableSortLabel
                  active
                  direction={sortDir}
                  onClick={handleSortDate}
                  sx={{ fontSize: 10 }}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ ...TABLE_CELL_SX, textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {projectRows.length === 0
                      ? 'No reimbursements yet'
                      : 'No reimbursements match this filter'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const st = reimbursementStatusDisplay(row.status)
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>{row.vendorName}</TableCell>
                  <TableCell sx={TABLE_CELL_SX}>{row.serviceName}</TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    {row.milestoneName ? (
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {row.milestoneName}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      {row.description}
                    </Typography>
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX} align="right">
                    ₹{formatCurrency(row.amount)}
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>{formatDate(row.date)}</TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.status} label={st.label} size="small" />
                  </TableCell>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Button
                      size="sm"
                      variant="outlined"
                      color="primary"
                      label="View"
                      onClick={() => setViewRow(row)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <AddReimbursementDrawer
        open={addOpen}
        projectId={projectId}
        baseline={baselineForProject}
        onClose={() => setAddOpen(false)}
      />

      <ViewReimbursementDrawer
        open={!!viewRow}
        row={viewRow}
        paymentLabel={paymentLabelForView}
        onClose={() => setViewRow(null)}
        onNavigateToPayments={onNavigateToPayments}
      />
    </>
  )
}
