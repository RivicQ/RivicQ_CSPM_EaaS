package profile

// Builtin returns the vendor-neutral builtin profiles. Partner profiles
// (embedded/infineon, identity/gd) use only public, standards-based markers.
// They never encode proprietary vendor APIs (partner spec §4, §36, §61).
func Builtin() []Profile {
	return []Profile{
		embeddedGeneric(),
		embeddedInfineon(),
		identityGeneric(),
		identityGD(),
	}
}

// commonEmbeddedLibraries returns library rules shared by embedded profiles.
func commonEmbeddedLibraries() []LibraryRule {
	return []LibraryRule{
		{Library: "mbedTLS", Markers: []string{"mbedtls_", "MBEDTLS_", "mbedtls_ssl"}, Algorithms: []string{"AES", "ECDSA", "ECDH", "SHA", "TLS"}},
		{Library: "wolfSSL", Markers: []string{"wolfssl", "wolfSSL", "wolfcrypt", "wc_"}, Algorithms: []string{"AES", "RSA", "ECDSA", "SHA", "TLS"}},
		{Library: "OpenSSL", Markers: []string{"OpenSSL", "OPENSSL_", "libcrypto", "libssl"}, Algorithms: []string{"AES", "RSA", "ECDSA", "ECDH", "SHA", "TLS"}},
		{Library: "BoringSSL", Markers: []string{"BoringSSL", "bssl_", "OPENSSL_IS_BORINGSSL"}, Algorithms: []string{"AES", "ECDSA", "SHA", "TLS"}},
		{Library: "BearSSL", Markers: []string{"BearSSL", "br_ssl", "br_x509"}, Algorithms: []string{"AES", "ECDSA", "RSA", "TLS"}},
		{Library: "libsodium", Markers: []string{"libsodium", "sodium_", "crypto_secretbox"}, Algorithms: []string{"X25519", "Ed25519", "ChaCha20", "Poly1305"}},
		{Library: "TinyCrypt", Markers: []string{"TinyCrypt", "tinycrypt"}, Algorithms: []string{"AES", "SHA", "HMAC"}},
		{Library: "TrustedFirmware-M", Markers: []string{"tfm_", "TF-M", "TrustedFirmware", "tfm_sst"}, Algorithms: []string{"AES", "ECDSA", "SHA"}},
	}
}

func commonEmbeddedAPIs() []APIRule {
	return []APIRule{
		{API: "PSA Crypto", Markers: []string{"psa_crypto", "psa_cipher", "psa_aead", "psa_import_key", "PSA_ALG_", "psa_crypto_init"}, Note: "Arm PSA Crypto API surface"},
		{API: "Trusted Firmware-M", Markers: []string{"tfm_", "TF-M", "tfm_sst", "psa_its", "psa_ps_"}, Note: "TF-M secure partitions / secure storage / attestation"},
		{API: "PKCS#11", Markers: []string{"PKCS11", "pkcs11", "C_Initialize", "C_GetSlotList"}, Note: "PKCS#11 token interface"},
		{API: "Mbed TLS SSL", Markers: []string{"mbedtls_ssl_", "mbedtls_x509_"}, Note: "Mbed TLS SSL/X.509 API"},
	}
}

func commonEmbeddedProtocols() []ProtocolRule {
	return []ProtocolRule{
		{Protocol: "TLS", Markers: []string{"TLS1.3", "TLS 1.3", "TLSv1.3", "TLS_", "SSL_CTX", "tls13"}, Layer: "transport"},
		{Protocol: "DTLS", Markers: []string{"DTLS", "dtls", "dtls1"}, Layer: "transport"},
		{Protocol: "MQTT", Markers: []string{"MQTT", "mqtt", "MQTTClient"}, Layer: "messaging"},
		{Protocol: "CoAP", Markers: []string{"CoAP", "coap", "COAP"}, Layer: "messaging"},
		{Protocol: "Bluetooth/BLE", Markers: []string{"Bluetooth", "BLE", "bluetooth", "bt_le_", "gap_"}, Layer: "wireless"},
		{Protocol: "Wi-Fi", Markers: []string{"wifi", "Wi-Fi", "WPA2", "WPA3", "esp_wifi"}, Layer: "wireless"},
		{Protocol: "802.15.4", Markers: []string{"802.15.4", "802154", "ieee802154"}, Layer: "wireless"},
		{Protocol: "Thread", Markers: []string{"OpenThread", "otThread", "thread_"}, Layer: "wireless"},
		{Protocol: "Zigbee", Markers: []string{"zigbee", "ZigBee", "ZCL"}, Layer: "wireless"},
		{Protocol: "Cellular", Markers: []string{"LTE", "5G", "NR_", "cellular", "modem_"}, Layer: "wireless"},
	}
}

