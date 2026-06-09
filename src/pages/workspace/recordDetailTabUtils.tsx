import { useState } from 'react'
import { Box, Chip, IconButton, Link as MuiLink, Stack, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import type { LucideIcon } from 'lucide-react'
import {
  Download,
  FileText,
  IndianRupee,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react'
import dayjs from 'dayjs'
import { Button } from '@/design-system/components'
import { tokens } from '@/design-system/tokens'
import type { ActivityEntry, ActivityType } from '../../slices/customers/reducer'

/** Right overview column: single subtle card (Primary + summary + actions). */
export function getRecordDetailOverviewRightCardSx(theme: Theme) {
  return {
    bgcolor: 'background.paper',
    border: '0.5px solid',
    borderColor: 'divider',
    borderRadius: tokens.borderRadius.lg,
    p: theme.spacing(1.75, 2),
    boxShadow: 'none',
  } as const
}

/** Documents & Tax cards. */
export function getRecordDetailTaxDocCardBoxSx(theme: Theme) {
  return {
    bgcolor: 'background.paper',
    border: '0.5px solid',
    borderColor: 'divider',
    borderRadius: tokens.borderRadius.lg,
    p: theme.spacing(1.5, 1.75),
    boxShadow: 'none',
  } as const
}

/** Left overview column: flat sections separated by bottom border. */
export function getRecordDetailFlatSectionSx(theme: Theme, options: { isLast: boolean }) {
  return {
    bgcolor: 'transparent',
    border: 'none',
    borderRadius: 0,
    p: 0,
    mb: options.isLast ? 0 : theme.spacing(2),
    pb: options.isLast ? 0 : theme.spacing(2),
    borderBottom: options.isLast ? 'none' : '0.5px solid',
    borderBottomColor: options.isLast ? 'transparent' : 'divider',
  } as const
}

export function RecordDetailSectionTitle({ children }: { children: string }) {
  const theme = useTheme()
  return (
    <Typography
      component="div"
      sx={{
        fontSize: theme.typography.caption.fontSize,
        fontWeight: 500,
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        mb: theme.spacing(1.5),
      }}
    >
      {children}
    </Typography>
  )
}

export function formatFullAddress(
  address: string | null,
  city: string,
  state: string,
  pincode?: string | null,
): string {
  const parts: string[] = []
  if (address?.trim()) parts.push(address.trim())
  const loc = [city, state].filter(Boolean).join(', ').trim()
  if (loc) parts.push(pincode ? `${loc} - ${pincode}` : loc)
  return parts.join('\n')
}

function neutralTagPair(theme: Theme): { bg: string; color: string } {
  return theme.palette.mode === 'dark'
    ? { bg: theme.palette.grey[800], color: theme.palette.grey[300] }
    : { bg: theme.palette.grey[100], color: theme.palette.grey[700] }
}

/** Theme-driven tag/specialization chip colors for customer & vendor detail. */
export function getRecordTagChipColors(tag: string, theme: Theme): { bg: string; color: string } {
  const t = tag.trim()
  const map: Record<string, { bg: string; color: string }> = {
    Civil: { bg: theme.palette.warning.light, color: theme.palette.warning.dark },
    Contractor: neutralTagPair(theme),
    Interior: { bg: theme.palette.secondary.light, color: theme.palette.secondary.dark },
    MEP: { bg: theme.palette.info.light, color: theme.palette.info.dark },
    Flooring: { bg: theme.palette.success.light, color: theme.palette.success.dark },
    HVAC: { bg: theme.palette.info.light, color: theme.palette.info.dark },
    Enterprise: { bg: theme.palette.info.light, color: theme.palette.info.dark },
    'Repeat Client': { bg: theme.palette.success.light, color: theme.palette.success.dark },
    SME: { bg: theme.palette.secondary.light, color: theme.palette.secondary.dark },
    'New Client': { bg: theme.palette.warning.light, color: theme.palette.warning.dark },
  }
  return map[t] ?? neutralTagPair(theme)
}

export function gstStatusHeaderPillSx(isRegistered: boolean, theme: Theme): { bg: string; color: string } {
  return isRegistered
    ? { bg: theme.palette.success.light, color: theme.palette.success.dark }
    : { bg: theme.palette.warning.light, color: theme.palette.warning.dark }
}

export type ActivityFilterCategory =
  | 'all'
  | 'profile'
  | 'documents'
  | 'contacts'
  | 'financial'
  | 'system'

export function activityMatchesFilter(
  type: ActivityType,
  filter: ActivityFilterCategory,
): boolean {
  if (filter === 'all') return true
  if (filter === 'profile') return type === 'profile_edited' || type === 'status_changed'
  if (filter === 'documents') return type === 'document_uploaded'
  if (filter === 'contacts')
    return type === 'contact_added' || type === 'contact_removed' || type === 'primary_changed'
  if (filter === 'financial') return false
  if (filter === 'system') return type === 'record_created'
  return true
}

export function formatActivityTimestamp(timestamp: string): string {
  const d = dayjs(timestamp)
  return d.isValid() ? d.format('DD MMM YYYY, h:mm A') : 'Date unknown'
}

export interface ActivityTimelineVisual {
  Icon: LucideIcon
  bg: string
  iconColor: string
}

type ActivityIconBucket = 'created' | 'updated' | 'document' | 'contact' | 'status' | 'financial' | 'system'

function activityBucket(type: ActivityType): ActivityIconBucket {
  switch (type) {
    case 'record_created':
      return 'created'
    case 'profile_edited':
      return 'updated'
    case 'document_uploaded':
      return 'document'
    case 'contact_added':
    case 'contact_removed':
    case 'primary_changed':
      return 'contact'
    case 'status_changed':
      return 'status'
    default:
      return 'system'
  }
}

function activityIconStyle(bucket: ActivityIconBucket, theme: Theme): { bg: string; color: string } {
  const map: Record<ActivityIconBucket, { bg: string; color: string }> = {
    created: { bg: theme.palette.success.light, color: theme.palette.success.dark },
    updated: { bg: theme.palette.info.light, color: theme.palette.info.dark },
    document: { bg: theme.palette.warning.light, color: theme.palette.warning.dark },
    contact: { bg: theme.palette.secondary.light, color: theme.palette.secondary.dark },
    status: { bg: theme.palette.primary.light, color: theme.palette.primary.dark },
    financial: { bg: theme.palette.primary.light, color: theme.palette.primary.dark },
    system: neutralTagPair(theme),
  }
  return map[bucket]
}

export function getActivityTimelineVisual(type: ActivityType, theme: Theme): ActivityTimelineVisual {
  const bucket = activityBucket(type)
  const { bg, color: iconColor } = activityIconStyle(bucket, theme)

  switch (type) {
    case 'record_created':
      return { Icon: Plus, bg, iconColor }
    case 'profile_edited':
      return { Icon: Pencil, bg, iconColor }
    case 'document_uploaded':
      return { Icon: FileText, bg, iconColor }
    case 'contact_added':
    case 'contact_removed':
    case 'primary_changed':
      return { Icon: User, bg, iconColor }
    case 'status_changed':
      return { Icon: RefreshCw, bg, iconColor }
    default:
      return { Icon: IndianRupee, bg, iconColor }
  }
}

export function filterActivityLog(
  log: ActivityEntry[],
  filter: ActivityFilterCategory,
): ActivityEntry[] {
  return log.filter((e) => activityMatchesFilter(e.type, filter))
}

export interface RecordDetailCopyIconButtonProps {
  value: string
  onCopied: () => void
  'aria-label'?: string
}

export function RecordDetailCopyIconButton({
  value,
  onCopied,
  'aria-label': ariaLabel = 'Copy',
}: RecordDetailCopyIconButtonProps) {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)
  const iconBtnSize = theme.spacing(3.5)
  const handleCopy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      onCopied()
      window.setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <IconButton size="small" onClick={handleCopy} aria-label={ariaLabel} sx={{ width: iconBtnSize, height: iconBtnSize }}>
      {copied ? (
        <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
      ) : (
        <ContentCopyIcon sx={{ fontSize: 16 }} />
      )}
    </IconButton>
  )
}

