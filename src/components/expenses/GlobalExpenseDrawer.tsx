import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DrawerForm } from '@/components/templates/DrawerForm'
import {
  ExpenseForm,
  type ExpenseFormData,
  type ExpenseFormHandle,
} from '@/components/forms/ExpenseForm'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProjects } from '@/slices/projects/thunk'
import { fetchBaseline, fetchVendorPOs } from '@/slices/baseline/thunk'
import { createExpense, fetchExpenses, fetchReimbursements } from '@/slices/live/thunk'
import { isReimbursableExpenseType } from '@/utils/reimbursableSync'
import { useToast } from '@/design-system/components'

export interface GlobalExpenseDrawerProps {
  open: boolean
  onClose: () => void
  /** Called after a successful create (refetch lists, etc.) */
  onSuccess?: () => void
}

export function GlobalExpenseDrawer({ open, onClose, onSuccess }: GlobalExpenseDrawerProps) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const projects = useAppSelector((s) => s.projects.items ?? [])
  const { baseline, vendorPOs } = useAppSelector((s) => s.baseline)
  const { saving } = useAppSelector((s) => s.live)

  const formRef = useRef<ExpenseFormHandle>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [submitLabel, setSubmitLabel] = useState('Save')

  useEffect(() => {
    if (open) {
      void dispatch(fetchProjects({}))
    } else {
      setSelectedProjectId('')
      setSubmitLabel('Save')
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!selectedProjectId) return
    void dispatch(fetchBaseline(selectedProjectId))
    void dispatch(fetchVendorPOs(selectedProjectId))
  }, [selectedProjectId, dispatch])

  const projectOptions = useMemo(
    () => projects.map((p) => ({ id: p.id, label: p.name })),
    [projects],
  )

  const handleSubmit = useCallback(
    async (data: ExpenseFormData) => {
      if (data.mode !== 'live_expense') return
      const { projectId, data: body } = data
      try {
        await dispatch(createExpense({ projectId, data: body })).unwrap()
        await dispatch(fetchExpenses({ projectId })).unwrap()
        if (isReimbursableExpenseType(body.type)) {
          await dispatch(fetchReimbursements(projectId)).unwrap()
        }
        toast.success(
          isReimbursableExpenseType(body.type) ? 'Reimbursement added for payables' : 'Expense added',
        )
        onSuccess?.()
        onClose()
      } catch {
        toast.error('Failed to add expense')
      }
    },
    [dispatch, onClose, onSuccess, toast],
  )

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Expense"
      width={520}
      onSubmit={() => formRef.current?.submit()}
      submitLabel={submitLabel}
      submitLoading={saving}
      submitDisabled={saving}
    >
      <ExpenseForm
        ref={formRef}
        context="global"
        selectedProjectId={selectedProjectId}
        onSelectedProjectIdChange={setSelectedProjectId}
        projectOptions={projectOptions}
        baseline={baseline?.projectId === selectedProjectId ? baseline : null}
        vendorPOs={vendorPOs}
        open={open}
        onSubmit={handleSubmit}
        onCancel={onClose}
        onSubmitLabelChange={setSubmitLabel}
      />
    </DrawerForm>
  )
}