func commonEmbeddedRules() []Rule {
	return []Rule{
		{ID: "secure_boot", Label: "Secure boot", Kind: "secure_boot", Markers: []string{"secure_boot", "secureboot", "SecureBoot", "bootloader_verify"}, Note: "Secure-boot code path evidence"},
		{ID: "root_of_trust", Label: "Root of trust", Kind: "root_of_trust", Markers: []string{"root_of_trust", "RootOfTrust", "ROT_", "RoT", "trusted_root"}, Note: "Root-of-trust evidence"},
		{ID: "device_identity", Label: "Device identity", Kind: "device_identity", Markers: []string{"device_id", "device_cert", "device_identity", "devID", "imei"}, Note: "Device identity references"},
		{ID: "attestation", Label: "Attestation", Kind: "attestation", Markers: []string{"attestation", "attest_token", "measured_boot"}, Note: "Attestation evidence"},
		{ID: "secure_storage", Label: "Secure storage", Kind: "secure_storage", Markers: []string{"secure_storage", "nv_seed", "keystore", "key_store"}, Note: "Secure key storage evidence"},
	}
}

func embeddedGeneric() Profile {
	return Profile{
		ID:          "embedded/generic",
		Domain:      DomainEmbedded,
		Name:        "Embedded / firmware (generic)",
		Description: "Vendor-neutral static analysis of MCU/SoC firmware: crypto libraries, crypto APIs, algorithms, certificates, secure-boot and protocol evidence.",
		AssetTypes:  []string{"mcu", "soc", "firmware", "secure_element", "tpm"},
		Libraries:   commonEmbeddedLibraries(),
		CryptoAPIs:  commonEmbeddedAPIs(),
		Protocols:   commonEmbeddedProtocols(),
		Rules:       commonEmbeddedRules(),
		LifecycleHints: map[string][]string{
			"build":   {"firmware artifact", "crypto library", "compiler"},
			"deploy":  {"device identity", "certificate", "secure hardware"},
			"operate": {"certificate expiry", "algorithm risk"},
		},
		Evidence:   "All detections are string/section evidence from static analysis. No firmware execution, no key extraction.",
		Provenance: "builtin",
	}
}

func embeddedInfineon() Profile {
	p := embeddedGeneric()
	p.ID = "embedded/infineon"
	p.Name = "Infineon embedded (secure silicon → firmware → cloud)"
	p.Description = "Embedded profile for Infineon-class secure-silicon devices. Adds silicon/PSA/TF-M detection markers on top of the generic embedded profile. Public, standards-based markers only."
	// Additional public vendor/parts markers (public product naming, no proprietary API).
	p.Libraries = append(p.Libraries, LibraryRule{
		Library:    "Infineon crypto firmware",
		Markers:    []string{"Infineon", "OPTIGA", "CYW", "PSoC", "AURIX", "TRAVEO", "XMC"},
		Algorithms: []string{"AES", "ECC", "SHA", "TRNG"},
		Risk:       "INFO",
	})
	p.Rules = append(p.Rules, Rule{
		ID: "silicon_identity", Label: "Silicon device identity", Kind: "device_identity",
		Markers: []string{"ChipID", "chip_id", "die_id", "unique_id", "UID"},
		Note:    "Silicon-level identity markers (evidence only; no die inspection).",
	})
	p.LifecycleHints = map[string][]string{
		"design":    {"secure silicon", "root of trust", "MCU"},
		"build":     {"firmware", "crypto library", "crypto API"},
		"provision": {"device identity", "certificate", "PKI"},
		"operate":   {"TLS/DTLS", "wireless", "network", "cloud"},
		"migrate":   {"PQC", "crypto-agility"},
	}
	p.Evidence = "Infineon profile: firmware static evidence + declared silicon/crypto markers. No silicon reverse-engineering, no key extraction."
	return p
}

