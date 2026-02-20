"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { loadStripe, type StripeElements, type StripePaymentElement } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type UpdatePaymentMethodModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export default function UpdatePaymentMethodModal({ isOpen, onClose, onUpdated }: UpdatePaymentMethodModalProps) {
  const paymentElementRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementInstanceRef = useRef<StripePaymentElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setReady(false);
      return;
    }

    if (!stripePromise || !publishableKey) {
      setError("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
      return;
    }

    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        const setupIntentResponse = await fetch("/api/billing/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const payload = (await setupIntentResponse.json().catch(() => null)) as { clientSecret?: string; error?: string } | null;

        if (!setupIntentResponse.ok || !payload?.clientSecret) {
          throw new Error(payload?.error || "Unable to start payment method update.");
        }

        const stripe = await stripePromise;

        if (!stripe || !mounted) {
          return;
        }

        const elements = stripe.elements({
          clientSecret: payload.clientSecret,
          appearance: { theme: "stripe" },
        });

        const paymentElement = elements.create("payment");

        elementsRef.current = elements;
        paymentElementInstanceRef.current = paymentElement;

        if (paymentElementRef.current) {
          paymentElement.mount(paymentElementRef.current);
        }

        setReady(true);
      } catch (initError) {
        setError(initError instanceof Error ? initError.message : "Failed to initialize payment form.");
      } finally {
        setLoading(false);
      }
    };

    void init();

    return () => {
      mounted = false;
      paymentElementInstanceRef.current?.destroy();
      paymentElementInstanceRef.current = null;
      elementsRef.current = null;
    };
  }, [isOpen]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!elementsRef.current || !stripePromise) {
      setError("Payment form is not ready yet.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to initialize.");
      }

      const result = await stripe.confirmSetup({
        elements: elementsRef.current,
        redirect: "if_required",
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to confirm setup.");
      }

      const paymentMethodId = result.setupIntent?.payment_method;
      const resolvedPaymentMethodId = typeof paymentMethodId === "string" ? paymentMethodId : null;

      if (!resolvedPaymentMethodId) {
        throw new Error("Payment method was not returned by Stripe.");
      }

      const attachResponse = await fetch("/api/billing/attach-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: resolvedPaymentMethodId }),
      });

      const attachPayload = (await attachResponse.json().catch(() => null)) as { error?: string } | null;

      if (!attachResponse.ok) {
        throw new Error(attachPayload?.error || "Failed to save payment method.");
      }

      onUpdated();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update payment method.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Update payment method</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl border border-gray-200 p-4">
            {loading && !ready ? <p className="text-sm text-gray-500">Loading secure payment form...</p> : null}
            <div ref={paymentElementRef} />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? "Saving..." : "Save payment method"}
          </button>
        </form>
      </div>
    </div>
  );
}
