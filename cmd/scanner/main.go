package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

type ScanRequest struct {
	Targets []string `json:"targets"`
}

type ScanResponse struct {
	ScanID string `json:"scan_id"`
	Status string `json:"status"`
}

func main() {
	api := os.Getenv("SCANNER_API_BASE")
	if api == "" {
		api = "http://localhost:5000/api/v1"
	}

	var target string
	flag.StringVar(&target, "target", "localhost", "Target to scan (host)")
	flag.Parse()

	req := ScanRequest{Targets: []string{target}}
	b, err := json.Marshal(req)
	if err != nil {
		log.Fatal(err)
	}

	url := fmt.Sprintf("%s/scans", api)
	resp, err := http.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		log.Fatalf("failed to post scan request: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("failed to read scan response: %v", err)
	}

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		log.Fatalf("scan request failed: %s", string(body))
	}

	var sr ScanResponse
	if err := json.Unmarshal(body, &sr); err != nil {
		// try to parse more generically
		log.Printf("scan response: %s", string(body))
	} else {
		log.Printf("scan queued: %s status=%s", sr.ScanID, sr.Status)
	}

	// Poll for scan completion (demo: hit /scans/{id})
	if sr.ScanID != "" {
		pollURL := fmt.Sprintf("%s/scans/%s", api, sr.ScanID)
		for i := 0; i < 10; i++ {
			time.Sleep(1 * time.Second)
			r, err := http.Get(pollURL)
			if err != nil {
				log.Printf("poll error: %v", err)
				continue
			}
			b, err := io.ReadAll(r.Body)
			_ = r.Body.Close()
			if err != nil {
				log.Printf("poll error: %v", err)
				continue
			}
			log.Printf("poll: %s", string(b))
		}
	}
}
