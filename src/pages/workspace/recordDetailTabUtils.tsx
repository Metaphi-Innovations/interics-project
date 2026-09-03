import { useState } from 'react'
import { Box, Chip, IconButton, Link as MuiLink, Stack, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Download,
  FileText,
  IndianRupee,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
        whiteSpace: 'normal',
        overflow: 'visible',
        textOverflow: 'clip',
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
  if (filter === 'financial') return type === 'financial'
  if (filter === 'system')
    return type === 'record_created' || type === 'profile_edited' || type === 'status_changed'
  return true
}

export function formatActivityTimestamp(timestamp: string): string {
  const d = dayjs(timestamp)
  if (!d.isValid()) return 'Date unknown'

  const now = dayjs()
  if (d.isSame(now, 'day')) return `Today, ${d.format('h:mm A')}`
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `Yesterday, ${d.format('h:mm A')}`
  if (d.isAfter(now.subtract(6, 'day').startOf('day'))) return d.format('ddd, h:mm A')
  return d.format('DD MMM YYYY, h:mm A')
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
    case 'financial':
      return 'financial'
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
    case 'financial':
      return { Icon: IndianRupee, bg, iconColor }
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

export interface RecordDetailTaxDocCardDocument {
  name: string
  url: string
  description?: string | null
  uploadedBy?: string | null
  uploadedOn?: string | null
  lastUpdatedOn?: string | null
}

function formatComplianceTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function TaxDocDescription({ description }: { description: string }) {
  const theme = useTheme()
  const [expanded, setExpanded] = useState(false)
  const trimmed = description.trim()
  if (!trimmed) return null
  const likelyTruncated = trimmed.length > 140 || trimmed.split('\n').length > 3

  return (
    <Box sx={{ mt: theme.spacing(1.5) }}>
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
        Description
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mt: theme.spacing(0.5),
          fontSize: theme.typography.caption.fontSize,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          ...(!expanded && likelyTruncated
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : {}),
        }}
      >
        {trimmed}
      </Typography>
      {likelyTruncated ? (
        <Typography
          component="button"
          type="button"
          variant="caption"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            mt: theme.spacing(0.5),
            p: 0,
            border: 'none',
            bgcolor: 'transparent',
            color: 'primary.main',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: theme.typography.caption.fontSize,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {expanded ? 'Show Less' : 'Show More'}
        </Typography>
      ) : null}
    </Box>
  )
}

export interface RecordDetailTaxDocCardProps {
  variant: 'gst' | 'pan' | 'cheque' | 'insurance' | 'catalogue'
  title: string
  statusChip?: { label: string; isRegistered: boolean }
  showHeaderIcon?: boolean
  showUploadMeta?: boolean
  fieldLabel: string
  fieldValue: string | null
  document: RecordDetailTaxDocCardDocument | null
  emptyDocMessage: string
  onView: (url: string) => void
  onDownload: (url: string) => void
  onCopySuccess: () => void
  onDelete?: () => void
}

export function RecordDetailTaxDocCard({
  variant,
  title,
  statusChip,
  showHeaderIcon = true,
  showUploadMeta = true,
  fieldLabel,
  fieldValue,
  document,
  emptyDocMessage,
  onView,
  onDownload,
  onCopySuccess,
  onDelete,
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
          : variant === 'catalogue'
            ? theme.palette.primary.light
            : theme.palette.secondary.light

  const headerIconColor =
    variant === 'gst'
      ? theme.palette.success.dark
      : variant === 'pan'
        ? theme.palette.warning.dark
        : variant === 'cheque'
          ? theme.palette.info.dark
          : variant === 'catalogue'
            ? theme.palette.primary.dark
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
          {showHeaderIcon ? (
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
              ) : variant === 'catalogue' ? (
                <BookOpen size={18} strokeWidth={2} color={headerIconColor} />
              ) : variant === 'gst' || variant === 'insurance' ? (
                <ShieldCheck size={18} strokeWidth={2} color={headerIconColor} />
              ) : (
                <FileText size={18} strokeWidth={2} color={headerIconColor} />
              )}
            </Box>
          ) : null}
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

      {document?.description?.trim() ? (
        <TaxDocDescription description={document.description} />
      ) : null}

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
            ) : variant === 'catalogue' ? (
              <BookOpen size={18} strokeWidth={1.75} />
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
          {onDelete ? (
            <IconButton
              size="small"
              aria-label="Delete"
              onClick={onDelete}
              sx={{ color: 'error.main' }}
            >
              <Trash2 size={18} strokeWidth={1.75} />
            </IconButton>
          ) : null}
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
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {emptyDocMessage}
          </Typography>
        </Box>
      )}

      {showUploadMeta && (document?.uploadedOn || document?.uploadedBy) ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: theme.spacing(1), fontSize: theme.typography.caption.fontSize }}
        >
          {[
            document.uploadedOn ? `Uploaded ${formatComplianceTimestamp(document.uploadedOn)}` : null,
            document.uploadedBy ? document.uploadedBy : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      ) : null}
    </Box>
  )
}
