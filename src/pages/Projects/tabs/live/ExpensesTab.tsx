import { useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button as MuiButton,
  Select as MuiSelect,
  MenuItem,
  Chip as MuiChip,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import { WorkspaceSection } from '../../../../components/templates'
import { DrawerForm, FormField, FormSection } from '../../../../components/templates/DrawerForm'
import { StatusBadge, Input, FileUpload } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { createExpense, approveExpense, rejectExpense } from '../../../../slices/live/thunk'
import type { Expense } from '../../../../slices/live/reducer'
import { formatCurrency, formatDate } from '../../../../utils/formatters'
import { useToast } from '@/design-system/components'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expenseStatusType(status: Expense['status']): { type: StatusType; label: string } {
  switch (status) {
    case 'Approved': return { type: 'active',    label: 'Approved' }
    case 'Pending':  return { type: 'pending',   label: 'Pending' }
    case 'Rejected': return { type: 'cancelled', label: 'Rejected' }
  }
}

function categoryColor(cat: Expense['category']): 'info' | 'warning' | 'default' {
  if (cat === 'Travel' || cat === 'Accommodation') return 'info'
  if (cat === 'Materials') return 'warning'
  return 'default'
}

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: '10px',
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: '12px',
  px: 2,
}

// ─── Summary Strip ────────────────────────────────────────────────────────────

function SummaryStrip({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const approved = expenses.filter((e) => e.status === 'Approved').reduce((s, e) => s + e.amount, 0)
  const pendingCount = expenses.filter((e) => e.status === 'Pending').length
  const billable = expenses.filter((e) => e.billable).reduce((s, e) => s + e.amount, 0)

  const metrics = [
    { label: 'TOTAL EXPENSES', value: `₹${formatCurrency(total)}` },
    { label: 'APPROVED', value: `₹${formatCurrency(approved)}`, highlight: true },
    {
      label: 'PENDING',
      value: String(pendingCount),
      color: pendingCount > 0 ? 'warning.main' : 'success.main',
    },
    { label: 'BILLABLE', value: `₹${formatCurrency(billable)}` },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
      {metrics.map((m) => (
        <Box
          key={m.label}
          sx={{
            p: '14px 16px',
            border: `1px solid ${tokens.color.neutral[100]}`,
            borderRadius: 2,
            bgcolor: m.highlight ? tokens.color.primary[50] : 'background.paper',
          }}
        >
          <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}>
            {m.label}
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: 15, mt: '2px', color: m.color ?? (m.highlight ? 'primary.main' : 'text.primary') }}
          >
            {m.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Add Expense Drawer ───────────────────────────────────────────────────────

interface AddExpenseDrawerProps {
  open: boolean
  projectId: string
  onClose: () => void
}

const CATEGORIES: Expense['category'][] = ['Travel', 'Accommodation', 'Materials', 'Misc', 'Other']

function AddExpenseDrawer({ open, projectId, onClose }: AddExpenseDrawerProps) {
  const dispatch = useAppDispatch()
  const { saving } = useAppSelector((s) => s.live)
  const toast = useToast()

  const [date, setDate] = useState('')
  const [category, setCategory] = useState<Expense['category']>('Travel')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [billable, setBillable] = useState(false)
  const [notes, setNotes] = useState('')

  async function handleSubmit() {
    if (!date || !description || !amount) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      await dispatch(createExpense({
        projectId,
        data: {
          date,
          category,
          description,
          amount: Number(amount),
          vendorId: null,
          vendorName: null,
          billable,
          status: 'Pending',
          receiptUrl: null,
          notes: notes || null,
          submittedBy: 'Admin User',
          approvedBy: null,
        },
      })).unwrap()
      toast.success('Expense added')
      onClose()
      setDate(''); setDescription(''); setAmount(''); setNotes('')
    } catch {
      toast.error('Failed to add expense')
    }
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Add Expense"
      subtitle="Record a project expense"
      onSubmit={handleSubmit}
      submitLabel="Add Expense"
      submitLoading={saving}
    >
      <FormSection title="Expense Details" columns={2}>
        <FormField label="Date" required>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            size="sm"
          />
        </FormField>
        <FormField label="Category" required>
          <MuiSelect
            value={category}
            onChange={(e) => setCategory(e.target.value as Expense['category'])}
            size="small"
            fullWidth
            sx={{ fontSize: 12 }}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c} sx={{ fontSize: 12 }}>{c}</MenuItem>
            ))}
          </MuiSelect>
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Description" required>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="sm"
            />
          </FormField>
        </Box>
        <FormField label="Amount" required>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            size="sm"
            startAdornment={<Typography sx={{ fontSize: 12 }}>₹</Typography>}
          />
        </FormField>
        <FormField label="Billable to Client">
          <Stack direction="row" alignItems="center" gap={1} sx={{ pt: '4px' }}>
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              style={{ width: 14, height: 14, cursor: 'pointer' }}
            />
            <Typography variant="body2" sx={{ fontSize: 12 }}>Billable to client</Typography>
          </Stack>
        </FormField>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormField label="Notes">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="sm"
              multiline
              rows={2}
            />
          </FormField>
        </Box>
      </FormSection>

      <FormSection title="Receipt" columns={1}>
        <FileUpload
          accept="image/*,.pdf"
          label="Attach Receipt"
          onUpload={() => {/* optional upload */}}
        />
      </FormSection>
    </DrawerForm>
  )
}

