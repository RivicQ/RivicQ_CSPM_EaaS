package goldentls

import "crypto/tls"

// TLS 1.3 configuration. Inventoried; not a policy BLOCK by itself.
func modern() *tls.Config {
	return &tls.Config{MinVersion: tls.VersionTLS13}
}
