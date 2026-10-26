# ASTRA — Mission Lifecycle & Persistent Operations Specification

**Document Version:** 1.0.0  
**Status:** Implemented & Verified  
**Milestone:** Major Implementation Milestone — Mission Lifecycle & Persistent Operations  
**Repository:** Astra

---

## 1. Architectural Overview

The ASTRA Mission Universe operates a server-authoritative operational workflow coordinating mission definitions, live spacecraft telemetry binding, simulation run evaluations, and durable operational history.

```
       [ Client Browser ]
               │
        REST / STOMP
               ▼
   [ MissionController ] ◄──── Security Context (Operator / Flight Director)
               │
      @Transactional
               ▼
      [ MissionService ] ◄──── [ DestinationCompatibilityValidator ]
        │            │
        ▼            ▼
[ SimulationEngine ] [ JPA Persistence Layer ]
   (Physical Bus &      (PostgreSQL / Flyway / H2)
    Orbital Ephemeris)   ├── mission_definitions
                         └── mission_runs
```

---

## 2. Mission State Machine & Transition Rules

### 2.1 States
- **`AVAILABLE`**: The mission definition exists in the catalog, is compatible with its assigned spacecraft, and is ready for launch.
- **`ACTIVE`**: Exactly one interactive simulation run is in progress. Authoritative telemetry streams and telecommands are bound to this vehicle.
- **`COMPLETED`**: Terminal state. Authoritative physical subsystem telemetry and gate criteria were evaluated and passed.
- **`FAILED`**: Terminal state. Severe telemetry excursion, power depletion, or emergency `SAFE_MODE` triggered during run.
- **`ABORTED`**: Terminal state. Manually aborted by flight controller or resolved by startup recovery supervisor.

### 2.2 Transition Rules & Invariants
```
                  ┌──────────────┐
                  │  AVAILABLE   │
                  └──────┬───────┘
                         │
             launch()    │ (Destination Compatibility Verified)
                         ▼
                  ┌──────────────┐
                  │    ACTIVE    │◄────────── (Repeating launch is idempotent)
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
 evaluate()       evaluate()          abort()
(all passed)     (gate failed)            │
        │                │                │
        ▼                ▼                ▼
 ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 │  COMPLETED  │  │   FAILED    │  │   ABORTED   │
 └─────────────┘  └─────────────┘  └─────────────┘
  [Terminal]       [Terminal]       [Terminal]
        │
        └───────── (Relaunching completed mission strictly rejected: 409 Conflict)
```

1. **Single-Active-Run Policy**:
   - The simulation session allows at most one `ACTIVE` mission run at any instant across the system.
   - Launching an active mission again with the identical `missionId` is **idempotent** and returns the existing run without duplicate records.
   - Attempting to start a different mission while one is in progress requires `abortActive=true` (or `/switch`), otherwise returns `409 Conflict`.
2. **Terminal State Immutability**:
   - An `ABORTED`, `FAILED`, or `COMPLETED` run can never return to `ACTIVE`.
   - Attempting to abort or evaluate an already terminal run returns `400 Bad Request`.
3. **Completed Mission Relaunch Policy**:
   - Relaunching an already completed mission scenario is rejected (`409 Conflict`). Historical achievement remains immutable.

---

## 3. Destination & Spacecraft Compatibility Enforcement

The server-authoritative `DestinationCompatibilityValidator` enforces fleet assignment before allowing scenario registration or launch:

| Destination Group | Allowed Spacecraft (Canonical & Operational Fleet) |
|---|---|
| **Earth Orbit** (`EARTH`) | `AURA-1`, `TERRA-OBS`, `SOLIS-RELAY`, `GEO-COM-4`, `NAV-STAR-09`, `DEBRIS-TRAC-2`, `HELIOS-OBS`, `MERIDIAN-RELAY`, `VIGIL-TRACK`, `STRATUS-MET` |
| **Lunar Operations** (`LUNAR`) | `CHANDRA-ORB`, `LUNAR-HALO-1`, `SELENA-MAPPER`, `ARTEMIS-RELAY`, `LUNAR-RECON-X`, `MOON-NAV-01`, `SELENE-MAP`, `POLARIS-LR`, `LUNA-LINK`, `ARGUS-LNAV` |
| **Mars Operations** (`MARS`) | `ARES-ORBITER`, `MARS-RELAY-1`, `PHOBOS-SCOUT`, `DEIMOS-OBS`, `MARS-ATMOS-4`, `AERO-MAP-02`, `AREION-RECON`, `AETHER-MET`, `DEIMOS-RELAY`, `BOREALIS-MAP`, `MRO-ORBITER`, `PERSEVERANCE-RELAY`, `MAVEN-ORBITER` |
| **Outer Planets** (`OUTER`) | `JOVIAN-RADIATION`, `EUROPA-CLIPPER-S`, `EUROPA-CLIPPER`, `CALLISTO-SURVEY`, `CHRONOS-SATURN`, `TITAN-RELAY`, `JOVE-SCOPE`, `ION-GUARD`, `TITAN-ORBIT`, `RHEA-SURVEY`, `CASSINI-O`, `JUICE-EXP` |
| **Solar Operations** (`SOLAR`) | `HELIOS-CORONA`, `SOLAR-STORM-01`, `HELIO-WATCH`, `CORONA-TRACE`, `STORM-SENTINEL`, `FLARE-ALERT`, `PARKER-SOLAR-01`, `SOHO-OBSERVER` |
| **Deep Space** (`DEEP_SPACE`) | `ASTEROID-SCOUT`, `DEEP-NAV-ALPHA`, `VOYAGER-EXP`, `ODYSSEY-NAV`, `VOYAGER-RELAY`, `KEPLER-DRIFT`, `FARPOINT-PROBE`, `VOYAGER-1`, `VOYAGER-2` |

- Incompatible spacecraft assignments are rejected on both `POST /api/v1/missions` and `POST /api/v1/missions/{id}/start` with `400 Bad Request`.
- No silent fallback substitutions are permitted.

---

## 4. Persistence & Database Migrations

### 4.1 Schema
Migrations are forward-only and managed by Flyway:
- `V4__create_missions_schema.sql`: Initial `mission_definitions` and `mission_runs` tables.
- `V5__seed_initial_missions.sql`: Baseline Solar System missions.
- `V6__mission_lifecycle_constraints.sql`: Cleaned orphaned active runs and added composite performance indexes `idx_run_status_started` on `mission_runs(status, started_epoch DESC)` and `idx_mission_runs_mission_started` on `mission_runs(mission_id, started_epoch DESC)`.

### 4.2 Documented Restart Recovery Policy
Because physical Cartesian coordinates and numerical velocity vectors are not serialized per clock tick, ASTRA implements an explicit, transparent recovery policy upon server reboot:
1. **Historical Records Preserved**:
   All runs in terminal status (`COMPLETED`, `FAILED`, `ABORTED`) are immutably hydrated into mission history. They cannot re-activate.
2. **Active Run Recovery**:
   - If zero runs in the database have status `ACTIVE`, the engine initializes clean with no active mission.
   - If one or more runs in the database were marked `ACTIVE` prior to restart:
     - The runs are sorted by `started_epoch DESC` to identify the latest run.
     - If the latest active run's assigned spacecraft is available in the simulation fleet, this run is restored as the authoritative `ACTIVE` mission, re-binding live telemetry streams.
     - Any duplicate or orphaned active runs (or runs where the assigned vehicle is unavailable) are transitioned to `ABORTED` with documented supervisor audit notes:  
       `"Terminated by startup recovery supervisor: Orphaned active run superseded by latest run '{runId}'."`  
       and atomically persisted back to the database.

---

## 5. Frontend Synchronization & UX Integrity

- **Double-Submission Prevention**: All mutation buttons (Launch, Complete, Abort, Create) track asynchronous `isActionRunning` and `isCreating` states to lock buttons during pending operations.
- **Authoritative Reloading**: On action success, `loadMissionsData()` re-fetches authoritative backend state, ensuring Cockpit header, Telemetry workspace, Mission Universe Hub, and Mission History stay synchronized.
- **Destination Scope Integrity**: Switching or launching missions automatically routes the operator to the destination-scoped orbital environment (Earth, Mars, Lunar, Solar, Outer Planets), preventing unrelated celestial models or trajectories from bleeding into view.
