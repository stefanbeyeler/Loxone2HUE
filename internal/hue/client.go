package hue

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/models"
)

// Client represents a HUE Bridge API client
type Client struct {
	bridgeIP       string
	applicationKey string
	httpClient     *http.Client
	baseURL        string

	lights   map[string]*models.Light
	groups   map[string]*models.Group
	scenes   map[string]*models.Scene
	mu       sync.RWMutex

	eventChan chan Event
	stopChan  chan struct{}
}

// Event represents a HUE event from the SSE stream
type Event struct {
	Type      string      `json:"type"`
	ID        string      `json:"id"`
	IDV1      string      `json:"id_v1,omitempty"`
	Data      interface{} `json:"data"`
	CreatedAt time.Time   `json:"creationtime"`
}

// NewClient creates a new HUE Bridge client
func NewClient(bridgeIP, applicationKey string) *Client {
	// HUE Bridge uses self-signed certificates
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	return &Client{
		bridgeIP:       bridgeIP,
		applicationKey: applicationKey,
		httpClient: &http.Client{
			Transport: tr,
			Timeout:   10 * time.Second,
		},
		baseURL:   fmt.Sprintf("https://%s", bridgeIP),
		lights:    make(map[string]*models.Light),
		groups:    make(map[string]*models.Group),
		scenes:    make(map[string]*models.Scene),
		eventChan: make(chan Event, 100),
		stopChan:  make(chan struct{}),
	}
}

// SetBridgeIP updates the bridge IP address
func (c *Client) SetBridgeIP(ip string) {
	c.bridgeIP = ip
	c.baseURL = fmt.Sprintf("https://%s", ip)
}

// SetApplicationKey updates the application key
func (c *Client) SetApplicationKey(key string) {
	c.applicationKey = key
}

// IsConfigured returns true if the client has bridge IP and application key
func (c *Client) IsConfigured() bool {
	return c.bridgeIP != "" && c.applicationKey != ""
}

// request performs an HTTP request to the HUE Bridge API
func (c *Client) request(method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	url := fmt.Sprintf("%s%s", c.baseURL, path)
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.applicationKey != "" {
		req.Header.Set("hue-application-key", c.applicationKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HUE API error: %s - %s", resp.Status, string(respBody))
	}

	return respBody, nil
}

// Pair attempts to create a new application key by pressing the bridge button
func (c *Client) Pair(appName, instanceName string) (string, error) {
	body := map[string]interface{}{
		"devicetype":        fmt.Sprintf("%s#%s", appName, instanceName),
		"generateclientkey": true,
	}

	log.Info().Str("bridge_ip", c.bridgeIP).Msg("Attempting to pair with HUE Bridge")

	resp, err := c.request("POST", "/api", body)
	if err != nil {
		log.Error().Err(err).Str("bridge_ip", c.bridgeIP).Msg("Failed to connect to HUE Bridge")
		return "", fmt.Errorf("connection to bridge failed: %v", err)
	}

	log.Debug().Str("response", string(resp)).Msg("Pairing response from bridge")

	var result []map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return "", fmt.Errorf("invalid response from bridge: %v", err)
	}

	if len(result) == 0 {
		return "", fmt.Errorf("empty response from bridge")
	}

	if errInfo, ok := result[0]["error"]; ok {
		errMap := errInfo.(map[string]interface{})
		errType := int(errMap["type"].(float64))
		errDesc := errMap["description"].(string)
		log.Warn().Int("error_type", errType).Str("description", errDesc).Msg("Bridge pairing error")
		// Error type 101 = link button not pressed
		if errType == 101 {
			return "", fmt.Errorf("link button not pressed - please press the link button on your HUE Bridge and try again within 30 seconds")
		}
		return "", fmt.Errorf("pairing error: %s", errDesc)
	}

	if success, ok := result[0]["success"]; ok {
		successMap := success.(map[string]interface{})
		if username, ok := successMap["username"]; ok {
			c.applicationKey = username.(string)
			log.Info().Msg("Successfully paired with HUE Bridge")
			return c.applicationKey, nil
		}
	}

	return "", fmt.Errorf("unexpected response: %s", string(resp))
}

