import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { DrawerForm, FormSection } from '@/components/templates/DrawerForm'
import { formatAddressLine } from '@/constants/locations'
import { useAppDispatch } from '@/store/hooks'
import { fetchSectors } from '@/slices/settings/thunk'
import type { Project } from '@/slices/projects/reducer'
import {
  ProjectDetailsFields,
  ProjectSetupFields,
  validateProjectSetupForm,
  type ProjectSetupFormErrors,
  type ProjectSetupFormValues,
} from './ProjectSetupFormFields'

const EMPTY_FORM: ProjectSetupFormValues = {
  name: '',
  projectTypes: [],
  sector: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  carpetArea: '',
  headcount: '',
  startDate: '',
  expectedEndDate: '',
  workstations: '',
  cabins: '',
  meetingRooms: '',
  services: '',
  supportFunction: '',
}

function toFormValues(project: Project | null): ProjectSetupFormValues {
  if (!project) return EMPTY_FORM
  return {
    name: project.name ?? '',
    projectTypes: project.projectTypes ?? [],
    sector: project.sector ?? '',
    address: project.address ?? '',
    city: project.city ?? '',
    state: project.state ?? '',
    country: project.country || 'India',
    pincode: project.pincode ?? '',
    carpetArea: project.carpetArea?.toString() ?? '',
    headcount: project.headcount?.toString() ?? '',
    startDate: project.startDate ?? '',
    expectedEndDate: project.expectedEndDate ?? '',
    workstations: project.workstations ?? '',
    cabins: project.cabins ?? '',
    meetingRooms: project.meetingRooms ?? '',
    services: project.services ?? '',
    supportFunction: project.supportFunction ?? '',
  }
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function toProjectPatch(values: ProjectSetupFormValues): Partial<Project> {
  const address = values.address.trim()
  const city = values.city.trim()
  const state = values.state.trim()
  const country = values.country.trim()
  const pincode = values.pincode.trim()
  return {
    name: values.name.trim(),
    projectTypes: values.projectTypes,
    sector: values.sector,
    address: address || null,
    city: city || null,
    state: state || null,
    country: country || null,
    pincode: pincode || null,
    location: formatAddressLine({ address, city, state, pincode, country }),
    carpetArea: parseOptionalNumber(values.carpetArea),
    headcount: parseOptionalNumber(values.headcount),
    startDate: values.startDate || null,
    expectedEndDate: values.expectedEndDate || null,
    workstations: values.workstations.trim() || null,
    cabins: values.cabins.trim() || null,
    meetingRooms: values.meetingRooms.trim() || null,
    services: values.services.trim() || null,
    supportFunction: values.supportFunction.trim() || null,
  }
}

interface EditProjectDrawerProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onSave: (data: Partial<Project>) => void
  saving: boolean
  loading?: boolean
}

export function EditProjectDrawer({
  open,
  project,
  onClose,
  onSave,
  saving,
  loading = false,
}: EditProjectDrawerProps) {
  const dispatch = useAppDispatch()
  const [form, setForm] = useState<ProjectSetupFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<ProjectSetupFormErrors>({})

  useEffect(() => {
    if (open) {
      void dispatch(fetchSectors())
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!open) {
      setErrors({})
      return
    }
    setForm(toFormValues(project))
    setErrors({})
  }, [open, project])

  function handleChange(patch: Partial<ProjectSetupFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }))
    const keys = Object.keys(patch) as (keyof ProjectSetupFormErrors)[]
    if (keys.some((key) => errors[key])) {
      setErrors((prev) => {
        const next = { ...prev }
        for (const key of keys) delete next[key]
        return next
      })
    }
  }

  function handleSubmit() {
    const nextErrors = validateProjectSetupForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave(toProjectPatch(form))
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit Project"
      subtitle={project?.projectCode ? project.projectCode : 'Update project information'}
      onSubmit={handleSubmit}
      submitLoading={saving}
      submitLabel="Save"
      submitDisabled={loading || !project}
      width={640}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          <FormSection title="Project Setup" subtitle="Basic project information" columns={2} divider={false}>
            <ProjectSetupFields values={form} errors={errors} onChange={handleChange} />
          </FormSection>
          <FormSection
            title="Project Details"
            subtitle="Optional space and requirement details"
            columns={2}
            divider={false}
          >
            <ProjectDetailsFields values={form} onChange={handleChange} />
          </FormSection>
        </>
      )}
    </DrawerForm>
  )
}
