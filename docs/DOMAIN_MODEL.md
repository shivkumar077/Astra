# ASTRA — Conceptual Domain Model

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Phase 1)  
**Author:** Technical Architecture & Systems Engineering  
**Repository:** Astra

---

## 1. Domain Overview & Modeling Principles

The ASTRA domain model captures the physics, subsystems, operations, and telemetry of an interplanetary spacecraft fleet. 

### Core Modeling Principles
1. **Conceptual Fidelity, Not Premature Schema:** This document defines the domain concepts, invariants, and state transitions that will govern the Java 21 domain entities and subsequent relational models.
2. **Explicit Time Semantics:** Every state vector, measurement, event, and command execution is strictly anchored to a monotonic simulation epoch (`SimInstant`), completely decoupled from wall-clock time.
3. **Immutability of Historical Telemetry:** Once a `TelemetryFrame` is emitted by the simulation engine, it is immutable. State changes occur strictly via forward simulation advancement.
4. **Subsystem Encapsulation:** Subsystems interact through defined physical interfaces (e.g., ADCS slewing draws power from EPS; thermal radiation depends on vehicle orientation relative to the Sun).

---

## 2. Conceptual Entity-Relationship Architecture

```
+---------------------------------------------------------------------------------------------------------+
|                                        CONCEPTUAL CLASS DIAGRAM                                         |
+---------------------------------------------------------------------------------------------------------+

           1        *
       +-------+  has  +------------+ 1     1 +------------------+
       |Mission|------>| Spacecraft |-------->| OrbitStateVector |
       +-------+       +------------+         +------------------+
                             | 1
                             | has
                             v 1
               +-----------------------------+
               |      SpacecraftSystems      |
               +-----------------------------+
                 |    |      |      |    |
                 |    |      |      |    +---> [ PropulsionSubsystem ]
                 |    |      |      +--------> [ CommsSubsystem ]
                 |    |      +---------------> [ AdcsSubsystem ]
                 |    +----------------------> [ ThermalSubsystem ]
                 +---------------------------> [ PowerSubsystem ]
                                               [ ObcSubsystem ]
                             | 1
                             | generates
                             v *
                     +----------------+
                     | TelemetryFrame |
                     +----------------+
                             ^
                             | records
              +--------------+--------------+
              |                             |
              | 1                           | 1
       +-------------+               +--------------+
       |   Command   |               | MissionEvent |
       +-------------+               +--------------+
              | 1                           | 1
              | can trigger                 | can observe
              v *                           v *
       +-----------------+           +------------------------+
       | AnomalyInstance |           | CameraCaptureOperation |
       +-----------------+           +------------------------+
```

---

## 3. Core Domain Entities & Attributes

### 3.1 Mission
Represents a space exploration or Earth observation undertaking.
- `missionCode`: String (e.g., `AURA-1`, `SELENA`, `AREON`)
- `name`: String (e.g., "Astra Earth Observation Mission 1")
- `primaryObjective`: Text
- `targetCelestialBody`: CelestialBody (`EARTH`, `MOON`, `MARS`, `JUPITER`, `SATURN`, `DEEP_SPACE`)
- `launchEpoch`: SimInstant
- `missionPhase`: Enum (`LAUNCH_LEOP`, `CRUISE`, `ORBITAL_INSERTION`, `PRIMARY_SCIENCE`, `EXTENDED_MISSION`, `DECOMMISSIONED`)

### 3.2 Spacecraft
The authoritative hardware vehicle operating within a mission.
- `spacecraftId`: UUID
- `callSign`: String
- `modelType`: String (e.g., `ASTRA-MK4-BUS`, `DEEP-EXPLORER-V`)
- `dryMassKg`: Double
- `propellantMassKg`: Double
- `dimensionsMeters`: Vector3D $[L, W, H]$
- `operationalState`: Enum (`NOMINAL`, `DEGRADED`, `ANOMALOUS`, `SAFE_MODE`, `LOS_DORMANT`)
- `trajectoryRegime`: Enum (`LEO_SUN_SYNC`, `LUNAR_POLAR`, `MARS_ELLIPTICAL`, `OUTER_PLANET_FLYBY`, `HELIOCENTRIC_ESCAPE`)

### 3.3 OrbitStateVector & Keplerian Elements
Represents the spacecraft's exact position and orbital geometry at a specific instant.
- `epoch`: SimInstant
- `coordinateFrame`: Enum (`ECI_J2000`, `MOON_CENTRIC`, `MARS_CENTRIC`, `HELIOCENTRIC`)
- **Cartesian State:**
  - `positionKm`: Vector3D $[X, Y, Z]$
  - `velocityKmS`: Vector3D $[V_x, V_y, V_z]$
