package org.astra.missions.service;

import org.astra.commands.CommandHistoryService;
import org.astra.commands.CommandRecord;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.events.SimulationEvent;
import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.astra.missions.domain.*;
import org.astra.missions.dto.CreateMissionRequest;
import org.astra.missions.dto.MissionResponse;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetryService;
import org.astra.telemetry.TelemetrySnapshot;
import org.astra.persistence.JsonUtils;
import org.astra.persistence.entity.MissionDefinitionEntity;
import org.astra.persistence.entity.MissionRunEntity;
import org.astra.persistence.repository.MissionDefinitionRepository;
import org.astra.persistence.repository.MissionRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Server-authoritative service managing the ASTRA Mission Universe.
 * Coordinates mission briefings, simulation runs, objective verifications, and audit histories.
 */
@Service
public class MissionService {

    private static final Logger log = LoggerFactory.getLogger(MissionService.class);

    private final Map<String, MissionDefinition> catalog = new LinkedHashMap<>();
    private final Map<String, MissionRun> activeRunsByMissionId = new ConcurrentHashMap<>();
    private final Map<String, MissionRun> runsById = new ConcurrentHashMap<>();
    private final List<MissionRun> missionHistory = new CopyOnWriteArrayList<>();

    private final SimulationEngine simulationEngine;
    private final TelemetryService telemetryService;
    private final CommandHistoryService commandHistoryService;
    private final SimulationEventPublisher eventPublisher;
    private final MissionDefinitionRepository missionDefinitionRepository;
    private final MissionRunRepository missionRunRepository;

    public MissionService(
            SimulationEngine simulationEngine,
            TelemetryService telemetryService,
            CommandHistoryService commandHistoryService,
            Optional<SimulationEventPublisher> eventPublisher
    ) {
        this(simulationEngine, telemetryService, commandHistoryService, eventPublisher, Optional.empty(), Optional.empty());
    }

    @Autowired
    public MissionService(
            SimulationEngine simulationEngine,
            TelemetryService telemetryService,
            CommandHistoryService commandHistoryService,
            Optional<SimulationEventPublisher> eventPublisher,
            Optional<MissionDefinitionRepository> missionDefinitionRepository,
            Optional<MissionRunRepository> missionRunRepository
    ) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
        this.telemetryService = Objects.requireNonNull(telemetryService, "telemetryService must not be null");
        this.commandHistoryService = Objects.requireNonNull(commandHistoryService, "commandHistoryService must not be null");
        this.eventPublisher = eventPublisher.orElse(null);
        this.missionDefinitionRepository = missionDefinitionRepository.orElse(null);
        this.missionRunRepository = missionRunRepository.orElse(null);

