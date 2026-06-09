import { useState, useEffect, useMemo } from 'react'
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
  LockOutlined,
  Upload,
  Add,
  CheckCircle,
  RadioButtonUnchecked,
  Edit as EditIcon,
  EditOutlined,
  Delete as DeleteIcon,
  AttachFile,
  EventNote,
  Group,
  InfoOutlined,
  RocketLaunch,
} from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  fetchClientPO,
  uploadClientPO,
  updateClientPO,
  deleteClientPO,
  fetchBaseline,
  fetchBaselineHistory,
  createBaseline,
  updateBaseline,
  fetchVendorPOs,
  createVendorPO,
} from '../../../slices/baseline/thunk'
import { resetBaseline } from '../../../slices/baseline/reducer'
import { fetchVersions } from '../../../slices/pitch/thunk'
import { fetchVendors } from '../../../slices/vendors/thunk'
import type { Project } from '../../../slices/projects/reducer'
import { changeProjectStatus, fetchProjectById } from '../../../slices/projects/thunk'
import type { ClientPO, Baseline, VendorPO } from '../../../slices/baseline/reducer'
import type { PitchVersion, PitchService, ClientMilestone, VendorMapping, PlannedExpense } from '../../../slices/pitch/reducer'
import {
  clearTransitionForProject,
  hydrateDraft,
  setSelectedSourceVersionId,
  updateDraftCategories,
  updateDraftPlannedExpenses,
  updateDraftServiceValue,
  updateDraftClientMilestones,
} from '../../../slices/transition/reducer'
import { fetchTransition, saveTransition } from '../../../slices/transition/thunk'
import {
  hydrateDraftFromPitchVersion,
  transitionDraftToPitchVersion,
  baselineSnapshotToTransitionDraft,
  recalcTransitionDraft,
} from '../../../utils/transitionDraft'
import {
  getTransitionFinalizeChecklist,
  canFinalizeTransition,
  serviceQuoteStatus,
  validateTransitionForFinalize,
  type ServiceQuoteStatus,
  type TransitionFinalizeChecklistItem,
} from '../../../utils/transitionFinalize'
import { rewirePlannedExpensesAfterVendorMappingSave } from '../../../utils/transitionExpenseRewire'
import { selectTransitionDraft } from '../../../store/selectors/transitionSelectors'
import { computePitchFinancialMetrics, sumPlannedExpensesOnVersion } from '../../../store/selectors/pitchSelectors'
import { VendorMappingDrawer } from '@/components/vendor/VendorMappingDrawer'
import { AddExpenseDrawer } from '@/components/expenses/AddExpenseDrawer'
import { PitchFinancialSidebar } from '@/components/projects/PitchFinancialSidebar'
import { EditMilestonesDrawer } from '../components/EditMilestonesDrawer'
import { WorkspaceSection } from '../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../components/templates/DrawerForm'
import { useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { formatCurrency, formatDate, formatInr } from '../../../utils/formatters'
import { LockedFinancialHierarchy } from './transition/lockedBaselineUi'

// ─── Upload PO Drawer ─────────────────────────────────────────────────────────

interface UploadPODrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
  saving: boolean
}

