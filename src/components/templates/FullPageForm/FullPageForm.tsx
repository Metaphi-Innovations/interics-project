import type { ReactNode } from 'react'
import { Box, Stack, Divider, CircularProgress, Step, StepLabel, Stepper } from '@mui/material'
import { Typography } from '@mui/material'
import { tokens } from '@/design-system/tokens'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckIcon from '@mui/icons-material/Check'
import { Button, IconButton } from '@/design-system/components'

export interface FullPageFormStep {
  label: string
  description?: string
}

export interface FullPageFormProps {
  // Breadcrumb
  moduleName: string
  moduleHref: string
  actionName: string

  // Header
  title: string
  subtitle?: string

  // Stepper (optional — only for wizard flows)
  steps?: FullPageFormStep[]
  activeStep?: number

  // Content
  children: ReactNode

  // Footer actions
  onCancel: () => void

  // Wizard props (when steps provided)
  onBack?: () => void
  onNext?: () => void
  onSubmit?: () => void
  nextLabel?: string
  backLabel?: string
  submitLabel?: string
  nextLoading?: boolean
  submitLoading?: boolean
  isLastStep?: boolean

  // Simple form props (no steps)
  onSave?: () => void
  saveLabel?: string
  saveLoading?: boolean
}

export function FullPageForm({
  moduleName,
  moduleHref,
  actionName,
  title,
  subtitle,
  steps,
  activeStep = 0,
  children,
  onCancel,
  onBack,
  onNext,
  onSubmit,
  nextLabel = 'Next',
  backLabel = 'Back',
  submitLabel = 'Save',
  nextLoading = false,
  submitLoading = false,
  isLastStep = false,
  onSave,
  saveLabel = 'Save',
  saveLoading = false,
}: FullPageFormProps) {
  const isWizard = Boolean(steps && steps.length > 0)

  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Topbar */}
      <Box
        sx={{
          height: 52,
          backgroundColor: 'background.paper',
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          px: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        {/* Left: breadcrumb */}
        <Stack direction="row" alignItems="center" gap={0.5}>
          <IconButton
            icon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            size="sm"
            onClick={onCancel}
            sx={{ color: tokens.color.neutral[500], p: 0.5 }}
          />
          <Typography
            variant="body2"
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'primary.main',
              cursor: 'pointer',
            }}
            onClick={() => window.location.assign(moduleHref)}
          >
            {moduleName}
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 14, color: tokens.color.neutral[400] }} />
          <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>
            {actionName}
          </Typography>
        </Stack>

        {/* Right: actions */}
        <Stack direction="row" alignItems="center" gap={1}>
          {!isWizard && (
            <Button
              variant="contained"
              color="primary"
              size="sm"
              onClick={onSave}
              endIcon={
                saveLoading ? (
                  <CircularProgress size={12} sx={{ color: 'inherit' }} />
                ) : (
                  <ArrowForwardIcon fontSize="small" />
                )
              }
            >
              {saveLabel}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Stepper */}
      {isWizard && steps && (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
          borderBottomColor: 'divider',
            px: '24px',
            py: '16px',
            flexShrink: 0,
          }}
        >
          <Stepper activeStep={activeStep} alternativeLabel={false}>
            {steps.map((step, index) => {
              const isCompleted = index < activeStep
              const isActive = index === activeStep

              return (
                <Step key={step.label} completed={isCompleted}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: isCompleted
                            ? 'success.main'
                            : isActive
                              ? 'primary.main'
                              : 'action.hover',
                          color: isCompleted || isActive ? 'primary.contrastText' : 'text.disabled',
                          fontSize: '11px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? (
                          <CheckIcon sx={{ fontSize: 14 }} />
                        ) : (
                          index + 1
                        )}
                      </Box>
                    )}
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: '12px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive
                          ? 'text.primary'
                          : isCompleted
                            ? 'text.secondary'
                            : 'text.disabled',
                        mt: '4px !important',
                      },
                    }}
                  >
                    {step.label}
                    {step.description && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: { xs: 'none', lg: 'block' },
                          fontSize: '11px',
                          color: 'text.secondary',
                          lineHeight: 1.3,
                        }}
                      >
                        {step.description}
                      </Typography>
                    )}
                  </StepLabel>
                </Step>
              )
            })}
          </Stepper>
        </Box>
      )}

      {/* Scrollable content area */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: { xs: 2, lg: 3 },
          pb: isWizard ? 3 : 5,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            width: '100%',
            flex: 1,
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Title block */}
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, mb: '4px' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {subtitle}
            </Typography>
          )}
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>

      {/* Footer (wizard only) */}
      {isWizard && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'background.paper',
            borderTop: '1px solid',
            borderTopColor: 'divider',
            px: '24px',
            py: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Left: Back */}
          <Box>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                color="secondary"
                size="sm"
                onClick={onBack}
                startIcon={<ArrowBackIcon fontSize="small" />}
                sx={{ height: 32 }}
              >
                {backLabel}
              </Button>
            )}
          </Box>

          {/* Right: Next/Submit */}
          <Stack direction="row" alignItems="center" gap={1}>
            {isLastStep ? (
              <Button
                variant="contained"
                color="primary"
                size="sm"
                onClick={onSubmit}
                endIcon={
                  submitLoading ? (
                    <CircularProgress size={12} sx={{ color: 'inherit' }} />
                  ) : (
                    <CheckIcon fontSize="small" />
                  )
                }
                sx={{ height: 32, minWidth: 90 }}
              >
                {submitLabel}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="sm"
                onClick={onNext}
                endIcon={
                  nextLoading ? (
                    <CircularProgress size={12} sx={{ color: 'inherit' }} />
                  ) : (
                    <ArrowForwardIcon fontSize="small" />
                  )
                }
                sx={{ height: 32, minWidth: 90 }}
              >
                {nextLabel}
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
