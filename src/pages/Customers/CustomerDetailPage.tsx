import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  LinearProgress,
  Chip as MuiChip,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  Business,
  VerifiedUser,
  LocationOn,
  Edit,
  Phone,
  Email,
  Receipt,
  FolderOpen,
  Description,
  History,
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchCustomerById, updateCustomer } from '../../slices/customers/thunk'
import { clearSelected } from '../../slices/customers/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
  WorkspaceTwoCol,
} from '../../components/templates'
import { CustomerDrawer } from './CustomerDrawer'
import { StatusBadge, CopyButton, useToast } from '@/design-system/components'
import type { StatusType } from '@/design-system/components'
import {
  getInitials,
  getAvatarColor,
  formatCurrency,
  formatDate,
} from '../../utils/formatters'
import { tokens } from '@/design-system/tokens'

// ─── Icon circle helper ───────────────────────────────────────────────────────

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: 'primary.50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  )
}

// ─── Label/Value pair ─────────────────────────────────────────────────────────

function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ mt: '2px' }}>{children}</Box>
    </Box>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <Box>
      <Skeleton height={20} width={200} sx={{ mb: 1.5 }} />
      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 1.5 }} />
      <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
    </Box>
  )
}

// ─── Not found state ──────────────────────────────────────────────────────────

function NotFound() {
  const navigate = useNavigate()
  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={600}>Customer not found</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        The customer you're looking for doesn't exist or has been removed.
      </Typography>
      <Box
        component="span"
        onClick={() => navigate('/customers')}
        sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
      >
        ← Back to Customers
      </Box>
    </Box>
  )
}

