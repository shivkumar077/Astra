# ASTRA — Product Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Phase 1)  
**Author:** Technical Architecture & Systems Engineering  
**Repository:** Astra

---

## 1. Executive Summary & Product Vision

**ASTRA** is an aerospace-grade satellite operations and mission simulation platform. Engineered as a high-fidelity portfolio software product, ASTRA pairs a real-time deterministic spacecraft simulation engine with an operational mission control interface and an integrated space-imagery exploration portal.

The platform bridges two distinct worlds:
1. **The Operational World:** Simulating telemetry, orbital mechanics, subsystem thermodynamics, power generation, orbital command dispatch, and controlled subsystem failure scenarios across a multi-craft interplanetary fleet.
2. **The Observational World:** Providing an immersive, curated gateway into authentic NASA space and Earth-observation archives without requiring mission operations.

ASTRA avoids generic SaaS dashboards. Every interface element, data stream, and state transition is anchored in aerospace telemetry conventions, scientific rigor, and deterministic server-authoritative state.

---

## 2. Target Users & Use Cases

| User Persona | Context & Intent | Primary Platform Value |
| :--- | :--- | :--- |
| **Software Engineers & Technical Reviewers** | Evaluating systems architecture, real-time data streaming, state machines, and code quality. | Clear domain boundaries, deterministic server simulation, Spring Boot WebSocket infrastructure, type-safe React client. |
| **Aerospace & Mission Enthusiasts** | Operating spacecraft, understanding subsystem interdependence, reacting to anomalies, inspecting orbits. | Realistic orbital mechanics visualization, six-domain failure injection, verifiable command execution lifecycle. |
| **Science & Space Imagery Explorers** | Discovering authentic astronomical photography, planetary surveys, and Earth observation layers. | Seamless discovery via NASA Image and Video Library, NASA GIBS tile layers, deep metadata inspection. |

---

## 3. Core Product Entry Architecture

ASTRA features **exactly two primary entry points** on its home interface. There are no competing entry cards or tertiary application modes.

```
+-----------------------------------------------------------------------------------+
|                                  ASTRA PLATFORM                                   |
|                           [ Unified Visual Identity ]                             |
+-----------------------------------------+-----------------------------------------+
|                                         |                                         |
|          1. MISSION CONTROL             |            2. SPACE IMAGERY             |
|                                         |                                         |
|  - Multi-Craft Fleet Management         |  - NASA Image & Video Library Search    |
|  - 3D Interactive Orbital Viewport      |  - Curated Random Photography Discovery |
|  - Real-Time Subsystem Telemetry        |  - Deep Metadata & Attribution Sheets   |
|  - Command Uplink & Verification        |  - NASA GIBS Earth Observation Imagery  |
|  - Six-Domain Failure Lab Anomaly Engine|  - Full-Resolution Asset Inspect Mode   |
|  - Simulated Camera Capture Operations  |                                         |
|                                         |                                         |
+-----------------------------------------+-----------------------------------------+
```

Both experiences share a unified, high-contrast, instrument-grade visual identity, but serve distinctly decoupled operational objectives.

---

## 4. Feature Definitions: Mission Control

### 4.1 Fleet Architecture & Mission Profiles
Mission Control manages an active fleet of simulated spacecraft operating across diverse celestial and orbital regimes:

1. **Astra-EO-1 (AURA-1):** Sun-synchronous Low Earth Orbit (LEO) multispectral Earth-observation satellite (Altitude: ~680 km, Inclination: 98.2°). Primary focus on surface scanning, power cycling across orbital eclipse, and ground station pass contacts.
2. **Astra-Lunar-Pathfinder (SELENA):** Polar Lunar orbiter (Altitude: ~100 km). Highly perturbed gravity field, thermal extremes during lunar night, deep-space optical communication experiments.
3. **Astra-Mars-Recon (AREON):** Mars elliptical reconnaissance orbiter (Apoapsis: 3,200 km, Periapsis: 300 km). Extreme transmission latency (4 to 20 minutes light-travel time), solar irradiance drop-off, dust-storm thermal degradation.
4. **Astra-GasGiant-Flyby (CRONOS):** Outer solar system probe targeting Jupiter and Saturn gravity-assist trajectories. Radioisotope Thermoelectric Generator (RTG) power decay, extreme radiation belts, autonomous reaction wheel management.
5. **Astra-DeepSpace-Voyager (VANGUARD):** Heliocentric escape trajectory. Minimal telemetry bandwidth, strict power rationing, autonomous attitude hold.

