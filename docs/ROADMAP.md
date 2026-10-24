# ASTRA — Engineering Roadmap & Phase Stage Gates

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Phase 1)  
**Author:** Technical Architecture & Systems Engineering  
**Repository:** Astra

---

## Roadmap Overview & Staged Progression

ASTRA is built in ten deliberate, verifiable phases. Each phase concludes with an explicit **Stage Gate Review** containing measurable acceptance criteria before proceeding to the next stage.

```
[Phase 1] Foundation & Specification  <-- (COMPLETED)
    │
[Phase 2] Core Domain & Deterministic Simulation Engine (Spring Boot / Java 21) <-- (COMPLETED)
    │
[Phase 3] Real-Time Telemetry Stream & Command Pipeline (WebSockets / STOMP) <-- (COMPLETED)
    │
[Phase 4] Failure Lab & Six-Domain Anomaly Engine <-- (COMPLETED)
    │
[Phase 5] Persistence, Security & Operational Reliability (Flyway / JPA / RBAC) <-- (COMPLETED - 60% MILESTONE)
    │
[Phase 6] Space Imagery Data Gateway & Mission Archive (NASA Image & Video Library) <-- (COMPLETED - 67% MILESTONE)
    │
[Phase 7] Interactive Space Imagery Experience & NASA Integration (React / TS / Vite) <-- (COMPLETED - 75% MILESTONE)
    │
[Phase 8] Mission Control Console & Three.js 3D Orbital Scene Integration
    │
[Phase 9] Integrated Operations Console Workflows & Telemetry Strip Charts
    │
[Phase 10] Performance Optimization, Integration Testing & Portfolio Packaging
```

---

## Phase Details & Measurable Stage Gates

### Phase 1: Foundation & Specification (COMPLETED)
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

### Phase 3: Real-Time Telemetry Stream & Command Pipeline [COMPLETED]
- **Goal:** Implement STOMP over WebSocket streaming, synchronized fleet frames, command validation/execution lifecycles, idempotency cache, auditable history, and Failure Lab extension points.
- **Deliverables:**
  - [x] WebSocket STOMP broker configuration with `/ws/simulation` (standard WebSocket and SockJS fallback).
  - [x] Synchronized `FleetTelemetryFrame` broadcasts ensuring zero time-skew across all spacecraft.
  - [x] Initial simulation snapshot delivery immediately upon topic subscription (`WebSocketSubscriptionListener`).
  - [x] Bounded in-memory command history and idempotency cache (`CommandHistoryService`).
  - [x] Command dispatcher with COMMS blackout checking, validation, and optical capture contract (`REQUEST_OPTICAL_CAPTURE`).
  - [x] Simulation and telemetry domain event broadcaster (`/topic/events`).
  - [x] Failure Lab extension points: `AnomalyManager`, `AnomalyModifier`, `SubsystemType`.
  - [x] Decoupled continuous simulation scheduler (`ContinuousSimulationScheduler`).
  - [x] Frontend API & streaming contracts documentation (`docs/MISSION_CONTROL_API.md`).
- **Stage Gate 3 Acceptance Criteria:**
  1. [x] WebSockets stream synchronized `FleetTelemetryFrame` records with identical epoch across all craft.
  2. [x] Commands support validated states: `ACCEPTED`, `REJECTED`, `EXECUTED`, `FAILED` with auditable history.
  3. [x] Idempotency cache detects duplicate submissions (`clientCommandId`) and returns cached execution result with `idempotentReplay: true`.
  4. [x] Invalid commands (e.g., optical capture during eclipse or <30% battery) rejected with explicit messages.
  5. [x] Test coverage: 73/73 unit and integration tests passing cleanly across WebSocket, commands, anomalies, and orbital propagation.

---