// GetBridgeInfo returns information about the bridge
func (c *Client) GetBridgeInfo() (map[string]interface{}, error) {
	resp, err := c.request("GET", "/clip/v2/resource/bridge", nil)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// GetLights fetches all lights from the bridge
func (c *Client) GetLights() ([]*models.Light, error) {
	resp, err := c.request("GET", "/clip/v2/resource/light", nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []hueLight `json:"data"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	lights := make([]*models.Light, 0, len(result.Data))
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, hl := range result.Data {
		light := convertHueLight(hl)
		c.lights[light.ID] = light
		lights = append(lights, light)
	}

	log.Debug().Int("count", len(lights)).Msg("Fetched lights from bridge")
	return lights, nil
}

// GetLight fetches a single light by ID
func (c *Client) GetLight(id string) (*models.Light, error) {
	c.mu.RLock()
	if light, ok := c.lights[id]; ok {
		c.mu.RUnlock()
		return light, nil
	}
	c.mu.RUnlock()

	resp, err := c.request("GET", fmt.Sprintf("/clip/v2/resource/light/%s", id), nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []hueLight `json:"data"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	if len(result.Data) == 0 {
		return nil, fmt.Errorf("light not found: %s", id)
	}

	light := convertHueLight(result.Data[0])
	c.mu.Lock()
	c.lights[light.ID] = light
	c.mu.Unlock()

	return light, nil
}

// SetLightState updates the state of a light
func (c *Client) SetLightState(id string, cmd models.DeviceCommand) error {
	body := make(map[string]interface{})

	if cmd.On != nil {
		body["on"] = map[string]bool{"on": *cmd.On}
	}
	if cmd.Brightness != nil {
		body["dimming"] = map[string]float64{"brightness": *cmd.Brightness}
	}
	if cmd.ColorTemp != nil {
		body["color_temperature"] = map[string]int{"mirek": *cmd.ColorTemp}
	}
	if cmd.Color != nil {
		body["color"] = map[string]interface{}{
			"xy": map[string]float64{
				"x": cmd.Color.XY[0],
				"y": cmd.Color.XY[1],
			},
		}
	}

	_, err := c.request("PUT", fmt.Sprintf("/clip/v2/resource/light/%s", id), body)
	if err != nil {
		return err
	}

	log.Debug().Str("id", id).Interface("command", cmd).Msg("Light state updated")
	return nil
}

// GetGroups fetches all rooms and zones from the bridge
func (c *Client) GetGroups() ([]*models.Group, error) {
	groups := make([]*models.Group, 0)

	// First fetch lights to build device-to-light mapping
	deviceToLightID := make(map[string]string)
	lightsResp, err := c.request("GET", "/clip/v2/resource/light", nil)
	if err == nil {
		var lightsResult struct {
			Data []hueLight `json:"data"`
		}
		if err := json.Unmarshal(lightsResp, &lightsResult); err == nil {
			for _, hl := range lightsResult.Data {
				if hl.Owner != nil && hl.Owner.RType == "device" {
					deviceToLightID[hl.Owner.RID] = hl.ID
				}
			}
		}
	}
	log.Debug().Int("mappings", len(deviceToLightID)).Msg("Built device-to-light mapping")

	// Fetch grouped_light states
	groupedLightStates := make(map[string]models.GroupState)
	glResp, err := c.request("GET", "/clip/v2/resource/grouped_light", nil)
	if err == nil {
		var glResult struct {
			Data []struct {
				ID    string `json:"id"`
				Owner struct {
					RID string `json:"rid"`
				} `json:"owner"`
				On *struct {
					On bool `json:"on"`
				} `json:"on"`
			} `json:"data"`
		}
		if err := json.Unmarshal(glResp, &glResult); err == nil {
			for _, gl := range glResult.Data {
				if gl.On != nil {
					groupedLightStates[gl.Owner.RID] = models.GroupState{
						AnyOn: gl.On.On,
						AllOn: gl.On.On,
					}
				}
			}
		}
	}

	// Fetch rooms
	roomsResp, err := c.request("GET", "/clip/v2/resource/room", nil)
	if err != nil {
		return nil, err
	}

	var roomsResult struct {
		Data []hueRoom `json:"data"`
	}
	if err := json.Unmarshal(roomsResp, &roomsResult); err != nil {
		return nil, err
	}

	c.mu.Lock()
	for _, hr := range roomsResult.Data {
		group := convertHueRoom(hr, deviceToLightID)
		// Apply state from grouped_light
		if state, ok := groupedLightStates[group.ID]; ok {
			group.State = state
		}
		c.groups[group.ID] = group
		groups = append(groups, group)
	}
	c.mu.Unlock()

	// Fetch zones
	zonesResp, err := c.request("GET", "/clip/v2/resource/zone", nil)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to fetch zones")
	} else {
		var zonesResult struct {
			Data []hueRoom `json:"data"`
		}
		if err := json.Unmarshal(zonesResp, &zonesResult); err == nil {
			c.mu.Lock()
			for _, hz := range zonesResult.Data {
				group := convertHueRoom(hz, deviceToLightID)
				group.Type = "zone"
				// Apply state from grouped_light
				if state, ok := groupedLightStates[group.ID]; ok {
					group.State = state
				}
				c.groups[group.ID] = group
				groups = append(groups, group)
			}
			c.mu.Unlock()
		}
	}

	log.Debug().Int("count", len(groups)).Msg("Fetched groups from bridge")
	return groups, nil
}

// SetGroupState updates the state of all lights in a group
func (c *Client) SetGroupState(id string, cmd models.DeviceCommand) error {
	log.Debug().Str("group_id", id).Interface("command", cmd).Msg("SetGroupState called")

	resp, err := c.request("GET", "/clip/v2/resource/grouped_light", nil)
	if err != nil {
		log.Error().Err(err).Msg("Failed to fetch grouped_lights")
		return err
	}

	var result struct {
		Data []struct {
			ID    string `json:"id"`
			Owner struct {
				RID string `json:"rid"`
			} `json:"owner"`
		} `json:"data"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		log.Error().Err(err).Msg("Failed to parse grouped_lights")
		return err
	}

	log.Debug().Int("count", len(result.Data)).Msg("Found grouped_lights")

	// Find grouped_light for this room/zone
	var groupedLightID string
	for _, gl := range result.Data {
		log.Debug().Str("gl_id", gl.ID).Str("owner_rid", gl.Owner.RID).Str("looking_for", id).Msg("Checking grouped_light")
		if gl.Owner.RID == id {
			groupedLightID = gl.ID
			break
		}
	}

	if groupedLightID == "" {
		log.Error().Str("group_id", id).Msg("grouped_light not found for group")
		return fmt.Errorf("grouped_light not found for group: %s", id)
	}

	body := make(map[string]interface{})
	if cmd.On != nil {
		body["on"] = map[string]bool{"on": *cmd.On}
	}
	if cmd.Brightness != nil {
		body["dimming"] = map[string]float64{"brightness": *cmd.Brightness}
	}

	log.Debug().Str("grouped_light_id", groupedLightID).Interface("body", body).Msg("Sending PUT request")

	_, err = c.request("PUT", fmt.Sprintf("/clip/v2/resource/grouped_light/%s", groupedLightID), body)
	if err != nil {
		log.Error().Err(err).Msg("Failed to update grouped_light")
		return err
	}

	log.Debug().Str("group_id", id).Msg("Group state updated successfully")
	return nil
}

// GetScenes fetches all scenes from the bridge
func (c *Client) GetScenes() ([]*models.Scene, error) {
	resp, err := c.request("GET", "/clip/v2/resource/scene", nil)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []hueScene `json:"data"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, err
	}

	scenes := make([]*models.Scene, 0, len(result.Data))
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, hs := range result.Data {
		scene := convertHueScene(hs)
		c.scenes[scene.ID] = scene
		scenes = append(scenes, scene)
	}

	log.Debug().Int("count", len(scenes)).Msg("Fetched scenes from bridge")
	return scenes, nil
}

// ActivateScene activates a scene
func (c *Client) ActivateScene(id string) error {
	body := map[string]interface{}{
		"recall": map[string]string{
			"action": "active",
		},
	}

	_, err := c.request("PUT", fmt.Sprintf("/clip/v2/resource/scene/%s", id), body)
	if err != nil {
		return err
	}

	log.Debug().Str("id", id).Msg("Scene activated")
	return nil
}

// Events returns the event channel for SSE events
func (c *Client) Events() <-chan Event {
	return c.eventChan
}

// Close stops the client and closes all connections
func (c *Client) Close() {
	close(c.stopChan)
}

// Internal HUE API response types
type hueLight struct {
	ID       string `json:"id"`
	Owner    *struct {
		RID   string `json:"rid"`
		RType string `json:"rtype"`
	} `json:"owner,omitempty"`
	Metadata struct {
		Name      string `json:"name"`
		Archetype string `json:"archetype"`
	} `json:"metadata"`
	ProductData struct {
		ModelID     string `json:"model_id"`
		ProductName string `json:"product_name"`
	} `json:"product_data"`
	On struct {
		On bool `json:"on"`
	} `json:"on"`
	Dimming *struct {
		Brightness float64 `json:"brightness"`
	} `json:"dimming,omitempty"`
	ColorTemperature *struct {
		Mirek       int  `json:"mirek"`
		MirekValid  bool `json:"mirek_valid"`
	} `json:"color_temperature,omitempty"`
	Color *struct {
		XY struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		} `json:"xy"`
		Gamut struct {
			Red   struct{ X, Y float64 } `json:"red"`
			Green struct{ X, Y float64 } `json:"green"`
			Blue  struct{ X, Y float64 } `json:"blue"`
		} `json:"gamut"`
		GamutType string `json:"gamut_type"`
	} `json:"color,omitempty"`
}

