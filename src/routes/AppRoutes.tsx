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
import AddedTeamPage from '@/pages/AddedTeam/AddedTeamPage'
import TeamMemberDetailPage from '@/pages/AddedTeam/TeamMemberDetailPage'
import BillingsPage from '@/pages/Finance/BillingsPage'
import PaymentsPage from '@/pages/Finance/PaymentsPage'
import ExpensesPage from '@/pages/Finance/ExpensesPage'
import ComplianceLayout from '@/pages/Compliance/ComplianceLayout'
import ComplianceFilingSummaryPage from '@/pages/Finance/Compliance/FilingSummaryPage'
import FilingChecklistPage from '@/pages/Compliance/FilingChecklistPage'
import GSTPage from '@/pages/Finance/Compliance/GSTPage'
import TDSPage from '@/pages/Finance/Compliance/TDSPage'
import ReportsLayout from '@/pages/Reports/ReportsLayout'
import ReportSubModulePage from '@/pages/Reports/ReportSubModulePage'
import DocumentsPage from '@/pages/Documents/DocumentsPage'
import AuditLogsPage from '@/pages/AuditLogs/AuditLogsPage'
import UsersPage from '@/pages/UserManagement/UsersPage'
import UserViewPage from '@/pages/UserManagement/UserViewPage'
import UserFormPage from '@/pages/UserManagement/UserFormPage'
import RolesPage from '@/pages/UserManagement/RolesPage'
import { UserManagementPermissionRoute } from '@/pages/UserManagement/UserManagementPermissionRoute'
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
                <Route path="/added-team" element={<AddedTeamPage />} />
                <Route path="/added-team/:memberId" element={<TeamMemberDetailPage />} />
                <Route path="/finance/receivables" element={<BillingsPage />} />
                <Route path="/finance/payables" element={<PaymentsPage />} />
                <Route path="/finance/expenses" element={<ExpensesPage />} />
                <Route path="/finance/compliance" element={<ComplianceLayout />}>
                  <Route index element={<Navigate to="filing-summary" replace />} />
                  <Route path="filing" element={<Navigate to="filing-summary" replace />} />
                  <Route path="filing-summary" element={<ComplianceFilingSummaryPage />} />
                  <Route path="filing-checklist" element={<FilingChecklistPage />} />
                  <Route path="gst" element={<GSTPage />} />
                  <Route path="tds" element={<TDSPage />} />
                </Route>
                <Route path="/reports" element={<ReportsLayout />}>
                  <Route index element={<Navigate to="profitability" replace />} />
                  <Route path=":reportSlug" element={<ReportSubModulePage />} />
                </Route>
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/user-management" element={<Navigate to="/user-management/users" replace />} />
                <Route
                  path="/user-management/users/create"
                  element={
                    <UserManagementPermissionRoute>
                      <UserFormPage />
                    </UserManagementPermissionRoute>
                  }
                />
                <Route
                  path="/user-management/users/:id/edit"
                  element={
                    <UserManagementPermissionRoute>
                      <UserFormPage />
                    </UserManagementPermissionRoute>
                  }
                />
                <Route
                  path="/user-management/users/:id"
                  element={
                    <UserManagementPermissionRoute>
                      <UserViewPage />
                    </UserManagementPermissionRoute>
                  }
                />
                <Route
                  path="/user-management/users"
                  element={
                    <UserManagementPermissionRoute>
                      <UsersPage />
                    </UserManagementPermissionRoute>
                  }
                />
                <Route
                  path="/user-management/roles/*"
                  element={
                    <UserManagementPermissionRoute>
                      <RolesPage />
                    </UserManagementPermissionRoute>
                  }
                />
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
