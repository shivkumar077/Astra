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

## 2. Visual Identity & Creative Direction (Prompt 3 & 4 Overhaul)

ASTRA combines a restrained, cinematic editorial design system with bespoke aerospace branding and mathematical shader rendering:

### 2.1 Bespoke ASTRA Brand Identity (`AstraBrand.tsx`)
- **`AstraCelestialMark`:** An independent, mathematically constructed astronomical emblem featuring an 8-point celestial diamond star, a 23.4° equatorial orbital trajectory ellipse, hairline diagonal secondary rays, and a central concentric optical aperture focal point.
- **`AstraWordmark`:** Scalable SVG vector wordmark drawn with classical Roman proportions, chisel serifs, tapered apexes, extended hairline trajectory crossbars on the dual 'A' letterforms, a sinuous 'S' spine, bracketed 'T', and a proud descending 'R' leg.
- **`AstraBrandLockup`:** Master architectural lockup pairing the celestial mark with the vector wordmark and subtle trajectory lineage annotation.

### 2.2 Typographic Triad (100% Self-Hosted via `@fontsource`)
- **Display & Headlines (`var(--font-serif)`):** `Cormorant Garamond` (Weights: 400, 400i, 600, 700). High-contrast editorial serif delivering monumental scale and elegance to headlines and destination titles.
- **Body (`var(--font-sans)`):** `Inter` (Weights: 300, 400, 500, 600). Neutral, highly legible sans-serif for descriptions, paragraphs, and briefing modals.
- **Technical Telemetry (`var(--font-mono)`):** `IBM Plex Mono` (Weights: 400, 500, 600). Reserved strictly for genuine operational readouts, coordinate systems, and UTC timestamps.

### 2.3 Bespoke Celestial Icon Family (`CelestialIcons.tsx`)
Fine-line SVG symbols crafted in the tradition of classical astronomical atlases:
- `SignatureStar`: Four-point radiant diamond star.
- `TerrestrialPlanet`, `RingedPlanet`, `GasGiant`, `MoonCrater`: Planetary bodies with accurate contouring.
- `Spacecraft`, `OrbitalTrajectory`, `OpticalAperture`: Technical symbols for telemetry and observation modes.

---

## 3. Cinematic Opening Journey & Three.js Earth Architecture

### 3.1 Coordinated Scroll Timeline & Extended Reveal
Natural document scrolling drives a single coordinated journey with an extended, unhurried timeline (`minHeight: 280vh`):
1. **Opening Frame ($t \le 0.30$):** Earth begins serene and distant in a deep-space starfield. The ASTRA master brand lockup reveals itself over 1.6s. At $t = 700\text{ms}$, the signature procedural meteor sweeps gracefully across the upper celestial sphere over a 2.2s arc.
2. **Layered Planetary Depth Overlap ($0.35 \le t \le 0.65$):** As the visitor scrolls, the camera approaches Earth. The ASTRA typography sits on a dedicated depth plane at `z-index: 2` behind the Earth canvas at `z-index: 3`. Earth's curved 3D horizon and illuminated atmospheric rim physically sweep across and obscure the right portion of the letters, producing an optically convincing lock-screen depth illusion.
3. **Signature Star Trajectory ($0.15 < t < 0.72$):** A bespoke 3D star with an acute cross-sparkle diffraction profile detaches from the wordmark and travels along a Bézier trajectory toward the planetary horizon, dissolving gracefully into the atmospheric limb.
4. **Settled Operational Frame ($t \rightarrow 1.0$):** The camera settles into an orbital view, revealing the two primary editorial destinations (`I. MISSION CONTROL` and `II. SPACE IMAGERY`) at `z-index: 10`.

### 3.2 3D Earth Shader & Rendering Details
- **Real Circular Starfield:** Custom GLSL `ShaderMaterial` with perspective attenuation (`gl_PointSize = aSize * (160.0 / -mvPosition.z) * uPixelRatio`) and Gaussian radial profile (`exp(-r * r * 28.0)`), completely replacing square point quads with needle-sharp circular celestial pinpricks across 3 parallax depth tiers.
- **Procedural Luminous Ribbon Meteor:** Analytical GLSL shader on an oriented quad with continuous mathematical width envelope (`pow(u, 0.65)`), incandescent diamond head (`exp(-headDist * 4.2)`), and ionized cyan-azure tail, eliminating all texture boundary artifacts and pale rectangular quads.
- **Earth Surface Fidelity:** Anisotropic filtering set to 16× on all planetary textures, 96×96 sphere tessellation, and a tuned twilight terminator where city lights emerge with warm golden radiance (`#FFE29A`).
- **Atmospheric Limb Scattering:** Delicate Rayleigh/Mie limb scattering shader clamped to the illuminated hemisphere (`smoothstep(-0.10, 0.30, sunCos)` with Fresnel power 4.5), eliminating bright outlines on the unshadowed side.


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
