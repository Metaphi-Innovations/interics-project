import { useState, useEffect } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
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
import { parsePayableContext } from '@/utils/payableNavigation'
import FinancialSummaryTab from './live/FinancialSummaryTab'
import BillingTab from './live/BillingTab'
import PaymentsTab from './live/PaymentsTab'
import ExpensesTab from './live/ExpensesTab'

interface LiveTabProps {
  project: Project
}

export default function LiveTab({ project }: LiveTabProps) {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const [activeSubTab, setActiveSubTab] = useState('financial-summary')

  useEffect(() => {
    const sub = searchParams.get('liveSubTab')
    setActiveSubTab(sub ?? 'financial-summary')
  }, [project.id, searchParams])

  useEffect(() => {
    dispatch(fetchInvoices(project.id))
    dispatch(fetchVendorInvoices(project.id))
    dispatch(fetchPayments(project.id))
    dispatch(fetchExpenses(project.id))
    dispatch(fetchReimbursements(project.id))
  }, [dispatch, project.id])

  const payableContext = parsePayableContext(searchParams)

  const subTabs = [
    { label: 'Overview', value: 'financial-summary' },
    { label: 'Receivable', value: 'billing' },
    { label: 'Payable', value: 'payments' },
    { label: 'Expenses', value: 'expenses' },
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

      {activeSubTab === 'financial-summary' && (
        <FinancialSummaryTab projectId={project.id} />
      )}
      {activeSubTab === 'billing' && (
        <BillingTab
          projectId={project.id}
          projectName={project.name}
          clientId={project.customerId}
          clientName={project.customerName}
        />
      )}
      {activeSubTab === 'payments' && (
        <PaymentsTab projectId={project.id} payableContext={payableContext} />
      )}
      {activeSubTab === 'expenses' && <ExpensesTab projectId={project.id} />}
    </Box>
  )
}
