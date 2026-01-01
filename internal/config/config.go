package config

import (
	"os"
	"sync"

	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/models"
	"gopkg.in/yaml.v3"
)

// Config represents the application configuration
type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Hue      HueConfig      `yaml:"hue"`
	Loxone   LoxoneConfig   `yaml:"loxone"`
	Logging  LoggingConfig  `yaml:"logging"`
	Mappings []models.Mapping `yaml:"mappings"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	Port int    `yaml:"port"`
	Host string `yaml:"host"`
}

// HueConfig holds HUE bridge settings
type HueConfig struct {
	BridgeIP       string `yaml:"bridge_ip"`
	ApplicationKey string `yaml:"application_key"`
}

// LoxoneConfig holds Loxone integration settings
type LoxoneConfig struct {
	Enabled      bool   `yaml:"enabled"`
	MiniserverIP string `yaml:"miniserver_ip"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
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
			Enabled:      true,
			MiniserverIP: "",
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
		},
		Mappings: []models.Mapping{},
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