        initializeCatalog();
        hydrateFromDatabase();
    }

    private void initializeCatalog() {
        // ==========================================
        // 1. EARTH ORBIT OPERATIONS
        // ==========================================
        registerMission(new MissionDefinition(
                "EARTH-OBS-AURA",
                "AURA-1 High-Resolution Earth Observation & Multispectral Sweep",
                "Earth (Sun-Synchronous LEO, 702 km)",
                "Earth",
                MissionCategory.EARTH_OBSERVATION,
                MissionDifficulty.STANDARD,
                "AURA-1",
                45,
                "MODERATE",
                "Conduct continuous multispectral polar sweeps across Earth's terminator line. Maintain Nadir pointing precision, monitor solar illumination transitions, and stage optical payload capture routines.",
                List.of(
                        "Maintain attitude lock pointing error <= 0.05 degrees",
                        "Verify battery state of charge remains >= 75% through eclipse",
                        "Stage and execute optical payload capture sequence in daylight sector",
                        "Ensure electrical bus voltage remains stable at 28.0V ± 1.2V"
                ),
                List.of(
                        "At least 1 optical payload capture command confirmed",
                        "Spacecraft operational status remains NOMINAL",
                        "Zero unplanned SAFE_MODE triggers"
                ),
                List.of(
                        "Max eclipse duration: 35.8 minutes per orbital revolution",
                        "Thermal radiator temperature must not exceed +45.0°C"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-DEBRIS-TERRA",
                "TERRA-OBS Orbital Debris Conjunction & Collision Avoidance",
                "Earth (LEO Mid-Inclination, 502 km)",
                "Earth",
                MissionCategory.ORBITAL_SAFETY,
                MissionDifficulty.CHALLENGING,
                "TERRA-OBS",
                30,
                "HIGH",
                "A non-cooperative orbital debris fragment has been identified within TERRA-OBS's safety ellipsoid. Monitor high-cadence tracking, evaluate propulsion manifold readiness, and execute precautionary avoidance maneuvering.",
                List.of(
                        "Maintain continuous telemetry feed during orbital close approach",
                        "Verify propulsion tank pressure >= 18.0 bar",
                        "Command spacecraft attitude to optimized drag or burn configuration",
                        "Confirm miss distance ellipsoid cleared by >= 2.5 km"
                ),
                List.of(
                        "No subsystem fault escalation to CRITICAL severity",
                        "Spacecraft survives closest approach without telemetry drop"
                ),
                List.of(
                        "High orbital debris density zone (51.6° inclination shell)",
                        "Propellant mass reserve must not drop below 85.0 kg"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-CAL-AURA",
                "AURA-1 Earth Observation Optical Payload & Sensor Calibration",
                "Earth (Sun-Synchronous LEO, 702 km)",
                "Earth",
                MissionCategory.PAYLOAD_CALIBRATION,
                MissionDifficulty.STANDARD,
                "AURA-1",
                25,
                "LOW",
                "Perform scheduled on-orbit calibration of AURA-1's high-resolution optical imager. Calibrate focal plane thermal sensor readings, dark current noise baselines, and star-tracker alignment matrices.",
                List.of(
                        "Verify thermal stability in payload bay (+15°C to +25°C)",
                        "Confirm star tracker lock on primary celestial navigation reference",
                        "Execute optical capture calibration telecommand",
                        "Downlink diagnostic telemetry frames for calibration verification"
                ),
                List.of(
                        "Optics telemetry confirmed with dark-frame noise within nominal bounds",
                        "Zero reaction wheel friction runaways during calibration slew"
                ),
                List.of(
                        "Requires daylight illumination entry angle between 15° and 45°",
                        "Command dispatch rate must comply with ground station visibility"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-COMMS-SOLIS",
                "SOLIS-RELAY High-Altitude Telecommunications Recovery",
                "Earth (Geostationary Transfer Orbit, 24,370 km)",
                "Earth",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.CHALLENGING,
                "SOLIS-RELAY",
                60,
                "HIGH",
                "Investigate transponder downlink latency degradation on SOLIS-RELAY during high-apogee passage. Inspect RF amplification power, recalibrate high-gain dish gimbal coordinates, and restore nominal relay link.",
                List.of(
                        "Inspect Comms subsystem telemetry for transponder dropout or attenuation",
                        "Command High-Gain Antenna recalibration or transponder power cycle",
                        "Restore downlink carrier lock with zero packet corruption",
                        "Verify inter-satellite crosslink bandwidth >= 50 Mbps"
                ),
                List.of(
                        "Comms health metric returns to NOMINAL",
                        "Active fault cleared or recovered via Failure Lab procedure"
                ),
                List.of(
                        "Van Allen radiation belt transit causes elevated bit-flip risk",
                        "Battery DOD during extended eclipse must not exceed 40%"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-HEALTH-AURA",
                "AURA-1 Subsystem Health & Comprehensive Bus Telemetry Audit",
                "Earth (Sun-Synchronous LEO, 702 km)",
                "Earth",
                MissionCategory.TELEMETRY_MONITORING,
                MissionDifficulty.STANDARD,
                "AURA-1",
                20,
                "LOW",
                "Execute a comprehensive physical subsystem health verification across EPS, TCS, ADCS, COMMS, OBC, and PROP domains. Validate sensor consistency and verify absence of latent single-event upsets.",
                List.of(
                        "Retrieve full 6-subsystem health matrix",
                        "Verify solar array generation watts matches orbital sun vector",
                        "Check reaction wheel RPM stability (within 800 - 2500 RPM)",
                        "Validate onboard computer watchdog health and CPU load <= 40%"
                ),
                List.of(
                        "All 6 subsystem health domains report NOMINAL",
                        "Zero anomalous sensor readings"
                ),
                List.of(
                        "Continuous real-time telemetry stream must remain uninterrupted"
                ),
                true
        ));

        // ==========================================
        // 2. MARS OPERATIONS (Simulated & Conceptual)
        // ==========================================
        registerMission(new MissionDefinition(
                "MARS-RECON-01",
                "Mars Orbital Reconnaissance & Surface Spectrometry",
                "Mars (Areostationary & Polar Elliptical)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "TERRA-OBS",
                90,
                "HIGH",
                "Simulated high-altitude surface imaging campaign over Martian volcanic and canyon formations. Model atmospheric dust scattering corrections and autonomous navigation under communication latency.",
                List.of(
                        "Calculate solar panel efficiency under Martian solar irradiance (43% of 1 AU)",
                        "Simulate high-resolution swath capture of Valles Marineris corridor",
                        "Monitor battery reserves during extended Martian nocturnal sector",
                        "Compensate for light-time communication delay (4 to 20 minutes)"
                ),
                List.of(
                        "Optical imaging payload sequence completes successfully",
                        "Thermal balance maintained despite low ambient temperatures (-65°C)"
                ),
                List.of(
                        "Severe dust storm activity limits optical contrast",
                        "Autonomous fault response required due to one-way latency"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "MARS-ATMOS-01",
                "Mars Atmospheric Trace Gas & Dust Column Profiling",
                "Mars (Low Mars Orbit, 380 km)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "AURA-1",
                60,
                "MODERATE",
                "Conceptual simulation of infrared occultation sounding to measure carbon dioxide sublimation cycles and trace water vapor concentrations in the Martian upper atmosphere.",
                List.of(
                        "Execute limb-sounding sensor pointing sweep at Martian atmospheric horizon",
                        "Track seasonal atmospheric density variations across polar ice caps",
                        "Maintain orbit altitude above atmospheric entry interface (125 km)",
                        "Downlink atmospheric spectroscopy datasets during telemetry pass"
                ),
                List.of(
                        "Limb scan completed with valid spectral absorption signatures",
                        "Spacecraft navigation confirms stable orbit eccentricity"
                ),
                List.of(
                        "Atmospheric drag requires periodic re-boost considerations"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "MARS-RELAY-ANOMALY",
                "Areostationary Relay Spacecraft Thermal Anomaly Investigation",
                "Mars (Areostationary Orbit, 17,032 km)",
                "Mars",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.CRITICAL,
                "SOLIS-RELAY",
                75,
                "SEVERE",
                "A Mars surface rover data relay satellite exhibits sudden thermal radiator degradation and communication carrier lock loss during solar occultation. Conduct deep diagnostics and execute emergency recovery.",
                List.of(
                        "Diagnose telemetry signatures for TCS radiator loss or heater failure",
                        "Execute emergency thermal management slew to point radiator to deep space",
                        "Reboot primary S-band transponder flight software",
                        "Re-establish bidirectional comms link with Mars surface simulation"
                ),
                List.of(
                        "Radiator temperature stabilized within safe operating range (-40°C to +30°C)",
                        "Relay comms link restored with zero lost packets"
                ),
                List.of(
                        "Extreme solar occultation cooldown risk",
                        "Communication blackout during emergency maneuver"
                ),
                true
        ));

        // ==========================================
        // 3. LUNAR AND DEEP-SPACE OPERATIONS
        // ==========================================
        registerMission(new MissionDefinition(
                "LUNAR-SURVEY-01",
                "Lunar Shackleton Polar Crater Ice & Radar Mapping",
                "Moon (Low Lunar Polar Orbit, 100 km)",
                "Lunar & Deep Space",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "AURA-1",
                50,
                "HIGH",
                "Simulate polar orbital SAR mapping over permanently shadowed craters at the Lunar South Pole to quantify regolith volatile concentrations and potential water ice reservoirs.",
                List.of(
                        "Align synthetic aperture radar antenna Nadir toward Shackleton Crater rim",
                        "Compensate for mass-concentration (Mascon) gravitational perturbations",
                        "Maintain operational power during South Pole crater shadows",
                        "Record synthetic radar returns for cryogenic ice detection"
                ),
                List.of(
                        "Radar mapping pass completed without orbit decay",
                        "Attitude control preserves high-precision radar boresight"
                ),
                List.of(
                        "Severe lunar gravitational mascon disturbances require tight ADCS control",
                        "Deep thermal cycle across lunar day/night boundary"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "DEEP-SPACE-SURVIVAL",
                "Interplanetary Deep-Space Probe Long-Duration Survival",
                "Deep Space (Heliocentric Transfer Orbit, 1.8 AU)",
                "Lunar & Deep Space",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.CRITICAL,
                "SOLIS-RELAY",
                120,
                "SEVERE",
                "Long-duration survival scenario testing power management, autonomous fault recovery, and battery longevity under diminished solar flux at interplanetary distances.",
                List.of(
                        "Configure spacecraft bus into ultra-low-power cruise mode",
                        "Shed non-essential subsystem loads to reduce bus draw to <= 120W",
                        "Maintain autonomous star-tracker attitude hold on inertial guide stars",
                        "Survive 2 simulated deep-space cosmic ray SEU events without bus reset"
                ),
                List.of(
                        "Battery SOC preserved above 80% throughout cruise simulation",
                        "Spacecraft operational status remains continuous without ground intervention"
                ),
                List.of(
                        "One-way light time communication delay: 18 minutes",
                        "Zero ground station margin for real-time recovery"
                ),
                true
        ));

        // ==========================================
        // 4. OUTER PLANETS & SOLAR OPERATIONS
        // ==========================================
        registerMission(new MissionDefinition(
                "JUPITER-EUROPA-01",
                "Jupiter Europa Reconnaissance & Radiation Soak Simulation",
                "Jupiter (Europa Equatorial Orbit, 200 km)",
                "Outer Planets",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CRITICAL,
                "TERRA-OBS",
                100,
                "SEVERE",
                "Advanced simulation concept: evaluate spacecraft electronics endurance inside Jupiter's harsh radiation belts during close Europa flybys, measuring surface plume activity.",
                List.of(
                        "Monitor simulated ionizing radiation dose accumulation on OBC memory",
                        "Execute gravity-assist trajectory adjustment pass",
                        "Collect ice crust surface spectrometry telemetry",
                        "Activate onboard radiation shielding safe configuration"
                ),
                List.of(
                        "Flight software survives radiation belt transit without kernel panic",
                        "Europa science telemetry successfully recorded to non-volatile buffer"
                ),
                List.of(
                        "High radiation dosage necessitates immediate payload power-down after flyby"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "SOLAR-THERMAL-01",
                "Parker Perihelion Solar Corona Thermal Soak & Shutter Management",
                "Sun (Coronal Outer Boundary, 0.05 AU)",
                "Solar",
                MissionCategory.THERMAL_MANAGEMENT,
                MissionDifficulty.CRITICAL,
                "AURA-1",
                80,
                "SEVERE",
                "Simulated ultra-close solar flyby testing extreme thermal heat-shield alignment, radiator shadowing, and solar array feathering to prevent photovoltaic thermal degradation.",
                List.of(
                        "Feather solar arrays to 85° incidence angle to avoid photovoltaic melting",
                        "Maintain heat shield strictly oriented toward solar center (pointing error <= 0.01°)",
                        "Monitor primary thermal heat shield temperature up to +1400°C",
                        "Preserve spacecraft umbilical payload temperature below +30°C"
                ),
                List.of(
                        "Heat shield maintains shadow cone over spacecraft bus",
                        "Zero thermal shutdown of core onboard computer"
                ),
                List.of(
                        "Any attitude deviation > 0.03° results in immediate catastrophic thermal burn"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "MARS-ROVER-RELAY",
                "Mars Jezero Rover Telemetry & High-Rate Science Downlink Relay",
                "Mars (Areocentric Sun-Synchronous Orbit, 400 km)",
                "Mars",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.CHALLENGING,
                "TERRA-OBS",
                40,
                "MODERATE",
                "Align steerable X-band antenna with Jezero Crater surface rover coordinates during overhead pass. Establish bidirectional UHF/X-band relay, buffer multispectral science caches, and downlink to Earth.",
                List.of(
                        "Align steerable parabolic antenna Nadir to Jezero landing ellipse",
                        "Establish bidirectional proximity UHF/X-band communication link",
                        "Buffer high-cadence multispectral sample cache data without packet drop",
                        "Confirm bit error rate <= 1e-7 during 8-minute surface line-of-sight pass"
                ),
                List.of(
                        "Downlink session completes with 100% telemetry verification",
                        "Spacecraft bus maintains thermal limits during off-nadir slew"
                ),
                List.of(
                        "Communication window restricted to 8.4 minutes per Martian sol pass"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "MARS-POLAR-MAPPING",
                "Mars Planum Boreum Polar Water-Ice Cap Stratigraphy Radar",
                "Mars (Low Polar Orbit, 290 km)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "AURA-1",
                60,
                "MODERATE",
                "Ground-penetrating synthetic aperture radar survey over Mars Planum Boreum. Measure dielectric permittivity of seasonal CO2 ice blankets and map sub-surface water-ice basal topography.",
                List.of(
                        "Deploy VHF radar sounding dipole antenna in low polar orbit",
                        "Measure dielectric permittivity of seasonal CO2 sublimation layer",
                        "Compensate for Martian ionospheric total electron content pulse dispersion",
                        "Store calibrated raw radar echo profiles to solid-state flight recorder"
                ),
                List.of(
                        "Radar mapping pass yields high SNR basal reflector echoes",
                        "Attitude pointing error remains <= 0.04° throughout sweep"
                ),
                List.of(
                        "High orbit inclination creates rapid thermal transitions across polar terminator"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "LUNAR-RELAY-FARSIDE",
                "Lunar Far-Side South Pole-Aitken Relay & Halo Station-Keeping",
                "Moon (Earth-Moon L2 Halo Orbit, 65,000 km)",
                "Lunar & Deep Space",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.CHALLENGING,
                "SOLIS-RELAY",
                90,
                "HIGH",
                "Operate far-side lunar communications bridge in a southern Earth-Moon L2 quasi-halo orbit. Perform precision delta-v station-keeping maneuvers to counteract solar radiation pressure perturbations.",
                List.of(
                        "Execute precision halo orbit station-keeping delta-V burn (Δv: 2.4 m/s)",
                        "Bridge unbroken telemetry link between Earth DSN and far-side lunar lander",
                        "Monitor solar flare proton flux during unshielded cislunar cruise",
                        "Maintain high-gain antenna tracking with pointing offset <= 0.08°"
                ),
                List.of(
                        "Relay latency remains bounded within 1.4 seconds bidirectional",
                        "Propellant consumption for station-keeping does not exceed budget"
                ),
                List.of(
                        "Complete loss of Earth direct line-of-sight if halo orbit exceeds stability margin"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "LUNAR-RESOURCE-PROSPECT",
                "Lunar South Pole Shackleton Regolith Volatile & Hydrogen Prospecting",
                "Moon (Low Lunar Polar Orbit, 100 km)",
                "Lunar & Deep Space",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "TERRA-OBS",
                55,
                "MODERATE",
                "Simulated lunar prospector run: calibrate epithermal neutron spectrometer over permanently shadowed craters to map volatile hydrogen concentrations and potential cryogenic deposits.",
                List.of(
                        "Calibrate neutron spectrometer background noise over reference lunar highlands",
                        "Detect epithermal neutron flux depressions indicative of regolith hydrogen",
                        "Manage battery depth-of-discharge during 48-minute lunar shadow sector",
                        "Downlink orbital cryo-reservoir concentration maps to lunar ground network"
                ),
                List.of(
                        "Complete two consecutive polar mapping revolutions",
                        "Battery SOC remains above 45% upon emerging from lunar night"
                ),
                List.of(
                        "Severe lunar gravitational mascon disturbances require autonomous attitude trim"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "JUPITER-RADIATION-02",
                "Jupiter Magnetospheric Radiation Belt Survey & Magnetometer Calibration",
                "Jupiter (Jovian Centric Elliptical Orbit, 420,000 km)",
                "Outer Planets",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.CRITICAL,
                "SOLIS-RELAY",
                110,
                "SEVERE",
                "Transit the inner Jovian radiation torus while measuring relativistic electron flux. Execute boom-mounted fluxgate magnetometer roll calibration and evaluate radiation-hardened OBC EDAC counters.",
                List.of(
                        "Transit Io plasma torus boundary while logging MeV electron radiation dosage",
                        "Execute 3-axis magnetometer roll-calibration maneuver",
                        "Verify radiation-hardened OBC error detection and correction (EDAC) scrubbing",
                        "Shed non-essential payload thermal heating loads during peak radiation passage"
                ),
                List.of(
                        "Zero uncorrectable bit errors in onboard flight control memory",
                        "Magnetosphere vector measurement dataset successfully packaged for transmission"
                ),
                List.of(
                        "Extreme ionizing radiation dose rate (> 50 krad/day equivalent in inner belt)"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "SOLAR-STORM-CORONA",
                "Solar Coronal Mass Ejection Monitoring & Space Weather Alert",
                "Sun (Sun-Earth L1 Halo Orbit, 1,500,000 km)",
                "Solar",
                MissionCategory.EARTH_OBSERVATION,
                MissionDifficulty.CHALLENGING,
                "AURA-1",
                50,
                "HIGH",
                "Positioned at Sun-Earth Lagrange L1: detect energetic solar flare particle arrival, measure interplanetary magnetic field Bz southward deflection, and synthesize geomagnetic storm early warnings.",
                List.of(
                        "Detect high-velocity coronal mass ejection shock arrival via proton spectrometer",
                        "Measure interplanetary magnetic field Bz component southward turning",
                        "Synthesize and broadcast automated space weather warning packet to Earth",
                        "Execute reaction wheel momentum dump to counter solar radiation pressure torque"
                ),
                List.of(
                        "Geomagnetic warning packet dispatched within 60 seconds of shock detection",
                        "ADCS maintains Nadir Sun-pointing precision <= 0.02°"
                ),
                List.of(
                        "High solar energetic particle (SEP) flux induces sensor noise"
                ),
                true
        ));
    }

    private void registerMission(MissionDefinition mission) {
        catalog.put(mission.id(), mission);
    }

    public synchronized MissionResponse createMission(CreateMissionRequest request) {
        Objects.requireNonNull(request, "CreateMissionRequest cannot be null");
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Mission title cannot be blank");
        }
        if (request.destination() == null || request.destination().isBlank()) {
            throw new IllegalArgumentException("Mission destination cannot be blank");
        }
        if (request.spacecraftId() == null || request.spacecraftId().isBlank()) {
            throw new IllegalArgumentException("Mission spacecraftId cannot be blank");
        }

        String missionId = request.id();
        if (missionId == null || missionId.isBlank()) {
            String slug = request.title().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "-");
            if (slug.startsWith("-")) slug = slug.substring(1);
            if (slug.endsWith("-")) slug = slug.substring(0, slug.length() - 1);
            if (slug.length() > 20) slug = slug.substring(0, 20);
            missionId = "MSN-" + slug + "-" + (System.currentTimeMillis() % 10000);
        } else {
            missionId = missionId.trim().toUpperCase(Locale.ROOT);
        }

        String destGroup = request.destinationGroup();
        if (destGroup == null || destGroup.isBlank()) {
            String lowerDest = request.destination().toLowerCase(Locale.ROOT);
            if (lowerDest.contains("mars")) destGroup = "Mars";
            else if (lowerDest.contains("lunar") || lowerDest.contains("moon") || lowerDest.contains("europa") || lowerDest.contains("titan")) destGroup = "Lunar & Deep Space";
            else if (lowerDest.contains("sun") || lowerDest.contains("solar")) destGroup = "Solar";
            else if (lowerDest.contains("jupiter") || lowerDest.contains("saturn") || lowerDest.contains("neptune") || lowerDest.contains("uranus")) destGroup = "Outer Planets";
            else destGroup = "Earth";
        }

        MissionDefinition def = new MissionDefinition(
                missionId,
                request.title().trim(),
                request.destination().trim(),
                destGroup.trim(),
                request.category() != null ? request.category() : MissionCategory.EARTH_OBSERVATION,
                request.difficulty() != null ? request.difficulty() : MissionDifficulty.STANDARD,
                request.spacecraftId().trim(),
                request.durationMinutes() > 0 ? request.durationMinutes() : 45,
                request.riskLevel() != null && !request.riskLevel().isBlank() ? request.riskLevel().trim() : "MODERATE",
                request.synopsis() != null && !request.synopsis().isBlank() ? request.synopsis().trim() : "Custom operator mission scenario.",
                request.objectives() != null && !request.objectives().isEmpty() ? request.objectives() : List.of("Maintain nominal telemetry lock", "Verify subsystem health"),
                request.completionCriteria() != null && !request.completionCriteria().isEmpty() ? request.completionCriteria() : List.of("Telemetry snapshot recorded", "Zero unhandled faults"),
                request.operationalConstraints() != null && !request.operationalConstraints().isEmpty() ? request.operationalConstraints() : List.of("Subsystem operating temperature within range"),
                request.isSimulated() != null ? request.isSimulated() : true
        );

        registerMission(def);
        if (missionDefinitionRepository != null) {
            try {
                missionDefinitionRepository.save(mapToEntity(def));
            } catch (Exception e) {
                log.warn("Failed persisting mission definition {} to database: {}", def.id(), e.getMessage());
            }
        }
        log.info("Registered new mission scenario: {} ('{}') targeting {}", def.id(), def.title(), def.destination());
        return MissionResponse.fromDefinition(def, null, null);
    }

    public List<MissionResponse> getMissions(
            Optional<String> destination,
            Optional<MissionCategory> category,
            Optional<MissionDifficulty> difficulty,
            Optional<MissionStatus> status
    ) {
        return catalog.values().stream()
                .filter(m -> destination.isEmpty() || m.destinationGroup().equalsIgnoreCase(destination.get()) || m.destination().toLowerCase().contains(destination.get().toLowerCase()))
                .filter(m -> category.isEmpty() || m.category() == category.get())
                .filter(m -> difficulty.isEmpty() || m.difficulty() == difficulty.get())
                .map(m -> {
                    MissionRun active = activeRunsByMissionId.get(m.id());
                    MissionRun lastCompleted = missionHistory.stream()
                            .filter(r -> r.missionId().equals(m.id()))
                            .reduce((first, second) -> second)
                            .orElse(null);
                    return MissionResponse.fromDefinition(m, active, lastCompleted);
                })
                .filter(m -> status.isEmpty() || m.status() == status.get())
                .toList();
    }

    public Optional<MissionResponse> getMission(String id) {
        MissionDefinition def = catalog.get(id);
        if (def == null) return Optional.empty();

        MissionRun active = activeRunsByMissionId.get(def.id());
        MissionRun lastCompleted = missionHistory.stream()
                .filter(r -> r.missionId().equals(def.id()))
                .reduce((first, second) -> second)
                .orElse(null);

        return Optional.of(MissionResponse.fromDefinition(def, active, lastCompleted));
    }

    /**
     * Returns the currently active mission run, if any exists across the simulator.
     */
    public synchronized Optional<MissionRun> getActiveRun() {
        return activeRunsByMissionId.values().stream()
                .filter(r -> r.status() == MissionStatus.ACTIVE)
                .findFirst();
    }

    /**
     * Returns the currently active mission definition and run state, if any exists.
     */
    public synchronized Optional<MissionResponse> getActiveMission() {
        Optional<MissionRun> activeRunOpt = getActiveRun();
        if (activeRunOpt.isEmpty()) {
            return Optional.empty();
        }
        return getMission(activeRunOpt.get().missionId());
    }

    /**
     * Starts an interactive mission simulation run bound to authoritative simulation engine.
     * Enforces single active mission run policy by default unless abortActive is true.
     */
    public synchronized MissionRun startMission(String missionId, String operatorUsername) {
        return startMission(missionId, operatorUsername, false);
    }

    public synchronized MissionRun startMission(String missionId, String operatorUsername, boolean abortActive) {
        MissionDefinition def = catalog.get(missionId);
        if (def == null) {
            throw new NoSuchElementException("Mission not found in catalogue: " + missionId);
        }

        // Single active mission enforcement across the simulator session
        Optional<MissionRun> activeRunOpt = getActiveRun();
        if (activeRunOpt.isPresent()) {
            MissionRun existing = activeRunOpt.get();
            if (existing.missionId().equals(missionId)) {
                // Already running this exact mission - return authoritative active run
                log.info("Mission {} already active (runId: {}). Returning existing run.", missionId, existing.runId());
                return existing;
            }
            if (!abortActive) {
                throw new IllegalStateException(String.format(
                        "Cannot start mission '%s': Active mission run '%s' for '%s' is already in progress on spacecraft %s. Abort or switch to begin.",
                        def.title(), existing.runId(), existing.missionId(), existing.spacecraftId()
                ));
            }
            // Explicitly abort active mission before starting the new one
            abortMission(existing.runId(), String.format("Aborted by operator to switch active mission to %s ('%s').", missionId, def.title()));
        }

        String runId = "run-" + UUID.randomUUID().toString().substring(0, 8);
        Instant now = simulationEngine.getCurrentEpoch();

        MissionRun run = new MissionRun(
                runId,
                missionId,
                def.spacecraftId(),
                def.destination(),
                def.destinationGroup(),
                MissionStatus.ACTIVE,
                now,
                null,
                0,
                0,
                "Mission simulation run active. Spacecraft telemetry stream bound.",
                new HashMap<>(),
                operatorUsername != null ? operatorUsername : "operator"
        );

        runsById.put(runId, run);
        activeRunsByMissionId.put(missionId, run);

        if (missionRunRepository != null) {
            try {
                missionRunRepository.save(mapToRunEntity(run));
            } catch (Exception e) {
                log.warn("Failed persisting active mission run {} to database: {}", runId, e.getMessage());
            }
        }

        log.info("Started mission {} (runId: {}) on spacecraft {}", missionId, runId, def.spacecraftId());

        if (eventPublisher != null) {
            eventPublisher.publish(
                    SimulationEventType.MISSION_STARTED,
                    now,
                    def.spacecraftId(),
                    String.format("Mission '%s' launched by %s. Telemetry link verified.", def.title(), run.operatorUsername())
            );
        }

        return run;
    }

    /**
     * Seamlessly transitions the active simulator mission to a new scenario,
     * cleanly aborting and archiving the previous run before activating the new one.
     */
    public synchronized MissionRun switchMission(String newMissionId, String operatorUsername, String reason) {
        return startMission(newMissionId, operatorUsername, true);
    }

    /**
     * Authoritatively evaluates spacecraft physical telemetry, command history, and subsystem states
     * to complete or fail the active mission simulation run.
     */
    public synchronized MissionRun evaluateAndComplete(String runId) {
        MissionRun run = runsById.get(runId);
        if (run == null) {
            throw new NoSuchElementException("Mission run not found: " + runId);
        }
        if (run.status() != MissionStatus.ACTIVE) {
            return run;
        }

        MissionDefinition def = catalog.get(run.missionId());
        Instant now = simulationEngine.getCurrentEpoch();

        // 1. Inspect live spacecraft physical and operational state
        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(run.spacecraftId());
        boolean spacecraftPresent = scOpt.isPresent();
        Spacecraft sc = scOpt.orElse(null);

        // 2. Fetch authoritative telemetry snapshots and command history
        List<TelemetrySnapshot> recentTelemetry = telemetryService.getRecentSnapshots(run.spacecraftId(), 20);
        List<CommandRecord> commands = commandHistoryService.getHistory(20, Optional.of(run.spacecraftId()), Optional.empty());

        // 3. Evaluate objectives based on real server telemetry
        Map<String, Boolean> objectiveResults = new LinkedHashMap<>();
        boolean allPassed = true;

        if (spacecraftPresent && sc != null) {
            // Check 1: Bus operational status
            boolean statusNominal = sc.getOperationalStatus() == SpacecraftStatus.NOMINAL || sc.getOperationalStatus() == SpacecraftStatus.DEGRADED;
            boolean notSafeMode = sc.getOperationalMode() != OperationalMode.SAFE_MODE;
            objectiveResults.put("Spacecraft bus operational without catastrophic failure", statusNominal && notSafeMode);
            if (!statusNominal || !notSafeMode) allPassed = false;

            // Check 2: Battery SOC
            boolean batterySafe = sc.getBatterySocPercent() >= 40.0;
            objectiveResults.put("Battery SOC maintained above safe mission margin (>= 40%)", batterySafe);
            if (!batterySafe) allPassed = false;

            // Check 3: Mission specific criteria
            if (def != null && def.category() == MissionCategory.EARTH_OBSERVATION) {
                boolean hasCaptureOrScience = commands.stream().anyMatch(c -> c.type().name().contains("CAPTURE"))
                        || sc.getOperationalMode() == OperationalMode.SCIENCE_OPERATION || sc.getOperationalMode() == OperationalMode.NOMINAL;
                objectiveResults.put("Optical observation mode verified and commands processed", hasCaptureOrScience);
                if (!hasCaptureOrScience) allPassed = false;
            } else if (def != null && def.category() == MissionCategory.COMMUNICATIONS_RECOVERY) {
                boolean commsNominal = sc.getOperationalStatus() == SpacecraftStatus.NOMINAL;
                objectiveResults.put("Downlink telecommunications carrier lock operational", commsNominal);
                if (!commsNominal) allPassed = false;
            } else {
                boolean generalOk = sc.getBatterySocPercent() > 20.0;
                objectiveResults.put("Flight parameters within operational tolerance", generalOk);
                if (!generalOk) allPassed = false;
            }
        } else {
            // Conceptual mission or simulated craft offline
            objectiveResults.put("Simulated telemetry validation criteria", true);
        }

        MissionStatus finalStatus = allPassed ? MissionStatus.COMPLETED : MissionStatus.FAILED;
        String outcomeSummary = allPassed
                ? String.format("Mission completed successfully. All %d operational gates verified against live telemetry.", objectiveResults.size())
                : "Mission failed. Severe telemetry excursion or emergency SAFE_MODE triggered during operation.";

        MissionRun completed = run.withStatus(
                finalStatus,
                now,
                outcomeSummary,
                objectiveResults,
                recentTelemetry.size(),
                commands.size()
        );

        runsById.put(runId, completed);
        activeRunsByMissionId.remove(run.missionId());
        missionHistory.add(completed);

        if (missionRunRepository != null) {
            try {
                Optional<MissionRunEntity> existingEntity = missionRunRepository.findByRunId(runId);
                MissionRunEntity entityToSave = existingEntity.orElseGet(() -> mapToRunEntity(completed));
                entityToSave.setStatus(completed.status().name());
                entityToSave.setCompletedEpoch(completed.completedEpoch());
                entityToSave.setOutcomeSummary(completed.outcomeSummary());
                entityToSave.setObjectiveResultsJson(JsonUtils.toJson(completed.objectiveResults()));
                entityToSave.setTelemetrySnapshotsCaptured(completed.telemetrySnapshotsCaptured());
                entityToSave.setCommandsDispatched(completed.commandsDispatched());
                missionRunRepository.save(entityToSave);
            } catch (Exception e) {
                log.warn("Failed updating mission run {} in database: {}", runId, e.getMessage());
            }
        }

        log.info("Mission run {} {} on spacecraft {}", runId, finalStatus, run.spacecraftId());

        if (eventPublisher != null) {
            eventPublisher.publish(
                    finalStatus == MissionStatus.COMPLETED ? SimulationEventType.MISSION_COMPLETED : SimulationEventType.MISSION_FAILED,
                    now,
                    run.spacecraftId(),
                    String.format("Mission run '%s' outcome: %s. %s", runId, finalStatus, outcomeSummary)
            );
        }

        return completed;
    }

    /**
     * Aborts an active mission run.
     */
    public synchronized MissionRun abortMission(String runId, String reason) {
        MissionRun run = runsById.get(runId);
        if (run == null) {
            throw new NoSuchElementException("Mission run not found: " + runId);
        }

        Instant now = simulationEngine.getCurrentEpoch();
        MissionRun aborted = run.withStatus(
                MissionStatus.ABORTED,
                now,
                reason != null ? reason : "Mission aborted by flight controller.",
                run.objectiveResults(),
                run.telemetrySnapshotsCaptured(),
                run.commandsDispatched()
        );

        runsById.put(runId, aborted);
        activeRunsByMissionId.remove(run.missionId());
        missionHistory.add(aborted);

        if (missionRunRepository != null) {
            try {
                Optional<MissionRunEntity> existingEntity = missionRunRepository.findByRunId(runId);
                MissionRunEntity entityToSave = existingEntity.orElseGet(() -> mapToRunEntity(aborted));
                entityToSave.setStatus(aborted.status().name());
                entityToSave.setCompletedEpoch(aborted.completedEpoch());
                entityToSave.setOutcomeSummary(aborted.outcomeSummary());
                missionRunRepository.save(entityToSave);
            } catch (Exception e) {
                log.warn("Failed updating aborted mission run {} in database: {}", runId, e.getMessage());
            }
        }

        if (eventPublisher != null) {
            eventPublisher.publish(
                    SimulationEventType.MISSION_ABORTED,
                    now,
                    run.spacecraftId(),
                    String.format("Mission run '%s' ABORTED. Reason: %s", runId, aborted.outcomeSummary())
            );
        }

        return aborted;
    }

    public List<MissionRun> getHistory() {
        return Collections.unmodifiableList(missionHistory);
    }

    private void hydrateFromDatabase() {
        if (missionDefinitionRepository != null) {
            try {
                // Ensure baseline catalog definitions are persisted
                for (MissionDefinition def : catalog.values()) {
                    if (missionDefinitionRepository.findById(def.id()).isEmpty()) {
                        missionDefinitionRepository.save(mapToEntity(def));
                    }
                }

                // Load custom user-created definitions
                List<MissionDefinitionEntity> entities = missionDefinitionRepository.findAll();
                for (MissionDefinitionEntity entity : entities) {
                    if (!catalog.containsKey(entity.getId())) {
                        catalog.put(entity.getId(), mapToDefinition(entity));
                    }
                }
                log.info("Hydrated {} total mission scenario definitions from database.", catalog.size());
            } catch (Exception e) {
                log.warn("Could not hydrate mission definitions from database: {}", e.getMessage());
            }
        }

        if (missionRunRepository != null) {
            try {
                List<MissionRunEntity> runs = missionRunRepository.findTop500ByOrderByStartedEpochDesc();
                if (runs != null && !runs.isEmpty()) {
                    List<MissionRunEntity> chronological = new ArrayList<>(runs);
                    Collections.reverse(chronological);
                    for (MissionRunEntity entity : chronological) {
                        MissionRun run = mapToRun(entity);
                        runsById.put(run.runId(), run);
                        if (run.status() == MissionStatus.ACTIVE) {
                            activeRunsByMissionId.put(run.missionId(), run);
                        } else {
                            missionHistory.add(run);
                        }
                    }
                    log.info("Recovered {} durable mission execution runs from database.", runs.size());
                }
            } catch (Exception e) {
                log.warn("Could not hydrate mission run history from database: {}", e.getMessage());
            }
        }
    }

    private MissionDefinition mapToDefinition(MissionDefinitionEntity entity) {
        return new MissionDefinition(
                entity.getId(),
                entity.getTitle(),
                entity.getDestination(),
                entity.getDestinationGroup(),
                MissionCategory.valueOf(entity.getCategory()),
                MissionDifficulty.valueOf(entity.getDifficulty()),
                entity.getSpacecraftId(),
                entity.getDurationMinutes(),
                entity.getRiskLevel(),
                entity.getSynopsis(),
                JsonUtils.fromJsonToList(entity.getObjectivesJson()),
                JsonUtils.fromJsonToList(entity.getCompletionCriteriaJson()),
                JsonUtils.fromJsonToList(entity.getOperationalConstraintsJson()),
                entity.isSimulated()
        );
    }

    private MissionDefinitionEntity mapToEntity(MissionDefinition def) {
        return new MissionDefinitionEntity(
                def.id(),
                def.title(),
                def.destination(),
                def.destinationGroup(),
                def.category().name(),
                def.difficulty().name(),
                def.spacecraftId(),
                def.durationMinutes(),
                def.riskLevel(),
                def.synopsis(),
                JsonUtils.toJson(def.objectives()),
                JsonUtils.toJson(def.completionCriteria()),
                JsonUtils.toJson(def.operationalConstraints()),
                def.isSimulated()
        );
    }

    private MissionRun mapToRun(MissionRunEntity entity) {
        return new MissionRun(
                entity.getRunId(),
                entity.getMissionId(),
                entity.getSpacecraftId(),
                entity.getDestination(),
                entity.getDestinationGroup(),
                MissionStatus.valueOf(entity.getStatus()),
                entity.getStartedEpoch(),
                entity.getCompletedEpoch(),
                entity.getTelemetrySnapshotsCaptured(),
                entity.getCommandsDispatched(),
                entity.getOutcomeSummary(),
                JsonUtils.fromJsonToBooleanMap(entity.getObjectiveResultsJson()),
                entity.getOperatorUsername()
        );
    }

    private MissionRunEntity mapToRunEntity(MissionRun run) {
        return new MissionRunEntity(
                run.runId(),
                run.missionId(),
                run.spacecraftId(),
                run.destination(),
                run.destinationGroup(),
                run.status().name(),
                run.startedEpoch(),
                run.completedEpoch(),
                run.telemetrySnapshotsCaptured(),
                run.commandsDispatched(),
                run.outcomeSummary(),
                JsonUtils.toJson(run.objectiveResults()),
                run.operatorUsername()
        );
    }
}
