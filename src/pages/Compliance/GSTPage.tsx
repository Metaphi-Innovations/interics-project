import { useEffect, useCallback, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
} from '@mui/material'
import dayjs from 'dayjs'
import { Receipt } from 'lucide-react'
import { ListingTemplate } from '@/components/templates'
import type { StatCardItem } from '@/components/templates'
import { Button, Drawer, DatePicker, Input, StatusBadge, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchGSTData, markReturnFiled } from '@/slices/compliance/thunk'
import type { GSTReturn } from '@/slices/compliance/reducer'
import PeriodSelector from '@/components/PeriodSelector'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { formatDisplayDate } from '@/utils/complianceDates'

function gstStatusToBadge(s: GSTReturn['status']): StatusType {
  if (s === 'filed') return 'filed'
  if (s === 'overdue') return 'overdue'
  return 'pending'
}

export default function GSTPage() {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const { selectedPeriod, gstSummary, gstReturns, gstLoading, saving } = useAppSelector((s) => s.compliance)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerRow, setDrawerRow] = useState<GSTReturn | null>(null)
  const [drawerReadOnly, setDrawerReadOnly] = useState(false)
  const [filedDate, setFiledDate] = useState<Date | null>(new Date())
  const [notes, setNotes] = useState('')

  const load = useCallback(() => {
    void dispatch(fetchGSTData({ period: selectedPeriod }))
  }, [dispatch, selectedPeriod])

  useEffect(() => {
    load()
  }, [load])

  const statCards: StatCardItem[] = gstSummary
    ? [
        {
          label: 'Output Tax',
          value: `₹${formatCurrency(gstSummary.outputTax)}`,
        },
        {
          label: 'Input Credit',
          value: `₹${formatCurrency(gstSummary.inputCredit)}`,
        },
        {
          label: 'Net Liability',
          value: `₹${formatCurrency(gstSummary.netLiability)}`,
        },
        {
          label: gstSummary.pending > 0 ? 'Paid (pending balance)' : 'Paid',
          value: `₹${formatCurrency(gstSummary.paid)}`,
          color: gstSummary.pending > 0 ? 'warning' : 'default',
        },
      ]
    : []

  const gstr1 = gstReturns.find((r) => r.returnType === 'GSTR-1')
  const showDueSoon =
    gstr1 &&
    gstr1.status !== 'filed' &&
    dayjs(gstr1.dueDate).diff(dayjs(), 'day') <= 3 &&
    dayjs(gstr1.dueDate).diff(dayjs(), 'day') >= 0

  function openDrawer(row: GSTReturn, readOnly: boolean) {
    setDrawerRow(row)
    setDrawerReadOnly(readOnly)
    setFiledDate(row.filedDate ? new Date(row.filedDate + 'T12:00:00') : new Date())
    setNotes('')
    setDrawerOpen(true)
  }

  async function handleSaveDrawer() {
    if (!drawerRow || !filedDate) return
    const y = filedDate.getFullYear()
    const m = String(filedDate.getMonth() + 1).padStart(2, '0')
    const d = String(filedDate.getDate()).padStart(2, '0')
    const iso = `${y}-${m}-${d}`
    const res = await dispatch(markReturnFiled({ returnId: drawerRow.id, filedDate: iso, notes: notes || undefined }))
    if (markReturnFiled.fulfilled.match(res)) {
      showToast({ title: 'Return marked as filed', variant: 'success' })
      setDrawerOpen(false)
      setDrawerRow(null)
    } else {
      showToast({ title: (res.payload as string) ?? 'Update failed', variant: 'error' })
    }
  }

  return (
    <>
      <ListingTemplate
        icon={<Receipt size={20} />}
        title="GST"
        statCards={statCards}
        hideToolbar
        headerRight={<PeriodSelector />}
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ height: 44 }}>
                  {['Return Type', 'Period', 'Due Date', 'Filed Date', 'Liability', 'Status', 'Actions'].map(
                    (h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: 'text.secondary',
                          borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                        }}
                      >
                        {h}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {gstLoading &&
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i} sx={{ height: 44 }}>
                      {[...Array(7)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width="70%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {!gstLoading && gstReturns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center', fontSize: 12 }}>
                      No GST returns for this period.
                    </TableCell>
                  </TableRow>
                )}
                {!gstLoading &&
                  gstReturns.map((row) => (
                    <TableRow key={row.id} sx={{ height: 44, '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{row.returnType}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{row.period}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{formatDisplayDate(row.dueDate)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {row.filedDate ? formatDisplayDate(row.filedDate) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(row.liability)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        <StatusBadge status={gstStatusToBadge(row.status)} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {row.status === 'filed' ? (
                          <Button variant="text" color="primary" size="sm" onClick={() => openDrawer(row, true)}>
                            View
                          </Button>
                        ) : (
                          <Button variant="text" color="primary" size="sm" onClick={() => openDrawer(row, false)}>
                            Mark Filed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {(showDueSoon || gstReturns.length > 0) && (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {showDueSoon && (
                <Chip label="GSTR-1 due in 3 days" size="small" color="warning" sx={{ fontSize: 11 }} />
              )}
              {gstReturns.length > 0 && (
                <Chip
                  label="Net liability mismatch with GSTR-3B (placeholder)"
                  size="small"
                  color="error"
                  sx={{ fontSize: 11 }}
                />
              )}
            </Stack>
          )}
        </Stack>
      </ListingTemplate>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerRow(null)
        }}
        title={drawerReadOnly ? 'Return details' : 'Mark return filed'}
        width={400}
        footer={
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
            <Button variant="outlined" color="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
              {drawerReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!drawerReadOnly && (
              <Button variant="contained" color="primary" size="sm" onClick={handleSaveDrawer} disabled={!filedDate || saving}>
                Save
              </Button>
            )}
          </Stack>
        }
      >
        {drawerRow && (
          <Stack spacing={2} sx={{ p: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Return type
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {drawerRow.returnType}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Period
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {drawerRow.period}
              </Typography>
            </Box>
            <DatePicker
              label="Filed date"
              value={filedDate}
              onChange={setFiledDate}
              maxDate={new Date()}
              disableFuture
              fullWidth
              size="sm"
              disabled={drawerReadOnly}
            />
            <Input label="Notes (optional)" value={notes} onChange={setNotes} disabled={drawerReadOnly} fullWidth size="sm" />
          </Stack>
        )}
      </Drawer>
    </>
  )
}
