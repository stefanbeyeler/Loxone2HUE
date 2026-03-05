package models

// Sensor represents a HUE sensor device (motion, temperature, light level, button, contact, rotary, device power)
type Sensor struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Type     string      `json:"type"` // "motion", "temperature", "light_level", "button", "contact", "relative_rotary", "device_power"
	DeviceID string      `json:"device_id,omitempty"`
	Owner    string      `json:"owner,omitempty"` // parent device name
	State    SensorState `json:"state"`
}

// SensorState represents the current state of a sensor
type SensorState struct {
	// Motion sensor
	Motion *bool `json:"motion,omitempty"`

	// Temperature sensor (Celsius)
	Temperature *float64 `json:"temperature,omitempty"`

	// Ambient light level (lux)
	LightLevel *int `json:"light_level,omitempty"`

	// Button
	ButtonEvent *string `json:"button_event,omitempty"` // "initial_press", "repeat", "short_release", "long_release", "long_press"
	ControlID   *int    `json:"control_id,omitempty"`   // button index (1-based)

	// Contact sensor
	ContactState *string `json:"contact_state,omitempty"` // "contact", "no_contact"

	// Rotary (e.g., Hue Tap Dial)
	RotaryAction *string `json:"rotary_action,omitempty"` // "start", "repeat"
	RotarySteps  *int    `json:"rotary_steps,omitempty"`  // positive=clockwise, negative=counter-clockwise

	// Device power / battery
	BatteryLevel *int    `json:"battery_level,omitempty"` // 0-100
	BatteryState *string `json:"battery_state,omitempty"` // "normal", "low", "critical"

	// Common
	Enabled     bool   `json:"enabled"`
	LastUpdated string `json:"last_updated,omitempty"`
}
