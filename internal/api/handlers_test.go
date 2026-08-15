package api

import (
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/sbeyeler/loxone2hue/internal/config"
	"github.com/sbeyeler/loxone2hue/internal/hue"
	"github.com/sbeyeler/loxone2hue/internal/loxone"
)

func newTestHandlers(t *testing.T) *Handlers {
	t.Helper()

	if _, err := config.Load(filepath.Join(t.TempDir(), "config.yaml")); err != nil {
		t.Fatalf("load config: %v", err)
	}
	config.UpdateMappings(nil)

	return NewHandlers(hue.NewClient("", ""), loxone.NewMappingManager(),
		loxone.NewUDPSender(), loxone.NewHTTPSender())
}

// TestCreateMappingRespectsExplicitEnabled covers the flag that used to be
// overwritten unconditionally: a client could not create a disabled mapping.
func TestCreateMappingRespectsExplicitEnabled(t *testing.T) {
	cases := []struct {
		name string
		body string
		want bool
	}{
		{"ohne Feld", `{"loxone_id":"a","hue_id":"1","hue_type":"light"}`, true},
		{"explizit true", `{"loxone_id":"b","hue_id":"2","hue_type":"light","enabled":true}`, true},
		{"explizit false", `{"loxone_id":"c","hue_id":"3","hue_type":"light","enabled":false}`, false},
	}

	h := newTestHandlers(t)

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			h.CreateMapping(rec, httptest.NewRequest("POST", "/api/mappings", strings.NewReader(tc.body)))

			if rec.Code != 201 {
				t.Fatalf("status = %d, body %s", rec.Code, rec.Body.String())
			}

			var got struct {
				Enabled bool `json:"enabled"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if got.Enabled != tc.want {
				t.Errorf("enabled = %v, want %v", got.Enabled, tc.want)
			}
		})
	}
}

// TestImportMappingsCountsSkipped pins the previously always-zero counter.
func TestImportMappingsCountsSkipped(t *testing.T) {
	h := newTestHandlers(t)

	body := `{"mode":"replace","backup":{"version":"1.0","mappings":[
		{"loxone_id":"gut","hue_id":"1","hue_type":"light","enabled":true},
		{"loxone_id":"","hue_id":"2","hue_type":"light"},
		{"loxone_id":"ohne_hue","hue_id":"","hue_type":"light"}
	]}}`

	rec := httptest.NewRecorder()
	h.ImportMappings(rec, httptest.NewRequest("POST", "/api/mappings/import", strings.NewReader(body)))

	if rec.Code != 200 {
		t.Fatalf("status = %d, body %s", rec.Code, rec.Body.String())
	}

	var got struct {
		Imported int `json:"imported"`
		Skipped  int `json:"skipped"`
		Total    int `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if got.Imported != 1 || got.Skipped != 2 || got.Total != 1 {
		t.Errorf("imported=%d skipped=%d total=%d, want 1/2/1", got.Imported, got.Skipped, got.Total)
	}
}
