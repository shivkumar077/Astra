# ASTRA — Engineering Roadmap & Phase Stage Gates

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Phase 1)  
**Author:** Technical Architecture & Systems Engineering  
**Repository:** Astra

---

## Roadmap Overview & Staged Progression

ASTRA is built in ten deliberate, verifiable phases. Each phase concludes with an explicit **Stage Gate Review** containing measurable acceptance criteria before proceeding to the next stage.

```
[Phase 1] Foundation & Specification  <-- (CURRENT STAGE - COMPLETED)
    │
[Phase 2] Core Domain & Deterministic Simulation Engine (Spring Boot / Java 21)
    │
[Phase 3] Real-Time Telemetry Stream & Command Pipeline (WebSockets / STOMP)
    │
[Phase 4] Failure Lab & Six-Domain Anomaly Engine
    │
[Phase 5] External Space Imagery Gateway (NASA API & GIBS Integration)
    │
[Phase 6] Frontend Foundation & Aerospace Design System (React / TS / Vite)
    │
[Phase 7] Three.js 3D Orbital Scene & Spacecraft Rendering
    │
[Phase 8] Integrated Mission Control Console & Operation Workflows
    │
[Phase 9] Supabase Persistence & Database Migrations (Flyway)
    │
[Phase 10] Performance Optimization, Integration Testing & Portfolio Packaging
```

---

## Phase Details & Measurable Stage Gates

### Phase 1: Foundation & Specification (Current)
- **Goal:** Establish architecture, domain models, visual guidelines, environment templates, and development discipline before writing application code.
- **Deliverables:**
  - `README.md`
  - `docs/PRODUCT_SPEC.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DESIGN_DIRECTION.md`
  - `docs/ROADMAP.md`
  - `docs/DECISIONS.md`
  - `docs/DOMAIN_MODEL.md`
  - `.gitignore` & `.env.example`
  - Clean initial repository directory layout.
- **Stage Gate 1 Acceptance Criteria:**
  1. [x] All specifications written with zero ungrounded claims.
  2. [x] Exactly two primary entry options established.
  3. [x] Complete color palette defined with explicit hex codes.
  4. [x] No premature implementation code or boilerplate created.

---

### Phase 2: Core Domain & Deterministic Simulation Engine (COMPLETED)
- **Goal:** Build the server-authoritative simulation core in Java 21 / Spring Boot with Keplerian orbital math and subsystem integration.
- **Deliverables:**
  - Spring Boot modular backend layout (`org.astra.core`, `org.astra.simulation`, `org.astra.commands`, `org.astra.telemetry`, `org.astra.api`).
  - Deterministic simulation clock decoupled from wall clock, supporting controlled time advancement ($\Delta t$) and lifecycle management (`CREATED`, `RUNNING`, `PAUSED`, `STOPPED`).
  - Mathematically validated Keplerian two-body analytical orbital propagator with Newton-Raphson Kepler equation solver ($10^{-12}$ tolerance) and Cartesian $\leftrightarrow$ Keplerian state conversions.
  - Subsystem electrical power simulation (solar array generation and battery SoC dynamics in sunlight vs. cylindrical Earth shadow).
  - Telemetry ring-buffer service recording immutable snapshot frames derived from authoritative vehicle state.
  - Command dispatcher validating and executing telecommands (`SET_OPERATIONAL_MODE`, `TRIGGER_SAFE_MODE`, `ADVANCE_TIME`, `PAUSE_SIMULATION`, `RESUME_SIMULATION`).
  - Versioned REST API (`/api/v1/simulation/*`, `/api/v1/spacecraft/*`) and Spring Boot Actuator (`/actuator/health`).
  - Comprehensive automated test suite (55 tests: vector math, Kepler solver, orbital invariants, energy conservation, lifecycle, concurrency, commands, and MockMvc REST integration).
- **Stage Gate 2 Acceptance Criteria:**
  1. [x] Simulation clock advances predictably via discrete, server-authoritative time advancement without wall-clock skew.
  2. [x] Discretization invariance: arbitrary step divisions yield mathematically identical analytical orbit states within double-precision floating point limits.
  3. [x] Cylindrical shadow eclipse calculations transition spacecraft between solar array generation and battery discharge.
  4. [x] Test coverage: 55/55 automated tests passing with zero failures.

---

### Phase 3: Real-Time Telemetry Stream & Command Pipeline
- **Goal:** Implement STOMP over WebSocket streaming and command validation/execution lifecycles.
- **Deliverables:**
  - WebSocket STOMP broker configuration with `/ws/telemetry` endpoint.
  - Ring buffer for vehicle telemetry history (1,000 frames capacity).
  - Command staging, validation, light-travel transmission delay, and execution dispatch service.
  - REST endpoints for fleet listing and command staging.
  - Integration tests for WebSocket message broadcasts.
- **Stage Gate 3 Acceptance Criteria:**
  1. WebSockets broadcast `TelemetryFrame` records at 5 Hz with $<20\text{ms}$ dispatch latency.
  2. Commands pass through explicit states: `STAGED` $\rightarrow$ `TRANSMITTING` $\rightarrow$ `ACKNOWLEDGED` $\rightarrow$ `EXECUTED` / `FAILED`.
  3. Invalid commands (e.g., thruster burn when propellant is zero) are rejected with clear error codes.

---

### Phase 4: Failure Lab & Six-Domain Anomaly Engine
- **Goal:** Implement the shared failure scenario engine across the 6 subsystem areas.
- **Deliverables:**
  - Anomaly state machines for EPS, TCS, ADCS, COMMS, PROP, and OBC.
  - Fault injection REST endpoints (`/api/v1/anomalies/inject`).
  - Recovery sequence validation engine.
  - Anomaly event dispatch over WebSocket topics.
