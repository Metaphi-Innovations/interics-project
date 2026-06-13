import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton as MuiIconButton,
  MenuItem,
  Select,
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
import { Add, Delete as DeleteIcon, Download, Upload } from '@mui/icons-material'
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
  flattenClientOfferServices,
  serviceNameForOption,
  type ClientPOServiceOption,
} from './clientPOServiceOptions'

const PO_SECTION_TITLE_SX = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
}

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

/** Grid columns: Service | Name | % | Value | Action */
const MILESTONE_GRID_COLUMNS_WITH_SERVICE =
  'minmax(120px, 1fr) minmax(0, 1fr) 72px 96px 36px'

/** Grid columns: Name | % | Value | Action (Add Client PO) */
const MILESTONE_GRID_COLUMNS_NO_SERVICE = 'minmax(0, 1fr) 72px 96px 36px'

const MILESTONE_HEADER_LABELS_WITH_SERVICE = [
  'Service',
  'Name',
  'Percentage (%)',
  'Value (₹)',
  'Action',
] as const

const MILESTONE_HEADER_LABELS_NO_SERVICE = [
  'Name',
  'Percentage (%)',
  'Value (₹)',
  'Action',
] as const

function milestoneGridColumns(hideServiceColumn: boolean): string {
  return hideServiceColumn
    ? MILESTONE_GRID_COLUMNS_NO_SERVICE
    : MILESTONE_GRID_COLUMNS_WITH_SERVICE
}

function calcMilestoneAmount(poValue: number, percentage: number): number {
  if (!poValue || !percentage) return 0
  return Math.round((percentage / 100) * poValue)
}

function emptyMilestoneRow(): ClientPOMilestone {
  return {
    id: `cpm-${Date.now()}`,
    serviceId: '',
    serviceName: '',
    name: '',
    percentage: 0,
    value: 0,
  }
}

function milestonePayloadFromEditor(milestones: ClientPOMilestone[]): ClientPOMilestone[] {
  return milestones
    .filter((m) => m.name.trim())
    .map((m) => ({
      id: m.id,
      serviceId: m.serviceId,
      serviceName: m.serviceName,
      name: m.name,
      percentage: m.percentage,
      value: m.value,
    }))
}

