package models

// Mapping represents a mapping between Loxone and HUE resources
type Mapping struct {
	ID           string `json:"id" yaml:"id"`
	Name         string `json:"name" yaml:"name"`
	LoxoneID     string `json:"loxone_id" yaml:"loxone_id"`       // Loxone UUID or custom ID
	HueID        string `json:"hue_id" yaml:"hue_id"`             // HUE resource ID
	HueType      string `json:"hue_type" yaml:"hue_type"`         // "light", "group", "scene"
	Enabled      bool   `json:"enabled" yaml:"enabled"`
	FeedbackUDP  *bool  `json:"feedback_udp,omitempty" yaml:"feedback_udp,omitempty"`
	FeedbackHTTP *bool  `json:"feedback_http,omitempty" yaml:"feedback_http,omitempty"`
	Description  string `json:"description,omitempty" yaml:"description,omitempty"`
	MiniserverID string `json:"miniserver_id,omitempty" yaml:"miniserver_id,omitempty"`
}

// ShouldFeedbackUDP returns true if UDP feedback should be sent for this mapping.
// Defaults to true when FeedbackUDP is nil (not explicitly configured).
func (m *Mapping) ShouldFeedbackUDP() bool {
	if m.FeedbackUDP == nil {
		return true
	}
	return *m.FeedbackUDP
}

// ShouldFeedbackHTTP returns true if HTTP feedback should be sent for this mapping.
// Defaults to true when FeedbackHTTP is nil (not explicitly configured).
func (m *Mapping) ShouldFeedbackHTTP() bool {
	if m.FeedbackHTTP == nil {
		return true
	}
	return *m.FeedbackHTTP
}

// LoxoneCommand represents an incoming command from Loxone
type LoxoneCommand struct {
	Type   string                 `json:"type"`   // "command" or "query"
	Target string                 `json:"target"` // Mapped device/group ID
	Action string                 `json:"action"` // "set", "get", "scene"
	Params map[string]interface{} `json:"params,omitempty"`
}

// LoxoneStatus represents a status update sent to Loxone
type LoxoneStatus struct {
	Type    string      `json:"type"` // "status"
	Device  string      `json:"device"`
	State   interface{} `json:"state"`
}

// WebSocketMessage is a generic WebSocket message wrapper
type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}
