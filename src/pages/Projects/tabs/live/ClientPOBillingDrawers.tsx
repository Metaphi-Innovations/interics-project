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
  poDocumentOpenUrl,
} from '@/components/documents/PODocumentLinkField'
import { READONLY_DISABLED_TEXTFIELD_SX } from './readOnlyFieldStyles'
import { useTheme, alpha } from '@mui/material/styles'
import { Button, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { uploadProjectDocumentFile } from '@/api/uploadFileApi'
import { DrawerForm, FormField } from '../../../../components/templates'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import {
  deleteClientPO,
  fetchClientPoById,
  fetchClientPO,
  updateClientPO,
  uploadClientPO,
} from '../../../../slices/baseline/thunk'
import { fetchInvoices } from '../../../../slices/live/thunk'
import type { ClientInvoice } from '../../../../slices/live/types'
import { fetchCategories, fetchServices } from '../../../../slices/settings/thunk'
import type { ClientPO, ClientPOMilestone } from '../../../../slices/baseline/reducer'
import { formatCurrency } from '../../../../utils/formatters'
import {
  clientPOCardServiceOptions,
  masterCategoryOptions,
  masterClientPOServiceOptions,
  type ClientPOServiceOption,
} from './clientPOServiceOptions'
import {
  buildClientPOMilestonePayload,
  ClientPOMilestoneCardEditor,
  createClientPOMilestoneCard,
  groupClientCardsByService,
  isMilestoneCardConfigured,
  clientPOCardsFromMilestones,
  mergeClientPOMilestoneEditsFromCards,
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
  clientMilestoneStatusesForCard,
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

function useClientPOMasterOptions(open: boolean): {
  categoryOptions: { id: string; label: string }[]
  serviceOptions: ClientPOServiceOption[]
  cardServiceOptions: { id: string; label: string; categoryId: string }[]
} {
  const dispatch = useAppDispatch()
  const categories = useAppSelector((s) => s.settings.categories)
  const services = useAppSelector((s) => s.settings.services)

  useEffect(() => {
    if (!open) return
    void dispatch(fetchCategories())
    void dispatch(fetchServices())
  }, [dispatch, open])

  const serviceOptions = useMemo(
    () => masterClientPOServiceOptions(categories, services),
    [categories, services],
  )
  const categoryOptions = useMemo(() => masterCategoryOptions(categories), [categories])
  const cardServiceOptions = useMemo(
    () => clientPOCardServiceOptions(serviceOptions),
    [serviceOptions],
  )

  return { categoryOptions, serviceOptions, cardServiceOptions }
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
          {milestones.map((m) => {
            const status =
              m.status ??
              clientMilestonePaymentStatus(projectInvoices, m.id, m.serviceId, m.name)
            return (
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
                  <MilestoneStatusCell status={status} />
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
                    <MilestoneStatusCell
                      status={
                        m.retention.status ??
                        clientMilestonePaymentStatus(
                          projectInvoices,
                          `${m.id}-retention`,
                          m.serviceId,
                          `${m.name} — Retention`,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                    ₹{formatCurrency(m.retention.value)}
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
            )
          })}
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
  const { categoryOptions, serviceOptions, cardServiceOptions } = useClientPOMasterOptions(open)
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
        let retention = card.retention
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

  const submitDisabled = saving || categoryOptions.length === 0
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

    const milestonePayload = buildClientPOMilestonePayload(groupedForSave, serviceOptions)
    const executedValueNumberSave = poFormData.executedValue
      ? Number(poFormData.executedValue)
      : null

    try {
      let documentUrl: string | null = null
      let fileName: string | undefined
      let uploadedAt: string | null = null
      if (poFormData.file) {
        const uploaded = await uploadProjectDocumentFile(poFormData.file)
        documentUrl = uploaded.viewUrl
        fileName = uploaded.originalName || poFormData.file.name
        uploadedAt = new Date().toISOString()
      }

      await dispatch(
        uploadClientPO({
          projectId,
          data: {
            poNumber: poFormData.poNumber,
            startDate: '',
            endDate: '',
            poValue: poValueNumber,
            executedValue: executedValueNumberSave,
            documentUrl,
            fileName,
            uploadedAt,
            milestones: milestonePayload,
          },
        }),
      ).unwrap()
      void dispatch(fetchClientPO(projectId))
      toast({ title: 'PO saved successfully', variant: 'success' })
      onClose()
    } catch (err) {
      const message =
        typeof err === 'string' && err.trim()
          ? err
          : 'Failed to save PO'
      toast({ title: message, variant: 'error' })
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
      {categoryOptions.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
          Add active categories and services in Settings before adding PO milestones.
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
  /** Prefer poId so the drawer loads a fresh GET /po/:poId payload. */
  poId: string | null
  /** Optional seed while the detail request is in flight. */
  poSeed?: ClientPO | null
}

export function ViewClientPODrawer({
  open,
  onClose,
  projectId,
  poId,
  poSeed = null,
}: ViewClientPODrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.baseline)
  const { invoices } = useAppSelector((s) => s.live)
  const toast = useToast((s) => s.showToast)
  const [po, setPo] = useState<ClientPO | null>(poSeed)
  const [loadingPo, setLoadingPo] = useState(false)
  const [updatingExecutedValue, setUpdatingExecutedValue] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [executedValueDraft, setExecutedValueDraft] = useState('')
  const [milestoneCardOverrides, setMilestoneCardOverrides] = useState<
    ClientPOMilestoneCard[] | null
  >(null)

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  const { categoryOptions, serviceOptions, cardServiceOptions } = useClientPOMasterOptions(open)

  useEffect(() => {
    if (!open || !poId) {
      setPo(null)
      setLoadingPo(false)
      return
    }
    let cancelled = false
    setPo((prev) => (prev?.id === poId ? prev : poSeed?.id === poId ? poSeed : null))
    setLoadingPo(true)
    void dispatch(fetchClientPoById({ projectId, poId }))
      .unwrap()
      .then((detail) => {
        if (!cancelled) setPo(detail)
      })
      .catch((err) => {
        if (!cancelled) {
          toast({
            title: typeof err === 'string' ? err : 'Failed to load PO',
            variant: 'error',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPo(false)
      })
    void dispatch(fetchInvoices(projectId))
    return () => {
      cancelled = true
    }
    // poSeed is only used for first paint; intentionally omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, poId, projectId, dispatch, toast])

  useEffect(() => {
    if (!open || !po) {
      setUpdatingExecutedValue(false)
      setDeleteOpen(false)
      setMilestoneCardOverrides(null)
      return
    }
    setExecutedValueDraft(String(effectiveExecutedValue(po)))
  }, [open, po?.id, po?.executedValue, po?.poValue])

  useEffect(() => {
    setMilestoneCardOverrides(null)
  }, [updatingExecutedValue, executedValueDraft, po?.id])

  const recalculatedMilestoneCards = useMemo(() => {
    if (!updatingExecutedValue || !po) return []
    const nextValue = Number(executedValueDraft)
    const milestones =
      !Number.isFinite(nextValue) || nextValue <= 0
        ? (po.milestones ?? [])
        : recalculateClientPOMilestonesForExecutedValue(
            po.milestones ?? [],
            nextValue,
            projectInvoices,
          )
    return clientPOCardsFromMilestones(milestones, serviceOptions).milestoneCards
  }, [updatingExecutedValue, executedValueDraft, po, projectInvoices, serviceOptions])

  const editMilestoneCards = milestoneCardOverrides ?? recalculatedMilestoneCards

  const previewMilestones = useMemo(() => {
    if (!po || !updatingExecutedValue) return po?.milestones ?? []
    const nextValue = Number(executedValueDraft)
    const base =
      !Number.isFinite(nextValue) || nextValue <= 0
        ? (po.milestones ?? [])
        : recalculateClientPOMilestonesForExecutedValue(
            po.milestones ?? [],
            nextValue,
            projectInvoices,
          )
    return mergeClientPOMilestoneEditsFromCards(base, editMilestoneCards, projectInvoices)
  }, [po, updatingExecutedValue, executedValueDraft, projectInvoices, editMilestoneCards])

  const milestoneBaseValue = useMemo(() => {
    const nextValue = Number(executedValueDraft)
    if (updatingExecutedValue && Number.isFinite(nextValue) && nextValue > 0) return nextValue
    return po ? effectiveExecutedValue(po) : 0
  }, [updatingExecutedValue, executedValueDraft, po])

  function resetExecutedValueEdit() {
    if (!po) return
    setExecutedValueDraft(String(effectiveExecutedValue(po)))
    setUpdatingExecutedValue(false)
    setMilestoneCardOverrides(null)
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
      const recalculated = recalculateClientPOMilestonesForExecutedValue(
        po.milestones ?? [],
        nextValue,
        projectInvoices,
      )
      const nextMilestones = mergeClientPOMilestoneEditsFromCards(
        recalculated,
        editMilestoneCards,
        projectInvoices,
      )
      await dispatch(
        updateClientPO({
          projectId,
          poId: po.id,
          data: buildClientPOExecutedValueUpdatePayload(nextValue, nextMilestones),
        }),
      ).unwrap()
      const detail = await dispatch(
        fetchClientPoById({ projectId, poId: po.id }),
      ).unwrap()
      setPo(detail)
      void dispatch(fetchClientPO(projectId))
      toast({ title: 'Executed value updated', variant: 'success' })
      setUpdatingExecutedValue(false)
      setMilestoneCardOverrides(null)
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
                    label="Updated"
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
        {loadingPo && !po ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, py: 4, textAlign: 'center' }}>
            Loading PO…
          </Typography>
        ) : null}
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
                        value={executedValueDraft}
                        onChange={(e) => setExecutedValueDraft(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Executed Value (₹)" required>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={executedValueDraft}
                        onChange={(e) => setExecutedValueDraft(e.target.value)}
                      />
                    </FormField>
                    {po?.fileName && poDocumentOpenUrl(po.documentUrl) ? (
                      <PODocumentLinkField
                        fileName={po.fileName}
                        documentUrl={po.documentUrl}
                        onOpenFailed={handlePoDocumentOpenFailed}
                        alignWithInput
                      />
                    ) : null}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <MilestoneSectionPanel
                  title="Milestones"
                  addLabel="Add Milestone"
                  onAdd={() => undefined}
                  isEmpty={editMilestoneCards.length === 0}
                  showAddButton={false}
                >
                  {editMilestoneCards.map((card) => {
                    const { milestoneStatuses, retentionStatus } = clientMilestoneStatusesForCard(
                      previewMilestones,
                      card.serviceId,
                      projectInvoices,
                    )
                    return (
                      <ClientPOMilestoneCardEditor
                        key={card.id}
                        card={card}
                        categoryOptions={categoryOptions}
                        serviceOptions={cardServiceOptions}
                        milestoneBaseValue={milestoneBaseValue}
                        includeRetention
                        structureLocked
                        milestoneStatuses={milestoneStatuses}
                        retentionStatus={retentionStatus}
                        onChange={(patch) => {
                          setMilestoneCardOverrides((prev) => {
                            const base = prev ?? recalculatedMilestoneCards
                            return base.map((c) => (c.id === card.id ? { ...c, ...patch } : c))
                          })
                        }}
                        onRemove={() => undefined}
                      />
                    )
                  })}
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
