import { useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { tokens } from '@/design-system/tokens'
import { useAppDispatch, useAppSelector } from '../../../../store/hooks'
import { fetchVersions } from '../../../../slices/pitch/thunk'
import type { PitchCategory, PitchVersion } from '../../../../slices/pitch/reducer'
import { fetchClientPO } from '../../../../slices/baseline/thunk'
import type { ClientPO } from '../../../../slices/baseline/reducer'
import { formatCurrency } from '../../../../utils/formatters'
import { ClientPOSection } from '../../components/ClientPOSection'
import { AddClientPODrawer, ViewClientPODrawer } from './ClientPOBillingDrawers'

const SUBSECTION_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  p: 2,
  bgcolor: 'background.paper',
  height: '100%',
  minWidth: 0,
} as const

const SECTION_NAMES = ['Design & Diligence', 'Build Services', 'Consultancy'] as const

function normalizeName(v: string): string {
  return v.trim().toLowerCase()
}

function serviceDisplayName(service: PitchCategory['services'][number]): string {
  return service.subcategoryName ?? service.name ?? service.customName ?? '—'
}

function EmptyHint({ children }: { children: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2, textAlign: 'center' }}>
      {children}
    </Typography>
  )
}

function SubsectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="subtitle1" sx={{ fontSize: 15, fontWeight: 600 }}>
      {children}
    </Typography>
  )
}

function ClientOfferSection({ version }: { version: PitchVersion | null }) {
  const clientOfferSections = useMemo(() => {
    if (!version) return []
    const byName = new Map(
      version.categories.map((c) => [normalizeName(c.categoryName), c]),
    )
    const sections: { key: string; title: string; category: PitchCategory }[] = []
    const seen = new Set<string>()
    for (const name of SECTION_NAMES) {
      const cat = byName.get(normalizeName(name))
      if (cat) {
        sections.push({ key: cat.id, title: cat.categoryName, category: cat })
        seen.add(cat.id)
      }
    }
    for (const cat of version.categories) {
      if (!seen.has(cat.id)) {
        sections.push({ key: cat.id, title: cat.categoryName, category: cat })
      }
    }
    return sections
  }, [version])

  return (
    <Box sx={SUBSECTION_SX}>
      <Stack sx={{ mb: 1.5 }}>
        <SubsectionTitle>Client Offer</SubsectionTitle>
      </Stack>

      {!version ? (
        <EmptyHint>No client offer on file. Add services on the Pitch tab.</EmptyHint>
      ) : (
        <>
          {clientOfferSections.map((section) => {
            const { category } = section
            const serviceCount = category.services.length
            return (
              <Accordion
                key={section.key}
                disableGutters
                sx={{
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                  borderRadius: '8px !important',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore sx={{ fontSize: 20 }} />}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ width: '100%', pr: 0.5 }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{section.title}</Typography>
                    <Chip
                      size="small"
                      label={`${serviceCount} service${serviceCount === 1 ? '' : 's'}`}
                      sx={{ fontSize: 10, height: 20 }}
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                  {serviceCount === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      No services in this category.
                    </Typography>
                  ) : (
                    <Stack gap={0.75}>
                      {category.services.map((service) => (
                        <Box
                          key={service.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            py: 0.5,
                            px: 0.5,
                            borderRadius: 1,
                            bgcolor: 'background.default',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, minWidth: 0, flex: 1 }}
                            title={serviceDisplayName(service)}
                          >
                            {serviceDisplayName(service)}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                          >
                            ₹{formatCurrency(service.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </>
      )}
    </Box>
  )
}

interface BillingPitchSummaryProps {
  projectId: string
}

export function BillingPitchSummary({ projectId }: BillingPitchSummaryProps) {
  const dispatch = useAppDispatch()
  const { activeVersion, loading: pitchLoading } = useAppSelector((s) => s.pitch)
  const { clientPOs } = useAppSelector((s) => s.baseline)

  const [addPOOpen, setAddPOOpen] = useState(false)
  const [viewPO, setViewPO] = useState<ClientPO | null>(null)

  useEffect(() => {
    void dispatch(fetchVersions(projectId))
    void dispatch(fetchClientPO(projectId))
  }, [dispatch, projectId])

  const pitchVersion = useMemo(() => {
    if (!activeVersion || activeVersion.projectId !== projectId) return null
    return activeVersion
  }, [activeVersion, projectId])

  const projectClientPOs = useMemo(
    () => clientPOs.filter((po) => po.projectId === projectId),
    [clientPOs, projectId],
  )

  const loading = pitchLoading && !pitchVersion

  return (
    <>
      <Box
        component="section"
        aria-label="Receivable pitch summary"
        sx={{
          width: '100%',
          mb: 3,
          p: { xs: 2, md: 3 },
          border: `1px solid ${tokens.color.neutral[100]}`,
          borderRadius: tokens.borderRadius.xl,
          bgcolor: 'background.paper',
          boxShadow: tokens.shadow.sm,
          boxSizing: 'border-box',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontSize: 11 }}>
          Read-only pitch summary. Edit offer, vendor, and expense data on the Pitch tab.
        </Typography>

        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, py: 2 }}>
            Loading pitch summary…
          </Typography>
        ) : (
          <Stack gap={2}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'stretch',
              }}
            >
              <ClientOfferSection version={pitchVersion} />
              <ClientPOSection
                clientPOs={projectClientPOs}
                onAddPO={() => setAddPOOpen(true)}
                onViewPO={setViewPO}
              />
            </Box>

          </Stack>
        )}
      </Box>

      <AddClientPODrawer open={addPOOpen} onClose={() => setAddPOOpen(false)} projectId={projectId} />
      <ViewClientPODrawer
        open={!!viewPO}
        onClose={() => setViewPO(null)}
        projectId={projectId}
        po={viewPO}
      />
    </>
  )
}
