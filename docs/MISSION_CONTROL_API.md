# ASTRA Mission Control API & Streaming Protocol Specification

**Status:** Authoritative Backend Contract  
**Protocol Version:** v1.0.0 (Phase 3)  
**Base REST URL:** `http://localhost:8080/api/v1`  
**WebSocket URL:** `ws://localhost:8080/ws/simulation` (Native STOMP)  
**SockJS Fallback:** `http://localhost:8080/ws/simulation`  

---

## 1. Overview & Architectural Principles

ASTRA's backend operates as a **server-authoritative, deterministic spacecraft operations simulator**. Telemetry is propagated using analytical Keplerian mechanics under coordinate frame `ECI_J2000`.

Key architectural guarantees for Mission Control:
1. **Deterministic Propagation:** Orbital state vectors are derived from invariant base Keplerian orbital elements at epoch $t_0$. Advancing simulation clock by $\Delta t$ always yields the exact same physics state.
2. **Synchronized Fleet Frames:** Every fleet telemetry broadcast publishes all active spacecraft evaluated at the exact same simulation epoch $t$, eliminating clock skew across dashboard widgets.
3. **Command Idempotency:** Commands submitted with a `clientCommandId` are cached. Duplicate transmissions (such as network reconnects or double-clicks) return the cached execution result with `idempotentReplay: true` rather than re-mutating spacecraft state.
4. **Failure Lab Integration:** Simulated subsystem anomalies (such as communication blackouts or solar array degradation) perturb authoritative state without client-side fabrication.
5. **Simulated vs. Real Distinction:** Simulated payload captures (`REQUEST_OPTICAL_CAPTURE`) produce synthetic telemetry records and ledger entries. Real NASA/ESA archived photography and video remain exclusive to the Space Imagery domain.

---

## 2. WebSocket & STOMP Protocol

### 2.1 Connection Handshake
Clients connect using STOMP 1.1/1.2 over standard WebSocket or SockJS:
- **WebSocket Endpoint:** `ws://localhost:8080/ws/simulation`
- **Application Destination Prefix:** `/app`
- **Broker Destination Prefixes:** `/topic`, `/queue`

```typescript
import { Client } from '@stomp/stompjs';

const client = new Client({
  brokerURL: 'ws://localhost:8080/ws/simulation',
  reconnectDelay: 2000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  onConnect: () => {
    console.log('Connected to ASTRA Simulation Stream');
    subscribeToTopics(client);
  }
});
client.activate();
```

### 2.2 STOMP Topics & Subscription Contract

| Topic Destination | Payload Type | Description |
| :--- | :--- | :--- |
| `/topic/simulation` | `SimulationSnapshotMessage` | Lifecycle state, elapsed time, current simulation epoch, and full fleet details. **Delivered immediately upon subscription**, and whenever lifecycle changes. |
| `/topic/telemetry` | `FleetTelemetryFrame` | Synchronized telemetry frame for all vehicles in the fleet. **Delivered immediately upon subscription**, and after each time advancement step. |
| `/topic/telemetry/{spacecraftId}` | `TelemetrySnapshot` | High-frequency telemetry stream filtered for a single spacecraft (e.g. `/topic/telemetry/AURA-1`). |
| `/topic/events` | `SimulationEvent` | Monotonically sequenced domain events (lifecycle transitions, command executions/rejections, imaging captures, anomalies). |

### 2.3 Initial Snapshot & Reconnection Recovery
When a frontend client connects or reconnects:
1. Client subscribes to `/topic/simulation` and `/topic/telemetry`.
2. The backend `WebSocketSubscriptionListener` immediately intercepts the subscription and pushes the current state snapshot to the client.
3. If disconnected, the client does not need to query REST endpoints to catch up; reconnecting and re-subscribing provides the immediate authoritative snapshot.

---

## 3. Streaming Payloads & Data Schemas

### 3.1 Fleet Telemetry Frame (`/topic/telemetry`)
Guarantees all spacecraft states are synchronized to the exact same simulation epoch.

