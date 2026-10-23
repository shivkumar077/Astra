# ASTRA — Visual Direction & Design System

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Phase 1)  
**Author:** Technical Architecture & Design Lead  
**Repository:** Astra

---

## 1. Visual Research & Design Thesis

### 1.1 Research Findings & Reference Systems
To avoid creating another generic AI-generated dark-mode dashboard with blurry gradients and rounded cards, we conducted research across genuine operational aerospace systems, scientific instrumentation, and high-performance engineering tools:

1. **NASA Open MCT (Open Mission Control Technologies):**
   - *Key Insights:* Open MCT emphasizes composability, dense multi-series telemetry, and deep-gray backgrounds (charcoal `#101214` to `#16191D`) rather than pitch black `#000000`, which causes optical blooming and trailing on OLED/IPS displays.
   - *Application to ASTRA:* High information density, unified "Time Conductor" controls, and strict functional semantic coloring.
2. **SpaceX Dragon & Crew Telemetry Displays:**
   - *Key Insights:* Utilitarian minimalism, flat high-contrast vector lines, monospaced tabular numerals, and extreme spatial economy. Colors are used only to signal state changes, never for background decoration.
   - *Application to ASTRA:* Crisp 1px borders, subtle chamfered corners, clear status badges, and strict typographic hierarchy.
3. **Apollo Ground Data Systems & Laboratory Oscilloscopes:**
   - *Key Insights:* Tactile precision, grid divisions with explicit physical units, and unambiguous annunciator tiles (lit green/amber/red indicator lights).
   - *Application to ASTRA:* Physical unit indicators on every metric (e.g., `W`, `V`, `dBm`, `rpm`, `K`), vector line graphics, and dedicated hardware annunciator status grids.

### 1.2 Design Thesis: "Instrument-Grade Depth"
> **Design Thesis:** *Aerospace Precision meets Sci-Fi Tactility.*  
> ASTRA must feel like an authentic, high-consequence workstation stationed in a subterranean satellite operations center. It provides uncompromising clarity, razor-sharp vector definition, and calm, functional confidence. Every pixel, line, and micro-animation exists to convey operational state.

---

## 2. Palette Architecture & Color System

The color palette is strictly partitioned into **Structural Void Tones**, **Primary Instrument Accents**, and **Semantic Telemetry Alarms**.

### 2.1 Structural & Surface Palette
Surfaces are built from carefully stepped deep carbon and graphite tones, avoiding pure black `#000000` to eliminate visual smearing during camera panning.

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| `void-black` | `#08090C` | Deepest backdrop, canvas viewport background |
| `surface-ground` | `#0D1117` | Base application background, layout container |
| `surface-panel` | `#161B22` | Instrument panel background, card surfaces |
| `surface-raised` | `#1F242C` | Modals, elevated inspector sheets, tooltips |
| `border-subtle` | `#2D333B` | Default 1px panel boundaries, grid dividing rules |
| `border-active` | `#444C56` | Focused panels, active tab boundaries |
| `border-accent` | `#00E5FF` | Active selection, targeted spacecraft indicator |

### 2.2 Functional Accent Palette
Colors used to indicate telemetry vectors, active communication links, and celestial trajectories.

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| `vector-cyan` | `#00E5FF` | Primary active vector, trajectory lines, active craft highlight |
| `orbit-blue` | `#0A84FF` | Secondary orbital projections, predicted Keplerian path |
| `deep-space-indigo` | `#5856D6` | Inactive craft orbits, deep-space distance markers |
| `solar-gold` | `#FFD600` | Sun direction vector, solar array generation indicators |

### 2.3 Semantic Telemetry & Alarm Indicators
These colors are reserved strictly for operational status. **They must never be used as decorative styling.**

| Status Token | Hex Code | Semantics & Trigger Condition |
| :--- | :--- | :--- |
| `status-nominal` | `#00E676` | Nominal telemetry, verified subsystem health, locked link |
| `status-advisory` | `#FFB300` | Warning, parameter drifting toward yellow limit, thermal advisory |
| `status-critical` | `#FF3D00` | Subsystem failure, hard red limit breach, loss of attitude control |
| `status-override` | `#D500F9` | Manual override engaged, non-standard test mode |
| `status-offline` | `#6E7681` | Loss of signal (LOS), dormant craft, unpowered payload |

