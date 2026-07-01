import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button as MuiButton,
} from '@mui/material'
import { Add, Upload } from '@mui/icons-material'
import {
  PODocumentLinkField,
  poDocumentDisplayFileName,
  poDocumentOpenUrl,
} from '@/components/documents/PODocumentLinkField'
import { UploadedDocumentLink } from '@/components/documents/UploadedDocumentLink'
import { READONLY_DISABLED_TEXTFIELD_SX } from './readOnlyFieldStyles'
import { useTheme, alpha } from '@mui/material/styles'
import { Button, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import {
  deleteClientPO,
  fetchClientPO,
  updateClientPO,
  uploadClientPO,
} from '../../../../slices/baseline/thunk'
import { fetchInvoices } from '../../../../slices/live/thunk'
import type { ClientInvoice } from '../../../../slices/live/types'
import { fetchVersions } from '../../../../slices/pitch/thunk'
import type { ClientPO, ClientPOMilestone } from '../../../../slices/baseline/reducer'
import { formatCurrency } from '../../../../utils/formatters'
import {
  clientPOCardServiceOptions,
  clientPOCategoryOptions,
  flattenClientOfferServices,
  type ClientPOServiceOption,
} from './clientPOServiceOptions'
import {
  buildClientPOMilestonePayload,
  ClientPOMilestoneCardEditor,
  createClientPOMilestoneCard,
  groupClientCardsByService,
  isClientGroupedServiceValid,
  isMilestoneCardConfigured,
  clientPOCardsFromMilestones,
  type ClientPOMilestoneCard,
} from './ClientPOMilestoneCards'
import {
  buildClientPOExecutedValueUpdatePayload,
  canUpdateExecutedValue,
  effectiveExecutedValue,
  recalculateClientPOMilestonesForExecutedValue,
} from './poExecutedValueRules'
import {
  clientMilestonePaymentStatus,
  type MilestonePaymentStatusLabel,
} from './milestonePaymentStatus'

const PO_SECTION_TITLE_SX = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
} as const

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  py: 1,
  px: 1.5,
} as const

const TABLE_CELL_SX = {
  fontSize: 12,
  py: 1,
  px: 1.5,
  boxSizing: 'border-box' as const,
} as const

const CLIENT_PO_MILESTONE_COL_COUNT = 5
const CLIENT_PO_MILESTONE_COL_WIDTH = `${100 / CLIENT_PO_MILESTONE_COL_COUNT}%`

const MILESTONE_STATUS_HEADER_SX = {
  ...TABLE_HEADER_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

const MILESTONE_STATUS_CELL_SX = {
  ...TABLE_CELL_SX,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}

function useClientPOServiceOptions(projectId: string, open: boolean): ClientPOServiceOption[] {
  const dispatch = useAppDispatch()
  const { activeVersion } = useAppSelector((s) => s.pitch)
  const { baseline } = useAppSelector((s) => s.baseline)

  useEffect(() => {
    if (open) void dispatch(fetchVersions(projectId))
  }, [dispatch, projectId, open])

  return useMemo(
    () =>
      flattenClientOfferServices(
        activeVersion,
        baseline?.projectId === projectId ? baseline : null,
        projectId,
      ),
    [activeVersion, baseline, projectId],
  )
}

function isRetentionRow(milestone: ClientPOMilestone): boolean {
  return milestone.kind === 'retention' || milestone.id.startsWith('cli-ret-')
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

function MilestoneStatusCell({ status }: { status: MilestonePaymentStatusLabel }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontSize: 12,
        fontWeight: 600,
        color: status === 'Paid' ? 'success.main' : 'text.secondary',
      }}
    >
      {status}
    </Typography>
  )
}