// ─── CustomerDetailPage ───────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  // :id in the route receives the slug value (e.g. "techhub-systems-pvt-ltd")
  // MSW resolves both real IDs and slugs in the getById handler
  const { id: slug } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const customer = useAppSelector((s) => s.customers.selectedItem)
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('overview')
  const [localLoading, setLocalLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    dispatch(clearSelected())
    setLocalLoading(true)
    setNotFound(false)
    // MSW resolves both id and slug in the :id handler
    dispatch(fetchCustomerById(slug))
      .unwrap()
      .then(() => setLocalLoading(false))
      .catch(() => {
        setNotFound(true)
        setLocalLoading(false)
      })
  }, [slug, dispatch])

  async function handleToggleStatus() {
    if (!customer) return
    const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await dispatch(updateCustomer({ id: customer.id, data: { status: newStatus } })).unwrap()
      showToast({
        title: `Customer ${newStatus === 'Inactive' ? 'deactivated' : 'activated'}`,
        variant: 'success',
      })
    } catch {
      showToast({ title: 'Failed to update status', variant: 'error' })
    }
  }

  if (localLoading) return <DetailSkeleton />
  if (notFound || !customer) return <NotFound />

  const outstanding = customer.totalReceivables
  const receivablesProgress = Math.min((customer.totalReceivables / 1000000) * 100, 100)

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'GST & Tax', value: 'gst' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Billing History', value: 'billing' },
    { label: 'Documents', value: 'documents' },
    { label: 'Activity', value: 'activity' },
  ]

  // ── Tab content ────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <WorkspaceTwoCol>
        {/* Left column */}
        <Box>
          <WorkspaceSection title="Company Profile">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <LabelValue label="Customer Name">
                <Typography variant="body2" fontWeight={500}>{customer!.name}</Typography>
              </LabelValue>
              <LabelValue label="Customer Type">
                <MuiChip
                  label={customer!.type}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 11 }}
                />
              </LabelValue>
              <LabelValue label="Primary Contact">
                <Typography variant="body2" fontWeight={500}>{customer!.contactPerson}</Typography>
              </LabelValue>
              <LabelValue label="Status">
                <StatusBadge status={customer!.status.toLowerCase() as StatusType} />
              </LabelValue>
              <LabelValue label="Phone">
                <Typography variant="body2">{customer!.phone}</Typography>
              </LabelValue>
              <LabelValue label="Email">
                <Typography variant="body2">{customer!.email}</Typography>
              </LabelValue>
            </Box>
          </WorkspaceSection>

          <WorkspaceSection title="Address & Location">
            <Typography variant="body2" color="text.secondary">
              {customer!.address && <>{customer!.address}<br /></>}
              {customer!.city}, {customer!.state}
              {customer!.pincode && ` - ${customer!.pincode}`}
            </Typography>
          </WorkspaceSection>

          {(customer!.tags.length > 0 || customer!.notes) && (
            <WorkspaceSection title="Tags & Notes">
              {customer!.tags.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: customer!.notes ? 1.5 : 0 }}>
                  {customer!.tags.map((tag) => (
                    <MuiChip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  ))}
                </Stack>
              )}
              {customer!.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {customer!.notes}
                </Typography>
              )}
            </WorkspaceSection>
          )}
        </Box>

        {/* Right column */}
        <Box>
          <WorkspaceSection title="Contact Details">
            <Stack gap={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <IconCircle>
                  <Phone sx={{ fontSize: 14, color: 'primary.main' }} />
                </IconCircle>
                <Box>
                  <Typography variant="caption" color="text.secondary">Mobile</Typography>
                  <Typography variant="body2" fontWeight={500}>{customer!.phone}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <IconCircle>
                  <Email sx={{ fontSize: 14, color: 'primary.main' }} />
                </IconCircle>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2" fontWeight={500}>{customer!.email}</Typography>
                </Box>
              </Stack>
            </Stack>
          </WorkspaceSection>

          <WorkspaceSection title="Financial Snapshot">
            <Stack gap={1.5}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Receivables</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₹{formatCurrency(customer!.totalReceivables)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={receivablesProgress}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">Credit Used</Typography>
                <Typography variant="body2" fontWeight={600}>₹0</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">Active Projects</Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={customer!.activeProjects > 0 ? 'primary.main' : 'text.secondary'}
                >
                  {customer!.activeProjects}
                </Typography>
              </Stack>
            </Stack>
          </WorkspaceSection>
        </Box>
      </WorkspaceTwoCol>
    )
  }

  function renderGst() {
    return (
      <WorkspaceTwoCol>
        <Box>
          <WorkspaceSection title="GST Information">
            <Stack gap={2}>
              <LabelValue label="Registration Status">
                <StatusBadge
                  status={customer!.gstStatus === 'Registered' ? 'active' : 'inactive'}
                  label={customer!.gstStatus}
                />
              </LabelValue>
              <LabelValue label="GSTIN">
                {customer!.gstin ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                    >
                      {customer!.gstin}
                    </Typography>
                    <CopyButton value={customer!.gstin} size="small" />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.disabled">Not applicable</Typography>
                )}
              </LabelValue>
              <LabelValue label="State Code">
                <Typography variant="body2">
                  {customer!.gstin ? customer!.gstin.slice(0, 2) : '—'}
                </Typography>
              </LabelValue>
              <LabelValue label="Registration Date">
                <Typography variant="body2">{formatDate(customer!.createdAt)}</Typography>
              </LabelValue>
            </Stack>
          </WorkspaceSection>
        </Box>
        <Box>
          <WorkspaceSection title="Income Tax & TDS">
            <Stack gap={2}>
              <LabelValue label="PAN Number">
                {customer!.pan ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                    >
                      {customer!.pan}
                    </Typography>
                    <CopyButton value={customer!.pan} size="small" />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.disabled">Not provided</Typography>
                )}
              </LabelValue>
              <LabelValue label="TDS Applicability">
                <Typography variant="body2" color="text.secondary">Not configured</Typography>
              </LabelValue>
              <LabelValue label="TDS Rate">
                <Typography variant="body2" color="text.secondary">—</Typography>
              </LabelValue>
              <LabelValue label="Compliance Flags">
                <Typography variant="body2" color="text.secondary">None</Typography>
              </LabelValue>
            </Stack>
          </WorkspaceSection>
        </Box>
      </WorkspaceTwoCol>
    )
  }

  function renderContacts() {
    return (
      <WorkspaceSection title="Primary Contact">
        <Stack direction="row" alignItems="flex-start" gap={2} sx={{ p: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: getAvatarColor(customer!.contactPerson).bg,
              color: getAvatarColor(customer!.contactPerson).text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {getInitials(customer!.contactPerson)}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 14 }}>
              {customer!.contactPerson}
            </Typography>
            {customer!.designation && (
              <Typography variant="caption" color="text.secondary">
                {customer!.designation}
              </Typography>
            )}
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
              <Phone sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: 12 }}>{customer!.phone}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Email sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: 12 }}>{customer!.email}</Typography>
            </Stack>
          </Box>
        </Stack>
      </WorkspaceSection>
    )
  }

  function renderProjects() {
    if (customer!.activeProjects === 0) {
      return (
        <WorkspaceSection title="Linked Projects">
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <FolderOpen sx={{ fontSize: 36, color: tokens.color.neutral[300], mb: 1 }} />
            <Typography variant="body2" fontWeight={500}>No linked projects</Typography>
            <Typography variant="caption" color="text.secondary">
              Projects linked to this customer will appear here
            </Typography>
          </Box>
        </WorkspaceSection>
      )
    }

    return (
      <WorkspaceSection title="Linked Projects">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Project Name</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Value</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Manager</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(customer!.activeProjects)].map((_, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontSize: 12 }}>Project {i + 1}</TableCell>
                <TableCell>
                  <StatusBadge status="active" />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>—</TableCell>
                <TableCell sx={{ fontSize: 12 }}>—</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceSection>
    )
  }

  function renderPlaceholder(icon: React.ReactNode, message: string) {
    return (
      <WorkspaceSection>
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Box sx={{ color: tokens.color.neutral[300], mb: 1 }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary">{message}</Typography>
        </Box>
      </WorkspaceSection>
    )
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':  return renderOverview()
      case 'gst':       return renderGst()
      case 'contacts':  return renderContacts()
      case 'projects':  return renderProjects()
      case 'billing':
        return renderPlaceholder(
          <Receipt sx={{ fontSize: 36 }} />,
          'Billing history will appear here once invoices are created',
        )
      case 'documents':
        return renderPlaceholder(
          <Description sx={{ fontSize: 36 }} />,
          'Documents shared with this customer will appear here',
        )
      case 'activity':
        return renderPlaceholder(
          <History sx={{ fontSize: 36 }} />,
          'Activity log will appear here as changes are made',
        )
      default: return null
    }
  }

  return (
    <>
      <WorkspaceDetail
        moduleName="Customers"
        moduleHref="/customers"
        recordName={customer.name}
        avatarText={getInitials(customer.name)}
        avatarColor={getAvatarColor(customer.name).bg}
        title={customer.name}
        titleMeta={<StatusBadge status={customer.status.toLowerCase() as StatusType} />}
        metaItems={[
          { icon: <Business sx={{ fontSize: 12 }} />, label: customer.type },
          { icon: <VerifiedUser sx={{ fontSize: 12 }} />, label: `GST: ${customer.gstStatus}` },
          { icon: <LocationOn sx={{ fontSize: 12 }} />, label: `${customer.city}, ${customer.state}` },
        ]}
        primaryAction={{
          label: 'Edit Details',
          onClick: () => setDrawerOpen(true),
          icon: <Edit sx={{ fontSize: 14 }} />,
        }}
        secondaryActions={[
          {
            label: customer.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer',
            onClick: handleToggleStatus,
            destructive: customer.status === 'Active',
          },
        ]}
        metrics={[
          {
            label: 'Total Billed',
            value: formatCurrency(customer.totalReceivables),
            prefix: '₹',
          },
          {
            label: 'Outstanding',
            value: formatCurrency(outstanding),
            prefix: '₹',
            highlight: outstanding > 0,
          },
          {
            label: 'Active Projects',
            value: `${customer.activeProjects} Projects`,
          },
          {
            label: 'GST Status',
            value: customer.gstStatus,
          },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderTabContent()}
      </WorkspaceDetail>

      <CustomerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="edit"
        customer={customer}
      />
    </>
  )
}
