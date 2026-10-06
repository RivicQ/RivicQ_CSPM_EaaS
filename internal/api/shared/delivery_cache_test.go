package shared

import (
	"strconv"
	"sync"
	"testing"
	"time"
)

// TestDeliveryCacheRejectsImmediateReplay is the core property: the second
// sighting of an identifier is not new.
func TestDeliveryCacheRejectsImmediateReplay(t *testing.T) {
	c := newDeliveryCache(time.Minute, 100)

	if !c.remember("abc") {
		t.Fatal("first sighting should be new")
	}
	if c.remember("abc") {
		t.Error("second sighting of the same ID should be rejected as a replay")
	}
}

// TestDeliveryCacheDistinguishesIDs guards against a cache that rejects
// everything, which would be indistinguishable from a working replay defence
// in a test that only sends one delivery.
func TestDeliveryCacheDistinguishesIDs(t *testing.T) {
	c := newDeliveryCache(time.Minute, 100)

	for _, id := range []string{"a", "b", "c", "d"} {
		if !c.remember(id) {
			t.Errorf("distinct delivery %q was treated as a replay", id)
		}
	}
}

// TestDeliveryCacheForgetsAfterTTL is why the TTL matters: a provider that
// legitimately reissues an ID after a long outage must not be blocked forever.
func TestDeliveryCacheForgetsAfterTTL(t *testing.T) {
	c := newDeliveryCache(20*time.Millisecond, 100)

	if !c.remember("later") {
		t.Fatal("first sighting should be new")
	}
	time.Sleep(40 * time.Millisecond)
	if !c.remember("later") {
		t.Error("delivery should be accepted again once the TTL has passed")
	}
}

// TestDeliveryCacheEvictsExpiredOnWrite proves memory does not grow without
// bound while the process is idle. Nothing calls remember during that window,
// so pruning has to happen on the write path.
func TestDeliveryCacheEvictsExpiredOnWrite(t *testing.T) {
	c := newDeliveryCache(20*time.Millisecond, 1000)

	for i := 0; i < 200; i++ {
		c.remember(strconv.Itoa(i))
	}
	time.Sleep(40 * time.Millisecond)
	c.remember("fresh")

	if got := c.size(); got > 5 {
		t.Errorf("expired entries were retained: %d entries remain", got)
	}
}

// TestDeliveryCacheHonoursHardCap covers the pressure case: even when pruning
// cannot free anything, the map must stop growing rather than exhaust memory.
func TestDeliveryCacheHonoursHardCap(t *testing.T) {
	const max = 50
	c := newDeliveryCache(time.Hour, max)

	for i := 0; i < max*4; i++ {
		c.remember(string(rune('A'+i%26)) + time.Duration(i).String())
	}
	if got := c.size(); got > max {
		t.Errorf("cache grew past its cap: %d > %d", got, max)
	}
}

// TestDeliveryCacheEvictsOldestUnderPressure checks the cap is reached by
// dropping the stalest entry, so a burst cannot evict the ID that is currently
// being replayed.
func TestDeliveryCacheEvictsOldestUnderPressure(t *testing.T) {
	const max = 10
	c := newDeliveryCache(time.Hour, max)

	c.remember("oldest")
	time.Sleep(5 * time.Millisecond)
	distinct := map[string]bool{}
	for i := 0; i < max*3; i++ {
		id := strconv.Itoa(i) + "-filler"
		distinct[id] = true
		c.remember(id)
	}
	t.Logf("distinct filler ids=%d cache size=%d", len(distinct), c.size())
	// Re-accepting the ID means it was evicted to make room, which is the
	// desired outcome: capacity pressure should drop the stalest entry.
	if !c.remember("oldest") {
		t.Error("oldest entry survived the cache cap instead of being evicted")
	}
}

// TestDeliveryCacheHandlesConcurrentTraffic exercises the lock. A delivery cache
// that loses entries under concurrency silently stops detecting replays, and
// the race only shows up in production under load.
func TestDeliveryCacheHandlesConcurrentTraffic(t *testing.T) {
	c := newDeliveryCache(time.Minute, 10000)

	var wg sync.WaitGroup
	accepted := make([]bool, 200)
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			accepted[i] = c.remember("same-delivery")
		}(i)
	}
	wg.Wait()

	count := 0
	for _, ok := range accepted {
		if ok {
			count++
		}
	}
	if count != 1 {
		t.Errorf("concurrent identical deliveries: %d accepted, want exactly 1", count)
	}
}

// TestDeliveryCacheAcceptsEmptyID documents that a provider omitting the header
// is not rejected outright; the signature check is still the gate.
func TestDeliveryCacheAcceptsEmptyID(t *testing.T) {
	c := newDeliveryCache(time.Minute, 10)

	if !c.remember("") {
		t.Error("an empty delivery ID should not be treated as a replay")
	}
	if !c.remember("") {
		t.Error("an empty delivery ID should not be treated as a replay on repeat")
	}
}

// TestRememberForUsesCallerTTL checks the replay window can be tuned per request
// without rebuilding the cache.
func TestRememberForUsesCallerTTL(t *testing.T) {
	c := newDeliveryCache(time.Hour, 100)

	if !c.rememberFor("tuned", 20*time.Millisecond) {
		t.Fatal("first sighting should be new")
	}
	if c.rememberFor("tuned", 20*time.Millisecond) {
		t.Error("immediate repeat should be refused")
	}
	time.Sleep(40 * time.Millisecond)
	if !c.rememberFor("tuned", 20*time.Millisecond) {
		t.Error("a short per-call TTL should have expired the entry")
	}
}

// TestRememberForZeroTTLFallsBack proves a misconfigured value cannot silently
// disable replay protection: it falls back to the configured window instead.
func TestRememberForZeroTTLFallsBack(t *testing.T) {
	c := newDeliveryCache(time.Minute, 100)

	if !c.rememberFor("fallback", 0) {
		t.Fatal("first sighting should be new")
	}
	if c.rememberFor("fallback", -time.Second) {
		t.Error("a non-positive TTL must not disable replay protection")
	}
}
