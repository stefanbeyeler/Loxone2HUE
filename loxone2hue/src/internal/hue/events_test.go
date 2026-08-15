package hue

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const testEventPayload = `[{"creationtime":"2024-01-01T00:00:00Z","type":"update",` +
	`"data":[{"id":"light-1","type":"light","on":{"on":true}}]}]`

// fakeBridge serves a HUE-style SSE stream and counts how often it was
// connected to. The returned address has no scheme, matching what Configure
// expects as a bridge IP.
func fakeBridge() (addr string, conns *int64, stop func()) {
	var n int64

	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/eventstream/clip/v2" {
			http.NotFound(w, r)
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			return
		}

		atomic.AddInt64(&n, 1)
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)

		for {
			fmt.Fprintf(w, "data: %s\n\n", testEventPayload)
			flusher.Flush()

			select {
			case <-r.Context().Done():
				return
			case <-time.After(50 * time.Millisecond):
			}
		}
	}))

	return strings.TrimPrefix(srv.URL, "https://"), &n, srv.Close
}

// waitForConns waits until the counter reaches want.
func waitForConns(conns *int64, want int64, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if atomic.LoadInt64(conns) >= want {
			return true
		}
		time.Sleep(20 * time.Millisecond)
	}
	return false
}

// TestEventStreamStartsAfterConfigure covers pairing through the Web UI: the
// gateway starts with no bridge, and the stream has to come up on its own once
// pairing stores a bridge. Previously the stream was only ever started at boot,
// so feedback to Loxone stayed dead until the next restart.
func TestEventStreamStartsAfterConfigure(t *testing.T) {
	addr, conns, stop := fakeBridge()
	defer stop()

	c := NewClient("", "")
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go c.RunEventStream(ctx)

	// Unconfigured: the supervisor must idle rather than connect anywhere.
	time.Sleep(200 * time.Millisecond)
	if got := atomic.LoadInt64(conns); got != 0 {
		t.Fatalf("connected %d times while unconfigured, want 0", got)
	}

	// This is what PairBridge does after a successful pairing.
	c.Configure(addr, "test-key")

	select {
	case ev := <-c.Events():
		if ev.ID != "light-1" {
			t.Fatalf("unexpected event id %q", ev.ID)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("no event after Configure: stream did not start after pairing")
	}
}

// TestEventStreamSwitchesBridgeOnReconfigure covers restoring a backup that
// carries a different bridge: the running stream has to move to the new one.
func TestEventStreamSwitchesBridgeOnReconfigure(t *testing.T) {
	addrA, connsA, stopA := fakeBridge()
	defer stopA()
	addrB, connsB, stopB := fakeBridge()
	defer stopB()

	c := NewClient("", "")
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go c.RunEventStream(ctx)

	c.Configure(addrA, "key-a")
	if !waitForConns(connsA, 1, 10*time.Second) {
		t.Fatal("stream never connected to the first bridge")
	}

	// This is what RestoreBackup does.
	c.Configure(addrB, "key-b")
	if !waitForConns(connsB, 1, 10*time.Second) {
		t.Fatal("stream did not move to the restored bridge")
	}

	if _, key := c.endpoint(); key != "key-b" {
		t.Fatalf("application key = %q, want key-b", key)
	}
}

// TestEventStreamBacksOffOnCleanClose guards the reconnect loop: a bridge that
// closes the stream immediately must not spin the supervisor at full speed.
func TestEventStreamBacksOffOnCleanClose(t *testing.T) {
	var conns int64

	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&conns, 1)
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK) // then return straight away: clean EOF
	}))
	defer srv.Close()

	c := NewClient(strings.TrimPrefix(srv.URL, "https://"), "key")
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go c.RunEventStream(ctx)

	time.Sleep(2 * time.Second)

	// With a 5s backoff a single attempt is expected; without any backoff this
	// counter runs into the thousands.
	if got := atomic.LoadInt64(&conns); got > 3 {
		t.Fatalf("reconnected %d times in 2s, expected backoff", got)
	}
}
