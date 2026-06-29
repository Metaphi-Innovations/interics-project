import { useEffect, useMemo, useState } from 'react'
import { Stack } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVendorPOs } from '../../../../slices/baseline/thunk'
import { VendorOffersSection } from '../../components/VendorOffersSection'
import { VendorMilestonesSection } from '../../components/VendorMilestonesSection'
import { AddVendorOfferDrawer } from './AddVendorOfferDrawer'
import { useLiveOfferVersion } from './useLiveOfferVersion'

interface VendorPOPayableSummaryProps {
  projectId: string
}

export function VendorPOPayableSummary({ projectId }: VendorPOPayableSummaryProps) {
  const dispatch = useAppDispatch()
  const { vendorPOs, baseline } = useAppSelector((s) => s.baseline)
  const { offerVersion, loading } = useLiveOfferVersion(projectId)

  const [addOfferOpen, setAddOfferOpen] = useState(false)

  useEffect(() => {
    void dispatch(fetchVendorPOs(projectId))
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
          offerVersion={offerVersion}
          loading={loading}
          onAddOffer={() => setAddOfferOpen(true)}
        />

        <VendorMilestonesSection
          projectId={projectId}
          vendorPOs={projectVendorPOs}
          baseline={baselineForProject}
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