### 2.4 Text & Monospace Contrast Hierarchy

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| `text-primary` | `#F0F6FC` | Crisp off-white for primary data readings and titles |
| `text-secondary` | `#8B949E` | Muted slate for labels, descriptions, and axis markings |
| `text-tertiary` | `#484F58` | Ghost text, inactive unit notations, grid coordinates |
| `text-accent` | `#00E5FF` | Highlighted values, selected indices |

---

## 3. Typography System & Numerical Ergonomics

Because aerospace operations rely heavily on numerical data, typography must prevent layout jitter and ensure effortless scannability.

```
+-----------------------------------------------------------------------------------+
| TYPOGRAPHY HIERARCHY                                                              |
|                                                                                   |
| 1. HEADERS & SECTION TITLES                                                        |
|    Font: "Space Grotesk" / "Orbitron"                                             |
|    Weight: 600 / 700, Uppercase, Letter Spacing: +0.08em                         |
|    Example: [ MISSION CONTROL // SECTOR 04 - LEO ]                                |
|                                                                                   |
| 2. TELEMETRY NUMERALS & TIME READOUTS                                             |
|    Font: "JetBrains Mono" / "Share Tech Mono" (Monospaced, Tabular Figures)       |
|    Weight: 400 / 500, font-variant-numeric: tabular-nums                          |
|    Example: ALT: 682.41 km | VEL: 7.512 km/s | BAT: 94.2 %                        |
|                                                                                   |
| 3. SYSTEM LABELS & UI BODY                                                        |
|    Font: "Inter" / "IBM Plex Sans"                                                |
|    Weight: 400 / 500, Compact, High x-height                                      |
|    Example: Reaction Wheel 02 bearing torque within tolerance                     |
+-----------------------------------------------------------------------------------+
```

### 3.1 Typographic Principles
1. **Tabular Numerals (`tabular-nums`):** All telemetry readouts, timestamps, and coordinates must use monospaced numerals with identical character widths. When velocity shifts from `7.999` to `8.000`, the text container must not shift width or trigger a layout reflow.
2. **Explicit Physical Units:** Numbers never stand alone. Every reading is suffixed with its standardized physical unit in muted text: `284.15 K`, `28.2 V`, `14.8 dBm`.
3. **Uppercase Operational Labels:** Subsystem names and status codes use clean uppercase lettering with subtle positive letter spacing (`letter-spacing: 0.05em`) to evoke physical control room equipment.

---

## 4. Spacing, Layout Geometry & Depth

### 4.1 Spatial Rhythm
- **Base Grid:** Strict 4px baseline rhythm.
- **Micro-Spacing:** 4px, 8px, 12px, 16px, 24px, 32px.
- **Panel Padding:** Uniform 12px internal padding for compact instrument tiles; 16px for large viewports.

### 4.2 Panel Geometry & Border Architecture
- **Border Radius:** Maximum 2px to 4px. No bubbly, heavily rounded 16px/24px cards. Crisp, near-rectilinear edges evoke rack-mounted avionics and optical benches.
- **Chamfered Accents:** Strategic panels (such as the primary Time Conductor or Command Terminal) feature subtle 45-degree chamfered corners (using CSS `clip-path: polygon(...)`) to deliver deliberate aerospace hardware tactility.
- **Borders:** 1px solid `border-subtle` (`#2D333B`). Focused or hovered panels highlight with `border-active` (`#444C56`) or `vector-cyan` (`#00E5FF`).
- **Surface Elevation:** Depth is achieved through flat tonal stepping (`#08090C` $\rightarrow$ `#0D1117` $\rightarrow$ `#161B22` $\rightarrow$ `#1F242C`) and subtle inner borders, **never through diffuse fuzzy drop shadows**.

---

## 5. Data Visualization Conventions

