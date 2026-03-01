package api

import (
	"bytes"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/sbeyeler/loxone2hue/internal/config"
	"github.com/sbeyeler/loxone2hue/internal/models"
)

// xmlAttr escapes a string for safe use in an XML attribute value
func xmlAttr(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}

// sanitizeName creates a Loxone-safe identifier from a device name
func sanitizeName(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "-", "_")
	name = strings.ReplaceAll(name, "ä", "ae")
	name = strings.ReplaceAll(name, "ö", "oe")
	name = strings.ReplaceAll(name, "ü", "ue")
	name = strings.ReplaceAll(name, "ß", "ss")
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

var moodPattern = regexp.MustCompile(`^(.+)_mood_(\d+)$`)

// ExportVirtualInputs generates a Loxone Virtual UDP Input XML template.
// This creates command recognition entries matching the UDP feedback format.
// Query params:
//   - all=true: include all HUE lights, not just mapped ones
func (h *Handlers) ExportVirtualInputs(w http.ResponseWriter, r *http.Request) {
	cfg := config.Get()
	port := cfg.Loxone.UDPFeedback.Port
	if port == 0 {
		port = 7777
	}

	type inputDevice struct {
		Name     string
		LoxoneID string
	}

	var devices []inputDevice

	if r.URL.Query().Get("all") == "true" {
		// Include all HUE lights (use mapping if exists, otherwise generate ID)
		lights, err := h.hueClient.GetLights()
		if err != nil {
			errorResponse(w, http.StatusInternalServerError, err.Error())
			return
		}
		for _, light := range lights {
			mapping := h.mappingManager.GetByHueID(light.ID)
			if mapping != nil && mapping.HueType != "scene" {
				devices = append(devices, inputDevice{
					Name:     mapping.Name,
					LoxoneID: mapping.LoxoneID,
				})
			} else if mapping == nil {
				devices = append(devices, inputDevice{
					Name:     light.Name,
					LoxoneID: sanitizeName(light.Name),
				})
			}
		}
	} else {
		// Only mapped lights and groups (not scenes)
		mappings := config.GetMappings()
		for _, m := range mappings {
			if !m.Enabled || m.HueType == "scene" {
				continue
			}
			devices = append(devices, inputDevice{
				Name:     m.Name,
				LoxoneID: m.LoxoneID,
			})
		}
	}

	sort.Slice(devices, func(i, j int) bool {
		return devices[i].LoxoneID < devices[j].LoxoneID
	})

	nl := "\r\n" // CRLF required by Loxone Config (Windows)

	var buf bytes.Buffer
	// UTF-8 BOM required by Loxone Config
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	buf.WriteString("<?xml version=\"1.0\" encoding=\"utf-8\"?>" + nl)
	fmt.Fprintf(&buf, "<VirtualInUdp Title=\"Loxone2HUE Status\" Comment=\"\" Address=\"\" Port=\"%d\">%s", port, nl)

	for _, d := range devices {
		name := xmlAttr(d.Name)
		id := xmlAttr(d.LoxoneID)

		fmt.Fprintf(&buf, "\t<VirtualInUdpCmd Title=\"%s On\" Comment=\"\" Address=\"\" Check=\"%s/on:\\v\" Signed=\"true\" Analog=\"true\" SourceValLow=\"0\" DestValLow=\"0\" SourceValHigh=\"1\" DestValHigh=\"1\" DefVal=\"0\" MinVal=\"0\" MaxVal=\"1\" Unit=\"&lt;v&gt;\" HintText=\"\"/>%s", name, id, nl)
		fmt.Fprintf(&buf, "\t<VirtualInUdpCmd Title=\"%s Helligkeit\" Comment=\"\" Address=\"\" Check=\"%s/bri:\\v\" Signed=\"true\" Analog=\"true\" SourceValLow=\"0\" DestValLow=\"0\" SourceValHigh=\"100\" DestValHigh=\"100\" DefVal=\"0\" MinVal=\"0\" MaxVal=\"100\" Unit=\"&lt;v&gt; %%\" HintText=\"\"/>%s", name, id, nl)
		fmt.Fprintf(&buf, "\t<VirtualInUdpCmd Title=\"%s Farbtemperatur\" Comment=\"\" Address=\"\" Check=\"%s/ct:\\v\" Signed=\"true\" Analog=\"true\" SourceValLow=\"153\" DestValLow=\"153\" SourceValHigh=\"500\" DestValHigh=\"500\" DefVal=\"0\" MinVal=\"153\" MaxVal=\"500\" Unit=\"&lt;v&gt;\" HintText=\"\"/>%s", name, id, nl)
		fmt.Fprintf(&buf, "\t<VirtualInUdpCmd Title=\"%s Farbe X\" Comment=\"\" Address=\"\" Check=\"%s/color_x:\\v\" Signed=\"true\" Analog=\"true\" SourceValLow=\"0\" DestValLow=\"0\" SourceValHigh=\"1\" DestValHigh=\"1\" DefVal=\"0\" MinVal=\"0\" MaxVal=\"1\" Unit=\"&lt;v&gt;\" HintText=\"\"/>%s", name, id, nl)
		fmt.Fprintf(&buf, "\t<VirtualInUdpCmd Title=\"%s Farbe Y\" Comment=\"\" Address=\"\" Check=\"%s/color_y:\\v\" Signed=\"true\" Analog=\"true\" SourceValLow=\"0\" DestValLow=\"0\" SourceValHigh=\"1\" DestValHigh=\"1\" DefVal=\"0\" MinVal=\"0\" MaxVal=\"1\" Unit=\"&lt;v&gt;\" HintText=\"\"/>%s", name, id, nl)
	}

	buf.WriteString("</VirtualInUdp>")

	w.Header().Set("Content-Type", "text/xml; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\"VIU_Loxone2HUE.xml\"")
	w.Write(buf.Bytes())
}

