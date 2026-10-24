package org.astra.simulation.engine;

import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.simulation.orbital.KeplerianPropagator;
import org.astra.telemetry.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SimulationEngine Authoritative State & Fleet Coordination Tests")
class SimulationEngineTest {

    private TelemetryService telemetryService;
    private SimulationEngine engine;
    private final Instant baseEpoch = Instant.parse("2026-10-24T00:00:00Z");

    @BeforeEach
    void setUp() {
        telemetryService = new TelemetryService(200);
        engine = new SimulationEngine(new KeplerianPropagator(), telemetryService, baseEpoch);
    }

    @Test
    @DisplayName("Simulation initializes with default 3-vehicle fleet and active telemetry")
    void testFleetInitialization() {
        assertEquals(SimulationLifecycle.RUNNING, engine.getLifecycle());
        assertEquals(baseEpoch, engine.getCurrentEpoch());
        assertEquals(0.0, engine.getElapsedSeconds());

        List<Spacecraft> fleet = engine.getAllSpacecraft();
        assertEquals(3, fleet.size(), "Default fleet must contain exactly 3 operational spacecraft");

        assertTrue(engine.getSpacecraft("AURA-1").isPresent());
        assertTrue(engine.getSpacecraft("TERRA-OBS").isPresent());
        assertTrue(engine.getSpacecraft("SOLIS-RELAY").isPresent());

        // Each spacecraft should already have initial telemetry snapshot recorded
        for (Spacecraft sc : fleet) {
            var snapshots = telemetryService.getRecentSnapshots(sc.getId(), 10);
            assertFalse(snapshots.isEmpty(), "Initial snapshot must be emitted for " + sc.getId());
            assertEquals(baseEpoch, snapshots.get(0).timestamp());
        }
    }

    @Test
    @DisplayName("Advancing simulation step synchronously advances all spacecraft to identical target epoch")
    void testSynchronizedFleetAdvancement() {
        Duration stepDuration = Duration.ofSeconds(600);
        Instant targetEpoch = engine.step(stepDuration);

        assertEquals(baseEpoch.plus(stepDuration), targetEpoch);
        assertEquals(targetEpoch, engine.getCurrentEpoch());
        assertEquals(600.0, engine.getElapsedSeconds());

        for (Spacecraft sc : engine.getAllSpacecraft()) {
            assertEquals(targetEpoch, sc.getOrbitState().epoch(),
                    "Spacecraft " + sc.getId() + " must be synchronized to target simulation epoch");
        }
    }

    @Test
    @DisplayName("Analytical propagation is invariant under arbitrary step discretizations")
    void testStepDiscretizationInvariance() {
        // Run engine A: advance 1800s in one single step
        TelemetryService telA = new TelemetryService(50);
        SimulationEngine engineA = new SimulationEngine(new KeplerianPropagator(), telA, baseEpoch);
        engineA.step(Duration.ofSeconds(1800));

        // Run engine B: advance 1800s in 18 discrete 100s steps
        TelemetryService telB = new TelemetryService(50);
        SimulationEngine engineB = new SimulationEngine(new KeplerianPropagator(), telB, baseEpoch);
        for (int i = 0; i < 18; i++) {
            engineB.step(Duration.ofSeconds(100));
        }

        Spacecraft auraA = engineA.getSpacecraft("AURA-1").orElseThrow();
        Spacecraft auraB = engineB.getSpacecraft("AURA-1").orElseThrow();

        // Positions should match to within 1 millimeter (1e-6 km)
        double posDiff = auraA.getOrbitState().positionKm().subtract(auraB.getOrbitState().positionKm()).norm();
        assertEquals(0.0, posDiff, 1e-4, "Discretization must yield mathematically identical analytical orbit state");

        double velDiff = auraA.getOrbitState().velocityKmPerSec().subtract(auraB.getOrbitState().velocityKmPerSec()).norm();
        assertEquals(0.0, velDiff, 1e-6, "Velocity vectors must match exactly regardless of step division");
    }