### Phase 4: Failure Lab & Six-Domain Anomaly Engine [COMPLETED]
- **Goal:** Implement the authoritative Failure Lab engine across all 6 spacecraft subsystem domains (EPS, COMMS, TCS, ADCS, PROP, OBC) with observable physical progression, centralized threshold detection, anti-flapping, and validated recovery procedures.
- **Deliverables:**
  - [x] Full failure lifecycle state machine: `INJECTED` $\rightarrow$ `ACTIVE` $\rightarrow$ `DETECTED` $\rightarrow$ `RECOVERING` $\rightarrow$ `RECOVERED` (or `FAILED` / `CLEARED`).
  - [x] Subsystem domain state models: `EpsSubsystemState`, `TcsSubsystemState`, `AdcsSubsystemState`, `CommsSubsystemState`, `PropSubsystemState`, `ObcSubsystemState`, encapsulated in `SpacecraftSubsystems`.
  - [x] Scenario catalog containing 13 scenarios across all 6 domains (`FaultScenarioCode`).
  - [x] Centralized detection engine (`FaultDetectionEngine`) with configurable thresholds, hysteresis, and duplicate alert suppression (anti-flapping).
  - [x] Observable physical consequences per simulation step in `SimulationEngine.step()`.
  - [x] Validated recovery procedure engine (`RecoveryActionType`) with precondition checking.
  - [x] Separation of alert clearance from physical hardware repair (clearing an alert never magically fixes hardware).
  - [x] Spacecraft command restrictions: COMMS blackout rejects telecommands, OBC restart locks out processing, ADCS pointing error (> 1.0°) rejects optical captures.
  - [x] Failure Lab REST endpoints (`/api/v1/faults/scenarios`, `/api/v1/faults`, `/api/v1/faults/inject`, `/api/v1/faults/{id}/recover`, `/api/v1/faults/{id}`, `/api/v1/spacecraft/{id}/subsystems`).
  - [x] Real-time event dispatch over STOMP topic `/topic/events` and rich telemetry on `/topic/telemetry`.
  - [x] Comprehensive automated test suite (89 passing tests, 0 failures, 0 errors).
- **Stage Gate 4 Acceptance Criteria:**
  1. [x] Triggering an anomaly perturbs the authoritative simulation state (e.g. ADCS increases pointing error, TCS elevates radiator temperature, EPS increases bus load and triggers load shedding, PROP leaks propellant, OBC restarts processor).
  2. [x] Observable physical consequences appear in the telemetry stream within 1 broadcast cycle.
  3. [x] Recovery command sequences return subsystems back to nominal state predictably and reject invalid actions.
  4. [x] Clearing alerts does not falsely repair hardware; isolation between fleet spacecraft is maintained.
  5. [x] Test coverage: 89/89 automated tests passing with zero failures.

---

### Phase 5: Persistence, Security & Operational Reliability [COMPLETED] (60% Milestone)
- **Goal:** Implement persistent storage boundaries, database schema migrations via Flyway, and robust server-enforced role-based access control (RBAC) to ensure operational reliability and security across restarts.
- **Deliverables:**
  - [x] **Durable Persistence Boundary:** Separated ephemeral high-frequency simulation tick state from durable operational ledger.
    - Durable: Spacecraft fleet catalog, command execution history & idempotency cache, Failure Lab fault records with full lifecycle history & operator attribution, monotonically sequenced operational audit events, periodic sampled telemetry snapshots.
    - Ephemeral: Real-time 5 Hz Keplerian propagation state and high-frequency in-memory ring buffers.
  - [x] **PostgreSQL & Flyway Migrations:** Versioned migration `V1__initial_schema.sql` creating relational schema (`spacecraft_records`, `command_records`, `fault_records`, `simulation_event_records`, `telemetry_snapshots`) with foreign keys, JSONB-compatible columns, and lookup indexes (`idx_cmd_client_id`, `idx_cmd_spacecraft`, `idx_fault_spacecraft`, `idx_fault_lifecycle`, `idx_events_seq`, `idx_telem_snap_sc_time`).
  - [x] **Database Isolation & Migration Testing:** Flyway baseline configuration configured (`table: astra_migrations`, `baseline-version: 0`). Hermetic in-memory test datasource configuration in `maven-surefire-plugin` ensures test suites run without external dependencies, while production integrates cleanly with live PostgreSQL/Neon/Supabase instances.
  - [x] **Restart Survivability & Idempotency Recovery:** `CommandHistoryService` restores command history and idempotency cache on startup; duplicate submissions return cached results even after server restart. `FailureLabService` restores fault ledger on startup while leaving physical hardware nominal on fresh restart. `EventBroadcaster` resumes monotonically increasing sequence numbers from database ledger (`max(sequenceNumber) + 1`).
  - [x] **Telemetry Archival Policy:** `TelemetryArchiveService` samples authoritative fleet telemetry every 30 seconds into `telemetry_snapshots` with automatic retention pruning (retaining up to 50,000 historical records) to avoid uncontrolled database growth.
  - [x] **Spring Security & RBAC Foundation:**
    - Role hierarchy: `VIEWER`, `OPERATOR`, `FLIGHT_DIRECTOR`, `ADMIN`.
    - Authorization boundaries:
      - Public/Viewer: `/actuator/health`, `/actuator/info`, `/ws/**`, `GET /api/v1/simulation/status`, `GET /api/v1/spacecraft/**`, `GET /api/v1/faults/**`, `GET /api/v1/commands/**`, `GET /api/v1/events/**`.
      - Operator (`ROLE_OPERATOR`): Telecommand submission (`POST /api/v1/commands/**`), simulation clock advance (`POST /api/v1/simulation/advance`), simulation pause/resume (`POST /api/v1/simulation/pause`, `POST /api/v1/simulation/resume`).
      - Flight Director (`ROLE_FLIGHT_DIRECTOR`): Failure Lab fault injection (`POST /api/v1/faults/inject`), recovery actions (`POST /api/v1/faults/*/recover`), alert clearance (`DELETE /api/v1/faults/*`), legacy anomaly injection/clearing (`POST /api/v1/anomalies/inject`, `DELETE /api/v1/anomalies/*`).
      - Admin (`ROLE_ADMIN`): Cold simulation initialization (`POST /api/v1/simulation/initialize`), continuous autonomous scheduler control (`POST /api/v1/simulation/continuous/*`).
    - Operator attribution: Captured via `SecurityUtils.getCurrentOperatorUsername()` and permanently recorded in command execution and fault lifecycle audit records.
    - Custom JSON security responses conforming to `ApiErrorResponse` for HTTP 401 Unauthorized and HTTP 403 Forbidden.
    - Environment-driven BCrypt credentials (`ASTRA_SECURITY_*`) outside source control.
  - [x] **Automated Test Suite Expansion:** 103 backend automated tests passing cleanly with zero failures (including 14 dedicated persistence, RBAC, and restart recovery tests).
