# ASTRA — Architecture Decision Records (ADR)

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Phase 1)  
**Author:** Technical Architecture & Systems Engineering  
**Repository:** Astra

---

## Index of Architecture Decision Records

| ADR ID | Decision Title | Status | Date |
| :--- | :--- | :--- | :--- |
| **ADR-001** | Modular Monolith Architecture (Java 21 / Spring Boot) over Microservices | **Accepted** | 2026-10-24 |
| **ADR-002** | Server-Authoritative Deterministic Simulation Engine | **Accepted** | 2026-10-24 |
| **ADR-003** | WebSocket (STOMP) Protocol for Real-Time Telemetry Streaming | **Accepted** | 2026-10-24 |
| **ADR-004** | Supabase-Hosted PostgreSQL with Flyway Versioned Migrations | **Accepted** | 2026-10-24 |
| **ADR-005** | Strict Dual-Entry User Experience Architecture | **Accepted** | 2026-10-24 |
| **ADR-006** | Multi-Tier NASA Data Source Strategy (NASA Images API + GIBS) | **Accepted** | 2026-10-24 |
| **ADR-007** | Client Three.js Viewport with Decoupled LERP/SLERP Interpolation | **Accepted** | 2026-10-24 |
| **ADR-008** | Shared Authoritative Engine for Failure Lab and Mission Control | **Accepted** | 2026-10-24 |

---

## ADR-001: Modular Monolith Architecture over Microservices

### Context
ASTRA requires high-frequency simulation integration, real-time telemetry distribution, command processing, and external NASA media caching. As an engineering showcase and portfolio project developed by a single engineer, the operational overhead, network latency, and deployment complexity of distributed microservices (with service meshes, distributed tracing, and message brokers like Kafka) would create severe friction without tangible scalability benefits.

### Decision
Build ASTRA as a clean **Modular Monolith** using **Java 21** and **Spring Boot 3.x**. Strict package/domain encapsulation (`core`, `simulation`, `fleet`, `telemetry`, `commands`, `anomalies`, `imagery`, `persistence`) will enforce boundaries, while intra-service communications occur via type-safe in-memory method invocations.

### Consequences
- **Positive:** Nanosecond-level internal data sharing, zero inter-service network serialization, single-command local development, simplified debugging and integration testing.
- **Negative:** Independent scaling of individual modules is not possible without scaling the whole application (acceptable for current single-operator load).
- **Alternatives Considered:**
  - *Microservices with Kafka:* Rejected due to extreme infrastructure overhead and unnecessary operational maintenance for a single developer.
  - *Serverless Functions (AWS Lambda):* Rejected because high-frequency stateful simulation loops (10 Hz) cannot run on ephemeral serverless runtimes.

---

## ADR-002: Server-Authoritative Deterministic Simulation Engine

### Context
Spacecraft physical state (kinematics, battery charge, temperatures, attitude, propellant) could theoretically be computed on the client inside the React browser thread or on the server. If computed in the browser, different clients would diverge, network drops would corrupt state, and testing authoritative business rules (like command validation) would be fragile.

### Decision
The Spring Boot backend is the **sole authoritative source** for simulation time, orbital mechanics, subsystem models, and failure states. The frontend is strictly a visualization and command-dispatch client. The simulation runs deterministically using a monotonic clock and discrete time-stepping.

### Consequences
- **Positive:** 100% reproducible test scenarios, robust command precondition validation, zero client-side cheating or state divergence.
- **Negative:** Requires continuous network connectivity (WebSocket) to receive telemetry updates.
- **Alternatives Considered:**
  - *Client-Side Physics in Three.js:* Rejected because frontend state cannot be trusted for multi-craft telemetry auditing or server-side failure injection.

---

## ADR-003: WebSocket (STOMP) Protocol for Real-Time Telemetry Streaming

### Context
The simulation core updates vehicle state vectors at 10 Hz. Telemetry must be delivered to the client at 5 Hz (200 ms interval) with minimal latency and low network overhead.

### Decision
Use **WebSocket with the STOMP protocol** (Spring WebSocket / SockJS fallback). Telemetry is published to hierarchical topics: `/topic/telemetry/{spacecraftId}`, `/topic/events/{spacecraftId}`, and `/topic/anomalies/{spacecraftId}`. Standard HTTP REST is retained for non-streaming operations (command staging, initial fleet fetching, NASA searches).

### Consequences
- **Positive:** Low-overhead bidirectional communication over a single persistent TCP connection; native topic subscription semantics; seamless integration with Spring messaging.
- **Negative:** Requires maintaining persistent connection state on the server.
- **Alternatives Considered:**
  - *Server-Sent Events (SSE):* Good for unidirectional streaming, but lacks the standardized publish-subscribe channel routing of STOMP.
  - *HTTP Polling (200ms intervals):* Rejected due to excessive HTTP header overhead and socket churn.
  - *gRPC-Web:* Rejected due to client proxy complexity (Envoy) for a browser environment.

---

## ADR-004: Supabase-Hosted PostgreSQL with Flyway Versioned Migrations

### Context
ASTRA requires relational data persistence for spacecraft configurations, mission profiles, historical command logs, anomaly incidents, and cached external metadata.

### Decision
Persist relational state to **Supabase-hosted PostgreSQL** using **Flyway versioned SQL migrations** (`src/main/resources/db/migration/V*.sql`). Spring Data JPA handles object-relational mapping.

