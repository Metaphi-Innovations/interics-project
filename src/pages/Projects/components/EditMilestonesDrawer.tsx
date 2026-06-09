import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  IconButton as MuiIconButton,
  Stack,
  TextField,
  Button as MuiButton,
} from '@mui/material'
import { Add, Delete as DeleteIcon } from '@mui/icons-material'
import { tokens } from '@/design-system/tokens'
import { DrawerForm } from '@/components/templates'
import type { ClientMilestone, PitchService } from '@/slices/pitch/reducer'
import { formatCurrency } from '@/utils/formatters'

export interface EditMilestonesDrawerProps {
  open: boolean
  onClose: () => void
  service: PitchService | null
  onSave: (milestones: ClientMilestone[]) => void
}

export function EditMilestonesDrawer({ open, onClose, service, onSave }: EditMilestonesDrawerProps) {
  const [milestones, setMilestones] = useState<ClientMilestone[]>([])

  useEffect(() => {
    if (service && open) {
      setMilestones(service.clientMilestones.map((m) => ({ ...m })))
    }
  }, [service, open])

  if (!service) return null

  const total = milestones.reduce((sum, m) => sum + m.value, 0)
  const balanced = total === service.value

  function update(idx: number, field: keyof ClientMilestone, val: string | number | null) {
    setMilestones((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: val }
      if (field === 'percentage') {
        updated[idx].value = Math.round((Number(val) / 100) * service!.value)
      } else if (field === 'value') {
        updated[idx].percentage = service!.value > 0
          ? Math.round((Number(val) / service!.value) * 100)
          : 0
      }
      return updated
    })
  }

  function addMilestone() {
    setMilestones((prev) => [
      ...prev,
      { id: `cm-${Date.now()}`, name: '', percentage: 0, value: 0 },
    ])
  }

  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Edit Milestones"
      subtitle={`${service.name} — ₹${formatCurrency(service.value)}`}
      onSubmit={() => {
        onSave(milestones)
        onClose()
      }}
      submitLabel="Save Milestones"
    >
      <Box sx={{ mb: 2 }}>
        <Alert severity={balanced ? 'success' : 'warning'} sx={{ fontSize: 11 }}>
          Total: ₹{formatCurrency(total)} / ₹{formatCurrency(service.value)}
          {!balanced && ` — ₹${formatCurrency(Math.abs(service.value - total))} remaining`}
        </Alert>
      </Box>
      <Stack gap={1.5}>
        {milestones.map((m, idx) => (
          <Box
            key={m.id}
            sx={{
              p: 1.5,
              border: `1px solid ${tokens.color.neutral[100]}`,
              borderRadius: 1.5,
              display: 'grid',
              gridTemplateColumns: '1fr 80px 100px 28px',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              value={m.name}
              onChange={(e) => update(idx, 'name', e.target.value)}
              placeholder="Milestone name"
              inputProps={{ style: { fontSize: 12 } }}
            />
            <TextField
              size="small"
              type="number"
              value={m.percentage}
              onChange={(e) => update(idx, 'percentage', Number(e.target.value))}
              inputProps={{ style: { fontSize: 12 } }}
              placeholder="%"
            />
            <TextField
              size="small"
              type="number"
              value={m.value}
              onChange={(e) => update(idx, 'value', Number(e.target.value))}
              inputProps={{ style: { fontSize: 12 } }}
              placeholder="Value"
            />
            <MuiIconButton
              size="small"
              onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== idx))}
              sx={{ color: 'error.main', p: '2px' }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </MuiIconButton>
          </Box>
        ))}
        <MuiButton
          size="small"
          variant="outlined"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={addMilestone}
          sx={{ fontSize: 11, alignSelf: 'flex-start' }}
        >
          Add Milestone
        </MuiButton>
      </Stack>
    </DrawerForm>
  )
}
