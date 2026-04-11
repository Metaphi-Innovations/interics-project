import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Button as MuiButton,
  Autocomplete,
  TextField,
  Chip as MuiChip,
  MenuItem,
  FormControl,
  Select as MuiSelect,
  Divider,
  IconButton as MuiIconButton,
  Collapse,
  CircularProgress,
} from '@mui/material'
import {
  Close,
  ArrowBack,
  ArrowForward,
  Check,
  Add,
  Upload,
  PersonOutline,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers, createCustomer } from '../../slices/customers/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { createProject } from '../../slices/projects/thunk'
import type { Customer } from '../../slices/customers/reducer'
import type { User } from '../../slices/users/reducer'
import { useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { toSlug, getInitials, getAvatarColor } from '../../utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardFormData {
  customerId: string
  customerName: string
  requirementFile: File | null
  requirementNotes: string
  name: string
  location: string
  projectType: 'Design Only' | 'Design & Build' | ''
  carpetArea: string
  headcount: string
  projectManagerId: string
  projectManagerName: string
  startDate: string
  expectedEndDate: string
  teamMembers: User[]
}

interface StepErrors {
  customerId?: string
  name?: string
  projectType?: string
  projectManagerId?: string
}

const STEPS = ['Customer', 'Requirements', 'Project Setup', 'Team']

