import { useEffect, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  TextField,
} from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { WorkspaceSection } from '../../../../components/templates'
import { tokens } from '@/design-system/tokens'
import { Button } from '@/design-system/components'
import { liveApi } from '@/api/liveApi'
import { formatInr, formatDate } from '../../../../utils/formatters'

const TABLE_HEADER_SX = {
  fontSize: 10,
  fontWeight: 700,
  color: tokens.color.neutral[500],
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  borderBottom: `1px solid ${tokens.color.neutral[100]}`,
  py: 1.5,
  px: 2,
}

const TABLE_CELL_SX = {
  fontSize: 12,
  borderBottom: `1px solid ${tokens.color.neutral[50]}`,
  py: 1.5,
  px: 2,
}

const SUMMARY_CARD_SX = {
  p: 2,
  border: `1px solid ${tokens.color.neutral[100]}`,
  borderRadius: 2,
  bgcolor: 'background.paper',
} as const

type TaxComplianceData = NonNullable<Awaited<ReturnType<typeof liveApi.getTaxCompliance>>>

export interface TaxComplianceSectionProps {
  projectId: string
  clientName: string
}

function LabourCessPayableCard({
  projectId,
  value,
  onSaved,
}: {
  projectId: string
  value: number
  onSaved: (next: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  async function handleSave() {
    const amount = Number(draft)
    if (!Number.isFinite(amount) || amount < 0) return
    setSaving(true)
    try {
      const summary = await liveApi.updateLabourCessPayable(projectId, amount)
      onSaved(summary.labourCessPayable)
      setEditing(false)
    } catch {
      // keep edit mode open on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={SUMMARY_CARD_SX}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="overline"
          sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
        >
          LABOUR CESS PAYABLE
        </Typography>
        {!editing ? (
          <IconButton
            size="small"
            aria-label="Edit labour cess payable"
            onClick={() => setEditing(true)}
            sx={{ mt: -0.5, mr: -0.5, color: 'text.secondary' }}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </Box>
      {editing ? (
        <Stack gap={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
          />
          <Stack direction="row" gap={1}>
            <Button
              size="sm"
              variant="contained"
              color="primary"
              label={saving ? 'Saving…' : 'Save'}
              disabled={saving}
              onClick={() => void handleSave()}
            />
            <Button
              size="sm"
              variant="outlined"
              color="primary"
              label="Cancel"
              disabled={saving}
              onClick={() => {
                setDraft(String(value))
                setEditing(false)
              }}
            />
          </Stack>
        </Stack>
      ) : (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: 15,
            mt: 0.5,
            color: 'text.primary',
          }}
        >
          ₹{formatInr(value)}
        </Typography>
      )}
    </Box>
  )
}

export function TaxComplianceSection({ projectId }: TaxComplianceSectionProps) {
  const [data, setData] = useState<TaxComplianceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const result = await liveApi.getTaxCompliance(projectId)
        if (cancelled) return
        setData(result)
      } catch {
        if (cancelled) return
        setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const gstRows = data?.details.gstOnClientInvoices ?? []
  const labourRows = data?.details.labourCessOnClientInvoices ?? []
  const clientTdsRows = data?.details.tdsDeductedByClient ?? []
  const vendorTdsRows = data?.details.tdsDeductedOnVendors ?? []

  const totalGstInTable = data?.totals.gstTotal ?? 0
  const totalLabourCessInTable = data?.totals.labourCessTotal ?? 0
  const totalClientTdsInTable = data?.totals.clientTdsTotal ?? 0
  const totalVendorTdsInTable = data?.totals.vendorTdsTotal ?? 0

  if (loading) {
    return (
      <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Loading compliance data…
        </Typography>
      </Box>
    )
  }

  if (!data || gstRows.length === 0) {
    return (
      <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          No compliance data yet. Generate invoices to see GST, labour cess, and TDS.
        </Typography>
      </Box>
    )
  }

  const readOnlySummaryCards = [
    { key: 'gst-collected', overline: 'GST COLLECTED', value: data.summary.gstCollected },
    {
      key: 'labour-cess-collected',
      overline: 'LABOUR CESS COLLECTED',
      value: data.summary.labourCessCollected,
    },
  ]

  return (
    <Stack gap={2}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {readOnlySummaryCards.map((m) => (
          <Box key={m.key} sx={SUMMARY_CARD_SX}>
            <Typography
              variant="overline"
              sx={{ fontSize: 10, color: 'text.secondary', display: 'block', letterSpacing: 0.6 }}
            >
              {m.overline}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: 15,
                mt: 0.5,
                color: 'text.primary',
              }}
            >
              ₹{formatInr(m.value)}
            </Typography>
          </Box>
        ))}
        <LabourCessPayableCard
          projectId={projectId}
          value={data.summary.labourCessPayable}
          onSaved={(labourCessPayable) =>
            setData((prev) =>
              prev ? { ...prev, summary: { ...prev.summary, labourCessPayable } } : prev,
            )
          }
        />
      </Box>

      <WorkspaceSection title="GST on Client Invoices" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Number</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Base Amount (₹)</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>GST Rate</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>GST Amount (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gstRows.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {inv.invoiceNumber}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {inv.milestoneName}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {inv.serviceName}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(inv.invoiceDate)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatInr(inv.baseAmount)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {inv.gstRateLabel}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatInr(inv.gstAmount)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={5} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                Total GST
              </TableCell>
              <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                ₹{formatInr(totalGstInTable)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </WorkspaceSection>

      <WorkspaceSection title="Labour Cess on Client Invoices" noPadding>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Number</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Milestone / Service</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Base Amount (₹)</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Labour Cess Rate</TableCell>
              <TableCell sx={TABLE_HEADER_SX}>Labour Cess Amount (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {labourRows.map((inv) => (
              <TableRow key={`labour-${inv.id}`} hover>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {inv.invoiceNumber}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {inv.milestoneName}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {inv.serviceName}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(inv.invoiceDate)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatInr(inv.baseAmount)}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {inv.labourCessRateLabel}
                  </Typography>
                </TableCell>
                <TableCell sx={TABLE_CELL_SX}>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    ₹{formatInr(inv.labourCessAmount)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={5} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                Total Labour Cess
              </TableCell>
              <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                ₹{formatInr(totalLabourCessInTable)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </WorkspaceSection>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <WorkspaceSection title="TDS Deducted by Client" noPadding>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice Number</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Client Name</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice Date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Gross Amount</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Rate</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientTdsRows.map((inv) => (
                  <TableRow key={`tds-${inv.id}`} hover>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {inv.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {inv.clientName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {formatDate(inv.invoiceDate)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        ₹{formatInr(inv.grossAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12 }} color="text.secondary">
                        {inv.tdsRateLabel}
                      </Typography>
                    </TableCell>
                    <TableCell sx={TABLE_CELL_SX}>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        ₹{formatInr(inv.tdsAmount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                    Total
                  </TableCell>
                  <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                    ₹{formatInr(totalClientTdsInTable)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </WorkspaceSection>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <WorkspaceSection title="TDS Deducted on Vendors" noPadding>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice / Ref</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Vendor Name</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Payment Date</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>Invoice Total</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Rate</TableCell>
                  <TableCell sx={TABLE_HEADER_SX}>TDS Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendorTdsRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{ ...TABLE_CELL_SX, textAlign: 'center', color: 'text.secondary' }}
                    >
                      No vendor payments
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorTdsRows.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {p.invoiceNumber?.trim() || p.referenceNumber?.trim() || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {p.vendorName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {formatDate(p.paymentDate)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          ₹{formatInr(p.invoiceTotal)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {p.tdsRateLabel}
                        </Typography>
                      </TableCell>
                      <TableCell sx={TABLE_CELL_SX}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          ₹{formatInr(p.tdsAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {vendorTdsRows.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ ...TABLE_CELL_SX, borderBottom: 'none' }} />
                    <TableCell sx={{ ...TABLE_CELL_SX, fontWeight: 700, borderBottom: 'none' }}>
                      ₹{formatInr(totalVendorTdsInTable)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </WorkspaceSection>
        </Grid>
      </Grid>
    </Stack>
  )
}
