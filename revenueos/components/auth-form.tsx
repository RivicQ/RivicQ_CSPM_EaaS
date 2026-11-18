"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "login"
        ? { email: form.get("email"), password: form.get("password") }
        : {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            organization: form.get("organization"),
            country: form.get("country"),
          };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      if (mode === "register") {
        setSuccess(data.message ?? "Registration received. Verify email ownership before signing in.");
        (event.target as HTMLFormElement).reset();
        return;
      }
      router.push(data.redirectTo ?? "/portal");
      router.refresh();
    } catch {
      setError("Unable to reach the server");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" ? (
        <Field name="name" label="Full name" type="text" required />
      ) : null}
      <Field name="email" label="Email" type="email" required />
      {mode === "register" ? (
        <>
          <Field name="organization" label="Organization" type="text" required />
          <Field name="country" label="Country code" type="text" placeholder="DE" required />
        </>
      ) : null}
      <Field name="password" label="Password" type="password" minLength={12} required />
      {mode === "register" ? (
        <p className="text-xs text-slate-400">Use 12-72 characters. Email verification is required before sign-in.</p>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {pending ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type,
  required,
  minLength,
  placeholder,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-violet-300/80">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-violet-500/20 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
      />
    </label>
  );
}
