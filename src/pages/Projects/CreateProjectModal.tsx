import { useState, useEffect, useMemo, type HTMLAttributes } from 'react'
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
  Add,
  Close,
  ArrowBack,
  ArrowForward,
  Check,
  PersonOutline,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers, createCustomer } from '../../slices/customers/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { fetchRoles } from '../../slices/roles/thunk'
import { isProjectManagerRole } from './projectManagerRoles'
import { ProjectTypesField } from './components/ProjectTypesField'
import { ContactPersonAutocomplete } from './components/ContactPersonAutocomplete'
import { CreateContactPersonModal } from './components/CreateContactPersonModal'
import { createProject } from '../../slices/projects/thunk'
import type { User } from '../../slices/users/reducer'
import { useToast, DatePicker, dateFromIso, isoFromDate } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { toSlug, getInitials, getAvatarColor } from '../../utils/formatters'
import { SECTOR_OPTIONS } from '../../constants/sectors'
import type { Contact, Customer } from '../../slices/customers/reducer'
import {
  PROJECT_SETUP_GRID_SX,
  CUSTOMER_STEP_GRID_SX,
  FORM_CONTROL_INPUT_SX,
  getContactsForCustomer,
  getDefaultContactIds,
  findContactsByIds,
  clientTeamFromContacts,
  buildProjectDocumentsFromForm,
  buildProjectSetupPayload,
  validateProjectSetupFields,
} from './projectCreateHelpers'
import { buildAssignedTeamPayload } from '@/utils/projectAssignedTeam'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardFormData {
  customerId: string
  customerName: string
  contactIds: string[]
  requirementFile: File | null
  requirementNotes: string
  name: string
  location: string
  projectTypes: string[]
  sector: string
  carpetArea: string
  buildValuePerSqft: string
  designFeePerSqft: string
  headcount: string
  workstationSize: string
  meetingRoomCount: string
  serverRoomDetails: string
  upsCapacity: string
  receptionDetails: string
  pantryDetails: string
  projectManagerId: string
  projectManagerName: string
  startDate: string
  expectedEndDate: string
  teamMembers: User[]
  finalLayoutDescription: string
  finalLayoutLink: string
  finalRcpDescription: string
  finalRcpLink: string
  finalViewsDescription: string
  finalViewsLink: string
  finalPhotographsDescription: string
  finalPhotographsLink: string
  finalHandoverDescription: string
  finalHandoverLink: string
  finalLayoutFile: File | null
  finalRcpFile: File | null
  finalViewsFile: File | null
  finalPhotographsFile: File | null
  finalHandoverFiles: File[]
}

interface StepErrors {
  customerId?: string
  contactId?: string
  name?: string
  projectTypes?: string
  sector?: string
  projectManagerId?: string
  headcount?: string
  meetingRoomCount?: string
}

const STEPS = ['Customer', 'Project Setup', 'Team']

