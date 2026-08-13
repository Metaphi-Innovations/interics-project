import { useCallback, useEffect, useState } from 'react'

export const LISTING_PAGE_SIZES = [10, 25, 50, 100] as const
export const DEFAULT_LISTING_PAGE_SIZE = 20
export const LISTING_SEARCH_DEBOUNCE_MS = 300

export type ListingQueryState = {
  search: string
  debouncedSearch: string
  page: number
  pageSize: number
  tab: string
  filters: Record<string, string>
}

export function useListingQuery(options?: {
  pageSize?: number
  tab?: string
  filters?: Record<string, string>
  debounceMs?: number
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(options?.pageSize ?? DEFAULT_LISTING_PAGE_SIZE)
  const [tab, setTab] = useState(options?.tab ?? 'all')
  const [filters, setFilters] = useState<Record<string, string>>(options?.filters ?? {})

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      options?.debounceMs ?? LISTING_SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [search, options?.debounceMs])

  const updateSearch = useCallback((value: string) => {
    setSearch(value)
    if (value.trim() === '') {
      setDebouncedSearch('')
    }
    setPage(0)
  }, [])

  const updateTab = useCallback((value: string) => {
    setTab(value)
    setPage(0)
  }, [])

  const updatePageSize = useCallback((size: number) => {
    setPageSize(size)
    setPage(0)
  }, [])

  const updateFilter = useCallback((field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPage(0)
  }, [])

  const replaceFilters = useCallback((next: Record<string, string>) => {
    setFilters(next)
    setPage(0)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(options?.filters ?? {})
    setPage(0)
  }, [options?.filters])

  return {
    search,
    debouncedSearch,
    page,
    pageSize,
    tab,
    filters,
    setSearch: updateSearch,
    setPage,
    setPageSize: updatePageSize,
    setTab: updateTab,
    setFilter: updateFilter,
    setFilters: replaceFilters,
    resetFilters,
    /** 1-based page for API query params. */
    apiPage: page + 1,
  }
}
