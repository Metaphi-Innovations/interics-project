import { useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchBaseline } from '../../../../slices/baseline/thunk'
import { fetchVersionById, fetchVersions } from '../../../../slices/pitch/thunk'
import type { PitchVersion } from '../../../../slices/pitch/reducer'
import {
  resolveOfferVersionForProject,
  resolvePitchVersionForProject,
} from './vendorPOHelpers'

/**
 * Loads pitch + baseline for a Live project and returns the best offer snapshot
 * (pitch version, or locked baseline after Convert Live).
 */
export function useLiveOfferVersion(projectId: string): {
  offerVersion: PitchVersion | null
  loading: boolean
} {
  const dispatch = useAppDispatch()
  const { activeVersion, versions, loading: pitchLoading } = useAppSelector((s) => s.pitch)
  const { baseline, loading: baselineLoading } = useAppSelector((s) => s.baseline)

  const baselineForProject = useMemo(
    () => (baseline?.projectId === projectId ? baseline : null),
    [baseline, projectId],
  )

  useEffect(() => {
    void dispatch(fetchVersions(projectId))
    void dispatch(fetchBaseline(projectId))
  }, [dispatch, projectId])

  useEffect(() => {
    if (!baselineForProject?.versionId || baselineForProject.categories.length === 0) return
    const pitch = resolvePitchVersionForProject(projectId, activeVersion, versions)
    if (pitch && pitch.categories.length > 0) return
    void dispatch(
      fetchVersionById({ projectId, versionId: baselineForProject.versionId }),
    )
  }, [dispatch, projectId, baselineForProject, activeVersion, versions])

  const offerVersion = useMemo(
    () =>
      resolveOfferVersionForProject(
        projectId,
        activeVersion,
        versions,
        baselineForProject,
      ),
    [projectId, activeVersion, versions, baselineForProject],
  )

  const loading = (pitchLoading || baselineLoading) && !offerVersion

  return { offerVersion, loading }
}
