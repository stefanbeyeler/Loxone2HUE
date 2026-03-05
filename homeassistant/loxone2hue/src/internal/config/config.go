package config

import (
	"os"
	"sync"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/models"
	"gopkg.in/yaml.v3"
)

// Config represents the application configuration
type Config struct {
	Server   ServerConfig     `yaml:"server" json:"server"`
	Hue      HueConfig        `yaml:"hue" json:"hue"`
	Loxone   LoxoneConfig     `yaml:"loxone" json:"loxone"`
	Logging  LoggingConfig    `yaml:"logging" json:"logging"`
	Mappings []models.Mapping `yaml:"mappings" json:"mappings"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	Port int    `yaml:"port" json:"port"`
	Host string `yaml:"host" json:"host"`
}

// HueConfig holds HUE bridge settings
type HueConfig struct {
	BridgeIP       string `yaml:"bridge_ip" json:"bridge_ip"`
	ApplicationKey string `yaml:"application_key" json:"application_key"`
}

// MiniserverConfig holds settings for a single Loxone Miniserver
type MiniserverConfig struct {
	ID           string `yaml:"id" json:"id"`
	Name         string `yaml:"name" json:"name"`
	IP           string `yaml:"ip" json:"ip"`
	Port         int    `yaml:"port" json:"port"`
	UDPEnabled   bool   `yaml:"udp_enabled" json:"udp_enabled"`
	HTTPEnabled  bool   `yaml:"http_enabled" json:"http_enabled"`
	HTTPURL      string `yaml:"http_url" json:"http_url"`
	HTTPUser     string `yaml:"http_user" json:"http_user"`
	HTTPPassword string `yaml:"http_password" json:"http_password"`
	SendAll      bool   `yaml:"send_all" json:"send_all"`
}

// LoxoneConfig holds Loxone integration settings
type LoxoneConfig struct {
	Miniservers []MiniserverConfig `yaml:"miniservers" json:"miniservers"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
	Level  string `yaml:"level" json:"level"`
	Format string `yaml:"format" json:"format"`
}

var (
	cfg     *Config
	cfgOnce sync.Once
	cfgPath string
	mu      sync.RWMutex
)

// DefaultConfig returns a configuration with default values
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: 8080,
			Host: "0.0.0.0",
		},
		Hue: HueConfig{
			BridgeIP:       "",
			ApplicationKey: "",
		},
		Loxone: LoxoneConfig{
			Miniservers: []MiniserverConfig{},
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
		},
		Mappings: []models.Mapping{},
	}
}

// legacyLoxoneConfig is used to detect and migrate old config format
type legacyLoxoneConfig struct {
	Enabled      *bool `yaml:"enabled"`
	MiniserverIP string `yaml:"miniserver_ip"`
	UDPFeedback  *struct {
		Enabled bool `yaml:"enabled"`
		Port    int  `yaml:"port"`
		SendAll bool `yaml:"send_all"`
	} `yaml:"udp_feedback"`
	Miniservers []MiniserverConfig `yaml:"miniservers"`
}

type legacyConfig struct {
	Loxone legacyLoxoneConfig `yaml:"loxone"`
}

// migrateConfig checks for old config format and migrates to new format
func migrateConfig(data []byte, cfg *Config) {
	var legacy legacyConfig
	if err := yaml.Unmarshal(data, &legacy); err != nil {
		return
	}

	// If new format already has miniservers, no migration needed
	if len(legacy.Loxone.Miniservers) > 0 {
		return
	}

	// Check if old format fields exist
	if legacy.Loxone.MiniserverIP == "" && legacy.Loxone.UDPFeedback == nil {
		return
	}

	log.Info().Msg("Migrating legacy Loxone config to multi-miniserver format")

	ip := legacy.Loxone.MiniserverIP
	port := 7777
	udpEnabled := false
	sendAll := false

	if legacy.Loxone.UDPFeedback != nil {
		udpEnabled = legacy.Loxone.UDPFeedback.Enabled
		if legacy.Loxone.UDPFeedback.Port > 0 {
			port = legacy.Loxone.UDPFeedback.Port
		}
		sendAll = legacy.Loxone.UDPFeedback.SendAll
	}

	if ip != "" {
		cfg.Loxone.Miniservers = []MiniserverConfig{
			{
				ID:         uuid.New().String(),
				Name:       "Miniserver",
				IP:         ip,
				Port:       port,
				UDPEnabled: udpEnabled,
				SendAll:    sendAll,
			},
		}
	}
}

