/**
 * Generate a Vendor PO Word (.docx) document from project / vendor / PO fields.
 */
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
} from 'docx'
import type { Project } from '@/slices/projects/reducer'
import type { VendorPO } from '@/slices/baseline/reducer'
import type { CompanyProfile } from '@/slices/settings/reducer'
import { formatCurrency, formatDate } from '@/utils/formatters'

export type VendorPODocTemplate = 'trade_contract' | 'supply_installation'

export const VENDOR_PO_TEMPLATE_LABELS: Record<VendorPODocTemplate, string> = {
  trade_contract: 'Trade Contract',
  supply_installation: 'Supply & Installation',
}

function field(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: value || '—', size: 20 }),
    ],
  })
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  })
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text, size: 20 })],
  })
}

function divider(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 8 },
    },
    spacing: { after: 200 },
    children: [],
  })
}

export function templateDocumentTitle(
  template: VendorPODocTemplate,
  vendorName: string,
  poNumber: string,
): string {
  const label = VENDOR_PO_TEMPLATE_LABELS[template]
  return `${vendorName} — ${label} (${poNumber})`
}

export async function generateVendorPODocxBlob(input: {
  template: VendorPODocTemplate
  project: Project
  po: VendorPO
  company?: CompanyProfile | null
}): Promise<Blob> {
  const { template, project, po, company } = input
  const templateLabel = VENDOR_PO_TEMPLATE_LABELS[template]
  const projectLocation = [project.building, project.location].filter(Boolean).join(', ')
  const projectAddress = [
    project.address,
    project.city,
    project.state,
    project.pincode,
    project.country,
  ]
    .filter(Boolean)
    .join(', ')

  const companyBlock: Paragraph[] = company
    ? [
        heading('Issuer'),
        field('Company', company.companyName),
        field('GSTIN', company.gstin),
        field('Email', company.email),
        field('Phone', company.phone),
        field(
          'Address',
          [company.addressLine1, company.addressLine2, company.city, company.state, company.pincode]
            .filter(Boolean)
            .join(', '),
        ),
      ]
    : []

  const milestoneParas =
    po.milestones.length > 0
      ? po.milestones.map(
          (m, i) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: `${i + 1}. ${m.name} — ${m.percentage}% — ₹${formatCurrency(m.value)}${
                    m.dueDate ? ` — Due ${formatDate(m.dueDate)}` : ''
                  } (${m.status})`,
                  size: 20,
                }),
              ],
            }),
        )
      : [body('No milestones recorded on this PO.')]

  const intro =
    template === 'trade_contract'
      ? 'This Trade Contract sets out the commercial and execution terms between the Issuer and the Vendor for the works described below.'
      : 'This Supply & Installation agreement covers supply of materials and installation services by the Vendor for the project described below.'

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: templateLabel.toUpperCase(),
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: 'Purchase Order Document',
                size: 22,
                italics: true,
                color: '666666',
              }),
            ],
          }),
          divider(),
          body(intro),
          ...companyBlock,
          heading('Project'),
          field('Project Name', project.name),
          field('Project Code', project.projectCode),
          field('Customer', project.customerName),
          field('Status', project.status),
          field('Location', projectLocation || projectAddress || '—'),
          field('Address', projectAddress || '—'),
          field(
            'Carpet Area',
            project.carpetArea != null ? `${project.carpetArea} sqft` : '—',
          ),
          heading('Vendor'),
          field('Vendor Name', po.vendorName),
          field('Vendor ID', po.vendorId),
          heading('Purchase Order'),
          field('PO Number', po.poNumber),
          field('PO Date', formatDate(po.poDate)),
          field('PO Value', `₹${formatCurrency(po.poValue)}`),
          field(
            'Executed Value',
            po.executedValue != null ? `₹${formatCurrency(po.executedValue)}` : '—',
          ),
          field('Status', po.status),
          field('Payment Terms', po.paymentTerms?.trim() || '—'),
          field('Insurance', po.insurance ? 'Yes' : 'No'),
          field('Contract Signed', po.contractSigned ? 'Yes' : 'No'),
          field(
            'Required Documents Submitted',
            po.requiredDocumentsSubmitted ? 'Yes' : 'No',
          ),
          heading('Milestones'),
          ...milestoneParas,
          divider(),
          body(
            'This document was generated from Interics. Edit in Microsoft Word, then upload the final version back into the project.',
          ),
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Generated on ${formatDate(new Date().toISOString())}`,
                size: 18,
                color: '888888',
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Keep URL alive briefly so Word/OS can open the downloaded file; revoke later.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function openBlobInNewTab(blobUrl: string): void {
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
}
