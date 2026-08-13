import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSystemDefaults } from '@/slices/settings/thunk'

/**
 * Loads System Settings → Default Pagination from the backend.
 * Returns null until the real value is available (never invents a fake default).
 */
export function useSystemDefaultPageSize(): number | null {
  const dispatch = useAppDispatch()
  const loaded = useAppSelector((s) => s.settings.systemDefaultsLoaded)
  const size = useAppSelector((s) => s.settings.systemDefaults.defaultPaginationSize)

  useEffect(() => {
    void dispatch(fetchSystemDefaults())
  }, [dispatch])

  if (!loaded) return null
  return size
}
