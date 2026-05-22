package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

func main() {
  http.HandleFunc("/v2/networks/", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    info := map[string]interface{}{
      "name":        "mock-network",
      "nodes":       4,
      "qubits":      127,
      "fidelity":    0.93,
      "status":      "active",
      "last_update": time.Now().Format(time.RFC3339),
    }
    _ = json.NewEncoder(w).Encode(info)
  })

  http.HandleFunc("/v2/algorithms/post-quantum", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    out := []map[string]interface{}{
      {
        "name": "Kyber-1024",
        "type": "KEM",
        "key_size": 1024,
        "quantum_safe": true,
      },
      {
        "name": "Dilithium5",
        "type": "Signature",
        "key_size": 2048,
        "quantum_safe": true,
      },
    }
    _ = json.NewEncoder(w).Encode(out)
  })

  http.HandleFunc("/v2/quantum/attest", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    resp := map[string]interface{}{
      "id":           "mock-attest-123",
      "status":       "completed",
      "quantum_safe": false,
      "score":        0.45,
      "confidence":   0.8,
      "attested_at":  time.Now().Format(time.RFC3339),
    }
    _ = json.NewEncoder(w).Encode(resp)
  })

  addr := ":5005"
  log.Printf("Mock IBMQ server listening on %s", addr)
  log.Fatal(http.ListenAndServe(addr, nil))
}
