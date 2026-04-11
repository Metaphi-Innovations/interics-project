import { BrowserRouter, Navigate, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
  FileStack,
  ClipboardList,
  Settings2,
  Users,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/slices/auth/reducer'
import type { JSX } from 'react'

// Auth pages (no layout)
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
import ReceivablesPage from '@/pages/Finance/ReceivablesPage'
import PayablesPage from '@/pages/Finance/PayablesPage'
import ExpensesPage from '@/pages/Finance/ExpensesPage'
import CompliancePage from '@/pages/Finance/CompliancePage'
import ReportsPage from '@/pages/Reports/ReportsPage'
import DocumentsPage from '@/pages/Documents/DocumentsPage'
import AuditLogsPage from '@/pages/AuditLogs/AuditLogsPage'
import UsersPage from '@/pages/UserManagement/UsersPage'
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
    ],
  },
  {
    type: 'group',
    label: 'FINANCE',
    children: [
      {
        type: 'item',
        label: 'Billing & Receivables',
        icon: <TrendingUp size={16} strokeWidth={1.75} />,
        href: '/finance/receivables',
      },
      {
        type: 'item',
        label: 'Costs & Payments',
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
        type: 'item',
        label: 'Compliance & Tax',
        icon: <ShieldCheck size={16} strokeWidth={1.75} />,
        href: '/finance/compliance',
      },
    ],
  },
  {
    type: 'group',
    label: 'SYSTEM',
    children: [
      {
        type: 'item',
        label: 'Reports',
        icon: <BarChart3 size={16} strokeWidth={1.75} />,
        href: '/reports',
      },
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
      {
        type: 'item',
        label: 'Settings',
        icon: <Settings2 size={16} strokeWidth={1.75} />,
        href: '/settings',
      },
      {
        type: 'item',
        label: 'User Management',
        icon: <Users size={16} strokeWidth={1.75} />,
        href: '/user-management',
      },
    ],
  },
]

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, token } = useAppSelector(s => s.auth)
  const location = useLocation()

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

function AppInner() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)

  const topbarUser: UserMenuUser = user
    ? { name: user.name, email: user.email, role: user.role }
    : { name: 'Guest', email: '', role: '' }

  const sidebarUser = user ? { name: user.name, role: user.role } : null

  function handleLogout() {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      {/* Public routes — no layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Demo routes — no layout */}
      <Route path="/demo/create-project" element={<FullPageFormDemo />} />

      {/* Project wizard — no AppShell layout */}
      <Route
        path="/projects/create"
        element={
          <ProtectedRoute>
            <CreateProjectPage />
          </ProtectedRoute>
        }
      />

      {/* App routes — with AppShell layout, all protected */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ToastProvider>
              <AppShell
                navConfig={navConfig}
                user={topbarUser}
                appName="IDC Project Accounts"
                logoMark="DC"
                onSignOut={handleLogout}
                onProfileClick={() => {}}
                onSettingsClick={() => navigate('/settings')}
                sidebarUser={sidebarUser}
                onLogout={handleLogout}
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
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
