import { useState, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
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
  LocalShipping,
  VerifiedUser,
  LocationOn,
  Edit,
  Phone,
  Email,
  Payment,
  Description,
  History,
  FolderOpen,
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchVendorById, updateVendor } from '../../slices/vendors/thunk'
import { clearSelected } from '../../slices/vendors/reducer'
import {
  WorkspaceDetail,
  WorkspaceSection,
  WorkspaceTwoCol,
} from '../../components/templates'
import { VendorDrawer } from './VendorDrawer'
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
      <Typography variant="h6" fontWeight={600}>Vendor not found</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        The vendor you're looking for doesn't exist or has been removed.
      </Typography>
      <Box
        component="span"
        onClick={() => navigate('/vendors')}
        sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
      >
        ← Back to Vendors
      </Box>
    </Box>
  )
}

// ─── VendorDetailPage ─────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id: slug } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const vendor = useAppSelector((s) => s.vendors.selectedItem)
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
    dispatch(fetchVendorById(slug))
      .unwrap()
      .then(() => setLocalLoading(false))
      .catch(() => {
        setNotFound(true)
        setLocalLoading(false)
      })
  }, [slug, dispatch])

  async function handleToggleStatus() {
    if (!vendor) return
    const newStatus = vendor.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await dispatch(updateVendor({ id: vendor.id, data: { status: newStatus } })).unwrap()
      showToast({
        title: `Vendor ${newStatus === 'Inactive' ? 'deactivated' : 'activated'}`,
        variant: 'success',
      })
    } catch {
      showToast({ title: 'Failed to update status', variant: 'error' })
    }
  }

  if (localLoading) return <DetailSkeleton />
  if (notFound || !vendor) return <NotFound />

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'GST & Tax', value: 'gst' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'Linked Projects', value: 'projects' },
    { label: 'Payment History', value: 'payments' },
    { label: 'Documents', value: 'documents' },
    { label: 'Activity', value: 'activity' },
  ]

  // ── Tab content ────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <WorkspaceTwoCol>
        {/* Left column */}
        <Box>
          <WorkspaceSection title="Vendor Profile">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <LabelValue label="Vendor Name">
                <Typography variant="body2" fontWeight={500}>{vendor!.name}</Typography>
              </LabelValue>
              <LabelValue label="Vendor Type">
                <MuiChip
                  label={vendor!.type}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 11 }}
                />
              </LabelValue>
              <LabelValue label="Primary Contact">
                <Typography variant="body2" fontWeight={500}>{vendor!.contactPerson}</Typography>
              </LabelValue>
              <LabelValue label="Status">
                <StatusBadge status={vendor!.status.toLowerCase() as StatusType} />
              </LabelValue>
              <LabelValue label="Phone">
                <Typography variant="body2">{vendor!.phone}</Typography>
              </LabelValue>
              <LabelValue label="Email">
                <Typography variant="body2">{vendor!.email}</Typography>
              </LabelValue>
            </Box>
          </WorkspaceSection>

          <WorkspaceSection title="Address & Location">
            <Typography variant="body2" color="text.secondary">
              {vendor!.address && <>{vendor!.address}<br /></>}
              {vendor!.city}, {vendor!.state}
              {vendor!.pincode && ` - ${vendor!.pincode}`}
            </Typography>
          </WorkspaceSection>

          {(vendor!.tags.length > 0 || vendor!.paymentTerms || vendor!.notes) && (
            <WorkspaceSection title="Specialization & Terms">
              {vendor!.tags.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1.5 }}>
                  {vendor!.tags.map((tag) => (
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
              {vendor!.paymentTerms && (
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Payment Terms</Typography>
                  <Typography variant="body2" fontWeight={500}>{vendor!.paymentTerms}</Typography>
                </Stack>
              )}
              {vendor!.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>
                  {vendor!.notes}
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
                  <Typography variant="body2" fontWeight={500}>{vendor!.phone}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <IconCircle>
                  <Email sx={{ fontSize: 14, color: 'primary.main' }} />
                </IconCircle>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2" fontWeight={500}>{vendor!.email}</Typography>
                </Box>
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
                  status={vendor!.gstStatus === 'Registered' ? 'active' : 'inactive'}
                  label={vendor!.gstStatus}
                />
              </LabelValue>
              <LabelValue label="GSTIN">
                {vendor!.gstin ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                    >
                      {vendor!.gstin}
                    </Typography>
                    <CopyButton value={vendor!.gstin} size="small" />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.disabled">Not applicable</Typography>
                )}
              </LabelValue>
              <LabelValue label="State Code">
                <Typography variant="body2">
                  {vendor!.gstin ? vendor!.gstin.slice(0, 2) : '—'}
                </Typography>
              </LabelValue>
              <LabelValue label="Registration Date">
                <Typography variant="body2">{formatDate(vendor!.createdAt)}</Typography>
              </LabelValue>
            </Stack>
          </WorkspaceSection>
        </Box>
        <Box>
          <WorkspaceSection title="Income Tax & TDS">
            <Stack gap={2}>
              <LabelValue label="PAN Number">
                {vendor!.pan ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                    >
                      {vendor!.pan}
                    </Typography>
                    <CopyButton value={vendor!.pan} size="small" />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.disabled">Not provided</Typography>
                )}
              </LabelValue>
              <LabelValue label="TDS Rate">
                <Typography variant="body2">2% (default vendor TDS)</Typography>
              </LabelValue>
              <LabelValue label="Compliance Note">
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  TDS deductible on vendor payments above ₹30,000 per FY
                </Typography>
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
              bgcolor: getAvatarColor(vendor!.contactPerson).bg,
              color: getAvatarColor(vendor!.contactPerson).text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {getInitials(vendor!.contactPerson)}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 14 }}>
              {vendor!.contactPerson}
            </Typography>
            {vendor!.designation && (
              <Typography variant="caption" color="text.secondary">
                {vendor!.designation}
              </Typography>
            )}
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
              <Phone sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: 12 }}>{vendor!.phone}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Email sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: 12 }}>{vendor!.email}</Typography>
            </Stack>
          </Box>
        </Stack>
      </WorkspaceSection>
    )
  }

  function renderProjects() {
    if (vendor!.activeProjects === 0) {
      return (
        <WorkspaceSection title="Linked Projects">
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <FolderOpen sx={{ fontSize: 36, color: tokens.color.neutral[300], mb: 1 }} />
            <Typography variant="body2" fontWeight={500}>No linked projects</Typography>
            <Typography variant="caption" color="text.secondary">
              Projects linked to this vendor will appear here
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
              <TableCell sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(vendor!.activeProjects)].map((_, i) => (
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
      case 'payments':
        return renderPlaceholder(
          <Payment sx={{ fontSize: 36 }} />,
          'Payment history will appear here once vendor payments are recorded',
        )
      case 'documents':
        return renderPlaceholder(
          <Description sx={{ fontSize: 36 }} />,
          'Documents shared with this vendor will appear here',
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
        moduleName="Vendors"
        moduleHref="/vendors"
        recordName={vendor.name}
        avatarText={getInitials(vendor.name)}
        avatarColor={getAvatarColor(vendor.name).bg}
        title={vendor.name}
        titleMeta={<StatusBadge status={vendor.status.toLowerCase() as StatusType} />}
        metaItems={[
          { icon: <LocalShipping sx={{ fontSize: 12 }} />, label: vendor.type },
          { icon: <VerifiedUser sx={{ fontSize: 12 }} />, label: `GST: ${vendor.gstStatus}` },
          { icon: <LocationOn sx={{ fontSize: 12 }} />, label: `${vendor.city}, ${vendor.state}` },
        ]}
        primaryAction={{
          label: 'Edit Details',
          onClick: () => setDrawerOpen(true),
          icon: <Edit sx={{ fontSize: 14 }} />,
        }}
        secondaryActions={[
          {
            label: vendor.status === 'Active' ? 'Deactivate Vendor' : 'Activate Vendor',
            onClick: handleToggleStatus,
            destructive: vendor.status === 'Active',
          },
        ]}
        metrics={[
          {
            label: 'Total Payables',
            value: formatCurrency(vendor.totalPayables),
            prefix: '₹',
          },
          {
            label: 'Active Projects',
            value: `${vendor.activeProjects} Projects`,
          },
          {
            label: 'Vendor Type',
            value: vendor.type,
          },
          {
            label: 'GST Status',
            value: vendor.gstStatus,
          },
        ]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {renderTabContent()}
      </WorkspaceDetail>

      <VendorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="edit"
        vendor={vendor}
      />
    </>
  )
}
