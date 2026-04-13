import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Collapse,
  Divider,
  LinearProgress,
  Select as MuiSelect,
  MenuItem,
  Skeleton,
  IconButton as MuiIconButton,
  Radio,
  Card as MuiCard,
  Button as MuiButton,
  Chip as MuiChip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Assignment,
  Lock,
  LockOutlined,
  Upload,
  Add,
  CheckCircle,
  RadioButtonUnchecked,
  Cancel,
  SwapHoriz,
  ExpandMore,
  ExpandLess,
  Download,
  ContentCopy,
  Edit as EditIcon,
  EditOutlined,
  Delete as DeleteIcon,
  AttachFile,
  EventNote,
  Group,
  InsertDriveFile,
  InfoOutlined,
  RocketLaunch,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  fetchClientPO,
  uploadClientPO,
  updateClientPO,
  deleteClientPO,
  fetchBaseline,
  createBaseline,
  updateBaseline,
  fetchVendorPOs,
  createVendorPO,
} from '../../../slices/baseline/thunk'
import { resetBaseline } from '../../../slices/baseline/reducer'
import { fetchVersions } from '../../../slices/pitch/thunk'
import type { Project } from '../../../slices/projects/reducer'
import type { ClientPO, Baseline, VendorPO, BaselineCategory } from '../../../slices/baseline/reducer'
import type { PitchVersion, PitchService, ClientMilestone } from '../../../slices/pitch/reducer'
import { WorkspaceSection } from '../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../components/templates/DrawerForm'
import { useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency, formatDate, getInitials, getAvatarColor } from '../../../utils/formatters'

// ─── Step Indicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: number
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = ['Upload Client PO', 'Align & Map', 'Create Baseline']
  return (
    <Stack direction="row" alignItems="center" gap={0} sx={{ mb: 4 }}>
      {steps.map((label, idx) => {
        const stepNum = idx + 1
        const isActive = stepNum === currentStep
        const isComplete = stepNum < currentStep
        return (
          <Stack key={label} direction="row" alignItems="center" sx={{ flex: 1 }}>
            <Stack alignItems="center" gap={0.5} sx={{ flex: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: isComplete
                    ? 'success.main'
                    : isActive
                    ? 'primary.main'
                    : tokens.color.neutral[200],
                  color: isActive || isComplete ? 'white' : tokens.color.neutral[500],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {isComplete ? <CheckCircle sx={{ fontSize: 16 }} /> : stepNum}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Typography>
            </Stack>
            {idx < steps.length - 1 && (
              <Box
                sx={{
                  height: 1,
                  width: 40,
                  bgcolor: tokens.color.neutral[200],
                  flexShrink: 0,
                  mb: 2,
                }}
              />
            )}
          </Stack>
        )
      })}
    </Stack>
  )
}

// ─── Upload PO Drawer ─────────────────────────────────────────────────────────

interface UploadPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  saving: boolean
  existingPOCount: number
}

function UploadPODrawer({ open, onClose, projectId, saving, existingPOCount }: UploadPODrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [poFormData, setPoFormData] = useState({
    poNumber: '',
    poDate: '',
    poValue: '',
    status: 'Active',
    isPrimary: false,
    file: null as File | null,
  })

  useEffect(() => {
    if (!open) {
      setPoFormData({ poNumber: '', poDate: '', poValue: '', status: 'Active', isPrimary: false, file: null })
    }
  }, [open])

  const handlePoChange = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPoFormData(prev => ({ ...prev, [field]: e.target.value }))
    }

  async function handleSubmit() {
    if (!poFormData.poNumber || !poFormData.poDate || !poFormData.poValue) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(
        uploadClientPO({
          projectId,
          data: {
            poNumber: poFormData.poNumber,
            poDate: poFormData.poDate,
            poValue: Number(poFormData.poValue),
            documentUrl: null,
            status: poFormData.status as 'Active' | 'Pending',
            isPrimary: existingPOCount === 0 ? true : poFormData.isPrimary,
          },
        })
      ).unwrap()
      toast.success('PO saved successfully')
      onClose()
    } catch {
      toast.error('Failed to save PO')
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
      <FormSection title="PO Details" columns={2}>
        <FormField label="PO Number" required>
          <TextField
            fullWidth
            size="small"
            value={poFormData.poNumber}
            onChange={handlePoChange('poNumber')}
            placeholder="PO-CLI-2024-001"
          />
        </FormField>
        <FormField label="PO Date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={poFormData.poDate}
            onChange={handlePoChange('poDate')}
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
        <FormField label="Status">
          <MuiSelect
            value={poFormData.status}
            onChange={(e) => setPoFormData(prev => ({ ...prev, status: e.target.value }))}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="Active" sx={{ fontSize: 12 }}>Active</MenuItem>
            <MenuItem value="Pending" sx={{ fontSize: 12 }}>Pending</MenuItem>
          </MuiSelect>
        </FormField>
      </FormSection>

      <FormSection title="Document" columns={1}>
        <Box>
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
                setPoFormData(prev => ({ ...prev, file: e.target.files?.[0] ?? null }))
              }
            />
          </MuiButton>
          {poFormData.file && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: 11 }}>
              {poFormData.file.name}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: 11 }}>
            Optional — PDF or Word, max 10MB
          </Typography>
        </Box>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Edit PO Drawer ───────────────────────────────────────────────────────────

interface EditPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  po: ClientPO | null
  saving: boolean
}

function EditPODrawer({ open, onClose, projectId, po, saving }: EditPODrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [form, setForm] = useState({
    poNumber: '',
    poDate: '',
    poValue: '',
    status: 'Active',
    isPrimary: false,
  })

  useEffect(() => {
    if (po && open) {
      setForm({
        poNumber: po.poNumber,
        poDate: po.poDate,
        poValue: String(po.poValue),
        status: po.status,
        isPrimary: po.isPrimary,
      })
    }
  }, [po, open])

  async function handleSubmit() {
    if (!po || !form.poNumber || !form.poDate || !form.poValue) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(
        updateClientPO({
          projectId,
          poId: po.id,
          data: {
            poNumber: form.poNumber,
            poDate: form.poDate,
            poValue: Number(form.poValue),
            status: form.status as 'Active' | 'Pending',
            isPrimary: form.isPrimary,
          },
        })
      ).unwrap()
      toast.success('PO updated successfully')
      onClose()
    } catch {
      toast.error('Failed to update PO')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit PO"
      subtitle="Update purchase order details"
      onSubmit={handleSubmit}
      submitLoading={saving}
      submitLabel="Save Changes"
    >
      <FormSection title="PO Details" columns={2}>
        <FormField label="PO Number" required>
          <TextField
            fullWidth
            size="small"
            value={form.poNumber}
            onChange={(e) => setForm(p => ({ ...p, poNumber: e.target.value }))}
            placeholder="PO-CLI-2024-001"
          />
        </FormField>
        <FormField label="PO Date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.poDate}
            onChange={(e) => setForm(p => ({ ...p, poDate: e.target.value }))}
          />
        </FormField>
        <FormField label="PO Value (₹)" required>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={form.poValue}
            onChange={(e) => setForm(p => ({ ...p, poValue: e.target.value }))}
            placeholder="0"
          />
        </FormField>
        <FormField label="Status">
          <MuiSelect
            value={form.status}
            onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="Active" sx={{ fontSize: 12 }}>Active</MenuItem>
            <MenuItem value="Pending" sx={{ fontSize: 12 }}>Pending</MenuItem>
          </MuiSelect>
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Delete PO Dialog ─────────────────────────────────────────────────────────

interface DeletePODialogProps {
  open: boolean
  onClose: () => void
  po: ClientPO | null
  projectId: string
  saving: boolean
}

function DeletePODialog({ open, onClose, po, projectId, saving }: DeletePODialogProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()

  async function handleConfirm() {
    if (!po) return
    try {
      await dispatch(deleteClientPO({ projectId, poId: po.id })).unwrap()
      toast.success('PO deleted')
      onClose()
    } catch {
      toast.error('Failed to delete PO')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 600 }}>Delete Purchase Order</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ fontSize: 13 }}>
          Delete <strong>{po?.poNumber}</strong>? This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton size="small" variant="outlined" onClick={onClose} disabled={saving}>
          Cancel
        </MuiButton>
        <MuiButton
          size="small"
          variant="contained"
          color="error"
          onClick={() => void handleConfirm()}
          disabled={saving}
        >
          Delete
        </MuiButton>
      </DialogActions>
    </Dialog>
  )
}

