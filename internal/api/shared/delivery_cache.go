package shared

import (
	"sync"
	"time"
)

// Replay protection for inbound provider webhooks.
//
// A signed webhook is still replayable: an attacker who captures one delivery
// can resend it verbatim, and because the signature covers the body and not the
// delivery ID, the server would treat every replay as a new push and start a
// fresh scan. GitHub delivers a unique X-GitHub-Delivery per event, so
// remembering recently seen IDs closes that hole.

// deliveryCache is a bounded, TTL-based set of delivery identifiers.
//
// It is per-process. A multi-instance deployment needs a shared store (Redis or
// a unique index on a deliveries table) to reject a replay that lands on a
// different instance; this cache narrows the window rather than closing it
// globally. That limitation is recorded in the hardening report rather than
// hidden, because a replay defence that only works on one node is easy to
// mistake for a complete one.
type deliveryCacheEntry struct {
	seenAt time.Time
	// seq orders entries for eviction. Wall-clock timestamps tie under fast
	// inserts, which would make "evict the oldest" pick an arbitrary entry;
	// a monotonic counter makes eviction strictly FIFO.
	seq uint64
}

type deliveryCache struct {
	mu   sync.Mutex
	seen map[string]deliveryCacheEntry
	seq  uint64
	ttl  time.Duration
	max  int
}

func newDeliveryCache(ttl time.Duration, max int) *deliveryCache {
	if ttl <= 0 {
		ttl = 30 * time.Minute
	}
	if max <= 0 {
		max = 10000
	}
	return &deliveryCache{seen: make(map[string]deliveryCacheEntry), ttl: ttl, max: max}
}

// remember records a delivery ID and reports whether it is new.
//
// Returns false when the ID has already been seen inside the TTL. An empty ID
// is treated as new: rejecting deliveries that carry no identifier would break
// providers that omit the header, and the signature still has to verify.
func (d *deliveryCache) remember(id string) bool {
	if id == "" {
		return true
	}
	now := time.Now()

	d.mu.Lock()
	defer d.mu.Unlock()

	// Drop expired entries first so the map cannot grow without bound when the
	// process is idle and no new deliveries arrive to trigger eviction.
	for key, entry := range d.seen {
		if now.Sub(entry.seenAt) > d.ttl {
			delete(d.seen, key)
		}
	}

	if entry, ok := d.seen[id]; ok && now.Sub(entry.seenAt) <= d.ttl {
		return false
	}

	// Hard cap: if the cache is somehow still full after expiry pruning, drop
	// the oldest entry rather than refusing new deliveries. Availability of
	// legitimate pushes matters more than perfect replay detection.
	if len(d.seen) >= d.max {
		var oldestKey string
		var oldestSeq uint64
		for key, entry := range d.seen {
			if oldestKey == "" || entry.seq < oldestSeq {
				oldestKey, oldestSeq = key, entry.seq
			}
		}
		if oldestKey != "" {
			delete(d.seen, oldestKey)
		}
	}

	d.seq++
	d.seen[id] = deliveryCacheEntry{seenAt: now, seq: d.seq}
	return true
}

// rememberFor records an ID under a caller-supplied TTL, which lets the replay
// window be tuned per request. A non-positive ttl falls back to the cache's
// configured default rather than disabling replay protection entirely.
func (d *deliveryCache) rememberFor(id string, ttl time.Duration) bool {
	if ttl <= 0 {
		ttl = d.ttl
	}
	if ttl == d.ttl {
		return d.remember(id)
	}

	// Same logic as remember with a per-call window.
	if id == "" {
		return true
	}
	now := time.Now()

	d.mu.Lock()
	defer d.mu.Unlock()

	for key, entry := range d.seen {
		if now.Sub(entry.seenAt) > ttl {
			delete(d.seen, key)
		}
	}
	if entry, ok := d.seen[id]; ok && now.Sub(entry.seenAt) <= ttl {
		return false
	}
	if len(d.seen) >= d.max {
		var oldestKey string
		var oldestSeq uint64
		for key, entry := range d.seen {
			if oldestKey == "" || entry.seq < oldestSeq {
				oldestKey, oldestSeq = key, entry.seq
			}
		}
		if oldestKey != "" {
			delete(d.seen, oldestKey)
		}
	}
	d.seq++
	d.seen[id] = deliveryCacheEntry{seenAt: now, seq: d.seq}
	return true
}

// size reports the number of retained entries, for tests and metrics.
func (d *deliveryCache) size() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return len(d.seen)
}