```json
{
  "simulationEpoch": "2026-10-24T01:15:00Z",
  "elapsedSeconds": 4500.0,
  "lifecycle": "RUNNING",
  "spacecraftCount": 3,
  "fleet": [
    {
      "spacecraftId": "AURA-1",
      "callSign": "AURA-1",
      "timestamp": "2026-10-24T01:15:00Z",
      "positionKm": { "x": 4921.45, "y": -4810.12, "z": 0.0 },
      "velocityKmS": { "x": 5.234, "y": 5.356, "z": 0.0 },
      "altitudeKm": 503.2,
      "speedKmS": 7.61,
      "inEclipse": false,
      "operationalStatus": "NOMINAL",
      "operationalMode": "NOMINAL",
      "batterySocPercent": 98.4,
      "solarArrayWatts": 1200.0,
      "elements": {
        "semiMajorAxisKm": 6878.14,
        "eccentricity": 0.0001,
        "inclinationDeg": 97.4,
        "raanDeg": 45.0,
        "argOfPerigeeDeg": 0.0,
        "trueAnomalyDeg": 285.4
      }
    }
  ]
}
```

### 3.2 Simulation Event (`/topic/events`)
Audit event published across simulation, vehicle, command, and anomaly lifecycles.

```json
{
  "eventId": "e93cb56a-129d-472e-8e01-9231f45cb211",
  "sequenceNumber": 42,
  "type": "COMMAND_EXECUTED",
  "simulationEpoch": "2026-10-24T01:15:00Z",
  "wallClockTimestamp": "2026-10-24T14:15:00.125Z",
  "spacecraftId": "TERRA-OBS",
  "summary": "Command REQUEST_OPTICAL_CAPTURE EXECUTED: Synthetic optical capture successful",
  "details": {
    "commandId": "CMD-0091",
    "type": "REQUEST_OPTICAL_CAPTURE",
    "status": "EXECUTED",
    "idempotentReplay": false,
    "details": {
      "captureId": "CAP-8F4A12B0",
      "target": "Mojave Desert Calibration Grid",
      "altitudeKm": 502.1,
      "groundSampleDistanceMeters": 0.60,
      "sensorType": "HIGH_RES_MULTISPECTRAL_OPTICAL",
      "illuminationCondition": "DIRECT_SUNLIGHT",
      "syntheticClassification": "SIMULATED_TEST_CAPTURE_LEDGER"
    }
  }
}
```

---

## 4. Telecommand Execution & Idempotency

### 4.1 Supported Command Types
- `SET_OPERATIONAL_MODE`: Transitions vehicle mode (`NOMINAL`, `SAFE_MODE`, `SCIENCE_OPERATION`, `COMMUNICATION`, `ORBIT_CORRECTION`, `LOW_POWER`, `DECOMMISSIONED`).
- `TRIGGER_SAFE_MODE`: Puts vehicle in low-power safe orientation, flags status `DEGRADED`.
- `ADVANCE_TIME`: Explicitly steps the deterministic simulation clock by `seconds`.
- `PAUSE_SIMULATION`: Halts simulation propagation.
- `RESUME_SIMULATION`: Resumes simulation propagation.
- `REQUEST_OPTICAL_CAPTURE`: Synthesizes an earth-observation image acquisition.

### 4.2 Idempotency Contract
When submitting commands, frontends should include a client-generated UUID `clientCommandId`:
```json
POST /api/v1/commands
{
  "type": "SET_OPERATIONAL_MODE",
  "spacecraftId": "AURA-1",
  "clientCommandId": "d3b07384-d113-4f27-a006-25816da65842",
  "parameters": {
    "mode": "SCIENCE_OPERATION"
  }
}
```

**First Dispatch Response:**
```json
{
  "commandId": "CMD-20261024-0012",
  "spacecraftId": "AURA-1",
  "type": "SET_OPERATIONAL_MODE",
  "status": "EXECUTED",
  "message": "Operational mode transitioned to SCIENCE_OPERATION",
  "executionEpoch": "2026-10-24T01:15:00Z",
  "idempotentReplay": false
}
```

**Replay Dispatch Response (Identical clientCommandId):**
```json
{
  "commandId": "CMD-20261024-0012",
  "spacecraftId": "AURA-1",
  "type": "SET_OPERATIONAL_MODE",
  "status": "EXECUTED",
  "message": "[IDEMPOTENT REPLAY] Operational mode transitioned to SCIENCE_OPERATION",
  "executionEpoch": "2026-10-24T01:15:00Z",
  "idempotentReplay": true
}
```

---

## 5. Optical Imaging Command Contract (`REQUEST_OPTICAL_CAPTURE`)

Mission Control operators can request a simulated high-resolution optical capture.

