# Known limitations (Beta)

Honest constraints for design partners testing RivicQ CryptoBOM on GitHub Pages and local engines. Internal test fixtures are unchanged.

## Severity ranked

### P0 — blocks a first public scan
- The live site is a static GitHub Pages app. There is no Go API on `rivicq.github.io`. Homepage CBOM scans therefore use an in-browser public GitHub analyzer (Contents + raw files, rate-limited). Private repos, containers, and live TLS endpoints require a local or self-hosted engine (`make dev-stack` or Docker Compose).
- GitHub unauthenticated API allows ~60 requests/hour. Large trees are sampled (about 36 files). This is a readable CBOM, not a full SAST/SCA pipeline.

### P1 — Community workspace
- Scan history, inventory, and risk scores are empty until a scan succeeds against a reachable engine **or** you export a homepage public-GitHub report.
- Recurring schedules persist in `localStorage` for this browser only; they do not fire on a server until the engine scheduler is connected.
- Password reset uses Supabase `resetPasswordForEmail`. It requires a configured Supabase project and email templates.
- Edition can still be selected in `/switcher`. Enterprise routes stay gated; request access via `/beta`.

### P2 — Enterprise client testing
- AWS / Azure / GCP / IBM inventory returns empty with a credentials message when secrets are missing (graceful degradation). No fabricated resource counts.
- The downloadable DORA Art. 9 + BSI TR-02102-1 + eIDAS 2.0 PDF is generated from live compliance payloads when present; otherwise it is a structured empty report, not a demo pack.
- Audit logging is workspace-local until the Enterprise API audit store is connected.
- IBM Quantum attestation falls back to classical scoring without an IBMQ key.

### P3 — Product polish
- The AI assistant may still quote labelled demo context when APIs are empty (`demoMode: true`). Dashboard, Assets, Scanner, and Analytics user-facing tables do not.
- GitHub Pages default edition is Community. Professional/Enterprise remain selectable after login.
- Simple PDF export is a compact Helvetica text PDF (no charts) so Community export works without extra npm dependencies.

## What is in-scope for this beta
- Public GitHub CBOM on the homepage with algorithms, key sizes, quantum flag, and BSI/DORA/eIDAS mapping
- Community login (Supabase or engine JWT), scan list, inventory, risk summary, JSON + PDF export
- Join Beta / Request Enterprise Access
- Docker Compose + Helm air-gapped path (see [DEPLOYMENT.md](DEPLOYMENT.md))