function ClientPOMilestonesTable({
  milestones,
  projectInvoices,
}: {
  milestones: ClientPOMilestone[]
  projectInvoices: ClientInvoice[]
}) {
  if (milestones.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, textAlign: 'center' }}>
        No milestones recorded for this PO.
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          {Array.from({ length: CLIENT_PO_MILESTONE_COL_COUNT }, (_, index) => (
            <col key={index} style={{ width: CLIENT_PO_MILESTONE_COL_WIDTH }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
            <TableCell sx={TABLE_HEADER_SX}>Service Name</TableCell>
            <TableCell sx={TABLE_HEADER_SX}>Name</TableCell>
            <TableCell align="right" sx={TABLE_HEADER_SX}>
              Percentage (%)
            </TableCell>
            <TableCell sx={MILESTONE_STATUS_HEADER_SX}>Status</TableCell>
            <TableCell align="right" sx={TABLE_HEADER_SX}>
              Value (₹)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {milestones.map((m) => (
            <Fragment key={m.id}>
              <TableRow hover>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {m.serviceName || '—'}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                    {isRetentionRow(m) ? `${m.name} (Retention)` : m.name || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={TABLE_CELL_SX}>
                  {m.percentage}%
                </TableCell>
                <TableCell sx={MILESTONE_STATUS_CELL_SX}>
                  <MilestoneStatusCell
                    status={clientMilestonePaymentStatus(
                      projectInvoices,
                      m.id,
                      m.serviceId,
                    )}
                  />
                </TableCell>
                <TableCell align="right" sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                  ₹{formatCurrency(m.value)}
                </TableCell>
              </TableRow>
              {m.retention && !isRetentionRow(m) ? (
                <TableRow key={`${m.id}-retention`} sx={{ bgcolor: tokens.color.neutral[50] }}>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {m.serviceName || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, pl: 3 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                      ↳ Retention
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={TABLE_CELL_SX}>
                    {m.retention.percentage}%
                  </TableCell>
                  <TableCell sx={MILESTONE_STATUS_CELL_SX}>
                    <MilestoneStatusCell status="Unpaid" />
                  </TableCell>
                  <TableCell align="right" sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                    ₹{formatCurrency(m.retention.value)}
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

interface AddClientPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function AddClientPODrawer({ open, onClose, projectId }: AddClientPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const toast = useToast((s) => s.showToast)
  const serviceOptions = useClientPOServiceOptions(projectId, open)
  const categoryOptions = useMemo(
    () => clientPOCategoryOptions(serviceOptions),
    [serviceOptions],
  )
  const cardServiceOptions = useMemo(
    () => clientPOCardServiceOptions(serviceOptions),
    [serviceOptions],
  )
  const [poFormData, setPoFormData] = useState({
    poNumber: '',
    poValue: '',
    executedValue: '',
    file: null as File | null,
  })
  const [milestoneCards, setMilestoneCards] = useState<ClientPOMilestoneCard[]>([])

  useEffect(() => {
    if (!open) {
      setPoFormData({ poNumber: '', poValue: '', executedValue: '', file: null })
      setMilestoneCards([])
    }
  }, [open])

  const poValueNumber = Number(poFormData.poValue) || 0
  const executedValueNumber = poFormData.executedValue
    ? Number(poFormData.executedValue)
    : poValueNumber
  const milestoneBaseValue = executedValueNumber

  const hasConfiguredEntries = useMemo(
    () => milestoneCards.some(isMilestoneCardConfigured),
    [milestoneCards],
  )

  const groupedForSave = useMemo(
    () =>
      groupClientCardsByService(
        milestoneCards.filter(isMilestoneCardConfigured),
      ),
    [milestoneCards],
  )

  const groupedSaveValid = useMemo(
    () => groupedForSave.every((group) => isClientGroupedServiceValid(milestoneBaseValue, group)),
    [groupedForSave, milestoneBaseValue],
  )

  useEffect(() => {
    if (milestoneBaseValue <= 0) return
    setMilestoneCards((prev) => {
      let changed = false
      const next = prev.map((card) => {
        if (!card.retention) return card
        const amount = Math.round((card.retention.percentage / 100) * milestoneBaseValue)
        if (card.retention.amount === amount) return card
        changed = true
        return { ...card, retention: { ...card.retention, amount } }
      })
      return changed ? next : prev
    })
  }, [milestoneBaseValue])

  const handlePoChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handlePoValueChange(value: string) {
    setPoFormData((prev) => {
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

  const submitDisabled = saving || serviceOptions.length === 0
  const cardsDisabled = categoryOptions.length === 0

  async function handleSubmit() {
    if (!poFormData.poNumber || !poFormData.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (!hasConfiguredEntries || groupedForSave.length === 0) {
      toast({ title: 'Add at least one milestone entry', variant: 'error' })
      return
    }
    if (!groupedSaveValid) {
      toast({
        title: 'Combined milestones per service must equal 100%',
        variant: 'error',
      })
      return
    }

    const milestonePayload = buildClientPOMilestonePayload(groupedForSave, serviceOptions)
    const executedValueNumberSave = poFormData.executedValue
      ? Number(poFormData.executedValue)
      : null

    try {
      await dispatch(
        uploadClientPO({
          projectId,
          data: {
            poNumber: poFormData.poNumber,
            startDate: '',
            endDate: '',
            poValue: poValueNumber,
            executedValue: executedValueNumberSave,
            documentUrl: null,
            fileName: poFormData.file?.name,
            milestones: milestonePayload,
          },
        }),
      ).unwrap()
      void dispatch(fetchClientPO(projectId))
      toast({ title: 'PO saved successfully', variant: 'success' })
      onClose()
    } catch {
      toast({ title: 'Failed to save PO', variant: 'error' })
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Client PO"
      subtitle="Record the client purchase order details"
      onSubmit={handleSubmit}
      submitLoading={saving}
      submitLabel="Save PO"
      submitDisabled={submitDisabled}
    >
      {serviceOptions.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
          Add client offer services on the Pitch tab before adding PO milestones.
        </Alert>
      ) : null}
      <Box sx={{ mb: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: poFormData.file ? 0.5 : '12px' }}
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
              onChange={(e) =>
                setPoFormData((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))
              }
            />
          </MuiButton>
        </Stack>
        {poFormData.file ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: '12px', textAlign: 'right', fontSize: 11 }}
          >
            {poFormData.file.name}
          </Typography>
        ) : null}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          <FormField label="PO Number" required>
            <TextField
              fullWidth
              size="small"
              value={poFormData.poNumber}
              onChange={handlePoChange('poNumber')}
              placeholder="PO-CLI-2024-001"
            />
          </FormField>
          <FormField label="PO Value (₹)" required>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={poFormData.poValue}
              onChange={(e) => handlePoValueChange(e.target.value)}
              placeholder="0"
            />
          </FormField>
          <FormField label="Executed Value (₹)">
            <TextField
              fullWidth
              size="small"
              type="number"
              value={poFormData.executedValue}
              onChange={handlePoChange('executedValue')}
              placeholder="0"
            />
          </FormField>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <MilestoneSectionPanel
        title="Milestones"
        addLabel="Add Milestone"
        onAdd={() =>
          setMilestoneCards((prev) => [
            ...prev,
            createClientPOMilestoneCard(categoryOptions, cardServiceOptions),
          ])
        }
        addDisabled={cardsDisabled}
        isEmpty={milestoneCards.length === 0}
      >
        {milestoneCards.map((card) => (
          <ClientPOMilestoneCardEditor
            key={card.id}
            card={card}
            categoryOptions={categoryOptions}
            serviceOptions={cardServiceOptions}
            milestoneBaseValue={milestoneBaseValue}
            includeRetention
            onChange={(patch) =>
              setMilestoneCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
              )
            }
            onRemove={() => setMilestoneCards((prev) => prev.filter((c) => c.id !== card.id))}
          />
        ))}
      </MilestoneSectionPanel>
    </DrawerForm>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  )
}

interface ViewClientPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  po: ClientPO | null
}

export function ViewClientPODrawer({ open, onClose, projectId, po }: ViewClientPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const { invoices } = useAppSelector((s) => s.live)
  const toast = useToast((s) => s.showToast)
  const [updatingExecutedValue, setUpdatingExecutedValue] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [executedValueDraft, setExecutedValueDraft] = useState('')

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  useEffect(() => {
    if (open) {
      void dispatch(fetchInvoices(projectId))
    }
  }, [open, projectId, dispatch])

  useEffect(() => {
    if (!open || !po) {
      setUpdatingExecutedValue(false)
      setDeleteOpen(false)
      return
    }
    setExecutedValueDraft(String(effectiveExecutedValue(po)))
  }, [open, po?.id])

  const previewMilestones = useMemo(() => {
    if (!po || !updatingExecutedValue) return po?.milestones ?? []
    const nextValue = Number(executedValueDraft)
    if (!Number.isFinite(nextValue) || nextValue <= 0) return po.milestones ?? []
    return recalculateClientPOMilestonesForExecutedValue(
      po.milestones ?? [],
      nextValue,
      projectInvoices,
    )
  }, [po, updatingExecutedValue, executedValueDraft, projectInvoices])

  const serviceOptions = useClientPOServiceOptions(projectId, open)
  const categoryOptions = useMemo(
    () => clientPOCategoryOptions(serviceOptions),
    [serviceOptions],
  )
  const cardServiceOptions = useMemo(
    () => clientPOCardServiceOptions(serviceOptions),
    [serviceOptions],
  )

  const previewMilestoneCards = useMemo(() => {
    if (!updatingExecutedValue) return []
    return clientPOCardsFromMilestones(previewMilestones, serviceOptions).milestoneCards
  }, [updatingExecutedValue, previewMilestones, serviceOptions])

  const milestoneBaseValue = useMemo(() => {
    const nextValue = Number(executedValueDraft)
    if (updatingExecutedValue && Number.isFinite(nextValue) && nextValue > 0) return nextValue
    return po ? effectiveExecutedValue(po) : 0
  }, [updatingExecutedValue, executedValueDraft, po])

  function resetExecutedValueEdit() {
    if (!po) return
    setExecutedValueDraft(String(effectiveExecutedValue(po)))
    setUpdatingExecutedValue(false)
  }

  async function handleSaveExecutedValue() {
    if (!po) return
    if (!canUpdateExecutedValue(po)) {
      toast({ title: 'Executed value can no longer be updated', variant: 'error' })
      return
    }
    const nextValue = Number(executedValueDraft)
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      toast({ title: 'Enter a valid executed value', variant: 'error' })
      return
    }
    try {
      const nextMilestones = recalculateClientPOMilestonesForExecutedValue(
        po.milestones ?? [],
        nextValue,
        projectInvoices,
      )
      await dispatch(
        updateClientPO({
          projectId,
          poId: po.id,
          data: buildClientPOExecutedValueUpdatePayload(nextValue, nextMilestones),
        }),
      ).unwrap()
      void dispatch(fetchClientPO(projectId))
      toast({ title: 'Executed value updated', variant: 'success' })
      setUpdatingExecutedValue(false)
    } catch (err) {
      toast({
        title: typeof err === 'string' ? err : 'Failed to update executed value',
        variant: 'error',
      })
    }
  }

  async function handleDelete() {
    if (!po) return
    try {
      await dispatch(deleteClientPO({ projectId, poId: po.id })).unwrap()
      void dispatch(fetchClientPO(projectId))
      toast({ title: 'PO deleted', variant: 'success' })
      setDeleteOpen(false)
      onClose()
    } catch {
      toast({ title: 'Failed to delete PO', variant: 'error' })
    }
  }

  const showExecutedValueUpdated = Boolean(po?.executedValueLocked)

  function handlePoDocumentOpenFailed() {
    toast({
      title: 'Unable to open document',
      description: 'The PO file is no longer available in this session.',
      variant: 'error',
    })
  }

  return (
    <>
      <DrawerForm
        open={open}
        onClose={onClose}
        title={po?.poNumber ?? 'Client PO'}
        subtitle={
          updatingExecutedValue
            ? 'Update the executed value (one-time change)'
            : 'Purchase order details'
        }
        footer={
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{ px: 2.5, py: 1.75, width: '100%' }}
          >
            {!updatingExecutedValue && showExecutedValueUpdated ? (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontSize: 11, mr: 'auto' }}
              >
                Executed Value Updated
              </Typography>
            ) : null}
            {updatingExecutedValue ? (
              <>
                <Button variant="text" size="sm" label="Cancel" onClick={resetExecutedValueEdit} />
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label={saving ? 'Saving…' : 'Save'}
                  onClick={() => void handleSaveExecutedValue()}
                  disabled={saving}
                />
              </>
            ) : (
              <>
                {po && canUpdateExecutedValue(po) ? (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="primary"
                    label="Update Executed Value"
                    onClick={() => setUpdatingExecutedValue(true)}
                  />
                ) : null}
                <Button
                  size="sm"
                  variant="outlined"
                  color="error"
                  label="Delete"
                  onClick={() => setDeleteOpen(true)}
                />
              </>
            )}
          </Stack>
        }
      >
        {po ? (
          <Stack spacing={2.5}>
            {updatingExecutedValue ? (
              <>
                <Box sx={{ mb: 0 }}>
                  <Typography
                    component="span"
                    variant="overline"
                    sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
                  >
                    PO Details
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px',
                      ...READONLY_DISABLED_TEXTFIELD_SX,
                    }}
                  >
                    <FormField label="PO Number" required>
                      <TextField
                        fullWidth
                        size="small"
                        value={po?.poNumber ?? ''}
                        disabled
                      />
                    </FormField>
                    <FormField label="PO Value (₹)" required>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={po?.poValue ?? ''}
                        disabled
                      />
                    </FormField>
                    {po?.fileName && poDocumentOpenUrl(po.documentUrl) ? (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <UploadedDocumentLink
                          fileName={poDocumentDisplayFileName(po.fileName)!}
                          documentUrl={poDocumentOpenUrl(po.documentUrl)}
                          onOpenFailed={handlePoDocumentOpenFailed}
                        />
                      </Box>
                    ) : null}
                    <FormField label="Executed Value (₹)" required>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={executedValueDraft}
                        onChange={(e) => setExecutedValueDraft(e.target.value)}
                      />
                    </FormField>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <MilestoneSectionPanel
                  title="Milestones"
                  addLabel="Add Milestone"
                  onAdd={() => undefined}
                  isEmpty={previewMilestoneCards.length === 0}
                  showAddButton={false}
                >
                  {previewMilestoneCards.map((card) => (
                    <ClientPOMilestoneCardEditor
                      key={card.id}
                      card={card}
                      categoryOptions={categoryOptions}
                      serviceOptions={cardServiceOptions}
                      milestoneBaseValue={milestoneBaseValue}
                      includeRetention
                      readOnly
                      onChange={() => undefined}
                      onRemove={() => undefined}
                    />
                  ))}
                </MilestoneSectionPanel>
              </>
            ) : (
              <>
            <Box>
              <Typography
                component="span"
                variant="overline"
                sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
              >
                PO Details
              </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}
                >
                  <ReadOnlyField label="PO Number" value={po.poNumber} />
                  <ReadOnlyField label="PO Value" value={`₹${formatCurrency(po.poValue)}`} />
                  <ReadOnlyField
                    label="Executed Value"
                    value={`₹${formatCurrency(effectiveExecutedValue(po))}`}
                  />
                  <PODocumentLinkField
                    fileName={po.fileName}
                    documentUrl={po.documentUrl}
                    onOpenFailed={handlePoDocumentOpenFailed}
                    emptyLabel="No document uploaded"
                  />
                </Box>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <Box>
              <Typography
                component="span"
                variant="overline"
                sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
              >
                Milestones
              </Typography>
              <ClientPOMilestonesTable
                milestones={po.milestones ?? []}
                projectInvoices={projectInvoices}
              />
            </Box>
              </>
            )}
          </Stack>
        ) : null}
      </DrawerForm>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Delete client PO?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            This will permanently remove {po?.poNumber}. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setDeleteOpen(false)}>
            Cancel
          </MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            color="error"
            disabled={saving}
            onClick={() => void handleDelete()}
          >
            Delete
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
