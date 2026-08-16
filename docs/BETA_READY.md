# Beta ready checklist

Use this before inviting a design partner.

## Product
- [x] Homepage hero and scan CTA unchanged
- [x] Public GitHub URL produces a readable CBOM (or a clear error — never fabricated findings)
- [x] Discover → Analyze → Quantify + 5-step client workflow on the homepage
- [x] Community dashboard shows empty/error states instead of seeded crypto assets
- [x] Assets + Scanner export JSON and a simple PDF
- [x] Login / register / password reset (Supabase) preserved
- [x] `/beta` request form + Community lock screen CTA
- [x] Workspace id/name stored for the signed-in user
- [x] Button hover/focus/loading and `prefers-reduced-motion` kept

## Deploy
- [x] Docker Compose stack documented in `docs/DEPLOYMENT.md`
- [x] Helm charts under `deploy/helm/`
- [x] CI blockers for lint, docs, integration, containers, and CodeQL Advanced conflict addressed on PR #49
- [x] GitHub Pages workflow also runs from `cursor/beta-client-ready-dd72` so the public site can update before merge
- [ ] Confirm https://rivicq.github.io/RivicQ_CSPM_EaaS/ after the Pages job on this branch completes

## Partner briefing
- [ ] Share [QUICKSTART_CBOM.md](../QUICKSTART_CBOM.md) (10-minute first CBOM)
- [ ] Share [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)
- [ ] Collect feedback via in-app FAB or GitHub issues
