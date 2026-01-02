package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/api"
	"github.com/sbeyeler/loxone2hue/internal/config"
	"github.com/sbeyeler/loxone2hue/internal/hue"
	"github.com/sbeyeler/loxone2hue/internal/loxone"
)

var (
	version   = "1.0.0"
	buildTime = "unknown"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "configs/config.yaml", "Path to configuration file")
	showVersion := flag.Bool("version", false, "Show version information")
	flag.Parse()

	if *showVersion {
		log.Info().Str("version", version).Str("build_time", buildTime).Msg("Loxone2HUE Gateway")
		os.Exit(0)
	}

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatal().Err(err).Str("path", *configPath).Msg("Failed to load configuration")
	}

	// Setup logging
	setupLogging(cfg.Logging.Level, cfg.Logging.Format)

	log.Info().
		Str("version", version).
		Str("config", *configPath).
		Msg("Starting Loxone2HUE Gateway")

	// Create HUE client
	hueClient := hue.NewClient(cfg.Hue.BridgeIP, cfg.Hue.ApplicationKey)

	// Create mapping manager
	mappingManager := loxone.NewMappingManager()
	mappingManager.Load(cfg.Mappings)

	// If HUE is configured, start event stream
	if hueClient.IsConfigured() {
		log.Info().Str("bridge_ip", cfg.Hue.BridgeIP).Msg("HUE Bridge configured, starting event stream")
		go hueClient.StartEventStream(context.Background())
	} else {
		log.Info().Msg("HUE Bridge not configured, waiting for pairing via Web UI")
	}

	// Create API server
	server := api.NewServer(hueClient, mappingManager)

	// Setup context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		log.Info().Str("signal", sig.String()).Msg("Received shutdown signal")
		cancel()
	}()

	// Start HTTP server
	log.Info().
		Str("host", cfg.Server.Host).
		Int("port", cfg.Server.Port).
		Msg("Starting HTTP server")

	if err := server.Start(ctx, cfg.Server.Host, cfg.Server.Port); err != nil {
		log.Error().Err(err).Msg("Server error")
	}

	// Cleanup
	hueClient.Close()
	log.Info().Msg("Loxone2HUE Gateway stopped")
}

func setupLogging(level, format string) {
	// Set log level
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Set log format
	if format == "console" || format == "text" {
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		})
	}
	// Default is JSON format (zerolog default)
}