- **Keplerian Orbital Elements:**
  - `semiMajorAxisKm`: Double ($a$)
  - `eccentricity`: Double ($e$, where $0 \le e < 1$ for closed orbits)
  - `inclinationDeg`: Double ($i$, $0^\circ \le i \le 180^\circ$)
  - `raanDeg`: Double ($\Omega$, Right Ascension of the Ascending Node)
  - `argOfPeriapsisDeg`: Double ($\omega$, Argument of Periapsis)
  - `trueAnomalyDeg`: Double ($\nu$, True Anomaly)
- **Derived Orbital Metrics:**
  - `periapsisAltitudeKm`: Double ($r_p - R_{\text{body}}$)
  - `apoapsisAltitudeKm`: Double ($r_a - R_{\text{body}}$)
  - `orbitalPeriodMinutes`: Double ($T$)
  - `inEclipse`: Boolean (True if central body occludes direct sunlight)

---

## 4. Subsystem Domain Specifications

### 4.1 Electrical Power System (EPS)
Responsible for power generation, storage, and distribution.
- `solarArrayOutputWatts`: Double
- `batteryStateOfChargePercent`: Double ($0.0\%$ to $100.0\%$)
- `batteryCapacityWattHours`: Double
- `mainBusVoltageVolts`: Double (Nominal: 28.0 V)
- `busCurrentAmps`: Double
- `solarArrayDeploymentAngleDeg`: Double
- `powerDistributionMode`: Enum (`MAX_POWER_TRACKING`, `BATTERY_CHARGE`, `HIGH_DRAW_PAYLOAD`, `SURVIVAL_BUS`)

### 4.2 Thermal Control System (TCS)
Maintains hardware within allowable operating temperature corridors.
- `coreElectronicsTempKelvin`: Double (Nominal: $280\text{ K} - 305\text{ K}$)
- `batteryBayTempKelvin`: Double (Nominal: $273\text{ K} - 295\text{ K}$)
- `sunwardSkinTempKelvin`: Double (Extreme: up to $390\text{ K}$)
- `shadowSkinTempKelvin`: Double (Extreme: down to $140\text{ K}$)
- `primaryHeaterActive`: Boolean
- `radiatorLouvrePositionPercent`: Double ($0.0\%$ closed to $100.0\%$ open)

### 4.3 Attitude Determination and Control System (ADCS)
Controls orientation in 3D space.
- `attitudeQuaternion`: Quaternion $[q_0, q_1, q_2, q_3]$ (Normalized unit quaternion)
- `eulerRollPitchYawDeg`: Vector3D $[\phi, \theta, \psi]$
- `angularVelocityDegPerSec`: Vector3D $[\omega_x, \omega_y, \omega_z]$
- `reactionWheelRpm`: Array of 4 Doubles (Wheel 1, 2, 3, 4; limit $\pm 6000\text{ RPM}$)
- `magneticTorquerActive`: Boolean
- `targetPointingMode`: Enum (`SUN_POINTING`, `EARTH_NADIR`, `TARGET_TRACKING`, `INERTIAL_HOLD`, `TUMBLE_DESAT`)

### 4.4 Telecommunications Subsystem (COMMS)
Handles uplink commands and telemetry downlink.
- `uplinkFrequencyMHz`: Double
- `downlinkSignalToNoiseRatioDb`: Double ($E_b/N_0$)
- `downlinkBitrateKbps`: Double
- `transmitterPowerWatts`: Double
- `highGainAntennaElevationDeg`: Double
- `highGainAntennaAzimuthDeg`: Double
- `groundStationContact`: String (e.g., `DSN_GOLDSTONE`, `ESTRACK_NEW_NORCIA`, `SVALBARD_KSAT`, `NONE_LOS`)

### 4.5 Propulsion Subsystem (PROP)
Provides orbital velocity adjustments and attitude desaturation.
- `propellantMassRemainingKg`: Double
- `propellantTankPressureBar`: Double
- `totalDeltaVRemainingMS`: Double
- `thrusterValvesOpen`: Boolean
- `lastBurnDurationSeconds`: Double

### 4.6 Onboard Computer (OBC)
Manages flight software, command dispatch, and fault protection.
- `cpuUtilizationPercent`: Double
- `memoryUsagePercent`: Double
- `flightSoftwareCycleTimeMs`: Double
- `singleEventUpsetCount`: Integer
- `watchdogTimerSeconds`: Integer
- `autonomousSafeModeTriggered`: Boolean

