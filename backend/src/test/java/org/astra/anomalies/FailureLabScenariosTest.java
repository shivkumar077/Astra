package org.astra.anomalies;

import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.domain.subsystems.SpacecraftSubsystems;
import org.astra.events.SimulationEventPublisher;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.simulation.orbital.KeplerianPropagator;
import org.astra.telemetry.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Failure Lab Subsystem Domain Scenarios Test")
class FailureLabScenariosTest {

    private FailureLabService failureLabService;
    private SimulationEngine simulationEngine;
    private Spacecraft aura1;
    private final Instant baseEpoch = Instant.parse("2026-10-24T00:00:00Z");

    @BeforeEach
    void setUp() {
        failureLabService = new FailureLabService(new FaultDetectionEngine(), event -> {});
        simulationEngine = new SimulationEngine(
                new KeplerianPropagator(),
                new TelemetryService(),
                event -> {},
                new AnomalyManager(event -> {}),
                failureLabService,
                null,
                baseEpoch
        );
        aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
    }

    @Test
    @DisplayName("EPS: Solar Array String Degradation reduces generation and recovers with redundant string")
    void testEpsSolarArrayDegradationLifecycle() {
        double initialWatts = aura1.getSubsystems().eps().solarArrayWatts();
        assertTrue(initialWatts > 1000.0, "Nominal watts should be > 1000W");

        // 1. Inject solar degradation fault
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION, FaultSeverity.MAJOR, Map.of("solarMultiplier", 0.35), "PV string short"),
                baseEpoch,
                aura1
        );

        assertEquals(FaultLifecycleState.ACTIVE, fault.lifecycleState());
        assertEquals(0.35, aura1.getSubsystems().eps().solarDegradationMultiplier(), 1e-4);
        assertTrue(aura1.getSubsystems().eps().solarArrayWatts() < initialWatts * 0.5, "Solar array watts must drop significantly");

        // 2. Step simulation: verify detection and continued lower generation
        simulationEngine.step(Duration.ofSeconds(60));
        FaultRecord updated = failureLabService.getFault(fault.faultId()).orElseThrow();
        assertEquals(FaultLifecycleState.DETECTED, updated.lifecycleState());

        // 3. Recover with SWITCH_REDUNDANT_STRING
        FaultRecord recovered = failureLabService.recoverFault(
                fault.faultId(),
                new RecoverFaultRequest(RecoveryActionType.SWITCH_REDUNDANT_STRING, "Switched to Backup PV String B"),
                simulationEngine.getCurrentEpoch(),
                aura1
        );

        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
        assertEquals(1.0, aura1.getSubsystems().eps().solarDegradationMultiplier(), 1e-4);
        assertTrue(aura1.getSubsystems().eps().solarArrayWatts() > 1000.0, "Generation restored to nominal");
    }

    @Test
    @DisplayName("EPS: Bus Overload triggers load shedding and recovers with bus reconfiguration")
    void testEpsBusOverloadAndLoadShedding() {
        // 1. Inject bus overload
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.EPS_BUS_OVERLOAD, FaultSeverity.MAJOR, Map.of("overloadWatts", 720.0), "Primary DC bus shunt fault"),
                baseEpoch,
                aura1
        );

        assertTrue(aura1.getSubsystems().eps().busOverloadActive());
        assertEquals(720.0, aura1.getSubsystems().eps().busLoadWatts());
        assertEquals(24.2, aura1.getSubsystems().eps().batteryVoltageVolts());

        // 2. Step simulation into eclipse with heavy load to drop battery below 30%
        // Force battery SoC to 28% to trigger load shedding
        aura1.updatePowerMetrics(28.0, 0.0);
        simulationEngine.step(Duration.ofSeconds(60));

        assertTrue(aura1.getSubsystems().eps().loadSheddingActive(), "Protective load shedding must activate when battery SoC < 30%");

        // 3. Recover with RECONFIGURE_POWER_BUS
        FaultRecord recovered = failureLabService.recoverFault(
                fault.faultId(),
                new RecoverFaultRequest(RecoveryActionType.RECONFIGURE_POWER_BUS, "Isolated secondary DC bus"),
                simulationEngine.getCurrentEpoch(),
                aura1
        );

        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
        assertFalse(aura1.getSubsystems().eps().busOverloadActive());
        assertFalse(aura1.getSubsystems().eps().loadSheddingActive());
        assertEquals(380.0, aura1.getSubsystems().eps().busLoadWatts());
        assertEquals(28.0, aura1.getSubsystems().eps().batteryVoltageVolts());
    }

    @Test
    @DisplayName("COMMS: RF Blackout disables link and recovers with transceiver reset")
    void testCommsBlackoutLifecycle() {
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.COMMS_RF_BLACKOUT, FaultSeverity.CRITICAL, Collections.emptyMap(), "Transceiver LO lock lost"),
                baseEpoch,
                aura1
        );

        assertTrue(aura1.getSubsystems().comms().blackoutActive());
        assertFalse(aura1.getSubsystems().comms().carrierLocked());
        assertEquals(0.0, aura1.getSubsystems().comms().linkMarginDb());
        assertEquals(100.0, aura1.getSubsystems().comms().packetLossPercent());
        assertTrue(failureLabService.isCommandBlocked("AURA-1"));

        // Recover with RESET_RF_TRANSCEIVER
        FaultRecord recovered = failureLabService.recoverFault(
                fault.faultId(),
                new RecoverFaultRequest(RecoveryActionType.RESET_RF_TRANSCEIVER, "Cycled power to S-band transceiver"),
                baseEpoch,
                aura1
        );

        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
        assertFalse(aura1.getSubsystems().comms().blackoutActive());
        assertTrue(aura1.getSubsystems().comms().carrierLocked());
        assertEquals(12.4, aura1.getSubsystems().comms().linkMarginDb(), 1e-3);
        assertFalse(failureLabService.isCommandBlocked("AURA-1"));
    }

    @Test
    @DisplayName("TCS: Heat Pipe Failure causes component temperature rise and triggers thermal safing")
    void testTcsHeatPipeFailureAndOverheat() {
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.TCS_HEAT_PIPE_FAILURE, FaultSeverity.MAJOR, Collections.emptyMap(), "Ammonia loop leak"),
                baseEpoch,
                aura1
        );

        assertEquals(0.15, aura1.getSubsystems().tcs().radiatorEfficiency(), 1e-4);

        // Advance simulation by 250 seconds in sunlight -> temperature climbs past 60 deg C
        simulationEngine.step(Duration.ofSeconds(250));

        assertTrue(aura1.getSubsystems().tcs().temperatureCelsius() > 60.0, "Temperature should rise above 60°C in sunlight");
        assertTrue(aura1.getSubsystems().tcs().thermalSafingActive(), "Thermal safing should be active");

        // Verify severity escalation to CRITICAL
        FaultRecord detected = failureLabService.getFault(fault.faultId()).orElseThrow();
        assertEquals(FaultSeverity.CRITICAL, detected.severity());

        // Recover with PURGE_HEAT_PIPE_LOOP
        FaultRecord recovered = failureLabService.recoverFault(
                fault.faultId(),
                new RecoverFaultRequest(RecoveryActionType.PURGE_HEAT_PIPE_LOOP, "Purged non-condensable gas in heat pipe loop"),
                simulationEngine.getCurrentEpoch(),
                aura1
        );

        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
        assertEquals(1.0, aura1.getSubsystems().tcs().radiatorEfficiency(), 1e-4);
        assertFalse(aura1.getSubsystems().tcs().thermalSafingActive());
        assertEquals(18.5, aura1.getSubsystems().tcs().temperatureCelsius(), 1e-3);
    }

    @Test
    @DisplayName("ADCS: Reaction Wheel Drag spikes RPM and pointing error, then recovers")
    void testAdcsReactionWheelDrag() {
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.ADCS_REACTION_WHEEL_DRAG, FaultSeverity.WARNING, Map.of("targetRpm", 5800.0), "Bearing friction on RWA-2"),
                baseEpoch,
                aura1
        );

        assertTrue(aura1.getSubsystems().adcs().wheelFrictionActive());
        assertEquals(5800.0, aura1.getSubsystems().adcs().reactionWheelSpeedRpm());
        assertTrue(aura1.getSubsystems().adcs().pointingErrorDegrees() > 1.0);
        assertEquals("DEGRADED", aura1.getSubsystems().adcs().attitudeLockStatus());
        assertTrue(failureLabService.isOpticalCaptureBlocked("AURA-1"));

        // Recover with SPIN_DOWN_REACTION_WHEELS
        FaultRecord recovered = failureLabService.recoverFault(
                fault.faultId(),
                new RecoverFaultRequest(RecoveryActionType.SPIN_DOWN_REACTION_WHEELS, "Commenced wheel desaturation and bearing warmup"),
                baseEpoch,
                aura1
        );

        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
        assertFalse(aura1.getSubsystems().adcs().wheelFrictionActive());
        assertEquals(2450.0, aura1.getSubsystems().adcs().reactionWheelSpeedRpm());
        assertEquals(0.04, aura1.getSubsystems().adcs().pointingErrorDegrees(), 1e-4);
        assertEquals("LOCKED", aura1.getSubsystems().adcs().attitudeLockStatus());
        assertFalse(failureLabService.isOpticalCaptureBlocked("AURA-1"));
    }

    @Test
    @DisplayName("PROP: Propellant Valve Leak depletes mass and pressure, recovered by valve isolation")
    void testPropValveLeakAndDepletion() {
        double initialMass = aura1.getSubsystems().prop().propellantMassKg();
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.PROP_VALVE_LEAK, FaultSeverity.MAJOR, Collections.emptyMap(), "Thruster 3 latch valve seal breach"),
                baseEpoch,
                aura1
        );

        assertTrue(aura1.getSubsystems().prop().leakActive());
        assertEquals("LEAKING", aura1.getSubsystems().prop().valveHealth());

        // Step simulation 200 seconds -> propellant drains at 0.05 kg/s = 10 kg
        simulationEngine.step(Duration.ofSeconds(200));

        double leakedMass = aura1.getSubsystems().prop().propellantMassKg();
        assertTrue(leakedMass < initialMass - 5.0, "Propellant must have leaked");
        assertTrue(aura1.getSubsystems().prop().tankPressureBar() < 15.0, "Tank pressure must drop");

        // Recover with ISOLATE_PROPULSION_VALVE
        FaultRecord recovered = failureLabService.recoverFault(
                fault.faultId(),
                new RecoverFaultRequest(RecoveryActionType.ISOLATE_PROPULSION_VALVE, "Closed upstream pyro-isolation latch valve"),
                simulationEngine.getCurrentEpoch(),
                aura1
        );

        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
        assertFalse(aura1.getSubsystems().prop().leakActive());
        assertEquals("NOMINAL", aura1.getSubsystems().prop().valveHealth());
        assertEquals(22.0, aura1.getSubsystems().prop().tankPressureBar());
    }

    @Test
    @DisplayName("OBC: Watchdog Reset triggers reboot countdown and restores flight software")
    void testObcWatchdogRebootCycle() {
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.OBC_WATCHDOG_RESET, FaultSeverity.CRITICAL, Map.of("rebootDurationSeconds", 30.0), "Watchdog hardware timeout"),
                baseEpoch,
                aura1
        );

        assertEquals("REBOOTING", aura1.getSubsystems().obc().flightSoftwareState());
        assertEquals(30.0, aura1.getSubsystems().obc().rebootRemainingSeconds());
        assertTrue(failureLabService.isCommandBlocked("AURA-1"));

        // Step simulation 15 seconds -> countdown continues
        simulationEngine.step(Duration.ofSeconds(15));
        assertEquals("REBOOTING", aura1.getSubsystems().obc().flightSoftwareState());
        assertEquals(15.0, aura1.getSubsystems().obc().rebootRemainingSeconds(), 1e-3);
        assertTrue(failureLabService.isCommandBlocked("AURA-1"));

        // Step remaining 15 seconds -> reboot completes automatically!
        simulationEngine.step(Duration.ofSeconds(15));
        assertEquals("NOMINAL", aura1.getSubsystems().obc().flightSoftwareState());
        assertEquals(0.0, aura1.getSubsystems().obc().rebootRemainingSeconds());
        assertEquals(1, aura1.getSubsystems().obc().rebootCount());
        assertFalse(failureLabService.isCommandBlocked("AURA-1"));

        // Verify fault in history transitioned to RECOVERED
        FaultRecord recovered = failureLabService.getFault(fault.faultId()).orElseThrow();
        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());
    }
}
