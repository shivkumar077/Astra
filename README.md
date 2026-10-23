# ASTRA — Satellite Operations & Mission Simulation Platform

[![Phase](https://img.shields.io/badge/Phase-1%20Foundation%20%26%20Specification-00E5FF?style=flat-square)](docs/ROADMAP.md)
[![Backend](https://img.shields.io/badge/Backend-Java%2021%20%7C%20Spring%20Boot%203-0A84FF?style=flat-square)](docs/ARCHITECTURE.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Three.js-5856D6?style=flat-square)](docs/ARCHITECTURE.md)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL%20%7C%20Flyway-00E676?style=flat-square)](docs/ARCHITECTURE.md)

**ASTRA** is an aerospace-grade satellite operations, mission simulation, and astronomical imagery exploration platform. Engineered as a long-term technical portfolio project, ASTRA demonstrates deterministic real-time systems engineering, orbital simulation modeling, server-authoritative state management, and an instrument-grade visual interface.

Unlike generic SaaS dashboards, ASTRA pairs mathematical simulation with authentic aerospace console ergonomics and authentic NASA observational archives.

---

## 1. Product Identity & Two Primary Entry Modes

ASTRA provides **strictly two primary entry options** from its home console:

```
+-----------------------------------------------------------------------------------+
|                                  ASTRA CONSOLE                                    |
|                           [ Unified Visual Identity ]                             |
+-----------------------------------------+-----------------------------------------+
|                                         |                                         |
|          1. MISSION CONTROL             |            2. SPACE IMAGERY             |
|                                         |                                         |
|  Operate simulated spacecraft, monitor  |  Explore authentic NASA space photos    |
|  live telemetry, inspect orbits in 3D,  |  and Earth observation layers without   |
|  issue flight commands, investigate     |  operating a mission.                   |
|  subsystem anomalies, and execute       |                                         |
|  simulated camera captures.             |  - NASA Image & Video Library Search    |
|                                         |  - Curated Random Astronomical Photos   |
|  - 5-Craft Interplanetary Fleet         |  - Deep Metadata & Attribution Sheets   |
|  - Real-Time Subsystem Telemetry        |  - NASA GIBS Global Earth Layers        |
|  - Six-Domain Failure Lab Engine        |  - Full-Resolution Asset Inspector      |
|  - 3D Three.js Orbital Viewport         |                                         |
|                                         |                                         |
+-----------------------------------------+-----------------------------------------+
```

---

## 2. Target Technology Stack

### Backend
- **Language & Runtime:** Java 21 (LTS)
- **Framework:** Spring Boot 3.x
- **Build & Dependency Management:** Maven with Maven Wrapper (`./mvnw`)
- **Architecture:** Modular Monolith with strict domain boundaries
- **Real-Time Communication:** WebSockets with STOMP protocol (5 Hz telemetry broadcast)
- **HTTP APIs:** RESTful JSON endpoints for command staging, fleet management, and imagery queries
- **Testing:** JUnit 5, Mockito, AssertJ, Testcontainers

### Frontend
- **Framework & Language:** React 18/19, TypeScript
- **Tooling & Build:** Vite
- **3D Visualization:** Three.js / React Three Fiber for interactive orbital mechanics, planetary bodies, and spacecraft attitude
- **Design System:** Bespoke aerospace instrument CSS design tokens (zero generic SaaS aesthetics)
- **Data Ingestion:** STOMP WebSocket client with decoupled LERP/SLERP interpolation for fluid 60 FPS motion

### Database & Cloud Services
- **Database:** Supabase-hosted PostgreSQL
- **Schema Management:** Version-controlled database migrations via Flyway (`V*.sql`)
- **Security:** Supabase Row Level Security (RLS) policies; zero browser exposure of backend credentials
- **External Data Sources:**
  - NASA Image and Video Library (`images-api.nasa.gov`) for space photography
  - NASA GIBS (Global Imagery Browse Services) for Earth observation tile layers
  - NASA `api.nasa.gov` as an optional, rate-limited supplemental source

---

## 3. Project Structure

```
Astra/
 ├── docs/                         # Engineering specifications & decisions
 │    ├── PRODUCT_SPEC.md          # Full product specification & user journeys
 │    ├── ARCHITECTURE.md          # System boundaries, modular monolith & protocols
 │    ├── DESIGN_DIRECTION.md      # Visual thesis, exact hex palette & typography
 │    ├── ROADMAP.md               # 10-phase staged roadmap with stage gates
 │    ├── DECISIONS.md             # Architecture Decision Records (ADRs)
 │    └── DOMAIN_MODEL.md          # Conceptual entities, telemetry & state machines
 ├── backend/                      # Spring Boot modular monolith (Phase 2+)
 │    └── README.md                # Backend service setup & structure guide
 ├── frontend/                     # React + TypeScript + Three.js client (Phase 6+)
 │    └── README.md                # Frontend setup & development guide
 ├── .env.example                  # Documented environment variable template
 ├── .gitignore                    # Comprehensive build, IDE, and secret exclusions
 └── README.md                     # Project entry overview (this document)
```

---

## 4. Current Development Status

ASTRA is currently at **Phase 1: Foundation and Specification (Complete)**.

- [x] Product identity and dual-entry architecture finalized.
- [x] Architectural boundaries and modular monolith domain layout designed.
- [x] Simulation determinism principles and conceptual domain model specified.
- [x] Six Failure Lab anomaly domains formulated with observable effects.
- [x] Visual direction, exact hex palette (`#08090C`, `#00E5FF`, `#00E676`, etc.), and typography system locked.
- [x] 10-phase engineering roadmap with measurable stage gates established.
- [x] Architecture Decision Records (ADR-001 through ADR-008) approved.
- [x] Environment configuration template and repository exclusions configured.

---

## 5. Future Setup & Development Guide

### Prerequisites (For Future Implementation Phases)
- **Java:** JDK 21 or newer installed
- **Node.js:** Node.js 20+ and npm 10+
- **Docker:** Optional for local PostgreSQL / Testcontainers execution
- **Supabase Account:** For cloud-hosted PostgreSQL (or local Docker container)

### Environment Setup
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Configure database credentials and port bindings in `.env`.

### Planned Execution Commands
- **Backend Service (Phase 2+):**
  ```bash
  cd backend
  ./mvnw spring-boot:run
  ```
- **Frontend Client (Phase 6+):**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

---

## 6. Engineering & Ethical Principles

1. **Simulation Determinism:** Authoritative spacecraft state is computed exclusively by the Spring Boot backend using a monotonic simulation clock. The frontend never invents state.
2. **Strict Demarcation:** Simulated vehicle sensor frames are explicitly badged as `SYNTHETIC / SIMULATED VEHICLE CAPTURE`. Authentic NASA space imagery is explicitly attributed to NASA archives. ASTRA never claims simulated craft are real satellites or that NASA photos were captured by simulated vehicles.
3. **Zero Secret Exposure:** Database service keys and API secrets are never exposed to the client browser.
4. **No Premature Complexity:** We deliberately avoid Kubernetes, microservices, and Kafka in favor of a clean, high-performance modular monolith suitable for single-engineer mastery.

---

## 7. License & Attribution

Designed and engineered as a technical software portfolio project. NASA photography and Earth observation tiles are provided courtesy of NASA under their open public domain guidelines.