function validateNamedMilestones(
  milestones: ClientPOMilestone[],
  showError: (message: string) => void,
): boolean {
  const named = milestones.filter((m) => m.name.trim())
  if (named.some((m) => !m.serviceId)) {
    showError('Select a service for each milestone')
    return false
  }
  return true
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

function MilestoneEditorHeader({ hideServiceColumn = false }: { hideServiceColumn?: boolean }) {
  const labels = hideServiceColumn
    ? MILESTONE_HEADER_LABELS_NO_SERVICE
    : MILESTONE_HEADER_LABELS_WITH_SERVICE
  const pctIdx = hideServiceColumn ? 1 : 2
  const valueIdx = hideServiceColumn ? 2 : 3
  const actionIdx = hideServiceColumn ? 3 : 4

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: milestoneGridColumns(hideServiceColumn),
        gap: 1,
        alignItems: 'center',
        px: 1.5,
        py: 1,
        bgcolor: tokens.color.neutral[50],
        borderBottom: `1px solid ${tokens.color.neutral[100]}`,
      }}
    >
      {labels.map((label, i) => (
        <Typography
          key={label}
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color.neutral[500],
            letterSpacing: 0.5,
            textAlign: i === pctIdx || i === valueIdx ? 'right' : 'left',
            ...(i === actionIdx ? { textAlign: 'center' } : {}),
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  )
}

interface MilestoneEditorRowsProps {
  milestones: ClientPOMilestone[]
  serviceOptions: ClientPOServiceOption[]
  onUpdate: (idx: number, patch: Partial<ClientPOMilestone>) => void
  onRemove: (idx: number) => void
  hideServiceColumn?: boolean
}

function MilestoneEditorRows({
  milestones,
  serviceOptions,
  onUpdate,
  onRemove,
  hideServiceColumn = false,
}: MilestoneEditorRowsProps) {
  if (milestones.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: 12, py: 2, px: 1.5, textAlign: 'center' }}
      >
        No milestones yet. Click Add Milestone to create one.
      </Typography>
    )
  }

  return (
    <>
      {milestones.map((m, idx) => (
        <Box
          key={m.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: milestoneGridColumns(hideServiceColumn),
            gap: 1,
            alignItems: 'center',
            px: 1.5,
            py: 1,
            borderBottom:
              idx < milestones.length - 1
                ? `1px solid ${tokens.color.neutral[100]}`
                : 'none',
          }}
        >
          {!hideServiceColumn ? (
            <Select
              size="small"
              fullWidth
              displayEmpty
              value={m.serviceId}
              onChange={(e) => onUpdate(idx, { serviceId: e.target.value })}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" sx={{ fontSize: 12 }}>
                Select service
              </MenuItem>
              {serviceOptions.map((opt) => (
                <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: 12 }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          ) : null}
          <TextField
            size="small"
            fullWidth
            value={m.name}
            onChange={(e) => onUpdate(idx, { name: e.target.value })}
            placeholder="Milestone name"
            inputProps={{ style: { fontSize: 12 } }}
          />
          <TextField
            size="small"
            type="number"
            value={m.percentage}
            onChange={(e) => onUpdate(idx, { percentage: Number(e.target.value) })}
            inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
            placeholder="%"
          />
          <TextField
            size="small"
            type="number"
            value={m.value}
            onChange={(e) => onUpdate(idx, { value: Number(e.target.value) })}
            inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
            placeholder="₹"
          />
          <MuiIconButton
            size="small"
            aria-label="Remove milestone"
            onClick={() => onRemove(idx)}
            sx={{ color: 'error.main', p: '2px', justifySelf: 'center' }}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </MuiIconButton>
        </Box>
      ))}
    </>
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
            <TableCell sx={{ ...TABLE_HEADER_SX, width: '28%' }}>Service</TableCell>
            <TableCell sx={{ ...TABLE_HEADER_SX, width: '28%' }}>Name</TableCell>
            <TableCell align="right" sx={{ ...TABLE_HEADER_SX, width: '18%' }}>
              Percentage (%)
            </TableCell>
            <TableCell align="right" sx={{ ...TABLE_HEADER_SX, width: '26%' }}>
              Value (₹)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {milestones.map((m) => (
            <TableRow key={m.id} hover>
              <TableCell sx={TABLE_CELL_SX}>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {m.serviceName || '—'}
                </Typography>
              </TableCell>
              <TableCell sx={TABLE_CELL_SX}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                  {m.name || '—'}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={TABLE_CELL_SX}>
                {m.percentage}%
              </TableCell>
              <TableCell align="right" sx={{ ...TABLE_CELL_SX, fontWeight: 600 }}>
                ₹{formatCurrency(m.value)}
              </TableCell>
            </TableRow>
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
  const [poFormData, setPoFormData] = useState({
    poNumber: '',
    poValue: '',
    file: null as File | null,
  })
  const [milestones, setMilestones] = useState<ClientPOMilestone[]>([])

  useEffect(() => {
    if (!open) {
      setPoFormData({ poNumber: '', poValue: '', file: null })
      setMilestones([])
    }
  }, [open])

  const poValueNumber = Number(poFormData.poValue) || 0

  useEffect(() => {
    if (poValueNumber <= 0) return
    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        value: calcMilestoneAmount(poValueNumber, m.percentage),
      })),
    )
  }, [poValueNumber])

  const handlePoChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function addMilestoneRow(): void {
    const defaultService = serviceOptions[0]
    setMilestones((prev) => [
      ...prev,
      {
        ...emptyMilestoneRow(),
        serviceId: defaultService?.id ?? '',
        serviceName: defaultService?.label ?? '',
      },
    ])
  }

  function updateMilestone(idx: number, patch: Partial<ClientPOMilestone>): void {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...patch }
      if (patch.serviceId !== undefined) {
        updated[idx].serviceName = serviceNameForOption(serviceOptions, patch.serviceId)
      }
      if (patch.percentage !== undefined) {
        updated[idx].value = calcMilestoneAmount(poValueNumber, Number(patch.percentage))
      } else if (patch.value !== undefined) {
        updated[idx].percentage =
          poValueNumber > 0 ? Math.round((Number(patch.value) / poValueNumber) * 100) : 0
      }
      return updated
    })
  }

  function removeMilestone(idx: number): void {
    setMilestones((prev) => prev.filter((_, i) => i !== idx))
  }

  const hasNamedMilestoneWithoutService = milestones.some(
    (m) => m.name.trim() && !m.serviceId,
  )
  const submitDisabled =
    saving || serviceOptions.length === 0 || hasNamedMilestoneWithoutService

  async function handleSubmit() {
    if (!poFormData.poNumber || !poFormData.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (
      !validateNamedMilestones(milestones, (message) =>
        toast({ title: message, variant: 'error' }),
      )
    ) {
      return
    }

    const milestonePayload = milestonePayloadFromEditor(milestones)

    try {
      await dispatch(
        uploadClientPO({
          projectId,
          data: {
            poNumber: poFormData.poNumber,
            startDate: '',
            endDate: '',
            poValue: poValueNumber,
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
      <Box sx={{ mb: 3 }}>
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
              onChange={handlePoChange('poValue')}
              placeholder="0"
            />
          </FormField>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Stack gap={1.5}>
        <MuiButton
          size="small"
          variant="outlined"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={addMilestoneRow}
          disabled={serviceOptions.length === 0}
          sx={{ fontSize: 11, alignSelf: 'flex-start' }}
        >
          Add Milestone
        </MuiButton>

        <Box
          sx={{
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 1.5,
            overflow: 'hidden',
          }}
        >
          <MilestoneEditorHeader hideServiceColumn />
          <MilestoneEditorRows
            milestones={milestones}
            serviceOptions={serviceOptions}
            onUpdate={updateMilestone}
            onRemove={removeMilestone}
            hideServiceColumn
          />
        </Box>
      </Stack>
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
  const toast = useToast((s) => s.showToast)
  const serviceOptions = useClientPOServiceOptions(projectId, open)
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [poFormData, setPoFormData] = useState({ poNumber: '', poValue: '' })
  const [milestones, setMilestones] = useState<ClientPOMilestone[]>([])
  const [newFile, setNewFile] = useState<File | null>(null)

  const poValueNumber = Number(poFormData.poValue) || 0

  useEffect(() => {
    if (!open || !po) {
      setEditing(false)
      setDeleteOpen(false)
      setNewFile(null)
      return
    }
    setPoFormData({ poNumber: po.poNumber, poValue: String(po.poValue) })
    setMilestones(
      (po.milestones ?? []).map((m) => ({
        id: m.id,
        serviceId: m.serviceId ?? '',
        serviceName: m.serviceName ?? '',
        name: m.name,
        percentage: m.percentage,
        value: m.value,
      })),
    )
    setEditing(false)
    setNewFile(null)
  }, [open, po])

  useEffect(() => {
    if (!editing || poValueNumber <= 0) return
    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        value: calcMilestoneAmount(poValueNumber, m.percentage),
      })),
    )
  }, [editing, poValueNumber])

  function addMilestoneRow(): void {
    setMilestones((prev) => [...prev, emptyMilestoneRow()])
  }

  function updateMilestone(idx: number, patch: Partial<ClientPOMilestone>): void {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], ...patch }
      if (patch.serviceId !== undefined) {
        updated[idx].serviceName = serviceNameForOption(serviceOptions, patch.serviceId)
      }
      if (patch.percentage !== undefined) {
        updated[idx].value = calcMilestoneAmount(poValueNumber, Number(patch.percentage))
      } else if (patch.value !== undefined) {
        updated[idx].percentage =
          poValueNumber > 0 ? Math.round((Number(patch.value) / poValueNumber) * 100) : 0
      }
      return updated
    })
  }

  function removeMilestone(idx: number): void {
    setMilestones((prev) => prev.filter((_, i) => i !== idx))
  }

  const handlePoChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const hasNamedMilestoneWithoutService = milestones.some(
    (m) => m.name.trim() && !m.serviceId,
  )

  async function handleSave() {
    if (!po || !poFormData.poNumber || !poFormData.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }
    if (
      !validateNamedMilestones(milestones, (message) =>
        toast({ title: message, variant: 'error' }),
      )
    ) {
      return
    }

    const milestonePayload = milestonePayloadFromEditor(milestones)

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
                  onClick={() => {
                    if (po) {
                      setPoFormData({ poNumber: po.poNumber, poValue: String(po.poValue) })
                      setMilestones(
                        (po.milestones ?? []).map((m) => ({
                          id: m.id,
                          serviceId: m.serviceId ?? '',
                          serviceName: m.serviceName ?? '',
                          name: m.name,
                          percentage: m.percentage,
                          value: m.value,
                        })),
                      )
                    }
                    setNewFile(null)
                    setEditing(false)
                  }}
                />
                <Button
                  size="sm"
                  variant="contained"
                  color="primary"
                  label={saving ? 'Saving…' : 'Save'}
                  onClick={() => void handleSave()}
                  disabled={
                    saving ||
                    serviceOptions.length === 0 ||
                    hasNamedMilestoneWithoutService
                  }
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
                        onChange={handlePoChange('poValue')}
                      />
                    </FormField>
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
                  </Box>
                  {po.fileName ? (
                    <Box sx={{ mt: 1 }}>
                      <ReadOnlyField label="Document" value={po.fileName} />
                    </Box>
                  ) : null}
                </>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography
                component="span"
                variant="overline"
                sx={{ ...PO_SECTION_TITLE_SX, display: 'block', mb: 1.5 }}
              >
                Milestones
              </Typography>
              {editing ? (
                <Stack gap={1.5}>
                  {serviceOptions.length === 0 ? (
                    <Alert severity="warning" sx={{ fontSize: 12 }}>
                      Add client offer services on the Pitch tab before adding PO milestones.
                    </Alert>
                  ) : null}
                  <MuiButton
                    size="small"
                    variant="outlined"
                    startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={addMilestoneRow}
                    disabled={serviceOptions.length === 0}
                    sx={{ fontSize: 11, alignSelf: 'flex-start' }}
                  >
                    Add Milestone
                  </MuiButton>
                  <Box
                    sx={{
                      border: `1px solid ${tokens.color.neutral[100]}`,
                      borderRadius: 1.5,
                      overflow: 'hidden',
                    }}
                  >
                    <MilestoneEditorHeader />
                    <MilestoneEditorRows
                      milestones={milestones}
                      serviceOptions={serviceOptions}
                      onUpdate={updateMilestone}
                      onRemove={removeMilestone}
                    />
                  </Box>
                </Stack>
              ) : (
                <ClientPOMilestonesTable milestones={po.milestones ?? []} />
              )}
            </Box>
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
