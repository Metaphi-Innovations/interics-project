/**
 * Settings → Project Management Master
 * Admin manages reusable categories and checkpoints (not project-specific).
 */
import { useEffect, useState } from 'react'
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete as DeleteIcon, Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { Plus } from 'lucide-react'
import { Button, StatusBadge, useToast } from '@/design-system/components'
import { DrawerForm, FormField } from '@/components/templates/DrawerForm'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  createProjectManagementCategory,
  fetchProjectManagementCategories,
  toggleProjectManagementCategoryStatus,
  updateProjectManagementCategory,
} from '@/slices/settings/thunk'
import type {
  ProjectManagementCheckpoint,
  ProjectManagementMasterCategory,
} from '@/slices/settings/reducer'
import {
  SETTINGS_TABLE_CELL_ACTION_SX,
  SETTINGS_TABLE_CELL_SX,
  SETTINGS_TABLE_HEADER_ACTION_SX,
  SETTINGS_TABLE_HEADER_CELL_SX,
  SETTINGS_TABLE_SX,
  settingsDataColWidth,
} from '../components/settingsTableStyles'

const DATA_COL_COUNT = 3
const dataColWidth = settingsDataColWidth(DATA_COL_COUNT)

type CheckpointDraft = { key: string; id?: string; name: string }

type CategoryForm = {
  name: string
  checkpoints: CheckpointDraft[]
}

function newCheckpointDraft(name = ''): CheckpointDraft {
  return { key: crypto.randomUUID(), name }
}

const defaultForm = (): CategoryForm => ({
  name: '',
  checkpoints: [newCheckpointDraft()],
})

export default function ProjectManagementMasterSection() {
  const dispatch = useAppDispatch()
  const success = useToast((s) => s.success)
  const error = useToast((s) => s.error)
  const { projectManagementCategories, saving } = useAppSelector((s) => s.settings)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<ProjectManagementMasterCategory | null>(null)
  const [form, setForm] = useState<CategoryForm>(defaultForm)
  const [nameError, setNameError] = useState<string | undefined>()

  useEffect(() => {
    void dispatch(fetchProjectManagementCategories())
  }, [dispatch])

  function openAdd() {
    setEditingRow(null)
    setForm(defaultForm())
    setNameError(undefined)
    setDrawerOpen(true)
  }

  function openEdit(row: ProjectManagementMasterCategory) {
    setEditingRow(row)
    setForm({
      name: row.name,
      checkpoints:
        row.checkpoints.length > 0
          ? row.checkpoints.map((cp) => ({
              key: cp.id,
              id: cp.id,
              name: cp.name,
            }))
          : [newCheckpointDraft()],
    })
    setNameError(undefined)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingRow(null)
  }

  function updateCheckpoint(key: string, name: string) {
    setForm((prev) => ({
      ...prev,
      checkpoints: prev.checkpoints.map((cp) => (cp.key === key ? { ...cp, name } : cp)),
    }))
  }

  function removeCheckpoint(key: string) {
    setForm((prev) => {
      const next = prev.checkpoints.filter((cp) => cp.key !== key)
      return {
        ...prev,
        checkpoints: next.length > 0 ? next : [newCheckpointDraft()],
      }
    })
  }

  function addCheckpoint() {
    setForm((prev) => ({
      ...prev,
      checkpoints: [...prev.checkpoints, newCheckpointDraft()],
    }))
  }

  function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setNameError('Category name is required')
      return
    }

    const checkpoints: ProjectManagementCheckpoint[] = form.checkpoints
      .map((cp) => ({
        id: cp.id ?? crypto.randomUUID(),
        name: cp.name.trim(),
      }))
      .filter((cp) => cp.name.length > 0)

    if (checkpoints.length === 0) {
      error('Add at least one checkpoint')
      return
    }

    const payload = {
      name: trimmedName,
      checkpoints,
      status: editingRow?.status ?? ('active' as const),
    }

    const action = editingRow
      ? dispatch(updateProjectManagementCategory({ id: editingRow.id, ...payload }))
      : dispatch(createProjectManagementCategory(payload))

    action
      .unwrap()
      .then(() => {
        closeDrawer()
        success(editingRow ? 'Category updated' : 'Category added')
      })
      .catch(() => error('Failed to save category'))
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Project Management Master
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reusable categories and checkpoints for project tracking
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="sm"
          startIcon={<Plus size={14} strokeWidth={2} />}
          onClick={openAdd}
        >
          Add Category
        </Button>
      </Box>

      <TableContainer sx={{ width: '100%' }}>
        <Table size="small" sx={SETTINGS_TABLE_SX}>
          <colgroup>
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: dataColWidth }} />
            <col style={{ width: SETTINGS_TABLE_CELL_ACTION_SX.width }} />
          </colgroup>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFB' }}>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Category</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Total Checkpoints</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_CELL_SX}>Status</TableCell>
              <TableCell sx={SETTINGS_TABLE_HEADER_ACTION_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectManagementCategories.map((row) => (
              <TableRow key={row.id} sx={{ height: 44 }}>
                <TableCell sx={{ ...SETTINGS_TABLE_CELL_SX, fontWeight: 500 }}>{row.name}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>{row.checkpoints.length}</TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_SX}>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell sx={SETTINGS_TABLE_CELL_ACTION_SX}>
                  <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit">
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => void dispatch(toggleProjectManagementCategoryStatus(row.id))}
                    aria-label="Toggle status"
                  >
                    {row.status === 'active' ? (
                      <ToggleOff sx={{ fontSize: 14, color: 'warning.main' }} />
                    ) : (
                      <ToggleOn sx={{ fontSize: 14, color: 'success.main' }} />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {projectManagementCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ ...SETTINGS_TABLE_CELL_SX, py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No categories yet. Add a category to define checkpoints.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <DrawerForm
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingRow ? 'Edit Category' : 'Add Category'}
        width={480}
        submitLoading={saving}
        footer={
          <Stack
            direction="row"
            justifyContent="flex-end"
            gap={1}
            sx={{ px: '20px', py: '14px' }}
          >
            <Button
              size="sm"
              variant="outlined"
              color="secondary"
              label="Cancel"
              onClick={closeDrawer}
              disabled={saving}
            />
            <Button
              size="sm"
              variant="contained"
              color="primary"
              label={saving ? 'Saving...' : 'Save'}
              onClick={handleSave}
              disabled={saving}
            />
          </Stack>
        }
      >
        <Stack gap={3}>
          <FormField label="Category Name" required error={nameError}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. Design"
              value={form.name}
              error={Boolean(nameError)}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                setNameError(undefined)
              }}
            />
          </FormField>

          <Box>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: tokens.color.neutral[500],
                mb: 1.5,
              }}
            >
              Checkpoint List
            </Typography>

            <Stack gap={1.25}>
              {form.checkpoints.map((cp) => (
                <Stack key={cp.key} direction="row" alignItems="center" gap={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Checkpoint name"
                    value={cp.name}
                    onChange={(e) => updateCheckpoint(cp.key, e.target.value)}
                    inputProps={{ style: { fontSize: 13 } }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeCheckpoint(cp.key)}
                    aria-label="Delete checkpoint"
                    sx={{ color: 'error.main', flexShrink: 0 }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              ))}

              <Button
                size="sm"
                variant="outlined"
                color="primary"
                label="Add another Checkpoint"
                startIcon={<Add sx={{ fontSize: 14 }} />}
                onClick={addCheckpoint}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              />
            </Stack>
          </Box>
        </Stack>
      </DrawerForm>
    </Box>
  )
}
