package org.astra.anomalies;

import jakarta.annotation.PostConstruct;
import org.astra.anomalies.dto.FaultScenarioMetadata;
import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.OrbitState;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.domain.subsystems.*;
import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.astra.persistence.JsonUtils;
import org.astra.persistence.entity.FaultRecordEntity;
import org.astra.persistence.repository.FaultRecordRepository;
import org.astra.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Authoritative Failure Lab domain service managing fault injection, physical progression,
 * threshold detection, validated recovery procedures, and audit histories.
 */
@Service
public class FailureLabService {

    private static final Logger log = LoggerFactory.getLogger(FailureLabService.class);
    private static final int MAX_FAULT_HISTORY_RECORDS = 500;

    private final Map<String, FaultRecord> activeFaults = new ConcurrentHashMap<>();
    private final List<FaultRecord> faultHistory = new CopyOnWriteArrayList<>();
    private final FaultDetectionEngine detectionEngine;
    private final SimulationEventPublisher eventPublisher;
    private final FaultRecordRepository faultRepository;

    public FailureLabService() {
        this(new FaultDetectionEngine(), event -> {}, null);
    }

    public FailureLabService(FaultDetectionEngine detectionEngine, SimulationEventPublisher eventPublisher) {
        this(detectionEngine, eventPublisher, null);
    }

    @Autowired
    public FailureLabService(
            FaultDetectionEngine detectionEngine,
            SimulationEventPublisher eventPublisher,
            Optional<FaultRecordRepository> faultRepository
    ) {
        this.detectionEngine = Objects.requireNonNull(detectionEngine, "detectionEngine must not be null");
        this.eventPublisher = Objects.requireNonNull(eventPublisher, "eventPublisher must not be null");
        this.faultRepository = faultRepository != null ? faultRepository.orElse(null) : null;
    }

    @PostConstruct
    public void initFromDatabase() {
        if (faultRepository == null) {
            return;
        }
        try {
            List<FaultRecordEntity> persisted = faultRepository.findTop500ByOrderByInjectedEpochDesc();
            if (persisted != null && !persisted.isEmpty()) {
                List<FaultRecordEntity> chronological = new ArrayList<>(persisted);
                Collections.reverse(chronological);
                for (FaultRecordEntity entity : chronological) {
                    FaultRecord rec = mapToRecord(entity);
                    faultHistory.removeIf(f -> f.faultId().equals(rec.faultId()));
                    faultHistory.add(rec);
                }
                log.info("Recovered {} durable fault history records from database.", persisted.size());
            }
        } catch (Exception e) {
            log.warn("Could not hydrate fault history from database: {}", e.getMessage());
        }
    }

