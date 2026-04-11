import { useState } from 'react'
import { TextField, MenuItem } from '@mui/material'
import { FullPageForm, FullPageFormSection, FormField } from '../../components/templates'

const steps = [
  { label: 'Customer', description: 'Select client' },
  { label: 'Requirements', description: 'Capture brief' },
  { label: 'Project Setup', description: 'Basic details' },
  { label: 'Team', description: 'Assign users' },
]

export default function FullPageFormDemo() {
  const [activeStep, setActiveStep] = useState(0)

  return (
    <FullPageForm
      moduleName="Projects"
      moduleHref="/projects"
      actionName="Create Project"
      title={steps[activeStep].label}
      subtitle={steps[activeStep].description}
      steps={steps}
      activeStep={activeStep}
      onCancel={() => window.history.back()}
      onBack={() => setActiveStep(s => Math.max(0, s - 1))}
      onNext={() => setActiveStep(s => Math.min(steps.length - 1, s + 1))}
      onSubmit={() => {}}
      isLastStep={activeStep === steps.length - 1}
    >
      {activeStep === 0 && (
        <FullPageFormSection
          title="Select Customer"
          subtitle="Choose an existing customer or create new"
          columns={1}
        >
          <FormField label="Customer" required>
            <TextField fullWidth size="small" select defaultValue="">
              <MenuItem value="c-001">TechHub Systems Pvt Ltd</MenuItem>
              <MenuItem value="c-002">Mr. Arun Sharma</MenuItem>
            </TextField>
          </FormField>
        </FullPageFormSection>
      )}

      {activeStep === 1 && (
        <FullPageFormSection title="Requirement Details" columns={1}>
          <FormField label="Upload Requirement Document">
            <TextField fullWidth size="small" placeholder="Browse file..." />
          </FormField>
          <FormField label="Notes">
            <TextField
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="Key requirements..."
            />
          </FormField>
        </FullPageFormSection>
      )}

      {activeStep === 2 && (
        <FullPageFormSection title="Project Details" columns={2}>
          <FormField label="Project Name" required>
            <TextField fullWidth size="small" placeholder="e.g. Acme Corp - HO Redesign" />
          </FormField>
          <FormField label="Project Type" required>
            <TextField fullWidth size="small" select defaultValue="">
              <MenuItem value="design">Design Only</MenuItem>
              <MenuItem value="build">Design &amp; Build</MenuItem>
            </TextField>
          </FormField>
          <FormField label="Location">
            <TextField fullWidth size="small" placeholder="City, Building" />
          </FormField>
          <FormField label="Project Manager" required>
            <TextField fullWidth size="small" select defaultValue="">
              <MenuItem value="u-003">Rahul Sharma</MenuItem>
            </TextField>
          </FormField>
        </FullPageFormSection>
      )}

      {activeStep === 3 && (
        <FullPageFormSection title="Assign Team Members" columns={1}>
          <FormField label="Team Members">
            <TextField fullWidth size="small" placeholder="Search and add users..." />
          </FormField>
        </FullPageFormSection>
      )}
    </FullPageForm>
  )
}
