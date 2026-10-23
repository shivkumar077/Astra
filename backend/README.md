# ASTRA Backend Service

**Target Stack:** Java 21 | Spring Boot 3.x | Maven | PostgreSQL (Supabase) | WebSockets (STOMP)

## Package Structure Proposal (Phase 2+)

```
backend/
 ├── src/
 │    ├── main/
 │    │    ├── java/org/astra/
 │    │    │    ├── core/                  # Immutable math, coordinate frames, constants
 │    │    │    ├── simulation/            # Clock manager, Keplerian propagator, tick loop
 │    │    │    ├── fleet/                 # Spacecraft definitions, mission profiles
 │    │    │    ├── telemetry/             # Frame serialization, ring buffer, WS broker
 │    │    │    ├── commands/              # Staging, validation, uplink delay, execution
 │    │    │    ├── anomalies/             # 6-domain failure state machines
 │    │    │    ├── camera/                # Simulated optical capture pipeline
 │    │    │    ├── imagery/               # NASA API client, GIBS proxy, caching
 │    │    │    └── persistence/           # JPA entities, repositories, audit log
 │    │    └── resources/
 │    │         ├── db/migration/          # Flyway SQL migrations (V1__...sql)
 │    │         └── application.yml        # Spring Boot environment profiles
 │    └── test/
 │         └── java/org/astra/             # JUnit 5 deterministic simulation tests
 ├── pom.xml                               # Maven project definition
 └── mvnw / mvnw.cmd                       # Maven wrapper executables
```

## Planned Implementation Stage
Implementation begins in **Phase 2: Core Domain & Deterministic Simulation Engine** as defined in [ROADMAP.md](../docs/ROADMAP.md).
