package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/hue"
	"github.com/sbeyeler/loxone2hue/internal/loxone"
)

// Server represents the HTTP/WebSocket server
type Server struct {
	router         *mux.Router
	httpServer     *http.Server
	wsHub          *WebSocketHub
	handlers       *Handlers
	hueClient      *hue.Client
	mappingManager *loxone.MappingManager
}

// NewServer creates a new API server
func NewServer(hueClient *hue.Client, mappingManager *loxone.MappingManager) *Server {
	s := &Server{
		router:         mux.NewRouter(),
		hueClient:      hueClient,
		mappingManager: mappingManager,
	}

	s.wsHub = NewWebSocketHub(hueClient, mappingManager)
	s.handlers = NewHandlers(hueClient, mappingManager)

	s.setupRoutes()
	return s
}

// setupRoutes configures all API routes
func (s *Server) setupRoutes() {
	// Middleware
	s.router.Use(corsMiddleware)
	s.router.Use(loggingMiddleware)

	// API routes
	api := s.router.PathPrefix("/api").Subrouter()

	// Bridge endpoints
	api.HandleFunc("/bridge", s.handlers.GetBridge).Methods("GET")
	api.HandleFunc("/bridge/discover", s.handlers.DiscoverBridges).Methods("GET")
	api.HandleFunc("/bridge/pair", s.handlers.PairBridge).Methods("POST")
	api.HandleFunc("/bridge/test", s.handlers.TestBridgeConnection).Methods("POST")

	// Device endpoints
	api.HandleFunc("/devices", s.handlers.GetDevices).Methods("GET")
	api.HandleFunc("/devices/{id}", s.handlers.GetDevice).Methods("GET")
	api.HandleFunc("/devices/{id}", s.handlers.SetDevice).Methods("PUT", "POST")

	// Group endpoints
	api.HandleFunc("/groups", s.handlers.GetGroups).Methods("GET")
	api.HandleFunc("/groups/{id}", s.handlers.GetGroup).Methods("GET")
	api.HandleFunc("/groups/{id}", s.handlers.SetGroup).Methods("PUT", "POST")

	// Scene endpoints
	api.HandleFunc("/scenes", s.handlers.GetScenes).Methods("GET")
	api.HandleFunc("/scenes/{id}/activate", s.handlers.ActivateScene).Methods("POST")

	// Mapping endpoints
	api.HandleFunc("/mappings", s.handlers.GetMappings).Methods("GET")
	api.HandleFunc("/mappings", s.handlers.CreateMapping).Methods("POST")
	api.HandleFunc("/mappings/{id}", s.handlers.UpdateMapping).Methods("PUT")
	api.HandleFunc("/mappings/{id}", s.handlers.DeleteMapping).Methods("DELETE")
	api.HandleFunc("/mappings/export", s.handlers.ExportMappings).Methods("GET")
	api.HandleFunc("/mappings/import", s.handlers.ImportMappings).Methods("POST")

	// Config endpoints
	api.HandleFunc("/config", s.handlers.GetConfig).Methods("GET")
	api.HandleFunc("/config", s.handlers.UpdateConfig).Methods("PUT")

	// Health check
	api.HandleFunc("/health", s.handlers.Health).Methods("GET")

	// Swagger documentation
	api.HandleFunc("/swagger.json", s.SwaggerSpec).Methods("GET")
	api.HandleFunc("/swagger", s.SwaggerUI).Methods("GET")
	api.HandleFunc("/swagger/", s.SwaggerUI).Methods("GET")

	// WebSocket endpoint
	s.router.HandleFunc("/ws", s.wsHub.HandleWebSocket)

	// Serve static files (frontend)
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir("./web/dist")))
}

// Start starts the HTTP server
func (s *Server) Start(ctx context.Context, host string, port int) error {
	addr := fmt.Sprintf("%s:%d", host, port)

	s.httpServer = &http.Server{
		Addr:         addr,
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start WebSocket hub
	go s.wsHub.Run(ctx)

	log.Info().Str("addr", addr).Msg("Starting HTTP server")

	errChan := make(chan error, 1)
	go func() {
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	select {
	case <-ctx.Done():
		return s.Shutdown()
	case err := <-errChan:
		return err
	}
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	log.Info().Msg("Shutting down HTTP server")
	return s.httpServer.Shutdown(ctx)
}

// corsMiddleware adds CORS headers
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// loggingMiddleware logs HTTP requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip logging wrapper for WebSocket upgrades to preserve Hijacker interface
		if r.Header.Get("Upgrade") == "websocket" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()

		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(wrapped, r)

		log.Debug().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", wrapped.statusCode).
			Dur("duration", time.Since(start)).
			Msg("HTTP request")
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
