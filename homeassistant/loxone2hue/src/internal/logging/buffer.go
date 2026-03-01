package logging

import (
	"encoding/json"
	"strings"
	"sync"
	"time"
)

// LogEntry represents a single log entry
type LogEntry struct {
	Timestamp time.Time              `json:"timestamp"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Source    string                 `json:"source"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

// Buffer is the global log buffer instance
var Buffer = NewLogBuffer(1000)

// LogBuffer is a thread-safe ring buffer for log entries
type LogBuffer struct {
	entries []LogEntry
	size    int
	pos     int
	count   int
	mu      sync.RWMutex
}

// NewLogBuffer creates a new ring buffer with the given capacity
func NewLogBuffer(size int) *LogBuffer {
	return &LogBuffer{
		entries: make([]LogEntry, size),
		size:    size,
	}
}

// Write implements io.Writer for zerolog integration.
// It parses zerolog JSON output and stores entries in the ring buffer.
func (b *LogBuffer) Write(p []byte) (n int, err error) {
	var raw map[string]interface{}
	if err := json.Unmarshal(p, &raw); err != nil {
		return len(p), nil
	}

	entry := LogEntry{
		Source: "SYSTEM",
		Fields: make(map[string]interface{}),
	}

	if t, ok := raw["time"].(string); ok {
		if parsed, err := time.Parse(time.RFC3339Nano, t); err == nil {
			entry.Timestamp = parsed
		} else if parsed, err := time.Parse(time.RFC3339, t); err == nil {
			entry.Timestamp = parsed
		}
	}
	if entry.Timestamp.IsZero() {
		entry.Timestamp = time.Now()
	}

	if lvl, ok := raw["level"].(string); ok {
		entry.Level = strings.ToUpper(lvl)
	}
	if msg, ok := raw["message"].(string); ok {
		entry.Message = msg
	}

	for k, v := range raw {
		if k != "time" && k != "level" && k != "message" {
			entry.Fields[k] = v
		}
	}

	b.mu.Lock()
	b.entries[b.pos] = entry
	b.pos = (b.pos + 1) % b.size
	if b.count < b.size {
		b.count++
	}
	b.mu.Unlock()

	return len(p), nil
}

// GetEntries returns log entries (newest first), with optional filtering
func (b *LogBuffer) GetEntries(level string, search string, limit int) []LogEntry {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if limit <= 0 || limit > b.count {
		limit = b.count
	}

	result := make([]LogEntry, 0, limit)
	levelUpper := strings.ToUpper(level)

	for i := 0; i < b.count && len(result) < limit; i++ {
		idx := (b.pos - 1 - i + b.size) % b.size
		entry := b.entries[idx]

		if level != "" && entry.Level != levelUpper {
			continue
		}

		if search != "" && !strings.Contains(strings.ToLower(entry.Message), strings.ToLower(search)) {
			fieldsMatch := false
			for _, v := range entry.Fields {
				if s, ok := v.(string); ok && strings.Contains(strings.ToLower(s), strings.ToLower(search)) {
					fieldsMatch = true
					break
				}
			}
			if !fieldsMatch {
				continue
			}
		}

		result = append(result, entry)
	}

	return result
}
