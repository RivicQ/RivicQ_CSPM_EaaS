//go:build integration

package integration

import (
	"database/sql"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// These tests run against a real PostgreSQL instance and are excluded from the
// default build.
//
// Point RIVICQ_TEST_DATABASE_URL at a scratch database, for example:
//
//	createdb rivicq_audit
//	RIVICQ_TEST_DATABASE_URL='postgres://user@localhost/rivicq_audit' \
//	  go test -tags integration ./tests/integration/
//
// The database is expected to be disposable: every test truncates the tables it
// touches and does not drop the database itself.
func testDSN(t *testing.T) string {
	t.Helper()
	// Accept either name. CI supplies DATABASE_URL; running the suite locally
	// with RIVICQ_TEST_DATABASE_URL keeps a production DSN out of the command
	// line by accident. Reading only one of them made the whole suite skip
	// silently in CI, which is worse than a failure.
	dsn := os.Getenv("RIVICQ_TEST_DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		t.Skip("set RIVICQ_TEST_DATABASE_URL to run PostgreSQL integration tests")
	}
	return dsn
}

// resetSchema gives each test a clean database. Without this, one test's legacy
// fixture leaks into the next and produces failures that look like product bugs.
func resetSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	dropAll(t, db)
}

func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("postgres", testDSN(t))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping: %v", err)
	}
	db.SetMaxOpenConns(4)
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func quietLogger() *logrus.Logger {
	l := logrus.New()
	l.SetLevel(logrus.ErrorLevel)
	l.SetOutput(os.Stderr)
	return l
}

func tableExists(t *testing.T, db *sql.DB, name string) bool {
	t.Helper()
	var found string
	err := db.QueryRow(
		`SELECT table_name FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_name = $1`, name).Scan(&found)
	if err == sql.ErrNoRows {
		return false
	}
	if err != nil {
		t.Fatalf("checking table %s: %v", name, err)
	}
	return true
}

func indexExists(t *testing.T, db *sql.DB, name string) bool {
	t.Helper()
	var found string
	err := db.QueryRow(`SELECT indexname FROM pg_indexes WHERE indexname = $1`, name).Scan(&found)
	if err == sql.ErrNoRows {
		return false
	}
	if err != nil {
		t.Fatalf("checking index %s: %v", name, err)
	}
	return true
}

func columnExists(t *testing.T, db *sql.DB, table, column string) bool {
	t.Helper()
	var found string
	err := db.QueryRow(`
		SELECT column_name FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
		table, column).Scan(&found)
	if err == sql.ErrNoRows {
		return false
	}
	if err != nil {
		t.Fatalf("checking %s.%s: %v", table, column, err)
	}
	return true
}

func columnIsNotNull(t *testing.T, db *sql.DB, table, column string) bool {
	t.Helper()
	var notNull string
	err := db.QueryRow(`
		SELECT is_nullable FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
		table, column).Scan(&notNull)
	if err != nil {
		t.Fatalf("checking %s.%s: %v", table, column, err)
	}
	return notNull == "NO"
}

// TestMigrationsApplyToEmptyDatabase is the baseline: a brand new instance must
// come up fully migrated.
func TestMigrationsApplyToEmptyDatabase(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	for _, table := range []string{
		"schema_migrations", "tenants", "users", "cbom_reports", "crypto_assets",
		"quantum_attestations", "findings", "security_events", "kubernetes_clusters",
		"repositories",
	} {
		if !tableExists(t, db, table) {
			t.Errorf("expected table %q to exist after migrating", table)
		}
	}

	for _, index := range []string{
		"idx_crypto_assets_tenant_id",
		"idx_crypto_assets_tenant_algorithm",
		"idx_quantum_attestations_tenant_id",
	} {
		if !indexExists(t, db, index) {
			t.Errorf("expected index %q to exist after migrating", index)
		}
	}

	if !columnIsNotNull(t, db, "crypto_assets", "tenant_id") {
		t.Error("crypto_assets.tenant_id must be NOT NULL on a clean database")
	}
	if !columnIsNotNull(t, db, "quantum_attestations", "tenant_id") {
		t.Error("quantum_attestations.tenant_id must be NOT NULL on a clean database")
	}
}