### 5.1 Eligibility Validation Gates
The backend strictly evaluates four authoritative physical/operational constraints before approving capture:
1. **Target Existence:** Spacecraft must exist in the fleet.
2. **Operational Mode:** Spacecraft must be in `NOMINAL` or `SCIENCE_OPERATION` mode. (Commands rejected in `SAFE_MODE`, `LOW_POWER`, or `DECOMMISSIONED`).
3. **Illumination Condition:** Spacecraft must NOT be in Earth cylindrical shadow / eclipse (`inEclipse == false`).
4. **Battery Reserve:** Minimum 30.0% State of Charge (SoC) required.
5. **COMMS Link:** Spacecraft must not be subject to an active Failure Lab communications blackout.

### 5.2 Request Payload
```json
POST /api/v1/spacecraft/TERRA-OBS/commands
{
  "type": "REQUEST_OPTICAL_CAPTURE",
  "clientCommandId": "cap-req-001",
  "parameters": {
    "target": "Sahara Impact Crater Cal-Target",
    "sensor": "HIGH_RES_MULTISPECTRAL"
  }
}
```

### 5.3 Outcome Responses
- **Approved & Executed:** Returns status `EXECUTED`, emits `IMAGING_CAPTURE_COMPLETED` event, computes Ground Sample Distance ($GSD = h \times 0.0012$), and deducts synthetic sensor battery charge (0.3%).
- **Rejected (Eclipse):** `Optical capture rejected: Spacecraft is currently in Earth shadow / eclipse; solar illumination required for optical imaging.`
- **Rejected (Battery < 30%):** `Optical capture rejected: insufficient battery charge (24.2% < 30.0% threshold).`
- **Rejected (Safe Mode):** `Optical capture rejected: Spacecraft is in SAFE_MODE mode; cannot perform optical capture.`

---

## 6. Failure Lab REST API & Subsystem Contracts

Allows deterministic simulation of spacecraft subsystem faults, observation of physical telemetry consequences, threshold evaluation, and validated recovery procedures across all 6 domains (EPS, COMMS, TCS, ADCS, PROP, OBC).

### 6.1 Scenarios Catalog
- **Endpoint:** `GET /api/v1/faults/scenarios`
- **Description:** Returns the complete list of 13 supported failure scenarios, default severity, expected recovery action, and supported parameters.

### 6.2 Subsystem Health Inspection
- **Endpoint:** `GET /api/v1/spacecraft/{id}/subsystems`
- **Description:** Returns full authoritative physical metrics across all 6 subsystems for a specific spacecraft, along with active fault IDs.
- **Response Schema:**
  ```json
  {
    "spacecraftId": "AURA-1",
    "callSign": "AURA-1",
    "epoch": "2026-10-24T00:00:00Z",
    "overallStatus": "NOMINAL",
    "subsystems": {
      "eps": {
        "batterySocPercent": 94.5,
        "solarArrayWatts": 1280.0,
        "batteryVoltageVolts": 28.0,
        "busLoadWatts": 380.0,
        "loadSheddingActive": false,
        "solarDegradationMultiplier": 1.0,
        "busOverloadActive": false
      },
      "tcs": {
        "temperatureCelsius": 18.5,
        "heaterActive": false,
        "heaterOperational": true,
        "radiatorEfficiency": 1.0,
        "thermalSafingActive": false
      },
      "adcs": {
        "pointingErrorDegrees": 0.04,
        "attitudeLockStatus": "LOCKED",
        "reactionWheelSpeedRpm": 2450.0,
        "starTrackerLocked": true,
        "wheelFrictionActive": false
      },
      "comms": {
        "linkStatus": "ONLINE",
        "linkMarginDb": 12.4,
        "packetLossPercent": 0.0,
        "carrierLocked": true,
        "blackoutActive": false
      },
      "prop": {
        "propellantMassKg": 280.0,
        "tankPressureBar": 22.0,
        "valveHealth": "NOMINAL",
        "thrustMultiplier": 1.0,
        "leakActive": false
      },
      "obc": {
        "cpuUtilizationPercent": 32.5,
        "memoryUtilizationPercent": 44.0,
        "flightSoftwareState": "NOMINAL",
        "rebootCount": 0,
        "rebootRemainingSeconds": 0.0
      }
    },
    "activeFaultIds": [],
    "activeFaultCount": 0
  }
  ```

