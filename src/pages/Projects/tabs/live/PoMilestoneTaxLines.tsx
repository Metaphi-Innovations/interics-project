import { Typography } from '@mui/material'
import { formatCurrency } from '@/utils/formatters'
import type { PoTaxDisplayRow } from './poTaxDisplay'
import { formatGstRateLabel } from './poTaxDisplay'

export function PoMilestoneTaxLines({
  tax,
  variant = 'client',
  compact = true,
}: {
  tax: PoTaxDisplayRow
  variant?: 'client' | 'vendor'
  compact?: boolean
}) {
  const fontSize = compact ? 10 : 11
  const color = 'text.secondary'

  return (
    <Typography
      component="div"
      variant="caption"
      sx={{ fontSize, color, lineHeight: 1.45, mt: compact ? 0.25 : 0.5 }}
    >
      <span>Base ₹{formatCurrency(tax.base)}</span>
      {tax.gstRate != null && tax.gstAmount != null ? (
        <>
          {' · '}
          <span>
            GST {formatGstRateLabel(tax.gstRate)} (₹{formatCurrency(tax.gstAmount)})
          </span>
        </>
      ) : null}
      {variant === 'client' && tax.tdsRate != null && tax.tdsAmount != null ? (
        <>
          {' · '}
          <span>
            TDS {formatGstRateLabel(tax.tdsRate)} (₹{formatCurrency(tax.tdsAmount)})
          </span>
        </>
      ) : null}
      {tax.net != null ? (
        <>
          {' · '}
          <span style={{ fontWeight: 600 }}>Net ₹{formatCurrency(tax.net)}</span>
        </>
      ) : null}
      {!tax.fromSnapshot ? (
        <Typography component="span" sx={{ fontSize: 9, ml: 0.5, opacity: 0.75 }}>
          (preview)
        </Typography>
      ) : null}
    </Typography>
  )
}
