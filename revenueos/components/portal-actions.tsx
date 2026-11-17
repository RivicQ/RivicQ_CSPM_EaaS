"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckoutForm({
  prices,
  country,
  currency,
}: {
  prices: { id: string; label: string }[];
  country: string;
  currency: string;
}) {
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Creating secure checkout");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/checkout/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: form.get("priceId"),
        country,
        currency,
        quantity: Number(form.get("quantity") ?? 1),
      }),
    });
    const data = (await response.json()) as { error?: string; url?: string };
    if (!response.ok || !data.url) {
      setMessage(data.error ?? "Checkout failed");
      return;
    }
    window.location.assign(data.url);
    router.refresh();
  }

  if (!prices.length) {
    return <p className="text-sm text-slate-400">No subscription prices are available yet.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs uppercase tracking-wider text-violet-300/80">
        Plan
        <select
          name="priceId"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        >
          {prices.map((price) => (
            <option key={price.id} value={price.id}>
              {price.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs uppercase tracking-wider text-violet-300/80">
        Quantity
        <input
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
      >
        Start secure checkout
      </button>
      {message ? <p className="text-xs text-slate-300">{message}</p> : null}
    </form>
  );
}

export function PayQuotationButton({
  quotationId,
  disabled,
  label = "Pay securely",
}: {
  quotationId: string;
  disabled?: boolean;
  label?: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          setMessage("Creating secure checkout");
          const response = await fetch(`/api/quotations/${quotationId}/checkout`, { method: "POST" });
          const data = (await response.json()) as { error?: string; url?: string };
          if (!response.ok || !data.url) {
            setMessage(data.error ?? "Checkout failed");
            return;
          }
          window.location.assign(data.url);
        }}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {label}
      </button>
      {message ? <p className="mt-1 text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}

export function PortalActionButton({
  action,
  subscriptionId,
  label,
}: {
  action: "billing_portal" | "cancel_subscription";
  subscriptionId?: string;
  label: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          setMessage("Working");
          const response = await fetch("/api/portal/overview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, subscriptionId }),
          });
          const data = (await response.json()) as { error?: string; url?: string; status?: string };
          if (!response.ok) {
            setMessage(data.error ?? "Failed");
            return;
          }
          if (data.url) window.location.assign(data.url);
          else setMessage(data.status ?? "Updated");
        }}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
      >
        {label}
      </button>
      {message ? <p className="mt-1 text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}

export function SupportForm() {
  const [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage("Sending");
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/portal/overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "support_request",
            subject: form.get("subject"),
            message: form.get("message"),
          }),
        });
        const data = (await response.json()) as { error?: string };
        setMessage(response.ok ? "Request received" : (data.error ?? "Failed"));
        if (response.ok) event.currentTarget.reset();
      }}
      className="space-y-3"
    >
      <input
        name="subject"
        placeholder="Subject"
        required
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
      />
      <textarea
        name="message"
        placeholder="Describe your request"
        required
        minLength={10}
        className="h-24 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
      />
      <button
        type="submit"
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Send request
      </button>
      {message ? <p className="text-xs text-slate-300">{message}</p> : null}
    </form>
  );
}
