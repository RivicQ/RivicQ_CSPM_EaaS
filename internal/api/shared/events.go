package shared

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type ScanProgress struct {
	ScanID    string `json:"scan_id"`
	Status    string `json:"status"`
	Progress  int    `json:"progress"`
	Findings  int    `json:"findings"`
	Message   string `json:"message,omitempty"`
	Timestamp string `json:"timestamp"`
}

type scanSession struct {
	id       string
	msg      chan []byte
	done     chan struct{}
	closed   bool
	mu       sync.Mutex
}

var (
	mu       sync.Mutex
	sessions = make(map[string]*scanSession)
)

func simulateScan(scanID string, logger *logrus.Logger) {
	ss := getSession(scanID)
	if ss == nil {
		return
	}

	stages := []string{
		"Connecting to target...",
		"Discovering cryptographic assets...",
		"Analyzing algorithms...",
		"Checking quantum vulnerability...",
		"Generating CBOM report...",
	}

	for i, stage := range stages {
		select {
		case <-ss.done:
			return
		default:
		}

		progress := (i * 100 / len(stages)) + 10
		if progress > 90 {
			progress = 90
		}

		evt := ScanProgress{
			ScanID:    scanID,
			Status:    "scanning",
			Progress:  progress,
			Findings:  i * 3,
			Message:   stage,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
		b, _ := json.Marshal(evt)
		ss.send(b)

		time.Sleep(800 * time.Millisecond)

		select {
		case <-ss.done:
			return
		default:
		}
	}

	complete := ScanProgress{
		ScanID:    scanID,
		Status:    "completed",
		Progress:  100,
		Findings:  15,
		Message:   "Scan completed successfully",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	b, _ := json.Marshal(complete)
	ss.send(b)
	ss.close()
}

func getSession(id string) *scanSession {
	mu.Lock()
	defer mu.Unlock()
	return sessions[id]
}

func createSession(id string) *scanSession {
	mu.Lock()
	defer mu.Unlock()
	ss := &scanSession{
		id:   id,
		msg:  make(chan []byte, 64),
		done: make(chan struct{}),
	}
	sessions[id] = ss
	return ss
}

func (ss *scanSession) send(data []byte) {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	if !ss.closed {
		select {
		case ss.msg <- data:
		default:
		}
	}
}

func (ss *scanSession) close() {
	ss.mu.Lock()
	defer ss.mu.Unlock()
	if !ss.closed {
		ss.closed = true
		close(ss.done)
		close(ss.msg)
		mu.Lock()
		delete(sessions, ss.id)
		mu.Unlock()
	}
}

func StreamScanProgress(db interface{}, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		scanID := c.Param("id")
		if scanID == "" {
			scanID = c.Query("scan_id")
		}
		if scanID == "" {
			scanID = uuid.New().String()
		}

		flusher, ok := c.Writer.(gin.ResponseWriter)
		if !ok {
			c.JSON(500, gin.H{"error": "streaming not supported"})
			return
		}

		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("X-Accel-Buffering", "no")

		ss := createSession(scanID)

		go simulateScan(scanID, logger)

		c.Stream(func(w io.Writer) bool {
			select {
			case msg, ok := <-ss.msg:
				if !ok {
					fmt.Fprintf(w, "event: done\ndata: %s\n\n", `{"scan_id":"`+scanID+`","status":"completed"}`)
					flusher.Flush()
					return false
				}
				fmt.Fprintf(w, "event: progress\ndata: %s\n\n", string(msg))
				flusher.Flush()
				return true
			case <-c.Request.Context().Done():
				ss.close()
				return false
			}
		})
	}
}
