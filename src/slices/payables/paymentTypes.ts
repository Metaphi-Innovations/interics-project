/** Body for POST /vendor-invoices/:id/payments */
export interface RecordVendorPaymentPayload {
  date: string
  /** Cash outflow to vendor (bank); TDS is separate */
  amountPaid: number
  tdsDeducted: number
  paymentMode: 'bank_transfer' | 'cheque' | 'upi' | 'other'
  reference?: string
}
