import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Tabs,
  Tab,
  Badge,
} from '@mui/material'
import {
  Receipt,
  Payment,
  AttachMoney,
  ChangeCircle,
} from '@mui/icons-material'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import {
  fetchInvoices,
  fetchVendorInvoices,
  fetchExpenses,
  fetchChangeRequests,
} from '../../../slices/live/thunk'
import type { Project } from '../../../slices/projects/reducer'
import BillingTab from './live/BillingTab'
import PaymentsTab from './live/PaymentsTab'
import ExpensesTab from './live/ExpensesTab'
import ChangesTab from './live/ChangesTab'

// ─── Props ────────────────────────────────────────────────────────────────────

interface LiveTabProps {
  project: Project
}

// ─── LiveTab ──────────────────────────────────────────────────────────────────

export default function LiveTab({ project }: LiveTabProps) {
  const dispatch = useAppDispatch()
  const { invoices, vendorInvoices, expenses, changeRequests } = useAppSelector((s) => s.live)
  const [activeSubTab, setActiveSubTab] = useState('billing')

  useEffect(() => {
    dispatch(fetchInvoices(project.id))
    dispatch(fetchVendorInvoices(project.id))
    dispatch(fetchExpenses(project.id))
    dispatch(fetchChangeRequests(project.id))
  }, [dispatch, project.id])

  const billingBadge = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length
  const paymentsBadge = vendorInvoices.filter((v) => v.status === 'Pending').length
  const expensesBadge = expenses.filter((e) => e.status === 'Pending').length
  const changesBadge = changeRequests.filter((c) => c.status === 'Pending Approval').length

  const subTabs = [
    {
      label: 'Billing',
      value: 'billing',
      icon: <Receipt sx={{ fontSize: 14 }} />,
      badge: billingBadge,
      badgeColor: invoices.some((i) => i.status === 'Overdue') ? 'error' : 'warning',
    },
    {
      label: 'Payments',
      value: 'payments',
      icon: <Payment sx={{ fontSize: 14 }} />,
      badge: paymentsBadge,
      badgeColor: 'warning',
    },
    {
      label: 'Expenses',
      value: 'expenses',
      icon: <AttachMoney sx={{ fontSize: 14 }} />,
      badge: expensesBadge,
      badgeColor: 'warning',
    },
    {
      label: 'Changes',
      value: 'changes',
      icon: <ChangeCircle sx={{ fontSize: 14 }} />,
      badge: changesBadge,
      badgeColor: 'warning',
    },
  ] as const

  return (
    <Box>
      {/* Sub-tabs bar */}
      <Box
        sx={{
          borderBottom: `1px solid ${tokens.color.neutral[100]}`,
          mb: 2,
        }}
      >
        <Tabs
          value={activeSubTab}
          onChange={(_, val: string) => setActiveSubTab(val)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'none',
              px: 2,
              py: 0,
            },
            '& .MuiTabs-indicator': {
              height: 2,
            },
          }}
        >
          {subTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Stack direction="row" alignItems="center" gap={0.75}>
                  {tab.icon}
                  {tab.label}
                  {tab.badge > 0 && (
                    <Badge
                      badgeContent={tab.badge}
                      color={tab.badgeColor as 'error' | 'warning'}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: 10,
                          height: 16,
                          minWidth: 16,
                          px: '4px',
                        },
                      }}
                    />
                  )}
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Sub-tab content */}
      {activeSubTab === 'billing' && <BillingTab projectId={project.id} />}
      {activeSubTab === 'payments' && <PaymentsTab projectId={project.id} />}
      {activeSubTab === 'expenses' && <ExpensesTab projectId={project.id} />}
      {activeSubTab === 'changes' && <ChangesTab projectId={project.id} />}
    </Box>
  )
}
