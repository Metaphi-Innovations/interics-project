import { useEffect, useState } from 'react'
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton as MuiIconButton,
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
import type { ClientPO, ClientPOMilestone } from '../../../../slices/baseline/reducer'
import type { ClientMilestone } from '@/slices/pitch/reducer'
import { formatCurrency } from '../../../../utils/formatters'

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

/** Grid columns: Name | % | Value | Action — aligned with milestone input rows */
const MILESTONE_GRID_COLUMNS = 'minmax(0, 1fr) 88px 112px 36px'

const MILESTONE_HEADER_LABELS = ['Name', 'Percentage (%)', 'Value (₹)', 'Action'] as const

function calcMilestoneAmount(poValue: number, percentage: number): number {
  if (!poValue || !percentage) return 0
  return Math.round((percentage / 100) * poValue)
}

function MilestoneEditorHeader() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: MILESTONE_GRID_COLUMNS,
        gap: 1,
        alignItems: 'center',
        px: 1.5,
        py: 1,
        bgcolor: tokens.color.neutral[50],
        borderBottom: `1px solid ${tokens.color.neutral[100]}`,
      }}
    >
      {MILESTONE_HEADER_LABELS.map((label, i) => (
        <Typography
          key={label}
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color.neutral[500],
            letterSpacing: 0.5,
            textAlign: i === 1 || i === 2 ? 'right' : 'left',
            ...(i === 3 ? { textAlign: 'center' } : {}),
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  )
}

interface MilestoneEditorRowsProps {
  milestones: ClientMilestone[]
  onUpdate: (idx: number, field: keyof ClientMilestone, val: string | number) => void
  onRemove: (idx: number) => void
}

function MilestoneEditorRows({ milestones, onUpdate, onRemove }: MilestoneEditorRowsProps) {
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
            gridTemplateColumns: MILESTONE_GRID_COLUMNS,
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
          <TextField
            size="small"
            fullWidth
            value={m.name}
            onChange={(e) => onUpdate(idx, 'name', e.target.value)}
            placeholder="Milestone name"
            inputProps={{ style: { fontSize: 12 } }}
          />
          <TextField
            size="small"
            type="number"
            value={m.percentage}
            onChange={(e) => onUpdate(idx, 'percentage', Number(e.target.value))}
            inputProps={{ style: { fontSize: 12, textAlign: 'right' } }}
            placeholder="%"
          />
          <TextField
            size="small"
            type="number"
            value={m.value}
            onChange={(e) => onUpdate(idx, 'value', Number(e.target.value))}
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
            <TableCell sx={{ ...TABLE_HEADER_SX, width: '44%' }}>Name</TableCell>
            <TableCell align="right" sx={{ ...TABLE_HEADER_SX, width: '22%' }}>
              Percentage (%)
            </TableCell>
            <TableCell align="right" sx={{ ...TABLE_HEADER_SX, width: '34%' }}>
              Value (₹)
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {milestones.map((m) => (
            <TableRow key={m.id} hover>
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
  const [poFormData, setPoFormData] = useState({
    poNumber: '',
    poValue: '',
    file: null as File | null,
  })
  const [milestones, setMilestones] = useState<ClientMilestone[]>([])

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
    setMilestones((prev) => [
      ...prev,
      { id: `cpm-${Date.now()}`, name: '', percentage: 0, value: 0 },
    ])
  }

  function updateMilestone(idx: number, field: keyof ClientMilestone, val: string | number): void {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'percentage') {
        updated[idx].value = calcMilestoneAmount(poValueNumber, Number(val))
      } else if (field === 'value') {
        updated[idx].percentage =
          poValueNumber > 0 ? Math.round((Number(val) / poValueNumber) * 100) : 0
      }
      return updated
    })
  }

  function removeMilestone(idx: number): void {
    setMilestones((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!poFormData.poNumber || !poFormData.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }

    const milestonePayload = milestones
      .filter((m) => m.name.trim())
      .map((m) => ({
        id: m.id,
        serviceId: '',
        serviceName: '',
        name: m.name,
        percentage: m.percentage,
        value: m.value,
      }))

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
    >
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
            onUpdate={updateMilestone}
            onRemove={removeMilestone}
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
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [poFormData, setPoFormData] = useState({ poNumber: '', poValue: '' })
  const [milestones, setMilestones] = useState<ClientMilestone[]>([])
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
    setMilestones((prev) => [
      ...prev,
      { id: `cpm-${Date.now()}`, name: '', percentage: 0, value: 0 },
    ])
  }

  function updateMilestone(idx: number, field: keyof ClientMilestone, val: string | number): void {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'percentage') {
        updated[idx].value = calcMilestoneAmount(poValueNumber, Number(val))
      } else if (field === 'value') {
        updated[idx].percentage =
          poValueNumber > 0 ? Math.round((Number(val) / poValueNumber) * 100) : 0
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

  async function handleSave() {
    if (!po || !poFormData.poNumber || !poFormData.poValue) {
      toast({ title: 'Please fill in all required fields', variant: 'error' })
      return
    }

    const milestonePayload = milestones
      .filter((m) => m.name.trim())
      .map((m) => ({
        id: m.id,
        serviceId: '',
        serviceName: '',
        name: m.name,
        percentage: m.percentage,
        value: m.value,
      }))

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
                  disabled={saving}
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
                  <MuiButton
                    size="small"
                    variant="outlined"
                    startIcon={<Add sx={{ fontSize: 14 }} />}
                    onClick={addMilestoneRow}
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