### 5.1 Telemetry Strip Charts & Sparklines
- **Style:** Continuous 1px vector lines with no point markers unless inspecting a single anomaly timestamp.
- **History Horizon:** Default 60-second sliding time window.
- **Reference Bands:** Subtle shaded horizontal bands representing nominal operational corridors (e.g., green corridor between 18°C and 25°C). Out-of-bounds excursions turn the curve amber or red instantly.
- **Grid Lines:** Faint dashed grid lines (`#2D333B`, 1px dasharray `2 4`) with legible min/max axis labels.

### 5.2 3D Attitude Indicator (Navball / Gimbal)
- Three-axis visualizer showing craft orientation relative to the orbit plane (Roll, Pitch, Yaw).
- Includes pitch ladder, heading indicator, and prograde/retrograde velocity vectors.

### 5.3 Hardware Annunciator Grid
- Six-tile matrix representing the primary subsystems: `[ EPS | TCS | ADCS | COMMS | PROP | OBC ]`.
- Each tile features a miniature LED-style indicator light, current status text (`NOMINAL`, `DEGRADED`, `ANOMALOUS`), and one key metric.

---

## 6. Functional Motion & Performance Constraints

### 6.1 Motion Philosophy
> **Rule:** If an animation does not communicate a state transition, physical velocity, or spatial orientation, it does not belong in ASTRA.

- **Zero Bouncy Springs:** No springy, playful physics. Transitions are crisp, mechanical, and damped (`cubic-bezier(0.16, 1, 0.3, 1)` or linear for physical motion).
- **Telemetry Flash:** When a value updates rapidly, a subtle 100ms background highlight blinks once to register the update, then settles.
- **Camera Interpolation:** Three.js camera slews between target spacecraft and celestial bodies use smooth cinematic s-curves lasting 1.2 to 1.8 seconds.
- **Telemetry Update Budget:** Numerical values update smoothly at 5 Hz without re-rendering unnecessary DOM trees (use direct ref updates or granular Zustand selectors).

---

## 7. State Expressions & Edge States

| Interface State | Visual Presentation & Behavior |
| :--- | :--- |
| **Nominal Operation** | Dark slate panels, crisp cyan vector lines, nominal green indicators, steady 5 Hz telemetry stream. |
| **Loss of Signal (LOS)** | Translucent hatch pattern overlay across telemetry charts; status indicator reads `LOS // ACQUIRING SIGNAL...` in muted amber; last known vector displayed in dashed outline. |
| **Subsystem Anomaly** | Immediate audible low-frequency alarm pulse (optional/toggleable); affected subsystem panel highlights with 1px solid red border; flashing status badge; anomaly diagnosis drawer auto-suggested. |
| **Simulation Paused** | Amber persistent banner across the top Time Conductor: `SIMULATION PAUSED // UTC FREEZE`; 3D particle motion freezes; historical scrubbing active. |
| **NASA API Rate Throttled** | Space Imagery view gracefully informs operator: `EXTERNAL GATEWAY RATE CONSTRAINED // SWITCHING TO LOCAL CACHE`; cached imagery continues to display seamlessly. |
| **Empty / Zero State** | Precision vector crosshairs centered in panel with technical prompt text: `NO ACTIVE TARGET SELECTED // INITIATE TRACKING VIA FLEET ROSTER`. |

---

## 8. Anti-Patterns to Strictly Avoid

1. ❌ **Generic SaaS Purples & Rainbow Gradients:** No bright pink-to-purple CSS gradients or shiny candy buttons.
2. ❌ **Aggressive Glassmorphism:** No large, frosted-glass panels (`backdrop-filter: blur(20px)`) that make underlying orbital trajectories unreadable.
3. ❌ **Excessive Border Radii:** No 16px/24px rounded corners that make the platform look like a social media app.
4. ❌ **Meaningless Vanity Charts:** No donut charts or wavy spline graphs without physical units, zero-baselines, or axis labels.
5. ❌ **Fake Real-World Tracking:** Never claim simulated spacecraft are tracking real-world satellites in real time.
6. ❌ **Decorative Flashing Lights:** No continuous flashing or pulsing animations that induce operator fatigue.
