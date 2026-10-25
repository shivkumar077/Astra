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

    private final org.astra.persistence.repository.SpacecraftRecordRepository spacecraftRepository;
    private final org.astra.telemetry.TelemetryArchiveService telemetryArchiveService;

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
            Optional<org.astra.persistence.repository.SpacecraftRecordRepository> spacecraftRepository,
            Optional<org.astra.telemetry.TelemetryArchiveService> telemetryArchiveService,
            @Value("${astra.simulation.initial-epoch:2026-10-24T00:00:00Z}") String initialEpochStr
    ) {
        this(
                new KeplerianPropagator(),
                telemetryService,
                eventPublisher.orElse(null),
                anomalyManager.orElse(null),
                failureLabService.orElse(null),
                telemetryBroadcaster.orElse(null),
                spacecraftRepository.orElse(null),
                telemetryArchiveService.orElse(null),
                Instant.parse(initialEpochStr)
        );
    }

    public SimulationEngine(
            OrbitalPropagator orbitalPropagator,
            TelemetryService telemetryService,
            Instant initialEpoch
    ) {
        this(orbitalPropagator, telemetryService, null, null, null, null, null, null, initialEpoch);
    }

    public SimulationEngine(
            OrbitalPropagator orbitalPropagator,
            TelemetryService telemetryService,
            SimulationEventPublisher eventPublisher,
            AnomalyManager anomalyManager,
            org.astra.websocket.TelemetryStreamBroadcaster telemetryBroadcaster,
            Instant initialEpoch
    ) {
        this(orbitalPropagator, telemetryService, eventPublisher, anomalyManager, null, telemetryBroadcaster, null, null, initialEpoch);
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
        this(orbitalPropagator, telemetryService, eventPublisher, anomalyManager, failureLabService, telemetryBroadcaster, null, null, initialEpoch);
    }

    public SimulationEngine(
            OrbitalPropagator orbitalPropagator,
            TelemetryService telemetryService,
            SimulationEventPublisher eventPublisher,
            AnomalyManager anomalyManager,
            org.astra.anomalies.FailureLabService failureLabService,
            org.astra.websocket.TelemetryStreamBroadcaster telemetryBroadcaster,
            org.astra.persistence.repository.SpacecraftRecordRepository spacecraftRepository,
            org.astra.telemetry.TelemetryArchiveService telemetryArchiveService,
            Instant initialEpoch
    ) {
        this.orbitalPropagator = Objects.requireNonNull(orbitalPropagator, "orbitalPropagator must not be null");
        this.telemetryService = Objects.requireNonNull(telemetryService, "telemetryService must not be null");
        this.eventPublisher = eventPublisher;
        this.anomalyManager = anomalyManager;
        this.failureLabService = failureLabService;
        this.telemetryBroadcaster = telemetryBroadcaster;
        this.spacecraftRepository = spacecraftRepository;
        this.telemetryArchiveService = telemetryArchiveService;
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

            // =========================================================================
            // GROUP 1: EARTH ORBITAL PLATFORMS (6 vehicles)
            // =========================================================================
            // 1. AURA-1 (Sun-Synchronous Earth Observation, altitude ~702 km)
            KeplerianElements auraElements = new KeplerianElements(
                    7080.0, 0.0012, 98.2, 25.0, 90.0, 0.0
            );
            OrbitState auraState = orbitalPropagator.elementsToState(auraElements, baseEpoch);
            Spacecraft aura1 = new Spacecraft(
                    "AURA-1", "AURA-1", "Aura-1 Earth Observation Platform", "Earth Observation (SSO)",
                    1450.0, 280.0, auraState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    94.5, 1280.0
            );
            registerSpacecraft(aura1, auraElements);

            // 2. TERRA-OBS (Mid-Inclination LEO Multispectral Reconnaissance, altitude ~502 km)
            KeplerianElements terraElements = new KeplerianElements(
                    6880.0, 0.0008, 51.6, 120.0, 45.0, 60.0
            );
            OrbitState terraState = orbitalPropagator.elementsToState(terraElements, baseEpoch);
            Spacecraft terraObs = new Spacecraft(
                    "TERRA-OBS", "TERRA-OBS", "Terra Multispectral Reconnaissance", "LEO Reconnaissance",
                    980.0, 160.0, terraState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    88.0, 1150.0
            );
            registerSpacecraft(terraObs, terraElements);

            // 3. SOLIS-RELAY (Elliptical Transfer Orbit, apoapsis ~36,000 km)
            KeplerianElements solisElements = new KeplerianElements(
                    24370.0, 0.72, 28.5, 200.0, 270.0, 0.0
            );
            OrbitState solisState = orbitalPropagator.elementsToState(solisElements, baseEpoch);
            Spacecraft solisRelay = new Spacecraft(
                    "SOLIS-RELAY", "SOLIS-RELAY", "Solis High-Altitude Data Relay", "HEO Comms Relay",
                    2100.0, 1250.0, solisState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    99.0, 2400.0
            );
            registerSpacecraft(solisRelay, solisElements);

            // 4. GEO-COM-4 (Geostationary Equatorial Communications Platform, 35,786 km)
            KeplerianElements geoElements = new KeplerianElements(
                    42164.0, 0.0002, 0.05, 110.0, 0.0, 180.0
            );
            OrbitState geoState = orbitalPropagator.elementsToState(geoElements, baseEpoch);
            Spacecraft geoCom4 = new Spacecraft(
                    "GEO-COM-4", "GEO-COM-4", "GeoCom-4 Equatorial Communications", "Geostationary Relay",
                    2400.0, 1800.0, geoState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    96.0, 4200.0
            );
            registerSpacecraft(geoCom4, geoElements);

            // 5. NAV-STAR-09 (Medium Earth Orbit Navigation & Timing Beacon, ~20,200 km)
            KeplerianElements navElements = new KeplerianElements(
                    26560.0, 0.012, 55.0, 140.0, 60.0, 90.0
            );
            OrbitState navState = orbitalPropagator.elementsToState(navElements, baseEpoch);
            Spacecraft navStar = new Spacecraft(
                    "NAV-STAR-09", "NAV-STAR-09", "NavStar-09 Precision Timing Beacon", "MEO Navigation",
                    1600.0, 650.0, navState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    92.0, 2100.0
            );
            registerSpacecraft(navStar, navElements);

            // 6. DEBRIS-TRAC-2 (Low Earth Orbit Polar Space Debris Lidar Scout, ~770 km)
            KeplerianElements debrisElements = new KeplerianElements(
                    7150.0, 0.002, 97.8, 45.0, 120.0, 210.0
            );
            OrbitState debrisState = orbitalPropagator.elementsToState(debrisElements, baseEpoch);
            Spacecraft debrisTrac = new Spacecraft(
                    "DEBRIS-TRAC-2", "DEBRIS-TRAC-2", "DebrisTrac-2 Orbital Radar/Lidar", "Orbital Debris Tracking",
                    750.0, 210.0, debrisState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    85.0, 950.0
            );
            registerSpacecraft(debrisTrac, debrisElements);

            // =========================================================================
            // GROUP 2: LUNAR EXPLORATION FLEET (6 vehicles)
            // Cislunar & Earth-Moon gravitational sphere orbits in ECI simulation frame
            // =========================================================================
            // 7. CHANDRA-ORB (Lunar South Pole Ice Prospecting Platform, high cislunar transfer)
            KeplerianElements chandraElements = new KeplerianElements(
                    68400.0, 0.04, 88.5, 10.0, 0.0, 45.0
            );
            OrbitState chandraState = orbitalPropagator.elementsToState(chandraElements, baseEpoch);
            Spacecraft chandraOrb = new Spacecraft(
                    "CHANDRA-ORB", "CHANDRA-ORB", "Chandra Lunar Ice Prospector", "Lunar Polar Prospector",
                    680.0, 420.0, chandraState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    91.0, 850.0
            );
            registerSpacecraft(chandraOrb, chandraElements);

            // 8. LUNAR-HALO-1 (Earth-Moon L2 Far-Side Communications Halo Orbiter)
            KeplerianElements haloElements = new KeplerianElements(
                    65000.0, 0.18, 14.5, 30.0, 90.0, 120.0
            );
            OrbitState haloState = orbitalPropagator.elementsToState(haloElements, baseEpoch);
            Spacecraft lunarHalo = new Spacecraft(
                    "LUNAR-HALO-1", "LUNAR-HALO-1", "Lunar Far-Side L2 Halo Relay", "Lunar L2 Halo Relay",
                    1100.0, 850.0, haloState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    95.0, 1400.0
            );
            registerSpacecraft(lunarHalo, haloElements);

            // 9. SELENA-MAPPER (Selenocentric Surface Altimetry & Mineralogy Mapper)
            KeplerianElements selenaElements = new KeplerianElements(
                    72000.0, 0.02, 86.2, 75.0, 45.0, 15.0
            );
            OrbitState selenaState = orbitalPropagator.elementsToState(selenaElements, baseEpoch);
            Spacecraft selenaMapper = new Spacecraft(
                    "SELENA-MAPPER", "SELENA-MAPPER", "Selena Lunar Composition Mapper", "Lunar Surface Reconnaissance",
                    820.0, 310.0, selenaState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    89.0, 920.0
            );
            registerSpacecraft(selenaMapper, selenaElements);

            // 10. ARTEMIS-RELAY (Lunar South Pole Elliptical Frozen Orbit Relay)
            KeplerianElements artemisElements = new KeplerianElements(
                    54000.0, 0.15, 54.7, 210.0, 270.0, 0.0
            );
            OrbitState artemisState = orbitalPropagator.elementsToState(artemisElements, baseEpoch);
            Spacecraft artemisRelay = new Spacecraft(
                    "ARTEMIS-RELAY", "ARTEMIS-RELAY", "Artemis Polar Communications Relay", "Lunar Elliptical Relay",
                    1250.0, 900.0, artemisState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    97.0, 1600.0
            );
            registerSpacecraft(artemisRelay, artemisElements);

            // 11. LUNAR-RECON-X (Low Polar Deep Crater High-Resolution Shadow Scout)
            KeplerianElements reconXElements = new KeplerianElements(
                    62000.0, 0.05, 89.5, 15.0, 30.0, 240.0
            );
            OrbitState reconXState = orbitalPropagator.elementsToState(reconXElements, baseEpoch);
            Spacecraft reconX = new Spacecraft(
                    "LUNAR-RECON-X", "LUNAR-RECON-X", "Lunar Reconnaissance Scout X", "Lunar Polar Shadow Scout",
                    540.0, 280.0, reconXState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    83.0, 780.0
            );
            registerSpacecraft(reconX, reconXElements);

            // 12. MOON-NAV-01 (Selenocentric PNT Autonomous Constellation Node)
            KeplerianElements moonNavElements = new KeplerianElements(
                    75000.0, 0.015, 45.0, 180.0, 120.0, 60.0
            );
            OrbitState moonNavState = orbitalPropagator.elementsToState(moonNavElements, baseEpoch);
            Spacecraft moonNav = new Spacecraft(
                    "MOON-NAV-01", "MOON-NAV-01", "MoonNav-1 Selenocentric Positioning Beacon", "Lunar Navigation",
                    890.0, 410.0, moonNavState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    94.0, 1100.0
            );
            registerSpacecraft(moonNav, moonNavElements);

            // =========================================================================
            // GROUP 3: MARS EXPLORATION FLEET (6 vehicles)
            // Areocentric & Mars transfer operational orbits in simulation frame
            // =========================================================================
            // 13. ARES-ORBITER (Areocentric Reconnaissance & Surface Swath Imaging)
            KeplerianElements aresElements = new KeplerianElements(
                    37900.0, 0.003, 93.0, 50.0, 90.0, 0.0
            );
            OrbitState aresState = orbitalPropagator.elementsToState(aresElements, baseEpoch);
            Spacecraft aresOrb = new Spacecraft(
                    "ARES-ORBITER", "ARES-ORBITER", "Ares Mars Reconnaissance Orbiter", "Mars Reconnaissance",
                    1050.0, 580.0, aresState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    90.0, 1450.0
            );
            registerSpacecraft(aresOrb, aresElements);

            // 14. MARS-RELAY-1 (Areostationary High-Throughput Rover Relay, 17,032 km)
            KeplerianElements marsRelayElements = new KeplerianElements(
                    20428.0, 0.0005, 1.2, 160.0, 0.0, 180.0
            );
            OrbitState marsRelayState = orbitalPropagator.elementsToState(marsRelayElements, baseEpoch);
            Spacecraft marsRelay1 = new Spacecraft(
                    "MARS-RELAY-1", "MARS-RELAY-1", "Mars-Relay-1 Areostationary Data Gateway", "Mars Surface Relay",
                    1850.0, 1100.0, marsRelayState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    98.0, 2600.0
            );
            registerSpacecraft(marsRelay1, marsRelayElements);

            // 15. PHOBOS-SCOUT (Martian Inner Moon Proximity Explorer)
            KeplerianElements phobosElements = new KeplerianElements(
                    9376.0, 0.015, 1.08, 90.0, 30.0, 45.0
            );
            OrbitState phobosState = orbitalPropagator.elementsToState(phobosElements, baseEpoch);
            Spacecraft phobosScout = new Spacecraft(
                    "PHOBOS-SCOUT", "PHOBOS-SCOUT", "Phobos Proximity Science Scout", "Martian Moon Explorer",
                    620.0, 490.0, phobosState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    87.0, 820.0
            );
            registerSpacecraft(phobosScout, phobosElements);

            // 16. DEIMOS-OBS (Martian Outer Moon Resonant Observer)
            KeplerianElements deimosElements = new KeplerianElements(
                    23460.0, 0.0002, 1.79, 210.0, 150.0, 90.0
            );
            OrbitState deimosState = orbitalPropagator.elementsToState(deimosElements, baseEpoch);
            Spacecraft deimosObs = new Spacecraft(
                    "DEIMOS-OBS", "DEIMOS-OBS", "Deimos Orbital Surveillance Platform", "Martian Moon Explorer",
                    510.0, 340.0, deimosState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    93.0, 750.0
            );
            registerSpacecraft(deimosObs, deimosElements);

            // 17. MARS-ATMOS-4 (Mars Atmospheric Aerobraking & Dipping Profiler)
            KeplerianElements marsAtmosElements = new KeplerianElements(
                    18650.0, 0.045, 74.5, 115.0, 270.0, 30.0
            );
            OrbitState marsAtmosState = orbitalPropagator.elementsToState(marsAtmosElements, baseEpoch);
            Spacecraft marsAtmos = new Spacecraft(
                    "MARS-ATMOS-4", "MARS-ATMOS-4", "Mars-Atmos-4 Aerobraking Profiler", "Mars Atmospheric Profiling",
                    880.0, 390.0, marsAtmosState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    86.0, 1100.0
            );
            registerSpacecraft(marsAtmos, marsAtmosElements);

            // 18. AERO-MAP-02 (Martian Polar Cap CO2/H2O Volatiles Seasonal Mapper)
            KeplerianElements aeroMapElements = new KeplerianElements(
                    19820.0, 0.002, 92.8, 30.0, 45.0, 150.0
            );
            OrbitState aeroMapState = orbitalPropagator.elementsToState(aeroMapElements, baseEpoch);
            Spacecraft aeroMap = new Spacecraft(
                    "AERO-MAP-02", "AERO-MAP-02", "AeroMap-02 Polar Ice Spectrometer", "Mars Polar Mapping",
                    940.0, 460.0, aeroMapState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    92.0, 1250.0
            );
            registerSpacecraft(aeroMap, aeroMapElements);

            // =========================================================================
            // GROUP 4: OUTER PLANETS FLEET (5 vehicles)
            // =========================================================================
            // 19. JOVIAN-RADIATION (Jupiter Radiation Belt & Magnetosphere Surveyor)
            KeplerianElements jovianElements = new KeplerianElements(
                    1850000.0, 0.78, 4.2, 45.0, 180.0, 0.0
            );
            OrbitState jovianState = orbitalPropagator.elementsToState(jovianElements, baseEpoch);
            Spacecraft jovianRad = new Spacecraft(
                    "JOVIAN-RADIATION", "JOVIAN-RADIATION", "Jovian Radiation Belt Explorer", "Jupiter Radiation Survey",
                    1650.0, 1400.0, jovianState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    88.0, 650.0
            );
            registerSpacecraft(jovianRad, jovianElements);

            // 20. EUROPA-CLIPPER-S (Europa Plume Spectrometry & Subsurface Ocean Scout)
            KeplerianElements europaElements = new KeplerianElements(
                    670900.0, 0.009, 1.8, 130.0, 60.0, 45.0
            );
            OrbitState europaState = orbitalPropagator.elementsToState(europaElements, baseEpoch);
            Spacecraft europaClip = new Spacecraft(
                    "EUROPA-CLIPPER-S", "EUROPA-CLIPPER-S", "Europa Ice Plume Spectrometry Scout", "Galilean Moon Observer",
                    1950.0, 1800.0, europaState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    94.0, 720.0
            );
            registerSpacecraft(europaClip, europaElements);

            // 21. CALLISTO-SURVEY (Outer Galilean Moon Cratering & Gamma Ray Mapper)
            KeplerianElements callistoElements = new KeplerianElements(
                    1883000.0, 0.007, 0.5, 80.0, 90.0, 110.0
            );
            OrbitState callistoState = orbitalPropagator.elementsToState(callistoElements, baseEpoch);
            Spacecraft callistoSurvey = new Spacecraft(
                    "CALLISTO-SURVEY", "CALLISTO-SURVEY", "Callisto Gamma-Ray Surface Surveyor", "Galilean Moon Observer",
                    1200.0, 850.0, callistoState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    96.0, 580.0
            );
            registerSpacecraft(callistoSurvey, callistoElements);

            // 22. CHRONOS-SATURN (Saturnian Ring System Structure & Gap Dynamics Monitor)
            KeplerianElements chronosElements = new KeplerianElements(
                    185000.0, 0.001, 26.7, 240.0, 0.0, 90.0
            );
            OrbitState chronosState = orbitalPropagator.elementsToState(chronosElements, baseEpoch);
            Spacecraft chronosSaturn = new Spacecraft(
                    "CHRONOS-SATURN", "CHRONOS-SATURN", "Chronos Saturnian Ring Dynamics Probe", "Saturn Ring Observer",
                    1750.0, 1300.0, chronosState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    91.0, 620.0
            );
            registerSpacecraft(chronosSaturn, chronosElements);

            // 23. TITAN-RELAY (Titan Atmosphere Penetrating Radar & Polar Lake Relay)
            KeplerianElements titanElements = new KeplerianElements(
                    1222000.0, 0.028, 0.35, 15.0, 45.0, 180.0
            );
            OrbitState titanState = orbitalPropagator.elementsToState(titanElements, baseEpoch);
            Spacecraft titanRelay = new Spacecraft(
                    "TITAN-RELAY", "TITAN-RELAY", "Titan Hydrocarbon Lake Radar Relay", "Outer Planet Relay",
                    1420.0, 980.0, titanState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    95.0, 600.0
            );
            registerSpacecraft(titanRelay, titanElements);

            // =========================================================================
            // GROUP 5: SOLAR & DEEP SPACE FLEET (5 vehicles)
            // =========================================================================
            // 24. HELIOS-CORONA (Extreme Solar Perihelion Coronal Mass Ejection Monitor)
            KeplerianElements heliosElements = new KeplerianElements(
                    48000000.0, 0.68, 3.4, 10.0, 0.0, 180.0
            );
            OrbitState heliosState = orbitalPropagator.elementsToState(heliosElements, baseEpoch);
            Spacecraft heliosCorona = new Spacecraft(
                    "HELIOS-CORONA", "HELIOS-CORONA", "Helios Solar Corona Probe", "Solar Corona Observer",
                    610.0, 290.0, heliosState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    98.0, 3800.0
            );
            registerSpacecraft(heliosCorona, heliosElements);

            // 25. SOLAR-STORM-01 (Sun-Earth L1 Lagrange Solar Wind Early Warning Platform)
            KeplerianElements solarStormElements = new KeplerianElements(
                    1500000.0, 0.05, 0.2, 0.0, 0.0, 0.0
            );
            OrbitState solarStormState = orbitalPropagator.elementsToState(solarStormElements, baseEpoch);
            Spacecraft solarStorm = new Spacecraft(
                    "SOLAR-STORM-01", "SOLAR-STORM-01", "SolarStorm-1 Space Weather Sentinel", "Solar Storm Monitor",
                    1350.0, 620.0, solarStormState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    97.0, 2200.0
            );
            registerSpacecraft(solarStorm, solarStormElements);

            // 26. ASTEROID-SCOUT (Near-Earth Carbonaceous Asteroid Rendezvous Scout)
            KeplerianElements asteroidElements = new KeplerianElements(
                    160000000.0, 0.21, 7.1, 85.0, 140.0, 60.0
            );
            OrbitState asteroidState = orbitalPropagator.elementsToState(asteroidElements, baseEpoch);
            Spacecraft asteroidScout = new Spacecraft(
                    "ASTEROID-SCOUT", "ASTEROID-SCOUT", "Asteroid Scout Primitive Volatiles Survey", "Asteroid Reconnaissance",
                    780.0, 640.0, asteroidState, OperationalMode.SCIENCE_OPERATION, SpacecraftStatus.NOMINAL,
                    89.0, 1200.0
            );
            registerSpacecraft(asteroidScout, asteroidElements);

            // 27. DEEP-NAV-ALPHA (Autonomous Deep Space X-Ray Pulsar Navigation Probe)
            KeplerianElements deepNavElements = new KeplerianElements(
                    220000000.0, 0.15, 1.8, 190.0, 30.0, 110.0
            );
            OrbitState deepNavState = orbitalPropagator.elementsToState(deepNavElements, baseEpoch);
            Spacecraft deepNav = new Spacecraft(
                    "DEEP-NAV-ALPHA", "DEEP-NAV-ALPHA", "DeepNav-Alpha Autonomous Pulsar Navigator", "Deep-Space Navigation",
                    920.0, 750.0, deepNavState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    93.0, 950.0
            );
            registerSpacecraft(deepNav, deepNavElements);

            // 28. VOYAGER-EXP (Interplanetary Heliopause & Cosmic Ray Diagnostic Platform)
            KeplerianElements voyagerElements = new KeplerianElements(
                    350000000.0, 0.42, 12.0, 310.0, 80.0, 20.0
            );
            OrbitState voyagerState = orbitalPropagator.elementsToState(voyagerElements, baseEpoch);
            Spacecraft voyagerExp = new Spacecraft(
                    "VOYAGER-EXP", "VOYAGER-EXP", "Voyager Heliopause Diagnostics Probe", "Deep-Space Survival",
                    825.0, 450.0, voyagerState, OperationalMode.NOMINAL, SpacecraftStatus.NOMINAL,
                    96.0, 480.0
            );
            registerSpacecraft(voyagerExp, voyagerElements);

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

        if (spacecraftRepository != null) {
            try {
                org.astra.persistence.entity.SpacecraftRecordEntity entity = new org.astra.persistence.entity.SpacecraftRecordEntity(
                        spacecraft.getId(),
                        spacecraft.getCallSign(),
                        spacecraft.getName(),
                        spacecraft.getModelType(),
                        spacecraft.getDryMassKg(),
                        spacecraft.getPropellantMassKg(),
                        spacecraft.getOperationalMode().name(),
                        spacecraft.getOperationalStatus().name(),
                        spacecraft.getBatterySocPercent(),
                        spacecraft.getSolarArrayWatts(),
                        elements.semiMajorAxisKm(),
                        elements.eccentricity(),
                        elements.inclinationDeg(),
                        elements.raanDeg(),
                        elements.argOfPeriapsisDeg(),
                        elements.trueAnomalyDeg()
                );
                spacecraftRepository.save(entity);
            } catch (Exception e) {
                // Log and absorb to keep simulation engine authoritative
            }
        }
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

            if (telemetryArchiveService != null) {
                for (Spacecraft sc : fleet.values()) {
                    telemetryArchiveService.sampleAndArchive(sc, targetEpoch);
                }
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
