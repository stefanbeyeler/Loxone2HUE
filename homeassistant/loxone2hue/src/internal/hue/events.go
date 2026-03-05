package hue

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/models"
)

// sensorTypes lists HUE resource types that are sensors
var sensorTypes = map[string]bool{
	"motion":          true,
	"temperature":     true,
	"light_level":     true,
	"button":          true,
	"contact":         true,
	"relative_rotary": true,
	"device_power":    true,
}

// IsSensorType returns true if the resource type is a sensor
func IsSensorType(resourceType string) bool {
	return sensorTypes[resourceType]
}

// StartEventStream connects to the HUE Bridge SSE event stream
func (c *Client) StartEventStream(ctx context.Context) error {
	if !c.IsConfigured() {
		return fmt.Errorf("client not configured")
	}

	go c.eventStreamLoop(ctx)
	return nil
}

func (c *Client) eventStreamLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-c.stopChan:
			return
		default:
			if err := c.connectEventStream(ctx); err != nil {
				log.Error().Err(err).Msg("Event stream error, reconnecting...")
				time.Sleep(5 * time.Second)
			}
		}
	}
}

func (c *Client) connectEventStream(ctx context.Context) error {
	url := fmt.Sprintf("%s/eventstream/clip/v2", c.baseURL)

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("hue-application-key", c.applicationKey)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %s", resp.Status)
	}

	log.Info().Str("bridge", c.bridgeIP).Msg("Connected to HUE event stream")

	scanner := bufio.NewScanner(resp.Body)
	var eventData strings.Builder

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return nil
		case <-c.stopChan:
			return nil
		default:
		}

		line := scanner.Text()

		if strings.HasPrefix(line, "data: ") {
			eventData.WriteString(strings.TrimPrefix(line, "data: "))
		} else if line == "" && eventData.Len() > 0 {
			// End of event
			c.processEvent(eventData.String())
			eventData.Reset()
		}
	}

	return scanner.Err()
}

// EventItem represents a single item in the SSE event data array
type EventItem struct {
	ID    string `json:"id"`
	IDV1  string `json:"id_v1"`
	Type  string `json:"type"`
	Owner *struct {
		RID   string `json:"rid"`
		RType string `json:"rtype"`
	} `json:"owner,omitempty"`
	// Light fields
	On *struct {
		On bool `json:"on"`
	} `json:"on,omitempty"`
	Dimming *struct {
		Brightness float64 `json:"brightness"`
	} `json:"dimming,omitempty"`
	ColorTemperature *struct {
		Mirek int `json:"mirek"`
	} `json:"color_temperature,omitempty"`
	Color *struct {
		XY struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		} `json:"xy"`
	} `json:"color,omitempty"`
	// Motion sensor
	Motion *struct {
		Motion       bool `json:"motion"`
		MotionValid  bool `json:"motion_valid"`
		MotionReport *struct {
			Changed string `json:"changed"`
			Motion  bool   `json:"motion"`
		} `json:"motion_report,omitempty"`
	} `json:"motion,omitempty"`
	// Temperature sensor
	Temperature *struct {
		Temperature      float64 `json:"temperature"`
		TemperatureValid bool    `json:"temperature_valid"`
		TemperatureReport *struct {
			Changed     string  `json:"changed"`
			Temperature float64 `json:"temperature"`
		} `json:"temperature_report,omitempty"`
	} `json:"temperature,omitempty"`
	// Light level sensor
	LightSensor *struct {
		LightLevel      int  `json:"light_level"`
		LightLevelValid bool `json:"light_level_valid"`
		LightLevelReport *struct {
			Changed    string `json:"changed"`
			LightLevel int    `json:"light_level"`
		} `json:"light_level_report,omitempty"`
	} `json:"light,omitempty"`
	// Button
	Button *struct {
		ButtonReport *struct {
			Updated string `json:"updated"`
			Event   string `json:"event"`
		} `json:"button_report,omitempty"`
		LastEvent string `json:"last_event"`
	} `json:"button,omitempty"`
	Metadata *struct {
		ControlID int `json:"control_id"`
	} `json:"metadata,omitempty"`
	// Contact
	ContactReport *struct {
		Changed string `json:"changed"`
		State   string `json:"state"`
	} `json:"contact_report,omitempty"`
	// Relative rotary
	RelativeRotary *struct {
		RotaryReport *struct {
			Updated  string `json:"updated"`
			Action   string `json:"action"`
			Rotation struct {
				Direction string `json:"direction"`
				Steps     int    `json:"steps"`
				Duration  int    `json:"duration"`
			} `json:"rotation"`
		} `json:"rotary_report,omitempty"`
	} `json:"relative_rotary,omitempty"`
	// Device power
	PowerState *struct {
		BatteryLevel int    `json:"battery_level"`
		BatteryState string `json:"battery_state"`
	} `json:"power_state,omitempty"`
}