// ─── PO List Section ──────────────────────────────────────────────────────────

interface POListSectionProps {
  clientPOs: ClientPO[]
  onAddPO: () => void
  onEditPO: (po: ClientPO) => void
  onDeletePO: (po: ClientPO) => void
}

function POListSection({ clientPOs, onAddPO, onEditPO, onDeletePO }: POListSectionProps) {
  const totalPOValue = clientPOs.reduce((sum, po) => sum + po.poValue, 0)

  return (
    <WorkspaceSection
      title="Client Purchase Orders"
      action={
        <MuiButton
          size="small"
          variant="contained"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={onAddPO}
          sx={{ fontSize: 11, height: 28 }}
        >
          + Add PO
        </MuiButton>
      }
    >
      {/* Summary row */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          p: 1.5,
          bgcolor: '#F8FAFB',
          borderRadius: '8px',
          border: '1px solid #E8EEEC',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10, letterSpacing: 0.5 }}>
            TOTAL PO VALUE
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: 13 }}>
            ₹{formatCurrency(totalPOValue)}
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10, letterSpacing: 0.5 }}>
            NO. OF POs
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
            {clientPOs.length}
          </Typography>
        </Box>
      </Box>

      {/* PO cards */}
      {clientPOs.map((po) => (
        <Box
          key={po.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: '10px 14px',
            border: '1px solid #E8EEEC',
            borderRadius: '8px',
            mb: 1,
            bgcolor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {po.isPrimary && (
            <MuiChip
              label="Primary"
              size="small"
              sx={{
                fontSize: 10,
                height: 18,
                bgcolor: '#E8F5F2',
                color: '#107E68',
                mr: 1.5,
                flexShrink: 0,
                '& .MuiChip-label': { px: '6px' },
              }}
            />
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}
              >
                {po.poNumber}
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: '1px',
                  borderRadius: '4px',
                  bgcolor: po.status === 'Active'
                    ? alpha(tokens.color.success[500], 0.1)
                    : alpha(tokens.color.warning[500], 0.1),
                  color: po.status === 'Active'
                    ? tokens.color.success[700]
                    : tokens.color.warning[700],
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {po.status}
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {formatDate(po.poDate)}
              {po.documentUrl && (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    color: 'primary.main',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.3,
                  }}
                  onClick={() => window.open(po.documentUrl!, '_blank')}
                >
                  <AttachFile sx={{ fontSize: 11 }} />
                  document.pdf
                </Box>
              )}
            </Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{ fontWeight: 700, mr: 2, color: 'primary.main', fontSize: 13, flexShrink: 0 }}
          >
            ₹{formatCurrency(po.poValue)}
          </Typography>

          <Box display="flex" gap={0.5}>
            <MuiIconButton
              size="small"
              onClick={() => onEditPO(po)}
              sx={{ color: 'text.secondary' }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </MuiIconButton>
            <MuiIconButton
              size="small"
              onClick={() => onDeletePO(po)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        </Box>
      ))}
    </WorkspaceSection>
  )
}

// ─── Issue Vendor PO Drawer ───────────────────────────────────────────────────

interface VendorOption {
  vendorId: string
  vendorName: string
  allocatedValue: number
}

interface IssueVendorPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  saving: boolean
  vendors: VendorOption[]
}

