import { Box, Divider, Stack, Typography } from '@mui/material'
import { Button } from '@/design-system/components'
import type { ClientPO } from '@/slices/baseline/reducer'
import { formatCurrency, formatDate } from '@/utils/formatters'

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

export interface ClientPOSectionProps {
  clientPOs: ClientPO[]
  onAddPO: () => void
  onViewPO: (po: ClientPO) => void
  /** Shown above the section when provided (e.g. go-live hint on Pitch). */
  caption?: string
}

export function ClientPOSection({ clientPOs, onAddPO, onViewPO, caption }: ClientPOSectionProps) {
  const totalPOValue = clientPOs.reduce((sum, po) => sum + po.poValue, 0)

  return (
    <Box sx={SUBSECTION_SX}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontSize: 15, fontWeight: 600 }}>
          Client PO
        </Typography>
        <Button size="sm" variant="contained" color="primary" label="Add Client PO" onClick={onAddPO} />
      </Stack>
      {caption ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: 11 }}>
          {caption}
        </Typography>
      ) : null}
      {clientPOs.length > 0 ? (
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
                TOTAL PO VALUE
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
                {clientPOs.length}
              </Typography>
            </Box>
          </Box>
          <Stack gap={1}>
            {clientPOs.map((po) => (
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
                  {(po.startDate || po.endDate || po.fileName) ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {po.startDate || po.endDate
                        ? po.startDate === po.endDate || !po.endDate || !po.startDate
                          ? formatDate(po.startDate || po.endDate)
                          : `${formatDate(po.startDate)} – ${formatDate(po.endDate)}`
                        : null}
                      {po.startDate || po.endDate
                        ? po.fileName
                          ? ` · ${po.fileName}`
                          : null
                        : po.fileName}
                    </Typography>
                  ) : null}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: 13 }}>
                  ₹{formatCurrency(po.poValue)}
                </Typography>
                <Button size="sm" variant="outlined" color="primary" label="View" onClick={() => onViewPO(po)} />
              </Box>
            ))}
          </Stack>
        </>
      ) : (
        <EmptyHint>No client purchase orders on file.</EmptyHint>
      )}
    </Box>
  )
}
