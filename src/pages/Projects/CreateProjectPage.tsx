import { useState, useEffect, useMemo, type HTMLAttributes } from 'react'
import {
  Box,
  Stack,
  Typography,
  Autocomplete,
  TextField,
  Chip as MuiChip,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  Button as MuiButton,
  Divider,
} from '@mui/material'
import { Add, PersonOutline } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers } from '../../slices/customers/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { fetchRoles } from '../../slices/roles/thunk'
import { isProjectManagerRole } from './projectManagerRoles'
import { ProjectTypesField } from './components/ProjectTypesField'
import { ContactPersonAutocomplete } from './components/ContactPersonAutocomplete'
import { CreateContactPersonModal } from './components/CreateContactPersonModal'
import { createProject } from '../../slices/projects/thunk'
import type { Contact, Customer } from '../../slices/customers/reducer'
import type { User } from '../../slices/users/reducer'
import { FullPageForm, FullPageFormSection } from '../../components/templates/FullPageForm'
import { FormField } from '../../components/templates/DrawerForm'
import { Input, useToast, DatePicker, dateFromIso, isoFromDate } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { toSlug, getInitials, getAvatarColor } from '../../utils/formatters'
import { alpha } from '@mui/material/styles'
import { SECTOR_OPTIONS } from '../../constants/sectors'
import {
  getContactsForCustomer,
  getDefaultContactIds,
  findContactsByIds,
  clientTeamFromContacts,
  buildProjectDocumentsFromForm,
  buildProjectSetupPayload,
  validateProjectSetupFields,
  FORM_CONTROL_INPUT_SX,
} from './projectCreateHelpers'
import { buildAssignedTeamPayload } from '@/utils/projectAssignedTeam'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardFormData {
  // Step 1
  customerId: string
  customerName: string
  contactIds: string[]
  // Step 2
  requirementFile: File | null
  requirementNotes: string
  // Step 3
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
  // Step 4
  teamMembers: User[]
  // Step 5
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

// ─── Step 1 — Customer Selection ─────────────────────────────────────────────

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
          bgcolor: alpha(colors.bg, 0.15),
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

function Step1Customer({
  formData,
  setFormData,
  customers,
  loadingCustomers,
  errors,
  setErrors,
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
  customers: Customer[]
  loadingCustomers: boolean
  errors: StepErrors
  setErrors: React.Dispatch<React.SetStateAction<StepErrors>>
}) {
  const [createContactOpen, setCreateContactOpen] = useState(false)
  const selectedCustomer =
    customers.find((c) => c.id === formData.customerId) ?? null
  const customerContacts = useMemo(
    () => getContactsForCustomer(selectedCustomer),
    [selectedCustomer],
  )
  const selectedContacts = useMemo(
    () => customerContacts.filter((c) => formData.contactIds.includes(c.id)),
    [customerContacts, formData.contactIds],
  )

  function handleContactSaved(contact: Contact) {
    setFormData((prev) => ({
      ...prev,
      contactIds: [...new Set([...prev.contactIds, contact.id])],
    }))
    setErrors((prev) => ({ ...prev, contactId: undefined }))
  }

  return (
    <>
    <FullPageFormSection
      title="Select Customer"
      subtitle="Choose an existing client and contact persons"
      columns={2}
    >
      <FormField label="Customer" required error={errors.customerId}>
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
          }}
          renderOption={renderCustomerOption}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              placeholder="Search by name…"
              error={Boolean(errors.customerId)}
              sx={FORM_CONTROL_INPUT_SX}
            />
          )}
        />
      </FormField>

      <FormField label="Contact Person" required error={errors.contactId}>
        <ContactPersonAutocomplete
          contacts={formData.customerId ? customerContacts : []}
          value={formData.customerId ? selectedContacts : []}
          error={errors.contactId}
          placeholder={
            formData.customerId ? 'Search contacts…' : 'Select a customer first…'
          }
          onChange={(val) => {
            setFormData((prev) => ({ ...prev, contactIds: val.map((c) => c.id) }))
            setErrors((prev) => ({ ...prev, contactId: undefined }))
          }}
          onCreateClick={
            formData.customerId ? () => setCreateContactOpen(true) : undefined
          }
        />
      </FormField>

      <Box sx={{ gridColumn: '1 / -1' }}>
        <Divider sx={{ my: 2 }} />
        <MuiButton
          variant="outlined"
          size="small"
          startIcon={<Add />}
          sx={{ fontSize: 13 }}
        >
          Create New Customer
        </MuiButton>
      </Box>
    </FullPageFormSection>

    <CreateContactPersonModal
      open={createContactOpen}
      onClose={() => setCreateContactOpen(false)}
      customerId={formData.customerId}
      existingCustomerContacts={getContactsForCustomer(selectedCustomer)}
      onSaved={handleContactSaved}
    />
    </>
  )
}

