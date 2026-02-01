package ebpf

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"github.com/cilium/ebpf"
	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/perf"
	"github.com/cilium/ebpf/rlimit"
)

// CryptoEvent represents a cryptographic operation detected by eBPF
type CryptoEvent struct {
	Timestamp   uint64
	PID         uint32
	Comm        [16]byte
	Syscall     uint32
	Algorithm   [32]byte
	KeySize     uint32
	Operation   uint32 // 1=encrypt, 2=decrypt, 3=sign, 4=verify
	QuantumSafe uint32 // 0=classical, 1=quantum-safe
	SourceFile  [256]byte
	LineNumber  uint32
}

// CryptoScanner holds the eBPF program and maps
type CryptoScanner struct {
	programs    map[string]*ebpf.Program
	collections map[string]*ebpf.Map
	links       []link.Link
	perfReader  *perf.Reader
	stopChan    chan struct{}
}

// NewCryptoScanner creates a new eBPF-based crypto scanner
func NewCryptoScanner() (*CryptoScanner, error) {
	// Remove memory limit for eBPF
	if err := rlimit.RemoveMemlock(); err != nil {
		return nil, fmt.Errorf("failed to remove memory limit: %v", err)
	}

	scanner := &CryptoScanner{
		programs:    make(map[string]*ebpf.Program),
		collections: make(map[string]*ebpf.Map),
		links:       make([]link.Link, 0),
		stopChan:    make(chan struct{}),
	}

	// Load eBPF programs
	if err := scanner.loadPrograms(); err != nil {
		return nil, fmt.Errorf("failed to load eBPF programs: %v", err)
	}

	return scanner, nil
}

// loadPrograms loads and compiles eBPF programs
func (cs *CryptoScanner) loadPrograms() error {
	// eBPF program source (C code embedded as string)
	programSource := `
#include <linux/bpf.h>
#include <linux/ptrace.h>
#include <bpf/bpf_helpers.h>
#include <linux/types.h>

struct crypto_event {
    __u64 timestamp;
    __u32 pid;
    char comm[16];
    __u32 syscall;
    char algorithm[32];
    __u32 key_size;
    __u32 operation;
    __u32 quantum_safe;
    char source_file[256];
    __u32 line_number;
};

struct {
    __uint(type, BPF_MAP_TYPE_PERF_EVENT_ARRAY);
    __uint(key_size, sizeof(__u32));
    __uint(value_size, sizeof(__u32));
} crypto_events SEC(".maps");

SEC("tracepoint/syscalls/sys_enter_crypto_algs")
int trace_crypto_syscalls(struct trace_event_raw_sys_enter *ctx) {
    struct crypto_event event = {};
    struct task_struct *task;
    
    // Get current task
    task = (struct task_struct *)bpf_get_current_task();
    
    // Fill event data
    event.timestamp = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    bpf_get_current_comm(&event.comm, sizeof(event.comm));
    
    // Get syscall number
    event.syscall = ctx->args[0];
    
    // Detect algorithm based on syscall parameters
    // This is simplified - in reality, we'd parse crypto APIs
    if (ctx->args[1] == 0x01) {
        __builtin_memcpy(event.algorithm, "AES-256-GCM", 11);
        event.key_size = 32;
        event.operation = 1; // encrypt
        event.quantum_safe = 0; // not quantum safe
    } else if (ctx->args[1] == 0x02) {
        __builtin_memcpy(event.algorithm, "RSA-2048", 8);
        event.key_size = 256;
        event.operation = 3; // sign
        event.quantum_safe = 0; // not quantum safe
    } else if (ctx->args[1] == 0x03) {
        __builtin_memcpy(event.algorithm, "Kyber-1024", 11);
        event.key_size = 1568;
        event.operation = 1; // encrypt
        event.quantum_safe = 1; // quantum safe
    }
    
    // Send event to userspace
    bpf_perf_event_output(ctx, &crypto_events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    
    return 0;
}

char _license[] SEC("license") = "GPL";
`

	// Create temporary file for eBPF program
	tmpDir := "/tmp"
	programFile := filepath.Join(tmpDir, "crypto_scanner.c")

	if err := os.WriteFile(programFile, []byte(programSource), 0644); err != nil {
		return fmt.Errorf("failed to write eBPF program: %v", err)
	}
	defer os.Remove(programFile)

	// In a real implementation, we would compile the C program using clang/LLVM
	// For now, we'll create a simple placeholder program
	collectionSpec := &ebpf.CollectionSpec{
		Programs: map[string]*ebpf.ProgramSpec{
			"crypto_scanner": {
				Type:         ebpf.TracePoint,
				AttachTo:     "syscalls/sys_enter_crypto_algs",
				License:      "GPL",
				Instructions: make([]ebpf.Instruction, 0),
			},
		},
		Maps: map[string]*ebpf.MapSpec{
			"crypto_events": {
				Type:       ebpf.PerfEventArray,
				KeySize:    4,
				ValueSize:  4,
				MaxEntries: 1024,
			},
		},
	}

	collection, err := ebpf.NewCollection(collectionSpec)
	if err != nil {
		return fmt.Errorf("failed to create eBPF collection: %v", err)
	}

	// Store programs and maps
	for name, prog := range collection.Programs {
		cs.programs[name] = prog
	}

	for name, m := range collection.Maps {
		cs.collections[name] = m
	}

	return nil
}

