/**
 * OSS stub for the enterprise Core Dashboard.
 *
 * The full implementation lives in the private enterprise edition.
 * This file ensures `next build` succeeds in the public OSS repository
 * without importing enterprise-only modules.
 *
 * To enable the enterprise dashboard, sync from the private edition.
 */

const IS_ENTERPRISE = process.env.NEXT_PUBLIC_EDITION === "enterprise";

export default function CoreDashboardPage() {
  if (IS_ENTERPRISE) {
    // This branch is never reached in the OSS build; it exists so that
    // tree-shaking works correctly when the enterprise edition is synced.
    return null;
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontFamily: "system-ui, sans-serif",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        Enterprise feature — available in the private edition
      </h1>
      <p style={{ color: "#555", maxWidth: "480px" }}>
        The Core Dashboard (real-time CBOM analytics, quantum-risk scoring, and
        eIDAS 2.0 compliance reports) is part of the CryptoBOM Enterprise
        Edition.
      </p>
      <a
        href="https://rivic.xyz"
        style={{
          marginTop: "1rem",
          padding: "0.6rem 1.4rem",
          background: "#0070f3",
          color: "#fff",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Learn more →
      </a>
    </main>
  );
}
