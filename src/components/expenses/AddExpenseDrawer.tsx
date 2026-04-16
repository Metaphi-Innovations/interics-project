import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Stack,
  Typography,
  TextField,
  Drawer,
  Alert,
  IconButton as MuiIconButton,
  Autocomplete,
  Button as MuiButton,
  FormControl,
  MenuItem,
  Select as MuiSelect,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import Close from '@mui/icons-material/Close'
import { useAppDispatch } from '@/store/hooks'
import { updatePlannedExpenses } from '@/slices/pitch/thunk'
import type { PitchVersion, PlannedExpense } from '@/slices/pitch/reducer'
import { tokens } from '@/design-system/tokens'
import { formatInr } from '@/utils/formatters'
import { redistributeCommonPercents, vendorValueTotalsByVendorId } from '@/utils/pitchPlannedExpenses'

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
  const [expenseType, setExpenseType] = useState<PlannedExpense['type']>('additional')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [vendorId, setVendorId] = useState('')
  const [commonSelectedIds, setCommonSelectedIds] = useState<string[]>([])
  const [commonPercents, setCommonPercents] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open || !version) return
    if (editingExpense) {
      setExpenseType(editingExpense.type)
      setName(editingExpense.name)
      setAmount(editingExpense.amount)
      setVendorId(editingExpense.vendorId ?? '')
      if (editingExpense.type === 'common' && editingExpense.vendorSplits?.length) {
        setCommonSelectedIds(editingExpense.vendorSplits.map((s) => s.vendorId))
        const p: Record<string, number> = {}
        editingExpense.vendorSplits.forEach((s) => {
          p[s.vendorId] = s.percentage
        })
        setCommonPercents(p)
      } else {
        setCommonSelectedIds([])
        setCommonPercents({})
      }
    } else {
      setExpenseType('additional')
      setName('')
      setAmount('')
      setVendorId('')
      setCommonSelectedIds([])
      setCommonPercents({})
    }
  }, [open, editingExpense, version])

  function handleTypeChange(next: PlannedExpense['type']) {
    setExpenseType(next)
    setVendorId('')
    setCommonSelectedIds([])
    setCommonPercents({})
  }

  const vendorOptionsInVersion = useMemo(() => {
    if (!version) return [] as { id: string; label: string; value: number }[]
    return [...vendorValueTotalsByVendorId(version).entries()].map(([id, { name: n, value: v }]) => ({
      id,
      label: n,
      value: v,
    }))
  }, [version])

  const amountNum = typeof amount === 'number' ? amount : Number(amount) || 0
  const commonPctSum = commonSelectedIds.reduce((s, id) => s + (commonPercents[id] ?? 0), 0)
  const commonPctOk =
    expenseType !== 'common' ||
    commonSelectedIds.length === 0 ||
    Math.abs(commonPctSum - 100) < 0.01

  const canSave =
    Boolean(version) &&
    name.trim().length > 0 &&
    amountNum > 0 &&
    (expenseType === 'additional' ||
      (expenseType === 'vendor' && vendorId) ||
      (expenseType === 'common' && commonSelectedIds.length > 0 && commonPctOk))

  function handleCommonVendorsChange(vals: { id: string; label: string; value: number }[]) {
    if (!version) return
    const ids = vals.map((v) => v.id)
    setCommonSelectedIds(ids)
    setCommonPercents(redistributeCommonPercents(ids, version))
  }

  function handleSave() {
    if (!version || !canSave) return
    const baseId = editingExpense?.id ?? `pe-${Date.now()}`
    let payload: PlannedExpense
    if (expenseType === 'additional') {
      payload = { id: baseId, type: 'additional', name: name.trim(), amount: amountNum }
    } else if (expenseType === 'vendor') {
      payload = {
        id: baseId,
        type: 'vendor',
        name: name.trim(),
        amount: amountNum,
        vendorId,
      }
    } else {
      const vendorSplits = commonSelectedIds.map((vid) => {
        const pct = commonPercents[vid] ?? 0
        return {
          vendorId: vid,
          percentage: pct,
          amount: Math.round((amountNum * pct) / 100),
        }
      })
      payload = {
        id: baseId,
        type: 'common',
        name: name.trim(),
        amount: amountNum,
        vendorSplits,
      }
    }
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
  }

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
        <Stack gap={2}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
              Expense type
            </Typography>
            <RadioGroup
              value={expenseType}
              onChange={(e) => handleTypeChange(e.target.value as PlannedExpense['type'])}
            >
              <FormControlLabel value="additional" control={<Radio size="small" />} label="Additional" />
              <FormControlLabel value="vendor" control={<Radio size="small" />} label="Vendor-linked" />
              <FormControlLabel value="common" control={<Radio size="small" />} label="Common" />
            </RadioGroup>
          </Box>

          <Divider />

          <TextField
            size="small"
            label="Expense Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            sx={{ '& input': { fontSize: 13 } }}
          />
          <TextField
            size="small"
            label="Amount ₹"
            type="number"
            required
            value={amount}
            onChange={(e) => {
              const v = e.target.value
              setAmount(v === '' ? '' : Number(v))
            }}
            fullWidth
            sx={{ '& input': { fontSize: 13 } }}
          />

          {expenseType === 'vendor' && (
            <FormControl size="small" fullWidth>
              <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600 }}>
                Vendor
              </Typography>
              <MuiSelect
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                displayEmpty
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="" sx={{ fontSize: 13 }}>
                  Select vendor…
                </MenuItem>
                {vendorOptionsInVersion.map((o) => (
                  <MenuItem key={o.id} value={o.id} sx={{ fontSize: 13 }}>
                    {o.label}
                  </MenuItem>
                ))}
              </MuiSelect>
            </FormControl>
          )}

          {expenseType === 'common' && (
            <Stack gap={1.5}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Vendors
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block' }}>
                Split is auto-calculated based on vendor value. You can override percentages.
              </Typography>
              <Autocomplete
                multiple
                options={vendorOptionsInVersion}
                getOptionLabel={(o) => o.label}
                value={vendorOptionsInVersion.filter((o) => commonSelectedIds.includes(o.id))}
                onChange={(_, vals) => handleCommonVendorsChange(vals)}
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder="Select vendors…" sx={{ '& input': { fontSize: 12 } }} />
                )}
                size="small"
              />
              {commonSelectedIds.length > 0 && (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 600, mt: 0.5 }}>
                    Split preview
                  </Typography>
                  {commonSelectedIds.map((id) => {
                    const opt = vendorOptionsInVersion.find((o) => o.id === id)
                    const pct = commonPercents[id] ?? 0
                    const rowAmt = Math.round((amountNum * pct) / 100)
                    return (
                      <Stack key={id} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography sx={{ flex: 1, minWidth: 120, fontSize: 12 }}>{opt?.label ?? id}</Typography>
                        <TextField
                          size="small"
                          type="number"
                          label="%"
                          value={pct}
                          onChange={(e) =>
                            setCommonPercents((prev) => ({
                              ...prev,
                              [id]: Number(e.target.value),
                            }))}
                          sx={{ width: 100, '& input': { fontSize: 12 } }}
                        />
                        <Typography variant="body2" sx={{ fontSize: 12, minWidth: 100 }}>
                          ₹{formatInr(rowAmt)}
                        </Typography>
                      </Stack>
                    )
                  })}
                  {!commonPctOk && (
                    <Alert severity="error" sx={{ fontSize: 12 }}>
                      Total % must equal 100%.
                    </Alert>
                  )}
                </>
              )}
            </Stack>
          )}
        </Stack>
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
          disabled={!canSave}
          onClick={handleSave}
          sx={{ height: 32 }}
        >
          Save
        </MuiButton>
      </Stack>
    </Drawer>
  )
}
