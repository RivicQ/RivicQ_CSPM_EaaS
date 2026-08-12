package shared

import "strings"

// normalizeAuthEdition maps frontend edition names to JWT edition values.
func normalizeAuthEdition(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "community", "oss":
		return "oss"
	case "professional", "pro":
		return "professional"
	case "enterprise", "ent":
		return "enterprise"
	default:
		return "oss"
	}
}
