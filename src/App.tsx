import { Component, type ErrorInfo, type ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Outlet,
} from 'react-router-dom'
import {
  AppShell,
  ToastProvider,
  type NavConfig,
  type UserMenuUser,
} from '@/design-system/components'
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  Truck,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShieldCheck,
  BarChart3,
  // FileStack,
  // ClipboardList,
  Settings2,
  Users,
  UserPlus,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/slices/auth/reducer'

import LoginPage from '@/pages/Auth/LoginPage'
import ForgotPasswordPage from '@/pages/Auth/ForgotPasswordPage'

// Demo pages (no layout)
import FullPageFormDemo from '@/pages/Demo/FullPageFormDemo'

// App pages
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import ProjectsPage from '@/pages/Projects/ProjectsPage'
import ProjectDetailPage from '@/pages/Projects/ProjectDetailPage'
import CreateProjectPage from '@/pages/Projects/CreateProjectPage'
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

const navConfig: NavConfig[] = [
  {
    type: 'group',
    label: 'CORE',
    children: [
      {
        type: 'item',
        label: 'Dashboard',
        icon: <LayoutDashboard size={16} strokeWidth={1.75} />,
        href: '/dashboard',
      },
      {
        type: 'item',
        label: 'Projects',
        icon: <FolderKanban size={16} strokeWidth={1.75} />,
        href: '/projects',
      },
    ],
  },
  {
    type: 'group',
    label: 'ENTITIES',
    children: [
      {
        type: 'item',
        label: 'Customers',
        icon: <Building2 size={16} strokeWidth={1.75} />,
        href: '/customers',
      },
      {
        type: 'item',
        label: 'Vendors',
        icon: <Truck size={16} strokeWidth={1.75} />,
        href: '/vendors',
      },
      {
        type: 'item',
        label: 'Team',
        icon: <UserPlus size={16} strokeWidth={1.75} />,
        href: '/added-team',
      },
    ],
  },
  {
    type: 'group',
    label: 'FINANCE',
    children: [
      {
        type: 'item',
        label: 'Receivable',
        icon: <TrendingUp size={16} strokeWidth={1.75} />,
        href: '/finance/receivables',
      },
      {
        type: 'item',
        label: 'Payable',
        icon: <TrendingDown size={16} strokeWidth={1.75} />,
        href: '/finance/payables',
      },
      {
        type: 'item',
        label: 'Expenses',
        icon: <Receipt size={16} strokeWidth={1.75} />,
        href: '/finance/expenses',
      },
      {
        type: 'group',
        label: 'Compliance & Tax',
        icon: <ShieldCheck size={16} strokeWidth={1.75} />,
        expandWhenPathPrefix: '/finance/compliance',
        children: [
          { type: 'item', label: 'Filing Summary', href: '/finance/compliance/filing-summary' },
          { type: 'item', label: 'GST', href: '/finance/compliance/gst' },
          { type: 'item', label: 'TDS', href: '/finance/compliance/tds' },
        ],
      },
    ],
  },
  {
    type: 'group',
    label: 'SYSTEM',
    children: [
      {
        type: 'group',
        label: 'Reports',
        icon: <BarChart3 size={16} strokeWidth={1.75} />,
        expandWhenPathPrefix: '/reports',
        children: [
          { type: 'item', label: 'Profitability Reports', href: '/reports/profitability' },
          { type: 'item', label: 'Cash Flow Reports', href: '/reports/cash-flow' },
          { type: 'item', label: 'Receivables Reports', href: '/reports/receivables' },
          { type: 'item', label: 'Payables Reports', href: '/reports/payables' },
          { type: 'item', label: 'Vendor Analysis', href: '/reports/vendor-analysis' },
        ],
      },
      /* Hidden from sidebar for now — restore by uncommenting this block and the FileStack / ClipboardList imports above.
      {
        type: 'item',
        label: 'Documents',
        icon: <FileStack size={16} strokeWidth={1.75} />,
        href: '/documents',
      },
      {
        type: 'item',
        label: 'Audit & Logs',
        icon: <ClipboardList size={16} strokeWidth={1.75} />,
        href: '/audit-logs',
      },
      */
      {
        type: 'item',
        label: 'Settings',
        icon: <Settings2 size={16} strokeWidth={1.75} />,
        href: '/settings',
      },
      {
        type: 'group',
        label: 'User Management',
        icon: <Users size={16} strokeWidth={1.75} />,
        expandWhenPathPrefix: '/user-management',
        children: [
          {
            type: 'item',
            label: 'Users',
            href: '/user-management/users',
            activeMatch: 'exact',
          },
          {
            type: 'item',
            label: 'Roles',
            href: '/user-management/roles',
            activeMatch: 'prefix',
          },
        ],
      },
    ],
  },
]