- **Stage Gate 5 Acceptance Criteria:**
  1. [x] Application successfully boots, applies Flyway migrations, and connects to relational database.
  2. [x] Command executions, idempotency records, fault histories, and audit events persist across application restarts.
  3. [x] Privileged operations (telecommand dispatch, fault injection, fault recovery, simulation control) strictly reject unauthenticated (401) and unauthorized (403) callers.
  4. [x] Telemetry snapshot policy prunes older snapshots and prevents high-frequency database bloat.
  5. [x] Test coverage: 103/103 automated tests passing with zero failures.

---

### Space Imagery — Future Design Brief (Preserved Specification)

> [!IMPORTANT]
> The frontend source code remains intentionally visually frozen in this phase. The following requirements represent the approved future design brief for the Space Imagery experience to be implemented when frontend visual work resumes.

#### Overall Experience
A cinematic, immersive planetary journey featuring rotating planets, carefully changing environments, and real space imagery.

#### Alternating Desktop Composition
- **Mercury:** Planet globe positioned on the left; spacecraft, mission, and imagery options on the right.
- **Venus:** Planet globe positioned on the right; mission and imagery options on the left.
- **Earth, Mars, and subsequent destinations:** Continue alternating sides to establish a deliberate visual rhythm and avoid repetitive generic cards.

#### Navigation and Content
- Smooth transitions between planetary sections.
- Transition choreography will be designed and reviewed with the user after an initial interactive implementation is visible.
- Planet-specific mission discovery powered by verified spacecraft and mission records.
- Authentic rover and spacecraft photography where supported by the source (NASA Image and Video Library / GIBS).
- Progressively loaded, randomized image galleries with proper attribution and duplicate avoidance.

#### Mobile Requirements
- Design specifically for mobile viewports rather than merely shrinking down the desktop layout.
- Preserve the alternating storytelling rhythm through deliberate responsive composition.
- Touch-friendly mission controls, readable typography, and performant planetary rendering.
- Respect `prefers-reduced-motion` user preferences and provide a graceful fallback experience if WebGL/3D rendering is unavailable.

#### Scope Boundary
The user will provide further visual direction when frontend development resumes. Do not invent final transitions or prematurely finalize the planetary visual design.

---

