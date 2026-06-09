import type { ComplianceChipStatus, Vendor } from '../slices/vendors/reducer'

export const COMPLIANCE_EXPIRING_SOON_DAYS = 30

export type ComplianceChipTone = 'verified' | 'warning' | 'muted'

export type DocumentExpiryDisplayStatus = 'active' | 'expiring_soon' | 'expired'

export type VendorListingComplianceStatus = 'compliant' | 'expiring_soon' | 'expired'

export interface VendorComplianceChip {
  label: string
  tone: ComplianceChipTone
}

export interface VendorComplianceDocumentRow {
  id: string
  name: string
  uploadStatus: 'uploaded' | 'missing'
  expiryDate: string | null
  complianceStatus: DocumentExpiryDisplayStatus | null
  url: string | null
}

export interface VendorListingComplianceDisplay {
  status: VendorListingComplianceStatus
  label: string
  emoji: string
  statusBadgeType: 'paid' | 'at_risk' | 'overdue'
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Classify an ISO expiry date for insurance and dated certificates. */
export function getExpiryDisplayStatus(
  expiryIso?: string | null,
): DocumentExpiryDisplayStatus | null {
  if (!expiryIso) return null
  const exp = startOfDay(new Date(expiryIso))
  const now = startOfDay(new Date())
  if (exp < now) return 'expired'
  const soon = now + COMPLIANCE_EXPIRING_SOON_DAYS * 86400000
  if (exp <= soon) return 'expiring_soon'
  return 'active'
}

function toneForStatus(status: ComplianceChipStatus): ComplianceChipTone {
  if (status === 'verified') return 'verified'
  if (status === 'missing') return 'muted'
  return 'warning'
}

function formatShortExpiry(expiryIso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(expiryIso))
  } catch {
    return expiryIso
  }
}

function chipStatusFromExpiry(expiryIso?: string | null): ComplianceChipStatus {
  const display = getExpiryDisplayStatus(expiryIso)
  if (display === 'expired') return 'expired'
  if (display === 'expiring_soon') return 'expiring_soon'
  return 'verified'
}

function deriveGstStatus(vendor: Vendor): ComplianceChipStatus {
  if (!vendor.gstin?.trim() && vendor.gstStatus === 'Unregistered') return 'missing'
  if (!vendor.gstin?.trim()) return 'missing'
  return vendor.gstDocument ? 'verified' : 'missing'
}

function derivePanStatus(vendor: Vendor): ComplianceChipStatus {
  if (!vendor.pan?.trim()) return 'missing'
  return vendor.panDocument ? 'verified' : 'missing'
}

function deriveBankChequeStatus(vendor: Vendor): ComplianceChipStatus {
  return vendor.bankChequeDocument ? 'verified' : 'missing'
}

function deriveInsuranceStatus(vendor: Vendor): {
  status: ComplianceChipStatus
  expiryDate: string | null
} {
  const expiryDate = vendor.compliance?.insurance?.expiryDate ?? null
  const hasDoc = Boolean(vendor.insuranceDocument)

  if (!hasDoc) return { status: 'missing', expiryDate }
  if (expiryDate) {
    const byDate = chipStatusFromExpiry(expiryDate)
    return { status: byDate, expiryDate }
  }
  return { status: 'verified', expiryDate: null }
}

function resolveGstStatus(vendor: Vendor): ComplianceChipStatus {
  return vendor.compliance?.gst ?? deriveGstStatus(vendor)
}

function resolvePanStatus(vendor: Vendor): ComplianceChipStatus {
  return vendor.compliance?.pan ?? derivePanStatus(vendor)
}

function resolveBankStatus(vendor: Vendor): ComplianceChipStatus {
  return vendor.compliance?.bankCheque ?? deriveBankChequeStatus(vendor)
}

function resolveInsurance(vendor: Vendor): {
  status: ComplianceChipStatus
  expiryDate: string | null
} {
  if (vendor.compliance?.insurance) {
    const expiryDate = vendor.compliance.insurance.expiryDate ?? null
    let status = vendor.compliance.insurance.status
    if (expiryDate) {
      const byDate = chipStatusFromExpiry(expiryDate)
      if (byDate === 'expired') status = 'expired'
      else if (byDate === 'expiring_soon' && status !== 'missing') status = 'expiring_soon'
    }
    return { status, expiryDate }
  }
  return deriveInsuranceStatus(vendor)
}

function severityRank(status: ComplianceChipStatus): number {
  if (status === 'expired') return 3
  if (status === 'expiring_soon' || status === 'missing') return 2
  return 1
}

/** Overall vendor compliance for the listing column. */
export function getVendorListingCompliance(vendor: Vendor): VendorListingComplianceDisplay {
  const statuses = [
    resolveGstStatus(vendor),
    resolvePanStatus(vendor),
    resolveBankStatus(vendor),
    resolveInsurance(vendor).status,
  ]
  const max = Math.max(...statuses.map(severityRank))

  if (max >= 3) {
    return {
      status: 'expired',
      label: 'Expired',
      emoji: '🔴',
      statusBadgeType: 'overdue',
    }
  }
  if (max >= 2) {
    return {
      status: 'expiring_soon',
      label: 'Expiring Soon',
      emoji: '🟡',
      statusBadgeType: 'at_risk',
    }
  }
  return {
    status: 'compliant',
    label: 'Compliant',
    emoji: '✅',
    statusBadgeType: 'paid',
  }
}

