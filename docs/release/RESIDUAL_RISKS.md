# Residual risks

1. Regex SAST will always have false positives/negatives versus compiled usage. Corpus precision/recall is **on the labelled set only**.
2. Self-scan WARNs (generic secret patterns, PQC identifier mentions in engine/docs).
3. Findings JSON gained fields; stored Postgres rows from older engines will not have them until a migration writes them.
4. `integrations/*` scaffolds could be mistaken for live products.
5. Fabric demo graph could be mistaken for live estate data if banners are ignored.
6. In-memory API mode is unsafe for production multi-tenancy if `APP_ENV=production` is not enforced at deploy time.
7. Optional PATH scanners execute operator-supplied binaries; supply-chain of those tools is out of RivicQ's tree.
