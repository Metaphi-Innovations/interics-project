import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import BusinessIcon from '@mui/icons-material/Business'
import ReceiptIcon from '@mui/icons-material/Receipt'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import CategoryIcon from '@mui/icons-material/Category'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import TagIcon from '@mui/icons-material/Tag'
import TuneIcon from '@mui/icons-material/Tune'
import type { SvgIconComponent } from '@mui/icons-material'
import { useAppDispatch } from '@/store/hooks'
import { fetchCompanyProfile } from '@/slices/settings/thunk'
import GeneralSettingsSection from './sections/GeneralSettingsSection'
import TaxConfigSection from './sections/TaxConfigSection'
import SACCodesSection from './sections/SACCodesSection'
import CategoriesSection from './sections/CategoriesSection'
import ServicesSection from './sections/ServicesSection'
import NumberingSchemesSection from './sections/NumberingSchemesSection'
import SystemDefaultsSection from './sections/SystemDefaultsSection'

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
  { id: 'numbering', label: 'Numbering Schemes', icon: TagIcon },
  { id: 'defaults', label: 'System Defaults', icon: TuneIcon },
]

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const [activeSection, setActiveSection] = useState('general')

  useEffect(() => {
    dispatch(fetchCompanyProfile())
  }, [dispatch])

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
    >
      {/* Left nav panel */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid #E8EEEC',
          bgcolor: '#FFFFFF',
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
            borderBottom: '1px solid #F0F0F0',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              bgcolor: '#E8F5F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon sx={{ fontSize: 18, color: '#107E68' }} />
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
              onClick={() => setActiveSection(item.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                mb: 0.5,
                borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: isActive ? '#107E68' : 'transparent',
                color: isActive ? '#FFFFFF' : 'text.secondary',
                '&:hover': {
                  bgcolor: isActive ? '#107E68' : '#F0FAF8',
                  color: isActive ? '#FFFFFF' : '#107E68',
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
          overflowY: 'auto',
          p: 3,
          bgcolor: '#F8FAFB',
        }}
      >
        <Box
          sx={{
            maxWidth: 860,
            bgcolor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E8EEEC',
            p: 3,
            minHeight: '100%',
          }}
        >
          {activeSection === 'general' && <GeneralSettingsSection />}
          {activeSection === 'tax' && <TaxConfigSection />}
          {activeSection === 'sac' && <SACCodesSection />}
          {activeSection === 'categories' && <CategoriesSection />}
          {activeSection === 'services' && <ServicesSection />}
          {activeSection === 'numbering' && <NumberingSchemesSection />}
          {activeSection === 'defaults' && <SystemDefaultsSection />}
        </Box>
      </Box>
    </Box>
  )
}