    /**
     * Returns the scenario catalog with metadata for all 13 supported failure scenarios across 6 subsystem domains.
     */
    public List<FaultScenarioMetadata> getScenarios() {
        return List.of(
                // EPS
                new FaultScenarioMetadata(
                        FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION,
                        SubsystemType.EPS,
                        "Solar Array String Degradation",
                        "Simulates micro-meteoroid impact or photovoltaic string failure resulting in reduced electrical generation.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.SWITCH_REDUNDANT_STRING,
                        Map.of("solarMultiplier", "Double factor between 0.1 and 0.8 (default 0.35)")
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.EPS_BATTERY_CELL_DEGRADATION,
                        SubsystemType.EPS,
                        "Battery Cell Degradation & Undervoltage",
                        "Simulates internal battery cell degradation, lowering bus voltage and accelerating discharge rates.",
                        FaultSeverity.CRITICAL,
                        RecoveryActionType.RESET_BATTERY_CHARGE_CONTROLLER,
                        Map.of("voltageDrop", "Double volts drop (default 6.0V)")
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.EPS_BUS_OVERLOAD,
                        SubsystemType.EPS,
                        "Electrical Power Bus Overload",
                        "Simulates excessive power draw on the primary DC bus, triggering protective load shedding if battery reserve drops below 30%.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.RECONFIGURE_POWER_BUS,
                        Map.of("overloadWatts", "Double load in watts (default 720.0W)")
                ),

                // COMMS
                new FaultScenarioMetadata(
                        FaultScenarioCode.COMMS_RF_BLACKOUT,
                        SubsystemType.COMMS,
                        "Radio Frequency Communications Blackout",
                        "Simulates full loss of carrier lock and RF uplink/downlink capability, rejecting all incoming telecommands.",
                        FaultSeverity.CRITICAL,
                        RecoveryActionType.RESET_RF_TRANSCEIVER,
                        Collections.emptyMap()
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.COMMS_LINK_DEGRADATION,
                        SubsystemType.COMMS,
                        "Communications Link Margin Degradation",
                        "Simulates antenna pointing misalignment or atmospheric attenuation causing low link margin and packet loss.",
                        FaultSeverity.WARNING,
                        RecoveryActionType.REALIGN_ANTENNA_GIMBAL,
                        Map.of("linkMarginDb", "Target link margin in dB (default 1.8 dB)")
                ),

                // TCS
                new FaultScenarioMetadata(
                        FaultScenarioCode.TCS_HEAT_PIPE_FAILURE,
                        SubsystemType.TCS,
                        "Radiator Heat Pipe Loop Failure",
                        "Simulates thermal radiator loop dryout, causing component temperature to climb into critical overheat territory in direct sunlight.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.PURGE_HEAT_PIPE_LOOP,
                        Map.of("heatingRatePerSec", "Double deg C/s (default 0.025)")
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.TCS_HEATER_CIRCUIT_FAILURE,
                        SubsystemType.TCS,
                        "Thermal Heater Circuit Open-Loop Failure",
                        "Simulates heater circuit failure, resulting in unmitigated thermal cooling below freezing during eclipse.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.SWITCH_REDUNDANT_HEATER_LOOP,
                        Map.of("coolingRatePerSec", "Double deg C/s (default 0.025)")
                ),

                // ADCS
                new FaultScenarioMetadata(
                        FaultScenarioCode.ADCS_REACTION_WHEEL_DRAG,
                        SubsystemType.ADCS,
                        "Reaction Wheel Assembly Bearing Drag",
                        "Simulates reaction wheel friction, increasing wheel RPM and inducing pointing error drift above optical capture thresholds.",
                        FaultSeverity.WARNING,
                        RecoveryActionType.SPIN_DOWN_REACTION_WHEELS,
                        Map.of("targetRpm", "Double RPM (default 5800.0)")
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.ADCS_STAR_TRACKER_BLINDING,
                        SubsystemType.ADCS,
                        "Star Tracker Sensor Blinding / Loss of Lock",
                        "Simulates stray-light blinding or sensor disruption, causing loss of attitude lock and pointing disorientation.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.SWITCH_BACKUP_STAR_TRACKER,
                        Collections.emptyMap()
                ),

                // PROP
                new FaultScenarioMetadata(
                        FaultScenarioCode.PROP_VALVE_LEAK,
                        SubsystemType.PROP,
                        "Propulsion Manifold Valve Leak",
                        "Simulates an unsealed thruster valve causing steady propellant mass loss and manifold tank pressure depletion.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.ISOLATE_PROPULSION_VALVE,
                        Map.of("leakRateKgPerSec", "Double kg/s (default 0.05)")
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.PROP_THRUSTER_COLD,
                        SubsystemType.PROP,
                        "Thruster Line Freeze / Cold Manifold Lockout",
                        "Simulates thruster catalyst bed temperature below minimum ignition temperature, rejecting delta-V maneuvers.",
                        FaultSeverity.WARNING,
                        RecoveryActionType.REHEAT_THRUSTER_MANIFOLD,
                        Collections.emptyMap()
                ),

                // OBC
                new FaultScenarioMetadata(
                        FaultScenarioCode.OBC_CPU_THRASHING,
                        SubsystemType.OBC,
                        "On-Board Computer Processing Overload",
                        "Simulates infinite loop or deadlock in flight software tasks, driving CPU utilization above 90%.",
                        FaultSeverity.MAJOR,
                        RecoveryActionType.RELOAD_FLIGHT_SOFTWARE_IMAGE,
                        Map.of("targetCpuPercent", "Double CPU utilization (default 96.5)")
                ),
                new FaultScenarioMetadata(
                        FaultScenarioCode.OBC_WATCHDOG_RESET,
                        SubsystemType.OBC,
                        "OBC Watchdog Timeout & Processor Restart",
                        "Simulates hardware watchdog trigger initiating an autonomous processor restart cycle that temporarily halts command processing.",
                        FaultSeverity.CRITICAL,
                        RecoveryActionType.REBOOT_OBC_SYSTEM,
                        Map.of("rebootDurationSeconds", "Double seconds (default 30.0)")
                )
        );
    }

    /**
     * Injects a supported fault scenario onto a target spacecraft.
     */
    public FaultRecord injectFault(InjectFaultRequest request, Instant currentEpoch, Spacecraft spacecraft) {
        Objects.requireNonNull(request, "request must not be null");
        Objects.requireNonNull(currentEpoch, "currentEpoch must not be null");
        Objects.requireNonNull(spacecraft, "spacecraft must not be null");

        FaultScenarioCode code = request.scenarioCode();
        FaultSeverity severity = request.severity() != null ? request.severity() : code.getDefaultSeverity();
        Map<String, Object> params = request.parameters() != null ? new HashMap<>(request.parameters()) : new HashMap<>();
        String operator = SecurityUtils.getCurrentOperatorUsername().orElse(null);

        FaultRecord fault = FaultRecord.of(
                spacecraft.getId(),
                code,
                severity,
                currentEpoch,
                params,
                request.description(),
                operator
        );

        // Apply initial physical perturbation to subsystem state
        applyInitialFaultPerturbation(fault, spacecraft);

        activeFaults.put(fault.faultId(), fault);
        recordHistory(fault);

        eventPublisher.publish(
                SimulationEventType.FAULT_INJECTED,
                currentEpoch,
                spacecraft.getId(),
                "Failure Lab fault INJECTED: " + code + " on " + code.getSubsystem(),
                Map.of(
                        "faultId", fault.faultId(),
                        "scenarioCode", code.name(),
                        "subsystem", code.getSubsystem().name(),
                        "severity", severity.name(),
                        "description", fault.description()
                )
        );

        return fault;
    }

