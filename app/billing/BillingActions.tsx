"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UpdatePaymentMethodModal from "@/components/billing/UpdatePaymentMethodModal";

type BillingActionsProps = {
  hasSubscription: boolean;
};

export default function BillingActions({ hasSubscription }: BillingActionsProps) {
  const router = useRouter();
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancelSubscription = async () => {
    const confirmed = window.confirm("Cancel at period end? You will retain access until your current period ends.");

    if (!confirmed) {
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to cancel subscription.");
      }

      router.refresh();
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Failed to cancel subscription.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsUpdateOpen(true)}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Update Payment Method
        </button>
        <button
          type="button"
          onClick={cancelSubscription}
          disabled={!hasSubscription || cancelLoading}
          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelLoading ? "Cancelling..." : "Cancel Subscription"}
        </button>
      </div>
      {cancelError ? <p className="mt-2 text-sm text-red-600">{cancelError}</p> : null}

      <UpdatePaymentMethodModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
