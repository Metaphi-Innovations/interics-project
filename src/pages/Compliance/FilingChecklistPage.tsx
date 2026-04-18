import { useEffect, useState, useCallback } from 'react'
import {
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { ListingTemplate } from '@/components/templates'
import {
  Button,
  StatusBadge,
  Tag,
  useToast,
} from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedPeriod, setSelectedType } from '@/slices/compliance/reducer'
import type { ComplianceFilingTypeFilter, FilingItem } from '@/slices/compliance/reducer'
import { fetchFilingItems, markReturnFiled } from '@/slices/compliance/thunk'
import PeriodSelector from '@/components/PeriodSelector'
import MarkFiledModal from '@/pages/Compliance/components/MarkFiledModal'
import { tokens } from '@/design-system/tokens'
import { formatDisplayDate, formatFilingDelay, filingDisplayPeriodToSelectorValue } from '@/utils/complianceDates'

function filingStatusToBadge(status: FilingItem['status']): StatusType {
  if (status === 'filed') return 'filed'
  if (status === 'overdue') return 'overdue'
  if (status === 'partial') return 'partial'
  return 'pending'
}

function filingStatusLabel(status: FilingItem['status']): string {
  const map: Record<FilingItem['status'], string> = {
    filed: 'Filed',
    pending: 'Pending',
    overdue: 'Overdue',
    partial: 'Partial',
  }
  return map[status]
}

export default function FilingChecklistPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { selectedPeriod, selectedType, filingItems, filingLoading, saving } = useAppSelector(
    (s) => s.compliance,
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [modalRow, setModalRow] = useState<FilingItem | null>(null)
  const [modalReadOnly, setModalReadOnly] = useState(false)

  const load = useCallback(() => {
    void dispatch(fetchFilingItems({ period: selectedPeriod, type: selectedType }))
  }, [dispatch, selectedPeriod, selectedType])

  useEffect(() => {
    load()
  }, [load])

  const overdueCount = filingItems.filter((r) => r.status === 'overdue').length

  function openModal(row: FilingItem, readOnly: boolean) {
    setModalRow(row)
    setModalReadOnly(readOnly)
    setModalOpen(true)
  }

  async function handleConfirmFiled(filedDate: string, notes: string) {
    if (!modalRow) return
    const res = await dispatch(
      markReturnFiled({ returnId: modalRow.id, filedDate, notes: notes || undefined }),
    )
    if (markReturnFiled.fulfilled.match(res)) {
      showToast({ title: 'Return marked as filed', variant: 'success' })
      setModalOpen(false)
      setModalRow(null)
    } else {
      showToast({
        title: (res.payload as string) ?? 'Could not update return',
        variant: 'error',
      })
    }
  }

  function handleRowNavigate(row: FilingItem) {
    const periodKey = filingDisplayPeriodToSelectorValue(row.period)
    dispatch(setSelectedPeriod(periodKey))
    if (row.type === 'GST') {
      navigate('/finance/compliance/gst')
    } else {
      navigate('/finance/compliance/tds')
    }
  }

  return (
    <>
      <ListingTemplate
        icon={<Receipt size={20} />}
        title="Filing checklist"
        hideToolbar
        headerRight={<PeriodSelector />}
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {(['all', 'gst', 'tds'] as ComplianceFilingTypeFilter[]).map((t) => (
              <Button
                key={t}
                variant={selectedType === t ? 'contained' : 'outlined'}
                color="primary"
                size="sm"
                onClick={() => dispatch(setSelectedType(t))}
              >
                {t === 'all' ? 'All' : t === 'gst' ? 'GST' : 'TDS'}
              </Button>
            ))}
          </Stack>

          {overdueCount > 0 && (
            <Alert severity="warning" sx={{ fontSize: 12 }}>
              {overdueCount} return{overdueCount === 1 ? '' : 's'} overdue
            </Alert>
          )}

          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow sx={{ height: 44 }}>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Type
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Return
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Period
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Due date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Filed date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Delay
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `2px solid ${tokens.color.neutral[100]}`,
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filingLoading &&
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} sx={{ height: 44 }}>
                      {[...Array(8)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width="80%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!filingLoading && filingItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center', fontSize: 12 }}>
                      No filing data for this period.
                    </TableCell>
                  </TableRow>
                )}

                {!filingLoading &&
                  filingItems.map((row) => {
                    const delay = formatFilingDelay(row.dueDate, row.filedDate, row.status)
                    const canMark = row.status === 'pending' || row.status === 'overdue' || row.status === 'partial'
                    return (
                      <TableRow
                        key={row.id}
                        hover
                        onClick={() => handleRowNavigate(row)}
                        sx={{
                          height: 44,
                          cursor: 'pointer',
                          '&:last-child td': { border: 0 },
                        }}
                      >
                        <TableCell sx={{ fontSize: 12 }}>
                          <Tag
                            label={row.type}
                            size="sm"
                            color={
                              row.type === 'GST'
                                ? tokens.color.primary[500]
                                : tokens.color.neutral[500]
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{row.returnType}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{row.period}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDisplayDate(row.dueDate)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {row.filedDate ? formatDisplayDate(row.filedDate) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <StatusBadge
                            status={filingStatusToBadge(row.status)}
                            label={filingStatusLabel(row.status)}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          <Typography
                            component="span"
                            sx={{
                              color: delay.isLate ? 'error.main' : 'text.secondary',
                              fontSize: 12,
                            }}
                          >
                            {delay.text}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                          {row.status === 'filed' ? (
                            <Button variant="text" color="primary" size="sm" onClick={() => openModal(row, true)}>
                              View
                            </Button>
                          ) : canMark ? (
                            <Button variant="text" color="primary" size="sm" onClick={() => openModal(row, false)}>
                              Mark Filed
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </ListingTemplate>

      <MarkFiledModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setModalRow(null)
        }}
        returnTypeLabel={modalRow?.returnType ?? ''}
        periodLabel={modalRow?.period ?? ''}
        readOnly={modalReadOnly}
        filedDateInitial={modalRow?.filedDate}
        loading={saving}
        onConfirm={modalReadOnly ? undefined : handleConfirmFiled}
      />
    </>
  )
}