    private void applyInitialFaultPerturbation(FaultRecord fault, Spacecraft sc) {
        SpacecraftSubsystems curr = sc.getSubsystems();
        if (curr == null) return;

        SpacecraftSubsystems updated = switch (fault.scenarioCode()) {
            case EPS_SOLAR_ARRAY_DEGRADATION -> {
                double mult = fault.parameters().containsKey("solarMultiplier")
                        ? ((Number) fault.parameters().get("solarMultiplier")).doubleValue() : 0.35;
                EpsSubsystemState eps = new EpsSubsystemState(
                        curr.eps().batterySocPercent(),
                        curr.eps().solarArrayWatts() * mult,
                        curr.eps().batteryVoltageVolts(),
                        curr.eps().busLoadWatts(),
                        curr.eps().loadSheddingActive(),
                        mult,
                        curr.eps().busOverloadActive()
                );
                yield new SpacecraftSubsystems(eps, curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case EPS_BATTERY_CELL_DEGRADATION -> {
                EpsSubsystemState eps = new EpsSubsystemState(
                        Math.max(12.0, curr.eps().batterySocPercent() - 15.0),
                        curr.eps().solarArrayWatts(),
                        22.0, // Low cell voltage
                        curr.eps().busLoadWatts(),
                        curr.eps().loadSheddingActive(),
                        curr.eps().solarDegradationMultiplier(),
                        curr.eps().busOverloadActive()
                );
                yield new SpacecraftSubsystems(eps, curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case EPS_BUS_OVERLOAD -> {
                double load = fault.parameters().containsKey("overloadWatts")
                        ? ((Number) fault.parameters().get("overloadWatts")).doubleValue() : 720.0;
                EpsSubsystemState eps = new EpsSubsystemState(
                        curr.eps().batterySocPercent(),
                        curr.eps().solarArrayWatts(),
                        24.2,
                        load,
                        curr.eps().batterySocPercent() < 30.0,
                        curr.eps().solarDegradationMultiplier(),
                        true
                );
                yield new SpacecraftSubsystems(eps, curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case COMMS_RF_BLACKOUT -> {
                CommsSubsystemState comms = new CommsSubsystemState(
                        "BLACKOUT",
                        0.0,
                        100.0,
                        false,
                        true
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), comms, curr.prop(), curr.obc());
            }
            case COMMS_LINK_DEGRADATION -> {
                double margin = fault.parameters().containsKey("linkMarginDb")
                        ? ((Number) fault.parameters().get("linkMarginDb")).doubleValue() : 1.8;
                CommsSubsystemState comms = new CommsSubsystemState(
                        "DEGRADED",
                        margin,
                        24.0,
                        true,
                        false
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), comms, curr.prop(), curr.obc());
            }
            case TCS_HEAT_PIPE_FAILURE -> {
                double initTemp = Math.max(48.0, curr.tcs().temperatureCelsius());
                TcsSubsystemState tcs = new TcsSubsystemState(
                        initTemp,
                        curr.tcs().heaterActive(),
                        curr.tcs().heaterOperational(),
                        0.15, // Radiator heat dissipation severely impaired
                        curr.tcs().thermalSafingActive()
                );
                yield new SpacecraftSubsystems(curr.eps(), tcs, curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case TCS_HEATER_CIRCUIT_FAILURE -> {
                TcsSubsystemState tcs = new TcsSubsystemState(
                        curr.tcs().temperatureCelsius(),
                        false,
                        false, // Heater inoperable
                        curr.tcs().radiatorEfficiency(),
                        curr.tcs().thermalSafingActive()
                );
                yield new SpacecraftSubsystems(curr.eps(), tcs, curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case ADCS_REACTION_WHEEL_DRAG -> {
                double rpm = fault.parameters().containsKey("targetRpm")
                        ? ((Number) fault.parameters().get("targetRpm")).doubleValue() : 5800.0;
                AdcsSubsystemState adcs = new AdcsSubsystemState(
                        1.85,
                        "DEGRADED",
                        rpm,
                        curr.adcs().starTrackerLocked(),
                        true
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), adcs, curr.comms(), curr.prop(), curr.obc());
            }
            case ADCS_STAR_TRACKER_BLINDING -> {
                AdcsSubsystemState adcs = new AdcsSubsystemState(
                        6.2,
                        "LOST",
                        curr.adcs().reactionWheelSpeedRpm(),
                        false,
                        curr.adcs().wheelFrictionActive()
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), adcs, curr.comms(), curr.prop(), curr.obc());
            }
            case PROP_VALVE_LEAK -> {
                PropSubsystemState prop = new PropSubsystemState(
                        curr.prop().propellantMassKg(),
                        11.5,
                        "LEAKING",
                        0.5,
                        true
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), curr.comms(), prop, curr.obc());
            }
            case PROP_THRUSTER_COLD -> {
                PropSubsystemState prop = new PropSubsystemState(
                        curr.prop().propellantMassKg(),
                        curr.prop().tankPressureBar(),
                        "COLD_LOCKOUT",
                        0.0,
                        false
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), curr.comms(), prop, curr.obc());
            }
            case OBC_CPU_THRASHING -> {
                double cpu = fault.parameters().containsKey("targetCpuPercent")
                        ? ((Number) fault.parameters().get("targetCpuPercent")).doubleValue() : 96.5;
                ObcSubsystemState obc = new ObcSubsystemState(
                        cpu,
                        89.2,
                        curr.obc().flightSoftwareState(),
                        curr.obc().rebootCount(),
                        curr.obc().rebootRemainingSeconds()
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), obc);
            }
            case OBC_WATCHDOG_RESET -> {
                double dur = fault.parameters().containsKey("rebootDurationSeconds")
                        ? ((Number) fault.parameters().get("rebootDurationSeconds")).doubleValue() : 30.0;
                ObcSubsystemState obc = new ObcSubsystemState(
                        10.0,
                        25.0,
                        "REBOOTING",
                        curr.obc().rebootCount(),
                        dur
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), obc);
            }
        };

        sc.updateSubsystems(updated);
    }

    /**
     * Executes physical subsystem progression across a simulation step and evaluates detection rules.
     */
    public void stepSubsystems(Spacecraft sc, OrbitState orbit, Duration stepDuration, Instant currentEpoch) {
        Objects.requireNonNull(sc, "spacecraft must not be null");
        Objects.requireNonNull(orbit, "orbit must not be null");
        Objects.requireNonNull(stepDuration, "stepDuration must not be null");
        Objects.requireNonNull(currentEpoch, "currentEpoch must not be null");

        double deltaSec = stepDuration.toNanos() / 1.0e9;
        double deltaHours = deltaSec / 3600.0;

        SpacecraftSubsystems currentSubsystems = sc.getSubsystems();
        if (currentSubsystems == null) {
            currentSubsystems = SpacecraftSubsystems.nominal(
                    sc.getBatterySocPercent(),
                    sc.getSolarArrayWatts(),
                    sc.getPropellantMassKg()
            );
        }

        List<FaultRecord> faults = getActiveFaultsForSpacecraft(sc.getId());

        // 1. EPS progression
        EpsSubsystemState eps = stepEps(currentSubsystems.eps(), sc.getOperationalMode(), orbit.inEclipse(), deltaHours, faults);

        // 2. TCS progression
        TcsSubsystemState tcs = stepTcs(currentSubsystems.tcs(), orbit.inEclipse(), deltaSec, faults);

        // 3. ADCS progression
        AdcsSubsystemState adcs = stepAdcs(currentSubsystems.adcs(), deltaSec, faults);

        // 4. COMMS progression
        CommsSubsystemState comms = stepComms(currentSubsystems.comms(), faults);

        // 5. PROP progression
        PropSubsystemState prop = stepProp(currentSubsystems.prop(), deltaSec, faults);

        // 6. OBC progression (handles watchdog countdown & auto-recovery)
        ObcSubsystemState obc = stepObc(sc, currentSubsystems.obc(), deltaSec, faults, currentEpoch);

        SpacecraftSubsystems updatedSubsystems = new SpacecraftSubsystems(eps, tcs, adcs, comms, prop, obc);
        sc.updateSubsystems(updatedSubsystems);

        // 7. Detection Engine evaluation
        for (FaultRecord fault : faults) {
            FaultRecord evaluated = detectionEngine.evaluateFault(fault, sc, currentEpoch, eventPublisher);
            if (evaluated != fault) {
                activeFaults.put(evaluated.faultId(), evaluated);
                recordHistory(evaluated);
            }
        }
    }

    private EpsSubsystemState stepEps(
            EpsSubsystemState current,
            OperationalMode mode,
            boolean inEclipse,
            double deltaHours,
            List<FaultRecord> faults
    ) {
        double mult = 1.0;
        boolean overload = false;
        boolean degradedBattery = false;

        for (FaultRecord f : faults) {
            if (f.scenarioCode() == FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION) {
                mult = current.solarDegradationMultiplier();
            } else if (f.scenarioCode() == FaultScenarioCode.EPS_BUS_OVERLOAD) {
                overload = true;
            } else if (f.scenarioCode() == FaultScenarioCode.EPS_BATTERY_CELL_DEGRADATION) {
                degradedBattery = true;
            }
        }

        double solarWatts;
        double busLoad = overload ? 720.0 : 380.0;
        double batterySoc = current.batterySocPercent();
        double voltage = degradedBattery ? 22.0 : (overload ? 24.2 : 28.0);
        boolean loadShedding = current.loadSheddingActive();

        if (inEclipse) {
            solarWatts = 0.0;
            double dischargeRate = switch (mode) {
                case SAFE_MODE, LOW_POWER -> 0.8;
                case SCIENCE_OPERATION -> 4.5;
                default -> 2.2;
            };
            if (overload) dischargeRate *= 1.8;
            if (degradedBattery) dischargeRate *= 2.0;

            batterySoc = Math.max(5.0, batterySoc - dischargeRate * deltaHours);
            if (batterySoc < 30.0 && overload) {
                loadShedding = true;
                busLoad = 450.0; // Non-critical loads shed
            }
        } else {
            double baseWatts = switch (mode) {
                case LOW_POWER -> 650.0;
                case SAFE_MODE -> 450.0;
                case SCIENCE_OPERATION -> 1350.0;
                default -> 1200.0;
            };
            solarWatts = baseWatts * mult;

            if (solarWatts > busLoad) {
                double chargeRate = 3.0;
                batterySoc = Math.min(100.0, batterySoc + chargeRate * deltaHours);
            } else {
                // Generation insufficient to power bus
                batterySoc = Math.max(5.0, batterySoc - 2.5 * deltaHours);
            }
        }

        if (overload && batterySoc < 30.0) {
            loadShedding = true;
            busLoad = 450.0; // Non-critical loads shed
        }

        return new EpsSubsystemState(batterySoc, solarWatts, voltage, busLoad, loadShedding, mult, overload);
    }

    private TcsSubsystemState stepTcs(
            TcsSubsystemState current,
            boolean inEclipse,
            double deltaSec,
            List<FaultRecord> faults
    ) {
        boolean heatPipeFailed = false;
        boolean heaterFailed = false;

        for (FaultRecord f : faults) {
            if (f.scenarioCode() == FaultScenarioCode.TCS_HEAT_PIPE_FAILURE) heatPipeFailed = true;
            if (f.scenarioCode() == FaultScenarioCode.TCS_HEATER_CIRCUIT_FAILURE) heaterFailed = true;
        }

        double temp = current.temperatureCelsius();
        double efficiency = heatPipeFailed ? 0.15 : 1.0;
        boolean heaterOperational = !heaterFailed;
        boolean heaterActive = false;
        boolean thermalSafing = current.thermalSafingActive();

        if (inEclipse) {
            // Cooling in shade
            if (heaterOperational && temp < 10.0) {
                heaterActive = true;
                temp = Math.max(8.0, temp - 0.005 * deltaSec); // Heater counters cooling
            } else {
                // Heater circuit failure: plummets toward deep space freeze
                temp = Math.max(-45.0, temp - 0.025 * deltaSec);
            }
        } else {
            // Warming in sunlight
            if (heatPipeFailed) {
                // Heat pipe failure: temperature climbs into severe overheat
                temp = Math.min(78.0, temp + 0.06 * deltaSec);
                if (temp >= 60.0) {
                    thermalSafing = true;
                }
            } else {
                // Nominal sunlight equilibrium ~22 deg C
                if (temp < 21.8) {
                    temp = Math.min(22.0, temp + 0.01 * deltaSec);
                } else if (temp > 22.2) {
                    temp = Math.max(22.0, temp - 0.01 * deltaSec);
                }
            }
        }

        return new TcsSubsystemState(temp, heaterActive, heaterOperational, efficiency, thermalSafing);
    }

    private AdcsSubsystemState stepAdcs(
            AdcsSubsystemState current,
            double deltaSec,
            List<FaultRecord> faults
    ) {
        boolean wheelDrag = false;
        boolean starTrackerBlind = false;

        for (FaultRecord f : faults) {
            if (f.scenarioCode() == FaultScenarioCode.ADCS_REACTION_WHEEL_DRAG) wheelDrag = true;
            if (f.scenarioCode() == FaultScenarioCode.ADCS_STAR_TRACKER_BLINDING) starTrackerBlind = true;
        }

        double pointingError = current.pointingErrorDegrees();
        String lockStatus = current.attitudeLockStatus();
        double rpm = current.reactionWheelSpeedRpm();
        boolean trackerLocked = !starTrackerBlind;

        if (starTrackerBlind) {
            trackerLocked = false;
            lockStatus = "LOST";
            pointingError = Math.min(8.5, pointingError + 0.05 * deltaSec);
        } else if (wheelDrag) {
            lockStatus = "DEGRADED";
            rpm = 5800.0;
            pointingError = Math.min(2.5, pointingError + 0.02 * deltaSec);
        } else {
            // Nominal tracking
            trackerLocked = true;
            lockStatus = "LOCKED";
            pointingError = 0.04;
            rpm = 2450.0;
        }

        return new AdcsSubsystemState(pointingError, lockStatus, rpm, trackerLocked, wheelDrag);
    }

    private CommsSubsystemState stepComms(
            CommsSubsystemState current,
            List<FaultRecord> faults
    ) {
        boolean blackout = false;
        boolean degraded = false;

        for (FaultRecord f : faults) {
            if (f.scenarioCode() == FaultScenarioCode.COMMS_RF_BLACKOUT) blackout = true;
            if (f.scenarioCode() == FaultScenarioCode.COMMS_LINK_DEGRADATION) degraded = true;
        }

        if (blackout) {
            return new CommsSubsystemState("BLACKOUT", 0.0, 100.0, false, true);
        } else if (degraded) {
            return new CommsSubsystemState("DEGRADED", 1.8, 22.5, true, false);
        } else {
            return new CommsSubsystemState("ONLINE", 12.4, 0.0, true, false);
        }
    }

    private PropSubsystemState stepProp(
            PropSubsystemState current,
            double deltaSec,
            List<FaultRecord> faults
    ) {
        boolean leak = false;
        boolean cold = false;

        for (FaultRecord f : faults) {
            if (f.scenarioCode() == FaultScenarioCode.PROP_VALVE_LEAK) leak = true;
            if (f.scenarioCode() == FaultScenarioCode.PROP_THRUSTER_COLD) cold = true;
        }

        double mass = current.propellantMassKg();
        double pressure = current.tankPressureBar();
        String health = "NOMINAL";
        double thrust = 1.0;

        if (leak) {
            health = "LEAKING";
            mass = Math.max(0.0, mass - 0.05 * deltaSec);
            pressure = Math.max(5.0, pressure - 0.04 * deltaSec);
            thrust = 0.5;
        } else if (cold) {
            health = "COLD_LOCKOUT";
            thrust = 0.0;
        }

        return new PropSubsystemState(mass, pressure, health, thrust, leak);
    }

    private ObcSubsystemState stepObc(
            Spacecraft sc,
            ObcSubsystemState current,
            double deltaSec,
            List<FaultRecord> faults,
            Instant currentEpoch
    ) {
        boolean thrashing = false;
        FaultRecord watchdogFault = null;

        for (FaultRecord f : faults) {
            if (f.scenarioCode() == FaultScenarioCode.OBC_CPU_THRASHING) thrashing = true;
            if (f.scenarioCode() == FaultScenarioCode.OBC_WATCHDOG_RESET) watchdogFault = f;
        }

        if (watchdogFault != null && "REBOOTING".equalsIgnoreCase(current.flightSoftwareState())) {
            double remaining = Math.max(0.0, current.rebootRemainingSeconds() - deltaSec);
            if (remaining <= 0.0) {
                // Watchdog reboot completed automatically
                int newCount = current.rebootCount() + 1;
                ObcSubsystemState recoveredObc = new ObcSubsystemState(32.5, 44.0, "NOMINAL", newCount, 0.0);

                // Transition fault to RECOVERED
                FaultRecord recoveredFault = watchdogFault.withRecovered(currentEpoch, "Watchdog processor reboot cycle completed successfully.");
                activeFaults.remove(watchdogFault.faultId());
                recordHistory(recoveredFault);
                detectionEngine.clearAlertSignature(watchdogFault.faultId());

                eventPublisher.publish(
                        SimulationEventType.FAULT_RECOVERY_COMPLETED,
                        currentEpoch,
                        sc.getId(),
                        "OBC autonomous watchdog restart completed: flight software restored to NOMINAL",
                        Map.of("faultId", watchdogFault.faultId(), "rebootCount", newCount)
                );

                return recoveredObc;
            } else {
                return new ObcSubsystemState(12.0, 28.0, "REBOOTING", current.rebootCount(), remaining);
            }
        }

        if (thrashing) {
            return new ObcSubsystemState(96.5, 89.0, "NOMINAL", current.rebootCount(), 0.0);
        }

        return new ObcSubsystemState(32.5, 44.0, "NOMINAL", current.rebootCount(), 0.0);
    }

    /**
     * Executes a validated recovery procedure on a fault.
     */
    public FaultRecord recoverFault(String faultId, RecoverFaultRequest request, Instant currentEpoch, Spacecraft spacecraft) {
        Objects.requireNonNull(faultId, "faultId must not be null");
        Objects.requireNonNull(request, "request must not be null");
        Objects.requireNonNull(currentEpoch, "currentEpoch must not be null");
        Objects.requireNonNull(spacecraft, "spacecraft must not be null");

        FaultRecord fault = activeFaults.get(faultId);
        if (fault == null) {
            // Check if already in history
            fault = faultHistory.stream().filter(f -> f.faultId().equals(faultId)).findFirst()
                    .orElseThrow(() -> new NoSuchElementException("Fault not found: " + faultId));
            if (fault.lifecycleState() == FaultLifecycleState.RECOVERED) {
                throw new IllegalStateException("Fault " + faultId + " has already been recovered.");
            }
            if (fault.lifecycleState() == FaultLifecycleState.CLEARED) {
                throw new IllegalStateException("Fault alert " + faultId + " was cleared. Re-inject if new test is desired.");
            }
        }

        // Validate recovery procedure action against scenario requirements
        if (fault.recoveryActionRequired() != request.recoveryAction()) {
            eventPublisher.publish(
                    SimulationEventType.FAULT_RECOVERY_FAILED,
                    currentEpoch,
                    spacecraft.getId(),
                    "Recovery procedure REJECTED: incompatible action " + request.recoveryAction()
                            + " for scenario " + fault.scenarioCode() + " (expected: " + fault.recoveryActionRequired() + ")",
                    Map.of(
                            "faultId", faultId,
                            "attemptedAction", request.recoveryAction().name(),
                            "expectedAction", fault.recoveryActionRequired().name()
                    )
            );
            throw new IllegalArgumentException("Incompatible recovery procedure: " + request.recoveryAction()
                    + " cannot recover " + fault.scenarioCode() + ". Expected: " + fault.recoveryActionRequired());
        }

        // Transition: ACTIVE/DETECTED -> RECOVERING -> RECOVERED
        eventPublisher.publish(
                SimulationEventType.FAULT_RECOVERY_INITIATED,
                currentEpoch,
                spacecraft.getId(),
                "Recovery procedure INITIATED: " + request.recoveryAction() + " on " + fault.subsystem(),
                Map.of("faultId", faultId, "action", request.recoveryAction().name())
        );

        // Apply physical restoration to subsystem state
        restoreSubsystemNominalPhysics(fault, spacecraft);

        String operator = SecurityUtils.getCurrentOperatorUsername().orElse(null);
        FaultRecord recovered = fault.withRecovered(currentEpoch, request.operatorNote(), operator);
        activeFaults.remove(faultId);
        recordHistory(recovered);
        detectionEngine.clearAlertSignature(faultId);

        eventPublisher.publish(
                SimulationEventType.FAULT_RECOVERY_COMPLETED,
                currentEpoch,
                spacecraft.getId(),
                "Recovery procedure COMPLETED: " + fault.scenarioCode() + " resolved on " + fault.subsystem(),
                Map.of(
                        "faultId", faultId,
                        "action", request.recoveryAction().name(),
                        "recoveredEpoch", currentEpoch.toString()
                )
        );

        return recovered;
    }

    private void restoreSubsystemNominalPhysics(FaultRecord fault, Spacecraft sc) {
        SpacecraftSubsystems curr = sc.getSubsystems();
        if (curr == null) return;

        SpacecraftSubsystems restored = switch (fault.scenarioCode()) {
            case EPS_SOLAR_ARRAY_DEGRADATION -> {
                EpsSubsystemState eps = new EpsSubsystemState(
                        curr.eps().batterySocPercent(),
                        curr.eps().solarArrayWatts() / Math.max(0.1, curr.eps().solarDegradationMultiplier()),
                        curr.eps().batteryVoltageVolts(),
                        curr.eps().busLoadWatts(),
                        curr.eps().loadSheddingActive(),
                        1.0,
                        curr.eps().busOverloadActive()
                );
                yield new SpacecraftSubsystems(eps, curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case EPS_BATTERY_CELL_DEGRADATION -> {
                EpsSubsystemState eps = new EpsSubsystemState(
                        Math.max(50.0, curr.eps().batterySocPercent()),
                        curr.eps().solarArrayWatts(),
                        28.0,
                        curr.eps().busLoadWatts(),
                        false,
                        curr.eps().solarDegradationMultiplier(),
                        curr.eps().busOverloadActive()
                );
                yield new SpacecraftSubsystems(eps, curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case EPS_BUS_OVERLOAD -> {
                EpsSubsystemState eps = new EpsSubsystemState(
                        curr.eps().batterySocPercent(),
                        curr.eps().solarArrayWatts(),
                        28.0,
                        380.0,
                        false,
                        curr.eps().solarDegradationMultiplier(),
                        false
                );
                yield new SpacecraftSubsystems(eps, curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case COMMS_RF_BLACKOUT, COMMS_LINK_DEGRADATION -> {
                CommsSubsystemState comms = CommsSubsystemState.nominal();
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), comms, curr.prop(), curr.obc());
            }
            case TCS_HEAT_PIPE_FAILURE, TCS_HEATER_CIRCUIT_FAILURE -> {
                TcsSubsystemState tcs = new TcsSubsystemState(
                        18.5,
                        false,
                        true,
                        1.0,
                        false
                );
                yield new SpacecraftSubsystems(curr.eps(), tcs, curr.adcs(), curr.comms(), curr.prop(), curr.obc());
            }
            case ADCS_REACTION_WHEEL_DRAG, ADCS_STAR_TRACKER_BLINDING -> {
                AdcsSubsystemState adcs = AdcsSubsystemState.nominal();
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), adcs, curr.comms(), curr.prop(), curr.obc());
            }
            case PROP_VALVE_LEAK, PROP_THRUSTER_COLD -> {
                PropSubsystemState prop = new PropSubsystemState(
                        curr.prop().propellantMassKg(),
                        22.0,
                        "NOMINAL",
                        1.0,
                        false
                );
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), curr.comms(), prop, curr.obc());
            }
            case OBC_CPU_THRASHING, OBC_WATCHDOG_RESET -> {
                ObcSubsystemState obc = ObcSubsystemState.nominal();
                yield new SpacecraftSubsystems(curr.eps(), curr.tcs(), curr.adcs(), curr.comms(), curr.prop(), obc);
            }
        };

        sc.updateSubsystems(restored);
    }

    /**
     * Clears an active fault alert without automatically repairing the underlying physical hardware.
     */
    public FaultRecord clearFaultAlert(String faultId, Instant currentEpoch) {
        Objects.requireNonNull(faultId, "faultId must not be null");
        Objects.requireNonNull(currentEpoch, "currentEpoch must not be null");

        FaultRecord fault = activeFaults.remove(faultId);
        if (fault == null) {
            fault = faultHistory.stream().filter(f -> f.faultId().equals(faultId)).findFirst()
                    .orElseThrow(() -> new NoSuchElementException("Fault not found: " + faultId));
        }

        String operator = SecurityUtils.getCurrentOperatorUsername().orElse(null);
        FaultRecord cleared = fault.withCleared(currentEpoch, operator);
        recordHistory(cleared);
        detectionEngine.clearAlertSignature(faultId);

        eventPublisher.publish(
                SimulationEventType.FAULT_CLEARED,
                currentEpoch,
                cleared.spacecraftId(),
                "Fault alert CLEARED for " + cleared.scenarioCode() + " (Note: Subsystem physical hardware is NOT restored)",
                Map.of("faultId", faultId, "clearedEpoch", currentEpoch.toString())
        );

        return cleared;
    }

    public List<FaultRecord> listFaults(
            Optional<String> spacecraftId,
            Optional<SubsystemType> subsystem,
            Optional<FaultLifecycleState> state
    ) {
        return faultHistory.stream()
                .filter(f -> spacecraftId.isEmpty() || Objects.equals(f.spacecraftId(), spacecraftId.get()))
                .filter(f -> subsystem.isEmpty() || f.subsystem() == subsystem.get())
                .filter(f -> state.isEmpty() || f.lifecycleState() == state.get())
                .toList();
    }

    public Optional<FaultRecord> getFault(String faultId) {
        FaultRecord active = activeFaults.get(faultId);
        if (active != null) return Optional.of(active);
        return faultHistory.stream().filter(f -> f.faultId().equals(faultId)).findFirst();
    }

    public List<FaultRecord> getActiveFaultsForSpacecraft(String spacecraftId) {
        if (spacecraftId == null) return Collections.emptyList();
        return activeFaults.values().stream()
                .filter(f -> Objects.equals(f.spacecraftId(), spacecraftId))
                .toList();
    }

    public boolean isCommandBlocked(String spacecraftId) {
        if (spacecraftId == null) return false;
        return activeFaults.values().stream()
                .filter(f -> Objects.equals(f.spacecraftId(), spacecraftId))
                .anyMatch(f -> f.scenarioCode() == FaultScenarioCode.COMMS_RF_BLACKOUT
                        || f.scenarioCode() == FaultScenarioCode.OBC_WATCHDOG_RESET);
    }

    public boolean isOpticalCaptureBlocked(String spacecraftId) {
        if (spacecraftId == null) return false;
        return activeFaults.values().stream()
                .filter(f -> Objects.equals(f.spacecraftId(), spacecraftId))
                .anyMatch(f -> f.scenarioCode() == FaultScenarioCode.ADCS_STAR_TRACKER_BLINDING
                        || f.scenarioCode() == FaultScenarioCode.ADCS_REACTION_WHEEL_DRAG);
    }

    public boolean isPropulsionBlocked(String spacecraftId) {
        if (spacecraftId == null) return false;
        return activeFaults.values().stream()
                .filter(f -> Objects.equals(f.spacecraftId(), spacecraftId))
                .anyMatch(f -> f.scenarioCode() == FaultScenarioCode.PROP_VALVE_LEAK
                        || f.scenarioCode() == FaultScenarioCode.PROP_THRUSTER_COLD);
    }

    @Transactional
    private void recordHistory(FaultRecord record) {
        faultHistory.removeIf(f -> f.faultId().equals(record.faultId()));
        faultHistory.add(record);
        while (faultHistory.size() > MAX_FAULT_HISTORY_RECORDS) {
            faultHistory.remove(0);
        }

        if (faultRepository != null) {
            try {
                Optional<FaultRecordEntity> existing = faultRepository.findByFaultId(record.faultId());
                FaultRecordEntity entity = existing.orElseGet(FaultRecordEntity::new);
                entity.setFaultId(record.faultId());
                entity.setSpacecraftId(record.spacecraftId());
                entity.setSubsystem(record.subsystem().name());
                entity.setScenarioCode(record.scenarioCode().name());
                entity.setSeverity(record.severity().name());
                entity.setLifecycleState(record.lifecycleState().name());
                entity.setInjectedEpoch(record.injectedEpoch());
                entity.setDetectedEpoch(record.detectedEpoch());
                entity.setRecoveredEpoch(record.recoveredEpoch());
                entity.setClearedEpoch(record.clearedEpoch());
                entity.setOperatorUsername(record.operatorUsername());
                entity.setRecoveryActionRequired(record.recoveryActionRequired() != null ? record.recoveryActionRequired().name() : null);
                entity.setAutoRecoverable(record.autoRecoverable());
                entity.setDescription(record.description());
                entity.setOperatorExplanation(record.operatorExplanation());
                entity.setParametersJson(JsonUtils.toJson(record.parameters()));
                faultRepository.save(entity);
            } catch (Exception e) {
                log.error("Failed to persist fault record {}: {}", record.faultId(), e.getMessage());
            }
        }
    }

    private FaultRecord mapToRecord(FaultRecordEntity entity) {
        return new FaultRecord(
                entity.getFaultId(),
                entity.getSpacecraftId(),
                SubsystemType.valueOf(entity.getSubsystem()),
                FaultScenarioCode.valueOf(entity.getScenarioCode()),
                FaultSeverity.valueOf(entity.getSeverity()),
                FaultLifecycleState.valueOf(entity.getLifecycleState()),
                entity.getInjectedEpoch(),
                entity.getDetectedEpoch(),
                entity.getRecoveredEpoch(),
                entity.getClearedEpoch(),
                JsonUtils.fromJson(entity.getParametersJson()),
                entity.getDescription(),
                entity.getOperatorExplanation(),
                entity.getRecoveryActionRequired() != null ? RecoveryActionType.valueOf(entity.getRecoveryActionRequired()) : null,
                entity.isAutoRecoverable(),
                entity.getOperatorUsername()
        );
    }

    public void reset() {
        activeFaults.clear();
        faultHistory.clear();
        detectionEngine.reset();
    }
}