### Phase 6: Real Space Imagery Data Gateway & Mission Archive [COMPLETED] (67% Milestone)
- **Goal:** Implement the authoritative backend gateway to NASA's public Image and Video Library (`images-api.nasa.gov`), build resilient in-memory caching and error handling, establish verified planetary mission metadata with alternating layout composition rules, and prepare frontend integration boundaries.
- **Deliverables:**
  - [x] **NASA Image and Video Library Client:** [`DefaultNasaImageLibraryClient`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/backend/src/main/java/org/astra/imagery/client/DefaultNasaImageLibraryClient.java) integrating `https://images-api.nasa.gov` endpoints (`/search`, `/asset/{nasa_id}`, `/metadata/{nasa_id}`) using Spring's fluent `RestClient` with configurable connection (5s) and read (10s) timeouts.
  - [x] **Resilient In-Memory Caching:** [`BoundedTimedCache`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/backend/src/main/java/org/astra/imagery/cache/BoundedTimedCache.java) providing thread-safe LRU capacity eviction (500 items) and Time-To-Live expiration (15 minutes). Prevents upstream NASA rate-limiting and delivers sub-10ms response times for repeated queries.
  - [x] **Stable ASTRA API Gateway Endpoints:**
    - `GET /api/v1/imagery/search`: Paginated multi-field search (query, page, pageSize, mediaType, yearStart, yearEnd, center, planet).
    - `GET /api/v1/imagery/record/{nasaId}`: Detailed media item inspection with description, metadata, keywords, preview links, and source attribution.
    - `GET /api/v1/imagery/assets/{nasaId}`: Comprehensive resolution asset manifest (original TIFF/JPG, large, medium, small, thumb, captions).
    - `GET /api/v1/imagery/destinations`: List of all 9 celestial destinations (Sun + 8 planets) with verified mission records and alternating layout metadata.
    - `GET /api/v1/imagery/destinations/{id}`: Detailed planetary metadata, active rovers, and historical missions.
    - `GET /api/v1/imagery/destinations/{id}/featured`: Curated featured space photography for planetary bodies.
  - [x] **Curated Planetary & Mission Catalog:** [`PlanetaryMissionCatalog`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/backend/src/main/java/org/astra/imagery/service/PlanetaryMissionCatalog.java) covering the Sun and all 8 major planets with verified rovers (Mars: Perseverance, Curiosity, Opportunity, Spirit) and verified missions (Parker, SOHO, SDO, MESSENGER, Mariner 10, BepiColombo, Magellan, Akatsuki, Terra, Aqua, Landsat 9, Juno, Galileo, Voyager 1/2, Cassini, Pioneer 11, HST, JWST).
  - [x] **Alternating Layout Rules Embedded:** Embedded metadata for alternating desktop storytelling rhythm:
    - Mercury: `LEFT_PLANET` (planet on left, mission options on right)
    - Venus: `RIGHT_PLANET` (planet on right, mission options on left)
    - Earth, Mars, Jupiter, Saturn, Uranus, Neptune continue alternating sides.
  - [x] **Security Configuration:** Configured public read-only access for `GET /api/v1/imagery/**` in `SecurityConfig`, preserving strict RBAC on telecommands, fault injection, and simulation engine controls.
  - [x] **Frontend Integration Readiness:** Built frontend TypeScript definitions ([`frontend/src/types/imagery.ts`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/types/imagery.ts)) and typed API client ([`frontend/src/api/imageryApi.ts`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/api/imageryApi.ts)).
  - [x] **Automated Test Suite Expansion:** 127 total backend tests passing cleanly (24 new tests covering NASA client mocking, cache TTL and LRU eviction, DTO parsing, error mapping, and MockMvc REST integration).
- **Stage Gate 6 Acceptance Criteria:**
  1. [x] Search queries execute cleanly against NASA API with pagination, query encoding, and input validation.
  2. [x] Asset manifest endpoint resolves and categorizes available resolutions (original, large, medium, small, thumb).
  3. [x] In-memory cache returns sub-10ms responses for cached queries without redundant NASA network roundtrips.
  4. [x] Upstream failures (404, 500, timeouts) are mapped cleanly into standardized `ApiErrorResponse` (404, 502, 504) without leaking stack traces.
  5. [x] Curated mission records clearly distinguish verified metadata from raw upstream search results.
  6. [x] Zero API keys or secrets exposed or required for public NASA archive queries.
  7. [x] Test coverage: 127/127 automated backend tests passing with zero failures.

---

### Frontend Integration Gap Analysis & Milestone Transition

> [!NOTE]
> **Audit of Current Frontend State:**
> - When the user selects "Enter Space Imagery" or "Enter Mission Control" on the landing page, `App.tsx` opens [`EntryModal.tsx`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/ui/EntryModal.tsx).
> - This modal displays static informational briefing text: `'II. Space Imagery — Astronomical Archives'` and `'ENGINEERING STAGE GATE: PHASE 5 SCHEDULED'` with an `'ACKNOWLEDGE & RETURN'` button.
> - There are currently no connected frontend routes or page components that consume backend API endpoints.
> - **Phase 6 Deliverable:** Defined and verified the backend gateway (`/api/v1/imagery/*`) and authored the typed frontend client (`frontend/src/api/imageryApi.ts`).
> - **Phase 7 Plan:** Replace the placeholder briefing modal with the interactive planetary journey and connect real NASA imagery streaming into the UI while keeping the existing landing page and aesthetic preserved.

