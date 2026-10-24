package org.astra.simulation.engine;

import org.astra.anomalies.AnomalyManager;
import org.astra.core.domain.*;
import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.astra.simulation.orbital.KeplerianPropagator;
import org.astra.simulation.orbital.OrbitalPropagator;
import org.astra.telemetry.TelemetryService;
import org.astra.telemetry.TelemetrySnapshot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Server-authoritative satellite simulation engine.
 * <p>
 * Responsibilities:
 * <ul>
 *   <li>Maintains authoritative spacecraft physical and operational states.</li>
 *   <li>Owns the deterministic simulation clock decoupled from system wall-clock time.</li>
 *   <li>Coordinates synchronous, multi-spacecraft orbital state propagation.</li>
 *   <li>Emits immutable telemetry snapshots to the telemetry buffer.</li>
 *   <li>Publishes authoritative simulation and fleet telemetry events.</li>
 *   <li>Guarantees concurrent-safe atomic updates via read-write synchronization.</li>
 * </ul>
 */
@Service
public class SimulationEngine {

    private final OrbitalPropagator orbitalPropagator;
    private final TelemetryService telemetryService;
    private final SimulationEventPublisher eventPublisher;
    private final AnomalyManager anomalyManager;
    private final org.astra.anomalies.FailureLabService failureLabService;
    private final org.astra.websocket.TelemetryStreamBroadcaster telemetryBroadcaster;
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();

    private SimulationClock clock;
    private SimulationLifecycle lifecycle;
    private final Map<String, Spacecraft> fleet = new ConcurrentHashMap<>();

    // Tracks initial orbital elements at t0 for each spacecraft to preserve analytical Keplerian truth
    private final Map<String, KeplerianElements> baseElements = new ConcurrentHashMap<>();
    private Instant baseEpoch;

    @Autowired
    public SimulationEngine(
            TelemetryService telemetryService,
            Optional<SimulationEventPublisher> eventPublisher,
            Optional<AnomalyManager> anomalyManager,
            Optional<org.astra.anomalies.FailureLabService> failureLabService,
            Optional<org.astra.websocket.TelemetryStreamBroadcaster> telemetryBroadcaster,
            @Value("${astra.simulation.initial-epoch:2026-10-24T00:00:00Z}") String initialEpochStr
    ) {
        this(
                new KeplerianPropagator(),
                telemetryService,
                eventPublisher.orElse(null),
                anomalyManager.orElse(null),
                failureLabService.orElse(null),
                telemetryBroadcaster.orElse(null),
                Instant.parse(initialEpochStr)
        );
    }

    public SimulationEngine(
            OrbitalPropagator orbitalPropagator,
            TelemetryService telemetryService,
            Instant initialEpoch
    ) {
        this(orbitalPropagator, telemetryService, null, null, null, null, initialEpoch);
    }

    public SimulationEngine(
            OrbitalPropagator orbitalPropagator,
            TelemetryService telemetryService,
            SimulationEventPublisher eventPublisher,
            AnomalyManager anomalyManager,
            org.astra.websocket.TelemetryStreamBroadcaster telemetryBroadcaster,
            Instant initialEpoch
    ) {
        this(orbitalPropagator, telemetryService, eventPublisher, anomalyManager, null, telemetryBroadcaster, initialEpoch);
    }

    public SimulationEngine(
            OrbitalPropagator orbitalPropagator,
            TelemetryService telemetryService,
            SimulationEventPublisher eventPublisher,
            AnomalyManager anomalyManager,
            org.astra.anomalies.FailureLabService failureLabService,
            org.astra.websocket.TelemetryStreamBroadcaster telemetryBroadcaster,
            Instant initialEpoch
    ) {
        this.orbitalPropagator = Objects.requireNonNull(orbitalPropagator, "orbitalPropagator must not be null");
        this.telemetryService = Objects.requireNonNull(telemetryService, "telemetryService must not be null");
        this.eventPublisher = eventPublisher;
        this.anomalyManager = anomalyManager;
        this.failureLabService = failureLabService;
        this.telemetryBroadcaster = telemetryBroadcaster;
        this.baseEpoch = Objects.requireNonNull(initialEpoch, "initialEpoch must not be null");
        this.clock = new SimulationClock(initialEpoch);
        this.lifecycle = SimulationLifecycle.CREATED;

        // Populate baseline fleet
        initializeDefaultFleet();
    }