function IssueVendorPODrawer({
  open,
  onClose,
  projectId,
  saving,
  vendors,
}: IssueVendorPODrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [form, setForm] = useState({
    vendorId: '',
    poNumber: '',
    poDate: '',
    poValue: '',
    status: 'Issued' as 'Draft' | 'Issued',
  })

  useEffect(() => {
    if (!open) {
      setForm({ vendorId: '', poNumber: '', poDate: '', poValue: '', status: 'Issued' })
    }
  }, [open])

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const selectedVendor = vendors.find((v) => v.vendorId === form.vendorId)

  async function handleSubmit() {
    if (!form.vendorId || !form.poNumber || !form.poDate || !form.poValue) {
      toast.error('Please fill in all required fields')
      return
    }
    const vendor = vendors.find((v) => v.vendorId === form.vendorId)
    try {
      await dispatch(
        createVendorPO({
          projectId,
          data: {
            vendorId: form.vendorId,
            vendorName: vendor?.vendorName ?? '',
            poNumber: form.poNumber,
            poDate: form.poDate,
            poValue: Number(form.poValue),
            status: form.status,
          },
        })
      ).unwrap()
      toast.success('Vendor PO issued')
      onClose()
    } catch {
      toast.error('Failed to issue vendor PO')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Issue Vendor PO"
      subtitle="Create a purchase order for vendor"
      onSubmit={handleSubmit}
      submitLoading={saving}
      submitLabel="Issue PO"
    >
      <FormSection title="Vendor PO Details" columns={2}>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Vendor" required>
            <MuiSelect
              value={form.vendorId}
              onChange={(e) => set('vendorId', e.target.value)}
              size="small"
              fullWidth
              displayEmpty
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="" disabled sx={{ fontSize: 12 }}>Select vendor…</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.vendorId} value={v.vendorId} sx={{ fontSize: 12 }}>
                  {v.vendorName}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormField>
        </Box>
        <FormField label="PO Number" required>
          <TextField
            fullWidth
            size="small"
            value={form.poNumber}
            onChange={(e) => set('poNumber', e.target.value)}
            placeholder="PO-VEN-2024-001"
          />
        </FormField>
        <FormField label="PO Date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.poDate}
            onChange={(e) => set('poDate', e.target.value)}
          />
        </FormField>
        <FormField
          label="PO Value (₹)"
          required
          hint={
            selectedVendor
              ? `Allocated: ₹${formatCurrency(selectedVendor.allocatedValue)}`
              : undefined
          }
        >
          <TextField
            fullWidth
            size="small"
            type="number"
            value={form.poValue}
            onChange={(e) => set('poValue', e.target.value)}
            placeholder="0"
          />
        </FormField>
        <FormField label="Status">
          <MuiSelect
            value={form.status}
            onChange={(e) => set('status', e.target.value as 'Draft' | 'Issued')}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="Issued" sx={{ fontSize: 12 }}>Issued</MenuItem>
            <MenuItem value="Draft" sx={{ fontSize: 12 }}>Draft</MenuItem>
          </MuiSelect>
        </FormField>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Version Selection ────────────────────────────────────────────────────────

interface VersionSelectionProps {
  versions: PitchVersion[]
  selectedVersionId: string | null
  onSelect: (id: string) => void
}

function VersionSelection({ versions, selectedVersionId, onSelect }: VersionSelectionProps) {
  return (
    <WorkspaceSection
      title="Select Pitch Version"
      subtitle="Choose the pitch version to use as the basis for this baseline"
    >
      <Stack gap={1.5}>
        {versions.map((v) => {
          const isSelected = v.id === selectedVersionId
          return (
            <MuiCard
              key={v.id}
              onClick={() => onSelect(v.id)}
              sx={{
                p: '12px',
                cursor: 'pointer',
                border: `2px solid ${isSelected ? tokens.color.primary[500] : tokens.color.neutral[100]}`,
                bgcolor: isSelected ? alpha(tokens.color.primary[500], 0.04) : 'background.paper',
                boxShadow: 'none',
                borderRadius: 2,
                transition: 'all 0.15s',
                '&:hover': { borderColor: tokens.color.primary[300] },
              }}
            >
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Radio
                  checked={isSelected}
                  onChange={() => onSelect(v.id)}
                  size="small"
                  sx={{ p: 0 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                      {v.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {formatDate(v.createdAt)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" gap={3} sx={{ mt: 0.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Revenue</Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        ₹{formatCurrency(v.totalRevenue)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>Profitability</Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: 12, fontWeight: 600, color: v.profitability >= 0 ? 'success.main' : 'error.main' }}
                      >
                        ₹{formatCurrency(v.profitability)}
                      </Typography>
                    </Box>
                    {v.isActive && (
                      <Box
                        sx={{
                          alignSelf: 'center',
                          px: 1,
                          py: '1px',
                          borderRadius: '4px',
                          bgcolor: alpha(tokens.color.primary[500], 0.1),
                          color: 'primary.main',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        Active
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </MuiCard>
          )
        })}
        {versions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, textAlign: 'center', py: 2 }}>
            No pitch versions found. Create a version in the Pitch tab first.
          </Typography>
        )}
      </Stack>
    </WorkspaceSection>
  )
}

// ─── Client Milestone Drawer (for alignment) ──────────────────────────────────

interface AlignmentMilestoneDrawerProps {
  open: boolean
  onClose: () => void
  service: PitchService | null
  onSave: (milestones: ClientMilestone[]) => void
}

function AlignmentMilestoneDrawer({ open, onClose, service, onSave }: AlignmentMilestoneDrawerProps) {
  const [milestones, setMilestones] = useState<ClientMilestone[]>([])

  useEffect(() => {
    if (service && open) {
      setMilestones(service.clientMilestones.map((m) => ({ ...m })))
    }
  }, [service, open])

  if (!service) return null

  const total = milestones.reduce((sum, m) => sum + m.value, 0)
  const balanced = total === service.value

  function update(idx: number, field: keyof ClientMilestone, val: string | number | null) {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'percentage') {
        updated[idx].value = Math.round((Number(val) / 100) * service!.value)
      } else if (field === 'value') {
        updated[idx].percentage = service!.value > 0
          ? Math.round((Number(val) / service!.value) * 100) : 0
      }
      return updated
    })
  }

  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { id: `cm-${Date.now()}`, name: '', percentage: 0, value: 0, dueDate: null },
    ])
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit Milestones"
      subtitle={`${service.name} — ₹${formatCurrency(service.value)}`}
      onSubmit={() => { onSave(milestones); onClose() }}
      submitLabel="Save Milestones"
    >
      <Box sx={{ mb: 2 }}>
        <Alert severity={balanced ? 'success' : 'warning'} sx={{ fontSize: 11 }}>
          Total: ₹{formatCurrency(total)} / ₹{formatCurrency(service.value)}
          {!balanced && ` — ₹${formatCurrency(Math.abs(service.value - total))} remaining`}
        </Alert>
      </Box>
      <Stack gap={1.5}>
        {milestones.map((m, idx) => (
          <Box
            key={m.id}
            sx={{
              p: 1.5,
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 1.5,
              display: 'grid',
              gridTemplateColumns: '1fr 80px 100px 120px 28px',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              value={m.name}
              onChange={(e) => update(idx, 'name', e.target.value)}
              placeholder="Milestone name"
              inputProps={{ style: { fontSize: 12 } }}
            />
            <TextField
              size="small"
              type="number"
              value={m.percentage}
              onChange={(e) => update(idx, 'percentage', Number(e.target.value))}
              inputProps={{ style: { fontSize: 12 } }}
              placeholder="%"
            />
            <TextField
              size="small"
              type="number"
              value={m.value}
              onChange={(e) => update(idx, 'value', Number(e.target.value))}
              inputProps={{ style: { fontSize: 12 } }}
              placeholder="Value"
            />
            <TextField
              size="small"
              type="date"
              value={m.dueDate ?? ''}
              onChange={(e) => update(idx, 'dueDate', e.target.value || null)}
              inputProps={{ style: { fontSize: 12 } }}
            />
            <MuiIconButton
              size="small"
              onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== idx))}
              sx={{ color: 'error.main', p: '2px' }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        ))}
        <MuiButton
          size="small"
          variant="outlined"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={addMilestone}
          sx={{ fontSize: 11, alignSelf: 'flex-start' }}
        >
          Add Milestone
        </MuiButton>
      </Stack>
    </DrawerForm>
  )
}

// ─── Vendor Alignment Drawer ──────────────────────────────────────────────────

interface VendorAlignmentDrawerProps {
  open: boolean
  onClose: () => void
  service: PitchService | null
}

function VendorAlignmentDrawer({ open, onClose, service }: VendorAlignmentDrawerProps) {
  if (!service) return null
  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Vendor Alignment"
      subtitle={service.name}
      onSubmit={onClose}
      submitLabel="Save"
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
        {service.vendorMappings.length === 0
          ? 'No vendors mapped to this service.'
          : service.vendorMappings.map((vm) => (
              <Box key={vm.id} sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                  {vm.vendorName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ₹{formatCurrency(vm.value)} ({vm.percentage}%)
                </Typography>
              </Box>
            ))}
      </Typography>
    </DrawerForm>
  )
}

// ─── Alignment Table ──────────────────────────────────────────────────────────

interface FlatService {
  id: string
  name: string
  categoryName: string
  originalValue: number
  adjustedValue: number
  pitchService: PitchService
}

interface AlignmentTableProps {
  version: PitchVersion
  totalPOValue: number
  adjustedValues: Record<string, number>
  onAdjustedChange: (serviceId: string, value: number) => void
  localMilestones: Record<string, ClientMilestone[]>
  onMilestonesChange: (serviceId: string, milestones: ClientMilestone[]) => void
}

function AlignmentTable({
  version,
  totalPOValue,
  adjustedValues,
  onAdjustedChange,
  localMilestones,
  onMilestonesChange,
}: AlignmentTableProps) {
  const [milestoneDrawerService, setMilestoneDrawerService] = useState<PitchService | null>(null)
  const [vendorDrawerService, setVendorDrawerService] = useState<PitchService | null>(null)

  const flatServices: FlatService[] = version.categories.flatMap((cat) =>
    cat.services.map((svc) => ({
      id: svc.id,
      name: svc.name,
      categoryName: cat.categoryName,
      originalValue: svc.value,
      adjustedValue: adjustedValues[svc.id] ?? svc.value,
      pitchService: svc,
    }))
  )

  const totalAdjusted = flatServices.reduce(
    (sum, s) => sum + (adjustedValues[s.id] ?? s.originalValue),
    0
  )
  const difference = totalAdjusted - totalPOValue
  const isMatch = Math.abs(difference) < 1

  return (
    <>
      <WorkspaceSection
        title="PO Alignment"
        subtitle="Adjust service values to match total PO value"
      >
        {/* Comparison banner */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            mb: 2,
            borderRadius: '8px',
            bgcolor: isMatch ? '#E8F5F2' : '#FEF3C7',
            border: `1px solid ${isMatch ? '#A3D7CB' : '#FDE68A'}`,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
              Total PO Value
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
              ₹{formatCurrency(totalPOValue)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
              Total Adjusted
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: 13,
                color: totalAdjusted === totalPOValue ? 'success.main' : 'warning.main',
              }}
            >
              ₹{formatCurrency(totalAdjusted)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>
              Difference
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontSize: 13, color: difference === 0 ? 'success.main' : 'error.main' }}
            >
              {difference === 0
                ? '✓ Balanced'
                : `₹${formatCurrency(Math.abs(difference))} ${difference > 0 ? 'over' : 'under'}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                {['SERVICE', 'ORIGINAL (₹)', 'ADJUSTED (₹)', 'DIFFERENCE', 'MILESTONES', 'VENDORS'].map((col) => (
                  <TableCell
                    key={col}
                    sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, py: 1 }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {version.categories.map((cat) => {
                const catTotal = cat.services.reduce(
                  (sum, s) => sum + (adjustedValues[s.id] ?? s.value),
                  0
                )
                return [
                  ...cat.services.map((svc) => {
                    const adjusted = adjustedValues[svc.id] ?? svc.value
                    const diff = adjusted - svc.value
                    const mils = localMilestones[svc.id] ?? svc.clientMilestones
                    return (
                      <TableRow key={svc.id} sx={{ '&:hover': { bgcolor: tokens.color.neutral[50] } }}>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                            {svc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {cat.categoryName}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                            ₹{formatCurrency(svc.value)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <TextField
                            type="number"
                            value={adjusted}
                            onChange={(e) => onAdjustedChange(svc.id, Number(e.target.value))}
                            size="small"
                            inputProps={{ style: { fontSize: 12, padding: '4px 8px' } }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              color: diff === 0 ? 'text.secondary' : diff > 0 ? 'success.main' : 'error.main',
                              fontWeight: diff !== 0 ? 600 : 400,
                            }}
                          >
                            {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}₹${formatCurrency(Math.abs(diff))}`}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <MuiButton
                            size="small"
                            variant="outlined"
                            startIcon={<EventNote sx={{ fontSize: 12 }} />}
                            onClick={() => setMilestoneDrawerService(svc)}
                            sx={{ fontSize: 10, height: 26, whiteSpace: 'nowrap' }}
                          >
                            {mils.length} milestone{mils.length !== 1 ? 's' : ''}
                          </MuiButton>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <MuiButton
                            size="small"
                            variant="outlined"
                            startIcon={<Group sx={{ fontSize: 12 }} />}
                            onClick={() => setVendorDrawerService(svc)}
                            sx={{ fontSize: 10, height: 26, whiteSpace: 'nowrap' }}
                          >
                            {svc.vendorMappings.length} vendor{svc.vendorMappings.length !== 1 ? 's' : ''}
                          </MuiButton>
                        </TableCell>
                      </TableRow>
                    )
                  }),
                  <TableRow key={`${cat.id}-total`} sx={{ bgcolor: '#F8FAFB' }}>
                    <TableCell colSpan={2} sx={{ py: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>
                        {cat.categoryName} Total
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>
                        ₹{formatCurrency(catTotal)}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>,
                ]
              })}
            </TableBody>
          </Table>
        </Box>
      </WorkspaceSection>

      <AlignmentMilestoneDrawer
        open={!!milestoneDrawerService}
        onClose={() => setMilestoneDrawerService(null)}
        service={milestoneDrawerService}
        onSave={(milestones) => {
          if (milestoneDrawerService) {
            onMilestonesChange(milestoneDrawerService.id, milestones)
          }
        }}
      />

      <VendorAlignmentDrawer
        open={!!vendorDrawerService}
        onClose={() => setVendorDrawerService(null)}
        service={vendorDrawerService}
      />
    </>
  )
}