func identityGeneric() Profile {
	return Profile{
		ID:          "identity/generic",
		Domain:      DomainIdentity,
		Name:        "Digital identity (generic)",
		Description: "Vendor-neutral identity/connectivity analysis: certificates, PKI, crypto libraries, TLS, and identity artifacts.",
		AssetTypes:  []string{"identity", "certificate", "pki", "secure_element", "sim"},
		Libraries: []LibraryRule{
			{Library: "OpenSSL", Markers: []string{"OpenSSL", "libcrypto", "libssl"}, Algorithms: []string{"RSA", "ECDSA", "AES", "SHA"}},
			{Library: "BoringSSL", Markers: []string{"BoringSSL"}, Algorithms: []string{"ECDSA", "AES", "SHA"}},
			{Library: "mbedTLS", Markers: []string{"mbedtls_", "MBEDTLS_"}, Algorithms: []string{"AES", "ECDSA", "SHA", "TLS"}},
			{Library: "GnuTLS", Markers: []string{"gnutls", "GnuTLS"}, Algorithms: []string{"RSA", "ECDSA", "AES", "SHA"}},
		},
		CryptoAPIs: []APIRule{
			{API: "PKCS#11", Markers: []string{"PKCS11", "C_Initialize"}, Note: "token/HSM interface"},
			{API: "PKCS#10/CSR", Markers: []string{"CERTIFICATE REQUEST", "CertReq"}, Note: "certificate signing request"},
			{API: "EST", Markers: []string{"EST", "/.well-known/est"}, Note: "RFC 7030 enrollment"},
			{API: "SCEP", Markers: []string{"SCEP", "scep"}, Note: "certificate enrollment"},
			{API: "OCSP", Markers: []string{"OCSP", "ocsp"}, Note: "revocation check"},
		},
		Protocols: []ProtocolRule{
			{Protocol: "TLS", Markers: []string{"TLS1.3", "TLSv1", "SSL_CTX", "https"}, Layer: "transport"},
			{Protocol: "MQTT", Markers: []string{"MQTT", "mqtt"}, Layer: "messaging"},
			{Protocol: "CoAP", Markers: []string{"CoAP", "coap"}, Layer: "messaging"},
		},
		Rules: []Rule{
			{ID: "certificate", Label: "X.509 certificate", Kind: "attestation", Markers: []string{"BEGIN CERTIFICATE", "X509", "x509"}, Note: "certificate material reference"},
			{ID: "ca", Label: "Certificate authority", Kind: "root_of_trust", Markers: []string{"Certificate Authority", "ca:", "ISSUING CA"}, Note: "CA reference"},
		},
		Evidence:   "Certificate/key metadata only. Never reads or emits private keys or credential secrets.",
		Provenance: "builtin",
	}
}

func identityGD() Profile {
	p := identityGeneric()
	p.ID = "identity/gd"
	p.Domain = DomainIdentity
	p.Name = "G+D digital identity (SIM/eSIM/iSIM → PKI → IoT → cloud)"
	p.Description = "Identity/connectivity profile for G+D-class digital identity. Adds public eUICC/eSIM/GSMA standards markers. Proprietary G+D API integration is marked CONNECTOR REQUIRED."
	p.Rules = append(p.Rules,
		Rule{ID: "euicc", Label: "eUICC / eSIM", Kind: "device_identity",
			Markers: []string{"eUICC", "euicc", "eSIM", "esim", "ISD-R", "ISD-P", "MNO-SD", "SGP.22", "SGP.32", "GSMA"},
			Note:    "Public GSMA eUICC/eSIM standards markers only."},
		Rule{ID: "secure_element", Label: "Secure element", Kind: "root_of_trust",
			Markers: []string{"Secure Element", "secure_element", "JavaCard", "GlobalPlatform", "GP "},
			Note:    "Public secure-element standards markers."},
		Rule{ID: "subscriber_identity", Label: "Subscriber identity", Kind: "device_identity",
			Markers: []string{"IMSI", "ICCID", "IMPI", "IMPU"},
			Note:    "Identity *references* only; values are never collected or emitted."},
	)
	p.Protocols = append(p.Protocols,
		ProtocolRule{Protocol: "RSP (Remote SIM Provisioning)", Markers: []string{"RSP", "SGP.22", "SGP.32", "SM-DP", "SM-DP+", "SM-SR"}, Layer: "identity"},
	)
	p.LifecycleHints = map[string][]string{
		"design":    {"identity model", "PKI", "algorithm policy"},
		"build":     {"certificate set", "crypto library"},
		"provision": {"eSIM provisioning", "device identity", "certificate"},
		"deploy":    {"secure element", "TLS", "IoT device"},
		"operate":   {"certificate lifecycle", "algorithm risk"},
		"migrate":   {"PQC", "crypto-agility", "PKI change"},
	}
	p.Evidence = "G+D profile: identity/certificate metadata and public standards markers. No SIM secrets, no credential values, no SIM/eSIM personalization. Connectors are CONNECTOR REQUIRED until partner APIs and credentials are provided."
	return p
}