type hueRoom struct {
	ID       string `json:"id"`
	Metadata struct {
		Name      string `json:"name"`
		Archetype string `json:"archetype"`
	} `json:"metadata"`
	Children []struct {
		RID   string `json:"rid"`
		RType string `json:"rtype"`
	} `json:"children"`
	Services []struct {
		RID   string `json:"rid"`
		RType string `json:"rtype"`
	} `json:"services"`
}

type hueScene struct {
	ID       string `json:"id"`
	Metadata struct {
		Name string `json:"name"`
	} `json:"metadata"`
	Group struct {
		RID   string `json:"rid"`
		RType string `json:"rtype"`
	} `json:"group"`
}

func convertHueLight(hl hueLight) *models.Light {
	light := &models.Light{
		ID:          hl.ID,
		Name:        hl.Metadata.Name,
		Type:        hl.Metadata.Archetype,
		ModelID:     hl.ProductData.ModelID,
		ProductName: hl.ProductData.ProductName,
		State: models.LightState{
			On:        hl.On.On,
			Reachable: true,
		},
		Capabilities: models.Capabilities{},
	}

	if hl.Dimming != nil {
		light.State.Brightness = hl.Dimming.Brightness
		light.Capabilities.SupportsDimming = true
	}

	if hl.ColorTemperature != nil && hl.ColorTemperature.MirekValid {
		light.State.ColorTemp = hl.ColorTemperature.Mirek
		light.Capabilities.SupportsColorTemp = true
	}

	if hl.Color != nil {
		light.State.Color = &models.Color{
			XY:    [2]float64{hl.Color.XY.X, hl.Color.XY.Y},
			Gamut: hl.Color.GamutType,
		}
		light.Capabilities.SupportsColor = true
	}

	return light
}

func convertHueRoom(hr hueRoom, deviceToLightID map[string]string) *models.Group {
	group := &models.Group{
		ID:     hr.ID,
		Name:   hr.Metadata.Name,
		Type:   "room",
		Lights: make([]string, 0),
	}

	for _, child := range hr.Children {
		if child.RType == "device" {
			// Map device ID to light ID
			if lightID, ok := deviceToLightID[child.RID]; ok {
				group.Lights = append(group.Lights, lightID)
			}
		}
	}

	return group
}

func convertHueScene(hs hueScene) *models.Scene {
	return &models.Scene{
		ID:      hs.ID,
		Name:    hs.Metadata.Name,
		GroupID: hs.Group.RID,
		Type:    hs.Group.RType,
	}
}