func (c *Client) processEvent(data string) {
	var events []struct {
		CreationTime time.Time   `json:"creationtime"`
		Data         []EventItem `json:"data"`
		Type         string      `json:"type"`
	}

	if err := json.Unmarshal([]byte(data), &events); err != nil {
		log.Warn().Err(err).Msg("Failed to parse event data")
		return
	}

	for _, event := range events {
		for _, item := range event.Data {
			// Update internal state
			c.updateFromEvent(item)

			// Send event to channel
			select {
			case c.eventChan <- Event{
				Type:      item.Type,
				ID:        item.ID,
				IDV1:      item.IDV1,
				Data:      item,
				CreatedAt: event.CreationTime,
			}:
			default:
				// Channel full, skip
			}
		}
	}
}

func (c *Client) updateFromEvent(item EventItem) {
	c.mu.Lock()
	defer c.mu.Unlock()

	switch {
	case item.Type == "light":
		light, ok := c.lights[item.ID]
		if !ok {
			return
		}
		if item.On != nil {
			light.State.On = item.On.On
		}
		if item.Dimming != nil {
			light.State.Brightness = item.Dimming.Brightness
		}
		if item.ColorTemperature != nil {
			light.State.ColorTemp = item.ColorTemperature.Mirek
		}
		if item.Color != nil {
			if light.State.Color == nil {
				light.State.Color = &models.Color{}
			}
			light.State.Color.XY = [2]float64{item.Color.XY.X, item.Color.XY.Y}
		}
		log.Debug().Str("id", item.ID).Msg("Light state updated from event")

	case IsSensorType(item.Type):
		sensor, ok := c.sensors[item.ID]
		if !ok {
			return
		}
		c.updateSensorFromEvent(sensor, item)
		log.Debug().Str("id", item.ID).Str("type", item.Type).Msg("Sensor state updated from event")
	}
}

func (c *Client) updateSensorFromEvent(sensor *models.Sensor, item EventItem) {
	switch item.Type {
	case "motion":
		if item.Motion != nil {
			motion := item.Motion.Motion
			if item.Motion.MotionReport != nil {
				motion = item.Motion.MotionReport.Motion
			}
			sensor.State.Motion = &motion
		}

	case "temperature":
		if item.Temperature != nil {
			temp := item.Temperature.Temperature
			if item.Temperature.TemperatureReport != nil {
				temp = item.Temperature.TemperatureReport.Temperature
			}
			sensor.State.Temperature = &temp
		}

	case "light_level":
		if item.LightSensor != nil {
			level := item.LightSensor.LightLevel
			if item.LightSensor.LightLevelReport != nil {
				level = item.LightSensor.LightLevelReport.LightLevel
			}
			sensor.State.LightLevel = &level
		}

	case "button":
		if item.Button != nil {
			event := item.Button.LastEvent
			if item.Button.ButtonReport != nil {
				event = item.Button.ButtonReport.Event
			}
			if event != "" {
				sensor.State.ButtonEvent = &event
			}
		}

	case "contact":
		if item.ContactReport != nil {
			sensor.State.ContactState = &item.ContactReport.State
		}

	case "relative_rotary":
		if item.RelativeRotary != nil && item.RelativeRotary.RotaryReport != nil {
			sensor.State.RotaryAction = &item.RelativeRotary.RotaryReport.Action
			steps := item.RelativeRotary.RotaryReport.Rotation.Steps
			if item.RelativeRotary.RotaryReport.Rotation.Direction == "counter_clockwise" {
				steps = -steps
			}
			sensor.State.RotarySteps = &steps
		}

	case "device_power":
		if item.PowerState != nil {
			sensor.State.BatteryLevel = &item.PowerState.BatteryLevel
			sensor.State.BatteryState = &item.PowerState.BatteryState
		}
	}
}
