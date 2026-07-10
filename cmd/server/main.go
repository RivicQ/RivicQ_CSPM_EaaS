package main

import (
	"github.com/rivic-q/cryptobom-saas/internal/server"
)

func main() {
	srv := server.New()
	srv.Start()
}