- **Stage Gate 4 Acceptance Criteria:**
  1. Triggering an anomaly perturbs the authoritative simulation state (e.g., ADCS anomaly causes quaternion tumble; TCS anomaly raises temperatures).
  2. Observable symptoms appear in the telemetry stream within 1 broadcast cycle.
  3. Recovery command sequences return subsystems back to nominal state predictably.
  4. Integration tests verify full injection $\rightarrow$ perturbation $\rightarrow$ recovery cycles.

---

### Phase 5: Space Imagery Gateway (NASA API & GIBS)
- **Goal:** Build the backend proxy and caching layer for NASA media assets.
- **Deliverables:**
  - Spring HTTP client for NASA Image and Video Library (`images-api.nasa.gov`).
  - NASA GIBS WMTS tile URL resolver and metadata service.
  - Server-side in-memory cache for asset manifests and search queries.
  - Circuit breaker and graceful rate-limit handling.
- **Stage Gate 5 Acceptance Criteria:**
  1. `/api/v1/imagery/random` returns 12 curated space photography items with full metadata.
  2. Search queries execute cleanly against NASA API with pagination.
  3. Disconnecting external network causes service to serve cached fallbacks without crashing.
  4. Zero NASA API keys exposed in responses or client code.

---

### Phase 6: Frontend Foundation & Aerospace Design System
- **Goal:** Initialize React + TypeScript + Vite client and build the custom design token library.
- **Deliverables:**
  - Vite + React + TypeScript setup in `frontend/`.
  - CSS design token architecture matching `DESIGN_DIRECTION.md` (colors, typography, grid).
  - Core aerospace components: InstrumentPanel, TelemetryReadout, StatusBadge, ButtonChamfered, TimeConductor.
  - Dual-entry home portal router: Mission Control vs Space Imagery.
- **Stage Gate 6 Acceptance Criteria:**
  1. Zero generic SaaS aesthetics; exact hex codes from design specification implemented.
  2. Home screen presents strictly two primary entry experiences.
  3. Typography loads monospaced tabular numerals with no horizontal layout shift on number change.
  4. Fully responsive on standard desktop viewports (1920x1080 down to 1366x768).

---

### Phase 7: Three.js 3D Orbital Scene & Spacecraft Rendering
- **Goal:** Build the interactive orbital viewport with celestial bodies and trajectory paths.
- **Deliverables:**
  - Three.js canvas integrated into React with OrbitControls.
  - Textured celestial bodies (Earth, Moon, Mars, Jupiter, Saturn, Sun).
  - Dynamic trajectory ribbons rendered from Keplerian parameters.
  - Spacecraft 3D models with orientation updated via quaternions $[q_0, q_1, q_2, q_3]$.
  - Optical camera field-of-view cone visualizer.
- **Stage Gate 7 Acceptance Criteria:**
  1. Renders smoothly at 60 FPS on standard modern GPUs.
  2. Orbit lines accurately reflect spacecraft periapsis, apoapsis, and orbital plane inclination.
  3. Spacecraft orientation smoothly tracks incoming telemetry quaternions using SLERP interpolation.

---

### Phase 8: Integrated Mission Control Console & Operation Workflows
- **Goal:** Connect live backend WebSockets to the frontend operational dashboards.
- **Deliverables:**
  - Live telemetry dashboard with real-time strip charts and 6-subsystem matrix.
  - Command Terminal with command builder, parameter validation, and transmission log.
  - Failure Lab interactive drawer with anomaly triggers and diagnostics.
  - Simulated Camera capture trigger with telemetry-stamped image receipt.
  - Space Imagery search and discovery interface.
- **Stage Gate 8 Acceptance Criteria:**
  1. Switching between spacecraft in the fleet updates telemetry, orbit line, and 3D camera target seamlessly.
  2. Injecting an anomaly in the Failure Lab highlights the affected panel in red within 200 ms.
  3. Camera capture generates traceable synthetic metadata distinct from NASA images.
  4. Space Imagery search returns authentic NASA imagery with full metadata sheets.

---

### Phase 9: Supabase Persistence & Database Migrations
- **Goal:** Wire PostgreSQL database persistence via Supabase using Flyway migrations.
- **Deliverables:**
  - Flyway migrations for schema creation (`missions`, `spacecraft`, `telemetry_snapshots`, `command_logs`, `events`).
  - Spring Data JPA entities and repositories.
  - Periodic telemetry snapshot archiving service.
  - Row Level Security (RLS) policies configured in Supabase.
- **Stage Gate 9 Acceptance Criteria:**
  1. Application boots and successfully applies all Flyway migrations on a clean database.
  2. Command executions and anomaly events persist with relational integrity.
  3. Telemetry snapshots prune automatically to prevent unbounded storage growth.

---

### Phase 10: Performance Optimization, Integration Testing & Portfolio Packaging
- **Goal:** Final polish, Docker containerization, comprehensive end-to-end testing, and portfolio documentation.
- **Deliverables:**
  - Multi-stage `Dockerfile` for backend and frontend.
  - `docker-compose.yml` for unified local execution.
  - End-to-end integration test suite.
  - Architecture walkthrough documentation and visual showcase artifacts.
- **Stage Gate 10 Acceptance Criteria:**
  1. Entire platform launches with a single `docker compose up` command.
  2. Zero memory leaks in Three.js canvas or WebSocket subscriptions during 1-hour soak test.
  3. Portfolio documentation demonstrates backend systems architecture, real-time streaming, and visual rigor.