// ─── Upload Vendor Quote Drawer ───────────────────────────────────────────────

interface VendorFinalizationEntry {
  vendorId: string
  vendorName: string
  totalValue: number
  quoteUrl: string | null
  quoteReference: string | null
  quoteValue: number | null
}

interface UploadVendorQuoteDrawerProps {
  open: boolean
  onClose: () => void
  vendor: VendorFinalizationEntry | null
  onSave: (vendorId: string, data: { quoteUrl: string; quoteReference: string; quoteValue: number }) => void
}

function UploadVendorQuoteDrawer({ open, onClose, vendor, onSave }: UploadVendorQuoteDrawerProps) {
  const toast = useToast()
  const [form, setForm] = useState({
    quoteReference: '',
    quoteDate: '',
    quoteValue: '',
    validUntil: '',
  })
  const [quoteFile, setQuoteFile] = useState<File | null>(null)

  useEffect(() => {
    if (!open) {
      setForm({ quoteReference: '', quoteDate: '', quoteValue: '', validUntil: '' })
      setQuoteFile(null)
    }
  }, [open])

  function handleSubmit() {
    if (!vendor || !form.quoteReference || !form.quoteValue) {
      toast.error('Please fill in required fields')
      return
    }
    onSave(vendor.vendorId, {
      quoteUrl: quoteFile ? URL.createObjectURL(quoteFile) : '#',
      quoteReference: form.quoteReference,
      quoteValue: Number(form.quoteValue),
    })
    toast.success('Vendor quote uploaded')
    onClose()
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Upload Vendor Quote"
      subtitle={vendor?.vendorName}
      onSubmit={handleSubmit}
      submitLabel="Upload Quote"
    >
      <FormSection title="Quote Details" columns={2}>
        <FormField label="Quote Reference" required>
          <TextField
            fullWidth
            size="small"
            value={form.quoteReference}
            onChange={(e) => setForm((p) => ({ ...p, quoteReference: e.target.value }))}
            placeholder="VQ-2024-001"
          />
        </FormField>
        <FormField label="Quote Date">
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.quoteDate}
            onChange={(e) => setForm((p) => ({ ...p, quoteDate: e.target.value }))}
          />
        </FormField>
        <FormField label="Quote Value (₹)" required>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={form.quoteValue}
            onChange={(e) => setForm((p) => ({ ...p, quoteValue: e.target.value }))}
            placeholder="0"
          />
        </FormField>
        <FormField label="Valid Until">
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.validUntil}
            onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
          />
        </FormField>
      </FormSection>

      <FormSection title="Document" columns={1}>
        <Box>
          <Box
            component="label"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 3,
              border: '2px dashed #E8EEEC',
              borderRadius: '8px',
              cursor: 'pointer',
              bgcolor: '#F8FAFB',
              '&:hover': { borderColor: '#107E68', bgcolor: '#E8F5F2' },
            }}
          >
            <Upload sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Click to browse or drag & drop
            </Typography>
            <Typography variant="caption" color="text.disabled">
              PDF, Word or Excel — max 20MB
            </Typography>
            <input
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xlsx"
              onChange={(e) => setQuoteFile(e.target.files?.[0] ?? null)}
            />
          </Box>
          {quoteFile && (
            <MuiChip
              icon={<InsertDriveFile />}
              label={quoteFile.name}
              onDelete={() => setQuoteFile(null)}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
      </FormSection>
    </DrawerForm>
  )
}

// ─── Vendor Milestone Drawer ──────────────────────────────────────────────────

interface VendorMilestoneDrawerProps {
  open: boolean
  onClose: () => void
  vendor: VendorFinalizationEntry | null
}

function VendorMilestoneDrawer({ open, onClose, vendor }: VendorMilestoneDrawerProps) {
  const [milestones, setMilestones] = useState<Array<{ id: string; name: string; percentage: number; value: number; dueDate: string }>>([])

  useEffect(() => {
    if (open) setMilestones([])
  }, [open])

  const totalValue = vendor?.totalValue ?? 0
  const total = milestones.reduce((sum, m) => sum + m.value, 0)

  function update(idx: number, field: string, val: string | number) {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'percentage') {
        updated[idx].value = Math.round((Number(val) / 100) * totalValue)
      } else if (field === 'value') {
        updated[idx].percentage = totalValue > 0 ? Math.round((Number(val) / totalValue) * 100) : 0
      }
      return updated
    })
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Vendor Milestones"
      subtitle={vendor ? `${vendor.vendorName} — ₹${formatCurrency(vendor.totalValue)}` : undefined}
      onSubmit={onClose}
      submitLabel="Save Milestones"
    >
      <Alert
        severity={Math.abs(total - totalValue) < 1 ? 'success' : 'warning'}
        sx={{ mb: 2, fontSize: 11 }}
      >
        Total: ₹{formatCurrency(total)} / ₹{formatCurrency(totalValue)}
      </Alert>
      <Stack gap={1.5}>
        {milestones.map((m, idx) => (
          <Box
            key={m.id}
            sx={{
              p: 1.5,
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 1.5,
              display: 'grid',
              gridTemplateColumns: '1fr 80px 100px 120px 28px',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField size="small" value={m.name} onChange={(e) => update(idx, 'name', e.target.value)} placeholder="Milestone" inputProps={{ style: { fontSize: 12 } }} />
            <TextField size="small" type="number" value={m.percentage} onChange={(e) => update(idx, 'percentage', Number(e.target.value))} inputProps={{ style: { fontSize: 12 } }} />
            <TextField size="small" type="number" value={m.value} onChange={(e) => update(idx, 'value', Number(e.target.value))} inputProps={{ style: { fontSize: 12 } }} />
            <TextField size="small" type="date" value={m.dueDate} onChange={(e) => update(idx, 'dueDate', e.target.value)} inputProps={{ style: { fontSize: 12 } }} />
            <MuiIconButton size="small" onClick={() => setMilestones((p) => p.filter((_, i) => i !== idx))} sx={{ color: 'error.main', p: '2px' }}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        ))}
        <MuiButton
          size="small"
          variant="outlined"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={() => setMilestones((p) => [...p, { id: `vm-${Date.now()}`, name: '', percentage: 0, value: 0, dueDate: '' }])}
          sx={{ fontSize: 11, alignSelf: 'flex-start' }}
        >
          Add Milestone
        </MuiButton>
      </Stack>
    </DrawerForm>
  )
}

// ─── Vendor Finalization ──────────────────────────────────────────────────────

interface VendorFinalizationProps {
  version: PitchVersion
  vendorQuotes: Record<string, { quoteUrl: string; quoteReference: string; quoteValue: number }>
  onQuoteUploaded: (vendorId: string, data: { quoteUrl: string; quoteReference: string; quoteValue: number }) => void
  onRemoveQuote: (vendorId: string) => void
}

