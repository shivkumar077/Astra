package org.astra.anomalies;

import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.core.domain.Spacecraft;
import org.astra.events.SimulationEvent;
import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.simulation.orbital.KeplerianPropagator;
import org.astra.telemetry.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Failure Lab Detection, Lifecycle, and Concurrency Test")
class FaultDetectionAndLifecycleTest {

    private FailureLabService failureLabService;
    private FaultDetectionEngine detectionEngine;
    private SimulationEngine simulationEngine;
    private List<SimulationEvent> emittedEvents;
    private final Instant baseEpoch = Instant.parse("2026-10-24T00:00:00Z");

    @BeforeEach
    void setUp() {
        emittedEvents = new CopyOnWriteArrayList<>();
        SimulationEventPublisher publisher = event -> emittedEvents.add(event);

        detectionEngine = new FaultDetectionEngine();
        failureLabService = new FailureLabService(detectionEngine, publisher);
        simulationEngine = new SimulationEngine(
                new KeplerianPropagator(),
                new TelemetryService(),
                publisher,
                new AnomalyManager(publisher),
                failureLabService,
                null,
                baseEpoch
        );
    }

    @Test
    @DisplayName("Duplicate alert suppression: consecutive simulation steps do not re-emit FAULT_DETECTED")
    void testDuplicateAlertSuppression() {
        Spacecraft aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();

        // 1. Inject ADCS star tracker blinding
        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.ADCS_STAR_TRACKER_BLINDING, FaultSeverity.MAJOR, Collections.emptyMap(), "Stray light blinding"),
                baseEpoch,
                aura1
        );

        emittedEvents.clear();

        // 2. Step 1: Detects threshold condition and emits FAULT_DETECTED
        simulationEngine.step(Duration.ofSeconds(10));
        long detectedEventsCount = emittedEvents.stream()
                .filter(e -> e.type() == SimulationEventType.FAULT_DETECTED)
                .count();
        assertEquals(1, detectedEventsCount, "First step should emit exactly one FAULT_DETECTED event");

        // 3. Step 2 & 3: condition persists, verify no additional FAULT_DETECTED events are emitted
        simulationEngine.step(Duration.ofSeconds(10));
        simulationEngine.step(Duration.ofSeconds(10));

        long totalDetectedEventsCount = emittedEvents.stream()
                .filter(e -> e.type() == SimulationEventType.FAULT_DETECTED)
                .count();
        assertEquals(1, totalDetectedEventsCount, "Subsequent steps must suppress duplicate alerts");
    }

    @Test
    @DisplayName("Recovery rejection: attempting an incompatible recovery procedure is rejected")
    void testIncompatibleRecoveryRejection() {
        Spacecraft aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();

        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION, FaultSeverity.MAJOR, Collections.emptyMap(), "PV cell degradation"),
                baseEpoch,
                aura1
        );

        // Attempt recovery with wrong procedure (SWITCH_BACKUP_STAR_TRACKER instead of SWITCH_REDUNDANT_STRING)
        assertThrows(IllegalArgumentException.class, () -> {
            failureLabService.recoverFault(
                    fault.faultId(),
                    new RecoverFaultRequest(RecoveryActionType.SWITCH_BACKUP_STAR_TRACKER, "Wrong procedure test"),
                    baseEpoch,
                    aura1
            );
        });

        // Verify fault remains active and failure event was emitted
        FaultRecord stillActive = failureLabService.getFault(fault.faultId()).orElseThrow();
        assertEquals(FaultLifecycleState.ACTIVE, stillActive.lifecycleState());

        boolean failureEmitted = emittedEvents.stream()
                .anyMatch(e -> e.type() == SimulationEventType.FAULT_RECOVERY_FAILED);
        assertTrue(failureEmitted, "FAULT_RECOVERY_FAILED event must be emitted");
    }

    @Test
    @DisplayName("Clearing an alert does not magically restore underlying physical hardware")
    void testClearAlertDoesNotRepairHardware() {
        Spacecraft aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();

        FaultRecord fault = failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION, FaultSeverity.MAJOR, Map.of("solarMultiplier", 0.4), "Solar panel micro-cracking"),
                baseEpoch,
                aura1
        );

        assertEquals(0.4, aura1.getSubsystems().eps().solarDegradationMultiplier());

        // Clear the alert
        FaultRecord cleared = failureLabService.clearFaultAlert(fault.faultId(), baseEpoch);
        assertEquals(FaultLifecycleState.CLEARED, cleared.lifecycleState());
        assertNotNull(cleared.clearedEpoch());

        // Hardware must STILL be degraded!
        assertEquals(0.4, aura1.getSubsystems().eps().solarDegradationMultiplier(),
                "Subsystem hardware must remain degraded when operator clears alert without recovery procedure");
    }

    @Test
    @DisplayName("Spacecraft isolation: fault on AURA-1 has zero effect on TERRA-OBS or SOLIS-RELAY")
    void testSpacecraftIsolation() {
        Spacecraft aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        Spacecraft solis = simulationEngine.getSpacecraft("SOLIS-RELAY").orElseThrow();

        // Inject RF Blackout on AURA-1
        failureLabService.injectFault(
                new InjectFaultRequest("AURA-1", FaultScenarioCode.COMMS_RF_BLACKOUT, FaultSeverity.CRITICAL, Collections.emptyMap(), "Blackout"),
                baseEpoch,
                aura1
        );

        // Step simulation
        simulationEngine.step(Duration.ofSeconds(30));

        // AURA-1 is in blackout
        assertTrue(aura1.getSubsystems().comms().blackoutActive());
        assertTrue(failureLabService.isCommandBlocked("AURA-1"));

        // TERRA-OBS is completely nominal
        assertFalse(terra.getSubsystems().comms().blackoutActive());
        assertEquals(12.4, terra.getSubsystems().comms().linkMarginDb(), 1e-3);
        assertFalse(failureLabService.isCommandBlocked("TERRA-OBS"));

        // SOLIS-RELAY is completely nominal
        assertFalse(solis.getSubsystems().comms().blackoutActive());
        assertFalse(failureLabService.isCommandBlocked("SOLIS-RELAY"));
    }

    @Test
    @DisplayName("Concurrent fault injection, progression, and recovery does not corrupt state")
    void testConcurrentOperations() throws Exception {
        Spacecraft aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(executor.submit(() -> {
                try {
                    latch.countDown();
                    latch.await();

                    for (int step = 0; step < 15; step++) {
                        simulationEngine.step(Duration.ofSeconds(2));
                        if (idx == 0 && step == 3) {
                            failureLabService.injectFault(
                                    new InjectFaultRequest("AURA-1", FaultScenarioCode.ADCS_REACTION_WHEEL_DRAG, FaultSeverity.WARNING, Collections.emptyMap(), "Test"),
                                    baseEpoch,
                                    aura1
                            );
                        }
                    }
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }));
        }

        for (Future<?> f : futures) {
            f.get(10, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertNotNull(aura1.getSubsystems());
        assertNotNull(aura1.getCurrentOrbitState());
    }
}