// Start begins the eBPF monitoring
func (cs *CryptoScanner) Start() error {
	// Attach programs to tracepoints
	for name, prog := range cs.programs {
		if strings.Contains(name, "tracepoint") {
			// Attach to tracepoint
			parts := strings.Split(name, "_")
			if len(parts) >= 4 {
				tp := fmt.Sprintf("%s/%s", parts[1], parts[2])
				link, err := link.Tracepoint(parts[1], parts[2], prog, nil)
				if err != nil {
					return fmt.Errorf("failed to attach tracepoint %s: %v", tp, err)
				}
				cs.links = append(cs.links, link)
			}
		}
	}

	// Create perf event reader
	if eventsMap, ok := cs.collections["crypto_events"]; ok {
		reader, err := perf.NewReader(eventsMap, os.Getpagesize())
		if err != nil {
			return fmt.Errorf("failed to create perf reader: %v", err)
		}
		cs.perfReader = reader

		// Start reading events
		go cs.readEvents()
	}

	log.Println("Crypto eBPF scanner started")
	return nil
}

// readEvents processes eBPF events from kernel
func (cs *CryptoScanner) readEvents() {
	for {
		select {
		case <-cs.stopChan:
			return
		default:
			record, err := cs.perfReader.Read()
			if err != nil {
				if err == perf.ErrClosed {
					return
				}
				log.Printf("Error reading perf event: %v", err)
				continue
			}

			if record.LostSamples > 0 {
				log.Printf("Lost %d perf events", record.LostSamples)
				continue
			}

			// Parse crypto event
			var event CryptoEvent
			if err := binary.Read(bytes.NewReader(record.RawSample), binary.LittleEndian, &event); err != nil {
				log.Printf("Failed to parse crypto event: %v", err)
				continue
			}

			// Process the event
			cs.processCryptoEvent(event)
		}
	}
}

// processCryptoEvent handles individual crypto events
func (cs *CryptoScanner) processCryptoEvent(event CryptoEvent) {
	algorithm := strings.TrimRight(string(event.Algorithm[:]), "\x00")
	command := strings.TrimRight(string(event.Comm[:]), "\x00")
	sourceFile := strings.TrimRight(string(event.SourceFile[:]), "\x00")

	quantumSafeStatus := "classical"
	if event.QuantumSafe == 1 {
		quantumSafeStatus = "quantum-safe"
	}

	log.Printf("Crypto Event - PID: %d, Command: %s, Algorithm: %s (%s), Key Size: %d, Operation: %d, Source: %s:%d",
		event.PID, command, algorithm, quantumSafeStatus, event.KeySize, event.Operation, sourceFile, event.LineNumber)

	// TODO: Send to database for CBOM generation
	// TODO: Send to quantum attestation service if quantum-safe
	// TODO: Send to security monitoring system
}

// Stop halts the eBPF monitoring
func (cs *CryptoScanner) Stop() error {
	close(cs.stopChan)

	// Close perf reader
	if cs.perfReader != nil {
		cs.perfReader.Close()
	}

	// Detach all links
	for _, link := range cs.links {
		link.Close()
	}

	// Close all programs
	for _, prog := range cs.programs {
		prog.Close()
	}

	// Close all maps
	for _, m := range cs.collections {
		m.Close()
	}

	log.Println("Crypto eBPF scanner stopped")
	return nil
}

// GetCryptoStatistics returns statistics about detected crypto operations
func (cs *CryptoScanner) GetCryptoStatistics() map[string]interface{} {
	// TODO: Implement statistics collection from eBPF maps
	return map[string]interface{}{
		"total_crypto_operations": 0,
		"quantum_safe_operations": 0,
		"classical_operations":    0,
		"algorithms_detected":     []string{},
	}
}

// DetectQuantumVulnerabilities analyzes detected crypto for quantum vulnerabilities
func (cs *CryptoScanner) DetectQuantumVulnerabilities() []map[string]interface{} {
	// TODO: Implement quantum vulnerability analysis
	vulnerabilities := []map[string]interface{}{
		{
			"type":           "quantum_vulnerability",
			"algorithm":      "RSA-2048",
			"severity":       "high",
			"description":    "RSA-2048 is vulnerable to quantum attacks using Shor's algorithm",
			"recommendation": "Migrate to Kyber-1024 or other post-quantum cryptographic algorithms",
		},
		{
			"type":           "quantum_vulnerability",
			"algorithm":      "ECDSA-P256",
			"severity":       "high",
			"description":    "ECDSA-P256 is vulnerable to quantum attacks using Shor's algorithm",
			"recommendation": "Migrate to Dilithium or other post-quantum signature algorithms",
		},
	}

	return vulnerabilities
}
