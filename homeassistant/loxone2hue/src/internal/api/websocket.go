package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/hue"
	"github.com/sbeyeler/loxone2hue/internal/loxone"
	"github.com/sbeyeler/loxone2hue/internal/models"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: isSameOriginRequest,
}

// WebSocketHub manages WebSocket connections
type WebSocketHub struct {
	clients    map[*WebSocketClient]bool
	broadcast  chan []byte
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
	mu         sync.RWMutex

	hueClient      *hue.Client
	mappingManager *loxone.MappingManager
	commandParser  *loxone.CommandParser
	udpSender      *loxone.UDPSender
	httpSender     *loxone.HTTPSender
}

// WebSocketClient represents a connected WebSocket client
type WebSocketClient struct {
	hub      *WebSocketHub
	conn     *websocket.Conn
	send     chan []byte
	clientID string
	isLoxone bool
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub(hueClient *hue.Client, mappingManager *loxone.MappingManager, udpSender *loxone.UDPSender, httpSender *loxone.HTTPSender) *WebSocketHub {
	return &WebSocketHub{
		clients:        make(map[*WebSocketClient]bool),
		broadcast:      make(chan []byte, 256),
		register:       make(chan *WebSocketClient),
		unregister:     make(chan *WebSocketClient),
		hueClient:      hueClient,
		mappingManager: mappingManager,
		commandParser:  loxone.NewCommandParser(),
		udpSender:      udpSender,
		httpSender:     httpSender,
	}
}

// Run starts the hub's event loop
func (h *WebSocketHub) Run(ctx context.Context) {
	// Forward HUE events to WebSocket clients
	go h.forwardHueEvents(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Info().Str("client", client.clientID).Bool("loxone", client.isLoxone).Msg("Client connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Info().Str("client", client.clientID).Msg("Client disconnected")

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// forwardHueEvents forwards HUE events to connected clients
func (h *WebSocketHub) forwardHueEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-h.hueClient.Events():
			// Convert to status message
			status := models.LoxoneStatus{
				Type:   "status",
				Device: event.ID,
				State:  event.Data,
			}

			data, err := json.Marshal(status)
			if err != nil {
				continue
			}

			h.broadcast <- data

			// For sensor events, also broadcast the full updated sensor object
			if hue.IsSensorType(event.Type) {
				if sensor := h.hueClient.GetSensor(event.ID); sensor != nil {
					sensorMsg := map[string]interface{}{
						"type":   "sensor_update",
						"sensor": sensor,
					}
					if sData, err := json.Marshal(sensorMsg); err == nil {
						h.broadcast <- sData
					}
				}
			}

			// Send feedback (UDP and/or HTTP) to Loxone Miniserver
			h.sendFeedback(event)
		}
	}
}

// feedbackTarget holds a loxoneID and optionally the miniserver to send to
type feedbackTarget struct {
	loxoneID     string
	miniserverID string // empty = send to all (send_all targets)
	feedbackUDP  bool   // whether to send UDP feedback
	feedbackHTTP bool   // whether to send HTTP feedback
}

// targetFromMapping creates a feedbackTarget from a mapping, using the mapping's feedback flags.
func targetFromMapping(m *models.Mapping) feedbackTarget {
	return feedbackTarget{
		loxoneID:     m.LoxoneID,
		miniserverID: m.MiniserverID,
		feedbackUDP:  m.ShouldFeedbackUDP(),
		feedbackHTTP: m.ShouldFeedbackHTTP(),
	}
}

// targetSendAll creates a feedbackTarget for send_all (no mapping, both protocols enabled).
func targetSendAll(loxoneID string) feedbackTarget {
	return feedbackTarget{
		loxoneID:     loxoneID,
		feedbackUDP:  true,
		feedbackHTTP: true,
	}
}

// sendFeedback extracts changed properties from a HUE event and sends them via UDP and/or HTTP
func (h *WebSocketHub) sendFeedback(event hue.Event) {
	// Handle sensor events separately
	if hue.IsSensorType(event.Type) {
		h.sendSensorFeedback(event)
		return
	}

	// Extract event data fields via JSON roundtrip
	type eventData struct {
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
	}

	raw, err := json.Marshal(event.Data)
	if err != nil {
		return
	}

	var ed eventData
	if err := json.Unmarshal(raw, &ed); err != nil {
		return
	}

	udpEnabled := h.udpSender != nil && h.udpSender.IsEnabled()
	httpEnabled := h.httpSender != nil && h.httpSender.IsEnabled()
	if !udpEnabled && !httpEnabled {
		return
	}

	// Collect all targets that should receive this update (skip scenes and mood mappings)
	var targets []feedbackTarget

	// Direct lookup: event.ID matches a mapping's hue_id (light or group)
	if mapping := h.mappingManager.GetByHueID(event.ID); mapping != nil && mapping.HueType != "scene" && !strings.Contains(mapping.LoxoneID, "_mood_") {
		targets = append(targets, targetFromMapping(mapping))
	} else if (udpEnabled && h.udpSender.HasSendAll()) || (httpEnabled && h.httpSender.HasSendAll()) {
		// No mapping found — generate LoxoneID from device name, send to all send_all targets
		if event.Type == "light" {
			if light, err := h.hueClient.GetLight(event.ID); err == nil {
				targets = append(targets, targetSendAll(sanitizeName(light.Name)))
			}
		} else if name := h.hueClient.GetGroupName(event.ID); name != "" {
			targets = append(targets, targetSendAll(sanitizeName(name)))
		}
	}

	// For light events: also send to group mappings that contain this light
	if event.Type == "light" {
		for _, groupID := range h.hueClient.GetGroupIDsForLight(event.ID) {
			if mapping := h.mappingManager.GetByHueID(groupID); mapping != nil && mapping.HueType != "scene" && !strings.Contains(mapping.LoxoneID, "_mood_") {
				targets = append(targets, targetFromMapping(mapping))
			} else if (udpEnabled && h.udpSender.HasSendAll()) || (httpEnabled && h.httpSender.HasSendAll()) {
				if name := h.hueClient.GetGroupName(groupID); name != "" {
					targets = append(targets, targetSendAll(sanitizeName(name)))
				}
			}
		}
	}

	if len(targets) == 0 {
		return
	}

	// Send per changed property per target via UDP and/or HTTP
	for _, target := range targets {
		send := func(property string, value interface{}) {
			if udpEnabled && target.feedbackUDP {
				if target.miniserverID != "" {
					h.udpSender.Send(target.miniserverID, target.loxoneID, property, value)
				} else {
					h.udpSender.SendToAll(target.loxoneID, property, value)
				}
			}
			if httpEnabled && target.feedbackHTTP {
				if target.miniserverID != "" {
					h.httpSender.Send(target.miniserverID, target.loxoneID, property, value)
				} else {
					h.httpSender.SendToAll(target.loxoneID, property, value)
				}
			}
		}

		if ed.On != nil {
			onVal := 0
			if ed.On.On {
				onVal = 1
			}
			send("on", onVal)
		}
		if ed.Dimming != nil {
			send("bri", int(ed.Dimming.Brightness))
		}
		if ed.ColorTemperature != nil {
			send("ct", ed.ColorTemperature.Mirek)
		}
		if ed.Color != nil {
			send("color_x", fmt.Sprintf("%.4f", ed.Color.XY.X))
			send("color_y", fmt.Sprintf("%.4f", ed.Color.XY.Y))
		}
	}
}

// sendSensorFeedback handles feedback for sensor events via UDP and/or HTTP
func (h *WebSocketHub) sendSensorFeedback(event hue.Event) {
	udpEnabled := h.udpSender != nil && h.udpSender.IsEnabled()
	httpEnabled := h.httpSender != nil && h.httpSender.IsEnabled()
	if !udpEnabled && !httpEnabled {
		return
	}

	// Find target for this sensor
	var targets []feedbackTarget

	if mapping := h.mappingManager.GetByHueID(event.ID); mapping != nil && !strings.Contains(mapping.LoxoneID, "_mood_") {
		targets = append(targets, targetFromMapping(mapping))
	} else if (udpEnabled && h.udpSender.HasSendAll()) || (httpEnabled && h.httpSender.HasSendAll()) {
		if name := h.hueClient.GetSensorName(event.ID); name != "" {
			targets = append(targets, targetSendAll(sanitizeName(name)))
		}
	}

	if len(targets) == 0 {
		return
	}

	// Extract sensor data via JSON roundtrip
	raw, err := json.Marshal(event.Data)
	if err != nil {
		return
	}

	var item hue.EventItem
	if err := json.Unmarshal(raw, &item); err != nil {
		return
	}

	for _, target := range targets {
		send := func(property string, value interface{}) {
			if udpEnabled && target.feedbackUDP {
				if target.miniserverID != "" {
					h.udpSender.Send(target.miniserverID, target.loxoneID, property, value)
				} else {
					h.udpSender.SendToAll(target.loxoneID, property, value)
				}
			}
			if httpEnabled && target.feedbackHTTP {
				if target.miniserverID != "" {
					h.httpSender.Send(target.miniserverID, target.loxoneID, property, value)
				} else {
					h.httpSender.SendToAll(target.loxoneID, property, value)
				}
			}
		}

		switch event.Type {
		case "motion":
			if item.Motion != nil {
				motion := item.Motion.Motion
				if item.Motion.MotionReport != nil {
					motion = item.Motion.MotionReport.Motion
				}
				val := 0
				if motion {
					val = 1
				}
				send("motion", val)
			}

		case "temperature":
			if item.Temperature != nil {
				temp := item.Temperature.Temperature
				if item.Temperature.TemperatureReport != nil {
					temp = item.Temperature.TemperatureReport.Temperature
				}
				send("temperature", fmt.Sprintf("%.1f", temp))
			}

		case "light_level":
			if item.LightSensor != nil {
				level := item.LightSensor.LightLevel
				if item.LightSensor.LightLevelReport != nil {
					level = item.LightSensor.LightLevelReport.LightLevel
				}
				send("light_level", level)
			}

		case "button":
			if item.Button != nil {
				event := item.Button.LastEvent
				if item.Button.ButtonReport != nil {
					event = item.Button.ButtonReport.Event
				}
				if event != "" {
					// Convert button event to numeric code for Loxone
					// initial_press=0, repeat=1, short_release=2, long_release=3, long_press=4
					buttonCode := buttonEventToCode(event)
					send("button", buttonCode)
				}
			}

		case "contact":
			if item.ContactReport != nil {
				val := 0
				if item.ContactReport.State == "no_contact" {
					val = 1
				}
				send("contact", val)
			}

		case "relative_rotary":
			if item.RelativeRotary != nil && item.RelativeRotary.RotaryReport != nil {
				steps := item.RelativeRotary.RotaryReport.Rotation.Steps
				if item.RelativeRotary.RotaryReport.Rotation.Direction == "counter_clockwise" {
					steps = -steps
				}
				send("rotary", steps)
			}

		case "device_power":
			if item.PowerState != nil {
				send("battery", item.PowerState.BatteryLevel)
			}
		}
	}
}

// buttonEventToCode converts a HUE button event string to a numeric code
func buttonEventToCode(event string) int {
	switch event {
	case "initial_press":
		return 0
	case "repeat":
		return 1
	case "short_release":
		return 2
	case "long_release":
		return 3
	case "long_press":
		return 4
	default:
		return -1
	}
}

// HandleWebSocket handles WebSocket upgrade requests and HTTP command requests
func (h *WebSocketHub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Check if this is an HTTP command request (for testing via browser)
	cmd := r.URL.Query().Get("cmd")
	if cmd != "" {
		h.handleHTTPCommand(w, r, cmd)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("WebSocket upgrade failed")
		return
	}

	// Check if this is a Loxone connection
	isLoxone := r.URL.Query().Get("type") == "loxone"
	clientID := r.URL.Query().Get("id")
	if clientID == "" {
		clientID = conn.RemoteAddr().String()
	}

	client := &WebSocketClient{
		hub:      h,
		conn:     conn,
		send:     make(chan []byte, 256),
		clientID: clientID,
		isLoxone: isLoxone,
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}

// handleHTTPCommand processes HTTP command requests (for testing and Loxone virtual outputs)
func (h *WebSocketHub) handleHTTPCommand(w http.ResponseWriter, r *http.Request, cmdStr string) {
	w.Header().Set("Content-Type", "application/json")

	// Parse the command
	cmd, err := h.commandParser.ParseText(cmdStr)
	if err != nil {
		log.Warn().Str("command", cmdStr).Err(err).Msg("Failed to parse HTTP command")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid command format: " + err.Error()})
		return
	}

	log.Debug().
		Str("type", cmd.Type).
		Str("target", cmd.Target).
		Str("action", cmd.Action).
		Interface("params", cmd.Params).
		Msg("Received HTTP command")

	// Resolve target to HUE resource
	hueID, hueType, ok := h.mappingManager.ResolveTarget(cmd.Target)
	if !ok {
		// Try using target directly as HUE ID
		hueID = cmd.Target
		hueType = "light"
	}

	var execErr error

	switch cmd.Action {
	case "set":
		deviceCmd := h.commandParser.ToDeviceCommand(cmd)

		switch hueType {
		case "light":
			execErr = h.hueClient.SetLightState(hueID, deviceCmd)
		case "group":
			execErr = h.hueClient.SetGroupState(hueID, deviceCmd)
		}

	case "scene":
		sceneID, ok := cmd.Params["scene_id"].(string)
		if !ok {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "scene_id required"})
			return
		}
		// Resolve scene mapping to HUE scene ID
		resolvedHueID, resolvedHueType, resolved := h.mappingManager.ResolveTarget(sceneID)
		if resolved && resolvedHueType == "scene" {
			hueID = resolvedHueID
			hueType = resolvedHueType
			execErr = h.hueClient.ActivateScene(resolvedHueID)
		} else {
			// Try using sceneID directly as HUE scene ID
			hueID = sceneID
			hueType = "scene"
			execErr = h.hueClient.ActivateScene(sceneID)
		}

	case "mood":
		moodNum, ok := cmd.Params["mood_number"].(int)
		if !ok {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "mood_number required"})
			return
		}

		// Resolve mood mapping
		moodHueID, moodHueType, resolved := h.mappingManager.ResolveMood(cmd.Target, moodNum)
		if !resolved {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{
				"error":       "no mapping found for mood",
				"target":      cmd.Target,
				"mood_number": string(rune('0' + moodNum)),
			})
			return
		}

		hueID = moodHueID
		hueType = moodHueType

		if moodNum == 0 {
			// Mood 0 = turn off the group/light
			off := false
			offCmd := models.DeviceCommand{On: &off}
			switch moodHueType {
			case "light":
				execErr = h.hueClient.SetLightState(moodHueID, offCmd)
			case "group":
				execErr = h.hueClient.SetGroupState(moodHueID, offCmd)
			}
		} else {
			// Mood > 0 = activate scene
			if moodHueType == "scene" {
				execErr = h.hueClient.ActivateScene(moodHueID)
			} else {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{
					"error": "mood mapping must be a scene",
				})
				return
			}
		}

	default:
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "unsupported action: " + cmd.Action})
		return
	}

	if execErr != nil {
		log.Error().Err(execErr).Str("target", cmd.Target).Msg("Failed to execute HTTP command")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": execErr.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"target":  cmd.Target,
		"action":  cmd.Action,
		"hue_id":  hueID,
		"hue_type": hueType,
	})
}

