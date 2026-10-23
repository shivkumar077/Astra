# ASTRA — Visual Asset Manifest

**Document Version:** 1.0.0  
**Last Updated:** 2026-10-24  
**Status:** Active  
**Repository:** Astra

This manifest records all external visual, texture, and multimedia assets acquired for ASTRA, documenting provenance, licensing, resolution, processing, and intended operational use.

---

## 1. Earth Planetary Textures (`frontend/public/assets/earth/`)

### 1.1 Earth Surface & Shallow Water Composite
- **Asset Name:** `earth_2048.jpg`
- **Repository Path:** `frontend/public/assets/earth/earth_2048.jpg`
- **Source Organization:** NASA Goddard Space Flight Center (Visible Earth / Earth Observatory)
- **Creators:** Reto Stöckli (surface land/water processing), Robert Simmon (ocean enhancement)
- **Original Source URL:** `https://commons.wikimedia.org/wiki/File:Land_shallow_topo_2048.jpg` (Original raw NASA Visible Earth collection: Blue Marble Land Surface, Shallow Water, and Shaded Topography)
- **Direct Asset Mirror:** `https://upload.wikimedia.org/wikipedia/commons/9/91/Land_shallow_topo_2048.jpg`
- **Licence & Terms:** Public Domain (Work of the United States Federal Government, NASA Photo ID G57730). No copyright restrictions.
- **Original File Dimensions:** 21,600 × 10,800 pixels (57.6 MB raw composite)
- **Locally Stored Dimensions & Format:** 2,048 × 1,024 pixels, JPEG (332 KB, quality 88)
- **Optimizations Performed:** High-quality bicubic downsampling from the 21.6K master dataset to a 2048×1024 equirectangular map optimized for Three.js WebGL texture memory and fast initial page load.
- **Intended Application Use:** Primary diffuse surface map for the 3D rotating Earth hero scene on the landing page and future orbital mission viewport.

### 1.2 Earth Night Lights / City Lights
- **Asset Name:** `earth_lights_2048.jpg`
- **Repository Path:** `frontend/public/assets/earth/earth_lights_2048.jpg`
- **Source Organization:** NASA Goddard Space Flight Center / Defense Meteorological Satellite Program (DMSP)
- **Creators:** Data courtesy of the DMSP / NASA GSFC (Christopher Elvidge et al.)
- **Original Source URL:** `https://commons.wikimedia.org/wiki/File:Earth%27s_City_Lights_by_DMSP,_1994-1995_(medium).png`
- **Direct Asset Mirror:** `https://upload.wikimedia.org/wikipedia/commons/8/83/Earth%27s_City_Lights_by_DMSP%2C_1994-1995_%28medium%29.png`
- **Licence & Terms:** Public Domain (Work of NASA and US Department of Defense). No copyright restrictions.
- **Original File Dimensions:** 2,560 × 1,280 pixels, PNG (2.68 MB)
- **Locally Stored Dimensions & Format:** 2,048 × 1,024 pixels, JPEG (274 KB)
- **Optimizations Performed:** Bicubic resampling to match the 2048×1024 projection of the base surface texture, converted from PNG to high-efficiency JPEG for fast texture upload.
- **Intended Application Use:** Emissive texture layer for the unlit (night) hemisphere of Earth, illuminating city centers along coastlines and continents opposite the solar direction.

### 1.3 Earth Atmospheric Cloud Layer
- **Asset Name:** `earth_clouds_2048.jpg`
- **Repository Path:** `frontend/public/assets/earth/earth_clouds_2048.jpg`
- **Source Organization:** Solar System Scope / NASA
- **Creators:** Solar System Scope (derivative composite based on NASA MODIS and NOAA cloud observation imagery)
- **Original Source URL:** `https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_earth_clouds.jpg`
- **Direct Asset Mirror:** `https://upload.wikimedia.org/wikipedia/commons/e/ed/Solarsystemscope_texture_2k_earth_clouds.jpg`
- **Licence & Terms:** Creative Commons Attribution 4.0 International (CC BY 4.0). Attribution: Solar System Scope / NASA.
- **Original File Dimensions:** 2,048 × 1,024 pixels, JPEG (965 KB)
- **Locally Stored Dimensions & Format:** 2,048 × 1,024 pixels, JPEG (965 KB)
- **Optimizations Performed:** Validated equirectangular alignment matching the base sphere coordinates.
- **Intended Application Use:** Semi-transparent atmospheric cloud mesh rotating at a slightly decoupled angular velocity from the planetary surface to convey atmospheric motion.

---

## 2. Typography Assets (Self-Hosted)

In accordance with Prompt 3 ("Self-host suitable font files when licensing and availability permit, and provide appropriate fallbacks. Avoid third-party runtime font servers"), fonts are bundled directly via standard npm `@fontsource` packages with zero runtime CDN requests:

- **Editorial Serif & Wordmark:** `@fontsource/cormorant-garamond` (Weights: 400, 400i, 600, 700)
  - Licence: SIL Open Font License 1.1
  - Purpose: ASTRA wordmark, monumental cinematic opening frame, editorial headlines, and refined category markers.
- **Body & Operational Sans-Serif:** `@fontsource/inter` (Weights: 300, 400, 500, 600)
  - Licence: SIL Open Font License 1.1
  - Purpose: Highly readable, balanced editorial body copy, narrative descriptions, and modal interfaces.
- **Technical & Telemetry Monospace:** `@fontsource/ibm-plex-mono` (Weights: 400, 500, 600)
  - Licence: SIL Open Font License 1.1
  - Purpose: Genuine operational telemetry, coordinates, UTC timestamps, and stage gate status codes.

---

## 3. Bespoke Celestial Icon Family (`frontend/src/components/common/CelestialIcons.tsx`)

A cohesive, fine-line SVG celestial symbol suite designed in the visual language of classical astronomical atlases:
- **`SignatureStar`**: 4-point radiant diamond star with acute tapered vertices, central core, and delicate diagonal ticks. Acts as the visual anchor of the ASTRA identity.
- **`TerrestrialPlanet`**: Spherical body with latitude contours and subtle terminator arc.
- **`RingedPlanet`**: Saturnian body intersected by fine elliptical ring arcs.
- **`GasGiant`**: Banded atmospheric striation lines with cyclonic vortex.
- **`MoonCrater`**: Cratered natural satellite with phase terminator.
- **`Spacecraft`**: Engineering satellite with articulated solar arrays, high-gain antenna dish, and thruster bell.
- **`OrbitalTrajectory`**: Conic section ellipse with central body and periapsis vector marker.
- **`OpticalAperture`**: Concentric telescopic aperture for astronomical observation.

---

## 4. Directory Conventions

- `frontend/public/assets/earth/`: Equirectangular planetary maps and cloud layers.
- `frontend/public/assets/space/`: Star fields, background skymaps, and celestial skyboxes.
- `frontend/public/assets/textures/`: Shared rendering maps (normal, specular, noise).
- `frontend/public/assets/video/`: Reserved for future cinematic background footage.

