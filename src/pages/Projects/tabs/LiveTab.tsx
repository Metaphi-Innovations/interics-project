import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Box, Tabs, Tab } from '@mui/material'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch } from '../../../store/hooks'
import {
  fetchInvoices,
  fetchVendorInvoices,
  fetchPayments,
  fetchExpenses,
  fetchReimbursements,
} from '../../../slices/live/thunk'
import type { Project } from '../../../slices/projects/reducer'
import BillingTab from './live/BillingTab'
import PaymentsTab from './live/PaymentsTab'
import ExpensesTab from './live/ExpensesTab'
import ComplianceTab from './live/ComplianceTab'
import ReimbursementTab from './live/ReimbursementTab'

interface LiveTabProps {
  project: Project
}

export default function LiveTab({ project }: LiveTabProps) {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [activeSubTab, setActiveSubTab] = useState('billing')

  useEffect(() => {
    const nav = location.state as { liveSubTab?: string } | null
    const v = nav?.liveSubTab
    if (v === 'billing' || v === 'payments' || v === 'expenses' || v === 'reimbursement' || v === 'compliance') {
      setActiveSubTab(v)
    }
  }, [project.id, location.key])

  useEffect(() => {
    dispatch(fetchInvoices(project.id))
    dispatch(fetchVendorInvoices(project.id))
    dispatch(fetchPayments(project.id))
    dispatch(fetchExpenses(project.id))
    dispatch(fetchReimbursements(project.id))
  }, [dispatch, project.id])

  const subTabs = [
    { label: 'Billing', value: 'billing' },
    { label: 'Payments', value: 'payments' },
    { label: 'Expenses', value: 'expenses' },
    { label: 'Reimbursement', value: 'reimbursement' },
    { label: 'Compliance', value: 'compliance' },
  ] as const

  return (
    <Box>
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
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {activeSubTab === 'billing' && (
        <BillingTab
          projectId={project.id}
          projectName={project.name}
          clientId={project.customerId}
          clientName={project.customerName}
        />
      )}
      {activeSubTab === 'payments' && (
        <PaymentsTab projectId={project.id} />
      )}
      {activeSubTab === 'expenses' && <ExpensesTab projectId={project.id} />}
      {activeSubTab === 'reimbursement' && (
        <ReimbursementTab
          projectId={project.id}
          onNavigateToPayments={() => setActiveSubTab('payments')}
        />
      )}
      {activeSubTab === 'compliance' && (
        <ComplianceTab projectId={project.id} clientName={project.customerName} />
      )}
    </Box>
  )
}
