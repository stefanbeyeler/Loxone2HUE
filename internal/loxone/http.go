package loxone

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/config"
)

// httpTarget represents a single HTTP connection to a Miniserver
type httpTarget struct {
	baseURL  string
	user     string
	password string
	sendAll  bool
	name     string
}

// HTTPSender sends status updates to one or more Loxone Miniservers via HTTP
type HTTPSender struct {
	targets map[string]*httpTarget // key = MiniserverConfig.ID
	client  *http.Client
	mu      sync.Mutex
}

// NewHTTPSender creates a new HTTP sender
func NewHTTPSender() *HTTPSender {
	return &HTTPSender{
		targets: make(map[string]*httpTarget),
		client: &http.Client{
			Timeout: 5 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		},
	}
}

// Configure sets up or reconfigures all HTTP targets based on current miniserver config.
func (s *HTTPSender) Configure(miniservers []config.MiniserverConfig) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Clear existing targets
	s.targets = make(map[string]*httpTarget)

	for _, ms := range miniservers {
		if !ms.HTTPEnabled {
			continue
		}

		baseURL := ms.HTTPURL
		if baseURL == "" {
			if ms.IP == "" {
				continue
			}
			baseURL = fmt.Sprintf("http://%s", ms.IP)
		}

		s.targets[ms.ID] = &httpTarget{
			baseURL:  baseURL,
			user:     ms.HTTPUser,
			password: ms.HTTPPassword,
			sendAll:  ms.SendAll,
			name:     ms.Name,
		}

		log.Info().Str("id", ms.ID).Str("name", ms.Name).Str("url", baseURL).Msg("HTTP feedback configured for miniserver")
	}
}

// IsEnabled returns whether at least one HTTP target is active
func (s *HTTPSender) IsEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.targets) > 0
}

// HasSendAll returns true if at least one target has send_all enabled
func (s *HTTPSender) HasSendAll() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.targets {
		if t.sendAll {
			return true
		}
	}
	return false
}

// Close drops all targets and releases the pooled connections.
func (s *HTTPSender) Close() {
	s.mu.Lock()
	s.targets = make(map[string]*httpTarget)
	s.mu.Unlock()

	s.client.CloseIdleConnections()
}

// Send sends a single property update to a specific Miniserver via HTTP.
// Uses Loxone Virtual HTTP Input format: GET /dev/sps/io/<loxone_id>/<value>
func (s *HTTPSender) Send(miniserverID, loxoneID, property string, value interface{}) {
	s.mu.Lock()
	t, ok := s.targets[miniserverID]
	s.mu.Unlock()

	if !ok {
		return
	}

	s.sendHTTP(t, loxoneID, property, value)
}

// SendToAll sends a single property update to all Miniservers that have send_all enabled.
func (s *HTTPSender) SendToAll(loxoneID, property string, value interface{}) {
	s.mu.Lock()
	targets := make([]*httpTarget, 0)
	for _, t := range s.targets {
		if t.sendAll {
			targets = append(targets, t)
		}
	}
	s.mu.Unlock()

	for _, t := range targets {
		s.sendHTTP(t, loxoneID, property, value)
	}
}

// sendHTTP performs the actual HTTP request to the Loxone Miniserver.
// Format: GET /dev/sps/io/<loxone_id>_<property>/<value>
func (s *HTTPSender) sendHTTP(t *httpTarget, loxoneID, property string, value interface{}) {
	viName := fmt.Sprintf("%s_%s", loxoneID, property)
	base := strings.TrimRight(t.baseURL, "/")
	// Escape the value as well: sensor payloads such as a contact state are
	// free-form strings and a "/" would otherwise change the request path.
	reqURL := fmt.Sprintf("%s/dev/sps/io/%s/%s", base,
		url.PathEscape(viName), url.PathEscape(fmt.Sprintf("%v", value)))

	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		log.Warn().Err(err).Str("miniserver", t.name).Str("url", reqURL).Msg("Failed to create HTTP request")
		return
	}

	if t.user != "" {
		req.SetBasicAuth(t.user, t.password)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		log.Warn().Err(err).Str("miniserver", t.name).Str("url", reqURL).Msg("Failed to send HTTP feedback")
		return
	}
	resp.Body.Close()

	log.Info().Str("miniserver", t.name).Str("vi", viName).Interface("value", value).Int("status", resp.StatusCode).Msg("HTTP feedback sent")
}