### Consequences
- **Positive:** Production-ready PostgreSQL hosting with automated backups; rock-solid schema reproducibility across development and production environments; complete auditability of schema changes.
- **Negative:** Requires internet connectivity to reach Supabase during local dev (mitigated by optional local Docker PostgreSQL profile for offline testing).
- **Security Rule:** The browser never receives Supabase service-role keys or database credentials. Spring Boot acts as the secure, authenticated intermediary.
- **Alternatives Considered:**
  - *Hibernate `ddl-auto=update`:* Rejected because automated schema updates are non-deterministic, error-prone, and unacceptable for professional engineering projects.

---

## ADR-005: Strict Dual-Entry User Experience Architecture

### Context
Product design requires a focused experience without cluttering the interface with disparate cards or navigation confusion. The two core desires of users are operational simulation (Mission Control) and aesthetic exploration (Space Imagery).

### Decision
The top-level application entry provides **strictly two primary entry choices**:
1. **MISSION CONTROL**
2. **SPACE IMAGERY**
No tertiary dashboard options, side-apps, or competing entry modes are permitted.

### Consequences
- **Positive:** Crystal-clear mental model for operators; zero visual clutter; focused engineering narrative for portfolio review.
- **Negative:** Requires careful shared state management when switching between modes.

---

## ADR-006: Multi-Tier NASA Data Source Strategy

### Context
Space Imagery requires reliable access to authentic NASA photography. Relying exclusively on the legacy Astronomy Picture of the Day (APOD) API is risky because:
1. The unauthenticated `DEMO_KEY` is severely throttled (30 req/hour, 50 req/day per IP).
2. APOD frequently returns YouTube videos instead of photographs.
3. APOD does not support rich multi-asset searches or random sampling across planetary missions.

### Decision
Implement a multi-tier NASA integration strategy:
1. **Primary Source:** **NASA Image and Video Library (`images-api.nasa.gov`)**. This REST API is free, requires no API key, returns rich multi-rendition space photography across missions (JWST, Hubble, Mars rovers, Apollo), and allows random sampling.
2. **Earth Observation Source:** **NASA GIBS (Global Imagery Browse Services)** WMTS tile endpoints for authentic satellite Earth layers (MODIS, VIIRS Night Lights).
3. **Fallback/Supplemental:** APOD (`api.nasa.gov`) accessed via a server-side caching proxy with rate-limit protection.

### Consequences
- **Positive:** Resilient, high-volume asset discovery without risk of API key lockout; access to actual mission science photography; zero browser API key leaks.
- **Negative:** Requires maintaining API client DTOs for the NASA Image Library search response schema.

---

## ADR-007: Client Three.js Viewport with Decoupled LERP/SLERP Interpolation

### Context
Rendering orbital trajectories and spacecraft 3D models at 60 FPS while incoming telemetry arrives at 5 Hz could cause visible visual stutter if position and orientation were updated discretely on every packet arrival.

### Decision
Decouple the Three.js 60 FPS animation loop from the 5 Hz WebSocket telemetry stream. The client maintains previous and target state vectors, executing Linear Interpolation (LERP) on positions and Spherical Linear Interpolation (SLERP) on quaternions across the 200 ms interval.

### Consequences
- **Positive:** Visually fluid 60 FPS spacecraft orientation and camera tracking without network-induced jitter.
- **Negative:** Introduces a fixed, imperceptible 200 ms visual delay behind the true server epoch.

---

## ADR-008: Shared Authoritative Engine for Failure Lab and Mission Control

### Context
Failure Lab could be built as an isolated mock simulator separate from Mission Control. However, this would dilute engineering credibility and create dual maintenance burdens.

### Decision
Failure Lab is an operational mode acting directly upon the **identical server simulation engine** as Mission Control. Anomaly injections modify real physical state variables (e.g., thermal resistance coefficients, reaction wheel friction, amplifier gain) within the active simulation loop.

### Consequences
- **Positive:** Genuine systems fidelity; actions taken in Failure Lab directly perturb Mission Control telemetry; recovery commands genuinely resolve anomalies.
- **Negative:** Requires thorough unit and integration testing of subsystem cross-coupling to prevent unrecoverable simulation crashes.

---

## Unresolved Questions & Technical Risks

| Risk / Question | Impact | Mitigation Strategy | Planned Resolution Phase |
| :--- | :--- | :--- | :--- |
| **High-Precision Orbital Perturbations:** Does simplified Keplerian two-body propagation suffice for multi-body flybys? | Minor orbital inaccuracies over simulated months | Use standard Keplerian two-body with J2 zonal harmonic perturbation for LEO; patched conics for interplanetary flybys. | Phase 2 |
| **WebSocket Connection Reconnection:** Browser sleep or network drop disconnects telemetry stream. | Operator UI goes stale | Implement automatic exponential backoff reconnection in the React STOMP client with a visual "Reconnecting..." state. | Phase 3 & 6 |
| **NASA API Availability & CORS:** Does `images-api.nasa.gov` enforce CORS headers that block direct browser requests? | Browser fetch blocked | All NASA requests are proxied and cached through the Spring Boot backend (`/api/v1/imagery/*`), eliminating CORS issues. | Phase 5 |
| **Three.js Asset Memory Consumption:** High-resolution planet texture maps can consume significant GPU VRAM. | Browser tab crash on low-end machines | Use compressed textures (WebP / 2K max resolution) with mipmapping and lazy-loading for outer planets. | Phase 7 |