### 4.2 Interactive 3D Orbital Scene
- **Engine:** Three.js within a hardware-accelerated canvas.
- **Ephemeris & Bodies:** Accurate proportional representation of primary gravitational attractors (Earth, Moon, Mars, Jupiter, Saturn, Sun).
- **Orbital Vector Rendering:** Trajectory ribbons showing current orbit, predicted propagation, true anomaly marker, line of nodes, periapsis ($r_p$), and apoapsis ($r_a$).
- **Spacecraft Geometry:** Authentic, scientifically proportioned 3D models with articulate solar panels, high-gain antennas, and optical payload bays.
- **Reference Frames:** Switchable coordinate frames:
  - ECI (Earth-Centered Inertial / J2000)
  - Orbit-relative LVLH (Local Vertical, Local Horizontal)
  - Body-Fixed Ground Track projection

### 4.3 Subsystem Telemetry Stream
The backend telemetry engine continuously synthesizes and streams state vectors at 5 Hz (200 ms interval) over WebSockets:
- **Kinematics:** Position $[X, Y, Z]$, Velocity $[V_x, V_y, V_z]$, Altitude, Velocity Magnitude, Orbital Period.
- **Attitude Determination & Control (ADCS):** Quaternions $[q_0, q_1, q_2, q_3]$, Euler angles (Roll, Pitch, Yaw), Reaction Wheel RPM (4 wheels), Magnetic Torquer status.
- **Electrical Power System (EPS):** Solar array voltage/current, battery State-of-Charge (SoC %), bus voltage, thermal-dependent battery charge efficiency, eclipse state.
- **Thermal Control System (TCS):** Multi-point thermocouple telemetry (Core electronics, battery bay, solar array sunward/shadow faces, optical sensor).
- **Telecommunications (COMMS):** Uplink frequency, downlink signal-to-noise ratio ($E_b/N_0$), bit error rate (BER), transmitter power (Watts), line-of-sight (LOS) / ground station acquisition status.
- **Propulsion (PROP):** Propellant tank pressure, remaining mass budget ($\Delta V$ available in m/s), thruster valve firing states.
- **Onboard Computer (OBC):** CPU utilization %, memory heap usage, SEU (Single-Event Upset) count, watchdog timer status, flight software cycle time.

### 4.4 Command & Control Pipeline
Spacecraft do not mutate state instantly via client UI clicks. Commands follow an explicit operational lifecycle:
1. **Staging:** Operator selects a subsystem command and fills validated parameters in the Command Terminal.
2. **Pre-flight Validation:** Client-side syntax check and server-authoritative semantic verification (e.g., verifying that a thruster burn command does not exceed remaining propellant or fire while ADCS is unlocked).
3. **Transmission & Latency:** Command is staged into the transmission queue. Interplanetary distance latency (light delay) is accurately simulated based on current distance from Earth.
4. **Acknowledgement (ACK):** Spacecraft receiver validates checksum and acknowledges command receipt.
5. **Execution:** Onboard computer steps through the commanded state change.
6. **Telemetry Verification:** Server verifies that subsequent telemetry frames reflect the commanded hardware change (e.g., solar array slewed to commanded angle).
7. **Resolution:** Command logged as `COMPLETED` or `FAILED` with explicit telemetry error code.

### 4.5 Failure Lab: Anomaly Simulation Engine
Failure Lab is not a separate sandbox or disconnected mock. It operates directly on the shared, authoritative simulation engine. Operators can trigger deterministic failure scenarios across six subsystem domains:

1. **Power Anomaly (EPS-FAIL-01):** Solar array gimbal lock or battery cell degradation. Results in depleted battery storage during orbital eclipse and brownout trips.
2. **Thermal Anomaly (TCS-FAIL-02):** Radiator louvre failure or thermal blanket detachment. Causes rapid thermal escalation under direct solar irradiation.
3. **ADCS Anomaly (ADCS-FAIL-03):** Reaction wheel bearing runaway or star tracker blinding. Leads to spacecraft attitude tumble and loss of antenna pointing.
4. **Communications Anomaly (COMMS-FAIL-04):** High-gain antenna tracking failure or transmitter amplifier degradation. Results in severe packet loss and dropped downlink bitrate.
5. **Propulsion Anomaly (PROP-FAIL-05):** Thruster valve stuck open or propellant tank micro-leak. Causes uncontrolled angular momentum buildup and $\Delta V$ loss.
6. **Onboard Computing Anomaly (OBC-FAIL-06):** Single Event Upset (SEU) memory corruption or task scheduler deadlock. Triggers flight computer watchdog reboot cycles.

Each scenario produces:
- Observable real-time telemetry perturbations.
- Visual status annunciators on the telemetry console.
- Traceable root-cause audit logs.
- Prescribed contingency recovery workflows (e.g., safe-mode transition, thruster desaturation, secondary bus isolation).

### 4.6 Camera Operations & Traceable Captures
When mission conditions allow (spacecraft health nominal, attitude stabilized, target in field of view, lighting adequate), the operator can command an optical capture:
- **Execution:** Generates a synthetic capture operation stamped with spacecraft ID, simulation UTC timestamp, celestial target, position vector, camera orientation quaternion, exposure length, and optical filter.
- **Persistence:** Saved to the mission log as a verifiable capture event.
- **Strict Distinction:** Rendered simulation captures are visually stamped and watermarked as `SYNTHETIC / SIMULATED VEHICLE CAPTURE`. The application strictly separates these synthetic frames from authentic NASA astronomical archives.

---

## 5. Feature Definitions: Space Imagery

The Space Imagery module is a dedicated, distraction-free environment for exploring authentic NASA imagery.

### 5.1 Curated & Random Space Photography Discovery
- **Random Discovery Engine:** With a single action, operators pull randomized, high-resolution astronomical photographs from NASA’s vast public repository.
- **Curated Mission Filters:** Direct queries across iconic scientific missions:
  - James Webb Space Telescope (JWST)
  - Hubble Space Telescope (HST)
  - Mars Perseverance & Curiosity Science Cameras
  - Cassini-Huygens (Saturn system)
  - Juno (Jupiter)
  - Apollo Historical Archive

### 5.2 NASA Primary Data Sources
1. **NASA Image and Video Library (`images-api.nasa.gov`):**
   - Public REST API requiring no API keys.
   - Comprehensive multi-rendition media manifests (thumbnail, medium, large, original uncompressed).
   - Deep structured metadata: NASA Center, internal NASA ID, date created, keywords, scientific description.
2. **NASA GIBS (Global Imagery Browse Services):**
   - High-resolution standard Web Map Tile Service (WMTS) layers.
   - Global Earth observation products (MODIS Terra/Aqua Corrected Reflectance, VIIRS Black Marble night lights).
   - Temporal dimension browsing (historical Earth imagery by date).
3. **NASA APOD (`api.nasa.gov`):**
   - Used strictly as an optional supplemental view, guarded by caching and rate-limiting fallbacks to prevent `DEMO_KEY` exhaustion.

### 5.3 Spacecraft-Sim vs Authentic Archive Separation Rules
Under no circumstances does ASTRA present real NASA imagery as if it were taken by a simulated vehicle, nor does it present simulated 3D model renders as genuine NASA photographs:
- **NASA Archives:** Clearly badged with official NASA attribution, original NASA ID (e.g., `PIA23456`), mission center, and link to public source records.
- **Mission Control Captures:** Clearly badged as `SIMULATED VEHICLE TELEMETRY OUTPUT`, displaying simulated sensor noise, vehicle attitude parameters, and simulated coordinates.

