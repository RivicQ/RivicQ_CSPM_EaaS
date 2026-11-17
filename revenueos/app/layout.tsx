import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RivicQ RevenueOS",
  description: "Commercial operations, pricing, subscriptions, audits, and revenue analytics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
