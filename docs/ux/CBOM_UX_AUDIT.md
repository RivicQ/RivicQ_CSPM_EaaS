# CBOM UX audit

`/bom` shows CBOM and SBOM layer cards from `GET /bom/unified` plus a list explorer of CBOM records (cap 40). QBOM, HBOM, AIBOM, and IBOM tiles stay locked on Community.

Not shipped: graph of application → dependency → algorithm → cert. Export remains scan CycloneDX endpoints (`/scans/:id/cyclonedx`), not a visual builder.

Counts of 0 are empty workspace data, not a live estate.
