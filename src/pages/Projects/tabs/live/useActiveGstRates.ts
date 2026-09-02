import { useEffect, useState } from 'react'
import { taxConfigurationService } from '@/modules/system-settings/tax/tax-configuration.service'
import type { GSTRate } from '@/slices/settings/reducer'

export interface ActiveGstRatesState {
  options: GSTRate[]
  loading: boolean
  error: boolean
}

const EMPTY_STATE: ActiveGstRatesState = { options: [], loading: false, error: false }

/** Active GST slabs from system settings (tax configuration API). */
export function useActiveGstRates(open: boolean): ActiveGstRatesState {
  const [state, setState] = useState<ActiveGstRatesState>(EMPTY_STATE)

  useEffect(() => {
    if (!open) {
      setState(EMPTY_STATE)
      return
    }

    let cancelled = false
    setState({ options: [], loading: true, error: false })

    void taxConfigurationService
      .getGstRates({ status: 'active', limit: 100, page: 1 })
      .then((result) => {
        if (cancelled) return
        setState({
          options: result.items.filter((row) => row.status === 'active'),
          loading: false,
          error: false,
        })
      })
      .catch(() => {
        if (!cancelled) setState({ options: [], loading: false, error: true })
      })

    return () => {
      cancelled = true
    }
  }, [open])

  return state
}