---

## 6. User Journeys

### Journey 1: Mission Operator Handling an In-Flight Thermal Anomaly
```
1. Operator accesses Home Page -> Chooses "MISSION CONTROL"
2. Dashboard initializes -> Displays active fleet summary -> Selects "Astra-EO-1"
3. 3D Viewport loads Earth orbit track -> Live telemetry streams over WebSocket (Nominal Green)
4. Operator opens "FAILURE LAB" drawer -> Injects "TCS-FAIL-02: Radiator Louvre Stiction"
5. Backend simulation executes thermal perturbation -> Core temp rises from 22°C to 74°C
6. Telemetry display shifts from Nominal Green -> Amber Warning -> Red Alarm
7. Operator inspects Attitude & Thermal panels -> Notices secondary heater active despite overheat
8. Operator opens Command Terminal -> Stages "PWR_HEATER_OVERRIDE_OFF" and "ADCS_SLEW_ATTITUDE_SHADOW"
9. Commands transmitted -> Latency countdown expires -> ACK received
10. Slew maneuver executes in 3D viewport -> Radiator face turned away from Sun
11. Temperatures stabilize back into safe corridor -> Anomaly status resolves -> Incident logged
```

### Journey 2: Astronomer Discovering Deep-Space Imagery
```
1. Operator accesses Home Page -> Chooses "SPACE IMAGERY"
2. Viewer launches into deep-void aesthetic -> Prompts with "DISCOVER RANDOM ASSET"
3. System calls backend NASA Gateway -> Queries NASA Image & Video Library with randomized index
4. High-resolution JWST nebula capture loads with progressive render
5. Operator expands "TECHNICAL METADATA" inspector panel
6. Panel details: Instrument (NIRCam), Target (Carina Nebula), NASA Center (STScI), Capture Date, Full Caption
7. Operator switches to "EARTH OBSERVATION (GIBS)" mode -> Toggles "VIIRS Night Lights" layer
8. Operator scrubs temporal date selector -> Views historical atmospheric changes
```

---

## 7. Non-Functional Requirements (NFRs)

| Metric | Target | Rationale |
| :--- | :--- | :--- |
| **Telemetry Update Rate** | 5 Hz (200 ms interval) | Sufficiently rapid for realistic sensor dynamics without flooding network buffers or consuming excessive client CPU. |
| **Simulation Determinism** | 100% reproducible | Given an identical initial state vector and command sequence, the simulation must generate bit-exact results across runs. |
| **3D Rendering Performance** | Stable 60 FPS on modern GPUs | Orbital viewport must remain silky and non-stuttering during camera orbit, zoom, and spacecraft articulation. |
| **Command Uplink Latency** | Configurable (0 ms to simulated interplanetary delay) | Accurately simulates the physical reality of space communications. |
| **Security & Credential Secrecy** | Zero client secrets | Supabase service-role keys and backend environment variables remain strictly server-side. |
| **Graceful Degradation** | Complete offline resilience | If external NASA APIs throttle or drop connection, client degrades gracefully with cached fallbacks. |

---

## 8. Out of Scope for Phase 1 & Initial Production

- Real-world hardware ground-station integration (RF software-defined radios).
- Multi-user concurrent multiplayer control collisions (v1 uses single-operator sessions).
- Full n-body gravitational perturbations for all celestial asteroids (simplified to central body two-body Keplerian + J2 perturbation).
- Commercial paid satellite tracking feeds.
- Complex user billing or paid tiers.

---

## 9. Acceptance Criteria for Product Specification

- [x] Product identity and dual-entry structure strictly defined without ambiguity.
- [x] All 6 Failure Lab subsystem anomaly areas explicitly detailed with observable effects.
- [x] Clear demarcation rules between simulated spacecraft telemetry and NASA space photography established.
- [x] Functional requirements defined for both Mission Control and Space Imagery modes.
- [x] Realistic user journeys documented end-to-end.
