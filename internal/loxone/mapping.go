package loxone

import (
	"sync"

	"github.com/sbeyeler/loxone2hue/internal/models"
)

// MappingManager handles Loxone to HUE resource mappings
type MappingManager struct {
	mappings map[string]*models.Mapping // keyed by LoxoneID
	byHueID  map[string]*models.Mapping // keyed by HueID
	mu       sync.RWMutex
}

// NewMappingManager creates a new mapping manager
func NewMappingManager() *MappingManager {
	return &MappingManager{
		mappings: make(map[string]*models.Mapping),
		byHueID:  make(map[string]*models.Mapping),
	}
}

// Load initializes mappings from a list
func (m *MappingManager) Load(mappings []models.Mapping) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.mappings = make(map[string]*models.Mapping)
	m.byHueID = make(map[string]*models.Mapping)

	for i := range mappings {
		mapping := &mappings[i]
		if mapping.Enabled {
			m.mappings[mapping.LoxoneID] = mapping
			m.byHueID[mapping.HueID] = mapping
		}
	}
}

// GetByLoxoneID returns a mapping by Loxone ID
func (m *MappingManager) GetByLoxoneID(loxoneID string) *models.Mapping {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.mappings[loxoneID]
}

// GetByHueID returns a mapping by HUE ID
func (m *MappingManager) GetByHueID(hueID string) *models.Mapping {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.byHueID[hueID]
}

// Add adds a new mapping
func (m *MappingManager) Add(mapping *models.Mapping) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if mapping.Enabled {
		m.mappings[mapping.LoxoneID] = mapping
		m.byHueID[mapping.HueID] = mapping
	}
}

// Remove removes a mapping by ID
func (m *MappingManager) Remove(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for loxoneID, mapping := range m.mappings {
		if mapping.ID == id {
			delete(m.mappings, loxoneID)
			delete(m.byHueID, mapping.HueID)
			return
		}
	}
}

// GetAll returns all mappings
func (m *MappingManager) GetAll() []models.Mapping {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]models.Mapping, 0, len(m.mappings))
	for _, mapping := range m.mappings {
		result = append(result, *mapping)
	}
	return result
}

// ResolveTarget resolves a Loxone target ID to HUE resource info
func (m *MappingManager) ResolveTarget(target string) (hueID, hueType string, ok bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if mapping, exists := m.mappings[target]; exists && mapping.Enabled {
		return mapping.HueID, mapping.HueType, true
	}
	return "", "", false
}
