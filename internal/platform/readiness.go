package platform

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
)

type readinessStatus string

const (
	readinessReady        readinessStatus = "ready"
	readinessPartial      readinessStatus = "partial"
	readinessNotReady     readinessStatus = "not-ready"
	readinessNotSupported readinessStatus = "not-supported"
	readinessPlanned      readinessStatus = "planned"
)

const (
	readinessSourceNone     = "none"
	readinessSourceBuiltIn  = "compile-time"
	readinessSourceDBHandle = "service.DB"
)

const (
	maturityProduction         = "Production implemented"
	maturityBeta               = "Beta implemented"
	maturityExperimental       = "Experimental"
	maturityIntegrationPending = "Integration pending"
	maturityPlanned            = "Planned"
	maturityNotSupported       = "Not supported"
)

type readinessCheck struct {
	ID       string          `json:"id"`
	Label    string          `json:"label"`
	Status   readinessStatus `json:"status"`
	Detail   string          `json:"detail"`
	Source   string          `json:"source"`
	Maturity string          `json:"maturity"`
}

type readinessGroup struct {
	ID     string           `json:"id"`
	Label  string           `json:"label"`
	Status readinessStatus  `json:"status"`
	Checks []readinessCheck `json:"checks"`
}

type readinessResponse struct {
	CheckedAt time.Time         `json:"checked_at"`
	Overall   readinessStatus   `json:"overall"`
	Groups    []readinessGroup  `json:"groups"`
	Sources   map[string]string `json:"sources"`
}

func readinessSeverity(status readinessStatus) int {
	switch status {
	case readinessReady:
		return 0
	case readinessNotSupported, readinessPlanned:
		return 1
	case readinessPartial:
		return 2
	default:
		return 3
	}
}

func aggregateReadiness(statuses ...readinessStatus) readinessStatus {
	worst := readinessReady
	for _, status := range statuses {
		if readinessSeverity(status) > readinessSeverity(worst) {
			worst = status
		}
	}
	switch worst {
	case readinessReady:
		return readinessReady
	case readinessNotReady:
		return readinessNotReady
	default:
		return readinessPartial
	}
}

func groupReadiness(checks []readinessCheck) readinessStatus {
	statuses := make([]readinessStatus, 0, len(checks))
	for _, check := range checks {
		statuses = append(statuses, check.Status)
	}
	return aggregateReadiness(statuses...)
}

func readinessEnv(keys ...string) (bool, string) {
	for _, key := range keys {
		if strings.TrimSpace(os.Getenv(key)) != "" {
			return true, key
		}
	}
	return false, keys[0]
}

func readinessAllEnv(keys ...string) (bool, string) {
	for _, key := range keys {
		if strings.TrimSpace(os.Getenv(key)) == "" {
			return false, keys[0]
		}
	}
	return true, keys[0]
}

func readinessEnvBool(keys ...string) (bool, string) {
	for _, key := range keys {
		switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
		case "1", "true", "yes", "on":
			return true, key
		}
	}
	return false, keys[0]
}

var readinessEnvSources = []string{
	"AUTH_JWT_SECRET", "JWT_SECRET", "DATABASE_URL", "CRYPTOBOM_DB_HOST",
	"CRYPTOBOM_DB_USER", "CRYPTOBOM_DB_PASSWORD", "CRYPTOBOM_DB_NAME",
	"CORS_ORIGINS", "DEMO_MODE", "RIVICQ_ALLOW_DEMO_MODE", "CRYPTOBOM_ENV",
	"RIVICQ_ENV", "APP_ENV", "ENV", "CRYPTOBOM_LICENSE_KEY",
	"CRYPTOBOM_LICENSE_SIGNING_KEY", "AUTH_BOOTSTRAP_PASSWORD",
	"CRYPTOBOM_BOOTSTRAP_PASSWORD", "CRYPTOBOM_SSO_ENABLED", "OIDC_ISSUER_URL",
	"SAML_METADATA_URL", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
	"GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "AUTH_MFA_SESSION_TTL",
	"AWS_ACCESS_KEY_ID", "AWS_ROLE_ARN", "GCP_PROJECT_ID",
	"GOOGLE_APPLICATION_CREDENTIALS", "AZURE_SUBSCRIPTION_ID", "AZURE_TENANT_ID",
	"IBM_CLOUD_API_KEY", "IBMCLOUD_API_KEY", "KUBECONFIG", "KUBERNETES_SERVICE_HOST",
	"IBMQ_API_KEY", "IBMQ_ENABLED", "AWS_CLOUDHSM_CLUSTER_ID", "AWS_CLOUDHSM_ID",
	"PKCS11_MODULE", "EAAS_ADDR", "EAAS_DATA_FILE", "EAAS_ENV",
	"EAAS_ADMIN_TOKEN", "RIVICQ_TEST_DATABASE_URL",
}

