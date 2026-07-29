import { useEffect, useState } from 'react'
import { MenuItem, Stack, Typography, TextField } from '@mui/material'
import { Button, Modal } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRatings } from '@/slices/settings/thunk'

export interface EditVendorRatingModalProps {
  open: boolean
  onClose: () => void
  vendorName: string
  currentRating: string | null
  saving?: boolean
  onSave: (rating: string) => Promise<void>
}

export function EditVendorRatingModal({
  open,
  onClose,
  vendorName,
  currentRating,
  saving = false,
  onSave,
}: EditVendorRatingModalProps) {
  const dispatch = useAppDispatch()
  const ratings = useAppSelector((s) => s.settings.ratings)
  const [selected, setSelected] = useState('')
  const [ratingError, setRatingError] = useState<string | undefined>()

  const activeRatings = ratings.filter((r) => r.status === 'active')

  useEffect(() => {
    if (open) {
      dispatch(fetchRatings())
    }
  }, [open, dispatch])

  useEffect(() => {
    if (!open) {
      setSelected('')
      setRatingError(undefined)
      return
    }
    setSelected(currentRating ?? '')
    setRatingError(undefined)
  }, [open, currentRating])

  async function handleSave() {
    if (!selected.trim()) {
      setRatingError('Rating is required')
      return
    }
    setRatingError(undefined)
    await onSave(selected)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Vendor Rating"
      size="sm"
      loading={saving}
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
          <Button variant="outlined" color="secondary" size="sm" label="Cancel" onClick={onClose} />
          <Button
            variant="contained"
            color="primary"
            size="sm"
            label={saving ? 'Saving…' : 'Save'}
            onClick={() => void handleSave()}
            disabled={saving}
          />
        </Stack>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            Vendor Name
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
            {vendorName}
          </Typography>
        </Stack>
        <TextField
          select
          label="Rating"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value)
            if (ratingError) setRatingError(undefined)
          }}
          fullWidth
          size="small"
          required
          error={Boolean(ratingError)}
          helperText={ratingError ?? 'Select a rating from Rating Master'}
        >
          <MenuItem value="" disabled>
            Select rating…
          </MenuItem>
          {activeRatings.map((r) => (
            <MenuItem key={r.id} value={r.name}>
              {r.name}
            </MenuItem>
          ))}
          {selected && !activeRatings.some((r) => r.name === selected) ? (
            <MenuItem value={selected}>{selected}</MenuItem>
          ) : null}
        </TextField>
      </Stack>
    </Modal>
  )
}
