# Backup / restore

Postgres is optional. Schema: `internal/database/migrations.go` + `deploy/migrations/*.sql`.

This session did **not** run a backup or restore drill. Treat backups as an operator responsibility (pg_dump / volume snapshots) until a tested runbook exists with timestamps and a restore verification.