function documentRowComplianceStatus(
  uploaded: boolean,
  expiryIso: string | null,
): DocumentExpiryDisplayStatus | null {
  if (!uploaded) return null
  if (!expiryIso) return 'active'
  return getExpiryDisplayStatus(expiryIso) ?? 'active'
}

/** Rows for the vendor detail compliance documents table. */
export function getVendorComplianceDocumentRows(vendor: Vendor): VendorComplianceDocumentRow[] {
  const insuranceExpiry = resolveInsurance(vendor).expiryDate

  const core: Omit<VendorComplianceDocumentRow, 'complianceStatus'>[] = [
    {
      id: 'gst-cert',
      name: 'GST Certificate',
      uploadStatus: vendor.gstDocument ? 'uploaded' : 'missing',
      expiryDate: null,
      url: vendor.gstDocument?.url ?? null,
    },
    {
      id: 'pan-card',
      name: 'PAN Card',
      uploadStatus: vendor.panDocument ? 'uploaded' : 'missing',
      expiryDate: null,
      url: vendor.panDocument?.url ?? null,
    },
    {
      id: 'bank-cheque',
      name: 'Cancelled Cheque',
      uploadStatus: vendor.bankChequeDocument ? 'uploaded' : 'missing',
      expiryDate: null,
      url: vendor.bankChequeDocument?.url ?? null,
    },
    {
      id: 'insurance',
      name: 'Insurance Document',
      uploadStatus: vendor.insuranceDocument ? 'uploaded' : 'missing',
      expiryDate: insuranceExpiry,
      url: vendor.insuranceDocument?.url ?? null,
    },
  ]

  const rows: VendorComplianceDocumentRow[] = core.map((row) => ({
    ...row,
    complianceStatus: documentRowComplianceStatus(
      row.uploadStatus === 'uploaded',
      row.expiryDate,
    ),
  }))

  const additional = vendor.additionalComplianceDocuments ?? []
  for (const doc of additional) {
    rows.push({
      id: doc.id,
      name: doc.name,
      uploadStatus: 'uploaded',
      expiryDate: doc.expiryDate ?? null,
      complianceStatus: documentRowComplianceStatus(true, doc.expiryDate ?? null),
      url: doc.url,
    })
  }

  return rows
}

export function documentComplianceBadge(
  status: DocumentExpiryDisplayStatus | null,
): { type: import('@/design-system/components').StatusType; label: string } | null {
  if (!status) return null
  if (status === 'expired') return { type: 'overdue', label: 'Expired' }
  if (status === 'expiring_soon') return { type: 'at_risk', label: 'Expiring Soon' }
  return { type: 'paid', label: 'Active' }
}

export function formatComplianceExpiry(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Build persisted compliance summary when saving vendor forms. */
export function buildVendorComplianceSnapshot(
  vendor: Pick<
    Vendor,
    | 'gstDocument'
    | 'panDocument'
    | 'bankChequeDocument'
    | 'insuranceDocument'
    | 'gstin'
    | 'pan'
    | 'gstStatus'
  >,
  insuranceExpiryDate?: string | null,
): import('../slices/vendors/reducer').VendorCompliance {
  const partial = vendor as Vendor
  let insuranceStatus: ComplianceChipStatus = 'missing'
  if (vendor.insuranceDocument) {
    insuranceStatus = insuranceExpiryDate
      ? chipStatusFromExpiry(insuranceExpiryDate)
      : 'verified'
  }

  return {
    gst: deriveGstStatus(partial),
    pan: derivePanStatus(partial),
    bankCheque: deriveBankChequeStatus(partial),
    insurance: {
      status: insuranceStatus,
      expiryDate: insuranceExpiryDate ?? null,
    },
  }
}

/**
 * Listing compliance column: compact chips only (GST, PAN, bank cheque, insurance).
 */
export function getVendorComplianceChips(vendor: Vendor): VendorComplianceChip[] {
  const gstRaw = resolveGstStatus(vendor)
  const panRaw = resolvePanStatus(vendor)
  const bankRaw = resolveBankStatus(vendor)
  const { status: insRaw, expiryDate: insuranceExpiry } = resolveInsurance(vendor)

  const gstLabel = gstRaw === 'verified' ? 'GST ✓' : 'GST'
  const panLabel = panRaw === 'verified' ? 'PAN ✓' : 'PAN'
  const bankLabel = bankRaw === 'verified' ? 'Bank ✓' : 'Bank'

  let insuranceLabel = 'Insurance'
  if (
    insuranceExpiry &&
    (insRaw === 'verified' || insRaw === 'expiring_soon' || insRaw === 'expired')
  ) {
    insuranceLabel = `Insurance (Exp: ${formatShortExpiry(insuranceExpiry)})`
  } else if (insRaw === 'verified') {
    insuranceLabel = 'Insurance ✓'
  }

  return [
    { label: gstLabel, tone: toneForStatus(gstRaw) },
    { label: panLabel, tone: toneForStatus(panRaw) },
    { label: bankLabel, tone: toneForStatus(bankRaw) },
    { label: insuranceLabel, tone: toneForStatus(insRaw) },
  ]
}