    /**
     * Resets and initializes the simulation engine with default spacecraft.
     */
    public void initializeDefaultFleet() {
        rwLock.writeLock().lock();
        try {
            fleet.clear();
            baseElements.clear();
            telemetryService.clear();
            clock.reset();
            if (failureLabService != null) {
                failureLabService.reset();
            }

            // Spacecraft 1: AURA-1 (Sun-Synchronous Earth Observation, altitude ~702 km)
            KeplerianElements auraElements = new KeplerianElements(
                    7080.0, 0.0012, 98.2, 25.0, 90.0, 0.0
            );
            OrbitState auraState = orbitalPropagator.elementsToState(auraElements, baseEpoch);
            Spacecraft aura1 = new Spacecraft(
                    "AURA-1", "AURA-1", "Aura-1 Earth Observation Platform", "ASTRA-BUS-MK4",
                    1450.0, 280.0, auraState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    94.5, 1280.0
            );
            registerSpacecraft(aura1, auraElements);

            // Spacecraft 2: TERRA-OBS (Mid-Inclination LEO Multispectral Reconnaissance, altitude ~502 km)
            KeplerianElements terraElements = new KeplerianElements(
                    6880.0, 0.0008, 51.6, 120.0, 45.0, 60.0
            );
            OrbitState terraState = orbitalPropagator.elementsToState(terraElements, baseEpoch);
            Spacecraft terraObs = new Spacecraft(
                    "TERRA-OBS", "TERRA-OBS", "Terra Multispectral Reconnaissance", "TERRA-OBS-V",
                    980.0, 160.0, terraState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    88.0, 1150.0
            );
            registerSpacecraft(terraObs, terraElements);

            // Spacecraft 3: SOLIS-RELAY (Elliptical Transfer Orbit, apoapsis ~36,000 km)
            KeplerianElements solisElements = new KeplerianElements(
                    24370.0, 0.72, 28.5, 200.0, 270.0, 0.0
            );
            OrbitState solisState = orbitalPropagator.elementsToState(solisElements, baseEpoch);
            Spacecraft solisRelay = new Spacecraft(
                    "SOLIS-RELAY", "SOLIS-RELAY", "Solis High-Altitude Data Relay", "SOLIS-BUS-COMM",
                    2100.0, 1250.0, solisState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    99.0, 2400.0
            );
            registerSpacecraft(solisRelay, solisElements);

            this.lifecycle = SimulationLifecycle.RUNNING;

            if (eventPublisher != null) {
                eventPublisher.publish(
                        SimulationEventType.SIMULATION_INITIALIZED,
                        baseEpoch,
                        null,
                        "Authoritative simulation fleet initialized with " + fleet.size() + " spacecraft",
                        Map.of("epoch", baseEpoch.toString(), "spacecraftCount", fleet.size())
                );
            }

            if (telemetryBroadcaster != null) {
                telemetryBroadcaster.broadcastSimulationStatus(new org.astra.api.dto.SimulationStatusResponse(
                        lifecycle, baseEpoch, baseEpoch, 0.0, fleet.size()
                ));
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    private void registerSpacecraft(Spacecraft spacecraft, KeplerianElements elements) {
        fleet.put(spacecraft.getId(), spacecraft);
        baseElements.put(spacecraft.getId(), elements);
        // Record initial telemetry
        telemetryService.recordSnapshot(TelemetrySnapshot.fromSpacecraft(spacecraft));
    }

    /**
     * Synchronously advances the simulation clock and all registered spacecraft by the requested duration.
     *
     * @param delta Non-negative time duration to advance
     * @return New simulation epoch
     */
    public Instant step(Duration delta) {
        Objects.requireNonNull(delta, "delta must not be null");
        if (delta.isNegative()) {
            throw new IllegalArgumentException("Simulation step duration cannot be negative: " + delta);
        }

        rwLock.writeLock().lock();
        try {
            if (lifecycle == SimulationLifecycle.STOPPED) {
                throw new IllegalStateException("Cannot advance a STOPPED simulation. Re-initialize first.");
            }

            // Advance clock to target simulation epoch
            Instant targetEpoch = clock.advance(delta);

            // Propagate all spacecraft synchronously to the exact target epoch
            List<TelemetrySnapshot> snapshots = new ArrayList<>();
            for (Spacecraft sc : fleet.values()) {
                KeplerianElements initialEl = baseElements.get(sc.getId());
                if (initialEl != null) {
                    OrbitState updatedState = orbitalPropagator.propagate(initialEl, baseEpoch, targetEpoch);
                    sc.updateOrbitState(updatedState);

                    // Update simulated subsystems derived from eclipse, mode, and active Failure Lab faults
                    if (failureLabService != null) {
                        failureLabService.stepSubsystems(sc, updatedState, delta, targetEpoch);
                    } else {
                        updateSubsystemPowerMetrics(sc, updatedState, delta);
                    }

                    // Emit authoritative telemetry snapshot
                    TelemetrySnapshot snap = TelemetrySnapshot.fromSpacecraft(sc);
                    telemetryService.recordSnapshot(snap);
                    snapshots.add(snap);
                }
            }

            if (eventPublisher != null) {
                double deltaSec = delta.toNanos() / 1.0e9;
                eventPublisher.publish(
                        SimulationEventType.SIMULATION_ADVANCED,
                        targetEpoch,
                        null,
                        "Simulation clock advanced by " + deltaSec + "s to " + targetEpoch,
                        Map.of("deltaSeconds", deltaSec, "epoch", targetEpoch.toString(), "fleetCount", fleet.size())
                );
                eventPublisher.publish(
                        SimulationEventType.FLEET_TELEMETRY_UPDATE,
                        targetEpoch,
                        null,
                        "Fleet telemetry update synchronized at " + targetEpoch,
                        Map.of("epoch", targetEpoch.toString(), "snapshots", snapshots)
                );
            }

            if (telemetryBroadcaster != null) {
                telemetryBroadcaster.broadcastFleetTelemetry(targetEpoch, clock.getElapsedSeconds(), lifecycle, snapshots);
                telemetryBroadcaster.broadcastSimulationStatus(new org.astra.api.dto.SimulationStatusResponse(
                        lifecycle, targetEpoch, baseEpoch, clock.getElapsedSeconds(), fleet.size()
                ));
            }

            return targetEpoch;
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    private void updateSubsystemPowerMetrics(Spacecraft sc, OrbitState orbit, Duration stepDuration) {
        double deltaHours = (stepDuration.toNanos() / 1.0e9) / 3600.0;
        double solarWatts;
        double batterySoc = sc.getBatterySocPercent();

        if (orbit.inEclipse()) {
            // In eclipse: solar generation drops to zero; battery supplies all bus power
            solarWatts = 0.0;
            double dischargeRate = switch (sc.getOperationalMode()) {
                case SAFE_MODE, LOW_POWER -> 0.8;   // 0.8% per hour
                case SCIENCE_OPERATION -> 4.5;       // 4.5% per hour
                default -> 2.2;                      // 2.2% per hour nominal
            };
            batterySoc = Math.max(15.0, batterySoc - dischargeRate * deltaHours);
        } else {
            // In sunlight: active solar array generation based on nominal vehicle rating
            solarWatts = switch (sc.getOperationalMode()) {
                case LOW_POWER -> 650.0;
                case SAFE_MODE -> 450.0;
                case SCIENCE_OPERATION -> 1350.0;
                default -> 1200.0;
            };

            // Factor in Failure Lab subsystem modifiers if active
            if (anomalyManager != null) {
                solarWatts *= anomalyManager.getEffectivePowerMultiplier(sc.getId());
            }

            // Charge battery back towards 100%
            batterySoc = Math.min(100.0, batterySoc + 3.0 * deltaHours);
        }

        sc.updatePowerMetrics(batterySoc, solarWatts);
    }

    public void pause() {
        rwLock.writeLock().lock();
        try {
            if (lifecycle == SimulationLifecycle.RUNNING) {
                lifecycle = SimulationLifecycle.PAUSED;
                if (eventPublisher != null) {
                    eventPublisher.publish(
                            SimulationEventType.SIMULATION_PAUSED,
                            clock.getCurrentEpoch(),
                            null,
                            "Simulation advancement suspended (PAUSED)",
                            Map.of("lifecycle", lifecycle.name())
                    );
                }
                if (telemetryBroadcaster != null) {
                    telemetryBroadcaster.broadcastSimulationStatus(new org.astra.api.dto.SimulationStatusResponse(
                            lifecycle, clock.getCurrentEpoch(), baseEpoch, clock.getElapsedSeconds(), fleet.size()
                    ));
                }
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public void resume() {
        rwLock.writeLock().lock();
        try {
            if (lifecycle == SimulationLifecycle.PAUSED || lifecycle == SimulationLifecycle.CREATED) {
                lifecycle = SimulationLifecycle.RUNNING;
                if (eventPublisher != null) {
                    eventPublisher.publish(
                            SimulationEventType.SIMULATION_RESUMED,
                            clock.getCurrentEpoch(),
                            null,
                            "Simulation advancement resumed (RUNNING)",
                            Map.of("lifecycle", lifecycle.name())
                    );
                }
                if (telemetryBroadcaster != null) {
                    telemetryBroadcaster.broadcastSimulationStatus(new org.astra.api.dto.SimulationStatusResponse(
                            lifecycle, clock.getCurrentEpoch(), baseEpoch, clock.getElapsedSeconds(), fleet.size()
                    ));
                }
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public void stop() {
        rwLock.writeLock().lock();
        try {
            lifecycle = SimulationLifecycle.STOPPED;
            if (eventPublisher != null) {
                eventPublisher.publish(
                        SimulationEventType.SIMULATION_STOPPED,
                        clock.getCurrentEpoch(),
                        null,
                        "Simulation stopped",
                        Map.of("lifecycle", lifecycle.name())
                );
            }
            if (telemetryBroadcaster != null) {
                telemetryBroadcaster.broadcastSimulationStatus(new org.astra.api.dto.SimulationStatusResponse(
                        lifecycle, clock.getCurrentEpoch(), baseEpoch, clock.getElapsedSeconds(), fleet.size()
                ));
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public Optional<Spacecraft> getSpacecraft(String id) {
        rwLock.readLock().lock();
        try {
            return Optional.ofNullable(fleet.get(id));
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public List<Spacecraft> getAllSpacecraft() {
        rwLock.readLock().lock();
        try {
            return new ArrayList<>(fleet.values());
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public SimulationLifecycle getLifecycle() {
        rwLock.readLock().lock();
        try {
            return lifecycle;
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public Instant getCurrentEpoch() {
        rwLock.readLock().lock();
        try {
            return clock.getCurrentEpoch();
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public Instant getBaseEpoch() {
        rwLock.readLock().lock();
        try {
            return clock.getBaseEpoch();
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public Duration getElapsedDuration() {
        rwLock.readLock().lock();
        try {
            return clock.getElapsedDuration();
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public double getElapsedSeconds() {
        rwLock.readLock().lock();
        try {
            return clock.getElapsedSeconds();
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public org.astra.anomalies.FailureLabService getFailureLabService() {
        return failureLabService;
    }
}
