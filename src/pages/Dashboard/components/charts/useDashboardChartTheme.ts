import { useChartTheme } from '@/design-system/components/charts/utils/chartTheme'
import { useTheme } from '@mui/material/styles'

export function useDashboardChartTheme() {
  const ct = useChartTheme()
  const theme = useTheme()

  const legendBottom = {
    layout: 'horizontal' as const,
    verticalAlign: 'bottom' as const,
    align: 'center' as const,
    iconSize: 8,
    wrapperStyle: {
      fontFamily: ct.fontFamily,
      fontSize: 11,
      color: theme.palette.text.secondary,
      paddingTop: 8,
      width: '100%',
      left: 0,
    },
  }

  return { ct, theme, legendBottom }
}
