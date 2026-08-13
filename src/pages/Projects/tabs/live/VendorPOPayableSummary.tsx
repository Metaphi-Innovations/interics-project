import { useEffect, useMemo, useState } from 'react'
import { Stack } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchBaseline, fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { fetchExpenses, fetchVendorInvoices } from '../../../../slices/live/thunk'
import { VendorOffersSection } from '../../components/VendorOffersSection'
import { VendorMilestonesSection } from '../../components/VendorMilestonesSection'
import { AddVendorOfferDrawer } from './AddVendorOfferDrawer'
import type { ParsedPayableContext } from '@/utils/payableNavigation'

interface VendorPOPayableSummaryProps {
  projectId: string
  payableContext?: ParsedPayableContext
}

export function VendorPOPayableSummary({
  projectId,
  payableContext,
}: VendorPOPayableSummaryProps) {
  const dispatch = useAppDispatch()
  const { vendorPOs, baseline, loading } = useAppSelector((s) => s.baseline)

  const [addOfferOpen, setAddOfferOpen] = useState(false)

  useEffect(() => {
    void dispatch(fetchVendorPOs(projectId))
    void dispatch(fetchBaseline(projectId))
    void dispatch(fetchVendorInvoices(projectId))
    void dispatch(fetchExpenses({ projectId }))
  }, [dispatch, projectId])

  const projectVendorPOs = useMemo(
    () => vendorPOs.filter((po) => po.projectId === projectId),
    [vendorPOs, projectId],
  )

  const baselineForProject = useMemo(
    () => (baseline?.projectId === projectId ? baseline : null),
    [baseline, projectId],
  )

  return (
    <>
      <Stack gap={2}>
        <VendorOffersSection
          loading={loading && projectVendorPOs.length === 0}
          onAddOffer={() => setAddOfferOpen(true)}
          projectId={projectId}
          vendorPOs={projectVendorPOs}
          baseline={baselineForProject}
        />

        <VendorMilestonesSection
          projectId={projectId}
          vendorPOs={projectVendorPOs}
          baseline={baselineForProject}
          payableContext={payableContext}
        />
      </Stack>

      <AddVendorOfferDrawer
        open={addOfferOpen}
        onClose={() => setAddOfferOpen(false)}
        projectId={projectId}
      />
    </>
  )
}
