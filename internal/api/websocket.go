package api

import (
	"context"
	"encoding/json"
	"net/http"
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
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
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
func NewWebSocketHub(hueClient *hue.Client, mappingManager *loxone.MappingManager) *WebSocketHub {
	return &WebSocketHub{
		clients:        make(map[*WebSocketClient]bool),
		broadcast:      make(chan []byte, 256),
		register:       make(chan *WebSocketClient),
		unregister:     make(chan *WebSocketClient),
		hueClient:      hueClient,
		mappingManager: mappingManager,
		commandParser:  loxone.NewCommandParser(),
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
		}
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