// ─── Step 3 — Project Setup ───────────────────────────────────────────────────

function Step3ProjectSetup({
  formData,
  setFormData,
  errors,
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
  errors: StepErrors
}) {
  function set(key: keyof WizardFormData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <FullPageFormSection title="Project Details" columns={2}>
      <FormField label="Project Name" required error={errors.name}>
        <Input
          value={formData.name}
          onChange={(v) => set('name', v)}
          placeholder="e.g. Acme Corp - Head Office Redesign"
          size="sm"
          error={Boolean(errors.name)}
        />
      </FormField>

      <FormField label="Project Type" required error={errors.projectTypes}>
        <ProjectTypesField
          value={formData.projectTypes}
          onChange={(v) => setFormData((prev) => ({ ...prev, projectTypes: v }))}
          error={Boolean(errors.projectTypes)}
        />
      </FormField>

      <FormField label="Sector" required error={errors.sector}>
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
        </FormControl>
      </FormField>

      <FormField label="Location">
        <Input
          value={formData.location}
          onChange={(v) => set('location', v)}
          placeholder="Building, City"
          size="sm"
        />
      </FormField>

      <FormField label="Carpet Area (sq ft)">
        <Input
          type="number"
          value={formData.carpetArea}
          onChange={(v) => set('carpetArea', v)}
          placeholder="e.g. 4500"
          size="sm"
        />
      </FormField>

      <FormField label="Headcount" error={errors.headcount}>
        <Input
          type="number"
          value={formData.headcount}
          onChange={(v) => set('headcount', v)}
          placeholder="e.g. 120"
          size="sm"
          error={Boolean(errors.headcount)}
        />
      </FormField>

      <FormField label="Workstation Size">
        <Input
          value={formData.workstationSize}
          onChange={(v) => set('workstationSize', v)}
          placeholder="e.g. 1200 sq ft"
          size="sm"
        />
      </FormField>

      <FormField label="Meeting Room Count" error={errors.meetingRoomCount}>
        <Input
          type="number"
          value={formData.meetingRoomCount}
          onChange={(v) => set('meetingRoomCount', v)}
          placeholder="e.g. 4"
          size="sm"
          error={Boolean(errors.meetingRoomCount)}
        />
      </FormField>

      <FormField label="Server Room Details">
        <Input
          value={formData.serverRoomDetails}
          onChange={(v) => set('serverRoomDetails', v)}
          placeholder="e.g. 200 sq ft, raised floor"
          size="sm"
        />
      </FormField>

      <FormField label="UPS Capacity">
        <Input
          value={formData.upsCapacity}
          onChange={(v) => set('upsCapacity', v)}
          placeholder="e.g. 20 KVA"
          size="sm"
        />
      </FormField>

      <FormField label="Reception Details">
        <Input
          value={formData.receptionDetails}
          onChange={(v) => set('receptionDetails', v)}
          placeholder="e.g. Open reception with waiting lounge"
          size="sm"
        />
      </FormField>

      <FormField label="Pantry Details">
        <Input
          value={formData.pantryDetails}
          onChange={(v) => set('pantryDetails', v)}
          placeholder="e.g. 2 pantries with wet and dry zones"
          size="sm"
        />
      </FormField>

      <FormField label="Expected Start Date">
        <DatePicker
          value={dateFromIso(formData.startDate)}
          onChange={(d) => set('startDate', isoFromDate(d))}
          fullWidth
          size="sm"
        />
      </FormField>

      <FormField label="Expected End Date">
        <DatePicker
          value={dateFromIso(formData.expectedEndDate)}
          onChange={(d) => set('expectedEndDate', isoFromDate(d))}
          fullWidth
          size="sm"
          minDate={dateFromIso(formData.startDate) ?? undefined}
        />
      </FormField>
    </FullPageFormSection>
  )
}

// ─── Step 4 — Assign Team ─────────────────────────────────────────────────────

