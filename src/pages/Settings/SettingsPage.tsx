import { Link, Navigate, useParams } from 'react-router-dom'
import { Box, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import BusinessIcon from '@mui/icons-material/Business'
import ReceiptIcon from '@mui/icons-material/Receipt'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import CategoryIcon from '@mui/icons-material/Category'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import DomainIcon from '@mui/icons-material/Domain'
import StarIcon from '@mui/icons-material/Star'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import type { SvgIconComponent } from '@mui/icons-material'
import { useTheme, alpha } from '@mui/material/styles'
import GeneralSettingsSection from './sections/GeneralSettingsSection'
import TaxConfigSection from './sections/TaxConfigSection'
import SACCodesSection from './sections/SACCodesSection'
import CategoriesSection from './sections/CategoriesSection'
import ServicesSection from './sections/ServicesSection'
import SectorsSection from './sections/SectorsSection'
import RatingsSection from './sections/RatingsSection'
import ProjectManagementMasterSection from './sections/ProjectManagementMasterSection'

interface NavItem {
  id: string
  label: string
  icon: SvgIconComponent
}

const NAV_ITEMS: NavItem[] = [
  { id: 'general', label: 'General Settings', icon: BusinessIcon },
  { id: 'tax', label: 'Tax Configuration', icon: ReceiptIcon },
  { id: 'sac', label: 'SAC Codes', icon: QrCode2Icon },
  { id: 'categories', label: 'Categories', icon: CategoryIcon },
  { id: 'services', label: 'Services', icon: MiscellaneousServicesIcon },
  { id: 'sectors', label: 'Sector Master', icon: DomainIcon },
  { id: 'ratings', label: 'Rating Master', icon: StarIcon },
  { id: 'project-management', label: 'Project Management Master', icon: AccountTreeIcon },
]

const DEFAULT_SECTION = NAV_ITEMS[0]!.id
const VALID_SECTION_IDS = new Set(NAV_ITEMS.map((item) => item.id))

function settingsSectionPath(sectionId: string): string {
  return `/settings/${sectionId}`
}

export default function SettingsPage() {
  const theme = useTheme()
  const { section: sectionParam } = useParams<{ section: string }>()

  if (!sectionParam || !VALID_SECTION_IDS.has(sectionParam)) {
    return <Navigate to={settingsSectionPath(DEFAULT_SECTION)} replace />
  }

  const activeSection = sectionParam

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        height: {
          xs: 'calc(100dvh - 52px - 32px)',
          md: 'calc(100dvh - 52px - 48px)',
          lg: 'calc(100dvh - 52px - 64px)',
        },
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Left nav panel */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'stretch',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflowY: 'auto',
          p: 2,
        }}
      >
        {/* Section header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 3,
            pb: 2,
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={700}>
              System Settings
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Platform configuration
            </Typography>
          </Box>
        </Box>

        {/* Nav items */}
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <Box
              key={item.id}
              component={Link}
              to={settingsSectionPath(item.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                mb: 0.5,
                borderRadius: '8px',
                cursor: 'pointer',
                textDecoration: 'none',
                bgcolor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? 'primary.contrastText' : 'text.secondary',
                '&:hover': {
                  bgcolor: isActive ? 'primary.main' : alpha(theme.palette.primary.main, 0.08),
                  color: isActive ? 'primary.contrastText' : 'primary.main',
                },
                transition: 'all 0.15s ease',
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
              <Typography variant="body2" fontWeight={isActive ? 600 : 400}>
                {item.label}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Right content panel */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflowY: 'auto',
          p: 3,
        }}
      >
        <Box sx={{ width: '100%' }}>
          {activeSection === 'general' && <GeneralSettingsSection />}
          {activeSection === 'tax' && <TaxConfigSection />}
          {activeSection === 'sac' && <SACCodesSection />}
          {activeSection === 'categories' && <CategoriesSection />}
          {activeSection === 'services' && <ServicesSection />}
          {activeSection === 'sectors' && <SectorsSection />}
          {activeSection === 'ratings' && <RatingsSection />}
          {activeSection === 'project-management' && <ProjectManagementMasterSection />}
        </Box>
      </Box>
    </Box>
  )
}
