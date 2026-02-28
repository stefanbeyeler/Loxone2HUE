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

func (c *Client) processEvent(data string) {
	var events []struct {
		CreationTime time.Time `json:"creationtime"`
		Data         []struct {
			ID    string                 `json:"id"`
			IDV1  string                 `json:"id_v1"`
			Type  string                 `json:"type"`
			Owner *struct {
				RID   string `json:"rid"`
				RType string `json:"rtype"`
			} `json:"owner,omitempty"`
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
		} `json:"data"`
		Type string `json:"type"`
	}

	if err := json.Unmarshal([]byte(data), &events); err != nil {
		log.Warn().Err(err).Msg("Failed to parse event data")
		return
	}

	for _, event := range events {
		for _, item := range event.Data {
			// Update internal state
			c.updateFromEvent(item.ID, item.Type, item)

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

func (c *Client) updateFromEvent(id, resourceType string, data interface{}) {
	if resourceType != "light" {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	light, ok := c.lights[id]
	if !ok {
		return
	}

	// Type assertion to access fields
	eventData, ok := data.(struct {
		ID    string                 `json:"id"`
		IDV1  string                 `json:"id_v1"`
		Type  string                 `json:"type"`
		Owner *struct {
			RID   string `json:"rid"`
			RType string `json:"rtype"`
		} `json:"owner,omitempty"`
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
	})

	if !ok {
		return
	}

	if eventData.On != nil {
		light.State.On = eventData.On.On
	}
	if eventData.Dimming != nil {
		light.State.Brightness = eventData.Dimming.Brightness
	}
	if eventData.ColorTemperature != nil {
		light.State.ColorTemp = eventData.ColorTemperature.Mirek
	}
	if eventData.Color != nil {
		if light.State.Color == nil {
			light.State.Color = &models.Color{}
		}
		light.State.Color.XY = [2]float64{eventData.Color.XY.X, eventData.Color.XY.Y}
	}

	log.Debug().Str("id", id).Msg("Light state updated from event")
}
