import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const bookingUrl = process.env.NEXT_PUBLIC_ZOHO_BOOKINGS_URL || "https://zoho141.zohobookings.eu/RivicQ";
const paymentUrl =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL ||
  "https://buy.stripe.com/aFadR99Pr0cldxT4Qf0ZW00";
const openSourceUrl = "https://github.com/RivicQ/RivicQ_CSPM_EaaS";
const cloudUrl = "https://rivicq.com/#cloud";
const referenceUrl = `${openSourceUrl}/tree/main/docs`;

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true, kind: "SAAS" },
    include: {
      prices: {
        where: { active: true },
        include: { regionalPrices: { where: { active: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/rivicq-logo.svg" alt="RivicQ" width={40} height={40} />
          <span className="text-lg font-semibold tracking-tight text-white">RivicQ</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
          <Link href="/console" className="text-slate-300 hover:text-white">
            Console
          </Link>
          <a href={openSourceUrl} className="text-slate-300 hover:text-white">
            Open Source
          </a>
          <a href={cloudUrl} className="text-slate-300 hover:text-white">
            Cloud
          </a>
          <a href={referenceUrl} className="text-slate-300 hover:text-white">
            Reference
          </a>
          <Link href="/portal" className="text-slate-300 hover:text-white">
            Portal
          </Link>
          <a
            href={bookingUrl}
            className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500"
          >
            Book a call
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
        <div className="max-w-3xl">
          <p className="rise text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Post-quantum security for European and Indian teams
          </p>
          <h1 className="rise rise-delay-1 mt-5 text-5xl font-semibold leading-tight text-white sm:text-6xl">
            Quantum-safe operations, billed and governed in one place.
          </h1>
          <p className="rise rise-delay-2 mt-6 text-lg leading-8 text-slate-300">
            RivicQ combines post-quantum encryption guidance, audit readiness, and managed
            security subscriptions with transparent regional pricing and a governed customer
            portal.
          </p>
          <div className="rise rise-delay-3 mt-8 flex flex-wrap gap-3">
            <a
              href={bookingUrl}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white"
            >
              Book a security review
            </a>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Buy now
            </a>
            <Link
              href="/#pricing"
              className="rounded-xl border border-violet-400/30 px-6 py-3 text-sm font-semibold text-violet-100"
            >
              View live pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Direct purchase opens Stripe-hosted checkout. RevenueOS billing stays in test mode until live server secrets are configured.
          </p>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Live catalogue
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Transparent pricing</h2>
            <p className="mt-2 text-sm text-slate-400">
              Prices are read directly from the revenue catalogue; no figures are hardcoded in the
              browser.
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            TEST MODE catalogue
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {products.map((product) => {
            const eur = product.prices.find((price) => price.currency.toUpperCase() === "EUR");
            const inr = product.prices.find((price) => price.currency.toUpperCase() === "INR");
            return (
              <article
                key={product.id}
                className="rise rounded-2xl border border-violet-500/20 bg-[#0d0b1c]/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40"
              >
                <h3 className="text-xl font-semibold text-white">{product.name}</h3>
                <p className="mt-2 min-h-16 text-sm text-slate-400">{product.description}</p>
                <div className="mt-5 space-y-2">
                  {eur ? (
                    <p className="text-2xl font-semibold text-white">
                      {formatMoney(eur.unitAmount, eur.currency)}
                      <span className="ml-2 text-xs font-normal text-slate-400">/ month</span>
                    </p>
                  ) : null}
                  {inr ? (
                    <p className="text-sm text-slate-300">
                      India: {formatMoney(inr.unitAmount, inr.currency, "en-IN")} / month
                    </p>
                  ) : null}
                </div>
                <Link
                  href="/portal"
                  className="mt-6 block rounded-xl bg-violet-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-violet-500"
                >
                  Choose {product.name}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
        {[
          {
            title: "Audit-ready evidence",
            body: "Quotations, deliverables, invoices, and payments remain linked for a defensible audit trail.",
          },
          {
            title: "Regional commercial terms",
            body: "Versioned price books, India and Europe price books, tax rules, and FX metadata are resolved server-side.",
          },
          {
            title: "Founder-controlled billing",
            body: "Stripe stays in test mode until explicit approvals are present; live credentials never reach the browser.",
          },
        ].map((item) => (
          <div key={item.title} className="rise rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-violet-500/20 bg-[#0d0b1c]/80 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Direct access
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Everything in one place</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["RivicQ Console", "/console", "Open the role-aware console"],
              ["Open Source", openSourceUrl, "Read and fork the Community source"],
              ["Security Cloud", cloudUrl, "Explore multi-cloud posture"],
              ["Reference", referenceUrl, "Browse architecture and operations docs"],
              ["Production animation", "/animation.html", "Watch the platform flow"],
            ].map(([label, href, note]) => (
              <a
                key={label}
                href={href}
                className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-cyan-400/40 hover:bg-cyan-500/5"
              >
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs text-slate-400">{note}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
