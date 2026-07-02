import { Box, Grid, Stack, Typography } from '@mui/material'
import { FormField } from '@/components/templates'
import { Button, Modal } from '@/design-system/components'
import type { Vendor } from '@/slices/vendors/reducer'
import { formatDate } from '@/utils/formatters'

export interface PendingVendorViewDrawerProps {
  open: boolean
  vendor: Vendor | null
  onClose: () => void
  onUpdateInfo: (vendor: Vendor) => void
}

const SECTION_TITLE_SX = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.8px',
  color: 'text.secondary',
  textTransform: 'uppercase' as const,
  display: 'block',
  mb: 1.5,
} as const

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
      {value || '—'}
    </Typography>
  )
}

export function PendingVendorViewDrawer({
  open,
  vendor,
  onClose,
  onUpdateInfo,
}: PendingVendorViewDrawerProps) {
  if (!vendor) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vendor.name}
      size="sm"
      footer={
        <Stack direction="row" justifyContent="flex-end" gap={1}>
          <Button variant="text" size="sm" label="Cancel" onClick={onClose} />
          <Button
            variant="contained"
            color="primary"
            size="sm"
            label="Update Info"
            onClick={() => onUpdateInfo(vendor)}
          />
        </Stack>
      }
    >
      <Box>
        <Typography component="span" variant="overline" sx={SECTION_TITLE_SX}>
          Contact details
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormField label="Contact Person Name">
              <ReadOnlyValue value={vendor.contactPerson} />
            </FormField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormField label="Mobile Number">
              <ReadOnlyValue value={vendor.phone} />
            </FormField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormField label="Email Address">
              <ReadOnlyValue value={vendor.email} />
            </FormField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormField label="Designation">
              <ReadOnlyValue value={vendor.designation ?? ''} />
            </FormField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormField label="Created On">
              <ReadOnlyValue value={vendor.createdAt ? formatDate(vendor.createdAt) : ''} />
            </FormField>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  )
}
