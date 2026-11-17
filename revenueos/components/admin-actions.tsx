"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FieldSpec = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  options?: string[];
};

export function AdminActionForm({
  title,
  endpoint,
  fields,
  method = "POST",
}: {
  title: string;
  endpoint: string;
  fields: FieldSpec[];
  method?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => {
        const field = fields.find((item) => item.name === key);
        return [key, field?.type === "number" ? Number(value) : value];
      }),
    );
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Request failed");
        return;
      }
      setMessage("Saved");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setMessage("Unable to reach the server");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-sm font-semibold text-violet-200">{title}</h3>
      {fields.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">{field.label}</span>
          {field.options ? (
            <select
              name={field.name}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Working" : "Submit"}
      </button>
      {message ? <p className="text-xs text-slate-300">{message}</p> : null}
    </form>
  );
}

export function PostButton({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <button
        type="button"
        onClick={async () => {
          setMessage("Working");
          const response = await fetch(endpoint, { method: "POST" });
          const data = (await response.json()) as { error?: string };
          setMessage(response.ok ? "Complete" : (data.error ?? "Failed"));
          router.refresh();
        }}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white"
      >
        {label}
      </button>
      {message ? <p className="mt-2 text-xs text-slate-300">{message}</p> : null}
    </div>
  );
}
