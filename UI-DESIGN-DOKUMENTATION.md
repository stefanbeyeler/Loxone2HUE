# UI-Design-Dokumentation — Loxone2HUE Gateway

> Referenzdokumentation der grafischen Umsetzung zur Wiederverwendung in anderen Projekten.

---

## Inhaltsverzeichnis

1. [Tech-Stack & Abhängigkeiten](#1-tech-stack--abhängigkeiten)
2. [Projektstruktur](#2-projektstruktur)
3. [Farbschema & Design-Tokens](#3-farbschema--design-tokens)
4. [Typografie](#4-typografie)
5. [Layout-System & Responsive Design](#5-layout-system--responsive-design)
6. [Komponenten-Bibliothek](#6-komponenten-bibliothek)
7. [Icons](#7-icons)
8. [Formulare & Eingabeelemente](#8-formulare--eingabeelemente)
9. [Feedback-Elemente](#9-feedback-elemente)
10. [Navigation](#10-navigation)
11. [Animationen & Transitions](#11-animationen--transitions)
12. [Custom CSS](#12-custom-css)
13. [State Management & Echtzeit-Kommunikation](#13-state-management--echtzeit-kommunikation)
14. [Build-Konfiguration](#14-build-konfiguration)
15. [Checkliste fuer neue Projekte](#15-checkliste-fuer-neue-projekte)

---

## 1. Tech-Stack & Abhängigkeiten

### Kern-Technologien

| Technologie      | Version  | Zweck                          |
| ---------------- | -------- | ------------------------------ |
| React            | 18.2     | UI-Framework (SPA)             |
| TypeScript       | 5.3      | Typsicherheit                  |
| Tailwind CSS     | 3.4      | Utility-First CSS-Framework    |
| Vite             | 5.0      | Build-Tool & Dev-Server (HMR)  |
| PostCSS          | 8.4      | CSS-Verarbeitung               |
| Autoprefixer     | 10.4     | Browser-Kompatibilitaet        |

### UI-Bibliotheken

| Bibliothek       | Version  | Zweck                          |
| ---------------- | -------- | ------------------------------ |
| lucide-react     | 0.303    | Icon-Bibliothek (30+ Icons)    |
| react-colorful   | 5.6      | Farbwahl-Widget (Color Picker) |

### Keine CDN-Abhängigkeiten

Alle Libraries werden via npm installiert und durch Vite gebündelt. Es gibt keine externen CDN-Links.

### package.json (Referenz)

```json
{
  "dependencies": {
    "lucide-react": "^0.303.0",
    "react": "^18.2.0",
    "react-colorful": "^5.6.1",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  }
}
```

---

## 2. Projektstruktur

```
web/
├── index.html                    # HTML Entry Point (SPA)
├── package.json                  # Abhängigkeiten
├── tailwind.config.js            # Tailwind-Erweiterungen
├── postcss.config.js             # PostCSS + Autoprefixer
├── vite.config.ts                # Vite Build-Konfiguration
├── tsconfig.json                 # TypeScript-Konfiguration
└── src/
    ├── main.tsx                  # React DOM Render Entry
    ├── App.tsx                   # Root-Komponente (Router-Logik)
    ├── index.css                 # Globales CSS + Tailwind Imports
    ├── components/               # React-Komponenten
    │   ├── Dashboard.tsx         # Haupt-Shell mit Tab-Navigation
    │   ├── BridgeSetup.tsx       # Initial-Setup / Pairing Flow
    │   ├── DeviceCard.tsx        # Einzelne Geraete-Karte
    │   ├── DeviceList.tsx        # Geraete-Liste (nach Raeumen)
    │   ├── GroupList.tsx          # Raum/Zone-Liste mit Szenen
    │   ├── SceneList.tsx         # Szenen-Verwaltung
    │   ├── SensorList.tsx        # Sensor-Dashboard
    │   ├── MappingConfig.tsx     # Mapping-Wizard & Editor
    │   ├── SettingsPanel.tsx     # Einstellungen, Logs, Backup
    │   ├── LoxoneGuide.tsx       # Integrations-Anleitung
    │   ├── ReleaseNotes.tsx      # Versionsverlauf (Modal)
    │   ├── Tooltip.tsx           # Wiederverwendbare Tooltip-Komponente
    │   └── UdpInfoSection.tsx    # UDP-Test & Dokumentation
    ├── hooks/
    │   ├── useHueDevices.ts      # State Management (Geraete, Gruppen, Szenen)
    │   └── useWebSocket.ts       # WebSocket-Echtzeit-Kommunikation
    ├── services/
    │   └── api.ts                # REST API Wrapper
    └── types/
        └── index.ts              # TypeScript Interfaces
```

### Architektur-Prinzipien

- **Single Page Application (SPA):** Ein einziger HTML-Entry-Point, React uebernimmt das Routing
- **Komponenten-basiert:** Jede UI-Einheit ist eine eigene React-Komponente
- **Custom Hooks:** Geschaeftslogik ist in Hooks ausgelagert (`useHueDevices`, `useWebSocket`)
- **API-Abstraktionsschicht:** Alle REST-Aufrufe laufen ueber `services/api.ts`
- **Dark Mode Only:** Kein Light-Mode, konsequent dunkles Design

---

## 3. Farbschema & Design-Tokens

### Design-Philosophie

Dark-Mode-Only mit einer markanten Brand-Farbe (Orange) als Akzent. Hoher Kontrast zwischen Text und Hintergrund fuer gute Lesbarkeit.

### Brand-Farben

| Name             | Hex-Wert    | Tailwind-Klasse      | Verwendung                    |
| ---------------- | ----------- | --------------------- | ----------------------------- |
| Brand Orange     | `#FF9500`   | `text-hue-orange`     | Primaerfarbe, aktive Elemente |
| Hover Orange     | `#FFB340`   | —                     | Hover-Zustand der Brand-Farbe |
| Brand Blue       | `#007AFF`   | `text-hue-blue`       | Sekundaerer Akzent            |

### Hintergrund-Farben

| Name             | Hex-Wert    | Tailwind-Klasse      | Verwendung                    |
| ---------------- | ----------- | --------------------- | ----------------------------- |
| Root Background  | `#1a1a2e`   | CSS `body`            | Seiten-Hintergrund            |
| Dark Panel       | `#111827`   | `bg-gray-900`         | Dunkle Panels, Hauptflaeche   |
| Card Background  | `#1f2937`   | `bg-gray-800`         | Karten, Modals, Header        |
| Input Background | `#374151`   | `bg-gray-700`         | Eingabefelder, Sek. Buttons   |
| Border           | `#4b5563`   | `border-gray-600`     | Raender, Trennlinien          |
| Disabled Text    | `#6b7280`   | `text-gray-500`       | Deaktivierter Text            |
| Secondary Text   | `#9ca3af`   | `text-gray-400`       | Sekundaerer Text, Labels      |
| Body Text        | `#d1d5db`   | `text-gray-300`       | Standard-Textfarbe            |
| Primary Text     | `#ffffff`   | `text-white`          | Hervorgehobener Text          |

### Status-Farben

| Status           | Hex-Wert    | Tailwind-Klasse      | Verwendung                    |
| ---------------- | ----------- | --------------------- | ----------------------------- |
| Success/Online   | `#22c55e`   | `text-green-400`      | Verbindung OK, Gespeichert    |
| Warning          | `#eab308`   | `text-yellow-400`     | Warnungen, Batterie niedrig   |
| Error/Offline    | `#ef4444`   | `text-red-400`        | Fehler, Verbindung getrennt   |
| Info/Link        | `#3b82f6`   | `text-blue-400`       | Info-Hinweise, Hover-Akzent   |

### Hintergrund mit Transparenz

```
bg-hue-orange/10    # Weiches Orange-Highlight
bg-red-900/30       # Error-Hintergrund
bg-blue-900/30      # Info-Hintergrund
bg-gray-700/50      # Halbtransparenter Sekundaer-Hintergrund
bg-gray-800/50      # Halbtransparenter Panel-Hintergrund
```

### Tailwind-Erweiterung (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hue: {
          orange: '#FF9500',
          blue: '#007AFF',
        }
      }
    },
  },
  plugins: [],
}
```

### CSS Root-Styling

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.87);
  background-color: #1a1a2e;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 4. Typografie

### Schriftart

**Primaer:** `Inter, system-ui, Avenir, Helvetica, Arial, sans-serif`

Inter wird als Webfont verwendet und bietet hervorragende Lesbarkeit auf Bildschirmen. Die Fallback-Kette stellt sicher, dass auf jedem System eine geeignete Schrift geladen wird.

### Groessen-Hierarchie

| Zweck                | Tailwind-Klassen             | Resultat         |
| -------------------- | ---------------------------- | ---------------- |
| Seiten-Titel         | `text-2xl font-bold`         | 24px, fett       |
| Sektions-Überschrift | `text-lg font-semibold`      | 18px, halbfett   |
| Karten-Titel         | `text-lg font-medium`        | 18px, medium     |
| Standard-Text        | `text-sm` / `text-base`      | 14px / 16px      |
| Klein-Text           | `text-xs`                    | 12px             |
| Mikro-Text           | `text-[10px]`                | 10px (custom)    |
| Monospace (IDs)      | `font-mono text-xs`          | 12px, Monospace  |
| Tab-Label            | `text-sm font-medium`        | 14px, medium     |

### Textgestaltung

```
leading-relaxed     # Zeilenhoehe 1.75 fuer laengere Texte
tracking-wider      # Erweiterter Zeichenabstand fuer Badges
uppercase           # Grossbuchstaben fuer Labels/Badges
truncate            # Textabschneidung mit Ellipsis
```

---

## 5. Layout-System & Responsive Design

### Mobile-First Ansatz

Das gesamte Layout ist Mobile-First aufgebaut. Basis-Styles gelten fuer kleine Bildschirme, groessere Breakpoints erweitern das Layout.

### Breakpoints

| Breakpoint | Min-Breite | Verwendung                           |
| ---------- | ---------- | ------------------------------------ |
| (default)  | 0px        | Mobile: 1 Spalte, Hamburger-Menue    |
| `sm:`      | 640px      | Smartphone quer: 2 Spalten, Nav-Info |
| `md:`      | 768px      | Tablet: 2-3 Spalten, Desktop-Nav     |
| `lg:`      | 1024px     | Desktop: 3 Spalten, volle Breite     |

### Grid-System

Das primaere Layout-System basiert auf CSS Grid mit Tailwind-Utilities.

**Standard-Grid fuer Karten:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Karten */}
</div>
```
- Mobile: 1 Spalte
- Tablet: 2 Spalten
- Desktop: 3 Spalten

**Formular-Grid:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {/* Input-Felder */}
</div>
```

**2-Spalten Sub-Grid:**
```jsx
<div className="grid grid-cols-2 gap-2">
  {/* Szenen, Optionen */}
</div>
```

### Flexbox-Patterns

```jsx
// Horizontale Zentrierung mit Abstand
<div className="flex items-center gap-3">

// Raum zwischen Elementen (Header-Pattern)
<div className="flex items-center justify-between">

// Vertikaler Stack
<div className="flex flex-col gap-4">

// Zentrierter Inhalt (Loading, Empty State)
<div className="flex items-center justify-center min-h-[60vh]">
```

### Container & Max-Width

```jsx
// Hauptinhalt (breit)
<div className="max-w-6xl mx-auto px-4">

// Dokumentation (schmal)
<div className="max-w-4xl mx-auto">
```

### Responsive Sichtbarkeit

```jsx
// Nur Desktop (>= 640px)
<div className="hidden sm:flex">

// Nur Mobile (< 640px)
<div className="sm:hidden">

// Nur Tablet+ (>= 768px)
<div className="hidden md:flex">
```

---

## 6. Komponenten-Bibliothek

### 6.1 Buttons

**Primary Button (Orange):**
```jsx
<button className="bg-hue-orange text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-[#FFB340] transition-colors">
  Speichern
</button>
```

**Secondary Button (Grau):**
```jsx
<button className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
  Abbrechen
</button>
```

**Ghost/Text Button:**
```jsx
<button className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-700/50 transition-colors">
  Details
</button>
```

**Icon Button:**
```jsx
<button className="p-2 text-gray-400 hover:text-hue-orange hover:bg-gray-700/50 rounded-lg transition-colors">
  <RefreshCw size={18} />
</button>
```

**Danger Button (Rot):**
```jsx
<button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500">
  Loeschen
</button>
```

**Disabled State:**
```jsx
<button className="... disabled:opacity-50 disabled:cursor-not-allowed" disabled>
```

### 6.2 Karten (Cards)

**Standard-Karte:**
```jsx
<div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-medium text-white">{title}</h3>
    <span className="text-gray-400"><Icon size={18} /></span>
  </div>
  <div className="text-gray-300 text-sm">
    {/* Inhalt */}
  </div>
</div>
```

**Karte mit Status-Ring:**
```jsx
<div className={`bg-gray-800 rounded-xl p-4 border ${
  isActive ? 'border-hue-orange ring-1 ring-hue-orange/30' : 'border-gray-700'
}`}>
```

**Expandierbare Karte:**
```jsx
<div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
  <button
    onClick={() => setExpanded(!expanded)}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30"
  >
    <span className="font-medium text-white">{title}</span>
    <ChevronDown className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} size={18} />
  </button>
  {expanded && (
    <div className="p-4 pt-0 border-t border-gray-700">
      {/* Expandierter Inhalt */}
    </div>
  )}
</div>
```

### 6.3 Badges

**Count Badge:**
```jsx
<span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
  {count}
</span>
```

**Status Badge:**
```jsx
// Online
<span className="flex items-center gap-1.5 text-xs text-green-400">
  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
  Verbunden
</span>

// Offline
<span className="flex items-center gap-1.5 text-xs text-red-400">
  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
  Getrennt
</span>
```

### 6.4 Tabellen

**Standard-Tabelle:**
```jsx
<table className="w-full text-sm">
  <thead>
    <tr className="text-gray-400 text-left border-b border-gray-700">
      <th className="pb-2 font-medium">Spalte 1</th>
      <th className="pb-2 font-medium">Spalte 2</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
        <td className="py-2 text-gray-300">{item.name}</td>
        <td className="py-2 text-gray-400 font-mono text-xs">{item.id}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 6.5 Modals/Dialoge

**Overlay Modal:**
```jsx
<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <button onClick={onClose} className="text-gray-400 hover:text-white">
        <X size={20} />
      </button>
    </div>
    {/* Body */}
    <div className="text-gray-300 text-sm">
      {children}
    </div>
  </div>
</div>
```

### 6.6 Tooltip

**Wiederverwendbare Tooltip-Komponente:**
```jsx
interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div className={`
        absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded
        whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100
        transition-opacity duration-150 pointer-events-none
        ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
        ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
        ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
        ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
      `}>
        {text}
        {/* Pfeil-Element je nach Position */}
      </div>
    </div>
  );
}
```

### 6.7 Info-Box

```jsx
<div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
  <p className="font-medium text-gray-300 mb-2">Hinweis</p>
  <p>Erklaerungstext hier...</p>
</div>
```

---

## 7. Icons

### Bibliothek: lucide-react

**Installation:** `npm install lucide-react`

Lucide ist ein Fork von Feather Icons mit erweitertem Icon-Set. Alle Icons sind SVG-basiert, konsistent gestaltet und unterstuetzen Tailwind-Klassen.

### Verwendete Icons (Referenz)

```typescript
import {
  // Navigation & UI
  Menu, X, ChevronDown, ChevronUp, Layers,

  // Geraete & Aktoren
  Lightbulb, Home, Palette, Radio, Play, Wifi, WifiOff,

  // Einstellungen
  Settings, Code2, BookOpen, Link2,

  // Sensoren
  Activity, Thermometer, Sun, MousePointerClick,
  DoorOpen, RotateCw, Battery, BatteryLow, BatteryWarning,

  // Steuerung
  Power, RefreshCw, Router, Timer,

  // Feedback / Status
  CheckCircle, AlertCircle, XCircle, CheckCircle2, AlertTriangle,

  // Aktionen
  Plus, Trash2, Edit2, Save, Copy, Download, Upload,
  RotateCcw, Archive, Clock, Search, Send, ScrollText,

  // Struktur
  Terminal, Code, Wrench, Sparkles, Rocket, ExternalLink, Tag
} from 'lucide-react';
```

### Icon-Groessen

| Kontext         | `size`-Prop | Verwendung                        |
| --------------- | ----------- | --------------------------------- |
| Header-Icons    | `24`        | Logo, grosse Aktions-Icons        |
| Tab/Button      | `18` - `20` | Navigation, Standard-Buttons      |
| Inline/Small    | `14` - `16` | Status-Indikatoren, Karten-Detail |
| Badge/Mikro     | `12`        | Badges, kompakte Anzeigen         |

### Icon-Faerbung

```jsx
<Icon className="text-hue-orange" />   // Brand-Farbe
<Icon className="text-gray-400" />     // Inaktiv/Sekundaer
<Icon className="text-green-400" />    // Erfolg/Online
<Icon className="text-red-400" />      // Fehler/Offline
<Icon className="text-yellow-400" />   // Warnung
<Icon className="text-blue-400" />     // Info
```

---

## 8. Formulare & Eingabeelemente

### 8.1 Text-Input

```jsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Platzhalter..."
  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2
             border border-gray-600 focus:border-hue-orange focus:outline-none
             placeholder-gray-500 text-sm"
/>
```

### 8.2 Such-Input mit Icon

```jsx
<div className="relative">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  <input
    type="text"
    placeholder="Suche (z.B. 'EventStream')..."
    className="w-full bg-gray-700 text-white rounded-lg pl-9 pr-3 py-2
               border border-gray-600 focus:border-hue-orange focus:outline-none
               placeholder-gray-500 text-sm"
  />
</div>
```

### 8.3 Select/Dropdown

```jsx
<select
  value={selected}
  onChange={(e) => setSelected(e.target.value)}
  className="bg-gray-700 text-white rounded-lg px-3 py-2
             border border-gray-600 focus:border-hue-orange focus:outline-none text-sm"
>
  <option value="">Bitte waehlen...</option>
  {options.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

### 8.4 Toggle/Switch

Komplett mit Tailwind umgesetzt — kein zusaetzliches CSS noetig.

```jsx
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={enabled}
    onChange={(e) => setEnabled(e.target.checked)}
    className="sr-only peer"
  />
  <div className="w-10 h-6 bg-gray-600 rounded-full
                  peer-checked:bg-hue-orange transition-colors"></div>
  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full
                  transition-transform peer-checked:translate-x-4"></div>
</label>
```

**Erklaerung:**
- `sr-only`: Checkbox visuell versteckt, aber fuer Screen-Reader sichtbar
- `peer` / `peer-checked:`: Tailwind-Peer-Utilities steuern den visuellen Zustand
- Der Knopf (weisser Kreis) verschiebt sich um 16px (`translate-x-4`) bei aktivem Zustand

### 8.5 Range-Slider (Brightness)

```jsx
<input
  type="range"
  min="0"
  max="100"
  value={brightness}
  onChange={(e) => setBrightness(Number(e.target.value))}
  className="w-full"
/>
```

**Custom CSS (index.css):**
```css
/* Range Slider Track */
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #374151;     /* gray-700 */
  outline: none;
}

/* Range Slider Thumb (Webkit) */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FF9500;     /* hue-orange */
  cursor: pointer;
  border: 2px solid #1f2937;  /* gray-800 */
  transition: background 0.15s;
}

input[type='range']::-webkit-slider-thumb:hover {
  background: #FFB340;     /* Lighter Orange */
}

/* Range Slider Thumb (Firefox) */
input[type='range']::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FF9500;
  cursor: pointer;
  border: 2px solid #1f2937;
  transition: background 0.15s;
}

input[type='range']::-moz-range-thumb:hover {
  background: #FFB340;
}

input[type='range']::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: #374151;
}
```

### 8.6 Color Picker (react-colorful)

```jsx
import { HexColorPicker } from 'react-colorful';

<HexColorPicker color={color} onChange={setColor} />
```

**Custom CSS (index.css):**
```css
.react-colorful {
  width: 100% !important;
  height: 150px !important;
}

.react-colorful__saturation {
  border-radius: 8px 8px 0 0 !important;
}

.react-colorful__hue {
  border-radius: 0 0 8px 8px !important;
  height: 20px !important;
}

.react-colorful__saturation-pointer,
.react-colorful__hue-pointer {
  width: 20px !important;
  height: 20px !important;
}
```

---

## 9. Feedback-Elemente

### 9.1 Success-Meldung

```jsx
<div className="flex items-center gap-2 text-green-400 text-sm">
  <CheckCircle size={16} />
  <span>Erfolgreich gespeichert</span>
</div>
```

### 9.2 Error-Banner

```jsx
<div className="bg-red-900/30 border border-red-500 rounded-lg p-4 flex items-start gap-3">
  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
  <div>
    <p className="text-red-400 text-sm font-medium">Verbindungsfehler</p>
    <p className="text-red-400/70 text-xs mt-1">{errorDetails}</p>
  </div>
</div>
```

### 9.3 Info-Hinweis

```jsx
<div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
  <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
  <p className="text-blue-300 text-sm">Hinweistext hier...</p>
</div>
```

### 9.4 Loading Spinner

**Ganzseitiger Loader:**
```jsx
<div className="flex items-center justify-center min-h-[60vh]">
  <div className="text-center">
    <RefreshCw className="animate-spin text-hue-orange mx-auto mb-4" size={48} />
    <p className="text-gray-400">Lade Daten...</p>
  </div>
</div>
```

**Inline Spinner (langsam, fuer Auto-Refresh):**
```jsx
<RefreshCw
  className="animate-spin text-hue-orange"
  size={18}
  style={{ animationDuration: '3s' }}
/>
```

### 9.5 Loesch-Bestätigung (Inline Confirm)

```jsx
{deleteConfirm === item.id ? (
  <div className="flex items-center gap-1.5">
    <span className="text-red-400 text-xs">Wirklich loeschen?</span>
    <button
      onClick={() => handleDelete(item.id)}
      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500"
    >
      Ja
    </button>
    <button
      onClick={() => setDeleteConfirm(null)}
      className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
    >
      Nein
    </button>
  </div>
) : (
  <button
    onClick={() => setDeleteConfirm(item.id)}
    className="text-gray-500 hover:text-red-400"
  >
    <Trash2 size={16} />
  </button>
)}
```

### 9.6 Test-Status-Indikatoren

```jsx
// Senden...
<Loader2 className="animate-spin text-gray-400" size={14} />

// Erfolgreich gesendet
<Check className="text-green-400" size={14} />

// Fehler
<AlertCircle className="text-red-400" size={14} />
```

### 9.7 Leerer Zustand (Empty State)

```jsx
<div className="text-center py-12 text-gray-500">
  <Lightbulb className="mx-auto mb-3 opacity-30" size={48} />
  <p className="text-lg font-medium">Keine Geraete gefunden</p>
  <p className="text-sm mt-1">Pruefen Sie die Verbindung zur Bridge.</p>
</div>
```

---

## 10. Navigation

### 10.1 Desktop Tab-Navigation

```jsx
<nav className="hidden sm:flex gap-1 mt-4 flex-wrap">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === tab.id
          ? 'bg-hue-orange text-gray-900'
          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      <tab.icon size={18} />
      <span>{tab.label}</span>
      {tab.count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          activeTab === tab.id ? 'bg-gray-900/20' : 'bg-gray-700'
        }`}>
          {tab.count}
        </span>
      )}
    </button>
  ))}
</nav>
```

### 10.2 Mobile Hamburger-Menue

```jsx
{/* Hamburger Button */}
<button
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  className="sm:hidden p-2 text-gray-400 hover:text-white"
>
  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
</button>

{/* Mobile Menu Dropdown */}
{mobileMenuOpen && (
  <nav className="sm:hidden flex flex-col gap-1 mt-4 pb-2 border-t border-gray-700 pt-4">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => {
          setActiveTab(tab.id);
          setMobileMenuOpen(false);
        }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left ${
          activeTab === tab.id
            ? 'bg-hue-orange text-gray-900'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <tab.icon size={18} />
        {tab.label}
      </button>
    ))}
  </nav>
)}
```

### 10.3 Tab-Definition (Datenstruktur)

```typescript
const tabs = [
  { id: 'guide',    label: 'Guide',         icon: BookOpen },
  { id: 'mappings', label: 'Mappings',       icon: Link2,     count: mappings.length },
  { id: 'lights',   label: 'Aktoren',        icon: Lightbulb, count: lights.length },
  { id: 'sensors',  label: 'Sensoren',       icon: Activity,  count: sensors.length },
  { id: 'rooms',    label: 'Raeume',         icon: Home,      count: rooms.length },
  { id: 'zones',    label: 'Zonen',          icon: Layers,    count: zones.length },
  { id: 'scenes',   label: 'Szenen',         icon: Palette,   count: scenes.length },
  { id: 'settings', label: 'Einstellungen',  icon: Settings },
  { id: 'api',      label: 'API',            icon: Code2 },
];
```

### 10.4 Header-Layout

```jsx
<header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
  <div className="max-w-6xl mx-auto">
    <div className="flex items-center justify-between">
      {/* Links: Logo + Titel */}
      <div className="flex items-center gap-3">
        <Lightbulb className="text-hue-orange" size={24} />
        <h1 className="text-xl font-bold text-white">Loxone2HUE</h1>
      </div>

      {/* Rechts: Status + Controls */}
      <div className="flex items-center gap-4">
        {/* Bridge IP — nur Desktop */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
          <Router size={14} />
          <span>{bridgeIp}</span>
        </div>

        {/* Verbindungsstatus */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
            {isConnected ? 'Verbunden' : 'Getrennt'}
          </span>
        </div>

        {/* Refresh Button */}
        <button onClick={refresh} className="p-2 text-gray-400 hover:text-hue-orange">
          <RefreshCw size={18} />
        </button>

        {/* Mobile Menu Toggle */}
        <button onClick={toggleMenu} className="sm:hidden p-2 text-gray-400">
          <Menu size={24} />
        </button>
      </div>
    </div>

    {/* Tab Navigation (Desktop) */}
    <nav className="hidden sm:flex gap-1 mt-4 flex-wrap">
      {/* ... Tabs ... */}
    </nav>
  </div>
</header>
```

---

## 11. Animationen & Transitions

### Tailwind-Utilities

| Klasse                      | Effekt                              |
| --------------------------- | ----------------------------------- |
| `transition-colors`         | Sanfter Farbwechsel                 |
| `transition-all`            | Alle Eigenschaften animiert         |
| `transition-transform`      | Nur Transform animiert              |
| `transition-opacity`        | Nur Opacity animiert                |
| `duration-150`              | 150ms Animationsdauer               |
| `duration-200`              | 200ms Animationsdauer               |
| `animate-spin`              | Endlose Rotation (Spinner)          |
| `animate-pulse`             | Pulsieren (Aufmerksamkeit)          |

### Typische Hover-Transitions

```jsx
// Button Hover
className="hover:bg-gray-700 transition-colors"

// Text-Farbe Hover
className="text-gray-400 hover:text-white transition-colors"

// Komplexer Hover (Farbe + Hintergrund)
className="text-gray-400 hover:text-hue-orange hover:bg-gray-700/50 transition-colors"

// Skalierung bei Hover (selten verwendet)
className="hover:scale-105 transition-transform"
```

### Rotate-Animation (Chevron)

```jsx
<ChevronDown
  className={`transform transition-transform duration-200 ${
    expanded ? 'rotate-180' : ''
  }`}
  size={18}
/>
```

### Spinner mit custom Dauer

```jsx
// Standard (1 Sekunde Rotation)
<RefreshCw className="animate-spin" size={18} />

// Langsamer Spinner (3 Sekunden, fuer Auto-Refresh Indikator)
<RefreshCw
  className="animate-spin"
  size={18}
  style={{ animationDuration: '3s' }}
/>
```

### Tooltip Ein-/Ausblenden

```jsx
className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none"
```

---

## 12. Custom CSS

Die Datei `index.css` enthaelt minimales Custom CSS. Fast alles wird ueber Tailwind-Utilities geloest.

### Vollstaendige index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.87);
  background-color: #1a1a2e;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* --- Range Slider --- */
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #374151;
  outline: none;
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FF9500;
  cursor: pointer;
  border: 2px solid #1f2937;
  transition: background 0.15s;
}
input[type='range']::-webkit-slider-thumb:hover {
  background: #FFB340;
}
input[type='range']::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FF9500;
  cursor: pointer;
  border: 2px solid #1f2937;
  transition: background 0.15s;
}
input[type='range']::-moz-range-thumb:hover {
  background: #FFB340;
}
input[type='range']::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: #374151;
}

/* --- Color Picker (react-colorful) --- */
.react-colorful {
  width: 100% !important;
  height: 150px !important;
}
.react-colorful__saturation {
  border-radius: 8px 8px 0 0 !important;
}
.react-colorful__hue {
  border-radius: 0 0 8px 8px !important;
  height: 20px !important;
}
.react-colorful__saturation-pointer,
.react-colorful__hue-pointer {
  width: 20px !important;
  height: 20px !important;
}
```

---

## 13. State Management & Echtzeit-Kommunikation

### Custom Hook: useHueDevices

Zentraler State-Hook fuer alle HUE-Geraetedaten.

```typescript
interface UseHueDevicesReturn {
  lights: Light[];
  groups: Group[];
  scenes: Scene[];
  sensors: Sensor[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  setLightState: (id: string, state: Partial<LightState>) => Promise<void>;
  setGroupState: (id: string, state: Partial<GroupState>) => Promise<void>;
  activateScene: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Patterns:**
- **Optimistic Updates:** UI-State wird sofort aktualisiert, API-Call folgt asynchron
- **Promise.all:** Paralleles Laden aller Datentypen
- **Auto-Refresh nach Aktionen:** `setTimeout(() => refresh(), 1000)` nach State-Changes

### Custom Hook: useWebSocket

WebSocket-Verbindung fuer Live-Updates.

```typescript
interface UseWebSocketReturn {
  isConnected: boolean;
  sendCommand: (command: object) => void;
}
```

**Features:**
- Automatisches Reconnect alle 5 Sekunden bei Verbindungsverlust
- Protokoll-Erkennung (`ws://` vs `wss://` basierend auf `window.location.protocol`)
- JSON Message Parsing mit Error Handling
- Cleanup bei Component Unmount

### API-Abstraktionsschicht

```typescript
// services/api.ts
const API_BASE = '/api';

export const api = {
  getLights: () => fetch(`${API_BASE}/lights`).then(r => r.json()),
  getGroups: () => fetch(`${API_BASE}/groups`).then(r => r.json()),
  getScenes: () => fetch(`${API_BASE}/scenes`).then(r => r.json()),
  getSensors: () => fetch(`${API_BASE}/sensors`).then(r => r.json()),
  setLightState: (id: string, state: object) =>
    fetch(`${API_BASE}/lights/${id}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }),
  // ... weitere Endpoints
};
```

---

## 14. Build-Konfiguration

### Vite (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
```

### PostCSS (postcss.config.js)

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

---

## 15. Checkliste fuer neue Projekte

### Projekt-Setup

- [ ] Vite + React + TypeScript initialisieren
- [ ] Tailwind CSS 3.4+ installieren und konfigurieren
- [ ] PostCSS + Autoprefixer einrichten
- [ ] `lucide-react` fuer Icons installieren
- [ ] Brand-Farben in `tailwind.config.js` definieren
- [ ] `index.css` mit Root-Styles und Custom CSS anlegen

### Design-System uebernehmen

- [ ] Dark-Mode Farbschema (Gray 900-300) anwenden
- [ ] Brand-Farbe als Tailwind-Extension definieren
- [ ] Inter als primaere Schriftart einbinden
- [ ] Range-Slider CSS uebernehmen (falls benoetigt)
- [ ] Toggle/Switch Pattern implementieren

### Komponenten implementieren

- [ ] Header mit Logo, Status, Controls
- [ ] Tab-Navigation (Desktop + Mobile Hamburger)
- [ ] Card-Komponente mit Varianten (Standard, Active, Expandable)
- [ ] Button-Varianten (Primary, Secondary, Ghost, Icon, Danger)
- [ ] Formular-Elemente (Input, Select, Toggle, Range)
- [ ] Feedback (Success, Error, Info, Loading)
- [ ] Tooltip-Komponente
- [ ] Modal/Dialog
- [ ] Empty State
- [ ] Inline Confirm (Loesch-Bestaetigungen)

### Responsive Design

- [ ] Mobile-First Grid (1 → 2 → 3 Spalten)
- [ ] Hamburger-Menue fuer Mobile
- [ ] Responsive Sichtbarkeit (`hidden sm:flex` / `sm:hidden`)
- [ ] Touch-freundliche Button-Groessen (min. 44px)
- [ ] Max-Width Container (`max-w-6xl mx-auto`)

### Qualitaet

- [ ] Konsistente Spacing-Skala (gap-1 bis gap-4)
- [ ] Focus-States fuer alle interaktiven Elemente
- [ ] Disabled-States (`disabled:opacity-50 disabled:cursor-not-allowed`)
- [ ] Screen-Reader Unterstuetzung (`sr-only` fuer versteckte Labels)
- [ ] Transitions auf interaktiven Elementen (`transition-colors`)
