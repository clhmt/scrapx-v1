export type BillingSubscriptionSummary = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number | null;
  current_period_end: number | null;
  created: number;
};

export type BillingPaymentMethodSummary = {
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
};

export type BillingInvoiceSummary = {
  id: string;
  status: string | null;
  amount_paid: number;
  amount_due: number;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  number: string | null;
};

export type BillingSummaryResponse = {
  isPremium: boolean;
  customerId: string | null;
  hasSubscription: boolean;
  subscription: BillingSubscriptionSummary | null;
  paymentMethod: BillingPaymentMethodSummary | null;
  invoices: BillingInvoiceSummary[];
};