interface AppShellLayoutProps {
  user: UserMenuUser
  onLogout: () => void
}

function AppShellLayout({ user, onLogout }: AppShellLayoutProps) {
  const navigate = useNavigate()
  return (
    <ToastProvider>
      <AppShell
        navConfig={navConfig}
        user={user}
        appName="IDC Project Accounts"
        logoMark="DC"
        onSignOut={onLogout}
        onProfileClick={() => {}}
        onSettingsClick={() => navigate('/settings')}
        sidebarUser={null}
        onLogout={undefined}
      >
        <Outlet />
      </AppShell>
    </ToastProvider>
  )
}

function ProtectedRoute() {
  const { user, token } = useAppSelector(s => s.auth)
  const location = useLocation()
  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

interface AppErrorBoundaryState {
  error: Error | null
}

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[App]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 18 }}>Something went wrong</h1>
          <p style={{ color: '#666', marginTop: 8 }}>{this.state.error.message}</p>
          <button
            type="button"
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppInner() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)

  const topbarUser: UserMenuUser = user
    ? { name: user.name, email: user.email, role: user.role }
    : { name: 'Guest', email: '', role: '' }

  function handleLogout() {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Demo routes — no layout */}
        <Route path="/demo/create-project" element={<FullPageFormDemo />} />

        {/* Project wizard — no AppShell layout (must be before layout so /projects/create is not caught by projects/:id) */}
        <Route path="/projects/create" element={<CreateProjectPage />} />

        {/* App routes — single pathless layout + Outlet (React Router 7–friendly) */}
        <Route
          element={
            <AppShellLayout user={topbarUser} onLogout={handleLogout} />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="vendors/:id" element={<VendorDetailPage />} />
          <Route path="added-team" element={<AddedTeamPage />} />
          <Route path="added-team/:memberId" element={<TeamMemberDetailPage />} />
          <Route path="finance/receivables" element={<BillingsPage />} />
          <Route path="finance/payables" element={<PaymentsPage />} />
          <Route path="finance/expenses" element={<ExpensesPage />} />
          <Route path="finance/compliance" element={<ComplianceLayout />}>
            <Route index element={<Navigate to="filing-summary" replace />} />
            <Route path="filing" element={<Navigate to="filing-summary" replace />} />
            <Route path="filing-summary" element={<ComplianceFilingSummaryPage />} />
            <Route path="filing-checklist" element={<FilingChecklistPage />} />
            <Route path="gst" element={<GSTPage />} />
            <Route path="tds" element={<TDSPage />} />
          </Route>
          <Route path="reports" element={<ReportsLayout />}>
            <Route index element={<Navigate to="profitability" replace />} />
            <Route path=":reportSlug" element={<ReportSubModulePage />} />
          </Route>
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="user-management" element={<Navigate to="/user-management/users" replace />} />
          <Route
            path="user-management/users/create"
            element={
              <UserManagementPermissionRoute>
                <UserFormPage />
              </UserManagementPermissionRoute>
            }
          />
          <Route
            path="user-management/users/:id/edit"
            element={
              <UserManagementPermissionRoute>
                <UserFormPage />
              </UserManagementPermissionRoute>
            }
          />
          <Route
            path="user-management/users/:id"
            element={
              <UserManagementPermissionRoute>
                <UserViewPage />
              </UserManagementPermissionRoute>
            }
          />
          <Route
            path="user-management/users"
            element={
              <UserManagementPermissionRoute>
                <UsersPage />
              </UserManagementPermissionRoute>
            }
          />
          <Route
            path="user-management/roles/*"
            element={
              <UserManagementPermissionRoute>
                <RolesPage />
              </UserManagementPermissionRoute>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <AppInner />
      </AppErrorBoundary>
    </BrowserRouter>
  )
}
