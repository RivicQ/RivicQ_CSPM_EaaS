package middleware

import "testing"

func TestRedactQueryRemovesCredentials(t *testing.T) {
	cases := map[string]string{
		"token=abc123&page=2":                                "page=2&token=%5BREDACTED%5D",
		"access_token=xyz&refresh_token=xyz&region=eu":       "access_token=%5BREDACTED%5D&refresh_token=%5BREDACTED%5D&region=eu",
		"signature=sig&state=nil":                             "signature=%5BREDACTED%5D&state=nil",
		"sig=abc":                                             "sig=%5BREDACTED%5D",
		"next=rid=%5BREDACTED%5D":                             "next=rid%3D%5BREDACTED%5D",
		"page=10&size=50":                                     "page=10&size=50",
		"private_key=mine&alg=ecdsa":                          "alg=ecdsa&private_key=%5BREDACTED%5D",
		"":                                                    "",
	}
	for in, want := range cases {
		if got := redactQuery(in); got != want {
			t.Errorf("redactQuery(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestRedactQueryRejectsUnparsableInput(t *testing.T) {
	if got := redactQuery("a=%"); got != "[unparsable]" {
		t.Errorf("got %q", got)
	}
}