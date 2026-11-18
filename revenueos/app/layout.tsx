import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RivicQ RevenueOS",
  description: "Commercial operations, pricing, subscriptions, audits, and revenue analytics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="rvq-archify-backdrop" aria-hidden="true" />
        <div className="rvq-archify-rail" aria-hidden="true">
          {["Finding", "Analysis", "Engineering", "DevSecOps", "Evidence"].map((stage, index) => (
            <span className="rvq-archify-rail-stage" key={stage}>
              <span className="rvq-archify-rail-dot" />
              <span>{stage}</span>
              {index < 4 && <span className="rvq-archify-rail-link" />}
            </span>
          ))}
        </div>
        <main className="rvq-archify-content">{children}</main>
      </body>
    </html>
  );
}
