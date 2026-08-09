package discovery

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
)

type ScanJob struct {
	ID        string       `json:"id"`
	Target    string       `json:"target"`
	ScanType  string       `json:"scan_type"`
	Status    string       `json:"status"`
	Progress  int          `json:"progress"`
	Result    *ScanResult  `json:"result,omitempty"`
	Error     string       `json:"error,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type ScanManager struct {
	mu      sync.RWMutex
	jobs    map[string]*ScanJob
	scanner *Scanner
}

func NewScanManager() *ScanManager {
	return &ScanManager{
		jobs:    make(map[string]*ScanJob),
		scanner: NewScanner(),
	}
}

func (sm *ScanManager) StartScan(target, scanType string) *ScanJob {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	job := &ScanJob{
		ID:        uuid.New().String(),
		Target:    target,
		ScanType:  scanType,
		Status:    "pending",
		Progress:  0,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	sm.jobs[job.ID] = job

	go sm.executeScan(job)
	return job
}

func (sm *ScanManager) executeScan(job *ScanJob) {
	sm.mu.Lock()
	job.Status = "running"
	job.Progress = 10
	sm.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	targets := buildTargets(job.Target)

	sm.mu.Lock()
	job.Progress = 30
	sm.mu.Unlock()

	result, err := sm.scanner.ScanAll(ctx, targets)

	sm.mu.Lock()
	defer sm.mu.Unlock()

	job.UpdatedAt = time.Now()
	if err != nil {
		job.Status = "failed"
		job.Error = err.Error()
		job.Progress = 0
		return
	}

	job.Result = result
	job.Status = "completed"
	job.Progress = 100
}

func (sm *ScanManager) GetScan(id string) (*ScanJob, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	job, ok := sm.jobs[id]
	if !ok {
		return nil, false
	}
	// Return a snapshot so callers can read mutable fields without the lock.
	snapshot := *job
	return &snapshot, true
}

func (sm *ScanManager) ListScans() []*ScanJob {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	scans := make([]*ScanJob, 0, len(sm.jobs))
	for _, j := range sm.jobs {
		scans = append(scans, j)
	}
	return scans
}

func buildTargets(target string) []Target {
	return []Target{
		{ID: "target-1", Host: target, Port: 443, Protocol: "tls", Label: "TLS Scan: " + target},
		{ID: "target-2", Host: target, Port: 22, Protocol: "ssh", Label: "SSH Scan: " + target},
		{ID: "target-3", Host: target, Port: 80, Protocol: "http", Label: "HTTP Scan: " + target},
	}
}

var defaultScanManager = NewScanManager()

func GetScanManager() *ScanManager {
	return defaultScanManager
}
