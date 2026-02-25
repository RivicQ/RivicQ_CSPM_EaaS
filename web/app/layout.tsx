import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CryptoBOM SaaS",
  description:
    "Cryptographic Bill of Materials platform for quantum-safe banking compliance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