// ─── ExpensesTab ──────────────────────────────────────────────────────────────

interface ExpensesTabProps {
  projectId: string
}

export default function ExpensesTab({ projectId }: ExpensesTabProps) {
  const { expenses } = useAppSelector((s) => s.live)
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)

  async function handleApprove(id: string) {
    try {
      await dispatch(approveExpense({ projectId, id })).unwrap()
      toast.success('Expense approved')
    } catch {
      toast.error('Failed to approve expense')
    }
  }

  async function handleReject(id: string) {
    try {
      await dispatch(rejectExpense({ projectId, id })).unwrap()
      toast.success('Expense rejected')
    } catch {
      toast.error('Failed to reject expense')
    }
  }

  return (
    <>
      <SummaryStrip expenses={expenses} />

      <WorkspaceSection
        title="Project Expenses"
        noPadding
        action={
          <MuiButton
            size="small"
            variant="contained"
            startIcon={<Add sx={{ fontSize: 14 }} />}
            onClick={() => setAddOpen(true)}
            sx={{ fontSize: 12, height: 30 }}
          >
            Add Expense
          </MuiButton>
        }
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Date & Description</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Category</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Vendor</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Amount</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Submitted By</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Status</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} sx={{ ...TABLE_CELL_SX, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>No expenses yet</Typography>
                </TableCell>
              </TableRow>
            )}
            {expenses.map((exp) => {
              const st = expenseStatusType(exp.status)
              const catColor = categoryColor(exp.category)
              return (
                <TableRow key={exp.id} hover>
                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{formatDate(exp.date)}</Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{exp.description}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <MuiChip
                      label={exp.category}
                      size="small"
                      color={catColor}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11, borderRadius: '4px', '& .MuiChip-label': { px: '6px' } }}
                    />
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{exp.vendorName ?? '—'}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>₹{formatCurrency(exp.amount)}</Typography>
                    {exp.billable && (
                      <MuiChip
                        label="Billable"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 10,
                          mt: '2px',
                          bgcolor: tokens.color.primary[50],
                          color: tokens.color.primary[700],
                          borderRadius: '3px',
                          '& .MuiChip-label': { px: '4px' },
                        }}
                      />
                    )}
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{exp.submittedBy}</Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{formatDate(exp.date)}</Typography>
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    <StatusBadge status={st.type} label={st.label} />
                  </TableCell>

                  <TableCell sx={TABLE_CELL_SX}>
                    {exp.status === 'Pending' && (
                      <Stack direction="row" gap={0.5}>
                        <MuiButton
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleApprove(exp.id)}
                          sx={{ fontSize: 11, height: 26, px: 1 }}
                        >
                          Approve
                        </MuiButton>
                        <MuiButton
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleReject(exp.id)}
                          sx={{ fontSize: 11, height: 26, px: 1 }}
                        >
                          Reject
                        </MuiButton>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceSection>

      <AddExpenseDrawer
        open={addOpen}
        projectId={projectId}
        onClose={() => setAddOpen(false)}
      />
    </>
  )
}
