package models

// Mapping represents a mapping between Loxone and HUE resources
type Mapping struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	LoxoneID    string `json:"loxone_id"`    // Loxone UUID or custom ID
	HueID       string `json:"hue_id"`       // HUE resource ID
	HueType     string `json:"hue_type"`     // "light", "group", "scene"
	Enabled     bool   `json:"enabled"`
	Description string `json:"description,omitempty"`
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
