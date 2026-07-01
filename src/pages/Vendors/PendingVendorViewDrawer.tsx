import { Box, Stack, Typography } from '@mui/material'
import { DrawerForm, FormField } from '@/components/templates'
import type { Vendor } from '@/slices/vendors/reducer'
import { formatDate } from '@/utils/formatters'

export interface PendingVendorViewDrawerProps {
  open: boolean
  vendor: Vendor | null
  onClose: () => void
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 13, py: 0.5 }}>
      {value || '—'}
    </Typography>
  )
}

export function PendingVendorViewDrawer({ open, vendor, onClose }: PendingVendorViewDrawerProps) {
  return (
    <DrawerForm
      open={open}
      onClose={onClose}
      title="Contact details"
      subtitle="Read-only view of pending vendor contact information"
      hideFooter
      width={480}
    >
      {vendor ? (
        <Stack spacing={2}>
          <FormField label="Contact Person Name">
            <ReadOnlyValue value={vendor.contactPerson} />
          </FormField>
          <FormField label="Mobile Number">
            <ReadOnlyValue value={vendor.phone} />
          </FormField>
          <FormField label="Email Address">
            <ReadOnlyValue value={vendor.email} />
          </FormField>
          <FormField label="Designation">
            <ReadOnlyValue value={vendor.designation ?? ''} />
          </FormField>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mb: 0.5 }}>
              Created On
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {vendor.createdAt ? formatDate(vendor.createdAt) : '—'}
            </Typography>
          </Box>
        </Stack>
      ) : null}
    </DrawerForm>
  )
}
