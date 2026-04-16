import { Stack, Typography } from '@mui/material'
import { Modal, Button, DatePicker, Input } from '@/design-system/components'
import { useState, useEffect } from 'react'

export interface MarkFiledModalProps {
  open: boolean
  onClose: () => void
  returnTypeLabel: string
  periodLabel: string
  readOnly: boolean
  filedDateInitial?: string | null
  notesInitial?: string
  loading?: boolean
  onConfirm?: (filedDate: string, notes: string) => void
}

function toInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function MarkFiledModal({
  open,
  onClose,
  returnTypeLabel,
  periodLabel,
  readOnly,
  filedDateInitial,
  notesInitial = '',
  loading = false,
  onConfirm,
}: MarkFiledModalProps) {
  const [filedDate, setFiledDate] = useState<Date | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (filedDateInitial) {
      const p = new Date(filedDateInitial + 'T12:00:00')
      setFiledDate(Number.isNaN(p.getTime()) ? new Date() : p)
    } else {
      setFiledDate(new Date())
    }
    setNotes(notesInitial)
  }, [open, filedDateInitial, notesInitial])

  const maxDate = new Date()
  maxDate.setHours(23, 59, 59, 999)

  function handleConfirm() {
    if (!filedDate || !onConfirm) return
    onConfirm(toInputDate(filedDate), notes)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={readOnly ? 'Return details' : 'Mark return as filed'}
      size="sm"
      loading={loading}
      footer={
        readOnly ? (
          <Button variant="contained" color="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : (
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
            <Button variant="outlined" color="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={!filedDate}
            >
              Confirm Filing
            </Button>
          </Stack>
        )
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Return type
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {returnTypeLabel}
          </Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Period
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {periodLabel}
          </Typography>
        </Stack>
        <DatePicker
          label="Filed date"
          value={filedDate}
          onChange={setFiledDate}
          maxDate={maxDate}
          disableFuture
          required
          fullWidth
          size="sm"
          disabled={readOnly}
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={setNotes}
          disabled={readOnly}
          fullWidth
          size="sm"
        />
      </Stack>
    </Modal>
  )
}
