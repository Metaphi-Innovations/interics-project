import { useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button as MuiButton,
  Select as MuiSelect,
  MenuItem,
  Chip as MuiChip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../../components/templates/DrawerForm'
import { StatusBadge, Input } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createChangeRequest, approveChangeRequest, rejectChangeRequest } from '../../../../slices/live/thunk'
import type { ChangeRequest } from '../../../../slices/live/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import { useToast } from '@/design-system/components'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function crStatusType(status: ChangeRequest['status']): { type: StatusType; label: string } {
  switch (status) {
    case 'Draft':            return { type: 'draft',        label: 'Draft' }
    case 'Pending Approval': return { type: 'pending',      label: 'Pending Approval' }
    case 'Approved':         return { type: 'active',       label: 'Approved' }
    case 'Rejected':         return { type: 'cancelled',    label: 'Rejected' }
    case 'Implemented':      return { type: 'completed',    label: 'Implemented' }
  }
}

function crTypeChip(type: ChangeRequest['type']): { color: 'success' | 'warning' | 'info' | 'default'; label: string } {
  switch (type) {
    case 'Scope Addition':     return { color: 'success', label: type }
    case 'Scope Reduction':    return { color: 'warning', label: type }
    case 'Timeline Extension': return { color: 'info',    label: type }
    case 'Cost Revision':      return { color: 'default', label: type }
  }
}

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

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ changeRequests }: { changeRequests: ChangeRequest[] }) {
  const total = changeRequests.length
  const approved = changeRequests.filter((c) => c.status === 'Approved' || c.status === 'Implemented').length
  const pending = changeRequests.filter((c) => c.status === 'Pending Approval').length
  const financialImpact = changeRequests
    .filter((c) => c.status === 'Approved' || c.status === 'Implemented')
    .reduce((s, c) => s + c.financialImpact, 0)

  const metrics = [
    { label: 'TOTAL CHANGES', value: String(total) },
    { label: 'APPROVED', value: String(approved), highlight: true },
    { label: 'PENDING', value: String(pending), color: pending > 0 ? 'warning.main' : 'success.main' },
    { label: 'FINANCIAL IMPACT', value: `₹${formatCurrency(Math.abs(financialImpact))}` },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
      {metrics.map((m) => (
        <Box
          key={m.label}
          sx={{
            p: '14px 16px',
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: m.highlight ? tokens.color.primary[50] : 'background.paper',
          }}
        >
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}>
            {m.label}
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: 15, mt: '2px', color: m.color ?? (m.highlight ? 'primary.main' : 'text.primary') }}
          >
            {m.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Approve/Reject Dialog ────────────────────────────────────────────────────

interface ApproveDialogProps {
  open: boolean
  cr: ChangeRequest | null
  mode: 'approve' | 'reject'
  projectId: string
  onClose: () => void
}

function ApproveRejectDialog({ open, cr, mode, projectId, onClose }: ApproveDialogProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [notes, setNotes] = useState('')

  async function handleConfirm() {
    if (!cr) return
    try {
      if (mode === 'approve') {
        await dispatch(approveChangeRequest({ projectId, id: cr.id, notes })).unwrap()
        toast.success('Change request approved')
      } else {
        await dispatch(rejectChangeRequest({ projectId, id: cr.id })).unwrap()
        toast.success('Change request rejected')
      }
      onClose()
      setNotes('')
    } catch {
      toast.error(`Failed to ${mode} change request`)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>
        {mode === 'approve' ? 'Approve Change Request' : 'Reject Change Request'}
      </DialogTitle>
      <DialogContent>
        {cr && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>
            {mode === 'approve'
              ? `Approve "${cr.title}"? Financial impact: ${cr.financialImpact !== 0 ? `₹${formatCurrency(Math.abs(cr.financialImpact))}` : 'No impact'}`
              : `Reject "${cr.title}"?`}
          </Typography>
        )}
        {mode === 'approve' && (
          <TextField
            label="Approval Notes"
            multiline
            rows={2}
            fullWidth
            size="small"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" onClick={onClose}>Cancel</MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          color={mode === 'approve' ? 'success' : 'error'}
          onClick={handleConfirm}
        >
          {mode === 'approve' ? 'Approve' : 'Reject'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── Create Change Request Drawer ─────────────────────────────────────────────

interface CreateCRDrawerProps {
  open: boolean
  projectId: string
  onClose: () => void
}

const CR_TYPES: ChangeRequest['type'][] = [
  'Scope Addition', 'Scope Reduction', 'Timeline Extension', 'Cost Revision',
]

function CreateChangeRequestDrawer({ open, projectId, onClose }: CreateCRDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<ChangeRequest['type']>('Scope Addition')
  const [description, setDescription] = useState('')
  const [financialImpact, setFinancialImpact] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit() {
    if (!title || !description || !requestedDate) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(createChangeRequest({
        projectId,
        data: {
          crNumber: '', // set by server
          title,
          type,
          description,
          financialImpact: Number(financialImpact) || 0,
          requestedDate,
          requestedBy: 'Admin User',
          status: 'Draft',
          approvedBy: null,
          approvedDate: null,
          notes: notes || null,
        },
      })).unwrap()
      toast.success('Change request created')
      onClose()
      setTitle(''); setDescription(''); setFinancialImpact(''); setRequestedDate(''); setNotes('')
    } catch {
      toast.error('Failed to create change request')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="New Change Request"
      subtitle="Document scope or financial changes"
      onSubmit={handleSubmit}
      submitLabel="Create"
      submitLoading={saving}
    >
      <FormSection title="Change Details" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              size="sm"
            />
          </FormField>
        </Box>
        <FormField label="Type" required>
          <MuiSelect
            value={type}
            onChange={(e) => setType(e.target.value as ChangeRequest['type'])}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {CR_TYPES.map((t) => (
              <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t}</MenuItem>
            ))}
          </MuiSelect>
        </FormField>
        <FormField label="Requested Date" required>
          <Input
            type="date"
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
            size="sm"
          />
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Description" required>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="sm"
              multiline
              rows={3}
            />
          </FormField>
        </Box>
        <FormField label="Financial Impact" hint="Use negative for reductions">
          <Input
            type="number"
            value={financialImpact}
            onChange={(e) => setFinancialImpact(e.target.value)}
            size="sm"
            placeholder="0"
          />
        </FormField>
      </FormSection>

      <FormSection title="Supporting Info" columns={1}>
        <FormField label="Notes">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="sm"
            multiline
            rows={2}
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── ChangesTab ───────────────────────────────────────────────────────────────

interface ChangesTabProps {
  projectId: string
}

export default function ChangesTab({ projectId }: ChangesTabProps) {
  const { changeRequests } = useAppSelector((s) => s.live)
  const [createOpen, setCreateOpen] = useState(false)
  const [approveDialog, setApproveDialog] = useState<{ cr: ChangeRequest; mode: 'approve' | 'reject' } | null>(null)

  return (
    <>
      <SummaryStrip changeRequests={changeRequests} />

      <WorkspaceSection
        title="Change Requests"
        noPadding
        action={
          <MuiButton
            size="small"
            variant="contained"
            startIcon={<Add sx={{ fontSize: 14 }} />}
            onClick={() => setCreateOpen(true)}
            sx={{ fontSize: 12, height: 30 }}
          >
            New Change Request
          </MuiButton>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>CR # / Title</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Type</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Financial Impact</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Requested By</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changeRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ ...TABLE_CELL_SX, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>No change requests yet</Typography>
                </TableCell>
              </TableRow>
            )}
            {changeRequests.map((cr) => {
              const st = crStatusType(cr.status)
              const tc = crTypeChip(cr.type)
              return (
                <TableRow key={cr.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontFamily: 'monospace', color: 'primary.main', fontWeight: 500 }}>
                      {cr.crNumber}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{cr.title}</Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{formatDate(cr.requestedDate)}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <MuiChip
                      label={tc.label}
                      size="small"
                      color={tc.color}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11, borderRadius: '4px', '& .MuiChip-label': { px: '6px' } }}
                    />
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    {cr.financialImpact > 0 && (
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'success.main' }}>
                        +₹{formatCurrency(cr.financialImpact)}
                      </Typography>
                    )}
                    {cr.financialImpact < 0 && (
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'error.main' }}>
                        -₹{formatCurrency(Math.abs(cr.financialImpact))}
                      </Typography>
                    )}
                    {cr.financialImpact === 0 && (
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>No impact</Typography>
                    )}
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{cr.requestedBy}</Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{formatDate(cr.requestedDate)}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    {cr.status === 'Pending Approval' && (
                      <Stack direction="row" gap={0.5}>
                        <MuiButton
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => setApproveDialog({ cr, mode: 'approve' })}
                          sx={{ fontSize: 11, height: 26, px: 1 }}
                        >
                          Approve
                        </MuiButton>
                        <MuiButton
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setApproveDialog({ cr, mode: 'reject' })}
                          sx={{ fontSize: 11, height: 26, px: 1 }}
                        >
                          Reject
                        </MuiButton>
                      </Stack>
                    )}
                    {cr.status === 'Draft' && (
                      <Stack direction="row" gap={0.5}>
                        <MuiButton size="small" variant="outlined" sx={{ fontSize: 11, height: 26, px: 1 }}>
                          Submit
                        </MuiButton>
                        <MuiButton size="small" variant="text" sx={{ fontSize: 11, height: 26, px: 1 }}>
                          Edit
                        </MuiButton>
                      </Stack>
                    )}
                    {(cr.status === 'Approved' || cr.status === 'Implemented' || cr.status === 'Rejected') && (
                      <MuiButton size="small" variant="text" sx={{ fontSize: 11, height: 26, px: 1 }}>View</MuiButton>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <CreateChangeRequestDrawer
        open={createOpen}
        projectId={projectId}
        onClose={() => setCreateOpen(false)}
      />

      <ApproveRejectDialog
        open={!!approveDialog}
        cr={approveDialog?.cr ?? null}
        mode={approveDialog?.mode ?? 'approve'}
        projectId={projectId}
        onClose={() => setApproveDialog(null)}
      />
    </>
  )
}
