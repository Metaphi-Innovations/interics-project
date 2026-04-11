import { Routes, Route, Navigate } from 'react-router-dom'
import type { NavConfig, UserMenuUser } from '@/design-system/components'
import { AppShell, ToastProvider } from '@/design-system/components'

// Auth pages (no layout)
import LoginPage from '@/pages/Auth/LoginPage'
import ForgotPasswordPage from '@/pages/Auth/ForgotPasswordPage'

// App pages
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import ProjectsPage from '@/pages/Projects/ProjectsPage'
import ProjectDetailPage from '@/pages/Projects/ProjectDetailPage'
import CustomersPage from '@/pages/Customers/CustomersPage'
import CustomerDetailPage from '@/pages/Customers/CustomerDetailPage'
import VendorsPage from '@/pages/Vendors/VendorsPage'
import VendorDetailPage from '@/pages/Vendors/VendorDetailPage'
import ReceivablesPage from '@/pages/Finance/ReceivablesPage'
import PayablesPage from '@/pages/Finance/PayablesPage'
import ExpensesPage from '@/pages/Finance/ExpensesPage'
import CompliancePage from '@/pages/Finance/CompliancePage'
import ReportsPage from '@/pages/Reports/ReportsPage'
import DocumentsPage from '@/pages/Documents/DocumentsPage'
import AuditLogsPage from '@/pages/AuditLogs/AuditLogsPage'
import UsersPage from '@/pages/UserManagement/UsersPage'
import SettingsPage from '@/pages/Settings/SettingsPage'

interface AppRoutesProps {
  navConfig: NavConfig[]
  user: UserMenuUser
  onSignOut?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
}

export default function AppRoutes({ navConfig, user, onSignOut, onProfileClick, onSettingsClick }: AppRoutesProps) {
  return (
    <Routes>
      {/* Auth routes — no layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* App routes — with AppShell layout */}
      <Route
        path="/*"
        element={
          <ToastProvider>
            <AppShell
              navConfig={navConfig}
              user={user}
              onSignOut={onSignOut}
              onProfileClick={onProfileClick}
              onSettingsClick={onSettingsClick}
            >
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/vendors/:id" element={<VendorDetailPage />} />
                <Route path="/finance/receivables" element={<ReceivablesPage />} />
                <Route path="/finance/payables" element={<PayablesPage />} />
                <Route path="/finance/expenses" element={<ExpensesPage />} />
                <Route path="/finance/compliance" element={<CompliancePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/user-management" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route index element={<Navigate to="/projects" replace />} />
                <Route path="*" element={<Navigate to="/projects" replace />} />
              </Routes>
            </AppShell>
          </ToastProvider>
        }
      />
    </Routes>
  )
}
