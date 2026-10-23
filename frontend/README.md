# ASTRA Frontend Client

**Stack:** React 18 | TypeScript | Vite 6 | Three.js | Vitest | Testing Library  
**Art Direction:** Cinematic Editorial Futurism &times; Authentic Orbital Engineering &times; Restrained Luxury

The ASTRA frontend client delivers a space-operations console and astronomical discovery portal. It couples mathematical telemetry with a real-time rendered Three.js interactive Earth, editorial typography, a bespoke celestial icon family, and a cinematic opening sequence.

---

## 1. Quickstart & Development

### Prerequisites
- **Node.js:** v20+ (tested with v24.19.0)
- **npm:** v10+ (tested with 11.17.0)

### Setup & Execution Commands
```bash
# Navigate to frontend workspace
cd frontend

# Install dependencies
npm install

# Start local development server (Vite on http://localhost:5173)
npm run dev

# Run automated unit and integration tests (Vitest)
npm test

# Run TypeScript type-checking
npm run lint

# Compile production bundle
npm run build

# Preview compiled production build locally
npm run preview
```

---

## 2. Visual Identity & Creative Direction (Prompt 3 Overhaul)

Prompt 3 established a comprehensive visual identity overhaul, moving away from generic SaaS dashboards and neon sci-fi cliches toward a restrained, cinematic editorial design system:

### 2.1 Typographic Triad (100% Self-Hosted via `@fontsource`)
- **Display & Headlines (`var(--font-serif)`):** `Cormorant Garamond` (Weights: 400, 400i, 600, 700). High-contrast editorial serif delivering monumental scale and elegance to the ASTRA wordmark, opening narrative, and destination headers.
- **Body (`var(--font-sans)`):** `Inter` (Weights: 300, 400, 500, 600). Neutral, highly legible sans-serif for descriptions, paragraphs, and briefing modals.
- **Technical Telemetry (`var(--font-mono)`):** `IBM Plex Mono` (Weights: 400, 500, 600). Reserved strictly for genuine operational readouts, coordinate systems, and UTC timestamps.

### 2.2 Bespoke Celestial Icon Family (`CelestialIcons.tsx`)
Fine-line SVG symbols crafted in the tradition of classical astronomical atlases:
- `SignatureStar`: Four-point radiant diamond star acting as the core visual anchor of the ASTRA identity.
- `TerrestrialPlanet`, `RingedPlanet`, `GasGiant`, `MoonCrater`: Planetary bodies with accurate contouring.
- `Spacecraft`, `OrbitalTrajectory`, `OpticalAperture`: Technical symbols for telemetry and observation modes.

### 2.3 Color Palette & Surfaces
- Cosmic tones: Void (`#050608`), Abyss (`#080A0E`), Ground (`#0D1016`), Translucent Panel (`rgba(13, 16, 22, 0.72)`).
- Planetary accents: Soft Star Ivory (`#EDECE8`), Warm Stellar Glow (`#FDE68A`), Earth Cyan (`#38BDF8`), Earth Blue (`#3874CB`).
- Removal of artificial neon halos, thick electric-blue outlines, and arbitrary decorative cards.

---

## 3. Cinematic Opening Journey & Three.js Earth Architecture

### 3.1 Coordinated Scroll Timeline
Natural document scrolling drives a single coordinated journey:
1. **Opening Frame ($t = 0.0$):** Earth begins serene and distant in a deep-space starfield. The ASTRA editorial wordmark and signature star establish a quiet, confident mood.
2. **Scroll Journey ($0.0 < t < 0.8$):** The camera approaches Earth, which smoothly expands in perspective. Stars shift across three distinct depths (`deep`, `mid`, `fore`) creating optical parallax.
3. **Signature Star Trajectory ($0.08 < t < 0.75$):** A bespoke 3D star detaches from the wordmark coordinate and travels along a Bézier trajectory toward the planetary horizon, dissolving gracefully into the atmospheric limb.
4. **Layered Depth Interaction:** Earth's curved atmospheric horizon passes behind/across typography, creating spatial depth without sacrificing legibility.
5. **Settled Operational Frame ($t \rightarrow 1.0$):** The camera settles into an orbital view, revealing the two primary editorial destinations (`I. MISSION CONTROL` and `II. SPACE IMAGERY`).

### 3.2 3D Earth Shader & Rendering Details
- **Daylight/Night Terminator:** City lights smoothly emerge on the night side via a custom GLSL shader extension (`onBeforeCompile`), clamped and attenuated across the twilight transition.
- **Atmospheric Limb Scattering:** Delicate Mie/Rayleigh limb scattering shader clamped to the illuminated hemisphere (`smoothstep(-0.15, 0.35, sunCos)`), eliminating bright outlines on the unshadowed side.
- **Atmospheric Cloud Layer:** Semi-transparent outer mesh rotating at $1.15\times$ base speed for independent atmospheric drift.
- **Meteors:** Rare, subtle meteors streak across deep space at randomized intervals (16–30s).

---

## 4. Accessibility, Motion & Fallback Behaviour

- **Reduced Motion:** Fully honors `prefers-reduced-motion` at the CSS level, jumps the camera timeline directly to the settled frame, disables pointer parallax and particle velocity, and provides a manual header toggle (`[ motion: active ]` / `[ motion: reduced ]`).
- **Tactical 2D Fallback:** If WebGL is unavailable or fails context creation, `EarthCanvas` falls back gracefully to a tactical 2D vector display mode with diagnostic indicators without crashing the application.
- **GPU Throttling:** Animation loop pauses automatically on `document.hidden` (inactive browser tabs) to eliminate unnecessary GPU work.
- **Keyboard Navigation:** Full tab order, focus ring treatments (`:focus-visible`), and Escape key dialog dismissal.
- **Pointer Damping:** Mouse movement subtly shifts the camera within strict clamped bounds ($<0.25\text{ rad}$) with LERP damping, ensuring the Earth never drifts out of composition.

---

## 5. Visual Asset Provenance

All texture assets are documented in [docs/VISUAL_ASSET_MANIFEST.md](../docs/VISUAL_ASSET_MANIFEST.md):
- `earth_2048.jpg`: NASA Visible Earth / Goddard Space Flight Center (Public Domain).
- `earth_lights_2048.jpg`: NASA GSFC / DMSP City Lights (Public Domain).
- `earth_clouds_2048.jpg`: Solar System Scope / NASA (CC BY 4.0).

---

## 6. Known Limitations & Next Milestones

- **Simulated vs Real Telemetry:** As designed in Phase 1, the rotating Earth is a locally animated 3D rendering. No fabricated satellite positions or simulated telemetry are presented as real-world live data.
- **Next Milestone (Phase 2):** Implementation of the Spring Boot 21 server-authoritative simulation core with deterministic Keplerian orbital propagator and STOMP WebSocket telemetry stream.
