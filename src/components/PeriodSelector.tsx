import { useMemo } from 'react'
import { Stack } from '@mui/material'
import { Select } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedPeriod } from '@/slices/compliance/reducer'
import { buildCompliancePeriodOptions } from '@/utils/complianceDates'

export default function PeriodSelector() {
  const dispatch = useAppDispatch()
  const value = useAppSelector((s) => s.compliance.selectedPeriod)
  const options = useMemo(() => buildCompliancePeriodOptions(), [])

  return (
    <Stack direction="row" alignItems="center" sx={{ minWidth: { xs: 160, sm: 200 } }}>
      <Select
        label="Period:"
        size="sm"
        value={value}
        onChange={(v) => dispatch(setSelectedPeriod(String(v)))}
        options={options}
        sx={{ minWidth: { xs: 140, sm: 180 } }}
      />
    </Stack>
  )
}
