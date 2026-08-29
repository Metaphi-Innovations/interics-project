/** Body for POST /invoices/:id/payments */
export interface RecordPaymentPayload {
  date: string
  amountReceived: number
  tdsDeducted: number
  paymentMode: 'bank_transfer' | 'cheque' | 'upi' | 'cash' | 'other'
  reference?: string
}