func readinessSourceStates() map[string]string {
	sources := map[string]string{
		readinessSourceNone:     "not-applicable",
		readinessSourceBuiltIn:  "built-in",
		readinessSourceDBHandle: "runtime-handle",
	}
	for _, key := range readinessEnvSources {
		if strings.TrimSpace(os.Getenv(key)) != "" {
			sources[key] = "configured"
		} else {
			sources[key] = "not-configured"
		}
	}
	return sources
}

func (s *Service) readiness(c *gin.Context) {
	groups := []readinessGroup{
		s.readinessCore(c.Request.Context()),
		readinessAuthGroup(),
		readinessCloudGroup(),
		readinessQuantumGroup(),
		readinessHardwareGroup(),
		readinessEaaSGroup(),
		readinessSecurityGroup(),
	}
	statuses := make([]readinessStatus, 0, len(groups))
	for _, group := range groups {
		statuses = append(statuses, group.Status)
	}
	c.JSON(http.StatusOK, readinessResponse{
		CheckedAt: time.Now().UTC(),
		Overall:   aggregateReadiness(statuses...),
		Groups:    groups,
		Sources:   readinessSourceStates(),
	})
}

func (s *Service) readinessCore(ctx context.Context) readinessGroup {
	checks := make([]readinessCheck, 0, 6)

	dsnConfigured, dbSource := readinessEnv("DATABASE_URL")
	if !dsnConfigured {
		partsConfigured, partSource := readinessAllEnv("CRYPTOBOM_DB_HOST", "CRYPTOBOM_DB_USER", "CRYPTOBOM_DB_PASSWORD", "CRYPTOBOM_DB_NAME")
		if partsConfigured {
			dsnConfigured, dbSource = true, partSource
		}
	}
	dbStatus := readinessNotReady
	dbDetail := "No database DSN or complete CRYPTOBOM_DB_* credential set is present."
	if dsnConfigured {
		dbStatus = readinessPartial
		dbDetail = "Database configuration is present; no DSN value is disclosed and liveness is reported separately."
	}
	checks = append(checks, readinessCheck{
		ID: "core.database_configured", Label: "Database configured", Status: dbStatus,
		Detail: dbDetail, Source: dbSource, Maturity: maturityProduction,
	})

	liveStatus := readinessNotReady
	liveDetail := "No database handle is attached to this process; live state was not verified."
	if s.DB != nil {
		pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		err := s.DB.PingContext(pingCtx)
		cancel()
		if err == nil {
			liveStatus = readinessReady
			liveDetail = "The attached database handle answered PingContext; no external integration was contacted."
		} else {
			liveDetail = "The attached database handle failed PingContext; live state is not verified."
		}
	}
	checks = append(checks, readinessCheck{
		ID: "core.database_live", Label: "Database verified live", Status: liveStatus,
		Detail: liveDetail, Source: readinessSourceDBHandle, Maturity: maturityProduction,
	})

	jwtSet, jwtSource := readinessEnv("AUTH_JWT_SECRET", "JWT_SECRET")
	jwtStatus := readinessNotReady
	jwtDetail := "No JWT signing secret is configured."
	if jwtSet {
		if len(strings.TrimSpace(os.Getenv(jwtSource))) >= 32 {
			jwtStatus = readinessReady
			jwtDetail = "JWT signing secret is configured and meets the 32-byte minimum; the value is not disclosed and no token was exercised."
		} else {
			jwtStatus = readinessPartial
			jwtDetail = "JWT signing secret is configured but shorter than 32 bytes; the value is not disclosed."
		}
	}
	checks = append(checks, readinessCheck{
		ID: "core.jwt_secret", Label: "JWT signing secret", Status: jwtStatus,
		Detail: jwtDetail, Source: jwtSource, Maturity: maturityProduction,
	})

	corsSet, corsSource := readinessEnv("CORS_ORIGINS")
	corsStatus := readinessPartial
	corsDetail := "CORS_ORIGINS is unset; only the built-in default origin is used and no browser policy was verified."
	if corsSet {
		corsDetail = "CORS_ORIGINS is configured; browser origin enforcement is not verified by this endpoint."
	}
	checks = append(checks, readinessCheck{
		ID: "core.cors_origins", Label: "CORS origins", Status: corsStatus,
		Detail: corsDetail, Source: corsSource, Maturity: maturityProduction,
	})

	demoEnabled, demoToggle := readinessEnvBool("DEMO_MODE", "RIVICQ_ALLOW_DEMO_MODE")
	demoStatus := readinessReady
	demoDetail := "Demo mode is not enabled in this process."
	if demoEnabled && config.IsProductionEnv() {
		demoStatus = readinessNotReady
		demoDetail = "Demo mode is enabled in an explicit production environment; responses may be fabricated."
	} else if demoEnabled {
		demoStatus = readinessPartial
		demoDetail = "Demo mode is explicitly enabled in this process; responses may be fabricated."
	}
	checks = append(checks, readinessCheck{
		ID: "core.demo_mode", Label: "Demo mode", Status: demoStatus,
		Detail: demoDetail, Source: demoToggle, Maturity: maturityProduction,
	})

	licenseStatus := readinessNotReady
	licenseDetail := "No valid signed Enterprise license is present; Enterprise-gated capabilities report OSS defaults."
	if edition.Detect().Edition == edition.Enterprise {
		licenseStatus = readinessReady
		licenseDetail = "Enterprise license validated in-process; capability flags remain credential-gated."
	}
	checks = append(checks, readinessCheck{
		ID: "core.enterprise_license", Label: "Enterprise license", Status: licenseStatus,
		Detail: licenseDetail, Source: "CRYPTOBOM_LICENSE_KEY", Maturity: maturityBeta,
	})

	return readinessGroup{ID: "core", Label: "Core", Status: groupReadiness(checks), Checks: checks}
}

