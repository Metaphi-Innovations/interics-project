import { useCallback, useRef, useState } from 'react'
import { Box, Stack, Typography, IconButton as MuiIconButton } from '@mui/material'
import Close from '@mui/icons-material/Close'
import { useAppDispatch } from '@/store/hooks'
import { updatePlannedExpenses } from '@/slices/pitch/thunk'
import type { PitchVersion, PlannedExpense } from '@/slices/pitch/reducer'
import { tokens } from '@/design-system/tokens'
import { Drawer } from '@mui/material'
import { Button as MuiButton } from '@mui/material'
import {
  ExpenseForm,
  type ExpenseFormData,
  type ExpenseFormHandle,
} from '@/components/forms/ExpenseForm'

export interface AddExpenseDrawerProps {
  open: boolean
  onClose: () => void
  version: PitchVersion | null
  projectId: string
  editingExpense: PlannedExpense | null
  /** When set, commits expenses locally (e.g. PO Transition) instead of pitch API. */
  onCommit?: (nextExpenses: PlannedExpense[]) => void
}

export function AddExpenseDrawer({
  open,
  onClose,
  version,
  projectId,
  editingExpense,
  onCommit,
}: AddExpenseDrawerProps) {
  const dispatch = useAppDispatch()
  const formRef = useRef<ExpenseFormHandle>(null)
  const [formValid, setFormValid] = useState(false)

  const handleSubmit = useCallback(
    (data: ExpenseFormData) => {
      if (data.mode !== 'planned_expense' || !version) return
      const payload = data.expense
      const list = version.plannedExpenses ?? []
      const next = editingExpense
        ? list.map((e) => (e.id === editingExpense.id ? payload : e))
        : [...list, payload]
      if (onCommit) {
        onCommit(next)
      } else {
        void dispatch(
          updatePlannedExpenses({
            projectId,
            versionId: version.id,
            expenses: next,
          }),
        )
      }
      onClose()
    },
    [dispatch, editingExpense, onClose, onCommit, projectId, version],
  )

  const canInteract = Boolean(version)

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', lg: 480 },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px 0 0 12px',
          borderLeft: `1px solid ${tokens.color.neutral[100]}`,
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ px: 3, py: 2, borderBottom: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: 15 }}>
          {editingExpense ? 'Edit Expense' : 'Add Expense'}
        </Typography>
        <MuiIconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </MuiIconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {canInteract ? (
          <ExpenseForm
            ref={formRef}
            context="pitch"
            projectId={projectId}
            pitchVersionId={version?.id}
            pitchVersion={version}
            editingPlannedExpense={editingExpense}
            open={open}
            onSubmit={handleSubmit}
            onCancel={onClose}
            onValidityChange={setFormValid}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a version to add expenses.
          </Typography>
        )}
      </Box>

      <Stack
        direction="row"
        justifyContent="flex-end"
        gap={1}
        sx={{ px: 3, py: 2, borderTop: `1px solid ${tokens.color.neutral[100]}`, flexShrink: 0 }}
      >
        <MuiButton variant="outlined" size="small" onClick={onClose} sx={{ height: 32 }}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          size="small"
          disabled={!canInteract || !formValid}
          onClick={() => formRef.current?.submit()}
          sx={{ height: 32, minWidth: 90 }}
        >
          Save
        </MuiButton>
      </Stack>
    </Drawer>
  )
}