### 6.3 Fault Injection
- **Endpoint:** `POST /api/v1/faults/inject`
- **Request Schema:**
  ```json
  {
    "spacecraftId": "AURA-1",
    "scenarioCode": "COMMS_RF_BLACKOUT",
    "severity": "CRITICAL",
    "parameters": {},
    "description": "Simulated carrier lock loss"
  }
  ```
- **Supported Scenario Codes:**
  - `EPS_SOLAR_ARRAY_DEGRADATION`, `EPS_BATTERY_CELL_DEGRADATION`, `EPS_BUS_OVERLOAD`
  - `COMMS_RF_BLACKOUT`, `COMMS_LINK_DEGRADATION`
  - `TCS_HEAT_PIPE_FAILURE`, `TCS_HEATER_CIRCUIT_FAILURE`
  - `ADCS_REACTION_WHEEL_DRAG`, `ADCS_STAR_TRACKER_BLINDING`
  - `PROP_VALVE_LEAK`, `PROP_THRUSTER_COLD`
  - `OBC_CPU_THRASHING`, `OBC_WATCHDOG_RESET`
- **Response:** `201 Created` with full `FaultRecord` payload (`lifecycleState = "ACTIVE"`).

### 6.4 List & Query Faults
- **Endpoint:** `GET /api/v1/faults`
- **Query Parameters (Optional):**
  - `spacecraftId`: Filter by vehicle (e.g. `AURA-1`)
  - `subsystem`: Filter by domain (`EPS`, `COMMS`, `TCS`, `ADCS`, `PROP`, `OBC`)
  - `state`: Filter by lifecycle state (`ACTIVE`, `DETECTED`, `RECOVERED`, `CLEARED`)
- **Single Fault Inspection:** `GET /api/v1/faults/{id}`

### 6.5 Validated Recovery Procedures
- **Endpoint:** `POST /api/v1/faults/{id}/recover`
- **Request Schema:**
  ```json
  {
    "recoveryAction": "RESET_RF_TRANSCEIVER",
    "operatorNote": "Cycled transponder power"
  }
  ```
- **Validation:** Procedure must match `recoveryActionRequired` for the fault scenario. Incompatible recovery attempts return `400 Bad Request`.
- **Response:** `200 OK` with updated `FaultRecord` (`lifecycleState = "RECOVERED"`). Authoritative physical subsystem state is immediately restored to nominal.
- **Alternative Telecommand:** Operators may also dispatch recovery via `POST /api/v1/commands` with `type = "EXECUTE_FAULT_RECOVERY"` and parameters `faultId` and `recoveryAction`.

### 6.6 Clear Alert
- **Endpoint:** `DELETE /api/v1/faults/{id}` or `POST /api/v1/faults/{id}/clear`
- **Semantics:** Clears the active alert from the console ledger. **Does NOT automatically repair the physical subsystem hardware.** The hardware remains degraded until explicitly recovered.
- **Response:** `200 OK` with `cleared: true`, `status: "CLEARED"`.

### 6.7 Legacy Anomaly Extension Endpoints (Backward Compatible)
- `GET /api/v1/anomalies`: List active legacy anomaly modifiers.
- `POST /api/v1/anomalies/inject`: Inject legacy modifier.
- `DELETE /api/v1/anomalies/{anomalyId}`: Clears legacy modifier.

---

## 7. Continuous Simulation Scheduler (Optional Live Mode)

In addition to discrete manual advancement (`POST /api/v1/simulation/advance`), the backend provides a decoupled background ticker that advances simulation time continuously:

- `GET /api/v1/simulation/continuous/status`: Check scheduler status.
- `POST /api/v1/simulation/continuous/start?tickRateHz=2.0&stepSeconds=1.0`: Starts background ticker.
- `POST /api/v1/simulation/continuous/stop`: Stops background ticker.

*Note: The core simulation remains 100% discrete and deterministic; the continuous scheduler simply invokes `simulationEngine.step(Duration)` periodically on an isolated background worker thread.*

---

## 8. Authentication, Authorization & RBAC Specification (Phase 5)

ASTRA enforces server-side Role-Based Access Control (RBAC) on all mutating and privileged operational endpoints using HTTP Basic authentication.

### 8.1 Authentication Header
Privileged HTTP requests must provide an `Authorization` header containing base64-encoded credentials:

```http
Authorization: Basic <base64(username:password)>
```

