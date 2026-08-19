import { useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchClientPO } from '../../../../slices/baseline/thunk'
import { fetchInvoices } from '../../../../slices/live/thunk'
import type { ClientPO } from '../../../../slices/baseline/reducer'
import { ClientPOSection } from '../../components/ClientPOSection'
import {
  AddClientPODrawer,
  canDeleteClientPO,
  DeleteClientPODialog,
  EditClientPODrawer,
  ViewClientPODrawer,
} from './ClientPOBillingDrawers'

interface BillingPitchSummaryProps {
  projectId: string
}

export function BillingPitchSummary({ projectId }: BillingPitchSummaryProps) {
  const dispatch = useAppDispatch()
  const { clientPOs } = useAppSelector((s) => s.baseline)
  const { invoices } = useAppSelector((s) => s.live)

  const [addPOOpen, setAddPOOpen] = useState(false)
  const [viewPoId, setViewPoId] = useState<string | null>(null)
  const [editPoId, setEditPoId] = useState<string | null>(null)
  const [deletePo, setDeletePo] = useState<ClientPO | null>(null)

  useEffect(() => {
    void dispatch(fetchClientPO(projectId))
    void dispatch(fetchInvoices(projectId))
  }, [dispatch, projectId])

  const projectClientPOs = useMemo(
    () => clientPOs.filter((po) => po.projectId === projectId),
    [clientPOs, projectId],
  )

  const projectInvoices = useMemo(
    () => invoices.filter((i) => i.projectId === projectId),
    [invoices, projectId],
  )

  const viewPoSeed = useMemo(
    () => projectClientPOs.find((po) => po.id === viewPoId) ?? null,
    [projectClientPOs, viewPoId],
  )

  const editPoSeed = useMemo(
    () => projectClientPOs.find((po) => po.id === editPoId) ?? null,
    [projectClientPOs, editPoId],
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
            onViewPO={(po) => setViewPoId(po.id)}
            onEditPO={(po) => setEditPoId(po.id)}
            onDeletePO={(po) => setDeletePo(po)}
            canDeletePO={(po) => canDeleteClientPO(po.milestones ?? [], projectInvoices)}
          />
        </Stack>
      </Box>

      <AddClientPODrawer open={addPOOpen} onClose={() => setAddPOOpen(false)} projectId={projectId} />
      <ViewClientPODrawer
        open={!!viewPoId}
        onClose={() => setViewPoId(null)}
        projectId={projectId}
        poId={viewPoId}
        poSeed={viewPoSeed}
      />
      <EditClientPODrawer
        open={!!editPoId}
        onClose={() => setEditPoId(null)}
        projectId={projectId}
        poId={editPoId}
        poSeed={editPoSeed}
      />
      <DeleteClientPODialog
        open={!!deletePo}
        po={deletePo}
        projectId={projectId}
        onClose={() => setDeletePo(null)}
      />
    </>
  )
}