// legacyMapping matches the old YAML field names (without yaml tags, go-yaml lowercases field names)
type legacyMapping struct {
	ID           string `yaml:"id"`
	Name         string `yaml:"name"`
	LoxoneID     string `yaml:"loxoneid"`
	HueID        string `yaml:"hueid"`
	HueType      string `yaml:"huetype"`
	Enabled      bool   `yaml:"enabled"`
	Description  string `yaml:"description"`
	MiniserverID string `yaml:"miniserverid"`
	// New format fields (for detection)
	LoxoneIDNew string `yaml:"loxone_id"`
	HueIDNew    string `yaml:"hue_id"`
	HueTypeNew  string `yaml:"hue_type"`
}

type legacyMappingsConfig struct {
	Mappings []legacyMapping `yaml:"mappings"`
}

// migrateMappingFields migrates mappings from legacy YAML field names to new format
// Old format (no yaml tags): loxoneid, hueid, huetype
// New format (with yaml tags): loxone_id, hue_id, hue_type
func migrateMappingFields(data []byte, cfg *Config) {
	var legacy legacyMappingsConfig
	if err := yaml.Unmarshal(data, &legacy); err != nil {
		return
	}

	if len(legacy.Mappings) == 0 || len(legacy.Mappings) != len(cfg.Mappings) {
		return
	}

	migrated := false
	for i, lm := range legacy.Mappings {
		// If new format fields are empty but old format fields have data, migrate
		if cfg.Mappings[i].LoxoneID == "" && lm.LoxoneID != "" {
			cfg.Mappings[i].LoxoneID = lm.LoxoneID
			migrated = true
		}
		if cfg.Mappings[i].HueID == "" && lm.HueID != "" {
			cfg.Mappings[i].HueID = lm.HueID
			migrated = true
		}
		if cfg.Mappings[i].HueType == "" && lm.HueType != "" {
			cfg.Mappings[i].HueType = lm.HueType
			migrated = true
		}
	}

	if migrated {
		log.Info().Msg("Migrated mapping fields from legacy YAML format (loxoneid -> loxone_id, etc.)")
	}
}

// Load reads the configuration from a YAML file
func Load(path string) (*Config, error) {
	cfgPath = path

	cfgOnce.Do(func() {
		cfg = DefaultConfig()
	})

	mu.Lock()
	defer mu.Unlock()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			log.Info().Str("path", path).Msg("Config file not found, using defaults")
			return cfg, nil
		}
		return nil, err
	}

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}

	// Migrate legacy config if needed
	migrateConfig(data, cfg)

	// Ensure miniservers is never nil
	if cfg.Loxone.Miniservers == nil {
		cfg.Loxone.Miniservers = []MiniserverConfig{}
	}

	// Migrate mappings from legacy YAML field names (loxoneid -> loxone_id, etc.)
	migrateMappingFields(data, cfg)

	// Migrate mappings: assign first miniserver to mappings without miniserver_id
	if len(cfg.Loxone.Miniservers) > 0 {
		firstID := cfg.Loxone.Miniservers[0].ID
		for i := range cfg.Mappings {
			if cfg.Mappings[i].MiniserverID == "" {
				cfg.Mappings[i].MiniserverID = firstID
			}
		}
	}

	log.Info().Str("path", path).Msg("Configuration loaded")
	return cfg, nil
}

// Get returns the current configuration
func Get() *Config {
	mu.RLock()
	defer mu.RUnlock()
	return cfg
}

// Save writes the current configuration to the file
func Save() error {
	mu.RLock()
	defer mu.RUnlock()

	if cfgPath == "" {
		cfgPath = "config.yaml"
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}

	return os.WriteFile(cfgPath, data, 0644)
}

// UpdateHue updates the HUE configuration
func UpdateHue(bridgeIP, applicationKey string) {
	mu.Lock()
	defer mu.Unlock()

	cfg.Hue.BridgeIP = bridgeIP
	cfg.Hue.ApplicationKey = applicationKey
}

// UpdateMappings updates the mappings configuration
func UpdateMappings(mappings []models.Mapping) {
	mu.Lock()
	defer mu.Unlock()

	cfg.Mappings = mappings
}

// GetMappings returns a copy of current mappings
func GetMappings() []models.Mapping {
	mu.RLock()
	defer mu.RUnlock()

	result := make([]models.Mapping, len(cfg.Mappings))
	copy(result, cfg.Mappings)
	return result
}