// BroadcastStatus sends a status update to all connected clients
func (h *WebSocketHub) BroadcastStatus(deviceID string, state interface{}) {
	status := models.LoxoneStatus{
		Type:   "status",
		Device: deviceID,
		State:  state,
	}

	data, err := json.Marshal(status)
	if err != nil {
		return
	}

	h.broadcast <- data
}

// readPump reads messages from the WebSocket connection
func (c *WebSocketClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error().Err(err).Msg("WebSocket read error")
			}
			break
		}

		c.handleMessage(message)
	}
}

// handleMessage processes incoming messages
func (c *WebSocketClient) handleMessage(message []byte) {
	// Try to parse as JSON command first
	cmd, err := c.hub.commandParser.ParseJSON(message)
	if err != nil {
		// Try text format
		cmd, err = c.hub.commandParser.ParseText(string(message))
		if err != nil {
			log.Warn().Str("message", string(message)).Err(err).Msg("Failed to parse command")
			c.sendError("invalid command format")
			return
		}
	}

	log.Debug().
		Str("type", cmd.Type).
		Str("target", cmd.Target).
		Str("action", cmd.Action).
		Msg("Received command")

	// Resolve target to HUE resource
	hueID, hueType, ok := c.hub.mappingManager.ResolveTarget(cmd.Target)
	if !ok {
		// Try using target directly as HUE ID
		hueID = cmd.Target
		hueType = "light"
	}

	switch cmd.Action {
	case "set":
		deviceCmd := c.hub.commandParser.ToDeviceCommand(cmd)
		var err error

		switch hueType {
		case "light":
			err = c.hub.hueClient.SetLightState(hueID, deviceCmd)
		case "group":
			err = c.hub.hueClient.SetGroupState(hueID, deviceCmd)
		}

		if err != nil {
			log.Error().Err(err).Str("target", cmd.Target).Msg("Failed to execute command")
			c.sendError(err.Error())
			return
		}

		c.sendAck(cmd.Target)

	case "scene":
		sceneID, ok := cmd.Params["scene_id"].(string)
		if !ok {
			c.sendError("scene_id required")
			return
		}

		// Resolve scene mapping to HUE scene ID
		resolvedHueID, resolvedHueType, resolved := c.hub.mappingManager.ResolveTarget(sceneID)
		if resolved && resolvedHueType == "scene" {
			if err := c.hub.hueClient.ActivateScene(resolvedHueID); err != nil {
				log.Error().Err(err).Str("scene", resolvedHueID).Msg("Failed to activate scene")
				c.sendError(err.Error())
				return
			}
		} else {
			// Try using sceneID directly as HUE scene ID
			if err := c.hub.hueClient.ActivateScene(sceneID); err != nil {
				log.Error().Err(err).Str("scene", sceneID).Msg("Failed to activate scene")
				c.sendError(err.Error())
				return
			}
		}

		c.sendAck(cmd.Target)

	case "mood":
		moodNum, ok := cmd.Params["mood_number"].(int)
		if !ok {
			c.sendError("mood_number required")
			return
		}

		// Resolve mood mapping
		moodHueID, moodHueType, resolved := c.hub.mappingManager.ResolveMood(cmd.Target, moodNum)
		if !resolved {
			c.sendError("no mapping found for mood")
			return
		}

		if moodNum == 0 {
			// Mood 0 = turn off the group/light
			off := false
			offCmd := models.DeviceCommand{On: &off}
			var err error
			switch moodHueType {
			case "light":
				err = c.hub.hueClient.SetLightState(moodHueID, offCmd)
			case "group":
				err = c.hub.hueClient.SetGroupState(moodHueID, offCmd)
			}
			if err != nil {
				log.Error().Err(err).Str("target", cmd.Target).Int("mood", moodNum).Msg("Failed to turn off")
				c.sendError(err.Error())
				return
			}
		} else {
			// Mood > 0 = activate scene
			if moodHueType == "scene" {
				if err := c.hub.hueClient.ActivateScene(moodHueID); err != nil {
					log.Error().Err(err).Str("scene", moodHueID).Int("mood", moodNum).Msg("Failed to activate mood scene")
					c.sendError(err.Error())
					return
				}
			} else {
				c.sendError("mood mapping must be a scene")
				return
			}
		}

		c.sendAck(cmd.Target)

	case "STATUS":
		light, err := c.hub.hueClient.GetLight(hueID)
		if err != nil {
			c.sendError(err.Error())
			return
		}

		status := models.LoxoneStatus{
			Type:   "status",
			Device: cmd.Target,
			State:  light.State,
		}

		data, _ := json.Marshal(status)
		c.send <- data
	}
}

func (c *WebSocketClient) sendAck(target string) {
	msg := map[string]interface{}{
		"type":   "ack",
		"target": target,
	}
	data, _ := json.Marshal(msg)
	c.send <- data
}

func (c *WebSocketClient) sendError(message string) {
	msg := map[string]interface{}{
		"type":    "error",
		"message": message,
	}
	data, _ := json.Marshal(msg)
	c.send <- data
}

// writePump writes messages to the WebSocket connection
func (c *WebSocketClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)
