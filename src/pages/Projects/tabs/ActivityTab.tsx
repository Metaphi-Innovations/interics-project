/**
 * Project Activity tab — timeline with type filters, date range, and mock data for p-001.
 */
import { useMemo, useState } from 'react'
import {
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import dayjs from 'dayjs'
import {
  FileText,
  History,
  IndianRupee,
  Settings,
  Users,
  Workflow,
} from 'lucide-react'
import { DateRangePicker } from '@/design-system/components'
import { CHART_COLORS, tokens } from '@/design-system/tokens'
import type { Project } from '../../../slices/projects/reducer'
import { WorkspaceSection } from '../../../components/templates'
import { formatRelativeTime, getAvatarColor, getInitials } from '../../../utils/formatters'

export type ActivityCategory = 'status' | 'financial' | 'document' | 'team' | 'system'

export type ActivityFinancialDetail =
  | { kind: 'invoice'; invoiceNumber: string; amountDisplay: string; milestone: string }
  | { kind: 'payment'; vendor: string; amountDisplay: string; reference: string }
  | { kind: 'expense'; expenseType: string; amountDisplay: string; vendor: string | null }
  | { kind: 'reimbursement'; amountDisplay: string; payee: string }
  | { kind: 'baseline' }

export interface ActivityEntry {
  id: string
  at: string
  actorName: string
  category: ActivityCategory
  verb: string
  description: string
  detail?: ActivityFinancialDetail
}

export type ActivityTypeFilter = 'all' | 'status' | 'financial' | 'document' | 'team'

/** Mock activity for demo project p-001 (newest first in array). */
export const MOCK_ACTIVITY_P001: ActivityEntry[] = [
  {
    id: 'a-12',
    at: '2026-04-20T15:45:00.000Z',
    actorName: 'Neha Kapoor',
    category: 'financial',
    verb: 'Invoice generated',
    description: ' — INV-2026-014 — ₹3.5L',
    detail: {
      kind: 'invoice',
      invoiceNumber: 'INV-2026-014',
      amountDisplay: '₹3.5L',
      milestone: 'Milestone 2 — Design sign-off',
    },
  },
  {
    id: 'a-11',
    at: '2026-04-19T09:20:00.000Z',
    actorName: 'Arjun Mehta',
    category: 'financial',
    verb: 'Payment recorded',
    description: ' — ₹1.8L to BuildWell Interiors',
    detail: {
      kind: 'payment',
      vendor: 'BuildWell Interiors',
      amountDisplay: '₹1.8L',
      reference: 'NEFT TXN8821044',
    },
  },
  {
    id: 'a-10',
    at: '2026-04-18T11:00:00.000Z',
    actorName: 'Neha Kapoor',
    category: 'financial',
    verb: 'Expense added',
    description: ' — ₹15K (Vendor Linked)',
    detail: {
      kind: 'expense',
      expenseType: 'Site logistics',
      amountDisplay: '₹15K',
      vendor: 'Acme Supplies',
    },
  },
  {
    id: 'a-9',
    at: '2026-04-17T08:15:00.000Z',
    actorName: 'Arjun Mehta',
    category: 'financial',
    verb: 'Reimbursement added',
    description: ' — ₹25K (BuildWell)',
    detail: {
      kind: 'reimbursement',
      amountDisplay: '₹25K',
      payee: 'BuildWell',
    },
  },
  {
    id: 'a-8',
    at: '2026-04-16T06:00:00.000Z',
    actorName: 'System',
    category: 'status',
    verb: 'Project moved to',
    description: ' Live',
  },
  {
    id: 'a-7',
    at: '2026-04-14T13:30:00.000Z',
    actorName: 'Divya Nair',
    category: 'document',
    verb: 'Vendor quotation',
    description: ' added',
  },
  {
    id: 'a-6',
    at: '2026-04-12T10:00:00.000Z',
    actorName: 'Divya Nair',
    category: 'team',
    verb: 'Team member',
    description: ' Priya S. added',
  },
  {
    id: 'a-5',
    at: '2026-04-11T16:45:00.000Z',
    actorName: 'Neha Kapoor',
    category: 'document',
    verb: 'Client PO',
    description: ' uploaded',
  },
  {
    id: 'a-4',
    at: '2026-04-09T14:00:00.000Z',
    actorName: 'Arjun Mehta',
    category: 'financial',
    verb: 'Baseline created and locked',
    description: '',
    detail: { kind: 'baseline' },
  },
  {
    id: 'a-3',
    at: '2026-04-09T14:02:00.000Z',
    actorName: 'System',
    category: 'system',
    verb: 'Baseline locked',
    description: '',
  },
  {
    id: 'a-2',
    at: '2026-04-06T09:00:00.000Z',
    actorName: 'System',
    category: 'team',
    verb: 'Rahul Sharma assigned as',
    description: ' Project Manager',
  },
  {
    id: 'a-1',
    at: '2026-04-01T08:00:00.000Z',
    actorName: 'System',
    category: 'system',
    verb: 'Project created',
    description: '',
  },
]

const ACTIVITY_BY_PROJECT_ID: Record<string, ActivityEntry[]> = {
  'p-001': MOCK_ACTIVITY_P001,
}

function categoryAccentColor(category: ActivityCategory): string {
  switch (category) {
    case 'status':
      return tokens.color.info[500]
    case 'financial':
      return tokens.color.primary[500]
    case 'document':
      return tokens.color.warning[500]
    case 'team':
      return CHART_COLORS.purple
    case 'system':
      return tokens.color.neutral[500]
    default:
      return tokens.color.neutral[500]
  }
}

function CategoryIcon({
  category,
  color,
}: {
  category: ActivityCategory
  color: string
}) {
  const common = { size: 16, strokeWidth: 1.75, color }
  switch (category) {
    case 'status':
      return <Workflow {...common} />
    case 'financial':
      return <IndianRupee {...common} />
    case 'document':
      return <FileText {...common} />
    case 'team':
      return <Users {...common} />
    case 'system':
      return <Settings {...common} />
    default:
      return <Settings {...common} />
  }
}

function formatAbsoluteTooltip(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ActivityFinancialDetailCard({
  detail,
  theme,
}: {
  detail: ActivityFinancialDetail
  theme: Theme
}) {
  const cardSx = {
    mt: 1,
    p: 1.5,
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: alpha(theme.palette.divider, 0.04),
  } as const

  switch (detail.kind) {
    case 'invoice':
      return (
        <Box sx={cardSx}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Invoice
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
            {detail.invoiceNumber}
          </Typography>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
              {detail.milestone}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
              {detail.amountDisplay}
            </Typography>
          </Stack>
        </Box>
      )
    case 'payment':
      return (
        <Box sx={cardSx}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Payment
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
            {detail.vendor}
          </Typography>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
              Ref: {detail.reference}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
              {detail.amountDisplay}
            </Typography>
          </Stack>
        </Box>
      )
    case 'expense':
      return (
        <Box sx={cardSx}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Expense
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                {detail.expenseType}
              </Typography>
              {detail.vendor && (
                <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {detail.vendor}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
              {detail.amountDisplay}
            </Typography>
          </Stack>
        </Box>
      )
    case 'reimbursement':
      return (
        <Box sx={cardSx}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Reimbursement
          </Typography>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              {detail.payee}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
              {detail.amountDisplay}
            </Typography>
          </Stack>
        </Box>
      )
    case 'baseline':
      return (
        <Box sx={cardSx}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
            Baseline
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
            Locked — reporting against this version
          </Typography>
        </Box>
      )
    default:
      return null
  }
}

interface ActivityTabProps {
  project: Project
}

export default function ActivityTab({ project }: ActivityTabProps) {
  const theme = useTheme()
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])

  const filteredRows = useMemo(() => {
    const sourceRows = ACTIVITY_BY_PROJECT_ID[project.id] ?? []
    const [start, end] = dateRange
    const hasRange = Boolean(start && end)

    let rows = sourceRows.filter((row) => {
      if (typeFilter === 'all') return true
      if (row.category === 'system') return false
      return row.category === typeFilter
    })

    if (hasRange && start && end) {
      const startDay = dayjs(start).startOf('day')
      const endDay = dayjs(end).endOf('day')
      rows = rows.filter((row) => {
        const t = dayjs(row.at)
        return !t.isBefore(startDay) && !t.isAfter(endDay)
      })
    }

    return [...rows].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [project.id, typeFilter, dateRange])

  return (
    <WorkspaceSection title="Activity">
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              Filter by type
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={typeFilter}
              onChange={(_, v: ActivityTypeFilter | null) => {
                if (v != null) setTypeFilter(v)
              }}
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              <ToggleButton value="all" sx={{ fontSize: 12, textTransform: 'none', px: 1.5 }}>
                All
              </ToggleButton>
              <ToggleButton value="status" sx={{ fontSize: 12, textTransform: 'none', px: 1.5 }}>
                Status Changes
              </ToggleButton>
              <ToggleButton value="financial" sx={{ fontSize: 12, textTransform: 'none', px: 1.5 }}>
                Financial
              </ToggleButton>
              <ToggleButton value="document" sx={{ fontSize: 12, textTransform: 'none', px: 1.5 }}>
                Documents
              </ToggleButton>
              <ToggleButton value="team" sx={{ fontSize: 12, textTransform: 'none', px: 1.5 }}>
                Team
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <DateRangePicker
            label="Date range"
            startLabel="From"
            endLabel="To"
            value={dateRange}
            onChange={setDateRange}
            size="sm"
          />
        </Stack>

        {filteredRows.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Box sx={{ color: tokens.color.primary[300], mb: 1, display: 'flex', justifyContent: 'center' }}>
              <History size={48} strokeWidth={1.25} />
            </Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              No activity yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 340, mx: 'auto' }}>
              Activity will appear here as the project progresses.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {filteredRows.map((row, index) => {
              const accent = categoryAccentColor(row.category)
              const avatar = getAvatarColor(row.actorName)
              const showDetail =
                row.detail && row.category === 'financial'

              return (
                <Stack
                  key={row.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    py: 2,
                    borderTop: index === 0 ? 'none' : '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      borderRadius: '50%',
                      bgcolor: alpha(avatar.bg, 0.2),
                      color: avatar.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(row.actorName)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Box sx={{ color: accent, display: 'flex', pt: 0.25 }}>
                        <CategoryIcon category={row.category} color={accent} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.4 }}>
                          <Box component="span" sx={{ fontWeight: 700 }}>
                            {row.verb}
                          </Box>
                          {row.description}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mt: 0.25 }}>
                          {row.actorName}
                          {' · '}
                          <Tooltip title={formatAbsoluteTooltip(row.at)} placement="top" enterDelay={400}>
                            <Box component="span" sx={{ cursor: 'default', borderBottom: '1px dashed', borderColor: 'divider' }}>
                              {formatRelativeTime(row.at)}
                            </Box>
                          </Tooltip>
                        </Typography>
                        {showDetail && row.detail ? (
                          <ActivityFinancialDetailCard detail={row.detail} theme={theme} />
                        ) : null}
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        )}
      </Stack>
    </WorkspaceSection>
  )
}
