package loxone

import (
	"fmt"
	"net"
	"sync"

	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/config"
)

// UDPSender sends status updates to a Loxone Miniserver via UDP
type UDPSender struct {
	conn    *net.UDPConn
	mu      sync.Mutex
	enabled bool
}

// NewUDPSender creates a new UDP sender (initially disabled)
func NewUDPSender() *UDPSender {
	return &UDPSender{}
}

// Configure sets up or reconfigures the UDP sender based on current config.
// The targetIP is the Miniserver IP from the main Loxone config.
// Call this at startup and whenever the config changes.
func (s *UDPSender) Configure(targetIP string, cfg config.UDPFeedbackConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Close existing connection if any
	if s.conn != nil {
		s.conn.Close()
		s.conn = nil
	}

	s.enabled = cfg.Enabled
	if !cfg.Enabled || targetIP == "" || cfg.Port == 0 {
		s.enabled = false
		log.Info().Msg("UDP feedback disabled")
		return nil
	}

	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", targetIP, cfg.Port))
	if err != nil {
		return fmt.Errorf("invalid UDP address: %w", err)
	}

	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		return fmt.Errorf("failed to create UDP connection: %w", err)
	}

	s.conn = conn

	log.Info().Str("addr", addr.String()).Msg("UDP feedback configured")
	return nil
}

// IsEnabled returns whether UDP feedback is currently enabled
func (s *UDPSender) IsEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.enabled && s.conn != nil
}

// Send sends a single property update to the Loxone Miniserver.
// Format: "<loxone_id>/<property>:<value>"
// This is fire-and-forget; errors are logged but not returned.
func (s *UDPSender) Send(loxoneID, property string, value interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.enabled || s.conn == nil {
		return
	}

	msg := fmt.Sprintf("%s/%s:%v", loxoneID, property, value)

	_, err := s.conn.Write([]byte(msg))
	if err != nil {
		log.Warn().Err(err).Str("msg", msg).Msg("Failed to send UDP feedback")
	} else {
		log.Debug().Str("msg", msg).Msg("UDP feedback sent")
	}
}

// Close closes the UDP connection
func (s *UDPSender) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.conn != nil {
		s.conn.Close()
		s.conn = nil
	}
	s.enabled = false
}
