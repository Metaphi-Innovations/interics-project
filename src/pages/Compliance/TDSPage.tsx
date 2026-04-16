import { useEffect, useCallback, useState, useMemo } from 'react'
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
} from '@mui/material'
import { Receipt } from 'lucide-react'
import { ListingTemplate } from '@/components/templates'
import type { StatCardItem } from '@/components/templates'
import { Button, Drawer, DatePicker, Input, Select, StatusBadge, useToast } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchTDSData, addChallan, mapDeductionToChallan, deleteChallan } from '@/slices/compliance/thunk'
import type { TDSDeduction, TDSChallan } from '@/slices/compliance/reducer'
import PeriodSelector from '@/components/PeriodSelector'
import { tokens } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/formatters'
import { formatDisplayDate } from '@/utils/complianceDates'

const SECTION_OPTIONS = [
  { label: '194C', value: '194C' },
  { label: '194J', value: '194J' },
  { label: '194I', value: '194I' },
  { label: 'Other', value: 'other' },
]

export default function TDSPage() {
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const { selectedPeriod, tdsSummary, tdsDeductions, tdsChallans, tdsLoading, saving } = useAppSelector(
    (s) => s.compliance,
  )

  const [mapDrawerOpen, setMapDrawerOpen] = useState(false)
  const [mapDeduction, setMapDeduction] = useState<TDSDeduction | null>(null)
  const [mapChallanId, setMapChallanId] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [bsr, setBsr] = useState('')
  const [addSection, setAddSection] = useState('194C')
  const [depositDate, setDepositDate] = useState<Date | null>(new Date())
  const [amount, setAmount] = useState('')
  const [addNotes, setAddNotes] = useState('')

  const [viewChallan, setViewChallan] = useState<TDSChallan | null>(null)

  const load = useCallback(() => {
    void dispatch(fetchTDSData({ period: selectedPeriod }))
  }, [dispatch, selectedPeriod])

  useEffect(() => {
    load()
  }, [load])

  const statCards: StatCardItem[] = tdsSummary
    ? [
        { label: 'Total Deducted', value: `₹${formatCurrency(tdsSummary.totalDeducted)}` },
        { label: 'Deposited', value: `₹${formatCurrency(tdsSummary.totalDeposited)}` },
        {
          label: 'Pending Deposit',
          value: `₹${formatCurrency(tdsSummary.pendingDeposit)}`,
          color: tdsSummary.pendingDeposit > 0 ? 'error' : 'default',
        },
      ]
    : []

  const challanOptionsForMap = useMemo(() => {
    if (!mapDeduction) return []
    return tdsChallans
      .filter((c) => c.section === mapDeduction.section)
      .map((c) => ({
        label: `${c.id} · ₹${formatCurrency(c.amount)} · ${c.section}`,
        value: c.id,
      }))
  }, [mapDeduction, tdsChallans])

  function openMap(d: TDSDeduction) {
    setMapDeduction(d)
    setMapChallanId('')
    setMapDrawerOpen(true)
  }

  async function handleMapSave() {
    if (!mapDeduction || !mapChallanId) return
    const res = await dispatch(mapDeductionToChallan({ deductionId: mapDeduction.id, challanId: mapChallanId }))
    if (mapDeductionToChallan.fulfilled.match(res)) {
      showToast({ title: 'Deduction mapped to challan', variant: 'success' })
      setMapDrawerOpen(false)
      setMapDeduction(null)
    } else {
      showToast({ title: (res.payload as string) ?? 'Map failed', variant: 'error' })
    }
  }

  async function handleAddChallan() {
    if (!depositDate || !bsr.trim() || amount.trim() === '') {
      showToast({ title: 'Fill required fields', variant: 'error' })
      return
    }
    const y = depositDate.getFullYear()
    const m = String(depositDate.getMonth() + 1).padStart(2, '0')
    const d = String(depositDate.getDate()).padStart(2, '0')
    const res = await dispatch(
      addChallan({
        period: selectedPeriod,
        bsrCode: bsr.trim(),
        section: addSection,
        depositDate: `${y}-${m}-${d}`,
        amount: Number(amount),
        notes: addNotes || undefined,
      }),
    )
    if (addChallan.fulfilled.match(res)) {
      showToast({ title: 'Challan added', variant: 'success' })
      setAddOpen(false)
      setBsr('')
      setAddSection('194C')
      setDepositDate(new Date())
      setAmount('')
      setAddNotes('')
    } else {
      showToast({ title: (res.payload as string) ?? 'Add failed', variant: 'error' })
    }
  }

  async function handleDeleteChallan(id: string) {
    const res = await dispatch(deleteChallan(id))
    if (deleteChallan.fulfilled.match(res)) {
      showToast({ title: 'Challan removed', variant: 'success' })
      setViewChallan(null)
    } else {
      showToast({ title: (res.payload as string) ?? 'Delete failed', variant: 'error' })
    }
  }

  const linkedNames = (ch: TDSChallan) =>
    ch.linkedDeductionIds
      .map((id) => tdsDeductions.find((d) => d.id === id)?.deducteeName)
      .filter(Boolean)
      .join(', ')

  return (
    <>
      <ListingTemplate
        icon={<Receipt size={20} />}
        title="TDS"
        statCards={statCards}
        hideToolbar
        headerRight={<PeriodSelector />}
      >
        <Stack spacing={3} sx={{ p: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
              Deduction entries
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ height: 44 }}>
                    {['Party', 'Type', 'Section', 'Project', 'Amount', 'Challan', 'Status', 'Actions'].map((h) => (
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
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tdsLoading &&
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i} sx={{ height: 44 }}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton variant="text" width="70%" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!tdsLoading && tdsDeductions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 3, fontSize: 12 }}>
                        No deductions for this period.
                      </TableCell>
                    </TableRow>
                  )}
                  {!tdsLoading &&
                    tdsDeductions.map((row) => (
                      <TableRow key={row.id} sx={{ height: 44, '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{row.deducteeName}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.deducteeType === 'client' ? 'Client' : 'Vendor'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.section}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.projectName}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(row.amount)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.challanId ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <StatusBadge
                            status={row.challanId ? 'mapped' : 'unmapped'}
                            label={row.challanId ? 'Mapped' : 'Unmapped'}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {row.challanId ? (
                            <Button variant="text" color="primary" size="sm" onClick={() => openMap(row)}>
                              View
                            </Button>
                          ) : (
                            <Button variant="text" color="primary" size="sm" onClick={() => openMap(row)}>
                              Map Challan
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>
              Challans
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ height: 44 }}>
                    {['BSR Code', 'Section', 'Deposit Date', 'Amount', 'Mapped Deductions', 'Actions'].map((h) => (
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
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!tdsLoading && tdsChallans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 3, fontSize: 12 }}>
                        No challans for this period.
                      </TableCell>
                    </TableRow>
                  )}
                  {!tdsLoading &&
                    tdsChallans.map((row) => (
                      <TableRow key={row.id} sx={{ height: 44, '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontSize: 12 }}>{row.bsrCode}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.section}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDisplayDate(row.depositDate)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>₹{formatCurrency(row.amount)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{linkedNames(row) || '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <Stack direction="row" spacing={0.5}>
                            <Button variant="text" color="primary" size="sm" onClick={() => setViewChallan(row)}>
                              View deductions
                            </Button>
                            <Button
                              variant="text"
                              color="error"
                              size="sm"
                              disabled={row.linkedDeductionIds.length > 0}
                              onClick={() => handleDeleteChallan(row.id)}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button variant="outlined" color="primary" size="sm" sx={{ mt: 1.5 }} onClick={() => setAddOpen(true)}>
              + Add Challan
            </Button>
          </Box>
        </Stack>
      </ListingTemplate>

      <Drawer
        open={mapDrawerOpen}
        onClose={() => {
          setMapDrawerOpen(false)
          setMapDeduction(null)
        }}
        title={mapDeduction?.challanId ? 'Deduction details' : 'Map to challan'}
        width={400}
        footer={
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
            <Button variant="outlined" color="secondary" size="sm" onClick={() => setMapDrawerOpen(false)}>
              Close
            </Button>
            {!mapDeduction?.challanId && (
              <Button
                variant="contained"
                color="primary"
                size="sm"
                onClick={handleMapSave}
                disabled={!mapChallanId || saving}
              >
                Save map
              </Button>
            )}
          </Stack>
        }
      >
        {mapDeduction && (
          <Stack spacing={2} sx={{ p: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              {mapDeduction.deducteeName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Section {mapDeduction.section} · ₹{formatCurrency(mapDeduction.amount)}
            </Typography>
            {mapDeduction.challanId && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Linked challan
                </Typography>
                <Typography variant="body2">
                  {tdsChallans.find((c) => c.id === mapDeduction.challanId)?.bsrCode ?? mapDeduction.challanId}
                </Typography>
              </Box>
            )}
            {!mapDeduction.challanId && (
              <Select
                label="Challan"
                value={mapChallanId}
                onChange={(v) => setMapChallanId(String(v))}
                options={challanOptionsForMap}
                placeholder="Select challan"
              />
            )}
          </Stack>
        )}
      </Drawer>

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add challan"
        width={400}
        footer={
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: 1 }}>
            <Button variant="outlined" color="secondary" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" size="sm" onClick={handleAddChallan} disabled={saving}>
              Save
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <Input label="BSR Code" value={bsr} onChange={setBsr} required fullWidth size="sm" />
          <Select label="Section" value={addSection} onChange={(v) => setAddSection(String(v))} options={SECTION_OPTIONS} />
          <DatePicker label="Deposit date" value={depositDate} onChange={setDepositDate} fullWidth size="sm" required />
          <Input label="Amount" value={amount} onChange={setAmount} type="number" required fullWidth size="sm" />
          <Input label="Notes (optional)" value={addNotes} onChange={setAddNotes} fullWidth size="sm" />
        </Stack>
      </Drawer>

      <Drawer
        open={Boolean(viewChallan)}
        onClose={() => setViewChallan(null)}
        title="Challan deductions"
        width={400}
        footer={
          <Button variant="contained" color="primary" size="sm" onClick={() => setViewChallan(null)}>
            Close
          </Button>
        }
      >
        {viewChallan && (
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {viewChallan.id} · BSR {viewChallan.bsrCode} · ₹{formatCurrency(viewChallan.amount)}
            </Typography>
            {viewChallan.linkedDeductionIds.map((id) => {
              const d = tdsDeductions.find((x) => x.id === id)
              return d ? (
                <Box key={id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {d.deducteeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.section} · ₹{formatCurrency(d.amount)}
                  </Typography>
                </Box>
              ) : null
            })}
          </Stack>
        )}
      </Drawer>
    </>
  )
}
