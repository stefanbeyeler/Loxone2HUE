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

// ResolveMood resolves a mood number for a target to HUE resource info
// Looks for mapping with LoxoneID pattern: <target>_mood_<number>
// If mood is 0, returns the group/light mapping for turning off
func (m *MappingManager) ResolveMood(target string, moodNumber int) (hueID, hueType string, ok bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// For mood 0 (off), look for the base target mapping (group or light)
	if moodNumber == 0 {
		if mapping, exists := m.mappings[target]; exists && mapping.Enabled {
			// Only return if it's a group or light (not a scene)
			if mapping.HueType == "group" || mapping.HueType == "light" {
				return mapping.HueID, mapping.HueType, true
			}
		}
		return "", "", false
	}

	// For mood > 0, look for scene mapping: <target>_mood_<number>
	moodKey := target + "_mood_" + itoa(moodNumber)
	if mapping, exists := m.mappings[moodKey]; exists && mapping.Enabled {
		return mapping.HueID, mapping.HueType, true
	}

	return "", "", false
}

// itoa converts int to string (simple implementation to avoid import)
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	var b [20]byte
	bp := len(b) - 1
	for i > 0 {
		b[bp] = byte('0' + i%10)
		bp--
		i /= 10
	}
	if neg {
		b[bp] = '-'
		bp--
	}
	return string(b[bp+1:])
}
