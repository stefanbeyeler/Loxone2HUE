package hue

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// TestGetSensorsDoesNotBlockCacheReaders pins the lock scope of GetSensors.
// It used to hold the write lock across all seven sensor requests, so every
// cache reader — including the ones the event stream calls per incoming event —
// stalled for the full duration of the refresh.
func TestGetSensorsDoesNotBlockCacheReaders(t *testing.T) {
	const delay = 200 * time.Millisecond

	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(delay)
		w.Write([]byte(`{"data":[]}`))
	}))
	defer srv.Close()

	c := NewClient(strings.TrimPrefix(srv.URL, "https://"), "key")
	defer c.Close()

	done := make(chan struct{})
	go func() {
		defer close(done)
		if _, err := c.GetSensors(); err != nil {
			t.Errorf("GetSensors: %v", err)
		}
	}()

	// Let the device lookup finish so GetSensors is inside the endpoint loop.
	time.Sleep(delay + 50*time.Millisecond)

	start := time.Now()
	c.GetSensorName("some-sensor")
	blocked := time.Since(start)

	<-done

	// A cache read is a map lookup; anything near the request delay means it
	// waited on the refresh.
	if blocked > delay/2 {
		t.Errorf("cache read blocked for %v while GetSensors was fetching", blocked)
	}
}

// TestGetSensorsPopulatesCache guards against the lock rework dropping the
// cache update entirely.
func TestGetSensorsPopulatesCache(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/clip/v2/resource/device":
			w.Write([]byte(`{"data":[{"id":"dev-1","metadata":{"name":"Flur"}}]}`))
		case "/clip/v2/resource/motion":
			w.Write([]byte(`{"data":[{"id":"sensor-1","owner":{"rid":"dev-1","rtype":"device"},` +
				`"enabled":true,"motion":{"motion":true,"motion_valid":true}}]}`))
		default:
			w.Write([]byte(`{"data":[]}`))
		}
	}))
	defer srv.Close()

	c := NewClient(strings.TrimPrefix(srv.URL, "https://"), "key")
	defer c.Close()

	sensors, err := c.GetSensors()
	if err != nil {
		t.Fatalf("GetSensors: %v", err)
	}
	if len(sensors) != 1 {
		t.Fatalf("sensors = %d, want 1", len(sensors))
	}

	cached := c.GetSensor("sensor-1")
	if cached == nil {
		t.Fatal("sensor was not written to the cache")
	}
	if want := "Flur Motion"; cached.Name != want {
		t.Errorf("name = %q, want %q", cached.Name, want)
	}
	if got := c.GetSensorName("sensor-1"); got != "Flur Motion" {
		t.Errorf("GetSensorName = %q", got)
	}
}
