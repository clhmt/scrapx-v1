import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import BillingActions from "@/app/billing/BillingActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedBillingSummary } from "@/lib/billing/getBillingSummary";
import type { BillingSummaryResponse } from "@/types/billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTimestamp(unixSeconds: number | null): string {
  if (!unixSeconds) {
    return "—";
  }

  return new Date(unixSeconds * 1000).toLocaleDateString();
}

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function statusStyles(status?: string): string {
  switch (status) {
    case "active":
    case "trialing":
      return "bg-green-100 text-green-800";
    case "past_due":
    case "unpaid":
      return "bg-yellow-100 text-yellow-800";
    case "canceled":
    case "incomplete_expired":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

type BillingPageProps = {
  searchParams?: { sync?: string; session_id?: string };
};

async function runExplicitBillingSync(searchParams?: { sync?: string; session_id?: string }): Promise<string | null> {
  if (searchParams?.sync !== "1" || !searchParams.session_id) {
    return null;
  }

  const cookieHeader = (await cookies()).toString();
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  if (!host) {
    return "We could not verify your payment yet. Please retry sync.";
  }

  const syncUrl = `${protocol}://${host}/api/billing/sync?session_id=${encodeURIComponent(searchParams.session_id)}`;

  const response = await fetch(syncUrl, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return "Your payment was received, but activation is still syncing. Please retry.";
  }

  return null;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const resolvedSearchParams = searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const syncError = await runExplicitBillingSync(resolvedSearchParams);

  const emptySummary: BillingSummaryResponse = {
    isPremium: false,
    customerId: null,
    hasSubscription: false,
    subscription: null,
    paymentMethod: null,
    invoices: [],
  };

  let summary = emptySummary;
  let stripeCustomerId: string | null = null;

  try {
    const billing = await getAuthenticatedBillingSummary();

    if (!billing) {
      redirect("/auth");
    }

    summary = billing.summary;
    stripeCustomerId = billing.summary.customerId;
  } catch {
    console.error("[billing] summary failed", {
      userId: user.id,
      hasCustomer: Boolean(stripeCustomerId),
    });
  }

  const hasSubscription = summary.hasSubscription;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>

        {syncError ? (
          <section className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <p>{syncError}</p>
            <Link href={`/billing?sync=1&session_id=${encodeURIComponent(resolvedSearchParams?.session_id ?? "")}`} className="mt-2 inline-block font-semibold underline">
              Retry activation sync
            </Link>
          </section>
        ) : null}

        {!hasSubscription ? (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No active subscription</h2>
            <p className="mt-2 text-sm text-gray-600">You’re currently on the Free plan. Upgrade to unlock premium features.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/pricing" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                Upgrade
              </Link>
              <Link
                href="/profile"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 hover:text-gray-900"
              >
                Back to Profile
              </Link>
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Plan status</h2>
            {summary.subscription ? (
              <div className="mt-4 space-y-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusStyles(summary.subscription.status)}`}>
                  {summary.subscription.status.replaceAll("_", " ")}
                </span>
                {summary.subscription.status === "past_due" ? (
                  <p className="text-sm text-yellow-700">Your subscription payment is past due. Please update your payment method.</p>
                ) : null}
                {summary.subscription.cancel_at_period_end ? (
                  <p className="text-sm text-red-700">Your subscription will cancel at the end of the current billing period.</p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Plan: Free (Inactive)</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Subscription dates</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Start</dt>
                <dd className="font-medium text-gray-900">{formatTimestamp(summary.subscription?.current_period_start ?? null)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Next renewal</dt>
                <dd className="font-medium text-gray-900">{formatTimestamp(summary.subscription?.current_period_end ?? null)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium text-gray-900">{formatTimestamp(summary.subscription?.created ?? null)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Payment method</h2>
          {summary.paymentMethod ? (
            <p className="mt-3 text-sm text-gray-700">
              {summary.paymentMethod.brand?.toUpperCase()} ending in {summary.paymentMethod.last4} · Expires {summary.paymentMethod.exp_month}/
              {summary.paymentMethod.exp_year}
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No payment method on file.</p>
          )}

          <div className="mt-4">
            <BillingActions hasSubscription={hasSubscription} />
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
          {summary.invoices.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-4 text-gray-700">{formatTimestamp(invoice.created)}</td>
                      <td className="py-3 pr-4 text-gray-900">{formatCurrency(invoice.amount_paid || invoice.amount_due)}</td>
                      <td className="py-3 pr-4 text-gray-700">{invoice.status ?? "unknown"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-3">
                          {invoice.hosted_invoice_url ? (
                            <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">
                              View
                            </a>
                          ) : null}
                          {invoice.invoice_pdf ? (
                            <a href={invoice.invoice_pdf} target="_blank" rel="noreferrer" className="text-green-700 hover:underline">
                              PDF
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No invoices found yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
