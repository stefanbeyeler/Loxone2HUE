package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/config"
	"github.com/sbeyeler/loxone2hue/internal/hue"
	"github.com/sbeyeler/loxone2hue/internal/loxone"
	"github.com/sbeyeler/loxone2hue/internal/models"
)

// Handlers contains all HTTP handlers
type Handlers struct {
	hueClient      *hue.Client
	mappingManager *loxone.MappingManager
}

// NewHandlers creates a new handlers instance
func NewHandlers(hueClient *hue.Client, mappingManager *loxone.MappingManager) *Handlers {
	return &Handlers{
		hueClient:      hueClient,
		mappingManager: mappingManager,
	}
}

// JSON response helper
func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Error response helper
func errorResponse(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"error": message})
}

// Health returns the service health status
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"hue_configured": h.hueClient.IsConfigured(),
	})
}

// GetBridge returns bridge information
func (h *Handlers) GetBridge(w http.ResponseWriter, r *http.Request) {
	if !h.hueClient.IsConfigured() {
		jsonResponse(w, http.StatusOK, map[string]interface{}{
			"configured": false,
		})
		return
	}

	info, err := h.hueClient.GetBridgeInfo()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"configured": true,
		"info":       info,
	})
}

// DiscoverBridges discovers HUE bridges on the network
func (h *Handlers) DiscoverBridges(w http.ResponseWriter, r *http.Request) {
	bridges, err := hue.DiscoverBridges(5 * time.Second)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"bridges": bridges,
	})
}

// PairBridge pairs with a HUE bridge
func (h *Handlers) PairBridge(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BridgeIP string `json:"bridge_ip"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.BridgeIP == "" {
		errorResponse(w, http.StatusBadRequest, "bridge_ip required")
		return
	}

	h.hueClient.SetBridgeIP(req.BridgeIP)

	appKey, err := h.hueClient.Pair("Loxone2HUE", "gateway")
	if err != nil {
		errorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Save configuration
	config.UpdateHue(req.BridgeIP, appKey)
	if err := config.Save(); err != nil {
		log.Error().Err(err).Msg("Failed to save config")
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"success":         true,
		"application_key": appKey,
	})
}

// GetDevices returns all lights
func (h *Handlers) GetDevices(w http.ResponseWriter, r *http.Request) {
	lights, err := h.hueClient.GetLights()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"devices": lights,
	})
}

// GetDevice returns a single light
func (h *Handlers) GetDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	light, err := h.hueClient.GetLight(id)
	if err != nil {
		errorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, light)
}

// SetDevice updates a light's state
func (h *Handlers) SetDevice(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var cmd models.DeviceCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.hueClient.SetLightState(id, cmd); err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetGroups returns all groups
func (h *Handlers) GetGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := h.hueClient.GetGroups()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"groups": groups,
	})
}

// GetGroup returns a single group
func (h *Handlers) GetGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	groups, err := h.hueClient.GetGroups()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	for _, g := range groups {
		if g.ID == id {
			jsonResponse(w, http.StatusOK, g)
			return
		}
	}

	errorResponse(w, http.StatusNotFound, "group not found")
}

// SetGroup updates a group's state
func (h *Handlers) SetGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var cmd models.DeviceCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.hueClient.SetGroupState(id, cmd); err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetScenes returns all scenes
func (h *Handlers) GetScenes(w http.ResponseWriter, r *http.Request) {
	scenes, err := h.hueClient.GetScenes()
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"scenes": scenes,
	})
}

// ActivateScene activates a scene
func (h *Handlers) ActivateScene(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := h.hueClient.ActivateScene(id); err != nil {
		errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetMappings returns all mappings
func (h *Handlers) GetMappings(w http.ResponseWriter, r *http.Request) {
	mappings := config.GetMappings()
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"mappings": mappings,
	})
}

// CreateMapping creates a new mapping
func (h *Handlers) CreateMapping(w http.ResponseWriter, r *http.Request) {
	var mapping models.Mapping
	if err := json.NewDecoder(r.Body).Decode(&mapping); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	mapping.ID = uuid.New().String()
	mapping.Enabled = true

	mappings := config.GetMappings()
	mappings = append(mappings, mapping)
	config.UpdateMappings(mappings)

	h.mappingManager.Add(&mapping)

	if err := config.Save(); err != nil {
		log.Error().Err(err).Msg("Failed to save config")
	}

	jsonResponse(w, http.StatusCreated, mapping)
}

// UpdateMapping updates an existing mapping
func (h *Handlers) UpdateMapping(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var update models.Mapping
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	mappings := config.GetMappings()
	found := false
	for i, m := range mappings {
		if m.ID == id {
			update.ID = id
			mappings[i] = update
			found = true
			break
		}
	}

	if !found {
		errorResponse(w, http.StatusNotFound, "mapping not found")
		return
	}

	config.UpdateMappings(mappings)
	h.mappingManager.Load(mappings)

	if err := config.Save(); err != nil {
		log.Error().Err(err).Msg("Failed to save config")
	}

	jsonResponse(w, http.StatusOK, update)
}

// DeleteMapping deletes a mapping
func (h *Handlers) DeleteMapping(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	mappings := config.GetMappings()
	newMappings := make([]models.Mapping, 0, len(mappings))
	found := false

	for _, m := range mappings {
		if m.ID == id {
			found = true
			continue
		}
		newMappings = append(newMappings, m)
	}

	if !found {
		errorResponse(w, http.StatusNotFound, "mapping not found")
		return
	}

	config.UpdateMappings(newMappings)
	h.mappingManager.Remove(id)

	if err := config.Save(); err != nil {
		log.Error().Err(err).Msg("Failed to save config")
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// GetConfig returns the current configuration
func (h *Handlers) GetConfig(w http.ResponseWriter, r *http.Request) {
	cfg := config.Get()

	// Don't expose sensitive data
	safeConfig := map[string]interface{}{
		"server": cfg.Server,
		"hue": map[string]interface{}{
			"bridge_ip":  cfg.Hue.BridgeIP,
			"configured": cfg.Hue.ApplicationKey != "",
		},
		"loxone":  cfg.Loxone,
		"logging": cfg.Logging,
	}

	jsonResponse(w, http.StatusOK, safeConfig)
}

// UpdateConfig updates the configuration
func (h *Handlers) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	var update struct {
		Loxone *config.LoxoneConfig `json:"loxone,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	cfg := config.Get()

	if update.Loxone != nil {
		cfg.Loxone = *update.Loxone
	}

	if err := config.Save(); err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to save config")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"status": "ok"})
}

