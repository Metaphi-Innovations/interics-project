import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
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

const mockUser: UserMenuUser = {
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
  role: 'Admin',
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes — no layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Demo routes — no layout */}
        <Route path="/demo/create-project" element={<FullPageFormDemo />} />

        {/* Project wizard — no AppShell layout */}
        <Route path="/projects/create" element={<CreateProjectPage />} />

        {/* App routes — with AppShell layout */}
        <Route
          path="/*"
          element={
            <ToastProvider>
              <AppShell
                navConfig={navConfig}
                user={mockUser}
                appName="IDC Project Accounts"
                logoMark="DC"
                onSignOut={() => console.log('sign out')}
                onProfileClick={() => console.log('profile')}
                onSettingsClick={() => console.log('settings')}
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
    </BrowserRouter>
  )
}