export interface RecordDetailTaxDocCardProps {
  variant: 'gst' | 'pan' | 'cheque' | 'insurance'
  title: string
  statusChip?: { label: string; isRegistered: boolean }
  fieldLabel: string
  fieldValue: string | null
  document: { name: string; url: string } | null
  emptyDocMessage: string
  uploadButtonLabel: string
  onView: (url: string) => void
  onDownload: (url: string) => void
  onCopySuccess: () => void
}

export function RecordDetailTaxDocCard({
  variant,
  title,
  statusChip,
  fieldLabel,
  fieldValue,
  document,
  emptyDocMessage,
  uploadButtonLabel,
  onView,
  onDownload,
  onCopySuccess,
}: RecordDetailTaxDocCardProps) {
  const theme = useTheme()
  const cardSx = getRecordDetailTaxDocCardBoxSx(theme)
  const mono =
    (theme.typography as { fontFamilyMonospace?: string }).fontFamilyMonospace ?? `'Courier New', monospace`

  const headerIconBg =
    variant === 'gst'
      ? theme.palette.success.light
      : variant === 'pan'
        ? theme.palette.warning.light
        : variant === 'cheque'
          ? theme.palette.info.light
          : theme.palette.secondary.light

  const headerIconColor =
    variant === 'gst'
      ? theme.palette.success.dark
      : variant === 'pan'
        ? theme.palette.warning.dark
        : variant === 'cheque'
          ? theme.palette.info.dark
          : theme.palette.secondary.dark

  return (
    <Box sx={cardSx}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: theme.spacing(1),
          mb: theme.spacing(1.5),
        }}
      >
        <Stack direction="row" alignItems="center" gap={theme.spacing(1.5)}>
          <Box
            component="span"
            aria-hidden
            sx={{
              width: theme.spacing(8),
              height: theme.spacing(8),
              borderRadius: tokens.borderRadius.lg,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: headerIconBg,
              color: headerIconColor,
            }}
          >
            {variant === 'cheque' ? (
              <IndianRupee size={18} strokeWidth={2} color={headerIconColor} />
            ) : variant === 'gst' || variant === 'insurance' ? (
              <ShieldCheck size={18} strokeWidth={2} color={headerIconColor} />
            ) : (
              <FileText size={18} strokeWidth={2} color={headerIconColor} />
            )}
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {title}
          </Typography>
        </Stack>
        {statusChip ? (
          <Chip
            label={statusChip.label}
            size="small"
            color={statusChip.isRegistered ? 'success' : 'warning'}
            variant="filled"
            sx={{
              fontWeight: 600,
              height: 22,
              fontSize: theme.typography.caption.fontSize,
              borderRadius: tokens.borderRadius.lg,
            }}
          />
        ) : null}
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'block',
          fontSize: theme.typography.caption.fontSize,
        }}
      >
        {fieldLabel}
      </Typography>
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: theme.spacing(0.5) }}>
        {fieldValue ? (
          <>
            <Typography
              variant="body2"
              sx={{
                fontFamily: mono,
                letterSpacing: '0.5px',
                fontWeight: 500,
                fontSize: theme.typography.body2.fontSize,
                flex: 1,
                minWidth: 0,
              }}
            >
              {fieldValue}
            </Typography>
            <RecordDetailCopyIconButton value={fieldValue} onCopied={onCopySuccess} />
          </>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        )}
      </Stack>

      {document ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: theme.spacing(1),
            mt: theme.spacing(1.5),
            pt: theme.spacing(1.5),
            borderTop: '0.5px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'primary.main', display: 'flex' }}>
            {variant === 'cheque' ? (
              <IndianRupee size={18} strokeWidth={1.75} />
            ) : variant === 'gst' || variant === 'insurance' ? (
              <ShieldCheck size={18} strokeWidth={1.75} />
            ) : (
              <FileText size={18} strokeWidth={1.75} />
            )}
          </Box>
          <MuiLink
            component="button"
            type="button"
            variant="body2"
            onClick={() => onView(document.url)}
            sx={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
              bgcolor: 'transparent',
              border: 'none',
              p: 0,
              textAlign: 'left',
            }}
          >
            {document.name}
          </MuiLink>
          <Button variant="text" color="primary" size="sm" onClick={() => onView(document.url)}>
            View
          </Button>
          <IconButton size="small" aria-label="Download" onClick={() => onDownload(document.url)}>
            <Download size={18} strokeWidth={1.75} />
          </IconButton>
        </Box>
      ) : (
        <Box
          sx={{
            mt: theme.spacing(1.5),
            pt: theme.spacing(1.5),
            borderTop: '0.5px solid',
            borderColor: 'divider',
          }}
        >
          <Stack gap={theme.spacing(1.5)} alignItems="flex-start">
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {emptyDocMessage}
            </Typography>
            <Box component="span" sx={{ display: 'inline-block' }} title="Upload is not available in this view">
              <Button variant="outlined" color="secondary" size="sm" disabled>
                {uploadButtonLabel}
              </Button>
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  )
}
