package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
<<<<<<< HEAD
=======
	"regexp"
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/rs/zerolog/log"
	"github.com/sbeyeler/loxone2hue/internal/config"
	"github.com/sbeyeler/loxone2hue/internal/models"
)

// ConfigBackup represents a full configuration backup
type ConfigBackup struct {
	ID        string       `json:"id"`
	Version   string       `json:"version"`
	CreatedAt time.Time    `json:"created_at"`
	Remark    string       `json:"remark"`
	Config    BackupConfig `json:"config"`
}

// BackupConfig holds the full configuration snapshot
type BackupConfig struct {
	Server   config.ServerConfig  `json:"server"`
	Hue      BackupHueConfig      `json:"hue"`
	Loxone   config.LoxoneConfig  `json:"loxone"`
	Logging  config.LoggingConfig `json:"logging"`
	Mappings []models.Mapping     `json:"mappings"`
}

// BackupHueConfig holds HUE config for backup (includes application_key)
type BackupHueConfig struct {
	BridgeIP       string `json:"bridge_ip"`
	ApplicationKey string `json:"application_key"`
}

// backupsDir returns the path to the backups directory
func backupsDir() string {
	cfgPath := config.GetPath()
	return filepath.Join(filepath.Dir(cfgPath), "backups")
}

<<<<<<< HEAD
// backupPath validates a backup id and returns the absolute path to its file.
// The id must be a valid UUID so that no path-traversal sequences (".." etc.)
// can escape the backups directory via the generated filename.
func backupPath(id string) (string, bool) {
	if _, err := uuid.Parse(id); err != nil {
		return "", false
	}
	filename := fmt.Sprintf("backup-%s.json", id)
	path := filepath.Join(backupsDir(), filename)
	// Defence in depth: ensure the resolved path stays inside backupsDir.
	if filepath.Dir(path) != filepath.Clean(backupsDir()) {
		return "", false
	}
	return path, true
}

// ensureBackupsDir creates the backups directory if it doesn't exist
func ensureBackupsDir() error {
	return os.MkdirAll(backupsDir(), 0755)
=======
// validBackupID reports whether id is a canonical UUID as produced by
// uuid.New().String(). Backup IDs are interpolated into file paths, so any
// other shape (path separators, "..", short strings) must be rejected before
// it reaches the filesystem.
func validBackupID(id string) bool {
	return backupIDPattern.MatchString(id)
}

var backupIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// backupPath returns the on-disk path for a validated backup ID.
func backupPath(id string) string {
	return filepath.Join(backupsDir(), fmt.Sprintf("backup-%s.json", id))
}

// ensureBackupsDir creates the backups directory if it doesn't exist.
// Backups contain the HUE application key and Loxone credentials, so the
// directory and its files stay owner-only.
func ensureBackupsDir() error {
	return os.MkdirAll(backupsDir(), 0700)
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
}

// ListBackups returns all stored backups
func (h *Handlers) ListBackups(w http.ResponseWriter, r *http.Request) {
	dir := backupsDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			jsonResponse(w, http.StatusOK, map[string]interface{}{
				"backups": []ConfigBackup{},
			})
			return
		}
		errorResponse(w, http.StatusInternalServerError, "failed to read backups directory")
		return
	}

	var backups []ConfigBackup
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		var backup ConfigBackup
		if err := json.Unmarshal(data, &backup); err != nil {
			continue
		}
		backups = append(backups, backup)
	}

	// Sort by creation date, newest first
	sort.Slice(backups, func(i, j int) bool {
		return backups[i].CreatedAt.After(backups[j].CreatedAt)
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"backups": backups,
	})
}

