# NEXUS Quantum Security Fabric

Original product identity in this repository. **Not** a reskin of the RivicQ Community console.

Live labeled demo: https://rivicq.github.io/RivicQ_CSPM_EaaS/nexus/

Tagline: *See every asset. Understand every risk. Secure what comes next.*

## Honesty

- Synthetic **Northbridge Exchange** fixture only.
- Secret **names** and statuses. Never values, private keys, or tokens.
- Control mappings are **not** certifications of NEXUS or of RivicQ GmbH.
- ML-KEM / ML-DSA / SLH-DSA are NIST-standardized concepts. No completed-migration claim.
- GitHub Pages does not collect payment or attach live cloud / IdP / vault credentials.
- Do not contribute customer data or secrets to this tree.

See [docs/NEXUS.md](../docs/NEXUS.md), [LEGAL.md](../LEGAL.md), [PRIVACY.md](../PRIVACY.md).

## Local

```bash
cd nexus
npm ci
npm run dev
```

The production base path is `/RivicQ_CSPM_EaaS/nexus/`. Use `npm run preview` after `npm run build` to exercise the same basename.
