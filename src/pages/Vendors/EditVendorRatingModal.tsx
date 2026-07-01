import { useEffect, useState } from 'react'
import { Stack, Typography } from '@mui/material'
import { Button, Input, Modal } from '@/design-system/components'
import {
  formatVendorRating,
  normalizeVendorRating,
  parseVendorRatingInput,
  validateVendorRatingInput,
} from '@/utils/vendorRating'

export interface EditVendorRatingModalProps {
  open: boolean
  onClose: () => void
  vendorName: string
  currentRating: number | null
  saving?: boolean
  onSave: (rating: number) => Promise<void>
}

export function EditVendorRatingModal({
  open,
  onClose,
  vendorName,
  currentRating,
  saving = false,
  onSave,
}: EditVendorRatingModalProps) {
  const [ratingInput, setRatingInput] = useState('')
  const [ratingError, setRatingError] = useState<string | undefined>()

  useEffect(() => {
    if (!open) {
      setRatingInput('')
      setRatingError(undefined)
      return
    }
    const normalized = normalizeVendorRating(currentRating)
    setRatingInput(normalized != null ? formatVendorRating(normalized) : '')
    setRatingError(undefined)
  }, [open, currentRating])

  function handleRatingChange(value: string) {
    setRatingInput(value)
    if (ratingError) {
      setRatingError(validateVendorRatingInput(value))
    }
  }

  async function handleSave() {
    const error = validateVendorRatingInput(ratingInput)
    if (error) {
      setRatingError(error)
      return
    }
    const parsed = parseVendorRatingInput(ratingInput)
    if (parsed == null) {
      setRatingError('Enter a valid rating')
      return
    }
    setRatingError(undefined)
    await onSave(parsed)
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
        <Input
          label="Rating"
          value={ratingInput}
          onChange={handleRatingChange}
          placeholder="Enter rating"
          type="number"
          fullWidth
          size="sm"
          required
          error={Boolean(ratingError)}
          helperText={ratingError ?? 'Enter a value from 0.0 to 5.0 (one decimal place)'}
        />
      </Stack>
    </Modal>
  )
}
