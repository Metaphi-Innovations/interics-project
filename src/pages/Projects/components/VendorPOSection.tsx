import { Box, Divider, Stack, Typography } from '@mui/material'
import { Button } from '@/design-system/components'
import {
  RowDeleteAction,
  RowEditAction,
  RowIconActionsGroup,
  RowViewAction,
} from '@/components/listing/RowIconActions'
import type { VendorPO } from '@/slices/baseline/reducer'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { vendorPoEffectiveValue } from '@/pages/Projects/tabs/live/vendorPOHelpers'

const SUBSECTION_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  p: 2,
  bgcolor: 'background.paper',
  height: '100%',
  minWidth: 0,
} as const

function EmptyHint({ children }: { children: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, textAlign: 'center' }}>
      {children}
    </Typography>
  )
}

export interface VendorPOSectionProps {
  vendorPOs: VendorPO[]
  onAddPO: () => void
  onViewPO: (po: VendorPO) => void
  onEditPO: (po: VendorPO) => void
  onDeletePO: (po: VendorPO) => void
  canDeletePO?: (po: VendorPO) => boolean
  deleteDisabledReason?: string
}

export function VendorPOSection({
  vendorPOs,
  onAddPO,
  onViewPO,
  onEditPO,
  onDeletePO,
  canDeletePO,
  deleteDisabledReason = 'Cannot delete — milestone has invoice or payment activity',
}: VendorPOSectionProps) {
  const totalPOValue = vendorPOs.reduce((sum, po) => sum + vendorPoEffectiveValue(po), 0)

  return (
    <Box sx={SUBSECTION_SX}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontSize: 15, fontWeight: 600 }}>
          Vendor PO
        </Typography>
        <Button size="sm" variant="contained" color="primary" label="Add Vendor Offer" onClick={onAddPO} />
      </Stack>
      {vendorPOs.length > 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: 2,
              p: 1.5,
              bgcolor: 'background.default',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', fontSize: 10, letterSpacing: 0.5 }}
              >
                TOTAL VENDOR PO VALUE
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: 13 }}>
                ₹{formatCurrency(totalPOValue)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', fontSize: 10, letterSpacing: 0.5 }}
              >
                NO. OF POs
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>
                {vendorPOs.length}
              </Typography>
            </Box>
          </Box>
          <Stack gap={1}>
            {vendorPOs.map((po) => (
              <Box
                key={po.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                    {po.poNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    {formatDate(po.poDate)}
                    {po.fileName ? ` · ${po.fileName}` : null}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: 13 }}>
                  ₹{formatCurrency(po.poValue)}
                </Typography>
                <RowIconActionsGroup>
                  <RowViewAction onClick={() => onViewPO(po)} />
                  <RowEditAction onClick={() => onEditPO(po)} />
                  <RowDeleteAction
                    onClick={() => onDeletePO(po)}
                    disabled={canDeletePO ? !canDeletePO(po) : false}
                    disabledReason={deleteDisabledReason}
                  />
                </RowIconActionsGroup>
              </Box>
            ))}
          </Stack>
        </>
      ) : (
        <EmptyHint>No vendor purchase orders on file.</EmptyHint>
      )}
    </Box>
  )
}
