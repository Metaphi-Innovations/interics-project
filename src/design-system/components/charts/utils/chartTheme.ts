import { useTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import { tokens } from '../../../tokens'

export function useChartTheme() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // 6-color palette drawn from the live MUI palette
  const colors = [
    theme.palette.primary.main,
    theme.palette.primary.light,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ]

  const gridProps = {
    stroke:          theme.palette.divider,
    strokeDasharray: '3 3',
    strokeOpacity:   0.6,
  }

  const tooltipStyle: React.CSSProperties = {
    backgroundColor: theme.palette.background.paper,
    border:          `1px solid ${theme.palette.divider}`,
    borderRadius:    tokens.borderRadius.md,
    boxShadow:       tokens.shadow.sm,
    padding:         '8px 12px',
    fontSize:        12,
    fontFamily:      theme.typography.fontFamily as string,
    color:           theme.palette.text.primary,
    minWidth:         140,
    maxWidth:         360,
    whiteSpace:       'nowrap',
  }

  const tooltipWrapperStyle: React.CSSProperties = {
    outline:       'none',
    pointerEvents: 'none',
    zIndex:        tokens.zIndex.tooltip,
  }

  const axisStyle = {
    fill:       theme.palette.text.secondary,
    fontSize:   isMobile ? 10 : 12,
    fontFamily: theme.typography.fontFamily as string,
  }

  // Legend layout: above the plot, horizontal — keeps the chart full-width
  const legendProps = {
    layout: 'horizontal' as const,
    verticalAlign: 'top' as const,
    align: 'right' as const,
    wrapperStyle: {
      fontFamily: theme.typography.fontFamily as string,
      fontSize: 12,
      color: theme.palette.text.secondary,
      paddingBottom: 8,
      width: '100%',
    },
  }

  return {
    colors,
    gridProps,
    tooltipStyle,
    tooltipWrapperStyle,
    axisStyle,
    legendProps,
    fontFamily: theme.typography.fontFamily as string,
    isMobile,
    theme,
  }
}
