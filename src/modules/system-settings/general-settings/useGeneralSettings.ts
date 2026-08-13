import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchCompanyProfile,
  updateCompanyProfile,
} from '@/slices/settings/thunk'
import type { CompanyProfile } from '@/slices/settings/reducer'

/** Loads general settings once on mount (Redux query equivalent). */
export function useGeneralSettingsQuery(enabled = true) {
  const dispatch = useAppDispatch()
  const companyProfile = useAppSelector((s) => s.settings.companyProfile)
  const loading = useAppSelector((s) => s.settings.loading)

  useEffect(() => {
    if (!enabled) return
    void dispatch(fetchCompanyProfile())
  }, [dispatch, enabled])

  return { data: companyProfile, loading }
}

/** Updates general settings (Redux mutation equivalent). */
export function useUpdateGeneralSettings() {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((s) => s.settings.saving)

  const mutateAsync = useCallback(
    (data: Partial<CompanyProfile>) =>
      dispatch(updateCompanyProfile(data)).unwrap(),
    [dispatch],
  )

  return { mutateAsync, saving, isPending: saving }
}
