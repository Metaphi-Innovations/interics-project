import { useState, useEffect } from 'react'
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
import { Add, Upload, PersonOutline } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomers } from '../../slices/customers/thunk'
import { fetchUsers } from '../../slices/users/thunk'
import { fetchRoles } from '../../slices/roles/thunk'
import { isProjectManagerRole } from './projectManagerRoles'
import { createProject } from '../../slices/projects/thunk'
import type { Customer } from '../../slices/customers/reducer'
import type { User } from '../../slices/users/reducer'
import { FullPageForm, FullPageFormSection } from '../../components/templates/FullPageForm'
import { FormField } from '../../components/templates/DrawerForm'
import { Input, useToast } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { toSlug, getInitials, getAvatarColor } from '../../utils/formatters'
import { alpha } from '@mui/material/styles'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardFormData {
  // Step 1
  customerId: string
  customerName: string
  // Step 2
  requirementFile: File | null
  requirementNotes: string
  // Step 3
  name: string
  location: string
  projectType: string
  carpetArea: string
  headcount: string
  projectManagerId: string
  projectManagerName: string
  startDate: string
  expectedEndDate: string
  // Step 4
  teamMembers: User[]
}

interface StepErrors {
  customerId?: string
  name?: string
  projectType?: string
  projectManagerId?: string
}

// ─── Step 1 — Customer Selection ─────────────────────────────────────────────

function Step1Customer({
  formData,
  setFormData,
  customers,
  loadingCustomers,
  errors,
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
  customers: Customer[]
  loadingCustomers: boolean
  errors: StepErrors
}) {
  const selectedCustomer =
    customers.find((c) => c.id === formData.customerId) ?? null

  return (
    <FullPageFormSection
      title="Select Customer"
      subtitle="Choose an existing client or create a new one"
      columns={1}
    >
      <FormField label="Customer" required error={errors.customerId}>
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
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ gap: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  bgcolor: alpha(getAvatarColor(option.name).bg, 0.15),
                  color: getAvatarColor(option.name).bg,
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
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {option.city}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search by name or GSTIN…"
              error={Boolean(errors.customerId)}
              sx={{ '& input': { fontSize: 13 } }}
            />
          )}
        />
      </FormField>

      <Box>
        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontSize: 11 }}>
            or
          </Typography>
        </Divider>
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
  )
}

// ─── Step 2 — Requirements ────────────────────────────────────────────────────

function Step2Requirements({
  formData,
  setFormData,
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
}) {
  return (
    <FullPageFormSection
      title="Project Requirements"
      subtitle="Upload brief or fill in manually"
      columns={1}
    >
      <FormField
        label="Upload Requirement Document"
        hint="PDF or Word document, max 10MB"
      >
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
      </FormField>

      <FormField label="Requirement Notes">
        <TextField
          multiline
          rows={4}
          fullWidth
          size="small"
          value={formData.requirementNotes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, requirementNotes: e.target.value }))
          }
          placeholder="Describe key requirements, site constraints, design preferences…"
          sx={{ '& textarea': { fontSize: 13 } }}
        />
      </FormField>
    </FullPageFormSection>
  )
}

// ─── Step 3 — Project Setup ───────────────────────────────────────────────────

function Step3ProjectSetup({
  formData,
  setFormData,
  managers,
  getRoleLabel,
  errors,
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
  managers: User[]
  getRoleLabel: (roleId: string) => string
  errors: StepErrors
}) {
  function set(key: keyof WizardFormData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <FullPageFormSection title="Project Details" columns={2}>
      {/* Project Name — spans 2 cols */}
      <Box sx={{ gridColumn: '1 / -1' }}>
        <FormField label="Project Name" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(v) => set('name', v)}
            placeholder="e.g. Acme Corp - Head Office Redesign"
            size="sm"
            error={Boolean(errors.name)}
          />
        </FormField>
      </Box>

      <FormField label="Project Type" required error={errors.projectType}>
        <FormControl fullWidth size="small" error={Boolean(errors.projectType)}>
          <MuiSelect
            value={formData.projectType}
            onChange={(e) => set('projectType', e.target.value)}
            displayEmpty
            sx={{ fontSize: 13 }}
          >
            <MenuItem value="" sx={{ fontSize: 13 }}>Select type…</MenuItem>
            <MenuItem value="Design Only" sx={{ fontSize: 13 }}>Design Only</MenuItem>
            <MenuItem value="Design & Build" sx={{ fontSize: 13 }}>Design & Build</MenuItem>
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

      <FormField label="Headcount">
        <Input
          type="number"
          value={formData.headcount}
          onChange={(v) => set('headcount', v)}
          placeholder="e.g. 120"
          size="sm"
        />
      </FormField>

      <FormField label="Project Manager" required error={errors.projectManagerId}>
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
                  label={getRoleLabel(m.role)}
                  size="small"
                  sx={{ height: 16, fontSize: 10, ml: 'auto', '& .MuiChip-label': { px: '6px' } }}
                />
              </MenuItem>
            ))}
          </MuiSelect>
        </FormControl>
      </FormField>

      <FormField label="Expected Start Date">
        <Input
          type="date"
          value={formData.startDate}
          onChange={(v) => set('startDate', v)}
          size="sm"
        />
      </FormField>

      <FormField label="Expected End Date">
        <Input
          type="date"
          value={formData.expectedEndDate}
          onChange={(v) => set('expectedEndDate', v)}
          size="sm"
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
}: {
  formData: WizardFormData
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>
  allUsers: User[]
}) {
  return (
    <FullPageFormSection
      title="Team Members"
      subtitle="Add team members who will work on this project"
      columns={1}
    >
      <FormField label="Add Team Members">
        <Autocomplete
          multiple
          size="small"
          options={allUsers}
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
                  color: getAvatarColor(option.name).bg,
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
                label={option.role}
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
              placeholder="Search users…"
              sx={{ '& input': { fontSize: 13 } }}
            />
          )}
        />
      </FormField>

      {formData.teamMembers.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: '8px',
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
                  color: getAvatarColor(member.name).bg,
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
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {member.role}
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
  { label: 'Requirements', description: 'Capture brief' },
  { label: 'Project Setup', description: 'Basic details' },
  { label: 'Team', description: 'Assign users' },
]

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

export default function CreateProjectPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const toast = useToast()

  const customers = useAppSelector((s) => s.customers.items)
  const loadingCustomers = useAppSelector((s) => s.customers.loading)
  const users = useAppSelector((s) => s.users.items)
  const roles = useAppSelector((s) => s.roles.items)
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
          />
        )
      case 1:
        return <Step2Requirements formData={formData} setFormData={setFormData} />
      case 2:
        return (
          <Step3ProjectSetup
            formData={formData}
            setFormData={setFormData}
            managers={managers}
            getRoleLabel={getRoleLabel}
            errors={errors}
          />
        )
      case 3:
        return <Step4Team formData={formData} setFormData={setFormData} allUsers={users} />
      default:
        return null
    }
  }

  const stepTitles = [
    'Who is the client?',
    'What are the requirements?',
    'Set up the project',
    'Build the team',
  ]

  const stepSubtitles = [
    'Select the customer this project is for.',
    'Upload any briefing documents or add notes.',
    'Fill in the core project details.',
    'Assign team members who will work on this project.',
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