function VendorFinalization({ version, vendorQuotes, onQuoteUploaded, onRemoveQuote }: VendorFinalizationProps) {
  const [uploadQuoteVendor, setUploadQuoteVendor] = useState<VendorFinalizationEntry | null>(null)
  const [milestoneVendor, setMilestoneVendor] = useState<VendorFinalizationEntry | null>(null)

  const vendorMap = new Map<string, VendorFinalizationEntry>()
  for (const cat of version.categories) {
    for (const svc of cat.services) {
      for (const vm of svc.vendorMappings) {
        const existing = vendorMap.get(vm.vendorId)
        vendorMap.set(vm.vendorId, {
          vendorId: vm.vendorId,
          vendorName: vm.vendorName,
          totalValue: (existing?.totalValue ?? 0) + vm.value,
          quoteUrl: vendorQuotes[vm.vendorId]?.quoteUrl ?? null,
          quoteReference: vendorQuotes[vm.vendorId]?.quoteReference ?? null,
          quoteValue: vendorQuotes[vm.vendorId]?.quoteValue ?? null,
        })
      }
    }
  }
  const vendors = Array.from(vendorMap.values())

  return (
    <>
      <WorkspaceSection
        title="Vendor Finalization"
        subtitle="Upload vendor quotes and set vendor milestones"
      >
        {vendors.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            No vendor mappings in this version yet.
          </Typography>
        ) : (
          <Stack gap={1.5}>
            {vendors.map((vendor) => {
              const hasQuote = !!vendorQuotes[vendor.vendorId]
              const statusLabel = hasQuote ? 'Quote Uploaded' : 'Quote Pending'
              const statusColor = hasQuote
                ? { bg: alpha(tokens.color.success[500], 0.1), color: tokens.color.success[700] }
                : { bg: alpha(tokens.color.warning[500], 0.1), color: tokens.color.warning[700] }

              return (
                <Box
                  key={vendor.vendorId}
                  sx={{
                    border: `1px solid ${tokens.color.neutral[100]}`,
                    borderRadius: '10px',
                    p: 2,
                    mb: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: alpha(getAvatarColor(vendor.vendorName).bg, 0.15),
                          color: getAvatarColor(vendor.vendorName).bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(vendor.vendorName)}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                          {vendor.vendorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                          Allocated: ₹{formatCurrency(vendor.totalValue)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          px: 1,
                          py: '2px',
                          borderRadius: '4px',
                          bgcolor: statusColor.bg,
                          color: statusColor.color,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {statusLabel}
                      </Box>
                    </Stack>

                    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      {hasQuote ? (
                        <MuiChip
                          icon={<AttachFile sx={{ fontSize: 12 }} />}
                          label={vendorQuotes[vendor.vendorId].quoteReference}
                          size="small"
                          onClick={() => window.open(vendorQuotes[vendor.vendorId].quoteUrl, '_blank')}
                          onDelete={() => onRemoveQuote(vendor.vendorId)}
                          sx={{
                            fontSize: 11,
                            bgcolor: '#E8F5F2',
                            color: '#107E68',
                            border: '1px solid #A3D7CB',
                            cursor: 'pointer',
                          }}
                        />
                      ) : (
                        <MuiButton
                          size="small"
                          variant="outlined"
                          startIcon={<Upload sx={{ fontSize: 12 }} />}
                          onClick={() => setUploadQuoteVendor(vendor)}
                          sx={{ fontSize: 11, height: 28 }}
                        >
                          Upload Quote
                        </MuiButton>
                      )}
                      <MuiButton
                        size="small"
                        variant="outlined"
                        startIcon={<EventNote sx={{ fontSize: 12 }} />}
                        onClick={() => setMilestoneVendor(vendor)}
                        sx={{ fontSize: 11, height: 28 }}
                      >
                        Edit Milestones
                      </MuiButton>
                    </Stack>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}
      </WorkspaceSection>

      <UploadVendorQuoteDrawer
        open={!!uploadQuoteVendor}
        onClose={() => setUploadQuoteVendor(null)}
        vendor={uploadQuoteVendor}
        onSave={onQuoteUploaded}
      />

      <VendorMilestoneDrawer
        open={!!milestoneVendor}
        onClose={() => setMilestoneVendor(null)}
        vendor={milestoneVendor}
      />
    </>
  )
}

// ─── Pre-Baseline Right Panel ─────────────────────────────────────────────────

interface PreBaselineRightPanelProps {
  clientPOs: ClientPO[]
  selectedVersionId: string | null
  versions: PitchVersion[]
  adjustedValues: Record<string, number>
  saving: boolean
  onCreateBaseline: () => void
}

function PreBaselineRightPanel({
  clientPOs,
  selectedVersionId,
  versions,
  adjustedValues,
  saving,
  onCreateBaseline,
}: PreBaselineRightPanelProps) {
  const rightCardSx = {
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    p: 2.5,
    mb: 2,
  }
  const labelSx = {
    textTransform: 'uppercase' as const,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: 'text.secondary',
    display: 'block',
    mb: 1.5,
  }

  const totalPOValue = clientPOs.reduce((sum, po) => sum + po.poValue, 0)
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null

  const totalAdjusted = selectedVersion
    ? selectedVersion.categories.flatMap((c) => c.services).reduce((sum, s) => sum + (adjustedValues[s.id] ?? s.value), 0)
    : 0
  const valuesMatch = Math.abs(totalAdjusted - totalPOValue) < 1 && totalPOValue > 0
  const allAdjusted = selectedVersion
    ? selectedVersion.categories.flatMap((c) => c.services).every((s) => (adjustedValues[s.id] ?? s.value) > 0)
    : false

  const checklistItems = [
    { label: 'Client PO uploaded', done: clientPOs.length > 0, hint: 'Add a client PO' },
    { label: 'Version selected', done: !!selectedVersionId, hint: 'Select a pitch version' },
    { label: 'Service values adjusted', done: allAdjusted, hint: 'Adjust values in PO Alignment' },
    { label: 'Values balanced', done: valuesMatch, hint: 'Total must match PO value' },
  ]

  const allChecked = checklistItems.every((item) => item.done)

  const selectedVersionLabel = selectedVersion?.label ?? '—'

  return (
    <>
      {/* Checklist */}
      <Box sx={rightCardSx}>
        <Typography variant="caption" sx={labelSx}>Baseline Checklist</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: 11 }}>
          Complete all steps to go live
        </Typography>
        <Stack gap={1.5}>
          {checklistItems.map((item) => (
            <Stack key={item.label} direction="row" alignItems="center" gap={1}>
              {item.done ? (
                <CheckCircle sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
              ) : (
                <RadioButtonUnchecked sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
              )}
              <Box>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: item.done ? 600 : 400 }}>
                  {item.label}
                </Typography>
                {!item.done && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
                    {item.hint}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* PO Summary */}
      <Box sx={rightCardSx}>
        <Typography variant="caption" sx={labelSx}>PO Summary</Typography>
        <Stack gap={1.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Total PO Value</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
              ₹{formatCurrency(totalPOValue)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>No. of POs</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{clientPOs.length}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Selected Version</Typography>
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{selectedVersionLabel}</Typography>
          </Stack>
        </Stack>
      </Box>

      {/* CTA */}
      <Box sx={rightCardSx}>
        <MuiButton
          variant="contained"
          fullWidth
          startIcon={allChecked ? <RocketLaunch sx={{ fontSize: 16 }} /> : <LockOutlined sx={{ fontSize: 16 }} />}
          disabled={!allChecked || saving}
          onClick={onCreateBaseline}
          sx={{ fontSize: 13, height: 40 }}
        >
          {saving ? 'Creating…' : 'Create Baseline & Go Live'}
        </MuiButton>
        {allChecked ? (
          <Typography variant="caption" color="success.main" sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: 11 }}>
            ✓ Ready to create baseline
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: 11 }}>
            Complete all checklist items to proceed
          </Typography>
        )}
      </Box>

      {/* Help tip */}
      <Box
        sx={{
          bgcolor: 'info.50',
          border: '1px solid',
          borderColor: 'info.200',
          borderRadius: 2,
          p: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-start',
        }}
      >
        <InfoOutlined sx={{ fontSize: 16, color: 'info.main', flexShrink: 0, mt: '1px' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.5 }}>
          Align your service values to exactly match the client PO total. Once the baseline is created, the financial structure is locked.
        </Typography>
      </Box>
    </>
  )
}

// ─── Locked Service Table ─────────────────────────────────────────────────────

interface LockedServiceTableProps {
  categories: BaselineCategory[]
  isEditing: boolean
  editedValues: Record<string, number>
  onEditedValueChange: (serviceId: string, value: number) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  saving: boolean
}

function LockedServiceTable({ categories, isEditing, editedValues, onEditedValueChange, onStartEdit, onCancelEdit, onSaveEdit, saving }: LockedServiceTableProps) {
  return (
    <WorkspaceSection
      title="Locked Financial Structure"
      subtitle="Read-only — structure cannot be modified after baseline creation"
    >
      {isEditing && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
          You are editing a locked baseline. Changes will be audit logged.
        </Alert>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 500 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
              {['CATEGORY / SERVICE', 'ORIGINAL VALUE', 'ADJUSTED VALUE', 'DIFFERENCE'].map((col) => (
                <TableCell
                  key={col}
                  sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, py: 1 }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.flatMap((cat) =>
              cat.services.map((svc) => {
                const displayValue = isEditing
                  ? (editedValues[svc.id] ?? svc.adjustedValue)
                  : svc.adjustedValue
                const diff = displayValue - svc.originalValue
                return (
                  <TableRow
                    key={svc.id}
                    sx={{ bgcolor: isEditing ? '#FFFBEB' : tokens.color.neutral[50] }}
                  >
                    <TableCell sx={{ py: 1 }}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        {!isEditing && <Lock sx={{ fontSize: 11, color: tokens.color.neutral[400] }} />}
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                            {svc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {cat.categoryName}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                        ₹{formatCurrency(svc.originalValue)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      {isEditing ? (
                        <TextField
                          type="number"
                          value={editedValues[svc.id] ?? svc.adjustedValue}
                          onChange={(e) => onEditedValueChange(svc.id, Number(e.target.value))}
                          size="small"
                          inputProps={{ style: { fontSize: 12, padding: '4px 8px' } }}
                          sx={{ width: 140 }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                          ₹{formatCurrency(svc.adjustedValue)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 12,
                          color: diff === 0 ? 'text.secondary' : diff > 0 ? 'success.main' : 'error.main',
                        }}
                      >
                        {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}₹${formatCurrency(Math.abs(diff))}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </WorkspaceSection>
  )
}

// ─── Vendor PO Card ───────────────────────────────────────────────────────────

interface VendorPOCardProps {
  vendorPO: VendorPO
}

function VendorPOCard({ vendorPO }: VendorPOCardProps) {
  const [expanded, setExpanded] = useState(false)

  function getMilestoneColor(status: string): { bg: string; color: string } {
    if (status === 'Paid') return { bg: alpha(tokens.color.success[500], 0.1), color: tokens.color.success[700] }
    if (status === 'Overdue') return { bg: alpha(tokens.color.error[500], 0.1), color: tokens.color.error[700] }
    return { bg: alpha(tokens.color.neutral[500], 0.1), color: tokens.color.neutral[600] }
  }

  function getVendorPOStatusColor(status: string): { bg: string; color: string } {
    if (status === 'Active') return { bg: alpha(tokens.color.success[500], 0.1), color: tokens.color.success[700] }
    if (status === 'Issued') return { bg: alpha(tokens.color.info[500], 0.1), color: tokens.color.info[700] }
    return { bg: alpha(tokens.color.neutral[500], 0.1), color: tokens.color.neutral[600] }
  }

  const statusColors = getVendorPOStatusColor(vendorPO.status)

  return (
    <Box
      sx={{
        border: `1px solid ${tokens.color.neutral[100]}`,
        borderRadius: 2,
        overflow: 'hidden',
        mb: 1.5,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={2}
        sx={{
          p: '12px 16px',
          cursor: 'pointer',
          '&:hover': { bgcolor: tokens.color.neutral[50] },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: alpha(getAvatarColor(vendorPO.vendorName).bg, 0.15),
            color: getAvatarColor(vendorPO.vendorName).bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(vendorPO.vendorName)}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
            {vendorPO.vendorName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, fontFamily: 'monospace' }}>
            {vendorPO.poNumber}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
          ₹{formatCurrency(vendorPO.poValue)}
        </Typography>

        <Box
          sx={{
            px: 1,
            py: '2px',
            borderRadius: '4px',
            bgcolor: statusColors.bg,
            color: statusColors.color,
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {vendorPO.status}
        </Box>

        <MuiIconButton size="small" sx={{ p: '2px', flexShrink: 0 }}>
          {expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
        </MuiIconButton>
      </Stack>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Payment Schedule
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['MILESTONE', 'DUE DATE', 'AMOUNT', 'STATUS', 'ACTIONS'].map((col) => (
                  <TableCell
                    key={col}
                    sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, py: 1 }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {vendorPO.milestones.map((milestone) => {
                const msColors = getMilestoneColor(milestone.status)
                const isPaid = milestone.status === 'Paid'
                return (
                  <TableRow key={milestone.id}>
                    <TableCell sx={{ py: 1 }}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        {isPaid && <Lock sx={{ fontSize: 11, color: tokens.color.neutral[400] }} />}
                        <Typography variant="body2" sx={{ fontSize: 12 }}>{milestone.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {milestone.dueDate ? formatDate(milestone.dueDate) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                        ₹{formatCurrency(milestone.value)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          px: 1,
                          py: '1px',
                          borderRadius: '4px',
                          bgcolor: msColors.bg,
                          color: msColors.color,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {milestone.status}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      {isPaid ? (
                        <Lock sx={{ fontSize: 13, color: tokens.color.neutral[400] }} />
                      ) : (
                        <Stack direction="row" gap={0.5}>
                          <MuiButton size="small" variant="contained" color="success" sx={{ fontSize: 10, height: 24, minWidth: 0, px: 1 }}>
                            Pay
                          </MuiButton>
                          <MuiButton size="small" variant="outlined" sx={{ fontSize: 10, height: 24, minWidth: 0, px: 1 }}>
                            Edit
                          </MuiButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {vendorPO.milestones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="caption" color="text.secondary">No milestones defined</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Collapse>
    </Box>
  )
}

// ─── State A — No PO ─────────────────────────────────────────────────────────

interface StateAProps {
  onUploadPO: () => void
}

function StateA({ onUploadPO }: StateAProps) {
  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', pt: 5 }}>
      <StepIndicator currentStep={1} />
      <Box sx={{ textAlign: 'center' }}>
        <Assignment sx={{ fontSize: 64, color: tokens.color.primary[200] }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mt: 2 }}>
          Waiting for Client PO
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3, maxWidth: 400, mx: 'auto' }}>
          Once the client issues a Purchase Order, upload it here to begin the baseline creation process.
        </Typography>
        <MuiButton
          variant="contained"
          size="medium"
          startIcon={<Upload sx={{ fontSize: 16 }} />}
          onClick={onUploadPO}
          sx={{ fontSize: 13 }}
        >
          Upload Client PO
        </MuiButton>
      </Box>
    </Box>
  )
}

// ─── State B — PO uploaded, no baseline ──────────────────────────────────────

interface StateBProps {
  clientPOs: ClientPO[]
  versions: PitchVersion[]
  selectedVersionId: string | null
  onSelectVersion: (id: string) => void
  onAddPO: () => void
  onEditPO: (po: ClientPO) => void
  onDeletePO: (po: ClientPO) => void
  adjustedValues: Record<string, number>
  onAdjustedChange: (serviceId: string, value: number) => void
  localMilestones: Record<string, ClientMilestone[]>
  onMilestonesChange: (serviceId: string, milestones: ClientMilestone[]) => void
  vendorQuotes: Record<string, { quoteUrl: string; quoteReference: string; quoteValue: number }>
  onQuoteUploaded: (vendorId: string, data: { quoteUrl: string; quoteReference: string; quoteValue: number }) => void
  onRemoveQuote: (vendorId: string) => void
  onCreateBaseline: () => void
  saving: boolean
}

function StateB({
  clientPOs,
  versions,
  selectedVersionId,
  onSelectVersion,
  onAddPO,
  onEditPO,
  onDeletePO,
  adjustedValues,
  onAdjustedChange,
  localMilestones,
  onMilestonesChange,
  vendorQuotes,
  onQuoteUploaded,
  onRemoveQuote,
  onCreateBaseline,
  saving,
}: StateBProps) {
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null
  const totalPOValue = clientPOs.reduce((sum, po) => sum + po.poValue, 0)

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
        gap: 3,
        alignItems: 'start',
      }}
    >
      {/* LEFT COLUMN */}
      <Box>
        <POListSection
          clientPOs={clientPOs}
          onAddPO={onAddPO}
          onEditPO={onEditPO}
          onDeletePO={onDeletePO}
        />

        <VersionSelection
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelect={onSelectVersion}
        />

        {selectedVersion && (
          <>
            <AlignmentTable
              version={selectedVersion}
              totalPOValue={totalPOValue}
              adjustedValues={adjustedValues}
              onAdjustedChange={onAdjustedChange}
              localMilestones={localMilestones}
              onMilestonesChange={onMilestonesChange}
            />

            <VendorFinalization
              version={selectedVersion}
              vendorQuotes={vendorQuotes}
              onQuoteUploaded={onQuoteUploaded}
              onRemoveQuote={onRemoveQuote}
            />
          </>
        )}
      </Box>

      {/* RIGHT COLUMN */}
      <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: 80 }}>
        <PreBaselineRightPanel
          clientPOs={clientPOs}
          selectedVersionId={selectedVersionId}
          versions={versions}
          adjustedValues={adjustedValues}
          saving={saving}
          onCreateBaseline={onCreateBaseline}
        />
      </Box>
    </Box>
  )
}

// ─── State C — Baseline locked ────────────────────────────────────────────────

interface StateCProps {
  baseline: Baseline
  clientPOs: ClientPO[]
  vendorPOs: VendorPO[]
  vendors: VendorOption[]
  saving: boolean
  onIssueVendorPO: () => void
  projectId: string
}

function StateC({ baseline, clientPOs, vendorPOs, saving, onIssueVendorPO, projectId }: StateCProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [isEditingBaseline, setIsEditingBaseline] = useState(false)
  const [editedValues, setEditedValues] = useState<Record<string, number>>({})

  const margin =
    baseline.totalRevenue > 0
      ? ((baseline.profitability / baseline.totalRevenue) * 100).toFixed(1)
      : '0.0'

  const totalVendorPOValue = vendorPOs.reduce((sum, vpo) => sum + vpo.poValue, 0)
  const activeVendorPOs = vendorPOs.filter((vpo) => vpo.status === 'Active' || vpo.status === 'Issued')
  const primaryPO = clientPOs.find((po) => po.isPrimary) ?? clientPOs[0]

  const rightCardSx = {
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    p: 2.5,
    mb: 2,
  }
  const labelSx = {
    textTransform: 'uppercase' as const,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: 'text.secondary',
    display: 'block',
    mb: 1.5,
  }

  function startEditing() {
    const init: Record<string, number> = {}
    for (const cat of baseline.categories) {
      for (const svc of cat.services) {
        init[svc.id] = svc.adjustedValue
      }
    }
    setEditedValues(init)
    setIsEditingBaseline(true)
  }

  function cancelEditing() {
    setIsEditingBaseline(false)
    setEditedValues({})
  }

  async function handleSaveBaseline() {
    const updatedCategories: BaselineCategory[] = baseline.categories.map((cat) => ({
      ...cat,
      services: cat.services.map((svc) => ({
        ...svc,
        adjustedValue: editedValues[svc.id] ?? svc.adjustedValue,
        value: editedValues[svc.id] ?? svc.value,
      })),
      totalValue: cat.services.reduce((sum, s) => sum + (editedValues[s.id] ?? s.adjustedValue), 0),
    }))
    const newTotalRevenue = updatedCategories.reduce((sum, c) => sum + c.totalValue, 0)

    try {
      await dispatch(
        updateBaseline({
          projectId,
          baselineId: baseline.id,
          data: {
            categories: updatedCategories,
            totalRevenue: newTotalRevenue,
            profitability: newTotalRevenue - baseline.totalCost,
          },
        })
      ).unwrap()
      setIsEditingBaseline(false)
      setEditedValues({})
      toast.success('Baseline updated')
    } catch {
      toast.error('Failed to update baseline')
    }
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
        gap: 3,
        alignItems: 'start',
      }}
    >
      {/* LEFT COLUMN */}
      <Box>
        {/* Locked banner */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: 2,
            bgcolor: 'success.50',
            border: '1px solid',
            borderColor: 'success.200',
            mb: 3,
          }}
        >
          <LockOutlined sx={{ color: 'success.main', fontSize: 18, flexShrink: 0 }} />
          <Typography variant="body2" color="success.dark" sx={{ fontSize: 13 }}>
            Baseline locked on {formatDate(baseline.lockedAt)}. Project moved to Live status.{' '}
            Financial structure is now read-only.
          </Typography>
        </Box>

        {/* Locked service structure with edit mode */}
        <LockedServiceTable
          categories={baseline.categories}
          isEditing={isEditingBaseline}
          editedValues={editedValues}
          onEditedValueChange={(id, val) => setEditedValues((p) => ({ ...p, [id]: val }))}
          onStartEdit={startEditing}
          onCancelEdit={cancelEditing}
          onSaveEdit={() => void handleSaveBaseline()}
          saving={saving}
        />

        {/* Vendor POs — no inline action button, moved to right panel */}
        <WorkspaceSection title="Vendor Purchase Orders">
          {vendorPOs.length === 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                No vendor POs issued yet.
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11, display: 'block', mt: 0.5 }}>
                Issue vendor POs from the actions panel.
              </Typography>
            </Box>
          ) : (
            vendorPOs.map((vpo) => <VendorPOCard key={vpo.id} vendorPO={vpo} />)
          )}
        </WorkspaceSection>
      </Box>

      {/* RIGHT COLUMN */}
      <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: 80 }}>
        {/* Baseline Status */}
        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Baseline Status</Typography>
          <Stack gap={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Status</Typography>
              <MuiChip
                label="Locked"
                icon={<LockOutlined sx={{ fontSize: 14 }} />}
                size="small"
                sx={{ bgcolor: 'success.100', color: 'success.800', fontWeight: 600, fontSize: 11, height: 24 }}
              />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Locked on</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{formatDate(baseline.lockedAt)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Based on</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>Version {baseline.versionLabel}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Client PO</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                {primaryPO?.poNumber ?? '—'}
                {clientPOs.length > 1 && (
                  <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5 }}>
                    (+{clientPOs.length - 1} more)
                  </Typography>
                )}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Financial Summary */}
        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Financial Summary</Typography>
          <Stack gap={1.5} sx={{ mb: 2 }}>
            {[
              { label: 'Revenue', value: baseline.totalRevenue, borderColor: 'primary.main' },
              { label: 'Cost', value: baseline.totalCost, borderColor: 'warning.main' },
              { label: 'Profitability', value: baseline.profitability, borderColor: 'success.main' },
            ].map((row) => (
              <Box
                key={row.label}
                sx={{ pl: 1.5, borderLeft: '3px solid', borderColor: row.borderColor }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{row.label}</Typography>
                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 700 }}>
                  ₹{formatCurrency(row.value)}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Margin</Typography>
            <MuiChip
              label={`${margin}%`}
              size="small"
              sx={{ bgcolor: 'success.100', color: 'success.800', fontWeight: 700, fontSize: 11, height: 22 }}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(Number(margin), 100)}
            color="success"
            sx={{ borderRadius: 1, height: 6 }}
          />
        </Box>

        {/* Vendor POs Summary */}
        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Vendor POs</Typography>
          <Stack gap={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Total Vendor POs</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{vendorPOs.length}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Total Value</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
                ₹{formatCurrency(totalVendorPOValue)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Active POs</Typography>
              <MuiChip
                label={activeVendorPOs.length}
                size="small"
                sx={{ bgcolor: 'success.100', color: 'success.800', fontWeight: 700, fontSize: 11, height: 22 }}
              />
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <MuiButton
            fullWidth
            variant="outlined"
            startIcon={<Add sx={{ fontSize: 14 }} />}
            onClick={onIssueVendorPO}
            disabled={saving}
            sx={{ fontSize: 12, height: 36 }}
          >
            Issue Vendor PO
          </MuiButton>
        </Box>

        {/* Actions */}
        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Actions</Typography>
          {isEditingBaseline ? (
            <Stack gap={1}>
              <MuiButton
                fullWidth
                variant="contained"
                size="small"
                onClick={() => void handleSaveBaseline()}
                disabled={saving}
                sx={{ fontSize: 12, height: 36 }}
              >
                Save Changes
              </MuiButton>
              <MuiButton
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                onClick={cancelEditing}
                sx={{ fontSize: 12, height: 36 }}
              >
                Cancel
              </MuiButton>
            </Stack>
          ) : (
            <>
              <MuiButton
                fullWidth
                variant="outlined"
                startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
                onClick={startEditing}
                sx={{ fontSize: 12, height: 36 }}
              >
                Edit Baseline
              </MuiButton>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: 11 }}>
                Editing baseline creates an audit log entry.
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Main BaselineTab ─────────────────────────────────────────────────────────

interface BaselineTabProps {
  project: Project
}

export default function BaselineTab({ project }: BaselineTabProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  void useTheme()

  const { clientPOs, baseline, vendorPOs, saving, loading } = useAppSelector((s) => s.baseline)
  const { versions } = useAppSelector((s) => s.pitch)

  const [uploadPOOpen, setUploadPOOpen] = useState(false)
  const [editPOOpen, setEditPOOpen] = useState(false)
  const [editingPO, setEditingPO] = useState<ClientPO | null>(null)
  const [deletePODialogOpen, setDeletePODialogOpen] = useState(false)
  const [deletingPO, setDeletingPO] = useState<ClientPO | null>(null)
  const [issueVendorPOOpen, setIssueVendorPOOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [adjustedValues, setAdjustedValues] = useState<Record<string, number>>({})
  const [localMilestones, setLocalMilestones] = useState<Record<string, ClientMilestone[]>>({})
  const [vendorQuotes, setVendorQuotes] = useState<Record<string, { quoteUrl: string; quoteReference: string; quoteValue: number }>>({})

  // Fetch on mount
  useEffect(() => {
    void dispatch(fetchClientPO(project.id))
    void dispatch(fetchBaseline(project.id))
    void dispatch(fetchVendorPOs(project.id))
    void dispatch(fetchVersions(project.id))

    return () => {
      dispatch(resetBaseline())
    }
  }, [dispatch, project.id])

  // Auto-select active version
  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      const active = versions.find((v) => v.isActive) ?? versions[0]
      if (active) setSelectedVersionId(active.id)
    }
  }, [versions, selectedVersionId])

  // Initialize adjusted values when version changes
  useEffect(() => {
    const version = versions.find((v) => v.id === selectedVersionId)
    if (version) {
      const init: Record<string, number> = {}
      for (const cat of version.categories) {
        for (const svc of cat.services) {
          init[svc.id] = svc.value
        }
      }
      setAdjustedValues(init)
    }
  }, [selectedVersionId, versions])

  function handleAdjustedChange(serviceId: string, value: number) {
    setAdjustedValues((prev) => ({ ...prev, [serviceId]: value }))
  }

  function handleMilestonesChange(serviceId: string, milestones: ClientMilestone[]) {
    setLocalMilestones((prev) => ({ ...prev, [serviceId]: milestones }))
  }

  function openEditPO(po: ClientPO) {
    setEditingPO(po)
    setEditPOOpen(true)
  }

  function openDeletePO(po: ClientPO) {
    setDeletingPO(po)
    setDeletePODialogOpen(true)
  }

  async function handleCreateBaseline() {
    if (clientPOs.length === 0 || !selectedVersionId) return
    const version = versions.find((v) => v.id === selectedVersionId)
    if (!version) return

    const primaryPO = clientPOs.find((po) => po.isPrimary) ?? clientPOs[0]
    const totalPOValue = clientPOs.reduce((sum, po) => sum + po.poValue, 0)

    const categories: BaselineCategory[] = version.categories.map((cat) => ({
      id: `bc-${cat.id}`,
      categoryName: cat.categoryName,
      totalValue: cat.services.reduce((sum, s) => sum + (adjustedValues[s.id] ?? s.value), 0),
      services: cat.services.map((svc) => ({
        id: `bs-${svc.id}`,
        name: svc.name,
        subcategoryName: svc.subcategoryName ?? '',
        value: adjustedValues[svc.id] ?? svc.value,
        originalValue: svc.value,
        adjustedValue: adjustedValues[svc.id] ?? svc.value,
        clientMilestones: (localMilestones[svc.id] ?? svc.clientMilestones).map((m) => ({
          id: m.id,
          name: m.name,
          percentage: m.percentage,
          value: m.value,
          dueDate: m.dueDate,
        })),
        vendorMappings: svc.vendorMappings.map((vm) => ({
          id: vm.id,
          vendorId: vm.vendorId,
          vendorName: vm.vendorName,
          value: vm.value,
          percentage: vm.percentage,
        })),
      })),
    }))

    const totalRevenue = totalPOValue
    const totalCost = version.categories
      .flatMap((c) => c.services)
      .reduce((sum, s) => sum + s.vendorMappings.reduce((vs, vm) => vs + vm.value, 0), 0)

    try {
      await dispatch(
        createBaseline({
          projectId: project.id,
          data: {
            versionId: version.id,
            versionLabel: version.label,
            clientPOId: primaryPO?.id ?? '',
            categories,
            totalRevenue,
            totalCost,
            profitability: totalRevenue - totalCost,
          },
        })
      ).unwrap()
      toast.success('Baseline created — project is now Live')
    } catch {
      toast.error('Failed to create baseline')
    }
  }

  // Derive vendor list from baseline for IssueVendorPO drawer
  const vendorOptions: VendorOption[] = (() => {
    const map = new Map<string, VendorOption>()
    if (baseline) {
      for (const cat of baseline.categories) {
        for (const svc of cat.services) {
          for (const vm of svc.vendorMappings) {
            const existing = map.get(vm.vendorId)
            map.set(vm.vendorId, {
              vendorId: vm.vendorId,
              vendorName: vm.vendorName,
              allocatedValue: (existing?.allocatedValue ?? 0) + vm.value,
            })
          }
        }
      }
    }
    return Array.from(map.values())
  })()

  // Loading state
  if (loading && clientPOs.length === 0 && !baseline) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  const hasBaseline = !!baseline
  const hasPO = clientPOs.length > 0

  return (
    <Box>
      {/* State A — No PO */}
      {!hasPO && !hasBaseline && (
        <StateA onUploadPO={() => setUploadPOOpen(true)} />
      )}

      {/* State B — PO uploaded, no baseline */}
      {hasPO && !hasBaseline && (
        <StateB
          clientPOs={clientPOs}
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelectVersion={setSelectedVersionId}
          onAddPO={() => setUploadPOOpen(true)}
          onEditPO={openEditPO}
          onDeletePO={openDeletePO}
          adjustedValues={adjustedValues}
          onAdjustedChange={handleAdjustedChange}
          localMilestones={localMilestones}
          onMilestonesChange={handleMilestonesChange}
          vendorQuotes={vendorQuotes}
          onQuoteUploaded={(vendorId, data) => setVendorQuotes((p) => ({ ...p, [vendorId]: data }))}
          onRemoveQuote={(vendorId) => setVendorQuotes((p) => { const n = { ...p }; delete n[vendorId]; return n })}
          onCreateBaseline={() => void handleCreateBaseline()}
          saving={saving}
        />
      )}

      {/* State C — Baseline locked */}
      {hasBaseline && (
        <StateC
          baseline={baseline}
          clientPOs={clientPOs}
          vendorPOs={vendorPOs}
          vendors={vendorOptions}
          saving={saving}
          onIssueVendorPO={() => setIssueVendorPOOpen(true)}
          projectId={project.id}
        />
      )}

      {/* Drawers & Dialogs */}
      <UploadPODrawer
        open={uploadPOOpen}
        onClose={() => setUploadPOOpen(false)}
        projectId={project.id}
        saving={saving}
        existingPOCount={clientPOs.length}
      />

      <EditPODrawer
        open={editPOOpen}
        onClose={() => { setEditPOOpen(false); setEditingPO(null) }}
        projectId={project.id}
        po={editingPO}
        saving={saving}
      />

      <DeletePODialog
        open={deletePODialogOpen}
        onClose={() => { setDeletePODialogOpen(false); setDeletingPO(null) }}
        po={deletingPO}
        projectId={project.id}
        saving={saving}
      />

      <IssueVendorPODrawer
        open={issueVendorPOOpen}
        onClose={() => setIssueVendorPOOpen(false)}
        projectId={project.id}
        saving={saving}
        vendors={vendorOptions}
      />
    </Box>
  )
}