function Step4Team({
  formData,
  setFormData,
  allUsers,
  managers,
  getRoleLabel,
  errors,
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
  allUsers: User[]
  managers: User[]
  getRoleLabel: (roleId: string) => string
  errors: StepErrors
}) {
  const teamOptions = allUsers.filter((u) => u.id !== formData.projectManagerId)

  return (
    <FullPageFormSection
      title="Team"
      subtitle="Select a project lead, then assign additional team members"
      columns={1}
    >
      <FormField label="Project Lead" required error={errors.projectManagerId}>
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
        </FormControl>
      </FormField>

      <FormField label="Add Team Members">
        <Autocomplete
          multiple
          size="small"
          options={teamOptions}
          disabled={!formData.projectManagerId}
          getOptionLabel={(u) => u.name}
          value={formData.teamMembers}
          onChange={(_, val) =>
            setFormData((prev) => ({ ...prev, teamMembers: val }))
          }
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ gap: 1 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: alpha(getAvatarColor(option.name).bg, 0.15),
                  color: getAvatarColor(option.name).text,
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
              </Box>
              <MuiChip
                label={getRoleLabel(option.role)}
                size="small"
                sx={{ height: 16, fontSize: 10, ml: 'auto', '& .MuiChip-label': { px: '6px' } }}
              />
            </Box>
          )}
          renderTags={(selected, getTagProps) =>
            selected.map((option, index) => (
              <MuiChip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                size="small"
                avatar={
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      bgcolor: alpha(getAvatarColor(option.name).bg, 0.25),
                      color: getAvatarColor(option.name).bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(option.name)}
                  </Box>
                }
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
      </FormField>

      {formData.teamMembers.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {formData.teamMembers.map((member) => (
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
                  bgcolor: alpha(getAvatarColor(member.name).bg, 0.15),
                  color: getAvatarColor(member.name).text,
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
                <Typography
                  sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
                >
                  {member.name}
                </Typography>
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
          ))}
        </Box>
      )}
    </FullPageFormSection>
  )
}

// ─── CreateProjectPage ────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Customer', description: 'Select client' },
  { label: 'Project Setup', description: 'Basic details' },
  { label: 'Team', description: 'Assign users' },
]

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

export default function CreateProjectPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const toast = useToast()

  const customers = useAppSelector((s) => s.customers.items ?? [])
  const loadingCustomers = useAppSelector((s) => s.customers.loading)
  const users = useAppSelector((s) => s.users.items ?? [])
  const roles = useAppSelector((s) => s.roles.items ?? [])
  const saving = useAppSelector((s) => s.projects.saving)

  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<StepErrors>({})

  useEffect(() => {
    dispatch(fetchCustomers({}))
    dispatch(fetchUsers({}))
    dispatch(fetchRoles(undefined))
  }, [dispatch])

  const managers = users.filter((u) => isProjectManagerRole(u.role))

  function getRoleLabel(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name ?? roleId
  }

  // ── Validation ────────────────────────────────────────────────────────────

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
    if (validateStep(activeStep)) {
      setActiveStep((s) => s + 1)
    }
  }

  function handleBack() {
    setActiveStep((s) => s - 1)
    setErrors({})
  }

  async function handleSubmit() {
    if (!validateStep(activeStep)) return

    const customer = customers.find((c) => c.id === formData.customerId) ?? null
    const selectedContacts = findContactsByIds(customer, formData.contactIds)
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
      toast.success('Project created successfully')
      navigate(`/projects/${toSlug(result.name)}`)
    } catch {
      toast.error('Failed to create project')
    }
  }

  // ── Render step content ───────────────────────────────────────────────────

  function renderStep() {
    switch (activeStep) {
      case 0:
        return (
          <Step1Customer
            formData={formData}
            setFormData={setFormData}
            customers={customers}
            loadingCustomers={loadingCustomers}
            errors={errors}
            setErrors={setErrors}
          />
        )
      case 1:
        return (
          <Step3ProjectSetup
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />
        )
      case 2:
        return (
          <Step4Team
            formData={formData}
            setFormData={setFormData}
            allUsers={users}
            managers={managers}
            getRoleLabel={getRoleLabel}
            errors={errors}
          />
        )
      default:
        return null
    }
  }

  const stepTitles = [
    'Who is the client?',
    'Set up the project',
    'Build the team',
  ]

  const stepSubtitles = [
    'Select the customer and one or more contact persons for this project.',
    'Fill in the core project details.',
    'Choose a project lead, then add team members who will work on this project.',
  ]

  return (
    <FullPageForm
      moduleName="Projects"
      moduleHref="/projects"
      actionName="Create Project"
      title={stepTitles[activeStep]}
      subtitle={stepSubtitles[activeStep]}
      steps={STEPS}
      activeStep={activeStep}
      onCancel={() => navigate('/projects')}
      onBack={handleBack}
      onNext={handleNext}
      onSubmit={handleSubmit}
      isLastStep={activeStep === STEPS.length - 1}
      submitLoading={saving}
      submitLabel="Create Project"
    >
      {renderStep()}
    </FullPageForm>
  )
}