const INITIAL_FORM: WizardFormData = {
  customerId: '',
  customerName: '',
  contactIds: [],
  requirementFile: null,
  requirementNotes: '',
  name: '',
  location: '',
  projectTypes: [],
  sector: '',
  carpetArea: '',
  buildValuePerSqft: '',
  designFeePerSqft: '',
  headcount: '',
  workstationSize: '',
  meetingRoomCount: '',
  serverRoomDetails: '',
  upsCapacity: '',
  receptionDetails: '',
  pantryDetails: '',
  projectManagerId: '',
  projectManagerName: '',
  startDate: '',
  expectedEndDate: '',
  teamMembers: [],
  finalLayoutDescription: '',
  finalLayoutLink: '',
  finalRcpDescription: '',
  finalRcpLink: '',
  finalViewsDescription: '',
  finalViewsLink: '',
  finalPhotographsDescription: '',
  finalPhotographsLink: '',
  finalHandoverDescription: '',
  finalHandoverLink: '',
  finalLayoutFile: null,
  finalRcpFile: null,
  finalViewsFile: null,
  finalPhotographsFile: null,
  finalHandoverFiles: [],
}

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()

  const customers = useAppSelector((s) => s.customers.items ?? [])
  const loadingCustomers = useAppSelector((s) => s.customers.loading)
  const users = useAppSelector((s) => s.users.items ?? [])
  const roles = useAppSelector((s) => s.roles.items ?? [])
  const saving = useAppSelector((s) => s.projects.saving)

  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<StepErrors>({})
  const [confirmClose, setConfirmClose] = useState(false)
  const [showInlineCustomer, setShowInlineCustomer] = useState(false)
  const [createContactOpen, setCreateContactOpen] = useState(false)
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
      dispatch(fetchUsers({}))
      dispatch(fetchRoles(undefined))
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!open) {
      setActiveStep(0)
      setFormData(INITIAL_FORM)
      setErrors({})
      setConfirmClose(false)
      setCreateContactOpen(false)
    }
  }, [open])

  const managers = users.filter((u) => isProjectManagerRole(u.role))

  function getRoleLabel(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name ?? roleId
  }

  function validateStep(step: number): boolean {
    const newErrors: StepErrors = {}
    if (step === 0) {
      if (!formData.customerId) newErrors.customerId = 'Please select a customer'
      if (formData.contactIds.length === 0) {
        newErrors.contactId = 'Please select at least one contact person'
      }
    }
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Project name is required'
      if (formData.projectTypes.length === 0) {
        newErrors.projectTypes = 'Select at least one project type'
      }
      if (!formData.sector) newErrors.sector = 'Sector is required'
      Object.assign(newErrors, validateProjectSetupFields(formData))
    }
    if (step === 2 && !formData.projectManagerId) {
      newErrors.projectManagerId = 'Project lead is required'
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

    const selectedContacts = findContactsByIds(selectedCustomer, formData.contactIds)
    const payload = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      name: formData.name,
      location: formData.location,
      projectTypes: formData.projectTypes,
      sector: formData.sector,
      carpetArea: formData.carpetArea ? Number(formData.carpetArea) : null,
      buildValuePerSqft: formData.buildValuePerSqft ? Number(formData.buildValuePerSqft) : null,
      designFeePerSqft: formData.designFeePerSqft ? Number(formData.designFeePerSqft) : null,
      ...buildProjectSetupPayload(formData),
      clientTeam: clientTeamFromContacts(selectedContacts, formData.customerName),
      projectManagerId: formData.projectManagerId,
      projectManager: formData.projectManagerName,
      assignedTeam: buildAssignedTeamPayload(
        formData.projectManagerId,
        formData.projectManagerName,
        formData.teamMembers,
        getRoleLabel,
      ),
      startDate: formData.startDate || null,
      expectedEndDate: formData.expectedEndDate || null,
      status: 'Pitch' as const,
      progress: 'Quotation pending',
      projectValue: 0,
      totalClientPOValue: 0,
      totalVendorPOValue: 0,
      invoicedAmount: 0,
      paidVendorAmount: 0,
      projectDocuments: buildProjectDocumentsFromForm(formData),
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
      const contacts = getContactsForCustomer(result)
      setFormData((prev) => ({
        ...prev,
        customerId: result.id,
        customerName: result.name,
        contactIds: getDefaultContactIds(contacts),
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

  function handleContactSaved(contact: Contact) {
    setFormData((prev) => ({
      ...prev,
      contactIds: [...new Set([...prev.contactIds, contact.id])],
    }))
    if (errors.contactId) setErrors((er) => ({ ...er, contactId: undefined }))
  }

  const selectedCustomer = customers.find((c) => c.id === formData.customerId) ?? null
  const customerContacts = useMemo(
    () => getContactsForCustomer(selectedCustomer),
    [selectedCustomer],
  )

  const selectedContacts = useMemo(
    () => customerContacts.filter((c) => formData.contactIds.includes(c.id)),
    [customerContacts, formData.contactIds],
  )

  function filterCustomers(options: Customer[], { inputValue }: { inputValue: string }) {
    const q = inputValue.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q),
    )
  }

  function renderCustomerOption(props: HTMLAttributes<HTMLLIElement>, option: Customer) {
    const colors = getAvatarColor(option.name)
    return (
      <Box component="li" {...props} sx={{ gap: 1, alignItems: 'flex-start !important', py: '8px !important' }}>
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
            mt: '2px',
          }}
        >
          {getInitials(option.name)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{option.name}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.35 }}>
            {option.contactPerson}
          </Typography>
        </Box>
      </Box>
    )
  }

  // ─── Step 1: Customer ──────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: 'text.secondary', fontSize: 12 }}>
          Select Customer
        </Typography>

        <Box sx={{ ...CUSTOMER_STEP_GRID_SX, mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
              Customer <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <Autocomplete
              fullWidth
              size="small"
              loading={loadingCustomers}
              options={customers}
              filterOptions={filterCustomers}
              getOptionLabel={(c) => c.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={selectedCustomer}
              onChange={(_, val) => {
                const contacts = getContactsForCustomer(val)
                setFormData((prev) => ({
                  ...prev,
                  customerId: val?.id ?? '',
                  customerName: val?.name ?? '',
                  contactIds: getDefaultContactIds(contacts),
                }))
                if (errors.customerId) setErrors((e) => ({ ...e, customerId: undefined }))
                if (errors.contactId) setErrors((e) => ({ ...e, contactId: undefined }))
              }}
              renderOption={renderCustomerOption}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  placeholder="Search by name…"
                  error={Boolean(errors.customerId)}
                  helperText={errors.customerId}
                  sx={FORM_CONTROL_INPUT_SX}
                />
              )}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
              Contact Person <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <ContactPersonAutocomplete
              contacts={formData.customerId ? customerContacts : []}
              value={formData.customerId ? selectedContacts : []}
              error={errors.contactId}
              placeholder={
                formData.customerId ? 'Search contacts…' : 'Select a customer first…'
              }
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, contactIds: val.map((c) => c.id) }))
                if (errors.contactId) setErrors((er) => ({ ...er, contactId: undefined }))
              }}
              onCreateClick={
                formData.customerId ? () => setCreateContactOpen(true) : undefined
              }
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <MuiButton
          variant="outlined"
          size="small"
          color={showInlineCustomer ? 'error' : 'primary'}
          sx={{ fontSize: 13 }}
          startIcon={showInlineCustomer ? undefined : <Add sx={{ fontSize: 18 }} />}
          onClick={() => setShowInlineCustomer(!showInlineCustomer)}
        >
          {showInlineCustomer ? 'Cancel' : 'Create New Customer'}
        </MuiButton>

        <Collapse in={showInlineCustomer}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              bgcolor: 'background.default',
              boxShadow: tokens.shadow.sm,
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

  // ─── Step 3: Project Setup ─────────────────────────────────────────────────

  function renderStep3() {
    return (
      <Box>
      <Box sx={PROJECT_SETUP_GRID_SX}>
        {/* Row 1: Project Name | Project Type */}
        <Box sx={{ minWidth: 0 }}>
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
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Project Type <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <ProjectTypesField
            value={formData.projectTypes}
            onChange={(v) => setFormData((prev) => ({ ...prev, projectTypes: v }))}
            error={Boolean(errors.projectTypes)}
          />
          {errors.projectTypes && (
            <Typography variant="caption" color="error" sx={{ mt: '3px', display: 'block', fontSize: 11 }}>
              {errors.projectTypes}
            </Typography>
          )}
        </Box>

        {/* Row 2: Sector | Location */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Sector <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <FormControl fullWidth size="small" error={Boolean(errors.sector)}>
            <MuiSelect
              value={formData.sector}
              onChange={(e) => setFormData((prev) => ({ ...prev, sector: e.target.value }))}
              displayEmpty
              sx={{ fontSize: 13, '& .MuiOutlinedInput-root': { minHeight: 40 } }}
            >
              <MenuItem value="" disabled sx={{ fontSize: 13 }}>
                Select sector…
              </MenuItem>
              {SECTOR_OPTIONS.map((s) => (
                <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>
                  {s}
                </MenuItem>
              ))}
            </MuiSelect>
            {errors.sector && (
              <Typography variant="caption" color="error" sx={{ mt: '3px', mx: '14px', fontSize: 11 }}>
                {errors.sector}
              </Typography>
            )}
          </FormControl>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Location
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.location}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Building, City"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        {/* Row 3: Carpet Area | Headcount */}
        <Box sx={{ minWidth: 0 }}>
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
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
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
            error={Boolean(errors.headcount)}
            helperText={errors.headcount}
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        {/* Row 4: Workstation Size | Meeting Room Count */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Workstation Size
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.workstationSize}
            onChange={(e) => setFormData((prev) => ({ ...prev, workstationSize: e.target.value }))}
            placeholder="e.g. 1200 sq ft"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Meeting Room Count
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={formData.meetingRoomCount}
            onChange={(e) => setFormData((prev) => ({ ...prev, meetingRoomCount: e.target.value }))}
            placeholder="e.g. 4"
            error={Boolean(errors.meetingRoomCount)}
            helperText={errors.meetingRoomCount}
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        {/* Row 5: Server Room Details | UPS Capacity */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Server Room Details
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.serverRoomDetails}
            onChange={(e) => setFormData((prev) => ({ ...prev, serverRoomDetails: e.target.value }))}
            placeholder="e.g. 200 sq ft, raised floor"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            UPS Capacity
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.upsCapacity}
            onChange={(e) => setFormData((prev) => ({ ...prev, upsCapacity: e.target.value }))}
            placeholder="e.g. 20 KVA"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        {/* Row 6: Reception Details | Pantry Details */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Reception Details
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.receptionDetails}
            onChange={(e) => setFormData((prev) => ({ ...prev, receptionDetails: e.target.value }))}
            placeholder="e.g. Open reception with waiting lounge"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Pantry Details
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={formData.pantryDetails}
            onChange={(e) => setFormData((prev) => ({ ...prev, pantryDetails: e.target.value }))}
            placeholder="e.g. 2 pantries with wet and dry zones"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        {/* Row 7: Expected Start Date | Expected End Date */}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Expected Start Date
          </Typography>
          <DatePicker
            value={dateFromIso(formData.startDate)}
            onChange={(d) => setFormData((prev) => ({ ...prev, startDate: isoFromDate(d) }))}
            fullWidth
            size="sm"
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Expected End Date
          </Typography>
          <DatePicker
            value={dateFromIso(formData.expectedEndDate)}
            onChange={(d) => setFormData((prev) => ({ ...prev, expectedEndDate: isoFromDate(d) }))}
            fullWidth
            size="sm"
            minDate={dateFromIso(formData.startDate) ?? undefined}
            sx={FORM_CONTROL_INPUT_SX}
          />
        </Box>
      </Box>
      </Box>
    )
  }

  // ─── Step 4: Team ──────────────────────────────────────────────────────────

  function renderStep4() {
    const teamOptions = users.filter((u) => u.id !== formData.projectManagerId)

    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: '4px', fontSize: 12 }}>
            Project Lead <Box component="span" sx={{ color: 'error.main' }}>*</Box>
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
                  teamMembers: prev.teamMembers.filter((m) => m.id !== e.target.value),
                }))
                if (errors.projectManagerId) {
                  setErrors((er) => ({ ...er, projectManagerId: undefined }))
                }
              }}
              displayEmpty
              sx={{ fontSize: 13 }}
              renderValue={(val) => {
                if (!val) {
                  return (
                    <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                      Select project lead…
                    </Typography>
                  )
                }
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
              <MenuItem value="" sx={{ fontSize: 13 }}>
                Select project lead…
              </MenuItem>
              {managers.map((m) => (
                <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13, gap: 1 }}>
                  <PersonOutline sx={{ fontSize: 14 }} />
                  {m.name}
                  <MuiChip
                    label={getRoleLabel(m.role)}
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

        <Typography variant="body2" fontWeight={600} sx={{ mb: 2, color: 'text.secondary', fontSize: 12 }}>
          Assign Team Members
        </Typography>

        <Autocomplete
          multiple
          size="small"
          options={teamOptions}
          getOptionLabel={(u) => u.name}
          value={formData.teamMembers}
          onChange={(_, val) => setFormData((prev) => ({ ...prev, teamMembers: val }))}
          disabled={!formData.projectManagerId}
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
                label={getRoleLabel(option.role)}
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
            <TextField
              {...params}
              placeholder={
                formData.projectManagerId ? 'Search users…' : 'Select a project lead first…'
              }
              sx={{ '& input': { fontSize: 13 } }}
            />
          )}
        />

        {formData.teamMembers.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
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
      case 1: return renderStep3()
      case 2: return renderStep4()
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

      <CreateContactPersonModal
        open={createContactOpen}
        onClose={() => setCreateContactOpen(false)}
        customerId={formData.customerId}
        existingCustomerContacts={getContactsForCustomer(selectedCustomer)}
        onSaved={handleContactSaved}
      />

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