// MappingsBackup represents a backup of mappings
type MappingsBackup struct {
	Version   string           `json:"version"`
	CreatedAt time.Time        `json:"created_at"`
	Mappings  []models.Mapping `json:"mappings"`
}

// ExportMappings exports all mappings as a downloadable JSON file
func (h *Handlers) ExportMappings(w http.ResponseWriter, r *http.Request) {
	mappings := config.GetMappings()

	backup := MappingsBackup{
		Version:   "1.0",
		CreatedAt: time.Now().UTC(),
		Mappings:  mappings,
	}

	// Set headers for file download
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=loxone2hue-mappings-backup.json")
	w.WriteHeader(http.StatusOK)

	encoder := json.NewEncoder(w)
	encoder.SetIndent("", "  ")
	encoder.Encode(backup)
}

// ImportMappings imports mappings from a JSON backup
func (h *Handlers) ImportMappings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Mode   string         `json:"mode"` // "replace" or "merge"
		Backup MappingsBackup `json:"backup"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Backup.Version == "" {
		errorResponse(w, http.StatusBadRequest, "invalid backup format: missing version")
		return
	}

	importedMappings := req.Backup.Mappings
	if importedMappings == nil {
		importedMappings = []models.Mapping{}
	}

	var resultMappings []models.Mapping
	var imported, skipped, updated int

	switch req.Mode {
	case "replace":
		// Replace all existing mappings
		for i := range importedMappings {
			if importedMappings[i].ID == "" {
				importedMappings[i].ID = uuid.New().String()
			}
		}
		resultMappings = importedMappings
		imported = len(importedMappings)

	case "merge":
		// Merge with existing mappings (skip duplicates by loxone_id)
		existingMappings := config.GetMappings()
		existingByLoxoneID := make(map[string]int)
		for i, m := range existingMappings {
			existingByLoxoneID[m.LoxoneID] = i
		}

		resultMappings = existingMappings

		for _, newMapping := range importedMappings {
			if idx, exists := existingByLoxoneID[newMapping.LoxoneID]; exists {
				// Update existing mapping
				newMapping.ID = resultMappings[idx].ID
				resultMappings[idx] = newMapping
				updated++
			} else {
				// Add new mapping
				if newMapping.ID == "" {
					newMapping.ID = uuid.New().String()
				}
				resultMappings = append(resultMappings, newMapping)
				imported++
			}
		}

	default:
		errorResponse(w, http.StatusBadRequest, "invalid mode: use 'replace' or 'merge'")
		return
	}

	// Update config and mapping manager
	config.UpdateMappings(resultMappings)
	h.mappingManager.Load(resultMappings)

	if err := config.Save(); err != nil {
		log.Error().Err(err).Msg("Failed to save config after import")
		errorResponse(w, http.StatusInternalServerError, "failed to save config")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":   "ok",
		"imported": imported,
		"updated":  updated,
		"skipped":  skipped,
		"total":    len(resultMappings),
	})
}