function UploadPODrawer({ open, onClose, projectId, saving }: UploadPODrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [poFormData, setPoFormData] = useState({
    poNumber: '',
    startDate: '',
    endDate: '',
    poValue: '',
    file: null as File | null,
  })

  useEffect(() => {
    if (!open) {
      setPoFormData({ poNumber: '', startDate: '', endDate: '', poValue: '', file: null })
    }
  }, [open])

  const handlePoChange = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPoFormData(prev => ({ ...prev, [field]: e.target.value }))
    }

  async function handleSubmit() {
    if (!poFormData.poNumber || !poFormData.startDate || !poFormData.endDate || !poFormData.poValue) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(
        uploadClientPO({
          projectId,
          data: {
            poNumber: poFormData.poNumber,
            startDate: poFormData.startDate,
            endDate: poFormData.endDate,
            poValue: Number(poFormData.poValue),
            documentUrl: null,
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
        <FormField label="Start date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={poFormData.startDate}
            onChange={handlePoChange('startDate')}
          />
        </FormField>
        <FormField label="End date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={poFormData.endDate}
            onChange={handlePoChange('endDate')}
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
    startDate: '',
    endDate: '',
    poValue: '',
  })

  useEffect(() => {
    if (po && open) {
      setForm({
        poNumber: po.poNumber,
        startDate: po.startDate,
        endDate: po.endDate,
        poValue: String(po.poValue),
      })
    }
  }, [po, open])

  async function handleSubmit() {
    if (!po || !form.poNumber || !form.startDate || !form.endDate || !form.poValue) {
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
            startDate: form.startDate,
            endDate: form.endDate,
            poValue: Number(form.poValue),
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
        <FormField label="Start date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))}
          />
        </FormField>
        <FormField label="End date" required>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))}
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
          Add PO
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
          bgcolor: 'background.default',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
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

      {/* PO list or inline empty */}
      {clientPOs.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No purchase orders added yet
          </Typography>
        </Box>
      ) : (
        clientPOs.map((po) => (
          <Box
            key={po.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: '10px 14px',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '8px',
              mb: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}
                >
                  {po.poNumber}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {po.startDate === po.endDate
                  ? formatDate(po.startDate)
                  : `${formatDate(po.startDate)} – ${formatDate(po.endDate)}`}
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
        ))
      )}
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
  })

  useEffect(() => {
    if (!open) {
      setForm({ vendorId: '', poNumber: '', poDate: '', poValue: '' })
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
            status: 'Draft',
            milestones: [],
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
        {(service.vendorMappings ?? []).length === 0
          ? 'No vendors mapped to this service.'
          : (service.vendorMappings ?? []).map((vm) => (
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
  onVendorMappingsSave?: (serviceId: string, mappings: VendorMapping[]) => void
  /** When true, use VendorMappingDrawer with PO Transition vendor-change rules. */
  transitionVendorDrawer?: boolean
  originalServiceValues?: Record<string, number>
  onVendorQuotationChange?: (
    serviceId: string,
    mappingId: string,
    quotation: VendorMapping['quotation'] | undefined,
  ) => void
}

function quoteStatusLabel(q: ServiceQuoteStatus): string {
  if (q === 'Uploaded') return 'Uploaded'
  if (q === 'Partial') return 'Partial'
  return 'Missing'
}

function quoteStatusStyles(q: ServiceQuoteStatus, theme: Theme) {
  if (q === 'Uploaded') {
    return { color: tokens.color.success[700], bg: alpha(theme.palette.success.main, 0.12) }
  }
  if (q === 'Partial') {
    return { color: tokens.color.warning[800], bg: alpha(theme.palette.warning.main, 0.12) }
  }
  return { color: tokens.color.error[700], bg: alpha(theme.palette.error.main, 0.12) }
}

function AlignmentTable({
  version,
  totalPOValue,
  adjustedValues,
  onAdjustedChange,
  localMilestones,
  onMilestonesChange,
  onVendorMappingsSave,
  transitionVendorDrawer = false,
  originalServiceValues,
  onVendorQuotationChange,
}: AlignmentTableProps) {
  const theme = useTheme()
  const [milestoneDrawerServiceId, setMilestoneDrawerServiceId] = useState<string | null>(null)
  const [vendorDrawerServiceId, setVendorDrawerServiceId] = useState<string | null>(null)

  const milestoneDrawerService = useMemo((): PitchService | null => {
    if (!milestoneDrawerServiceId) return null
    for (const c of version.categories) {
      const s = c.services.find((x) => x.id === milestoneDrawerServiceId)
      if (s) return s
    }
    return null
  }, [version, milestoneDrawerServiceId])

  const vendorDrawerService = useMemo((): PitchService | null => {
    if (!vendorDrawerServiceId) return null
    for (const c of version.categories) {
      const s = c.services.find((x) => x.id === vendorDrawerServiceId)
      if (s) return s
    }
    return null
  }, [version, vendorDrawerServiceId])

  const flatServices: FlatService[] = version.categories.flatMap((cat) =>
    cat.services.map((svc) => ({
      id: svc.id,
      name: svc.name,
      categoryName: cat.categoryName,
      originalValue: originalServiceValues?.[svc.id] ?? svc.value,
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
            bgcolor: isMatch ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
            border: `1px solid ${isMatch ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.warning.main, 0.3)}`,
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
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
                {['SERVICE', 'ORIGINAL (₹)', 'ADJUSTED (₹)', 'DIFFERENCE', 'MILESTONES', 'VENDORS', 'QUOTE STATUS'].map((col) => (
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
                    const orig = originalServiceValues?.[svc.id] ?? svc.value
                    const diff = adjusted - orig
                    const mils = localMilestones[svc.id] ?? svc.clientMilestones
                    const noVendor = (svc.vendorMappings ?? []).length === 0
                    const qStat = serviceQuoteStatus(svc)
                    const qSx = quoteStatusStyles(qStat, theme)
                    return (
                      <TableRow key={svc.id} sx={{ '&:hover': { bgcolor: tokens.color.neutral[50] } }}>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                            {svc.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                            {cat.categoryName}
                          </Typography>
                          {noVendor && (
                            <Typography variant="caption" sx={{ fontSize: 10, color: 'warning.main', display: 'block', mt: 0.5 }}>
                              No vendor mapped
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                            ₹{formatCurrency(orig)}
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
                            onClick={() => setMilestoneDrawerServiceId(svc.id)}
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
                            onClick={() => setVendorDrawerServiceId(svc.id)}
                            sx={{ fontSize: 10, height: 26, whiteSpace: 'nowrap' }}
                          >
                            {(svc.vendorMappings ?? []).length} vendor{(svc.vendorMappings ?? []).length !== 1 ? 's' : ''}
                          </MuiButton>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: qSx.color,
                              bgcolor: qSx.bg,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              display: 'inline-block',
                            }}
                          >
                            {quoteStatusLabel(qStat)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  }),
                  <TableRow key={`${cat.id}-total`} sx={{ bgcolor: 'background.default' }}>
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
                    <TableCell colSpan={4} />
                  </TableRow>,
                ]
              })}
            </TableBody>
          </Table>
        </Box>
      </WorkspaceSection>

      <EditMilestonesDrawer
        open={!!milestoneDrawerService}
        onClose={() => setMilestoneDrawerServiceId(null)}
        service={milestoneDrawerService}
        onSave={(milestones) => {
          if (milestoneDrawerService) {
            onMilestonesChange(milestoneDrawerService.id, milestones)
          }
        }}
      />

      {transitionVendorDrawer ? (
        <VendorMappingDrawer
          key={vendorDrawerService?.id ?? 'closed'}
          open={!!vendorDrawerService}
          onClose={() => setVendorDrawerServiceId(null)}
          service={vendorDrawerService}
          onSave={(mappings) => {
            if (vendorDrawerService) {
              onVendorMappingsSave?.(vendorDrawerService.id, mappings)
            }
          }}
          initialMode="edit"
          resetMilestonesOnVendorChange
          onVendorQuotationChange={onVendorQuotationChange}
        />
      ) : (
        <VendorAlignmentDrawer
          open={!!vendorDrawerService}
          onClose={() => setVendorDrawerServiceId(null)}
          service={vendorDrawerService}
        />
      )}
    </>
  )
}

// ─── Pre-Baseline Right Panel ─────────────────────────────────────────────────

interface PreBaselineRightPanelProps {
  clientPOs: ClientPO[]
  selectedVersionId: string | null
  versions: PitchVersion[]
  transitionDraftVersion: PitchVersion | null
  transitionFinMetrics: ReturnType<typeof computePitchFinancialMetrics>
  checklistItems: TransitionFinalizeChecklistItem[]
  canFinalize: boolean
  onSaveDraft: () => void
  draftSaving: boolean
  onOpenFinalizeModal: () => void
  finalizeSaving: boolean
  /** Re-finalize flow after unlocking baseline (same validations as go-live). */
  rightPanelMode?: 'preLive' | 'refinalize'
  onOpenReFinalizeModal?: () => void
  reFinalizeSaving?: boolean
}

function PreBaselineRightPanel({
  clientPOs,
  selectedVersionId,
  versions,
  transitionDraftVersion,
  transitionFinMetrics,
  checklistItems,
  canFinalize,
  onSaveDraft,
  draftSaving,
  onOpenFinalizeModal,
  finalizeSaving,
  rightPanelMode = 'preLive',
  onOpenReFinalizeModal,
  reFinalizeSaving = false,
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
  const selectedVersionLabel = selectedVersion?.label ?? '—'

  return (
    <>
      {transitionDraftVersion && (
        <Box sx={{ mb: 2 }}>
          <PitchFinancialSidebar
            version={transitionDraftVersion}
            metrics={transitionFinMetrics}
          />
        </Box>
      )}

      {/* Checklist */}
      <Box sx={rightCardSx}>
        <Typography variant="caption" sx={labelSx}>
          {rightPanelMode === 'refinalize' ? 'Validation checklist' : 'Baseline Checklist'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: 11 }}>
          {rightPanelMode === 'refinalize'
            ? 'Complete all steps before re-finalizing the baseline'
            : 'Complete all steps to go live'}
        </Typography>
        <Stack gap={1.5}>
          {checklistItems.map((item) => (
            <Stack key={item.id} direction="row" alignItems="center" gap={1}>
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

      {/* Draft + Finalize */}
      <Box sx={rightCardSx}>
        <Typography variant="caption" sx={labelSx}>Actions</Typography>
        <Stack gap={1.5}>
          <MuiButton
            variant="outlined"
            fullWidth
            disabled={draftSaving}
            onClick={onSaveDraft}
            sx={{ fontSize: 12, height: 36 }}
          >
            {draftSaving ? 'Saving…' : 'Save as Draft'}
          </MuiButton>
          {rightPanelMode === 'refinalize' ? (
            <MuiButton
              variant="contained"
              fullWidth
              startIcon={canFinalize ? <RocketLaunch sx={{ fontSize: 16 }} /> : <LockOutlined sx={{ fontSize: 16 }} />}
              disabled={!canFinalize || reFinalizeSaving}
              onClick={onOpenReFinalizeModal}
              sx={{ fontSize: 12, height: 36 }}
            >
              {reFinalizeSaving ? 'Saving…' : 'Re-Finalize Baseline'}
            </MuiButton>
          ) : (
            <MuiButton
              variant="contained"
              fullWidth
              startIcon={canFinalize ? <RocketLaunch sx={{ fontSize: 16 }} /> : <LockOutlined sx={{ fontSize: 16 }} />}
              disabled={!canFinalize || finalizeSaving}
              onClick={onOpenFinalizeModal}
              sx={{ fontSize: 12, height: 36 }}
            >
              {finalizeSaving ? 'Finalizing…' : 'Finalize & Go Live'}
            </MuiButton>
          )}
          {!canFinalize && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontSize: 11 }}>
              Complete all required steps to finalize
            </Typography>
          )}
        </Stack>
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
          {rightPanelMode === 'refinalize'
            ? 'Re-finalizing creates a new baseline version and locks the structure again. All changes are tracked for audit.'
            : 'Align your service values to exactly match the client PO total. Once the baseline is created, the financial structure is locked.'}
        </Typography>
      </Box>
    </>
  )
}

// ─── Transition expense planning (local commit) ─────────────────────────────

interface TransitionExpensePlanningBlockProps {
  projectId: string
  version: PitchVersion
  onCommit: (next: PlannedExpense[]) => void
  /** Defaults to "Expense Planning". */
  sectionTitle?: string
  /** MUI spacing units for top margin on outer box; default 3. Use 0 when placed directly under a Divider. */
  sectionTopMargin?: number
}

function TransitionExpensePlanningBlock({
  projectId,
  version,
  onCommit,
  sectionTitle = 'Expense Planning',
  sectionTopMargin = 3,
}: TransitionExpensePlanningBlockProps) {
  const dispatch = useAppDispatch()
  const vendorItems = useAppSelector((s) => s.vendors.items ?? [])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PlannedExpense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannedExpense | null>(null)

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vendorItems ?? []) {
      m.set(v.id, v.name)
    }
    return m
  }, [vendorItems])

  useEffect(() => {
    if (!vendorItems?.length) {
      void dispatch(fetchVendors({}))
    }
  }, [dispatch, vendorItems?.length])

  return (
    <Box
      sx={{
        mt: sectionTopMargin,
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: 15 }}>
          {sectionTitle}
        </Typography>
        <MuiButton
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={() => {
            setEditing(null)
            setDrawerOpen(true)
          }}
          sx={{ fontSize: 12, fontWeight: 600 }}
        >
          Add Expense
        </MuiButton>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: tokens.color.neutral[50] }}>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Type</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Name</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Amount</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500] }}>Vendor(s)</TableCell>
              <TableCell sx={{ fontSize: 10, fontWeight: 700, color: tokens.color.neutral[500], width: 88 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(version.plannedExpenses ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 2, color: 'text.disabled', fontSize: 12 }}>
                  No planned expenses yet.
                </TableCell>
              </TableRow>
            ) : (
              (version.plannedExpenses ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.type === 'additional'
                      ? 'Additional'
                      : row.type === 'vendor'
                        ? 'Vendor'
                        : 'Common'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{row.name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>₹{formatInr(row.amount)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.type === 'additional' && '—'}
                    {row.type === 'vendor' &&
                      (vendorNameById.get(row.vendorId ?? '') ?? row.vendorId ?? '—')}
                    {row.type === 'common' &&
                      row.vendorSplits?.length &&
                      row.vendorSplits
                        .map(
                          (s) =>
                            `${vendorNameById.get(s.vendorId) ?? s.vendorId} (${s.percentage}%)`,
                        )
                        .join(', ')}
                    {row.type === 'common' && !row.vendorSplits?.length && '—'}
                  </TableCell>
                  <TableCell align="right">
                    <MuiIconButton
                      size="small"
                      aria-label="Edit expense"
                      onClick={() => {
                        setEditing(row)
                        setDrawerOpen(true)
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </MuiIconButton>
                    <MuiIconButton
                      size="small"
                      aria-label="Delete expense"
                      onClick={() => setDeleteTarget(row)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </MuiIconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>
      <Stack
        direction="row"
        justifyContent="flex-end"
        sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${tokens.color.neutral[100]}` }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
          Total Planned Expenses: ₹{formatInr(sumPlannedExpensesOnVersion(version))}
        </Typography>
      </Stack>

      <AddExpenseDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditing(null)
        }}
        version={version}
        projectId={projectId}
        editingExpense={editing}
        onCommit={(next) => onCommit(next)}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>Delete expense</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontSize: 13, pt: 0.5 }}>
            Delete this expense?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setDeleteTarget(null)}>Cancel</MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              if (!deleteTarget) return
              const next = (version.plannedExpenses ?? []).filter((e) => e.id !== deleteTarget.id)
              onCommit(next)
              setDeleteTarget(null)
            }}
          >
            Delete
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── State B — No baseline (pre-live) ────────────────────────────────────────

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
  onVendorMappingsSave: (serviceId: string, mappings: VendorMapping[]) => void
  /** Pitch-shaped transition draft for alignment + financials (null if no version selected). */
  draftAsVersion: PitchVersion | null
  originalServiceValues: Record<string, number>
  onVendorQuotationChange: (
    serviceId: string,
    mappingId: string,
    quotation: VendorMapping['quotation'] | undefined,
  ) => void
  transitionFinMetrics: ReturnType<typeof computePitchFinancialMetrics>
  checklistItems: TransitionFinalizeChecklistItem[]
  canFinalize: boolean
  onSaveDraft: () => void
  draftSaving: boolean
  onOpenFinalizeModal: () => void
  finalizeSaving: boolean
  projectId: string
  onPlannedExpensesCommit: (next: PlannedExpense[]) => void
  /** Shown when editing an unlocked baseline (draft). */
  baselineEditBanner?: string | null
  /** Hide pitch version picker when re-editing from locked baseline. */
  hideVersionSelection?: boolean
  rightPanelMode?: 'preLive' | 'refinalize'
  onOpenReFinalizeModal?: () => void
  reFinalizeSaving?: boolean
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
  onVendorMappingsSave,
  draftAsVersion,
  originalServiceValues,
  onVendorQuotationChange,
  transitionFinMetrics,
  checklistItems,
  canFinalize,
  onSaveDraft,
  draftSaving,
  onOpenFinalizeModal,
  finalizeSaving,
  projectId,
  onPlannedExpensesCommit,
  baselineEditBanner,
  hideVersionSelection = false,
  rightPanelMode = 'preLive',
  onOpenReFinalizeModal,
  reFinalizeSaving = false,
}: StateBProps) {
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null
  const totalPOValue = clientPOs.reduce((sum, po) => sum + po.poValue, 0)
  const alignmentVersion = draftAsVersion ?? selectedVersion

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
        {baselineEditBanner && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
            {baselineEditBanner}
          </Alert>
        )}
        <POListSection
          clientPOs={clientPOs}
          onAddPO={onAddPO}
          onEditPO={onEditPO}
          onDeletePO={onDeletePO}
        />

        {!hideVersionSelection && (
          <VersionSelection
            versions={versions}
            selectedVersionId={selectedVersionId}
            onSelect={onSelectVersion}
          />
        )}

        {!hideVersionSelection && !selectedVersionId && (
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            No version selected. Select a version to start PO alignment.
          </Alert>
        )}

        {alignmentVersion && (
          <>
            <AlignmentTable
              version={alignmentVersion}
              totalPOValue={totalPOValue}
              adjustedValues={adjustedValues}
              onAdjustedChange={onAdjustedChange}
              localMilestones={localMilestones}
              onMilestonesChange={onMilestonesChange}
              onVendorMappingsSave={onVendorMappingsSave}
              transitionVendorDrawer={Boolean(draftAsVersion)}
              originalServiceValues={originalServiceValues}
              onVendorQuotationChange={draftAsVersion ? onVendorQuotationChange : undefined}
            />
          </>
        )}

        {alignmentVersion && (
          <TransitionExpensePlanningBlock
            projectId={projectId}
            version={alignmentVersion}
            onCommit={onPlannedExpensesCommit}
          />
        )}
      </Box>

      {/* RIGHT COLUMN */}
      <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: 80 }}>
        <PreBaselineRightPanel
          clientPOs={clientPOs}
          selectedVersionId={selectedVersionId}
          versions={versions}
          transitionDraftVersion={draftAsVersion}
          transitionFinMetrics={transitionFinMetrics}
          checklistItems={checklistItems}
          canFinalize={canFinalize}
          onSaveDraft={onSaveDraft}
          draftSaving={draftSaving}
          onOpenFinalizeModal={onOpenFinalizeModal}
          finalizeSaving={finalizeSaving}
          rightPanelMode={rightPanelMode}
          onOpenReFinalizeModal={onOpenReFinalizeModal}
          reFinalizeSaving={reFinalizeSaving}
        />
      </Box>
    </Box>
  )
}

// ─── State C — Baseline locked (Financial Baseline) ───────────────────────────

interface StateCProps {
  baseline: Baseline
  clientPOs: ClientPO[]
  vendorPOs: VendorPO[]
  vendors: VendorOption[]
  saving: boolean
  onIssueVendorPO: () => void
  projectId: string
  onRequestEditBaseline: () => void
}

function StateC({
  baseline,
  clientPOs,
  vendorPOs,
  saving,
  onIssueVendorPO,
  onRequestEditBaseline,
}: StateCProps) {
  const dispatch = useAppDispatch()
  const showToast = useToast((s) => s.showToast)

  const baselineAsPitchVersion = useMemo(
    (): PitchVersion => ({
      id: baseline.versionId,
      projectId: baseline.projectId,
      versionNumber: baseline.pitchVersionNumber,
      label: baseline.versionLabel,
      isActive: true,
      createdAt: baseline.lockedAt,
      categories: baseline.categories,
      plannedExpenses: baseline.plannedExpenses ?? [],
      totalRevenue: baseline.totalRevenue,
      totalCost: baseline.totalCost,
      profitability: baseline.profitability,
    }),
    [
      baseline.versionId,
      baseline.projectId,
      baseline.pitchVersionNumber,
      baseline.versionLabel,
      baseline.lockedAt,
      baseline.categories,
      baseline.plannedExpenses,
      baseline.totalRevenue,
      baseline.totalCost,
      baseline.profitability,
    ],
  )

  function handleLockedBaselinePlannedExpensesCommit(next: PlannedExpense[]) {
    void (async () => {
      try {
        await dispatch(
          updateBaseline({
            projectId: baseline.projectId,
            baselineId: baseline.id,
            data: { plannedExpenses: next },
          }),
        ).unwrap()
        showToast({ title: 'Expenses saved', variant: 'success' })
      } catch {
        showToast({ title: 'Failed to save expenses', variant: 'error' })
      }
    })()
  }

  const margin =
    baseline.totalRevenue > 0
      ? ((baseline.profitability / baseline.totalRevenue) * 100).toFixed(1)
      : '0.0'

  const totalVendorPOValue = vendorPOs.reduce((sum, vpo) => sum + vpo.poValue, 0)
  const clientPoNumbersLabel =
    clientPOs.length === 0 ? '—' : clientPOs.map((c) => c.poNumber).join(' · ')
  const issuedCount = vendorPOs.filter((p) => p.status === 'Issued' || p.status === 'Accepted').length
  const pendingCount = vendorPOs.length - issuedCount

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

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
        gap: 3,
        alignItems: 'start',
      }}
    >
      <Box>
        <Box sx={{ mb: 2 }}>
          <LockedFinancialHierarchy categories={baseline.categories} />
        </Box>
        <Divider sx={{ my: 3 }} />
        <TransitionExpensePlanningBlock
          projectId={baseline.projectId}
          version={baselineAsPitchVersion}
          onCommit={handleLockedBaselinePlannedExpensesCommit}
          sectionTitle="Expenses Planned"
          sectionTopMargin={0}
        />
      </Box>

      <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: 80 }}>
        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Baseline version</Typography>
          <Stack gap={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Version</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>V{baseline.version}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Locked on</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{formatDate(baseline.lockedAt)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Based on Pitch</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{baseline.basedOnPitchVersion}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Status</Typography>
              <MuiChip
                label="Locked"
                icon={<LockOutlined sx={{ fontSize: 14 }} />}
                size="small"
                sx={{ bgcolor: 'success.100', color: 'success.800', fontWeight: 600, fontSize: 11, height: 24 }}
              />
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, flexShrink: 0 }}>
                Client PO{clientPOs.length > 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                {clientPoNumbersLabel}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Financial summary</Typography>
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

        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Vendor PO summary</Typography>
          <Stack gap={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Total POs</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{vendorPOs.length}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Issued / accepted</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{issuedCount}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Draft / pending</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{pendingCount}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>Total value</Typography>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
                ₹{formatCurrency(totalVendorPOValue)}
              </Typography>
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
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

        <Box sx={rightCardSx}>
          <Typography variant="caption" sx={labelSx}>Actions</Typography>
          <MuiButton
            fullWidth
            variant="contained"
            startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
            onClick={onRequestEditBaseline}
            sx={{ fontSize: 12, height: 36 }}
          >
            Edit Baseline
          </MuiButton>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: 11 }}>
            Unlocks financial structure for a new draft version. Changes are audit logged.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Main TransitionTab ───────────────────────────────────────────────────────

interface TransitionTabProps {
  project: Project
}

export default function TransitionTab({ project }: TransitionTabProps) {
  const dispatch = useAppDispatch()
  const showToast = useToast((s) => s.showToast)
  void useTheme()

  const { clientPOs, baseline, vendorPOs, saving, loading } = useAppSelector((s) => s.baseline)
  const { versions } = useAppSelector((s) => s.pitch)
  const selectedVersionId = useAppSelector((s) => s.transition.selectedSourceVersionIdByProjectId[project.id] ?? null)
  const draft = useAppSelector((s) => selectTransitionDraft(s, project.id))
  const transitionSaving = useAppSelector((s) => s.transition.saving)

  const draftAsVersion = useMemo(() => (draft ? transitionDraftToPitchVersion(draft) : null), [draft])
  const adjustedValues = useMemo(() => {
    if (!draft) return {}
    const a: Record<string, number> = {}
    for (const c of draft.categories) {
      for (const s of c.services) a[s.id] = s.value
    }
    return a
  }, [draft])

  const transitionFinMetrics = useMemo(() => computePitchFinancialMetrics(draftAsVersion), [draftAsVersion])
  const originalServiceValues = draft?.originalServiceValues ?? {}

  const [uploadPOOpen, setUploadPOOpen] = useState(false)
  const [editPOOpen, setEditPOOpen] = useState(false)
  const [editingPO, setEditingPO] = useState<ClientPO | null>(null)
  const [deletePODialogOpen, setDeletePODialogOpen] = useState(false)
  const [deletingPO, setDeletingPO] = useState<ClientPO | null>(null)
  const [issueVendorPOOpen, setIssueVendorPOOpen] = useState(false)
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [isEditingUnlockedBaseline, setIsEditingUnlockedBaseline] = useState(false)
  const [unlockBaselineDialogOpen, setUnlockBaselineDialogOpen] = useState(false)
  const [reFinalizeDialogOpen, setReFinalizeDialogOpen] = useState(false)

  const finalizeInput = useMemo(
    () => ({ clientPOs, selectedVersionId, draft: draft ?? null }),
    [clientPOs, selectedVersionId, draft],
  )
  const checklistItems = useMemo(() => getTransitionFinalizeChecklist(finalizeInput), [finalizeInput])
  const canFinalize = useMemo(() => canFinalizeTransition(finalizeInput), [finalizeInput])

  // Fetch on mount
  useEffect(() => {
    void dispatch(fetchClientPO(project.id))
    void dispatch(fetchBaseline(project.id))
    void dispatch(fetchVendorPOs(project.id))
    void dispatch(fetchVersions(project.id))
    void dispatch(fetchTransition(project.id))
    void dispatch(fetchBaselineHistory(project.id))

    return () => {
      dispatch(resetBaseline())
      dispatch(clearTransitionForProject(project.id))
    }
  }, [dispatch, project.id])

  const hasBaseline = !!baseline

  useEffect(() => {
    if (!hasBaseline) setIsEditingUnlockedBaseline(false)
  }, [hasBaseline])

  function handleSelectPitchVersion(id: string) {
    dispatch(setSelectedSourceVersionId({ projectId: project.id, versionId: id }))
    const v = versions.find((x) => x.id === id)
    if (!v) return
    dispatch(
      hydrateDraft({
        projectId: project.id,
        draft: hydrateDraftFromPitchVersion(project.id, v),
      }),
    )
  }

  function handleAdjustedChange(serviceId: string, value: number) {
    dispatch(updateDraftServiceValue({ projectId: project.id, serviceId, value }))
  }

  function handleMilestonesChange(serviceId: string, milestones: ClientMilestone[]) {
    dispatch(updateDraftClientMilestones({ projectId: project.id, serviceId, milestones }))
  }

  function handleVendorMappingsSave(serviceId: string, mappings: VendorMapping[]) {
    if (!draft) return
    const prevSvc = draft.categories.flatMap((c) => c.services).find((s) => s.id === serviceId)
    const prevIds = new Set((prevSvc?.vendorMappings ?? []).map((m) => m.vendorId).filter(Boolean))
    const nextIds = new Set(mappings.map((m) => m.vendorId).filter(Boolean))
    const removedVendorIds = [...prevIds].filter((id) => !nextIds.has(id))
    const hadLinkedRemoval = draft.plannedExpenses.some(
      (e) => e.type === 'vendor' && e.vendorId && removedVendorIds.includes(e.vendorId),
    )

    const nextExp = rewirePlannedExpensesAfterVendorMappingSave(
      draft.categories,
      serviceId,
      mappings,
      draft.plannedExpenses,
    )
    const nextCats = draft.categories.map((cat) => ({
      ...cat,
      services: cat.services.map((svc) =>
        svc.id === serviceId ? { ...svc, vendorMappings: mappings } : svc,
      ),
    }))
    dispatch(updateDraftCategories({ projectId: project.id, categories: nextCats }))
    dispatch(updateDraftPlannedExpenses({ projectId: project.id, plannedExpenses: nextExp }))
    if (hadLinkedRemoval) {
      showToast({
        title: 'Vendor removed. Linked expenses are now unassigned.',
        variant: 'warning',
      })
    }
  }

  function handlePlannedExpensesCommit(next: PlannedExpense[]) {
    dispatch(updateDraftPlannedExpenses({ projectId: project.id, plannedExpenses: next }))
  }

  function handleVendorQuotationChange(
    serviceId: string,
    mappingId: string,
    quotation: VendorMapping['quotation'] | undefined,
  ) {
    if (!draft) return
    const nextCats = draft.categories.map((cat) => ({
      ...cat,
      services: cat.services.map((svc) =>
        svc.id !== serviceId
          ? svc
          : {
              ...svc,
              vendorMappings: svc.vendorMappings.map((vm) =>
                vm.id === mappingId ? { ...vm, quotation } : vm,
              ),
            },
      ),
    }))
    dispatch(updateDraftCategories({ projectId: project.id, categories: nextCats }))
  }

  async function handleSaveDraft() {
    if (!draft) {
      showToast({ title: 'Select a pitch version to save a draft', variant: 'warning' })
      return
    }
    try {
      await dispatch(
        saveTransition({
          projectId: project.id,
          body: {
            versionId: draft.sourceVersionId,
            categories: draft.categories,
            plannedExpenses: draft.plannedExpenses,
            originalServiceValues: draft.originalServiceValues,
            versionNumber: draft.versionNumber,
            label: draft.label,
            totalRevenue: draft.totalRevenue,
            totalCost: draft.totalCost,
            profitability: draft.profitability,
          },
        }),
      ).unwrap()
      showToast({ title: 'Draft saved', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to save draft', variant: 'error' })
    }
  }

  function openEditPO(po: ClientPO) {
    setEditingPO(po)
    setEditPOOpen(true)
  }

  function openDeletePO(po: ClientPO) {
    setDeletingPO(po)
    setDeletePODialogOpen(true)
  }

  async function executeFinalizeBaseline(isReFinalize: boolean) {
    if (clientPOs.length === 0 || !draft || !selectedVersionId) return
    const { ok, messages } = validateTransitionForFinalize({
      clientPOs,
      selectedVersionId,
      draft,
    })
    if (!ok) {
      showToast({ title: messages[0] ?? 'Complete all required steps to finalize', variant: 'error' })
      return
    }

    const referenceClientPoId = clientPOs[0]?.id ?? ''
    const recalc = recalcTransitionDraft({
      ...draft,
      plannedExpenses: draft.plannedExpenses ?? [],
    })

    setFinalizing(true)
    try {
      await dispatch(
        saveTransition({
          projectId: project.id,
          body: {
            versionId: draft.sourceVersionId,
            categories: structuredClone(draft.categories),
            plannedExpenses: structuredClone(draft.plannedExpenses ?? []),
            originalServiceValues: { ...draft.originalServiceValues },
            versionNumber: draft.versionNumber,
            label: draft.label,
            totalRevenue: recalc.totalRevenue,
            totalCost: recalc.totalCost,
            profitability: recalc.profitability,
          },
        }),
      ).unwrap()

      await dispatch(
        createBaseline({
          projectId: project.id,
          data: {
            versionId: draft.sourceVersionId,
            versionLabel: draft.label,
            basedOnPitchVersion: draft.label,
            pitchVersionNumber: draft.versionNumber,
            clientPOId: referenceClientPoId,
            categories: structuredClone(recalc.categories),
            plannedExpenses: structuredClone(recalc.plannedExpenses ?? []),
            originalServiceValues: { ...draft.originalServiceValues },
            totalRevenue: recalc.totalRevenue,
            totalCost: recalc.totalCost,
            profitability: recalc.profitability,
          },
        }),
      ).unwrap()

      if (project.status !== 'Live') {
        await dispatch(changeProjectStatus({ id: project.id, status: 'Live' })).unwrap()
      }
      await dispatch(fetchProjectById(project.id)).unwrap()
      await dispatch(fetchBaseline(project.id)).unwrap()
      await dispatch(fetchBaselineHistory(project.id)).unwrap()
      setFinalizeDialogOpen(false)
      setReFinalizeDialogOpen(false)
      setIsEditingUnlockedBaseline(false)
      showToast({
        title: isReFinalize ? 'Baseline re-finalized and locked' : 'Baseline created — project is now Live',
        variant: 'success',
      })
    } catch {
      showToast({ title: 'Failed to finalize', variant: 'error' })
    } finally {
      setFinalizing(false)
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

  return (
    <Box>
      {/* Pre-live or unlocked baseline edit: same transition workspace */}
      {(!hasBaseline || isEditingUnlockedBaseline) && (
        <StateB
          clientPOs={clientPOs}
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelectVersion={handleSelectPitchVersion}
          onAddPO={() => setUploadPOOpen(true)}
          onEditPO={openEditPO}
          onDeletePO={openDeletePO}
          adjustedValues={adjustedValues}
          onAdjustedChange={handleAdjustedChange}
          localMilestones={{}}
          onMilestonesChange={handleMilestonesChange}
          onVendorMappingsSave={handleVendorMappingsSave}
          draftAsVersion={draftAsVersion}
          originalServiceValues={originalServiceValues}
          onVendorQuotationChange={handleVendorQuotationChange}
          transitionFinMetrics={transitionFinMetrics}
          checklistItems={checklistItems}
          canFinalize={canFinalize}
          onSaveDraft={() => void handleSaveDraft()}
          draftSaving={transitionSaving}
          onOpenFinalizeModal={() => {
            if (!canFinalize) return
            setFinalizeDialogOpen(true)
          }}
          finalizeSaving={finalizing || saving}
          projectId={project.id}
          onPlannedExpensesCommit={handlePlannedExpensesCommit}
          baselineEditBanner={
            isEditingUnlockedBaseline && baseline
              ? `Editing Mode Active (Draft) — Version V${baseline.version + 1}`
              : undefined
          }
          hideVersionSelection={isEditingUnlockedBaseline}
          rightPanelMode={isEditingUnlockedBaseline ? 'refinalize' : 'preLive'}
          onOpenReFinalizeModal={() => {
            if (!canFinalize) return
            setReFinalizeDialogOpen(true)
          }}
          reFinalizeSaving={finalizing || saving}
        />
      )}

      {hasBaseline && !isEditingUnlockedBaseline && baseline && (
        <StateC
          baseline={baseline}
          clientPOs={clientPOs}
          vendorPOs={vendorPOs}
          vendors={vendorOptions}
          saving={saving}
          onIssueVendorPO={() => setIssueVendorPOOpen(true)}
          projectId={project.id}
          onRequestEditBaseline={() => setUnlockBaselineDialogOpen(true)}
        />
      )}

      {/* Drawers & Dialogs */}
      <UploadPODrawer
        open={uploadPOOpen}
        onClose={() => setUploadPOOpen(false)}
        projectId={project.id}
        saving={saving}
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

      <Dialog open={finalizeDialogOpen} onClose={() => !finalizing && setFinalizeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>Finalize & Go Live?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
            You are about to lock all financial details and start project execution.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, mb: 1 }}>
            After this:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: 13 }}>
            <li>Service values cannot be changed without unlocking</li>
            <li>Vendor milestones are fixed</li>
            <li>Payments and expenses will start tracking against this baseline</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setFinalizeDialogOpen(false)} disabled={finalizing}>
            Cancel
          </MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            disabled={finalizing}
            onClick={() => void executeFinalizeBaseline(false)}
          >
            {finalizing ? 'Finalizing…' : 'Finalize & Go Live'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog open={unlockBaselineDialogOpen} onClose={() => setUnlockBaselineDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>Edit Baseline?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
            This will unlock the financial structure.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: 13 }}>
            <li>Changes will impact payments and profitability</li>
            <li>All changes will be tracked in audit logs</li>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setUnlockBaselineDialogOpen(false)}>
            Cancel
          </MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            onClick={() => {
              if (!baseline) return
              dispatch(
                hydrateDraft({
                  projectId: project.id,
                  draft: baselineSnapshotToTransitionDraft(project.id, baseline),
                }),
              )
              dispatch(setSelectedSourceVersionId({ projectId: project.id, versionId: baseline.versionId }))
              setIsEditingUnlockedBaseline(true)
              setUnlockBaselineDialogOpen(false)
            }}
          >
            {'Unlock & Edit'}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog open={reFinalizeDialogOpen} onClose={() => !finalizing && setReFinalizeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>Re-Finalize Baseline?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
            This will run the same validations as the original finalize and create a new locked baseline version.
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            Previous versions remain in history for traceability.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setReFinalizeDialogOpen(false)} disabled={finalizing}>
            Cancel
          </MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            disabled={finalizing}
            onClick={() => void executeFinalizeBaseline(true)}
          >
            {finalizing ? 'Saving…' : 'Confirm re-finalize'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
