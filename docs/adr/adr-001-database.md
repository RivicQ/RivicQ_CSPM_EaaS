# ADR 001: Database Choice

Date: 2026-05-19

## Context
We need a reliable relational database for multi-tenant storage of CBOM data,
attestations, and audit records.

## Decision
Use PostgreSQL (server version >= 15) as the primary datastore.

## Consequences
- Mature ecosystem (extensions, tooling)
- Good support for JSONB for semi-structured metadata
- Strong backup/restore and replication support for HA
- Terraform modules available for GCP/AWS/IBM

*** End ***