---

## 5. Telemetry & Operational Event Contracts

### 5.1 TelemetryFrame
A snapshot of vehicle telemetry emitted at 5 Hz.
```
TelemetryFrame
 ├── sequenceNumber: Long
 ├── spacecraftId: UUID
 ├── simTimestamp: SimInstant
 ├── stateVector: OrbitStateVector
 ├── power: PowerSubsystemSnapshot
 ├── thermal: ThermalSubsystemSnapshot
 ├── adcs: AdcsSubsystemSnapshot
 ├── comms: CommsSubsystemSnapshot
 ├── propulsion: PropulsionSubsystemSnapshot
 ├── obc: ObcSubsystemSnapshot
 └── overallHealth: Enum (NOMINAL, ADVISORY, CRITICAL)
```

### 5.2 MissionEvent
Discrete occurrences recorded in the persistent mission ledger.
- `eventId`: UUID
- `spacecraftId`: UUID
- `simTimestamp`: SimInstant
- `severity`: Enum (`INFO`, `ADVISORY`, `WARNING`, `CRITICAL`)
- `category`: Enum (`ORBIT_TRANSITION`, `COMMAND_LIFECYCLE`, `ANOMALY_TRIGGERED`, `PAYLOAD_OPERATION`, `AUTONOMOUS_PROTECTION`)
- `title`: String
- `description`: Text
- `associatedTelemetrySeq`: Long (Optional link to trigger frame)

---

## 6. Command & Anomaly State Machines

### 6.1 Command Execution State Machine
Commands must transition through explicit, verifiable states:

```
               [ Operator Stages Command ]
                           |
                           v
                     +-----------+
                     |  STAGED   |
                     +-----------+
                           |
             Preconditions Verified (Pass)
                           |
                           v
                  +-----------------+
                  |  TRANSMITTING   |  <-- Simulated light-travel delay
                  +-----------------+
                           |
               Spacecraft Receives Frame
                           |
                           v
                  +-----------------+
                  |  ACKNOWLEDGED   |
                  +-----------------+
                           |
               Execution Initiated on OBC
                           |
                           v
                  +-----------------+
                  |    EXECUTING    |
                  +-----------------+
                     /           \
         Telemetry    /             \   Hardware Check
         Confirms    /               \  Fails / Brownout
                    v                 v
             +-----------+       +-----------+
             | COMPLETED |       |  FAILED   |
             +-----------+       +-----------+
```

### 6.2 Anomaly Lifecycle State Machine

```
              [ Inject Anomaly Trigger ]
                          |
                          v
                    +------------+
                    |  INJECTED  |
                    +------------+
                          |
             Simulation Perturbs State
                          |
                          v
                    +------------+
                    |   ACTIVE   |  <-- Observable telemetry deviations
                    +------------+
                          |
             Operator Initiates Recovery
                          |
                          v
                    +------------+
                    | RECOVERING |  <-- Corrective commands executing
                    +------------+
                          |
             Subsystem Corridors Restored
                          |
                          v
                    +------------+
                    |  RESOLVED  |
                    +------------+
```

---

## 7. Camera Capture Domain Model

### 7.1 CameraCaptureOperation
Represents an optical observation maneuver executed by the simulated spacecraft.
- `captureId`: UUID
- `spacecraftId`: UUID
- `simTimestamp`: SimInstant
- `sensorId`: String (e.g., `OPTICAL-HR-BAY1`, `MULTISPECTRAL-IMAGER`)
- `targetCelestialBody`: CelestialBody
- `targetCoordinates`: Vector3D $[X, Y, Z]$
- `vehicleOrientationAtCapture`: Quaternion $[q_0, q_1, q_2, q_3]$
- `exposureTimeMs`: Integer
- `lightingCondition`: Enum (`FULL_SUN`, `PENUMBRA`, `DEEP_SHADOW`, `EARTHSHINE`)
- `captureStatus`: Enum (`SCHEDULED`, `CAPTURED`, `TRANSMITTING_DOWNLINK`, `ARCHIVED`)
- `syntheticWatermark`: String (Always: `"SYNTHETIC / SIMULATED VEHICLE CAPTURE"`)
- `renderMetadata`: JSON (Simulated noise factor, field-of-view angle, optical resolution)

**Key Domain Invariant:** The capture engine never stores authentic NASA photographs inside `CameraCaptureOperation`. It strictly records simulated vehicle sensor captures. Authentic NASA media lives in the `NasaAsset` catalog.
