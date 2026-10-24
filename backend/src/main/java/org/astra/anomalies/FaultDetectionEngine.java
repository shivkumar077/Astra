package org.astra.anomalies;

import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.subsystems.SpacecraftSubsystems;
import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Centrally defined detection engine that evaluates modeled telemetry and subsystem conditions against
 * physical and operational limits.
 * <p>
 * Implements hysteresis and duplicate alert suppression (anti-flapping) to prevent continuous alert
 * oscillations across simulation ticks.
 */
@Component
public class FaultDetectionEngine {

    public static final double EPS_SOC_CRITICAL_PERCENT = 20.0;
    public static final double EPS_SOC_WARNING_PERCENT = 30.0;
    public static final double EPS_VOLTAGE_LOW_VOLTS = 24.5;

    public static final double TCS_OVERHEAT_CRITICAL_CELSIUS = 60.0;
    public static final double TCS_OVERHEAT_WARNING_CELSIUS = 45.0;
    public static final double TCS_FREEZE_CRITICAL_CELSIUS = -20.0;
    public static final double TCS_FREEZE_WARNING_CELSIUS = 0.0;

    public static final double ADCS_POINTING_ERROR_CRITICAL_DEG = 5.0;
    public static final double ADCS_POINTING_ERROR_WARNING_DEG = 1.0;

    public static final double COMMS_LINK_MARGIN_MIN_DB = 3.0;
    public static final double COMMS_PACKET_LOSS_MAX_PERCENT = 15.0;

    public static final double PROP_TANK_PRESSURE_MIN_BAR = 15.0;

    public static final double OBC_CPU_MAX_PERCENT = 90.0;

    // Track active alert signatures to suppress duplicate alerts on consecutive ticks
    private final Set<String> activeAlertSignatures = ConcurrentHashMap.newKeySet();

    /**
     * Evaluates an active fault record against authoritative spacecraft subsystem states.
     *
     * @param fault Current fault record
     * @param spacecraft Spacecraft holding authoritative physical states
     * @param currentEpoch Current simulation epoch
     * @param eventPublisher Simulation event publisher
     * @return Updated FaultRecord with transitions if detection occurred
     */
    public FaultRecord evaluateFault(
            FaultRecord fault,
            Spacecraft spacecraft,
            Instant currentEpoch,
            SimulationEventPublisher eventPublisher
    ) {
        Objects.requireNonNull(fault, "fault must not be null");
        Objects.requireNonNull(spacecraft, "spacecraft must not be null");

        // Only evaluate faults that are in injected, active, or detected states
        if (fault.lifecycleState() != FaultLifecycleState.INJECTED
                && fault.lifecycleState() != FaultLifecycleState.ACTIVE
                && fault.lifecycleState() != FaultLifecycleState.DETECTED) {
            return fault;
        }

        SpacecraftSubsystems subsystems = spacecraft.getSubsystems();
        if (subsystems == null) {
            return fault;
        }

        DetectionResult detection = checkScenarioThreshold(fault.scenarioCode(), subsystems);
        if (!detection.conditionMet()) {
            return fault;
        }

        String alertSignature = fault.faultId() + ":" + detection.computedSeverity();

        // 1. First-time detection: transition from INJECTED/ACTIVE to DETECTED
        if (fault.lifecycleState() == FaultLifecycleState.INJECTED || fault.lifecycleState() == FaultLifecycleState.ACTIVE) {
            FaultRecord detected = fault
                    .withSeverity(detection.computedSeverity())
                    .withDetected(currentEpoch, detection.explanation());

            activeAlertSignatures.add(alertSignature);

            if (eventPublisher != null) {
                eventPublisher.publish(
                        SimulationEventType.FAULT_DETECTED,
                        currentEpoch,
                        spacecraft.getId(),
                        "Fault DETECTED on " + fault.subsystem() + ": " + detection.explanation(),
                        Map.of(
                                "faultId", fault.faultId(),
                                "scenarioCode", fault.scenarioCode().name(),
                                "subsystem", fault.subsystem().name(),
                                "severity", detection.computedSeverity().name(),
                                "explanation", detection.explanation(),
                                "detectedEpoch", currentEpoch.toString()
                        )
                );
            }
            return detected;
        }

        // 2. Already detected: check for severity escalation (e.g. WARNING -> CRITICAL)
        if (fault.lifecycleState() == FaultLifecycleState.DETECTED && fault.severity() != detection.computedSeverity()) {
            FaultSeverity previousSeverity = fault.severity();
            FaultRecord updated = fault.withSeverity(detection.computedSeverity());
            activeAlertSignatures.add(alertSignature);

            if (eventPublisher != null) {
                eventPublisher.publish(
                        SimulationEventType.FAULT_SEVERITY_CHANGED,
                        currentEpoch,
                        spacecraft.getId(),
                        "Fault severity changed from " + previousSeverity + " to " + detection.computedSeverity() + " on " + fault.scenarioCode(),
                        Map.of(
                                "faultId", fault.faultId(),
                                "scenarioCode", fault.scenarioCode().name(),
                                "subsystem", fault.subsystem().name(),
                                "previousSeverity", previousSeverity.name(),
                                "newSeverity", detection.computedSeverity().name(),
                                "explanation", detection.explanation()
                        )
                );
            }
            return updated;
        }

        // 3. Steady state condition already detected: suppress duplicate event
        return fault;
    }

