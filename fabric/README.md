# RivicQ Graph

Labeled security-graph demo in this repository. **Not** a reskin of the RivicQ Community console. Formerly called NEXUS and Quantum Security Fabric (FABRIC).

Live labeled demo: https://rivicq.github.io/RivicQ_CSPM_EaaS/fabric/

Tagline: *See every asset. Understand every risk. Secure what comes next.*

## Honesty

- Synthetic **Northbridge Exchange** fixture only.
- Secret **names** and statuses. Never values, private keys, or tokens.
- Control mappings are **not** certifications of RivicQ Graph or of RivicQ GmbH.
- ML-KEM / ML-DSA / SLH-DSA are NIST-standardized concepts. No completed-migration claim.
- GitHub Pages does not collect payment or attach live cloud / IdP / vault credentials.
- Do not contribute customer data or secrets to this tree.
- Finding IDs remain `QSF-*` (historical). The public name is **RivicQ Graph**.
- `/nexus` on Pages redirects here so old bookmarks still resolve.

See [docs/FABRIC.md](../docs/FABRIC.md), [LEGAL.md](../LEGAL.md), [PRIVACY.md](../PRIVACY.md).

## Local

```bash
cd fabric
npm ci
npm run dev
```

The production base path is `/RivicQ_CSPM_EaaS/fabric/`. Use `npm run preview` after `npm run build` to exercise the same basename.
