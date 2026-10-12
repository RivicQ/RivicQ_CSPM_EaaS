# Security Advisory — Secret History Remediation

Date: 2026-10-12
Status: Remediated in working tree; history purge pending decision

## Summary

A git-history audit of `RivicQ/RivicQ_CSPM_EaaS` found two **encrypted OpenSSH
ed25519 private keys** that were committed and later deleted:

| File | Type | Encrypted | Notes |
|------|------|-----------|-------|
| `rsaande` (+ `rsaande.pub`) | ed25519 private key | Yes (bcrypt KDF) | committed then deleted |
| `rsande` (+ `rsande.pub`) | ed25519 private key | Yes (bcrypt KDF) | committed then deleted |

Both keys were passphrase-protected (`bcrypt` KDF is present in the
`openssh-key-v1` container), which limits but does not eliminate exposure: if the
passphrase is weak or reused, the keys are recoverable. The files were still
present on disk (untracked) and are already matched by `.gitignore`
(`rsaande`, `rsaande.pub`, `rsande`, `rsande.pub`).

No other real secrets were found. The current tree contains only synthetic test
fixtures (e.g. `AKIAIOSFODNN7EXAMPLE`, `ghp_demoSyntheticTokenNotReal…`,
`whsec_test`, `sk_live_secret` in a unit test). `.env`, `web/.env`,
`web/.env.development`, and `web/.env.save` are gitignored and untracked.

## Remediation performed

- Deleted `rsaande`, `rsaande.pub`, `rsande`, `rsande.pub` from the working tree.
- Confirmed `.gitignore` already blocks them from re-addition.
- Verified the current tracked tree has no real credentials.

## Required action (owner)

1. **Rotate the affected keys immediately** if they were ever used for GitHub,
   deployment, or server access. Add/verify the replacement public keys on the
   relevant accounts and remove the old ones.
2. **Audit access** for any service that trusted those keys (GitHub deploy keys,
   CI secrets, SSH `authorized_keys`, cloud instances).
3. Confirm no passphrase reuse across other secrets.

## Optional: purge from history

The keys remain recoverable from history until history is rewritten. Purging is
**destructive** (rewrites commit SHAs) and must be coordinated with all forks
and clones. Recommended tooling:

```bash
# install: pipx install git-filter-repo
git filter-repo --invert-paths \
  --path rsaande --path rsaande.pub \
  --path rsande --path rsande.pub
git push --force --all
git push --force --tags
```

Then require collaborators to re-clone. Because history rewrite breaks existing
clones, do this only after owners agree (see `SECURITY.md` coordination policy).

## Prevention

- `.gitignore` blocks `*.env`, `.env.*`, `.env`, `secrets/`, `*.pem`, `*.key`,
  `*.ppk`, and the named key files.
- Pre-commit secret scanning is recommended: `gitleaks` / `trufflehog`.
- Never commit real credentials; use env vars or a secret manager.
