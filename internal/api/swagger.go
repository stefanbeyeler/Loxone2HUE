package api

import (
	"embed"
	"html/template"
	"net/http"
)

//go:embed swagger-ui.html
var swaggerUIHTML embed.FS

// SwaggerUI serves the Swagger UI page
func (s *Server) SwaggerUI(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFS(swaggerUIHTML, "swagger-ui.html"))
	tmpl.Execute(w, nil)
}

// SwaggerSpec serves the OpenAPI specification
func (s *Server) SwaggerSpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(openAPISpec))
}

const openAPISpec = `{
  "openapi": "3.0.3",
  "info": {
    "title": "Loxone2HUE Gateway API",
    "description": "Gateway Service zur bidirektionalen Kommunikation zwischen Loxone und Philips HUE.",
    "version": "1.0.0",
    "contact": {
      "name": "Loxone2HUE Gateway"
    }
  },
  "servers": [
    {
      "url": "/api",
      "description": "API Endpunkt"
    }
  ],
  "tags": [
    {
      "name": "Health",
      "description": "Service Health Check"
    },
    {
      "name": "Loxone",
      "description": "Loxone Befehle (HTTP/WebSocket Endpoint)"
    },
    {
      "name": "Bridge",
      "description": "HUE Bridge Discovery und Pairing"
    },
    {
      "name": "Devices",
      "description": "HUE Lampen (Lights) verwalten"
    },
    {
      "name": "Groups",
      "description": "HUE Räume und Gruppen verwalten"
    },
    {
      "name": "Scenes",
      "description": "HUE Szenen verwalten"
    },
    {
      "name": "Mappings",
      "description": "Loxone zu HUE Mappings verwalten"
    },
    {
      "name": "Config",
      "description": "Gateway Konfiguration"
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "tags": ["Health"],
        "summary": "Health Check",
        "description": "Gibt den aktuellen Status des Gateway Services zurück.",
        "responses": {
          "200": {
            "description": "Service ist gesund",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HealthResponse"
                }
              }
            }
          }
        }
      }
    },
    "/../ws": {
      "get": {
        "tags": ["Loxone"],
        "summary": "Loxone Befehl ausführen",
        "description": "Führt einen Loxone-Befehl aus. Dieser Endpoint ist für Loxone Virtual Outputs gedacht.\n\n## Verfügbare Befehle\n\n| Befehl | Beschreibung | Beispiel |\n|--------|--------------|----------|\n| SET id ON | Licht/Gruppe einschalten | SET wz_decke ON |\n| SET id OFF | Licht/Gruppe ausschalten | SET wz_decke OFF |\n| SET id BRI n | Helligkeit setzen (0-100%) | SET wz_decke BRI 75 |\n| SET id CT n | Farbtemperatur (2000-6500K) | SET wz_decke CT 4000 |\n| SET id COLOR hex | Farbe setzen | SET wz_decke COLOR #FF5500 |\n| SCENE id | Szene aktivieren | SCENE sz_relax |\n| MOOD id n | Stimmung aktivieren (Lichtsteuerung) | MOOD wohnzimmer 1 |\n| GET id STATUS | Status abfragen | GET wz_decke STATUS |\n\n## MOOD-Befehl für Lichtsteuerungs-Baustein\n\nDer MOOD-Befehl ist für den Loxone Lichtsteuerungs-Baustein konzipiert:\n- MOOD 0: Schaltet die zugehörige Gruppe/Licht aus\n- MOOD 1-9: Aktiviert die entsprechende Szene\n\nBenötigte Mappings für MOOD:\n- target -> Gruppe (für Mood 0 = Aus)\n- target_mood_1 -> Szene (für Mood 1)\n- target_mood_2 -> Szene (für Mood 2)\n- etc.",
        "parameters": [
          {
            "name": "cmd",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Der auszuführende Befehl",
            "examples": {
              "on": {
                "summary": "Licht einschalten",
                "value": "SET wz_decke ON"
              },
              "off": {
                "summary": "Licht ausschalten",
                "value": "SET wz_decke OFF"
              },
              "brightness": {
                "summary": "Helligkeit setzen",
                "value": "SET wz_decke BRI 75"
              },
              "scene": {
                "summary": "Szene aktivieren",
                "value": "SCENE sz_relax"
              },
              "mood": {
                "summary": "Stimmung aktivieren",
                "value": "MOOD wohnzimmer 1"
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Befehl erfolgreich ausgeführt",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoxoneCommandResponse"
                }
              }
            }
          },
          "400": {
            "description": "Ungültiger Befehl oder fehlende Parameter",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "404": {
            "description": "Kein Mapping für Target gefunden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoxoneMoodError"
                }
              }
            }
          }
        }
      }
    },
    "/bridge": {
      "get": {
        "tags": ["Bridge"],
        "summary": "Bridge Info",
        "description": "Gibt Informationen über die verbundene HUE Bridge zurück.",
        "responses": {
          "200": {
            "description": "Bridge Informationen",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BridgeResponse"
                }
              }
            }
          }
        }
      }
    },
    "/bridge/discover": {
      "get": {
        "tags": ["Bridge"],
        "summary": "Bridge Discovery",
        "description": "Sucht nach HUE Bridges im lokalen Netzwerk via mDNS.",
        "responses": {
          "200": {
            "description": "Gefundene Bridges",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoverResponse"
                }
              }
            }
          }
        }
      }
    },
    "/bridge/pair": {
      "post": {
        "tags": ["Bridge"],
        "summary": "Bridge Pairing",
        "description": "Koppelt den Gateway mit einer HUE Bridge. Der Link-Button auf der Bridge muss vorher gedrückt werden.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PairRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Pairing erfolgreich",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PairResponse"
                }
              }
            }
          },
          "400": {
            "description": "Pairing fehlgeschlagen (Link-Button nicht gedrückt)",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/devices": {
      "get": {
        "tags": ["Devices"],
        "summary": "Alle Lampen abrufen",
        "description": "Gibt eine Liste aller HUE Lampen zurück.",
        "responses": {
          "200": {
            "description": "Liste der Lampen",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DevicesResponse"
                }
              }
            }
          }
        }
      }
    },
    "/devices/{id}": {
      "get": {
        "tags": ["Devices"],
        "summary": "Einzelne Lampe abrufen",
        "description": "Gibt Details zu einer bestimmten Lampe zurück.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID der Lampe"
          }
        ],
        "responses": {
          "200": {
            "description": "Lampendetails",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Light"
                }
              }
            }
          },
          "404": {
            "description": "Lampe nicht gefunden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["Devices"],
        "summary": "Lampe steuern",
        "description": "Setzt den Zustand einer Lampe (Ein/Aus, Helligkeit, Farbe, etc.).",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID der Lampe"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeviceCommand"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Erfolgreich",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusResponse"
                }
              }
            }
          }
        }
      }
    },
    "/groups": {
      "get": {
        "tags": ["Groups"],
        "summary": "Alle Gruppen abrufen",
        "description": "Gibt eine Liste aller HUE Räume und Zonen zurück.",
        "responses": {
          "200": {
            "description": "Liste der Gruppen",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GroupsResponse"
                }
              }
            }
          }
        }
      }
    },
    "/groups/{id}": {
      "get": {
        "tags": ["Groups"],
        "summary": "Einzelne Gruppe abrufen",
        "description": "Gibt Details zu einer bestimmten Gruppe zurück.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID der Gruppe"
          }
        ],
        "responses": {
          "200": {
            "description": "Gruppendetails",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Group"
                }
              }
            }
          },
          "404": {
            "description": "Gruppe nicht gefunden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["Groups"],
        "summary": "Gruppe steuern",
        "description": "Setzt den Zustand aller Lampen in einer Gruppe.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID der Gruppe"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeviceCommand"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Erfolgreich",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusResponse"
                }
              }
            }
          }
        }
      }
    },
    "/scenes": {
      "get": {
        "tags": ["Scenes"],
        "summary": "Alle Szenen abrufen",
        "description": "Gibt eine Liste aller HUE Szenen zurück.",
        "responses": {
          "200": {
            "description": "Liste der Szenen",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScenesResponse"
                }
              }
            }
          }
        }
      }
    },
    "/scenes/{id}/activate": {
      "post": {
        "tags": ["Scenes"],
        "summary": "Szene aktivieren",
        "description": "Aktiviert eine HUE Szene.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID der Szene"
          }
        ],
        "responses": {
          "200": {
            "description": "Szene aktiviert",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusResponse"
                }
              }
            }
          }
        }
      }
    },
    "/mappings": {
      "get": {
        "tags": ["Mappings"],
        "summary": "Alle Mappings abrufen",
        "description": "Gibt eine Liste aller Loxone zu HUE Mappings zurück.",
        "responses": {
          "200": {
            "description": "Liste der Mappings",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MappingsResponse"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["Mappings"],
        "summary": "Mapping erstellen",
        "description": "Erstellt ein neues Loxone zu HUE Mapping.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/MappingCreate"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Mapping erstellt",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Mapping"
                }
              }
            }
          }
        }
      }
    },
    "/mappings/{id}": {
      "put": {
        "tags": ["Mappings"],
        "summary": "Mapping aktualisieren",
        "description": "Aktualisiert ein bestehendes Mapping.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID des Mappings"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Mapping"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Mapping aktualisiert",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Mapping"
                }
              }
            }
          },
          "404": {
            "description": "Mapping nicht gefunden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": ["Mappings"],
        "summary": "Mapping löschen",
        "description": "Löscht ein Mapping.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "ID des Mappings"
          }
        ],
        "responses": {
          "200": {
            "description": "Mapping gelöscht",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusResponse"
                }
              }
            }
          },
          "404": {
            "description": "Mapping nicht gefunden",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/config": {
      "get": {
        "tags": ["Config"],
        "summary": "Konfiguration abrufen",
        "description": "Gibt die aktuelle Gateway-Konfiguration zurück (ohne sensible Daten).",
        "responses": {
          "200": {
            "description": "Konfiguration",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ConfigResponse"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["Config"],
        "summary": "Konfiguration aktualisieren",
        "description": "Aktualisiert die Gateway-Konfiguration.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ConfigUpdate"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Konfiguration aktualisiert",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "HealthResponse": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "example": "healthy"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "hue_configured": {
            "type": "boolean"
          }
        }
      },
      "BridgeResponse": {
        "type": "object",
        "properties": {
          "configured": {
            "type": "boolean"
          },
          "info": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "model": {
                "type": "string"
              },
              "software_version": {
                "type": "string"
              }
            }
          }
        }
      },
      "DiscoverResponse": {
        "type": "object",
        "properties": {
          "bridges": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "ip": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "PairRequest": {
        "type": "object",
        "required": ["bridge_ip"],
        "properties": {
          "bridge_ip": {
            "type": "string",
            "example": "192.168.1.100",
            "description": "IP-Adresse der HUE Bridge"
          }
        }
      },
      "PairResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean"
          },
          "application_key": {
            "type": "string",
            "description": "Der generierte Application Key für die API"
          }
        }
      },
      "Light": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "model": {
            "type": "string"
          },
          "manufacturer": {
            "type": "string"
          },
          "state": {
            "$ref": "#/components/schemas/LightState"
          }
        }
      },
      "LightState": {
        "type": "object",
        "properties": {
          "on": {
            "type": "boolean"
          },
          "brightness": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "color_temp": {
            "type": "integer",
            "description": "Farbtemperatur in Kelvin (2000-6500)"
          },
          "reachable": {
            "type": "boolean"
          }
        }
      },
      "DevicesResponse": {
        "type": "object",
        "properties": {
          "devices": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Light"
            }
          }
        }
      },
      "DeviceCommand": {
        "type": "object",
        "properties": {
          "on": {
            "type": "boolean",
            "description": "Ein/Aus"
          },
          "brightness": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
            "description": "Helligkeit in Prozent"
          },
          "color_temp": {
            "type": "integer",
            "description": "Farbtemperatur in Kelvin (2000-6500)"
          },
          "color": {
            "type": "string",
            "description": "Farbe als Hex-Wert (z.B. #FF5500)"
          }
        }
      },
      "Group": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": ["room", "zone"]
          },
          "lights": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "state": {
            "$ref": "#/components/schemas/GroupState"
          }
        }
      },
      "GroupState": {
        "type": "object",
        "properties": {
          "any_on": {
            "type": "boolean",
            "description": "Mindestens eine Lampe ist an"
          },
          "all_on": {
            "type": "boolean",
            "description": "Alle Lampen sind an"
          }
        }
      },
      "GroupsResponse": {
        "type": "object",
        "properties": {
          "groups": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Group"
            }
          }
        }
      },
      "Scene": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "group_id": {
            "type": "string",
            "description": "ID der zugehörigen Gruppe/Raum"
          }
        }
      },
      "ScenesResponse": {
        "type": "object",
        "properties": {
          "scenes": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Scene"
            }
          }
        }
      },
      "Mapping": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "loxone_id": {
            "type": "string",
            "description": "Loxone Identifikator für dieses Mapping"
          },
          "hue_id": {
            "type": "string",
            "description": "ID der HUE Ressource"
          },
          "hue_type": {
            "type": "string",
            "enum": ["light", "group", "scene"],
            "description": "Typ der HUE Ressource"
          },
          "enabled": {
            "type": "boolean"
          },
          "description": {
            "type": "string"
          }
        }
      },
      "MappingCreate": {
        "type": "object",
        "required": ["name", "loxone_id", "hue_id", "hue_type"],
        "properties": {
          "name": {
            "type": "string"
          },
          "loxone_id": {
            "type": "string"
          },
          "hue_id": {
            "type": "string"
          },
          "hue_type": {
            "type": "string",
            "enum": ["light", "group", "scene"]
          },
          "description": {
            "type": "string"
          }
        }
      },
      "MappingsResponse": {
        "type": "object",
        "properties": {
          "mappings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Mapping"
            }
          }
        }
      },
      "ConfigResponse": {
        "type": "object",
        "properties": {
          "server": {
            "type": "object",
            "properties": {
              "host": {
                "type": "string"
              },
              "port": {
                "type": "integer"
              }
            }
          },
          "hue": {
            "type": "object",
            "properties": {
              "bridge_ip": {
                "type": "string"
              },
              "configured": {
                "type": "boolean"
              }
            }
          },
          "loxone": {
            "type": "object",
            "properties": {
              "enabled": {
                "type": "boolean"
              },
              "miniserver_ip": {
                "type": "string"
              }
            }
          }
        }
      },
      "ConfigUpdate": {
        "type": "object",
        "properties": {
          "loxone": {
            "type": "object",
            "properties": {
              "enabled": {
                "type": "boolean"
              },
              "miniserver_ip": {
                "type": "string"
              }
            }
          }
        }
      },
      "StatusResponse": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "example": "ok"
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string"
          }
        }
      },
      "LoxoneCommandResponse": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "example": "ok"
          },
          "target": {
            "type": "string",
            "description": "Die Loxone ID aus dem Befehl",
            "example": "wz_decke"
          },
          "action": {
            "type": "string",
            "description": "Die ausgeführte Aktion",
            "enum": ["set", "scene", "mood"],
            "example": "set"
          },
          "hue_id": {
            "type": "string",
            "description": "Die aufgelöste HUE Ressourcen-ID",
            "example": "abc123-def456"
          },
          "hue_type": {
            "type": "string",
            "description": "Der Typ der HUE Ressource",
            "enum": ["light", "group", "scene"],
            "example": "light"
          }
        }
      },
      "LoxoneMoodError": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "example": "no mapping found for mood"
          },
          "target": {
            "type": "string",
            "description": "Die Loxone ID aus dem Befehl",
            "example": "wohnzimmer"
          },
          "mood_number": {
            "type": "string",
            "description": "Die angeforderte Stimmungsnummer",
            "example": "1"
          }
        }
      }
    }
  }
}`
