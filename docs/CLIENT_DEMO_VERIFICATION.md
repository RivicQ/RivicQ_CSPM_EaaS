# Client demo verification

Send this page. It is the check a client runs before a pilot. Control mappings are not certifications. GitHub Pages does not attach the client’s estate.

## 1. GitHub Pages walkthrough (no password)

Live site, after this change is on `main`:

https://rivicq.github.io/RivicQ_CSPM_EaaS/

| Step | Open | What “pass” looks like |
|---|---|---|
| 1 | `/demo` or **Enter the interactive demo** on `/login` | Labeled Community workspace. Sample data, not the client’s systems |
| 2 | `/scanner` | Short header. **Discover / Mitigate / Report** strip. **Start CBOM scan** is readable. No full-page diagram |
| 3 | `/docs/` | Same three phases. Operator map is a short plate. **Open diagram** goes to Archify |
| 4 | `/archify/site/index.html#diagrams` | Full-stage maps. This is the only large diagram |
| 5 | `/fabric/` | Graph landing says Discover → Mitigate → Report |

Pages is Community. Choosing Enterprise on `/switcher` does not issue a license and does not log into RivicQ production.

## 2. Evaluation API on the client’s infrastructure

These values work only on a host the client starts with this environment. They are not RivicQ production accounts, not mailboxes, and not a GitHub Pages login. Do not put them on a customer load balancer. Set `DEMO_MODE` only on that evaluation host.

```bash
CRYPTOBOM_LICENSE_KEY=ENT-rivicq-client-lab-2026
CRYPTOBOM_ENV=development
DEMO_MODE=true
RIVICQ_ALLOW_DEMO_MODE=1
JWT_SECRET=<openssl rand -hex 48>
AUTH_BOOTSTRAP_EMAIL=admin@rivicq.local
AUTH_BOOTSTRAP_PASSWORD='RivicQ-Lab-2026!'
AUTH_BOOTSTRAP_ROLE=admin
```

The license string is an evaluation flag (`ENT-` and at least 20 characters). It is not a purchased contract. Replace the password before any shared network.

Start the Enterprise API (port 9090 when the key is set) and the console with `REACT_APP_API_URL` pointed at that API. On first empty database, `DEMO_MODE` seeds these local users with the bootstrap password:

| Email | Role | Password |
|---|---|---|
| `admin@rivicq.local` | admin (bootstrap) | `RivicQ-Lab-2026!` |
| `admin@rivicq.com` | admin | `RivicQ-Lab-2026!` |
| `operator@rivicq.com` | operator | `RivicQ-Lab-2026!` |
| `analyst@rivicq.com` | analyst | `RivicQ-Lab-2026!` |
| `sales@rivicq.com` | viewer | `RivicQ-Lab-2026!` |

`admin@rivicq.com` and `sales@rivicq.com` here are database rows on that host. They are not the public desks `admin@` / `sales@` on the company mail system. Do not mail this password to those addresses.

## 3. Checks on that API

| Check | Pass |
|---|---|
| `GET /edition` | `edition` is enterprise |
| `POST /api/v1/scans` with `https://example.com` | Completes. Intelligence includes `client_architecture` phases discover, mitigate, report |
| `GET /api/v1/scans/:id/qbom` | 200 on this licensed process. The same route is 403 when the key is absent |
| Firmware target | Inventory metadata only. No binary reverse engineering and no key extraction |
| `/readyz` | Stays failing while `DEMO_MODE` or demo-mode storage is on. That is intentional |

Community without the license key stays on port 8080 and does not serve the Enterprise pack.

## 4. What this demo does not do

- It does not scan the client’s private network until they point the API at a target their policy allows.
- It does not rotate keys, call IBM Quantum, or certify DORA / ISO / PCI / SOC 2.
- It does not log anyone into the public GitHub Pages site with the table above.
