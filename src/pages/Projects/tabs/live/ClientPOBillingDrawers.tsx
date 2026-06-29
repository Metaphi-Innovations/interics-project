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
import { Add, Download, Upload } from '@mui/icons-material'
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
  ClientPORetentionCardEditor,
  clientPOCardsFromMilestones,
  createClientPOMilestoneCard,
  createClientPORetentionCard,
  groupClientCardsByService,
  isClientGroupedServiceValid,
  isMilestoneCardConfigured,
  isRetentionCardConfigured,
  type ClientPOMilestoneCard,
  type ClientPORetentionCard,
} from './ClientPOMilestoneCards'

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
} as const

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

function mapMilestonesFromPo(milestones: ClientPOMilestone[]): ClientPOMilestone[] {
  return milestones.map((m) => ({
    id: m.id,
    serviceId: m.serviceId ?? '',
    serviceName: m.serviceName ?? '',
    name: m.name,
    percentage: m.percentage,
    value: m.value,
    ...(m.kind ? { kind: m.kind } : {}),
    ...(m.retention ? { retention: { ...m.retention } } : {}),
  }))
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

function ClientPOMilestonesTable({ milestones }: { milestones: ClientPOMilestone[] }) {
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
        <TableHead>
          <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
            <TableCell sx={{ ...TABLE_HEADER_SX, width: '24%' }}>Service</TableCell>
            <TableCell sx={{ ...TABLE_HEADER_SX, width: '28%' }}>Name</TableCell>
            <TableCell align="right" sx={{ ...TABLE_HEADER_SX, width: '18%' }}>
              Percentage (%)
            </TableCell>
            <TableCell align="right" sx={{ ...TABLE_HEADER_SX, width: '30%' }}>
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
  const [retentionCards, setRetentionCards] = useState<ClientPORetentionCard[]>([])

  useEffect(() => {
    if (!open) {
      setPoFormData({ poNumber: '', poValue: '', executedValue: '', file: null })
      setMilestoneCards([])
      setRetentionCards([])
    }
  }, [open])

  const poValueNumber = Number(poFormData.poValue) || 0
  const executedValueNumber = poFormData.executedValue
    ? Number(poFormData.executedValue)
    : poValueNumber
  const milestoneBaseValue = executedValueNumber

  const hasConfiguredEntries = useMemo(
    () =>
      milestoneCards.some(isMilestoneCardConfigured) ||
      retentionCards.some(isRetentionCardConfigured),
    [milestoneCards, retentionCards],
  )

  const groupedForSave = useMemo(
    () =>
      groupClientCardsByService(
        milestoneCards.filter(isMilestoneCardConfigured),
        retentionCards.filter(isRetentionCardConfigured),
      ),
    [milestoneCards, retentionCards],
  )

  const groupedSaveValid = useMemo(
    () => groupedForSave.every((group) => isClientGroupedServiceValid(milestoneBaseValue, group)),
    [groupedForSave, milestoneBaseValue],
  )

  useEffect(() => {
    if (milestoneBaseValue <= 0) return
    setRetentionCards((prev) => {
      let changed = false
      const next = prev.map((row) => {
        const amount = Math.round((row.percentage / 100) * milestoneBaseValue)
        if (row.value === amount) return row
        changed = true
        return { ...row, value: amount }
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
      toast({ title: 'Add at least one milestone or retention entry', variant: 'error' })
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
            onChange={(patch) =>
              setMilestoneCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
              )
            }
            onRemove={() => setMilestoneCards((prev) => prev.filter((c) => c.id !== card.id))}
          />
        ))}
      </MilestoneSectionPanel>

      <MilestoneSectionPanel
        title="Retention"
        addLabel="Add Retention"
        onAdd={() =>
          setRetentionCards([
            createClientPORetentionCard(categoryOptions, cardServiceOptions),
          ])
        }
        addDisabled={cardsDisabled}
        isEmpty={retentionCards.length === 0}
        showAddButton={retentionCards.length === 0}
      >
        {retentionCards.map((card) => (
          <ClientPORetentionCardEditor
            key={card.id}
            card={card}
            categoryOptions={categoryOptions}
            serviceOptions={cardServiceOptions}
            milestoneBaseValue={milestoneBaseValue}
            onChange={(patch) =>
              setRetentionCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
              )
            }
            onRemove={() => setRetentionCards((prev) => prev.filter((c) => c.id !== card.id))}
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

function formatExecutedValueLabel(poValue: number, executedValue?: number | null): string {
  if (executedValue != null) return `₹${formatCurrency(executedValue)}`
  return `₹${formatCurrency(poValue)}`
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
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [poFormData, setPoFormData] = useState({
    poNumber: '',
    poValue: '',
    executedValue: '',
  })
  const [milestoneCards, setMilestoneCards] = useState<ClientPOMilestoneCard[]>([])
  const [retentionCards, setRetentionCards] = useState<ClientPORetentionCard[]>([])
  const [newFile, setNewFile] = useState<File | null>(null)

  const poValueNumber = Number(poFormData.poValue) || 0
  const lockedExecutedValue =
    po != null
      ? po.executedValue ?? (Number(poFormData.poValue) || po.poValue)
      : poValueNumber
  const milestoneBaseValue = lockedExecutedValue

  const hasConfiguredEntries = useMemo(
    () =>
      milestoneCards.some(isMilestoneCardConfigured) ||
      retentionCards.some(isRetentionCardConfigured),
    [milestoneCards, retentionCards],
  )

  const groupedForSave = useMemo(
    () =>
      groupClientCardsByService(
        milestoneCards.filter(isMilestoneCardConfigured),
        retentionCards.filter(isRetentionCardConfigured),
      ),
    [milestoneCards, retentionCards],
  )

  const groupedSaveValid = useMemo(
    () => groupedForSave.every((group) => isClientGroupedServiceValid(milestoneBaseValue, group)),
    [groupedForSave, milestoneBaseValue],
  )

  useEffect(() => {
    if (!open || !po) {
      setEditing(false)
      setDeleteOpen(false)
      setNewFile(null)
      return
    }
    setPoFormData({
      poNumber: po.poNumber,
      poValue: String(po.poValue),
      executedValue: po.executedValue != null ? String(po.executedValue) : '',
    })
    const cards = clientPOCardsFromMilestones(mapMilestonesFromPo(po.milestones ?? []), serviceOptions)
    setMilestoneCards(cards.milestoneCards)
    setRetentionCards(cards.retentionCards)
    setEditing(false)
    setNewFile(null)
  }, [open, po, serviceOptions])

  useEffect(() => {
    if (!editing || milestoneBaseValue <= 0) return
    setRetentionCards((prev) => {
      let changed = false
      const next = prev.map((row) => {
        const amount = Math.round((row.percentage / 100) * milestoneBaseValue)
        if (row.value === amount) return row
        changed = true
        return { ...row, value: amount }
      })
      return changed ? next : prev
    })
  }, [editing, milestoneBaseValue])

  const handlePoChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handlePoValueChange(value: string) {
    setPoFormData((prev) => ({ ...prev, poValue: value }))
  }

  function resetEditState() {
    if (!po) return
    setPoFormData({
      poNumber: po.poNumber,
      poValue: String(po.poValue),
      executedValue: po.executedValue != null ? String(po.executedValue) : '',
    })
    const cards = clientPOCardsFromMilestones(mapMilestonesFromPo(po.milestones ?? []), serviceOptions)
    setMilestoneCards(cards.milestoneCards)
    setRetentionCards(cards.retentionCards)
    setNewFile(null)
    setEditing(false)
  }

  async function handleSave() {
    if (!po || !poFormData.poNumber || !poFormData.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (!hasConfiguredEntries || groupedForSave.length === 0) {
      toast({ title: 'Add at least one milestone or retention entry', variant: 'error' })
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

    const documentUrl = newFile
      ? URL.createObjectURL(newFile)
      : po.documentUrl

    try {
      await dispatch(
        updateClientPO({
          projectId,
          poId: po.id,
          data: {
            poNumber: poFormData.poNumber,
            poValue: poValueNumber,
            executedValue: po.executedValue,
            milestones: milestonePayload,
            documentUrl,
            fileName: newFile?.name ?? po.fileName,
          },
        }),
      ).unwrap()
      void dispatch(fetchClientPO(projectId))
      toast({ title: 'PO updated successfully', variant: 'success' })
      setEditing(false)
      setNewFile(null)
    } catch {
      toast({ title: 'Failed to update PO', variant: 'error' })
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

  const documentUrl = newFile ? URL.createObjectURL(newFile) : po?.documentUrl ?? null
  const documentLabel = newFile?.name ?? po?.fileName

  return (
    <>
      <DrawerForm
        open={open}
        onClose={onClose}
        title={po?.poNumber ?? 'Client PO'}
        subtitle={editing ? 'Edit purchase order' : 'Purchase order details'}
        footer={
          <Stack
            direction="row"
            justifyContent="flex-end"
            flexWrap="wrap"
            gap={1}
            sx={{ px: 2.5, py: 1.75 }}
          >
            {editing ? (
              <>
                <Button
                  variant="text"
                  size="sm"
                  label="Cancel"
                  onClick={resetEditState}
                />
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label={saving ? 'Saving…' : 'Save'}
                  onClick={() => void handleSave()}
                  disabled={saving || serviceOptions.length === 0}
                />
              </>
            ) : (
              <>
                <Button variant="text" size="sm" label="Close" onClick={onClose} />
                {po?.documentUrl ? (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="primary"
                    label="Open document"
                    onClick={() => window.open(po.documentUrl!, '_blank')}
                  />
                ) : null}
                <Button
                  size="sm"
                  variant="outlined"
                  color="primary"
                  label="Edit"
                  onClick={() => setEditing(true)}
                />
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
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Typography component="span" variant="overline" sx={PO_SECTION_TITLE_SX}>
                  PO Details
                </Typography>
                {(documentUrl || po.documentUrl) && !editing ? (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="primary"
                    label="Download Document"
                    startIcon={<Download sx={{ fontSize: 16 }} />}
                    onClick={() => window.open(documentUrl ?? po.documentUrl!, '_blank')}
                  />
                ) : null}
                {editing ? (
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
                      onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                    />
                  </MuiButton>
                ) : null}
              </Stack>
              {editing ? (
                <>
                  {documentLabel ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1, textAlign: 'right', fontSize: 11 }}
                    >
                      {documentLabel}
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
                      />
                    </FormField>
                    <FormField label="PO Value (₹)" required>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={poFormData.poValue}
                        onChange={(e) => handlePoValueChange(e.target.value)}
                      />
                    </FormField>
                    <ReadOnlyField
                      label="Executed Value (₹)"
                      value={formatExecutedValueLabel(poValueNumber, po.executedValue)}
                    />
                  </Box>
                </>
              ) : (
                <>
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
                      value={
                        po.executedValue != null
                          ? `₹${formatCurrency(po.executedValue)}`
                          : '—'
                      }
                    />
                  </Box>
                  {po.fileName ? (
                    <Box sx={{ mt: 1 }}>
                      <ReadOnlyField label="Document" value={po.fileName} />
                    </Box>
                  ) : null}
                </>
              )}
            </Box>

            <Divider sx={{ my: 0.5 }} />

            {editing ? (
              <>
                {serviceOptions.length === 0 ? (
                  <Alert severity="warning" sx={{ fontSize: 12 }}>
                    Add client offer services on the Pitch tab before adding PO milestones.
                  </Alert>
                ) : null}
                <MilestoneSectionPanel
                  title="Milestones"
                  addLabel="Add Milestone"
                  onAdd={() =>
                    setMilestoneCards((prev) => [
                      ...prev,
                      createClientPOMilestoneCard(categoryOptions, cardServiceOptions),
                    ])
                  }
                  addDisabled={categoryOptions.length === 0}
                  isEmpty={milestoneCards.length === 0}
                >
                  {milestoneCards.map((card) => (
                    <ClientPOMilestoneCardEditor
                      key={card.id}
                      card={card}
                      categoryOptions={categoryOptions}
                      serviceOptions={cardServiceOptions}
                      milestoneBaseValue={milestoneBaseValue}
                      onChange={(patch) =>
                        setMilestoneCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
                        )
                      }
                      onRemove={() =>
                        setMilestoneCards((prev) => prev.filter((c) => c.id !== card.id))
                      }
                    />
                  ))}
                </MilestoneSectionPanel>

                <MilestoneSectionPanel
                  title="Retention"
                  addLabel="Add Retention"
                  onAdd={() =>
                    setRetentionCards([
                      createClientPORetentionCard(categoryOptions, cardServiceOptions),
                    ])
                  }
                  addDisabled={categoryOptions.length === 0}
                  isEmpty={retentionCards.length === 0}
                  showAddButton={retentionCards.length === 0}
                >
                  {retentionCards.map((card) => (
                    <ClientPORetentionCardEditor
                      key={card.id}
                      card={card}
                      categoryOptions={categoryOptions}
                      serviceOptions={cardServiceOptions}
                      milestoneBaseValue={milestoneBaseValue}
                      onChange={(patch) =>
                        setRetentionCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, ...patch } : c)),
                        )
                      }
                      onRemove={() =>
                        setRetentionCards((prev) => prev.filter((c) => c.id !== card.id))
                      }
                    />
                  ))}
                </MilestoneSectionPanel>
              </>
            ) : (
              <Box>
                <Typography
                  component="span"
                  variant="overline"
                  sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
                >
                  Milestones
                </Typography>
                <ClientPOMilestonesTable milestones={po.milestones ?? []} />
              </Box>
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