Example in JavaScript / TypeScript:
```typescript
const credentials = btoa('operator:operator123');
const response = await fetch('http://localhost:8080/api/v1/commands', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`
  },
  body: JSON.stringify(commandPayload)
});
```

### 8.2 Role-Based Access Control (RBAC) Permissions Matrix

| Endpoint | HTTP Method | Minimum Required Role | Description |
| :--- | :--- | :--- | :--- |
| `/actuator/health`, `/actuator/info` | `GET` | *Public* | Service liveness and metadata |
| `/ws/**` | `CONNECT` | *Public* | STOMP WebSocket telemetry stream |
| `/api/v1/simulation/status` | `GET` | *Public / VIEWER* | Current simulation clock, lifecycle, and fleet size |
| `/api/v1/spacecraft/**` | `GET` | *Public / VIEWER* | Orbital states and subsystem diagnostics |
| `/api/v1/commands/**` | `GET` | *Public / VIEWER* | Historical command execution ledger |
| `/api/v1/faults/**` | `GET` | *Public / VIEWER* | Failure Lab scenario catalog and fault records |
| `/api/v1/events/**` | `GET` | *Public / VIEWER* | Monotonically sequenced domain audit log |
| `/api/v1/commands/**` | `POST` | `ROLE_OPERATOR` | Telecommand dispatch (`SET_OPERATIONAL_MODE`, etc.) |
| `/api/v1/spacecraft/*/commands` | `POST` | `ROLE_OPERATOR` | Spacecraft-specific telecommand dispatch |
| `/api/v1/simulation/advance` | `POST` | `ROLE_OPERATOR` | Manual simulation clock step ($\Delta t$) |
| `/api/v1/simulation/pause` | `POST` | `ROLE_OPERATOR` | Pause simulation engine |
| `/api/v1/simulation/resume` | `POST` | `ROLE_OPERATOR` | Resume simulation engine |
| `/api/v1/faults/inject` | `POST` | `ROLE_FLIGHT_DIRECTOR` | Failure Lab fault injection |
| `/api/v1/faults/*/recover` | `POST` | `ROLE_FLIGHT_DIRECTOR` | Command validated recovery procedure |
| `/api/v1/faults/*` | `DELETE` | `ROLE_FLIGHT_DIRECTOR` | Clear active console fault alert |
| `/api/v1/anomalies/inject` | `POST` | `ROLE_FLIGHT_DIRECTOR` | Legacy anomaly injection |
| `/api/v1/anomalies/*` | `DELETE` | `ROLE_FLIGHT_DIRECTOR` | Legacy anomaly clearance |
| `/api/v1/simulation/initialize` | `POST` | `ROLE_ADMIN` | Cold engine re-initialization |
| `/api/v1/simulation/continuous/*` | `POST` | `ROLE_ADMIN` | Start/stop continuous background ticker |

### 8.3 Default Local Credentials & Environment Variables
For local testing and Mission Control development:

| Role | Default Username | Default Password | Environment Variables |
| :--- | :--- | :--- | :--- |
| `ROLE_VIEWER` | `viewer` | `viewer123` | `ASTRA_SECURITY_VIEWER_USERNAME`, `ASTRA_SECURITY_VIEWER_PASSWORD` |
| `ROLE_OPERATOR` | `operator` | `operator123` | `ASTRA_SECURITY_OPERATOR_USERNAME`, `ASTRA_SECURITY_OPERATOR_PASSWORD` |
| `ROLE_FLIGHT_DIRECTOR` | `director` | `director123` | `ASTRA_SECURITY_DIRECTOR_USERNAME`, `ASTRA_SECURITY_DIRECTOR_PASSWORD` |
| `ROLE_ADMIN` | `admin` | `admin123` | `ASTRA_SECURITY_ADMIN_USERNAME`, `ASTRA_SECURITY_ADMIN_PASSWORD` |

*Security Rule: In production environments, passwords must be supplied via environment variables; default passwords must never be deployed.*

### 8.4 Standard Security Error Responses

#### HTTP 401 Unauthorized
Returned when authentication credentials are missing or invalid:
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource",
  "path": "/api/v1/commands",
  "timestamp": "2026-10-24T16:00:00Z"
}
```

#### HTTP 403 Forbidden
Returned when an authenticated principal lacks the required role:
```json
{
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied: insufficient operational privileges for this action",
  "path": "/api/v1/faults/inject",
  "timestamp": "2026-10-24T16:00:00Z"
}
```

### 8.5 Operator Principal Audit Recording
When a privileged command or fault action is submitted, the backend captures the authenticated operator principal and permanently persists it:
- `CommandRecord.operatorUsername`: Operator who dispatched the command.
- `FaultRecord.operatorUsername`: Flight Director who injected or recovered the fault.
- `SimulationEvent.parameters["operatorUsername"]`: Included in STOMP broadcast and database event ledger.

---

## 9. Space Imagery & Mission Archive APIs (Phase 6)

ASTRA Phase 6 introduces high-fidelity space imagery discovery powered by NASA's public Image and Video Library (`images-api.nasa.gov`), wrapped in standardized, cached, and validated ASTRA API contracts.

### 9.1 Access Policy & Rate Limiting
- All `/api/v1/imagery/**` endpoints are **publicly accessible** without authentication tokens or Basic Auth.
- External upstream requests to NASA are cached server-side in a bounded, thread-safe cache (500 items capacity, 900-second TTL). Repeated queries are served from memory in single-digit milliseconds ($< 10\text{ms}$).
- Upstream network errors and timeouts are translated into standardized RFC 7807 `ApiErrorResponse` payloads without exposing raw stack traces.

### 9.2 Search Astronomical Imagery
`GET /api/v1/imagery/search`

Performs paginated search across NASA's multimedia archives.

#### Query Parameters:
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | No | `""` | Search query (planet, rover, nebula, mission, keyword). |
| `page` | `int` | No | `1` | Page number ($1$-indexed). Must be $\ge 1$. |
| `mediaType` | `string` | No | `image` | Comma-separated media types: `image`, `video`, `audio`. |
| `yearStart` | `int` | No | `null` | Optional earliest year filter (e.g. `1990`). |
| `yearEnd` | `int` | No | `null` | Optional latest year filter (e.g. `2026`). |

#### Response: `200 OK`
```json
{
  "query": "mars rover curiosity",
  "currentPage": 1,
  "pageSize": 100,
  "totalHits": 4820,
  "totalPages": 49,
  "hasMore": true,
  "items": [
    {
      "nasaId": "PIA16225",
      "title": "Curiosity at Work at 'Rocknest'",
      "description": "This self-portrait of NASA's Curiosity rover combines dozens of exposures taken by the Mars Hand Lens Imager (MAHLI)...",
      "dateCreated": "2012-11-01T00:00:00Z",
      "mediaType": "image",
      "center": "JPL",
      "photographer": null,
      "secondaryCreator": "NASA/JPL-Caltech/MSSS",
      "thumbnailUrl": "https://images-assets.nasa.gov/image/PIA16225/PIA16225~thumb.jpg",
      "assetManifestUrl": "/api/v1/imagery/assets/PIA16225",
      "keywords": [
        "Mars",
        "Mars Science Laboratory (MSL)",
        "Curiosity",
        "Rocknest"
      ]
    }
  ]
}
```

---

### 9.3 Retrieve Single Media Record
`GET /api/v1/imagery/record/{nasaId}`

Retrieves canonical metadata for a single specific NASA asset.

#### Path Parameters:
- `nasaId` (`string`, required): Unique NASA archive identifier (e.g., `PIA16225`).

#### Response: `200 OK`
Returns the single `SpaceImageryItem` JSON object.

#### Response: `404 Not Found`
Returned when the requested NASA asset ID does not exist:
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Imagery record not found with NASA ID: NONEXISTENT_ID",
  "path": "/api/v1/imagery/record/NONEXISTENT_ID",
  "timestamp": "2026-10-24T21:00:00Z"
}
```

---

### 9.4 Retrieve Direct Asset Manifest
`GET /api/v1/imagery/assets/{nasaId}`

Resolves direct CDN links across resolutions for high-resolution gallery display, modal previews, and scientific download.

#### Path Parameters:
- `nasaId` (`string`, required): Unique NASA archive identifier.

#### Response: `200 OK`
```json
{
  "nasaId": "PIA16225",
  "original": "https://images-assets.nasa.gov/image/PIA16225/PIA16225~orig.jpg",
  "large4k": "https://images-assets.nasa.gov/image/PIA16225/PIA16225~large.jpg",
  "medium": "https://images-assets.nasa.gov/image/PIA16225/PIA16225~medium.jpg",
  "small": "https://images-assets.nasa.gov/image/PIA16225/PIA16225~small.jpg",
  "thumb": "https://images-assets.nasa.gov/image/PIA16225/PIA16225~thumb.jpg",
  "metadataJson": "https://images-assets.nasa.gov/image/PIA16225/metadata.json",
  "allUrls": [
    "https://images-assets.nasa.gov/image/PIA16225/PIA16225~orig.jpg",
    "https://images-assets.nasa.gov/image/PIA16225/PIA16225~large.jpg",
    "https://images-assets.nasa.gov/image/PIA16225/PIA16225~medium.jpg",
    "https://images-assets.nasa.gov/image/PIA16225/PIA16225~small.jpg",
    "https://images-assets.nasa.gov/image/PIA16225/PIA16225~thumb.jpg",
    "https://images-assets.nasa.gov/image/PIA16225/metadata.json"
  ]
}
```

---

### 9.5 Celestial Destinations Catalog
`GET /api/v1/imagery/destinations`

Retrieves the curated planetary exploration catalog spanning the Sun and all 8 major planets. Includes layout composition cues (`layoutAlignment: "LEFT" | "RIGHT" | "CENTER"`) for frontend visual storytelling.

#### Response: `200 OK`
```json
[
  {
    "id": "sun",
    "name": "Sun",
    "orderFromSun": 0,
    "destinationType": "Star",
    "layoutAlignment": "CENTER",
    "briefDescription": "The yellow dwarf star at the center of the Solar System...",
    "detailedOverview": "Contains 99.86% of the mass in the Solar System...",
    "distanceFromSun": "0 km (Center)",
    "surfaceTemperature": "5,500°C (Photosphere) / 15,000,000°C (Core)",
    "orbitalPeriod": "230 Million Earth Years (Galactic Orbit)",
    "missions": [
      {
        "name": "Parker Solar Probe",
        "agency": "NASA",
        "launchYear": 2018,
        "operationalStatus": "Active",
        "description": "Humanity's first mission to 'touch the Sun'...",
        "verified": true,
        "sourceAttribution": "NASA Goddard Space Flight Center"
      }
    ],
    "rovers": [],
    "sampleQueries": ["Sun Parker Solar Probe", "Sun solar flare SDO"]
  },
  {
    "id": "mercury",
    "name": "Mercury",
    "orderFromSun": 1,
    "destinationType": "Terrestrial Planet",
    "layoutAlignment": "LEFT",
    ...
  },
  {
    "id": "venus",
    "name": "Venus",
    "orderFromSun": 2,
    "destinationType": "Terrestrial Planet",
    "layoutAlignment": "RIGHT",
    ...
  },
  {
    "id": "mars",
    "name": "Mars",
    "orderFromSun": 4,
    "destinationType": "Terrestrial Planet",
    "layoutAlignment": "RIGHT",
    "rovers": [
      {
        "name": "Curiosity (MSL)",
        "agency": "NASA / JPL",
        "landingDate": "2012-08-06",
        "landingSite": "Gale Crater",
        "status": "Active (Operating over 4,000 sols)",
        "scientificPayload": "MAHLI, ChemCam, SAM, CheMin, Mastcam",
        "verified": true
      },
      {
        "name": "Perseverance (Mars 2020)",
        "agency": "NASA / JPL",
        "landingDate": "2021-02-18",
        "landingSite": "Jezero Crater",
        "status": "Active (Collecting sample cores with Ingenuity scout)",
        "scientificPayload": "Mastcam-Z, SuperCam, PIXL, SHERLOC, MOXIE",
        "verified": true
      }
    ]
  }
]
```

---

### 9.6 Single Destination & Featured Imagery
`GET /api/v1/imagery/destinations/{id}`
Returns the full destination record for `{id}` (`sun`, `mercury`, `venus`, `earth`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`).

`GET /api/v1/imagery/destinations/{id}/featured?limit={limit}`
Performs a live cached query against NASA's library using the primary sample query for that destination and returns up to `{limit}` (default 6, max 24) items.

#### Error Responses:
- `400 Bad Request`: If query parameters fail validation (e.g. `page < 1`).
- `404 Not Found`: If `{id}` is not a recognized celestial destination.
- `502 Bad Gateway`: If upstream NASA returns a 5xx response or malformed payload.
- `504 Gateway Timeout`: If upstream NASA exceeds the 10-second read timeout.


