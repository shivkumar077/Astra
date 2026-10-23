# ASTRA Frontend Client

**Stack:** React 18 | TypeScript | Vite 6 | Three.js | Vitest | Testing Library

The ASTRA frontend client delivers an aerospace-grade mission simulation console and an authentic space imagery discovery portal. It pairs mathematical state telemetry with a real-time rendered Three.js interactive 3D Earth, self-hosted typography, and strict aerospace design tokens.

---

## 1. Quickstart & Development

### Prerequisites
- **Node.js:** v20+ (tested with v24.19.0)
- **npm:** v10+ (tested with 11.17.0)

### Setup & Execution Commands
```bash
# Navigate to frontend workspace
cd frontend

# Install dependencies (creates package-lock.json)
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

## 2. Architecture & Directory Layout

```
frontend/
 ├── public/
 │    ├── assets/
 │    │    ├── earth/          # Validated 2048x1024 Blue Marble textures
 │    │    │    ├── earth_2048.jpg         # NASA Visible Earth diffuse map (332 KB)
 │    │    │    ├── earth_lights_2048.jpg  # NASA GSFC/DMSP night lights (274 KB)
 │    │    │    └── earth_clouds_2048.jpg  # Atmospheric cloud layer (965 KB)
 │    │    ├── space/          # Reserved for deep space starfield textures (.gitkeep)
 │    │    ├── textures/       # Reserved for shared surface & normal maps (.gitkeep)
 │    │    └── video/          # Reserved for future mission footage (.gitkeep)
 │    └── favicon.svg          # Tactical vector radar favicon
 ├── src/
 │    ├── components/
 │    │    ├── earth/
 │    │    │    └── EarthCanvas.tsx  # Interactive Three.js 3D Earth scene
 │    │    └── ui/
 │    │         ├── Header.tsx       # UTC clock, status annunciators, reduced motion toggle
 │    │         ├── HeroSection.tsx  # Product statement & exactly 2 primary entry points
 │    │         ├── EntryModal.tsx   # Pre-flight briefing and roadmap status modal
 │    │         └── Footer.tsx       # System telemetry & texture attribution
 │    ├── styles/
 │    │    └── tokens.css      # Design tokens (colors, monospace typography, 4px grid)
 │    ├── test/
 │    │    ├── setup.ts        # JSDOM canvas & media match mocks
 │    │    └── EarthLanding.test.tsx # Automated unit & integration tests
 │    ├── App.tsx              # Primary layout orchestrator
 │    ├── index.css            # Tactical CSS resets and accessible focus treatment
 │    └── main.tsx             # Application bootstrap & self-hosted font imports
 ├── index.html                # Entry HTML with aerospace metadata
 ├── package.json              # NPM dependencies & scripts
 ├── tsconfig.json             # TypeScript strict configuration
 └── vite.config.ts            # Vite bundler & Vitest test runner configuration
```

---

## 3. Real-Time 3D Earth Rendering Approach

The landing page features a real-time rendered 3D Earth anchored on the right side of the hero composition:
- **Renderer:** Three.js `WebGLRenderer` with `ACESFilmicToneMapping` and device-pixel-ratio clamped to 2.0.
- **Surface Geometry & Shading:** A `SphereGeometry(2, 64, 64)` mapped with NASA's Blue Marble true-color composite.
- **Emissive Twilight Terminator:** Night city lights are rendered on the unlit hemisphere using a custom GLSL shader extension (`onBeforeCompile`), fading smoothly across the twilight boundary as the Earth rotates.
- **Atmospheric Limb Rim:** A secondary outer sphere running a custom Fresnel shader with additive blending, emitting an authentic cyan (`#00E5FF`) and orbital blue (`#0A84FF`) halo along the planetary horizon.
- **Atmospheric Clouds:** A semi-transparent outer shell (`SphereGeometry(2.025)`) rotating at 1.18× the planetary surface rate to create dynamic atmospheric drift.
- **Starfield:** Procedural 1,000-point particle cloud placed at radii 60–100 units with authentic stellar spectral color variances.
- **Orbital Vector Ring:** A subtle dashed vector circle orbiting at $51.6^\circ$ inclination (standard LEO / ISS inclination).

---

## 4. Accessibility, Motion & Fallback Behaviour

- **Self-Hosted Typography:** Powered by `@fontsource/space-grotesk` and `@fontsource/ibm-plex-mono`. No runtime network requests to third-party font servers (Google Fonts) are required.
- **Reduced Motion:** Fully honors `prefers-reduced-motion` at both the CSS level and inside the Three.js render loop. Can also be toggled manually via the header button (`MOTION: ACTIVE` / `MOTION: REDUCED`).
- **Graceful WebGL Fallback:** If WebGL hardware acceleration is unavailable (or in headless test environments), `EarthCanvas` falls back to a tactical 2D vector display mode with radial depth shading and diagnostic notices without crashing or interrupting user interaction.
- **Page Visibility:** When the browser tab is hidden (`document.hidden`), the animation loop pauses automatically to eliminate unnecessary GPU/CPU utilization.
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
