/**
 * Add Category drawer for Project Management (project detail).
 * Shows all Settings → Project Management Master categories as collapsible cards.
 * User expands categories, selects checkpoints, then Save.
 */
import { useEffect, useMemo, useState } from 'react'
import { Box, Collapse, Stack, Typography } from '@mui/material'
import { ChevronDown } from 'lucide-react'
import { DrawerForm } from '@/components/templates/DrawerForm'
import { Button, Checkbox } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import type { ProjectManagementMasterCategory } from '@/slices/settings/reducer'
import type { ProjectManagementCategory } from './projectManagementCheckpoints'

export interface CategoryDrawerSavePayload {
  settingsCategoryId: string
  name: string
  selectedCheckpointIds: string[]
}

interface StagedCategory {
  settingsCategoryId: string
  name: string
  selectedCheckpointIds: string[]
}

interface CategoryDrawerProps {
  open: boolean
  /** Active Project Management Master categories available for selection. */
  categoryOptions: ProjectManagementMasterCategory[]
  /** Categories already configured on this project (seeded into the drawer on open). */
  projectCategories: ProjectManagementCategory[]
  onClose: () => void
  onSave: (payloads: CategoryDrawerSavePayload[]) => void
}

export function CategoryDrawer({
  open,
  categoryOptions,
  projectCategories,
  onClose,
  onSave,
}: CategoryDrawerProps) {
  const [staged, setStaged] = useState<StagedCategory[]>([])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [checkpointsError, setCheckpointsError] = useState<string | undefined>()

  // Seed selections from this project; all categories start collapsed.
  useEffect(() => {
    if (!open) return

    const projectBySettingsId = new Map(
      projectCategories.map((c) => [c.settingsCategoryId, c]),
    )

    setStaged(
      categoryOptions.map((master) => {
        const existing = projectBySettingsId.get(master.id)
        return {
          settingsCategoryId: master.id,
          name: master.name,
          selectedCheckpointIds: existing ? [...existing.selectedCheckpointIds] : [],
        }
      }),
    )
    setExpandedIds([])
    setCheckpointsError(undefined)
    // Only re-seed when the drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const stagedById = useMemo(() => {
    const map = new Map(staged.map((s) => [s.settingsCategoryId, s]))
    return map
  }, [staged])

  function toggleExpanded(categoryId: string) {
    setExpandedIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    )
  }

  function toggleCheckpoint(categoryId: string, checkpointId: string, checked: boolean) {
    setStaged((prev) =>
      prev.map((s) => {
        if (s.settingsCategoryId !== categoryId) return s
        const nextIds = checked
          ? s.selectedCheckpointIds.includes(checkpointId)
            ? s.selectedCheckpointIds
            : [...s.selectedCheckpointIds, checkpointId]
          : s.selectedCheckpointIds.filter((id) => id !== checkpointId)
        return { ...s, selectedCheckpointIds: nextIds }
      }),
    )
    setCheckpointsError(undefined)
  }

  function handleSave() {
    const payloads = staged.filter((s) => s.selectedCheckpointIds.length > 0)
    if (payloads.length === 0) {
      setCheckpointsError('Select at least one checkpoint')
      return
    }

    onSave(payloads)
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Category"
      width={480}
      footer={
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          gap={1}
          sx={{ px: '20px', py: '14px' }}
        >
          <Button
            size="sm"
            variant="outlined"
            color="secondary"
            label="Cancel"
            onClick={onClose}
          />
          <Button
            size="sm"
            variant="contained"
            color="primary"
            label="Save"
            onClick={handleSave}
          />
        </Stack>
      }
    >
      <Stack gap={2}>
        {categoryOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            No categories available. Add categories under Settings → Project Management Master.
          </Typography>
        ) : (
          <Stack gap={1.5}>
            {categoryOptions.map((master) => {
              const isExpanded = expandedIds.includes(master.id)
              const stagedItem = stagedById.get(master.id)
              const selectedIds = stagedItem?.selectedCheckpointIds ?? []
              const selectedCount = selectedIds.length

              return (
                <Box
                  key={master.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpanded(master.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleExpanded(master.id)
                      }
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      userSelect: 'none',
                      '&:hover': {
                        bgcolor: tokens.color.neutral[50],
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}
                      >
                        {master.name}
                      </Typography>
                      {selectedCount > 0 ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 11, flexShrink: 0 }}
                        >
                          {selectedCount} selected
                        </Typography>
                      ) : null}
                    </Stack>
                    <Box
                      sx={{
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        transition: 'transform 0.2s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <ChevronDown size={16} strokeWidth={1.75} />
                    </Box>
                  </Box>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box
                      sx={{
                        px: 2,
                        pb: 1.5,
                        pt: 0.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {master.checkpoints.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: 13, py: 1 }}
                        >
                          No checkpoints are configured for this category. Add them under Settings →
                          Project Management Master.
                        </Typography>
                      ) : (
                        <Stack gap={0.5}>
                          {master.checkpoints.map((cp) => {
                            const checked = selectedIds.includes(cp.id)
                            return (
                              <Checkbox
                                key={cp.id}
                                label={cp.name}
                                checked={checked}
                                onChange={(next) =>
                                  toggleCheckpoint(master.id, cp.id, next)
                                }
                                size="sm"
                                sx={{
                                  '& .MuiFormControlLabel-root': { m: 0 },
                                  '& .MuiFormControlLabel-label': {
                                    fontSize: 13,
                                    fontWeight: checked ? 500 : 400,
                                  },
                                }}
                              />
                            )
                          })}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              )
            })}
          </Stack>
        )}

        {checkpointsError && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
            {checkpointsError}
          </Typography>
        )}
      </Stack>
    </DrawerForm>
  )
}