---

---

### Phase 7: Interactive Space Imagery Experience & NASA Integration (COMPLETED - 75% MILESTONE)
- **Goal:** Transform the static stage-gate modal into a functional, immersive planetary exploration journey consuming real NASA archives from the ASTRA backend gateway while preserving the approved landing page visual design.
- **Implemented Deliverables:**
  - [x] **Preserved Landing Page Integrity:** Zero visual modifications to the approved Earth scene, starfield, meteor animations, wordmark dissolution field, or footer.
  - [x] **Seamless View Navigation:** Selecting Space Imagery cleanly transitions to [`SpaceImageryView`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/imagery/SpaceImageryView.tsx). Selecting Mission Control continues to open the flight readiness briefing modal.
  - [x] **Return to Home & Deep-Linking:** Prominent `← RETURN TO ASTRA` button with keyboard Escape support and browser hash history (`#space-imagery`) synchronization.
  - [x] **Solar System Navigator:** Sticky orbital selector ([`SolarSystemNavigator`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/imagery/SolarSystemNavigator.tsx)) enabling rapid jumping across all celestial destinations (☉ Sol through ♆ Neptune).
  - [x] **Alternating Desktop Composition:** Strictly enforced alternating rhythm:
    - Sun: Heroic central celestial introduction with solar corona flare.
    - Mercury: Visual on Left, mission archive & imagery on Right.
    - Venus: Visual on Right, mission archive & imagery on Left.
    - Earth, Mars, Jupiter, Saturn, Uranus, Neptune continuing in alternating discipline.
  - [x] **Intentional Mobile Layout:** Narrow viewports ($< 960\text{px}$) transition into a single-column stacked narrative with centered celestial spheres, eliminating horizontal overflow and awkward text wrapping.
  - [x] **Planetary Visual Spheres:** [`PlanetVisual`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/imagery/PlanetVisual.tsx) with 3D WebGL procedural rotating spheres, tailored planetary color temperatures, custom directional lighting, ring geometries (Saturn, Uranus), and an automatic tactical 2D SVG/CSS fallback for environments without WebGL.
  - [x] **Mars Surface Units Showcase:** [`RoverShowcase`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/imagery/RoverShowcase.tsx) surfacing real rover missions (**Curiosity** at Gale Crater and **Perseverance** at Jezero Crater) with scientific payload tags (Mastcam-Z, ChemCam, PIXL, MOXIE, etc.) and direct imagery search triggers.
  - [x] **Real NASA Imagery Integration:** [`DestinationImageryGrid`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/imagery/DestinationImageryGrid.tsx) streaming verified NASA photography via `/api/v1/imagery/destinations/{id}/featured` and `/api/v1/imagery/search`.
  - [x] **High-Resolution Image Inspector:** [`ImageDetailModal`](file:///c:/Users/sk699/OneDrive/Desktop/java/springboot/Astra/frontend/src/components/imagery/ImageDetailModal.tsx) displaying full scientific descriptions, capture dates, NASA IDs, centers, attribution, and direct resolution asset links (Original raw, 4K Large, Medium, Small) via `/api/v1/imagery/assets/{nasaId}`.
  - [x] **Global Archive Search:** Free-form keyword search bar querying the live NASA image gateway with query clearing and dedicated search results drawer.
  - [x] **Comprehensive Automated Testing:** 18 passing frontend tests across `EarthLanding.test.tsx` (9) and `SpaceImagery.test.tsx` (9) verifying navigation, catalog rendering, fallback display, search dispatch, and modal lifecycle.
- **Stage Gate 7 Acceptance Criteria:**
  1. [x] Selecting Space Imagery opens the actual exploration experience without static stage-gate strings ("Phase 5 Scheduled", "Archives and Files", "Acknowledge & Return").
  2. [x] Planetary journey adheres strictly to the alternating desktop composition and stacked responsive mobile layout.
  3. [x] Real NASA imagery and descriptive metadata rendered with authentic source attributions.
  4. [x] Image detail inspection loads direct resolution links from backend asset manifests.
  5. [x] All 18 frontend tests and 127 backend tests pass cleanly with successful production builds.

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