// CreateBackup creates a new configuration backup
func (h *Handlers) CreateBackup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Remark string `json:"remark"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := ensureBackupsDir(); err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to create backups directory")
		return
	}

	cfg := config.Get()
	backup := ConfigBackup{
		ID:        uuid.New().String(),
		Version:   config.GetVersion(),
		CreatedAt: time.Now().UTC(),
		Remark:    req.Remark,
		Config: BackupConfig{
			Server: cfg.Server,
			Hue: BackupHueConfig{
				BridgeIP:       cfg.Hue.BridgeIP,
				ApplicationKey: cfg.Hue.ApplicationKey,
			},
			Loxone:   cfg.Loxone,
			Logging:  cfg.Logging,
			Mappings: cfg.Mappings,
		},
	}

	data, err := json.MarshalIndent(backup, "", "  ")
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to marshal backup")
		return
	}

<<<<<<< HEAD
	filename := fmt.Sprintf("backup-%s.json", backup.ID)
	if err := os.WriteFile(filepath.Join(backupsDir(), filename), data, 0644); err != nil {
=======
	if err := os.WriteFile(backupPath(backup.ID), data, 0600); err != nil {
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
		errorResponse(w, http.StatusInternalServerError, "failed to write backup file")
		return
	}

	log.Info().Str("id", backup.ID).Str("remark", backup.Remark).Msg("Configuration backup created")
	jsonResponse(w, http.StatusCreated, backup)
}

// DeleteBackup deletes a specific backup
func (h *Handlers) DeleteBackup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

<<<<<<< HEAD
	path, ok := backupPath(id)
	if !ok {
=======
	if !validBackupID(id) {
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
		errorResponse(w, http.StatusBadRequest, "invalid backup id")
		return
	}

<<<<<<< HEAD
=======
	path := backupPath(id)

>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		errorResponse(w, http.StatusNotFound, "backup not found")
		return
	}

	if err := os.Remove(path); err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to delete backup")
		return
	}

	log.Info().Str("id", id).Msg("Configuration backup deleted")
	jsonResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// DownloadBackup returns a backup as a downloadable JSON file
func (h *Handlers) DownloadBackup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

<<<<<<< HEAD
	path, ok := backupPath(id)
	if !ok {
=======
	if !validBackupID(id) {
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
		errorResponse(w, http.StatusBadRequest, "invalid backup id")
		return
	}

<<<<<<< HEAD
	data, err := os.ReadFile(path)
=======
	data, err := os.ReadFile(backupPath(id))
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
	if err != nil {
		if os.IsNotExist(err) {
			errorResponse(w, http.StatusNotFound, "backup not found")
			return
		}
		errorResponse(w, http.StatusInternalServerError, "failed to read backup")
		return
	}

<<<<<<< HEAD
=======
	// Safe to slice: validBackupID guarantees a 36-character UUID.
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=loxone2hue-backup-%s.json", id[:8]))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// UploadBackup imports a backup file and stores it persistently
func (h *Handlers) UploadBackup(w http.ResponseWriter, r *http.Request) {
	var backup ConfigBackup
	if err := json.NewDecoder(r.Body).Decode(&backup); err != nil {
		errorResponse(w, http.StatusBadRequest, "invalid backup file format")
		return
	}

	if backup.Config.Mappings == nil {
		errorResponse(w, http.StatusBadRequest, "invalid backup: missing config data")
		return
	}

<<<<<<< HEAD
	// Assign a fresh, validated ID so a client-supplied id cannot be used for
	// path traversal in the generated filename.
	if _, err := uuid.Parse(backup.ID); err != nil {
=======
	// The ID comes from an uploaded file and ends up in a file path, so accept
	// it only in canonical UUID form; anything else gets a fresh ID.
	if !validBackupID(backup.ID) {
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
		backup.ID = uuid.New().String()
	}

	if err := ensureBackupsDir(); err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to create backups directory")
		return
	}

	data, err := json.MarshalIndent(backup, "", "  ")
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to marshal backup")
		return
	}

<<<<<<< HEAD
	path, ok := backupPath(backup.ID)
	if !ok {
		errorResponse(w, http.StatusInternalServerError, "failed to build backup path")
		return
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
=======
	if err := os.WriteFile(backupPath(backup.ID), data, 0600); err != nil {
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
		errorResponse(w, http.StatusInternalServerError, "failed to write backup file")
		return
	}

	log.Info().Str("id", backup.ID).Str("remark", backup.Remark).Msg("Configuration backup uploaded")
	jsonResponse(w, http.StatusCreated, backup)
}

// RestoreBackup restores the configuration from a backup
func (h *Handlers) RestoreBackup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

<<<<<<< HEAD
	path, ok := backupPath(id)
	if !ok {
=======
	if !validBackupID(id) {
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
		errorResponse(w, http.StatusBadRequest, "invalid backup id")
		return
	}

<<<<<<< HEAD
	data, err := os.ReadFile(path)
=======
	data, err := os.ReadFile(backupPath(id))
>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
	if err != nil {
		if os.IsNotExist(err) {
			errorResponse(w, http.StatusNotFound, "backup not found")
			return
		}
		errorResponse(w, http.StatusInternalServerError, "failed to read backup")
		return
	}

	var backup ConfigBackup
	if err := json.Unmarshal(data, &backup); err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to parse backup")
		return
	}

	// Apply backup to current config
	config.RestoreFromBackup(
		backup.Config.Server,
		backup.Config.Hue.BridgeIP,
		backup.Config.Hue.ApplicationKey,
		backup.Config.Loxone,
		backup.Config.Logging,
		backup.Config.Mappings,
	)

	// Save to disk
	if err := config.Save(); err != nil {
		errorResponse(w, http.StatusInternalServerError, "failed to save restored config")
		return
	}

	// Reconfigure runtime components
	if h.udpSender != nil {
		h.udpSender.Configure(backup.Config.Loxone.Miniservers)
	}
	if h.httpSender != nil {
		h.httpSender.Configure(backup.Config.Loxone.Miniservers)
	}
	h.mappingManager.Load(backup.Config.Mappings)

<<<<<<< HEAD
=======
	// Point the HUE client at the restored bridge; without this the event
	// stream keeps talking to the bridge configured before the restore.
	h.hueClient.Configure(backup.Config.Hue.BridgeIP, backup.Config.Hue.ApplicationKey)

>>>>>>> a6b6dbe (fix: entferne Live-Konfiguration aus den Add-on-Baeumen, synchronisiere auf 1.3.2)
	log.Info().Str("id", id).Str("remark", backup.Remark).Msg("Configuration restored from backup")
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "restored",
		"backup":  backup.ID,
		"remark":  backup.Remark,
	})
}
