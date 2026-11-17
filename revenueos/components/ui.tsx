import Link from "next/link";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-violet-500/20 bg-[#0d0b1c]/80 p-5 shadow-xl shadow-black/30 ${className}`}>
      {title ? <h2 className="mb-4 text-sm font-semibold tracking-wide text-violet-300">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-[#0b0918] p-5">
      <p className="text-xs uppercase tracking-widest text-violet-300/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "violet" }: { children: React.ReactNode; tone?: "violet" | "green" | "amber" | "red" }) {
  const tones = {
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
    green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    red: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>{children}</span>;
}

export function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-400">No records yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-violet-300/70">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-violet-500/20 px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/5 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-slate-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <header className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-400">{description}</p> : null}
    </header>
  );
}

export function ActionButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
    >
      {children}
    </Link>
  );
}