// TestMigrationsAreIdempotent: a restart must not re-apply or fail.
func TestMigrationsAreIdempotent(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("first apply: %v", err)
	}
	before, err := database.AppliedMigrations(db)
	if err != nil {
		t.Fatalf("read ledger: %v", err)
	}
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("second apply must be a no-op, got: %v", err)
	}
	after, err := database.AppliedMigrations(db)
	if err != nil {
		t.Fatalf("read ledger: %v", err)
	}
	if len(before) != len(after) {
		t.Fatalf("ledger grew on re-apply: %d -> %d", len(before), len(after))
	}
	if len(before) != len(database.CoreMigrations()) {
		t.Fatalf("expected %d applied migrations, ledger has %d", len(database.CoreMigrations()), len(before))
	}
}

// TestMigrationChecksumDriftIsRejected: editing an applied migration must fail
// loudly instead of silently diverging from production.
func TestMigrationChecksumDriftIsRejected(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("apply: %v", err)
	}

	tampered := database.CoreMigrations()
	tampered[0].Statements = append(append([]string{}, tampered[0].Statements...), `SELECT 1;`)

	err := database.ApplyMigrations(db, quietLogger(), tampered)
	if err == nil {
		t.Fatal("editing an applied migration must be rejected")
	}
	if !contains(err.Error(), "different checksum") {
		t.Fatalf("expected a checksum error, got: %v", err)
	}
}

// TestMigrationRollbackOnFailure: a failing statement must leave no ledger row
// and no partial schema.
func TestMigrationRollbackOnFailure(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("baseline: %v", err)
	}

	broken := []database.Migration{{
		ID:   "9999_broken_probe",
		Name: "deliberately broken",
		Statements: []string{
			`CREATE TABLE migration_rollback_probe (id INT);`,
			`THIS IS NOT VALID SQL;`,
		},
	}}
	if err := database.ApplyMigrations(db, quietLogger(), broken); err == nil {
		t.Fatal("expected the broken migration to fail")
	}

	if tableExists(t, db, "migration_rollback_probe") {
		t.Error("failed migration left a table behind: the transaction did not roll back")
	}
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM schema_migrations WHERE id = $1`, "9999_broken_probe").Scan(&count); err != nil {
		t.Fatalf("ledger query: %v", err)
	}
	if count != 0 {
		t.Error("failed migration was recorded as applied")
	}
}

// TestLegacySchemaUpgradeBackfillsTenantOwnership reproduces the pre-migration
// shape, where crypto_assets had no tenant column, and checks the backfill.
func TestLegacySchemaUpgradeBackfillsTenantOwnership(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)

	// Legacy shape: owned by a report, with no tenant of its own.
	mustExec(t, db, `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)
	mustExec(t, db, `CREATE TABLE tenants (
		id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT, created_at TIMESTAMPTZ DEFAULT now())`)
	mustExec(t, db, `INSERT INTO tenants (id, name, domain) VALUES ('tenant-a', 'A', 'a.example')`)
	mustExec(t, db, `CREATE TABLE cbom_reports (
		id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), name TEXT, status TEXT,
		created_at TIMESTAMPTZ DEFAULT now())`)
	mustExec(t, db, `INSERT INTO cbom_reports (id, tenant_id, name, status)
		VALUES ('report-1', 'tenant-a', 'legacy report', 'completed')`)
	// version and cyclonedx_bom arrive via 0007 with defaults, which is the point
	// being tested: the legacy row survives and becomes readable.
	// No foreign key in the legacy shape, which is how an orphan row exists at all.
	mustExec(t, db, `CREATE TABLE crypto_assets (
		id TEXT PRIMARY KEY, cbom_report_id TEXT,
		algorithm TEXT, key_length INT, quantum_safe BOOLEAN DEFAULT false)`)
	mustExec(t, db, `INSERT INTO crypto_assets (id, cbom_report_id, algorithm, key_length)
		VALUES ('asset-1', 'report-1', 'RSA', 2048)`)
	// An orphan with no owning report: the upgrade is expected to remove it
	// rather than leave a row that can never be attributed to a tenant.
	mustExec(t, db, `INSERT INTO crypto_assets (id, cbom_report_id, algorithm, key_length)
		VALUES ('asset-orphan', 'missing-report', 'AES', 128)`)
	mustExec(t, db, `CREATE TABLE quantum_attestations (
		id TEXT PRIMARY KEY, cbom_report_id TEXT REFERENCES cbom_reports(id),
		provider TEXT, status TEXT)`)
	mustExec(t, db, `INSERT INTO quantum_attestations (id, cbom_report_id, provider, status)
		VALUES ('att-1', 'report-1', 'ibm', 'verified')`)

	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("upgrade: %v", err)
	}

	var assetTenant string
	if err := db.QueryRow(`SELECT tenant_id FROM crypto_assets WHERE id = 'asset-1'`).Scan(&assetTenant); err != nil {
		t.Fatalf("read backfilled tenant: %v", err)
	}
	if assetTenant != "tenant-a" {
		t.Errorf("crypto_assets.tenant_id backfilled to %q, want tenant-a", assetTenant)
	}

	var attTenant string
	if err := db.QueryRow(`SELECT tenant_id FROM quantum_attestations WHERE id = 'att-1'`).Scan(&attTenant); err != nil {
		t.Fatalf("read backfilled attestation tenant: %v", err)
	}
	if attTenant != "tenant-a" {
		t.Errorf("quantum_attestations.tenant_id backfilled to %q, want tenant-a", attTenant)
	}

	if !columnIsNotNull(t, db, "crypto_assets", "tenant_id") {
		t.Error("tenant_id should be constrained NOT NULL once the orphans are gone")
	}

	var orphans int
	if err := db.QueryRow(`SELECT count(*) FROM crypto_assets WHERE id = 'asset-orphan'`).Scan(&orphans); err != nil {
		t.Fatalf("orphan check: %v", err)
	}
	if orphans != 0 {
		t.Error("an asset referencing a missing report survived the upgrade")
	}

	// The legacy column was named key_length; the query layer reads key_size.
	// A migration that only does CREATE TABLE IF NOT EXISTS would leave the
	// table unreadable, so the upgrade has to add and backfill.
	if !columnExists(t, db, "crypto_assets", "key_size") {
		t.Error("crypto_assets.key_size is missing after the upgrade")
	}
	var keySize sql.NullInt64
	if err := db.QueryRow(`SELECT key_size FROM crypto_assets WHERE id = 'asset-1'`).Scan(&keySize); err != nil {
		t.Fatalf("read backfilled key_size: %v", err)
	}
	if keySize.Int64 != 2048 {
		t.Errorf("key_size backfilled to %v, want 2048", keySize.Int64)
	}

}