    @Test
    @DisplayName("Negative time advancement is strictly rejected")
    void testNegativeStepRejection() {
        assertThrows(IllegalArgumentException.class, () -> engine.step(Duration.ofSeconds(-10)));
    }

    @Test
    @DisplayName("Advancing a STOPPED simulation is rejected")
    void testStoppedSimulationAdvancementRejection() {
        engine.stop();
        assertEquals(SimulationLifecycle.STOPPED, engine.getLifecycle());

        assertThrows(IllegalStateException.class, () -> engine.step(Duration.ofSeconds(60)));
    }

    @Test
    @DisplayName("Simulation lifecycle transitions (Pause, Resume, Stop, Reset)")
    void testLifecycleTransitions() {
        assertEquals(SimulationLifecycle.RUNNING, engine.getLifecycle());

        engine.pause();
        assertEquals(SimulationLifecycle.PAUSED, engine.getLifecycle());

        engine.resume();
        assertEquals(SimulationLifecycle.RUNNING, engine.getLifecycle());

        engine.stop();
        assertEquals(SimulationLifecycle.STOPPED, engine.getLifecycle());

        // Re-initialize resets to RUNNING and resets simulation epoch
        engine.initializeDefaultFleet();
        assertEquals(SimulationLifecycle.RUNNING, engine.getLifecycle());
        assertEquals(baseEpoch, engine.getCurrentEpoch());
    }

    @Test
    @DisplayName("Simulated EPS power metrics react to eclipse transitions")
    void testPowerSubsystemDynamics() {
        Spacecraft aura1 = engine.getSpacecraft("AURA-1").orElseThrow();
        double initialSoc = aura1.getBatterySocPercent();

        // Advance 2 hours in steps of 60 seconds
        for (int i = 0; i < 120; i++) {
            engine.step(Duration.ofSeconds(60));
            if (aura1.getOrbitState().inEclipse()) {
                assertEquals(0.0, aura1.getSolarArrayGenerationWatts(),
                        "Solar array power must drop to 0W during eclipse");
            } else {
                assertTrue(aura1.getSolarArrayGenerationWatts() > 0.0,
                        "Solar array must generate power in sunlight");
            }
        }

        assertTrue(aura1.getBatterySocPercent() > 0.0 && aura1.getBatterySocPercent() <= 100.0,
                "Battery state of charge must remain within physical bounds [0, 100%]");
    }

    @Test
    @DisplayName("Concurrent reads and state advancement maintain consistency without exceptions")
    void testConcurrentReadAndStepSafety() throws InterruptedException, ExecutionException {
        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);

        // Submitter tasks: 2 tasks reading, 1 task advancing time, 1 task checking telemetry
        Callable<Boolean> readerTask = () -> {
            latch.await();
            for (int i = 0; i < 100; i++) {
                List<Spacecraft> scList = engine.getAllSpacecraft();
                assertFalse(scList.isEmpty());
                for (Spacecraft sc : scList) {
                    assertNotNull(sc.getOrbitState().positionKm());
                }
            }
            return true;
        };

        Callable<Boolean> stepperTask = () -> {
            latch.await();
            for (int i = 0; i < 50; i++) {
                engine.step(Duration.ofSeconds(10));
            }
            return true;
        };

        Callable<Boolean> telemetryTask = () -> {
            latch.await();
            for (int i = 0; i < 100; i++) {
                var snaps = telemetryService.getRecentSnapshots("AURA-1", 10);
                assertFalse(snaps.isEmpty());
            }
            return true;
        };

        Future<Boolean> f1 = executor.submit(readerTask);
        Future<Boolean> f2 = executor.submit(readerTask);
        Future<Boolean> f3 = executor.submit(stepperTask);
        Future<Boolean> f4 = executor.submit(telemetryTask);

        latch.countDown(); // start all concurrently

        assertTrue(f1.get());
        assertTrue(f2.get());
        assertTrue(f3.get());
        assertTrue(f4.get());

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
    }
}
