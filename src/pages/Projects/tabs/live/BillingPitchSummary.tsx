import { useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchClientPO } from '../../../../slices/baseline/thunk'
import type { ClientPO } from '../../../../slices/baseline/reducer'
import { ClientPOSection } from '../../components/ClientPOSection'
import { AddClientPODrawer, ViewClientPODrawer } from './ClientPOBillingDrawers'

interface BillingPitchSummaryProps {
  projectId: string
}

export function BillingPitchSummary({ projectId }: BillingPitchSummaryProps) {
  const dispatch = useAppDispatch()
  const { clientPOs } = useAppSelector((s) => s.baseline)

  const [addPOOpen, setAddPOOpen] = useState(false)
  const [viewPO, setViewPO] = useState<ClientPO | null>(null)

  useEffect(() => {
    void dispatch(fetchClientPO(projectId))
  }, [dispatch, projectId])

  const projectClientPOs = useMemo(
    () => clientPOs.filter((po) => po.projectId === projectId),
    [clientPOs, projectId],
  )

  return (
    <>
      <Box
        component="section"
        aria-label="Receivable pitch summary"
        sx={{
          width: '100%',
          mb: 3,
          p: { xs: 2, md: 3 },
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: tokens.borderRadius.xl,
          bgcolor: 'background.paper',
          boxShadow: tokens.shadow.sm,
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: 11 }}>
          Read-only pitch summary. Edit offer, vendor, and expense data on the Pitch tab.
        </Typography>

        <Stack gap={2}>
          <ClientPOSection
            clientPOs={projectClientPOs}
            onAddPO={() => setAddPOOpen(true)}
            onViewPO={setViewPO}
          />
        </Stack>
      </Box>

      <AddClientPODrawer open={addPOOpen} onClose={() => setAddPOOpen(false)} projectId={projectId} />
      <ViewClientPODrawer
        open={!!viewPO}
        onClose={() => setViewPO(null)}
        projectId={projectId}
        po={viewPO}
      />
    </>
  )
}