// TestTenantIsolationOnQueries exercises the read and write paths against a real
// database, which is the only way to prove the predicates are applied.
func TestTenantIsolationOnQueries(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("apply: %v", err)
	}
	seedTwoTenants(t, db)

	q := database.NewQueries(db)

	mine, err := q.GetCBOMReport("tenant-a", seedIDs.reportA)
	if err != nil {
		t.Fatalf("own tenant read: %v", err)
	}
	if mine.ID != seedIDs.reportA {
		t.Fatalf("read the wrong report: %+v", mine)
	}

	if _, err := q.GetCBOMReport("tenant-b", seedIDs.reportA); err == nil {
		t.Error("cross-tenant read must not succeed")
	} else if !isNotFound(err) {
		t.Errorf("cross-tenant read should look like a miss, got %v", err)
	}

	listA, err := q.ListCBOMReports("tenant-a", 50, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	for _, r := range listA {
		if r.TenantID != "tenant-a" {
			t.Errorf("list leaked a report owned by %s", r.TenantID)
		}
	}

	// A write must not be usable to move data across tenants.
	steal := *mine
	steal.Name = "hijacked"
	steal.TenantID = "tenant-b"
	if err := q.UpdateCBOMReport("tenant-b", &steal); err == nil {
		t.Error("updating another tenant's report must fail")
	}

	var owner string
	if err := db.QueryRow(`SELECT name FROM cbom_reports WHERE id = $1`, seedIDs.reportA).Scan(&owner); err != nil {
		t.Fatalf("verify unchanged: %v", err)
	}
	if owner == "hijacked" {
		t.Fatal("a cross-tenant update modified the row")
	}

	if err := q.DeleteCBOMReport("tenant-b", seedIDs.reportA); err == nil {
		t.Error("deleting another tenant's report must fail")
	}
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM cbom_reports WHERE id = $1`, seedIDs.reportA).Scan(&count); err != nil {
		t.Fatalf("verify delete: %v", err)
	}
	if count != 1 {
		t.Error("cross-tenant delete removed the row")
	}
}

// TestCryptoAssetOwnershipIsEnforcedByTheDatabase proves the constraint, not just
// the query layer, so a future code path cannot insert a mismatched owner.
func TestCryptoAssetOwnershipIsEnforcedByTheDatabase(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("apply: %v", err)
	}
	seedTwoTenants(t, db)

	// tenant-b trying to attach an asset to tenant-a's report.
	_, err := db.Exec(`
		INSERT INTO crypto_assets (id, tenant_id, cbom_report_id, algorithm, key_size, usage, location)
		VALUES ($1, 'tenant-b', $2, 'RSA', 2048, 'signing', 'main.go')`, "44444444-4444-4444-8444-444444444444", seedIDs.reportA)
	if err == nil {
		t.Error("the database accepted an asset whose tenant differs from its report owner")
	}
}

// TestForeignKeyRejectsUnknownTenant: a fabricated tenant must be rejected.
func TestForeignKeyRejectsUnknownTenant(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("apply: %v", err)
	}

	_, err := db.Exec(`
		INSERT INTO cbom_reports (id, tenant_id, name, status)
		VALUES ('report-ghost', 'tenant-does-not-exist', 'x', 'completed')`)
	if err == nil {
		t.Error("cbom_reports accepted a tenant_id that does not exist")
	}
}

// TestHealthCheckReportsRealState makes sure the readiness probe agrees with the
// database rather than always returning healthy.
func TestHealthCheckReportsRealState(t *testing.T) {
	db := openTestDB(t)
	resetSchema(t, db)
	if err := database.ApplyMigrations(db, quietLogger(), database.CoreMigrations()); err != nil {
		t.Fatalf("apply: %v", err)
	}
	q := database.NewQueries(db)
	if err := q.HealthCheck(); err != nil {
		t.Fatalf("health check against a live database: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
	if err := q.HealthCheck(); err == nil {
		t.Error("health check must fail once the database is closed")
	}
}

// seedIDs are valid UUIDs because cbom_reports.id is a UUID column.
var seedIDs = struct{ reportA, reportB string }{
	reportA: "11111111-1111-4111-8111-111111111111",
	reportB: "22222222-2222-4222-8222-222222222222",
}

var _ = seedIDs.reportB

func seedTwoTenants(t *testing.T, db *sql.DB) {
	t.Helper()
	idA, idB := seedIDs.reportA, seedIDs.reportB
	idAssetA := "55555555-5555-4555-8555-555555555555"
	for _, s := range []string{
		`INSERT INTO tenants (id, name, domain) VALUES ('tenant-a', 'A', 'a.example')
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO tenants (id, name, domain) VALUES ('tenant-b', 'B', 'b.example')
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO cbom_reports (id, tenant_id, name, version, cyclonedx_bom, status)
		 VALUES ('` + idA + `', 'tenant-a', 'A report', '1', '{}'::jsonb, 'completed')
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO cbom_reports (id, tenant_id, name, version, cyclonedx_bom, status)
		 VALUES ('` + idB + `', 'tenant-b', 'B report', '1', '{}'::jsonb, 'completed')
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO crypto_assets (id, tenant_id, cbom_report_id, algorithm, key_size, usage, location)
		 VALUES ('` + idAssetA + `', 'tenant-a', '` + idA + `', 'RSA', 2048, 'signing', 'main.go')
		 ON CONFLICT (id) DO NOTHING`,
	} {
		mustExec(t, db, s)
	}
}

func mustExec(t *testing.T, db *sql.DB, stmt string) {
	t.Helper()
	if _, err := db.Exec(stmt); err != nil {
		t.Fatalf("exec %q: %v", truncate(stmt), err)
	}
}

func truncate(s string) string {
	if len(s) > 80 {
		return s[:80] + "..."
	}
	return s
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0
}

func indexOf(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}

func isNotFound(err error) bool {
	return err != nil && (contains(err.Error(), "not found") || contains(err.Error(), "no rows"))
}

func dropAll(t *testing.T, db *sql.DB) {
	t.Helper()
	rows, err := db.Query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
	if err != nil {
		t.Fatalf("list tables: %v", err)
	}
	var names []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			t.Fatalf("scan: %v", err)
		}
		names = append(names, n)
	}
	_ = rows.Close()
	for _, n := range names {
		if _, err := db.Exec(`DROP TABLE IF EXISTS ` + n + ` CASCADE`); err != nil {
			t.Fatalf("drop %s: %v", n, err)
		}
	}
	if _, err := db.Exec(`DROP TABLE IF EXISTS schema_migrations CASCADE`); err != nil {
		t.Fatalf("drop schema_migrations: %v", err)
	}
}

// unused keeps the time import meaningful if assertions are added later.
var _ = time.Now