// ExportVirtualOutputs generates a Loxone Virtual HTTP Output XML template.
// This creates commands for controlling HUE devices from Loxone.
// Mood patterns (_mood_N) are grouped into a single MOOD command per base target.
func (h *Handlers) ExportVirtualOutputs(w http.ResponseWriter, r *http.Request) {
	// Determine gateway address from request
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	address := fmt.Sprintf("%s://%s", scheme, r.Host)

	mappings := config.GetMappings()

	// Detect mood base names and collect non-mood mappings
	type moodGroup struct {
		BaseName string
		Count    int
	}
	moodGroups := make(map[string]*moodGroup)
	var directMappings []models.Mapping

	for _, m := range mappings {
		if !m.Enabled {
			continue
		}
		if matches := moodPattern.FindStringSubmatch(m.LoxoneID); matches != nil {
			baseName := matches[1]
			if mg, ok := moodGroups[baseName]; ok {
				mg.Count++
			} else {
				moodGroups[baseName] = &moodGroup{BaseName: baseName, Count: 1}
			}
		} else {
			directMappings = append(directMappings, m)
		}
	}

	// Sort mood base names
	moodBaseNames := make([]string, 0, len(moodGroups))
	for baseName := range moodGroups {
		moodBaseNames = append(moodBaseNames, baseName)
	}
	sort.Strings(moodBaseNames)

	nl := "\r\n" // CRLF required by Loxone Config (Windows)

	var buf bytes.Buffer
	// UTF-8 BOM required by Loxone Config
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	buf.WriteString("<?xml version=\"1.0\" encoding=\"utf-8\"?>" + nl)
	fmt.Fprintf(&buf, "<VirtualOut Title=\"Loxone2HUE\" Comment=\"\" Address=\"%s\" CmdInit=\"\" HintText=\"\" CloseAfterSend=\"true\" CmdSep=\";\">%s", xmlAttr(address), nl)

	// Mood commands (0=Aus, 1-N=Szene)
	for _, baseName := range moodBaseNames {
		mg := moodGroups[baseName]
		title := strings.ReplaceAll(baseName, "_", " ")
		// Capitalize first letter of each word
		words := strings.Fields(title)
		for i, w := range words {
			if len(w) > 0 {
				words[i] = strings.ToUpper(w[:1]) + w[1:]
			}
		}
		title = strings.Join(words, " ")

		comment := fmt.Sprintf("Mood: 0=Aus, 1-%d=Szene", mg.Count)
		fmt.Fprintf(&buf, "\t<VirtualOutCmd Title=\"%s (Mood)\" Comment=\"%s\" CmdOnMethod=\"GET\" CmdOn=\"/ws?cmd=MOOD %s &lt;v&gt;\" CmdOnHTTP=\"\" CmdOnPost=\"\" CmdOffMethod=\"GET\" CmdOff=\"\" CmdOffHTTP=\"\" CmdOffPost=\"\" CmdAnswer=\"\" HintText=\"\" Analog=\"true\" Repeat=\"0\" RepeatRate=\"0\"/>%s",
			xmlAttr(title), xmlAttr(comment), xmlAttr(baseName), nl)
	}

	// Direct light/group commands
	sort.Slice(directMappings, func(i, j int) bool {
		return directMappings[i].LoxoneID < directMappings[j].LoxoneID
	})

	for _, m := range directMappings {
		switch m.HueType {
		case "light", "group":
			fmt.Fprintf(&buf, "\t<VirtualOutCmd Title=\"%s\" Comment=\"%s\" CmdOnMethod=\"GET\" CmdOn=\"/ws?cmd=SET %s BRI &lt;v&gt;\" CmdOnHTTP=\"\" CmdOnPost=\"\" CmdOffMethod=\"GET\" CmdOff=\"\" CmdOffHTTP=\"\" CmdOffPost=\"\" CmdAnswer=\"\" HintText=\"\" Analog=\"true\" Repeat=\"0\" RepeatRate=\"0\"/>%s",
				xmlAttr(m.Name), xmlAttr(m.Description), xmlAttr(m.LoxoneID), nl)
		}
	}

	buf.WriteString("</VirtualOut>")

	w.Header().Set("Content-Type", "text/xml; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\"VO_Loxone2HUE.xml\"")
	w.Write(buf.Bytes())
}