    public void clearAlertSignature(String faultId) {
        activeAlertSignatures.removeIf(sig -> sig.startsWith(faultId + ":"));
    }

    public void reset() {
        activeAlertSignatures.clear();
    }

    private DetectionResult checkScenarioThreshold(FaultScenarioCode scenarioCode, SpacecraftSubsystems sub) {
        return switch (scenarioCode) {
            case EPS_SOLAR_ARRAY_DEGRADATION -> {
                double mult = sub.eps().solarDegradationMultiplier();
                if (mult < 0.99) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("EPS solar array generation degraded (multiplier: %.2f)", mult));
                }
                yield DetectionResult.nominal();
            }
            case EPS_BATTERY_CELL_DEGRADATION -> {
                double soc = sub.eps().batterySocPercent();
                double volts = sub.eps().batteryVoltageVolts();
                if (soc <= EPS_SOC_CRITICAL_PERCENT || volts <= 22.5) {
                    yield new DetectionResult(true, FaultSeverity.CRITICAL,
                            String.format("EPS battery cell degradation critical: SoC %.1f%%, voltage %.1fV", soc, volts));
                } else if (soc <= EPS_SOC_WARNING_PERCENT || volts <= EPS_VOLTAGE_LOW_VOLTS) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("EPS battery cell degradation: SoC %.1f%%, voltage %.1fV", soc, volts));
                }
                yield DetectionResult.nominal();
            }
            case EPS_BUS_OVERLOAD -> {
                if (sub.eps().busOverloadActive() || sub.eps().busLoadWatts() > 500.0) {
                    FaultSeverity sev = sub.eps().loadSheddingActive() ? FaultSeverity.CRITICAL : FaultSeverity.MAJOR;
                    yield new DetectionResult(true, sev,
                            String.format("EPS electrical bus overload detected (load: %.1fW, load-shedding: %b)",
                                    sub.eps().busLoadWatts(), sub.eps().loadSheddingActive()));
                }
                yield DetectionResult.nominal();
            }
            case COMMS_RF_BLACKOUT -> {
                if (sub.comms().blackoutActive() || !sub.comms().carrierLocked()) {
                    yield new DetectionResult(true, FaultSeverity.CRITICAL,
                            "COMMS carrier lock lost: complete RF blackout active on uplink/downlink");
                }
                yield DetectionResult.nominal();
            }
            case COMMS_LINK_DEGRADATION -> {
                double margin = sub.comms().linkMarginDb();
                double loss = sub.comms().packetLossPercent();
                if (margin < COMMS_LINK_MARGIN_MIN_DB || loss > COMMS_PACKET_LOSS_MAX_PERCENT) {
                    yield new DetectionResult(true, FaultSeverity.WARNING,
                            String.format("COMMS RF link margin degraded: %.1f dB (< %.1f dB limit), packet loss %.1f%%",
                                    margin, COMMS_LINK_MARGIN_MIN_DB, loss));
                }
                yield DetectionResult.nominal();
            }
            case TCS_HEAT_PIPE_FAILURE -> {
                double temp = sub.tcs().temperatureCelsius();
                if (temp >= TCS_OVERHEAT_CRITICAL_CELSIUS || sub.tcs().thermalSafingActive()) {
                    yield new DetectionResult(true, FaultSeverity.CRITICAL,
                            String.format("TCS heat pipe failure critical: component temp %.1f°C exceeds %.1f°C safing threshold",
                                    temp, TCS_OVERHEAT_CRITICAL_CELSIUS));
                } else if (temp >= TCS_OVERHEAT_WARNING_CELSIUS || sub.tcs().radiatorEfficiency() < 0.5) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("TCS heat pipe loop failure: component temp elevated at %.1f°C (radiator efficiency: %.2f)",
                                    temp, sub.tcs().radiatorEfficiency()));
                }
                yield DetectionResult.nominal();
            }
            case TCS_HEATER_CIRCUIT_FAILURE -> {
                double temp = sub.tcs().temperatureCelsius();
                if (temp <= TCS_FREEZE_CRITICAL_CELSIUS) {
                    yield new DetectionResult(true, FaultSeverity.CRITICAL,
                            String.format("TCS heater circuit failure critical: component temp %.1f°C below freezing threshold", temp));
                } else if (temp <= TCS_FREEZE_WARNING_CELSIUS || !sub.tcs().heaterOperational()) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("TCS heater circuit open-loop failure: heater inoperable, temp %.1f°C", temp));
                }
                yield DetectionResult.nominal();
            }
            case ADCS_REACTION_WHEEL_DRAG -> {
                double err = sub.adcs().pointingErrorDegrees();
                double rpm = sub.adcs().reactionWheelSpeedRpm();
                if (err >= ADCS_POINTING_ERROR_CRITICAL_DEG) {
                    yield new DetectionResult(true, FaultSeverity.CRITICAL,
                            String.format("ADCS reaction wheel drag severe: pointing error %.2f° exceeds critical threshold", err));
                } else if (err >= ADCS_POINTING_ERROR_WARNING_DEG || sub.adcs().wheelFrictionActive() || rpm > 4500.0) {
                    yield new DetectionResult(true, FaultSeverity.WARNING,
                            String.format("ADCS reaction wheel drag detected: pointing error %.2f°, wheel speed %.0f RPM", err, rpm));
                }
                yield DetectionResult.nominal();
            }
            case ADCS_STAR_TRACKER_BLINDING -> {
                if (!sub.adcs().starTrackerLocked() || "LOST".equalsIgnoreCase(sub.adcs().attitudeLockStatus())) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("ADCS star tracker lock lost (pointing error: %.2f°, attitude lock: %s)",
                                    sub.adcs().pointingErrorDegrees(), sub.adcs().attitudeLockStatus()));
                }
                yield DetectionResult.nominal();
            }
            case PROP_VALVE_LEAK -> {
                if (sub.prop().leakActive() || sub.prop().tankPressureBar() <= PROP_TANK_PRESSURE_MIN_BAR) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("PROP propulsion valve leak: tank pressure at %.1f bar (limit: %.1f bar)",
                                    sub.prop().tankPressureBar(), PROP_TANK_PRESSURE_MIN_BAR));
                }
                yield DetectionResult.nominal();
            }
            case PROP_THRUSTER_COLD -> {
                if (sub.prop().thrustMultiplier() < 0.1 || "COLD_LOCKOUT".equalsIgnoreCase(sub.prop().valveHealth())) {
                    yield new DetectionResult(true, FaultSeverity.WARNING,
                            "PROP thruster line cold: manifold temperature below minimum operating ignition limit");
                }
                yield DetectionResult.nominal();
            }
            case OBC_CPU_THRASHING -> {
                double cpu = sub.obc().cpuUtilizationPercent();
                if (cpu >= OBC_CPU_MAX_PERCENT) {
                    yield new DetectionResult(true, FaultSeverity.MAJOR,
                            String.format("OBC CPU saturation thrashing detected: %.1f%% (>= %.1f%% threshold)",
                                    cpu, OBC_CPU_MAX_PERCENT));
                }
                yield DetectionResult.nominal();
            }
            case OBC_WATCHDOG_RESET -> {
                if ("REBOOTING".equalsIgnoreCase(sub.obc().flightSoftwareState()) || sub.obc().rebootRemainingSeconds() > 0.0) {
                    yield new DetectionResult(true, FaultSeverity.CRITICAL,
                            String.format("OBC watchdog timeout: simulated processor restart in progress (%.1fs remaining)",
                                    sub.obc().rebootRemainingSeconds()));
                }
                yield DetectionResult.nominal();
            }
        };
    }

    private record DetectionResult(boolean conditionMet, FaultSeverity computedSeverity, String explanation) {
        static DetectionResult nominal() {
            return new DetectionResult(false, FaultSeverity.INFO, "");
        }
    }
}