const INITIAL_FORM: WizardFormData = {
  customerId: '',
  customerName: '',
  requirementFile: null,
  requirementNotes: '',
  name: '',
  location: '',
  projectType: '',
  carpetArea: '',
  headcount: '',
  projectManagerId: '',
  projectManagerName: '',
  startDate: '',
  expectedEndDate: '',
  teamMembers: [],
}

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()

  const customers = useAppSelector((s) => s.customers.items)
  const loadingCustomers = useAppSelector((s) => s.customers.loading)
  const users = useAppSelector((s) => s.users.items)
  const saving = useAppSelector((s) => s.projects.saving)

  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<StepErrors>({})
  const [confirmClose, setConfirmClose] = useState(false)
  const [showInlineCustomer, setShowInlineCustomer] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    type: 'Company' as 'Company' | 'Individual',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    state: '',
  })

  useEffect(() => {
    if (open) {
      dispatch(fetchCustomers({}))
      dispatch(fetchUsers())
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!open) {
      setActiveStep(0)
      setFormData(INITIAL_FORM)
      setErrors({})
      setConfirmClose(false)
    }
  }, [open])

  const managers = users.filter(
    (u) => u.role === 'Project User' || u.role === 'Power User'
  )

  function validateStep(step: number): boolean {
    const newErrors: StepErrors = {}
    if (step === 0 && !formData.customerId) {
      newErrors.customerId = 'Please select a customer'
    }
    if (step === 2) {
      if (!formData.name.trim()) newErrors.name = 'Project name is required'
      if (!formData.projectType) newErrors.projectType = 'Project type is required'
      if (!formData.projectManagerId) newErrors.projectManagerId = 'Project manager is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(activeStep)) setActiveStep((s) => s + 1)
  }

  function handleBack() {
    setActiveStep((s) => s - 1)
    setErrors({})
  }

  function handleClose() {
    if (activeStep > 0) {
      setConfirmClose(true)
    } else {
      onClose()
    }
  }

  async function handleSubmit() {
    if (!validateStep(activeStep)) return

    const payload = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      name: formData.name,
      location: formData.location,
      type: formData.projectType as 'Design Only' | 'Design & Build',
      carpetArea: formData.carpetArea ? Number(formData.carpetArea) : null,
      headcount: formData.headcount ? Number(formData.headcount) : null,
      projectManagerId: formData.projectManagerId,
      projectManager: formData.projectManagerName,
      startDate: formData.startDate || null,
      expectedEndDate: formData.expectedEndDate || null,
      status: 'Pitch' as const,
      progress: 'Quotation pending',
      projectValue: 0,
      totalClientPOValue: 0,
      totalVendorPOValue: 0,
      invoicedAmount: 0,
      paidVendorAmount: 0,
    }

    try {
      const result = await dispatch(createProject(payload)).unwrap()
      showToast({ title: 'Project created successfully', variant: 'success' })
      onClose()
      navigate(`/projects/${toSlug(result.name)}`)
    } catch {
      showToast({ title: 'Failed to create project', variant: 'error' })
    }
  }

  async function handleCreateCustomer() {
    if (!newCustomerData.name || !newCustomerData.contactPerson || !newCustomerData.phone) {
      showToast({ title: 'Please fill in required fields', variant: 'error' })
      return
    }
    try {
      setSavingCustomer(true)
      const result = await dispatch(
        createCustomer({
          name: newCustomerData.name,
          type: newCustomerData.type,
          contactPerson: newCustomerData.contactPerson,
          phone: newCustomerData.phone,
          email: newCustomerData.email,
          city: newCustomerData.city,
          state: newCustomerData.state,
          gstStatus: 'Unregistered',
          gstin: null,
          pan: null,
          address: null,
          tags: [],
          notes: null,
          status: 'Active',
          activeProjects: 0,
          totalReceivables: 0,
        })
      ).unwrap()
      setFormData((prev) => ({
        ...prev,
        customerId: result.id,
        customerName: result.name,
      }))
      setShowInlineCustomer(false)
      setNewCustomerData({ name: '', type: 'Company', contactPerson: '', phone: '', email: '', city: '', state: '' })
      showToast({ title: 'Customer created', variant: 'success' })
    } catch {
      showToast({ title: 'Failed to create customer', variant: 'error' })
    } finally {
      setSavingCustomer(false)
    }
  }

  const selectedCustomer = customers.find((c) => c.id === formData.customerId) ?? null

  // ─── Step 1: Customer ──────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: 'text.secondary', fontSize: 12 }}>
          Select Customer
        </Typography>

        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Customer <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <Autocomplete
            size="small"
            loading={loadingCustomers}
            options={customers}
            getOptionLabel={(c) => c.name}
            value={selectedCustomer}
            onChange={(_, val) => {
              setFormData((prev) => ({
                ...prev,
                customerId: val?.id ?? '',
                customerName: val?.name ?? '',
              }))
              if (errors.customerId) setErrors((e) => ({ ...e, customerId: undefined }))
            }}
            renderOption={(props, option) => {
              const colors = getAvatarColor(option.name)
              return (
                <Box component="li" {...props} sx={{ gap: 1 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '6px',
                      bgcolor: colors.bg,
                      color: colors.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(option.name)}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13 }}>{option.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{option.city}</Typography>
                  </Box>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by name…"
                error={Boolean(errors.customerId)}
                helperText={errors.customerId}
                sx={{ '& input': { fontSize: 13 } }}
              />
            )}
          />
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontSize: 11 }}>
            or
          </Typography>
        </Divider>

        <MuiButton
          variant="outlined"
          size="small"
          color={showInlineCustomer ? 'error' : 'primary'}
          sx={{ fontSize: 13 }}
          onClick={() => setShowInlineCustomer(!showInlineCustomer)}
        >
          {showInlineCustomer ? 'Cancel' : '+ Create New Customer'}
        </MuiButton>

        <Collapse in={showInlineCustomer}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: '1px solid #E8EEEC',
              borderRadius: '10px',
              backgroundColor: '#F8FAFB',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              New Customer Details
            </Typography>

            <Box display="grid" sx={{ gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
                  Company Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
                  Type <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <FormControl fullWidth size="small">
                  <MuiSelect
                    value={newCustomerData.type}
                    onChange={(e) => setNewCustomerData((prev) => ({ ...prev, type: e.target.value as 'Company' | 'Individual' }))}
                  >
                    <MenuItem value="Company">Company</MenuItem>
                    <MenuItem value="Individual">Individual</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
                  Contact Person <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={newCustomerData.contactPerson}
                  onChange={(e) => setNewCustomerData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Full name"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
                  Phone <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
                  Email
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@company.com"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
                  City
                </Typography>
                <TextField
                  fullWidth size="small"
                  value={newCustomerData.city}
                  onChange={(e) => setNewCustomerData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </Box>
            </Box>

            <Box display="flex" justifyContent="flex-end" gap={1} sx={{ mt: 2 }}>
              <MuiButton
                size="small"
                variant="outlined"
                onClick={() => {
                  setShowInlineCustomer(false)
                  setNewCustomerData({ name: '', type: 'Company', contactPerson: '', phone: '', email: '', city: '', state: '' })
                }}
              >
                Cancel
              </MuiButton>
              <MuiButton
                size="small"
                variant="contained"
                onClick={handleCreateCustomer}
                disabled={savingCustomer}
                endIcon={savingCustomer ? <CircularProgress size={12} /> : <Check fontSize="small" />}
              >
                Save Customer
              </MuiButton>
            </Box>
          </Box>
        </Collapse>
      </Box>
    )
  }

  // ─── Step 2: Requirements ──────────────────────────────────────────────────

  function renderStep2() {
    return (
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: 'text.secondary', fontSize: 12 }}>
          Project Requirements
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Upload Requirement Document
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: 11 }}>
            PDF or Word document, max 10MB
          </Typography>
          <Stack direction="row" alignItems="center" gap={2}>
            <MuiButton
              variant="outlined"
              component="label"
              startIcon={<Upload />}
              size="small"
              sx={{ fontSize: 13 }}
            >
              Upload Document
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setFormData((prev) => ({ ...prev, requirementFile: file }))
                }}
              />
            </MuiButton>
            {formData.requirementFile && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {formData.requirementFile.name}
              </Typography>
            )}
          </Stack>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Requirement Notes
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            size="small"
            value={formData.requirementNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, requirementNotes: e.target.value }))}
            placeholder="Describe key requirements, site constraints, design preferences…"
            sx={{ '& textarea': { fontSize: 13 } }}
          />
        </Box>
      </Box>
    )
  }

  // ─── Step 3: Project Setup ─────────────────────────────────────────────────

  function renderStep3() {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        {/* Project Name — full width */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Project Name <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Acme Corp - HO Redesign"
            error={Boolean(errors.name)}
            helperText={errors.name}
            sx={{ '& input': { fontSize: 13 } }}
          />
        </Box>

        {/* Project Type */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Project Type <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <FormControl fullWidth size="small" error={Boolean(errors.projectType)}>
            <MuiSelect
              value={formData.projectType}
              onChange={(e) => setFormData((prev) => ({ ...prev, projectType: e.target.value as WizardFormData['projectType'] }))}
              displayEmpty
              sx={{ fontSize: 13 }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>Select type…</MenuItem>
              <MenuItem value="Design Only" sx={{ fontSize: 13 }}>Design Only</MenuItem>
              <MenuItem value="Design & Build" sx={{ fontSize: 13 }}>Design & Build</MenuItem>
            </MuiSelect>
            {errors.projectType && (
              <Typography variant="caption" color="error" sx={{ mt: '3px', mx: '14px', fontSize: 11 }}>
                {errors.projectType}
              </Typography>
            )}
          </FormControl>
        </Box>

        {/* Location */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Location
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Building, City"
            sx={{ '& input': { fontSize: 13 } }}
          />
        </Box>

        {/* Carpet Area */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Carpet Area (sq ft)
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={formData.carpetArea}
            onChange={(e) => setFormData((prev) => ({ ...prev, carpetArea: e.target.value }))}
            placeholder="e.g. 4500"
            sx={{ '& input': { fontSize: 13 } }}
          />
        </Box>

        {/* Headcount */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Headcount
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={formData.headcount}
            onChange={(e) => setFormData((prev) => ({ ...prev, headcount: e.target.value }))}
            placeholder="e.g. 120"
            sx={{ '& input': { fontSize: 13 } }}
          />
        </Box>

        {/* Project Manager — full width */}
        <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Project Manager <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <FormControl fullWidth size="small" error={Boolean(errors.projectManagerId)}>
            <MuiSelect
              value={formData.projectManagerId}
              onChange={(e) => {
                const mgr = managers.find((m) => m.id === e.target.value)
                setFormData((prev) => ({
                  ...prev,
                  projectManagerId: e.target.value,
                  projectManagerName: mgr?.name ?? '',
                }))
              }}
              displayEmpty
              sx={{ fontSize: 13 }}
              renderValue={(val) => {
                if (!val) return <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>Select manager…</Typography>
                const mgr = managers.find((m) => m.id === val)
                if (!mgr) return val
                return (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <PersonOutline sx={{ fontSize: 14 }} />
                    <Typography sx={{ fontSize: 13 }}>{mgr.name}</Typography>
                  </Stack>
                )
              }}
            >
              <MenuItem value="" sx={{ fontSize: 13 }}>Select manager…</MenuItem>
              {managers.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13, gap: 1 }}>
                  <PersonOutline sx={{ fontSize: 14 }} />
                  {m.name}
                  <MuiChip
                    label={m.role}
                    size="small"
                    sx={{ height: 16, fontSize: 10, ml: 'auto', '& .MuiChip-label': { px: '6px' } }}
                  />
                </MenuItem>
              ))}
            </MuiSelect>
            {errors.projectManagerId && (
              <Typography variant="caption" color="error" sx={{ mt: '3px', mx: '14px', fontSize: 11 }}>
                {errors.projectManagerId}
              </Typography>
            )}
          </FormControl>
        </Box>

        {/* Start Date */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Expected Start Date
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ '& input': { fontSize: 13 } }}
          />
        </Box>

        {/* End Date */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Expected End Date
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={formData.expectedEndDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, expectedEndDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ '& input': { fontSize: 13 } }}
          />
        </Box>
      </Box>
    )
  }

  // ─── Step 4: Team ──────────────────────────────────────────────────────────

  function renderStep4() {
    return (
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: 'text.secondary', fontSize: 12 }}>
          Assign Team Members
        </Typography>

        <Autocomplete
          multiple
          size="small"
          options={users}
          getOptionLabel={(u) => u.name}
          value={formData.teamMembers}
          onChange={(_, val) => setFormData((prev) => ({ ...prev, teamMembers: val }))}
          renderOption={(props, option) => {
            const colors = getAvatarColor(option.name)
            return (
            <Box component="li" {...props} sx={{ gap: 1 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: colors.bg,
                  color: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(option.name)}
              </Box>
              <Typography sx={{ fontSize: 13 }}>{option.name}</Typography>
              <MuiChip
                label={option.role}
                size="small"
                sx={{ height: 16, fontSize: 10, ml: 'auto', '& .MuiChip-label': { px: '6px' } }}
              />
            </Box>
            )
          }}
          renderTags={(selected, getTagProps) =>
            selected.map((option, index) => (
              <MuiChip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                size="small"
                sx={{ height: 24, fontSize: 12 }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} placeholder="Search users…" sx={{ '& input': { fontSize: 13 } }} />
          )}
        />

        {formData.teamMembers.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: '8px',
              mt: 2,
            }}
          >
            {formData.teamMembers.map((member) => {
              const memberColors = getAvatarColor(member.name)
              return (
              <Box
                key={member.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: '10px 12px',
                  border: `1px solid ${tokens.color.neutral[100]}`,
                  borderRadius: '8px',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: memberColors.bg,
                    color: memberColors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(member.name)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{member.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{member.role}</Typography>
                </Box>
                <MuiButton
                  size="small"
                  variant="text"
                  sx={{ minWidth: 0, p: '2px 6px', fontSize: 11, color: 'text.secondary' }}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      teamMembers: prev.teamMembers.filter((m) => m.id !== member.id),
                    }))
                  }
                >
                  ✕
                </MuiButton>
              </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  }

  function renderStepContent() {
    switch (activeStep) {
      case 0: return renderStep1()
      case 1: return renderStep2()
      case 2: return renderStep3()
      case 3: return renderStep4()
      default: return null
    }
  }

  const isLastStep = activeStep === STEPS.length - 1

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
      >
        {/* Title */}
        <DialogTitle
          sx={{
            fontSize: 16,
            fontWeight: 600,
            p: '16px 24px',
            borderBottom: `1px solid ${tokens.color.neutral[100]}`,
            pr: '56px',
          }}
        >
          Create New Project
          <MuiIconButton
            size="small"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 16, top: 14 }}
          >
            <Close fontSize="small" />
          </MuiIconButton>
        </DialogTitle>

        {/* Stepper */}
        <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}` }}>
          <Stepper activeStep={activeStep} alternativeLabel={false}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': { fontSize: 13 },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Content */}
        <DialogContent sx={{ p: 3, minHeight: 380, overflowY: 'auto' }}>
          {renderStepContent()}
        </DialogContent>

        {/* Footer */}
        <DialogActions
          sx={{
            p: '12px 24px',
            borderTop: `1px solid ${tokens.color.neutral[100]}`,
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Back */}
          <Box>
            {activeStep > 0 && (
              <MuiButton
                variant="outlined"
                size="small"
                startIcon={<ArrowBack />}
                onClick={handleBack}
                sx={{ height: 32 }}
              >
                Back
              </MuiButton>
            )}
          </Box>

          {/* Right: Cancel + Next/Save */}
          <Stack direction="row" gap={1}>
            <MuiButton
              variant="text"
              size="small"
              onClick={handleClose}
              sx={{ height: 32 }}
            >
              Cancel
            </MuiButton>
            {isLastStep ? (
              <MuiButton
                variant="contained"
                size="small"
                endIcon={<Check />}
                onClick={handleSubmit}
                disabled={saving}
                sx={{ height: 32 }}
              >
                Save Project
              </MuiButton>
            ) : (
              <MuiButton
                variant="contained"
                size="small"
                endIcon={<ArrowForward />}
                onClick={handleNext}
                sx={{ height: 32 }}
              >
                Next
              </MuiButton>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Confirm close dialog */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600 }}>Discard changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            Are you sure? Your progress will be lost.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <MuiButton size="small" onClick={() => setConfirmClose(false)}>
            Keep editing
          </MuiButton>
          <MuiButton
            size="small"
            variant="contained"
            color="error"
            onClick={() => { setConfirmClose(false); onClose() }}
          >
            Discard
          </MuiButton>
        </DialogActions>
      </Dialog>

    </>
  )
}
