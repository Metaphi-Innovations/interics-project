import { formatInr } from '@/utils/formatters'
import type { ClientInvoiceLineItem } from '@/slices/live/types'
import {
  computeLineItemTaxBreakdown,
  rollupsFromLineItems,
} from './clientInvoiceUtils'

export type DraftInvoiceDownloadInput = {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  projectName: string
  clientName: string
  notes?: string
  milestoneName?: string
  serviceName?: string
  lineItems: Array<{
    serviceName: string
    amount: number
    labourCessRate?: number
    gstRate: number
    labourCessAmount?: number
    taxableAmount?: number
    gstAmount?: number
  }>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function lineRowsHtml(lines: DraftInvoiceDownloadInput['lineItems']): string {
  return lines
    .map((li) => {
      const taxed = computeLineItemTaxBreakdown(
        li.amount,
        li.labourCessRate ?? 0,
        li.gstRate,
      )
      return `<tr>
        <td>${escapeHtml(li.serviceName || '—')}</td>
        <td class="num">${formatInr(li.amount)}</td>
        <td class="num">${formatInr(li.labourCessAmount ?? taxed.labourCessAmount)}</td>
        <td class="num">${formatInr(li.taxableAmount ?? taxed.taxableAmount)}</td>
        <td class="num">${li.gstRate}%</td>
        <td class="num">${formatInr(li.gstAmount ?? taxed.gstAmount)}</td>
        <td class="num">${formatInr(taxed.grossAmount)}</td>
      </tr>`
    })
    .join('')
}

/** Opens a print-ready invoice document from local draft / saved invoice data. */
export function downloadClientInvoiceDocument(input: DraftInvoiceDownloadInput): void {
  const mappedLines: ClientInvoiceLineItem[] = input.lineItems.map((li, idx) => {
    const taxed = computeLineItemTaxBreakdown(li.amount, li.labourCessRate ?? 0, li.gstRate)
    return {
      id: `dl-${idx}`,
      serviceId: '',
      serviceName: li.serviceName,
      sacCode: '',
      amount: li.amount,
      labourCessRate: li.labourCessRate ?? 0,
      labourCessAmount: li.labourCessAmount ?? taxed.labourCessAmount,
      taxableAmount: li.taxableAmount ?? taxed.taxableAmount,
      gstRate: li.gstRate,
      gstAmount: li.gstAmount ?? taxed.gstAmount,
    }
  })
  const roll = rollupsFromLineItems(mappedLines)
  const title = input.invoiceNumber.trim() || 'Draft Invoice'
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 32px; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .muted { color: #666; margin-bottom: 20px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 24px; }
    .meta div span { display: block; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
    th { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
    td.num, th.num { text-align: right; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; border-top: 1px solid #111; margin-top: 6px; padding-top: 8px; }
    .notes { margin-top: 24px; white-space: pre-wrap; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="muted">${escapeHtml(input.projectName || 'Project')}</div>
  <div class="meta">
    <div><span>Client</span>${escapeHtml(input.clientName || '—')}</div>
    <div><span>Invoice date</span>${escapeHtml(input.invoiceDate || '—')}</div>
    <div><span>Due date</span>${escapeHtml(input.dueDate || '—')}</div>
    <div><span>Milestone</span>${escapeHtml(input.milestoneName || '—')}</div>
    <div><span>Service</span>${escapeHtml(input.serviceName || '—')}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th class="num">Amount</th>
        <th class="num">Labour cess</th>
        <th class="num">Taxable</th>
        <th class="num">GST %</th>
        <th class="num">GST</th>
        <th class="num">Gross</th>
      </tr>
    </thead>
    <tbody>${lineRowsHtml(input.lineItems)}</tbody>
  </table>
  <div class="totals">
    <div><span>Base</span><span>₹${formatInr(roll.baseAmount)}</span></div>
    <div><span>Labour cess</span><span>₹${formatInr(roll.labourCessAmount)}</span></div>
    <div><span>Taxable</span><span>₹${formatInr(roll.taxableAmount)}</span></div>
    <div><span>GST</span><span>₹${formatInr(roll.gstAmount)}</span></div>
    <div class="grand"><span>Total</span><span>₹${formatInr(roll.grossAmount)}</span></div>
  </div>
  ${
    input.notes?.trim()
      ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(input.notes.trim())}</div>`
      : ''
  }
  <script>window.onload = function () { window.focus(); window.print(); }</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^\w.-]+/g, '_')}.html`
    a.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