func readinessAuthGroup() readinessGroup {
	checks := make([]readinessCheck, 0, 8)

	jwtSet, _ := readinessEnv("AUTH_JWT_SECRET", "JWT_SECRET")
	passwordSet, passwordSource := readinessEnv("AUTH_BOOTSTRAP_PASSWORD", "CRYPTOBOM_BOOTSTRAP_PASSWORD")
	localStatus := readinessNotReady
	localDetail := "Neither a JWT signing secret nor a bootstrap credential is configured."
	if jwtSet && passwordSet {
		localStatus = readinessReady
		localDetail = "Local password login is implemented and both signing and bootstrap configuration are present; login was not exercised."
	} else if jwtSet || passwordSet {
		localStatus = readinessPartial
		localDetail = "Only one of the signing secret and bootstrap credential is configured; local login cannot be confirmed."
	}
	checks = append(checks, readinessCheck{
		ID: "auth.local", Label: "Local auth", Status: localStatus,
		Detail: localDetail, Source: passwordSource, Maturity: maturityProduction,
	})

	ssoEnabled, ssoSource := readinessEnvBool("CRYPTOBOM_SSO_ENABLED")
	ssoStatus := readinessNotReady
	ssoDetail := "CRYPTOBOM SSO flag is not enabled."
	if ssoEnabled {
		ssoStatus = readinessPartial
		ssoDetail = "SSO flag is set in this process; no identity provider handshake was performed."
	}
	checks = append(checks, readinessCheck{
		ID: "auth.sso_flag", Label: "SSO flag", Status: ssoStatus,
		Detail: ssoDetail, Source: ssoSource, Maturity: maturityBeta,
	})

	oidcSet, oidcSource := readinessEnv("OIDC_ISSUER_URL")
	oidcStatus := readinessNotReady
	oidcDetail := "OIDC issuer URL is not configured."
	if oidcSet {
		oidcStatus = readinessPartial
		oidcDetail = "OIDC issuer URL is configured; discovery was not fetched and no external call was made."
	}
	checks = append(checks, readinessCheck{
		ID: "auth.oidc", Label: "OIDC", Status: oidcStatus,
		Detail: oidcDetail, Source: oidcSource, Maturity: maturityBeta,
	})

	samlSet, samlSource := readinessEnv("SAML_METADATA_URL")
	samlStatus := readinessNotReady
	samlDetail := "SAML metadata URL is not configured."
	if samlSet {
		samlStatus = readinessPartial
		samlDetail = "SAML metadata URL is configured; metadata was not fetched and no external call was made."
	}
	checks = append(checks, readinessCheck{
		ID: "auth.saml", Label: "SAML", Status: samlStatus,
		Detail: samlDetail, Source: samlSource, Maturity: maturityBeta,
	})

	for _, provider := range []struct {
		id, label, clientID, clientSecret string
	}{
		{"auth.google_oauth", "Google OAuth", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"},
		{"auth.github_oauth", "GitHub OAuth", "GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"},
	} {
		idSet, idSource := readinessEnv(provider.clientID)
		secretSet, _ := readinessEnv(provider.clientSecret)
		status := readinessNotReady
		detail := "OAuth client ID or client secret is not configured."
		if idSet && secretSet {
			status = readinessPartial
			detail = "OAuth client credentials are configured; provider exchange was not exercised and no external call was made."
		}
		checks = append(checks, readinessCheck{
			ID: provider.id, Label: provider.label, Status: status,
			Detail: detail, Source: idSource, Maturity: maturityProduction,
		})
	}

	mfaTTLSet, mfaSource := readinessEnv("AUTH_MFA_SESSION_TTL")
	mfaDetail := "TOTP MFA is implemented with a default session TTL; no explicit MFA enforcement flag is configured."
	if mfaTTLSet {
		mfaDetail = "MFA session TTL is configured; TOTP enrollment and verification were not exercised."
	}
	checks = append(checks, readinessCheck{
		ID: "auth.mfa", Label: "MFA configuration", Status: readinessPartial,
		Detail: mfaDetail, Source: mfaSource, Maturity: maturityBeta,
	})

	return readinessGroup{ID: "auth", Label: "Auth", Status: groupReadiness(checks), Checks: checks}
}

func readinessCredentialCheck(id, label string, keys []string) readinessCheck {
	configured, source := readinessEnv(keys...)
	status := readinessNotReady
	detail := "No credential flags are configured; the connector is not active."
	if configured {
		status = readinessPartial
		detail = "Credential flags are present; live connectivity is not verified and no external API was called."
	}
	return readinessCheck{
		ID: id, Label: label, Status: status,
		Detail: detail, Source: source, Maturity: maturityBeta,
	}
}

func readinessCloudGroup() readinessGroup {
	checks := []readinessCheck{
		readinessCredentialCheck("cloud.aws", "AWS credentials", []string{"AWS_ACCESS_KEY_ID", "AWS_ROLE_ARN"}),
		readinessCredentialCheck("cloud.gcp", "GCP credentials", []string{"GCP_PROJECT_ID", "GOOGLE_APPLICATION_CREDENTIALS"}),
		readinessCredentialCheck("cloud.azure", "Azure credentials", []string{"AZURE_SUBSCRIPTION_ID", "AZURE_TENANT_ID"}),
		readinessCredentialCheck("cloud.ibm", "IBM Cloud credentials", []string{"IBM_CLOUD_API_KEY", "IBMCLOUD_API_KEY"}),
		readinessCredentialCheck("cloud.kubernetes", "Kubernetes credentials", []string{"KUBECONFIG", "KUBERNETES_SERVICE_HOST"}),
	}
	return readinessGroup{ID: "cloud", Label: "Cloud", Status: groupReadiness(checks), Checks: checks}
}

func readinessQuantumGroup() readinessGroup {
	checks := make([]readinessCheck, 0, 4)

	checks = append(checks, readinessCheck{
		ID: "quantum.local_pqc", Label: "Local PQC", Status: readinessReady,
		Detail: "PQC detection and classification ship in this build and require no credentials; PQC primitive operations in the standalone EaaS binary are local and Experimental.",
		Source: readinessSourceBuiltIn, Maturity: maturityExperimental,
	})

	ibmKeySet, ibmKeySource := readinessEnv("IBMQ_API_KEY")
	ibmStatus := readinessNotReady
	ibmDetail := "IBM Quantum API key is not configured."
	if ibmKeySet {
		ibmStatus = readinessPartial
		ibmDetail = "IBM Quantum credential is configured; no Qiskit job was submitted and no external call was made."
	}
	checks = append(checks, readinessCheck{
		ID: "quantum.ibm_credentials", Label: "IBM Quantum credentials", Status: ibmStatus,
		Detail: ibmDetail, Source: ibmKeySource, Maturity: maturityExperimental,
	})

	runtimeEnabled, runtimeSource := readinessEnvBool("IBMQ_ENABLED")
	runtimeStatus := readinessNotReady
	runtimeDetail := "Qiskit runtime is not enabled."
	if runtimeEnabled {
		runtimeStatus = readinessPartial
		runtimeDetail = "Qiskit runtime flag is set; runtime connectivity is not verified and no external call was made."
	}
	checks = append(checks, readinessCheck{
		ID: "quantum.qiskit_runtime", Label: "Qiskit runtime", Status: runtimeStatus,
		Detail: runtimeDetail, Source: runtimeSource, Maturity: maturityExperimental,
	})

	attestationStatus := readinessNotReady
	attestationDetail := "Quantum attestation requires IBM Quantum credentials that are not configured."
	if ibmKeySet {
		attestationStatus = readinessPartial
		attestationDetail = "Quantum attestation API is implemented and a credential flag is present; a provider attestation was not performed."
	}
	checks = append(checks, readinessCheck{
		ID: "quantum.attestation", Label: "Quantum attestation", Status: attestationStatus,
		Detail: attestationDetail, Source: ibmKeySource, Maturity: maturityBeta,
	})

	return readinessGroup{ID: "quantum", Label: "Quantum", Status: groupReadiness(checks), Checks: checks}
}

func readinessHardwareGroup() readinessGroup {
	checks := make([]readinessCheck, 0, 5)

	hsmSet, hsmSource := readinessEnv("PKCS11_MODULE", "AWS_CLOUDHSM_CLUSTER_ID", "AWS_CLOUDHSM_ID")
	hsmStatus := readinessNotReady
	hsmDetail := "No HSM module or CloudHSM cluster configuration is declared."
	if hsmSet {
		hsmStatus = readinessPartial
		hsmDetail = "HSM configuration is declared in this process; token custody and device access are not verified."
	}
	checks = append(checks, readinessCheck{
		ID: "hardware.hsm", Label: "HSM declared configuration", Status: hsmStatus,
		Detail: hsmDetail, Source: hsmSource, Maturity: maturityBeta,
	})

	checks = append(checks, readinessCheck{
		ID: "hardware.tpm", Label: "TPM configuration", Status: readinessPlanned,
		Detail: "No TPM configuration is read by this service; TPM integration is pending.",
		Source: readinessSourceNone, Maturity: maturityIntegrationPending,
	})

	checks = append(checks, readinessCheck{
		ID: "hardware.firmware_static_analysis", Label: "Firmware static analysis", Status: readinessReady,
		Detail: "Firmware static analyzer is compiled in with bounded artifact limits; no device was flashed or contacted.",
		Source: readinessSourceBuiltIn, Maturity: maturityBeta,
	})

	checks = append(checks, readinessCheck{
		ID: "hardware.wireless", Label: "Wireless operations", Status: readinessNotSupported,
		Detail: "Wireless is declared-only beta interest; no wireless route or operation exists.",
		Source: readinessSourceNone, Maturity: maturityNotSupported,
	})

	checks = append(checks, readinessCheck{
		ID: "hardware.qkd_qrng", Label: "QKD / QRNG integration", Status: readinessPlanned,
		Detail: "No QKD or QRNG integration or credential hook is implemented.",
		Source: readinessSourceNone, Maturity: maturityIntegrationPending,
	})

	return readinessGroup{ID: "hardware", Label: "Hardware", Status: groupReadiness(checks), Checks: checks}
}

func readinessEaaSGroup() readinessGroup {
	checks := make([]readinessCheck, 0, 4)

	serviceSet, serviceSource := readinessEnv("EAAS_ADDR", "EAAS_DATA_FILE", "EAAS_ENV")
	serviceStatus := readinessNotReady
	serviceDetail := "No standalone EaaS configuration is present in this process; EaaS is a separate local binary and is excluded from the CSPM verdict."
	if serviceSet {
		serviceStatus = readinessPartial
		serviceDetail = "Standalone EaaS flags are configured in this process; a hosted deployment is not inferred."
	}
	checks = append(checks, readinessCheck{
		ID: "eaas.service", Label: "Standalone EaaS service", Status: serviceStatus,
		Detail: serviceDetail, Source: serviceSource, Maturity: maturityExperimental,
	})

	adminSet, adminSource := readinessEnv("EAAS_ADMIN_TOKEN")
	adminStatus := readinessNotReady
	adminDetail := "EAAS_ADMIN_TOKEN is not set; the beta registration review endpoint has no admin credential."
	if adminSet {
		adminStatus = readinessPartial
		adminDetail = "EaaS admin token is configured; the review endpoint was not called."
	}
	checks = append(checks, readinessCheck{
		ID: "eaas.admin_token", Label: "EaaS admin token", Status: adminStatus,
		Detail: adminDetail, Source: adminSource, Maturity: maturityBeta,
	})

	stateSet, stateSource := readinessEnv("EAAS_DATA_FILE")
	stateStatus := readinessNotReady
	stateDetail := "EAAS_DATA_FILE is not set; the sandbox state file configuration is not verified."
	if stateSet {
		stateStatus = readinessPartial
		stateDetail = "Sandbox state file flag is configured; filesystem protection and key custody were not verified."
	}
	checks = append(checks, readinessCheck{
		ID: "eaas.state_file", Label: "EaaS sandbox state file", Status: stateStatus,
		Detail: stateDetail, Source: stateSource, Maturity: maturityExperimental,
	})

	checks = append(checks, readinessCheck{
		ID: "eaas.email_payments", Label: "EaaS email and payments", Status: readinessNotSupported,
		Detail: "Hosted EaaS email delivery and payment collection are not implemented; plan switching is entitlements only.",
		Source: readinessSourceNone, Maturity: maturityNotSupported,
	})

	return readinessGroup{ID: "eaas", Label: "EaaS", Status: groupReadiness(checks), Checks: checks}
}

func readinessSecurityGroup() readinessGroup {
	checks := make([]readinessCheck, 0, 5)

	checks = append(checks, readinessCheck{
		ID: "security.headers", Label: "Security headers", Status: readinessReady,
		Detail: "Security-header middleware is implemented in this build; per-response headers are not re-verified by this endpoint.",
		Source: readinessSourceBuiltIn, Maturity: maturityProduction,
	})

	checks = append(checks, readinessCheck{
		ID: "security.csp_caveat", Label: "Content-Security-Policy caveat", Status: readinessPartial,
		Detail: "The configured CSP still allows unsafe-inline and unsafe-eval for scripts and styles; a strict nonce-based policy is not in place.",
		Source: readinessSourceBuiltIn, Maturity: maturityBeta,
	})

	licensed := edition.Detect().Edition == edition.Enterprise
	dsnSet, _ := readinessEnv("DATABASE_URL")
	partsSet, _ := readinessAllEnv("CRYPTOBOM_DB_HOST", "CRYPTOBOM_DB_USER", "CRYPTOBOM_DB_PASSWORD", "CRYPTOBOM_DB_NAME")
	auditStatus := readinessNotReady
	auditDetail := "Enterprise audit endpoint requires a valid license and configured database; neither is confirmed."
	if licensed && (dsnSet || partsSet) {
		auditStatus = readinessPartial
		auditDetail = "License and database configuration are present; audit write path was not exercised."
	}
	checks = append(checks, readinessCheck{
		ID: "security.audit_log", Label: "Audit log", Status: auditStatus,
		Detail: auditDetail, Source: "CRYPTOBOM_LICENSE_KEY", Maturity: maturityBeta,
	})

	checks = append(checks, readinessCheck{
		ID: "security.rls", Label: "Row-level security", Status: readinessNotSupported,
		Detail: "No row-level-security policies exist in the migration ledger; tenant isolation relies on composite foreign keys and query scoping.",
		Source: readinessSourceNone, Maturity: maturityNotSupported,
	})

	testDSNSet, testDSNSource := readinessEnv("RIVICQ_TEST_DATABASE_URL")
	testStatus := readinessNotReady
	testDetail := "No Postgres migration-test DSN is configured; the migration integration test outcome cannot be confirmed."
	if testDSNSet {
		testStatus = readinessPartial
		testDetail = "Postgres migration-test DSN is configured; this endpoint does not run migrations and has no test result."
	}
	checks = append(checks, readinessCheck{
		ID: "security.postgres_migration_test", Label: "Postgres migration test", Status: testStatus,
		Detail: testDetail, Source: testDSNSource, Maturity: maturityBeta,
	})

	return readinessGroup{ID: "security", Label: "Security", Status: groupReadiness(checks), Checks: checks}
}
