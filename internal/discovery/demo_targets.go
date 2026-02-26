package discovery

// DemoTargets is a hardcoded list of demo targets matching the lab services
var DemoTargets = []Target{
	{ID: "tls-1", Host: "localhost", Port: 4431, Protocol: "tls", Label: "NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)"},
	{ID: "tls-2", Host: "localhost", Port: 4432, Protocol: "tls", Label: "NGINX TLS 1.2 (No Forward Secrecy)"},
	{ID: "tls-3", Host: "localhost", Port: 4433, Protocol: "tls", Label: "NGINX TLS 1.3 (Reference - Good)"},
	{ID: "ssh-1", Host: "localhost", Port: 2222, Protocol: "ssh", Label: "SSH Weak KEX + DSA Host Key"},
	{ID: "http-1", Host: "localhost", Port: 5001, Protocol: "http", Label: "Legacy MD5 Hash API"},
	{ID: "tls-4", Host: "localhost", Port: 8443, Protocol: "tls", Label: "Java Legacy HTTPS (RSA-512, MD5withRSA)"},
}
