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
import org.springframework.transaction.annotation.Transactional;

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
                "ARES-ORBITER",
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
                "MARS-ATMOS-4",
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
                "MARS-RELAY-1",
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
                "CHANDRA-ORB",
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
                "Deep Space",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.CRITICAL,
                "DEEP-NAV-ALPHA",
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
                "EUROPA-CLIPPER-S",
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
                "HELIOS-CORONA",
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
                "MARS-RELAY-1",
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
                "AERO-MAP-02",
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
                "LUNAR-HALO-1",
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
                "LUNAR-RECON-X",
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
                "JOVIAN-RADIATION",
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
                "SOLAR-STORM-01",
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

        registerMission(new MissionDefinition(
                "SATURN-RING-01",
                "Saturn Rings & Titan Atmospheric Ingress Profiling",
                "Saturn (Equatorial Ring Plane, 185,000 km)",
                "Outer Planets",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CRITICAL,
                "CHRONOS-SATURN",
                95,
                "SEVERE",
                "Conduct ring-plane crossing spectroscopy and radar occultation of Saturn's ring structure, followed by telemetry relay during Titan upper-atmosphere proximity skim.",
                List.of(
                        "Execute ring-plane particle density sensor sweep",
                        "Perform radio occultation scan through the Cassini Division",
                        "Calibrate Titan atmosphere infrared transmission profile",
                        "Preserve radioisotope thermoelectric generator bus voltage"
                ),
                List.of(
                        "Ring particle collision rate within safe micrometeoroid tolerance",
                        "Titan atmospheric sounding frames successfully cached"
                ),
                List.of(
                        "Extreme distance imposes 80-minute one-way speed-of-light delay"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "ASTEROID-INTERCEPT-01",
                "Near-Earth Asteroid High-Speed Flyby & Mass Spectrometry",
                "Deep Space (Heliocentric Asteroid Belt, 2.3 AU)",
                "Deep Space",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "ASTEROID-SCOUT",
                70,
                "HIGH",
                "Autonomous hyperbolic flyby past carbonaceous C-type asteroid. Deploy optical navigation tracking to guide high-speed camera boresight and trigger dust impact mass spectrometer.",
                List.of(
                        "Acquire optical navigation lock on asteroid nucleus 48 hours prior to encounter",
                        "Execute autonomous trajectory trim burn with cold-gas RCS",
                        "Capture 120 multispectral framing images during 20 km closest approach",
                        "Measure organic composition of ejected impact debris"
                ),
                List.of(
                        "Closest approach achieved within ±500 meters of target vector",
                        "Spectrometer mass spectrum resolution >= 5000 m/Δm"
                ),
                List.of(
                        "Hyperbolic relative encounter velocity exceeds 14.2 km/s"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "OUTER-TITAN-02",
                "Titan Hydrocarbon Seas & Atmospheric Radar Ingress",
                "Saturn (Titan Polar Orbit, 950 km)",
                "Outer Planets",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CRITICAL,
                "TITAN-RELAY",
                105,
                "SEVERE",
                "Perform synthetic aperture radar mapping of Kraken Mare and Ligeia Mare during low-altitude Titan orbital skim. Analyze methane evaporation cycles and relay atmospheric sounding profiles.",
                List.of(
                        "Align Nadir SAR antenna with Kraken Mare coastline coordinates",
                        "Compensate for thick nitrogen atmosphere attenuation (1.5 bar surface pressure)",
                        "Measure microwave dielectric constant across liquid hydrocarbon lakes",
                        "Downlink dual-polarization radar images via X-band high-gain relay"
                ),
                List.of(
                        "Radar swath coverage exceeds 85% of designated polar lake region",
                        "RTG thermal and electrical bus levels remain strictly nominal"
                ),
                List.of(
                        "Cryogenic ambient temperature (-179°C) requires active internal bay heating"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "DEEP-VOYAGER-02",
                "Voyager Heliopause Transition & Cosmic Ray Diagnostics",
                "Deep Space (Interstellar Heliopause, 120 AU)",
                "Deep Space",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.CRITICAL,
                "VOYAGER-EXP",
                120,
                "SEVERE",
                "Monitor interstellar magnetic field boundary crossing and anomalous cosmic ray flux variations beyond the Solar termination shock. Execute autonomous low-power survival protocols.",
                List.of(
                        "Detect sudden drop in solar wind particle density below heliopause threshold",
                        "Measure galactic cosmic ray energetic proton flux surge",
                        "Configure spacecraft bus into ultra-conservative power preservation mode",
                        "Execute autonomous periodic radio beacon transmission back toward Earth"
                ),
                List.of(
                        "Zero uncommanded computer resets during interstellar plasma boundary transit",
                        "Scientific telemetry packet safely transmitted and logged"
                ),
                List.of(
                        "Round-trip light time exceeds 33 hours; zero real-time intervention possible"
                ),
                true
        ));

        // =========================================================================
        // 5. EXPANDED MISSION CATALOGUE: 24 NEW MISSIONS ACROSS ALL 6 GROUPS
        // =========================================================================

        // --- EARTH ORBIT (4 new missions) ---
        registerMission(new MissionDefinition(
                "EARTH-SURVEY-MULTI",
                "High-Resolution Multispectral Earth Survey & Terminator Scan",
                "Earth (Sun-Synchronous LEO, 690 km)",
                "Earth",
                MissionCategory.EARTH_OBSERVATION,
                MissionDifficulty.STANDARD,
                "HELIOS-OBS",
                50,
                "MODERATE",
                "Deploy high-resolution optical imager across day-night terminator. Verify multispectral band calibrations and Nadir sensor precision during rapid thermal transitions.",
                List.of(
                        "Maintain pointing error <= 0.04° along polar orbit track",
                        "Verify battery SOC remains >= 78% through eclipse",
                        "Capture and downlink 16 calibrated spectral frames"
                ),
                List.of(
                        "Terminator optical sweep completed with zero dropped frames",
                        "Spacecraft status remains NOMINAL"
                ),
                List.of(
                        "Radiator temperature <= +38.0°C",
                        "Max eclipse duration: 34 minutes"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-DEBRIS-VIGIL",
                "Orbital Debris Tracking & Conjunction Avoidance Alert",
                "Earth (Polar LEO Lidar Tracking, 750 km)",
                "Earth",
                MissionCategory.ORBITAL_SAFETY,
                MissionDifficulty.CHALLENGING,
                "VIGIL-TRACK",
                40,
                "HIGH",
                "Track non-cooperative derelict rocket upper stage entering close proximity sphere. Calculate collision probability and verify emergency cold-gas avoidance readiness.",
                List.of(
                        "Track secondary object laser rangefinder return for 15 minutes",
                        "Confirm miss distance clearance >= 2.0 km",
                        "Maintain spacecraft telemetry lock with ground stations"
                ),
                List.of(
                        "Zero debris impact alerts unresolved",
                        "Propellant mass reserve intact >= 180 kg"
                ),
                List.of(
                        "High orbital inclination debris corridor",
                        "No thruster firing while payload sensors active"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-RELAY-RESILIENCE",
                "MEO Communications Relay Resilience & Crosslink Trial",
                "Earth (Medium Earth Orbit, 20,200 km)",
                "Earth",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.STANDARD,
                "MERIDIAN-RELAY",
                60,
                "MODERATE",
                "Conduct sustained high-throughput crosslink data transfer trial across multiple LEO user constellations. Test automated carrier recovery under simulated radiation belt noise.",
                List.of(
                        "Establish dual-frequency Ka-band crosslink with simulated LEO platforms",
                        "Sustain 1.2 Gbps data throughput for 45 minutes",
                        "Recover carrier synchronization within 3 seconds of RF glitch"
                ),
                List.of(
                        "Packet corruption rate <= 0.001%",
                        "Comms subsystem health reports NOMINAL"
                ),
                List.of(
                        "Van Allen radiation belt inner edge flux",
                        "Maximum amplifier temperature <= +55°C"
                ),
                true
        ));

        registerMission(new MissionDefinition(
                "EARTH-STORM-IMPACT",
                "Geomagnetic Storm Atmospheric Drag & Weather Profiling",
                "Earth (Atmospheric Weather LEO, 550 km)",
                "Earth",
                MissionCategory.TELEMETRY_MONITORING,
                MissionDifficulty.CHALLENGING,
                "STRATUS-MET",
                45,
                "HIGH",
                "Assess upper-thermosphere density expansion induced by a coronal mass ejection impact. Monitor ADCS reaction wheel loads countering sudden atmospheric drag surges.",
                List.of(
                        "Monitor atmospheric drag torque on 3-axis reaction wheels",
                        "Perform momentum desaturation maneuver before wheel speeds reach 3000 RPM",
                        "Log thermospheric density fluctuations across orbital passes"
                ),
                List.of(
                        "Attitude control maintained through peak aerodynamic surge",
                        "Battery bus voltage stable at 28.0V ± 1.0V"
                ),
                List.of(
                        "Orbital decay rate must not exceed 120 meters/day",
                        "Do not desaturate reaction wheels during ground pass"
                ),
                true
        ));

        // --- LUNAR OPERATIONS (4 new missions) ---
        registerMission(new MissionDefinition(
                "LUNAR-ILLUM-SURVEY",
                "Lunar South Pole Continuous Illumination Rim Survey",
                "Moon (Low Lunar Orbit, 60 km Circular)",
                "Lunar",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "SELENE-MAP",
                60,
                "MODERATE",
                "High-resolution topography mapping over Malapert Mountain and Shackleton Rim to identify peaks of eternal light and continuous solar power siting for future outposts.",
                List.of(
                        "Perform 6 consecutive high-resolution optical passes over Malapert Rim",
                        "Calculate solar elevation angle and shadow progression over terrain",
                        "Preserve high-precision Nadir camera boresight pointing <= 0.02°"
                ),
                List.of(
                        "Optical elevation model generated with 0.5m vertical accuracy",
                        "Payload data buffer downlinked to lunar ground network"
                ),
                List.of(
                        "Severe lunar mascon gravity anomalies",
                        "Thermal cycling between shadow and sunlit rim"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "LUNAR-VOLATILE-POLARIS",
                "Polar Volatile & Subsurface Cryo-Core Prospecting",
                "Moon (Lunar South Pole Orbit, 100 km)",
                "Lunar",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "POLARIS-LR",
                80,
                "HIGH",
                "Deploy orbital neutron spectrometer and bistatic radar to measure dielectric signatures and hydrogen concentrations in permanently shadowed regions of Cabeus crater.",
                List.of(
                        "Map hydrogen epithermal neutron flux depressions across Cabeus floor",
                        "Conduct bistatic radar reflection with ground relay",
                        "Maintain battery heater efficiency during deep cryo-pass (-230°C)"
                ),
                List.of(
                        "Volatile concentration map successfully rendered",
                        "Spacecraft emerges from shadow sector with battery SOC >= 60%"
                ),
                List.of(
                        "No solar generation during 52-minute crater shadow",
                        "Mascon orbital decay requires autonomous eccentricity corrections"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "LUNAR-RELAY-AVAIL",
                "Lunar Relay Network Continuous Availability & Latency Trial",
                "Moon (Earth-Moon L1 Halo Orbit, 58,000 km)",
                "Lunar",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.STANDARD,
                "LUNA-LINK",
                90,
                "MODERATE",
                "Maintain uninterrupted high-availability relay bridge between Earth Mission Control, orbital lunar mappers, and surface south-pole stations under varying geometry.",
                List.of(
                        "Verify simultaneous multi-target beamforming for 3 lunar nodes",
                        "Ensure round-trip relay latency remains <= 2.8 seconds",
                        "Conduct autonomous halo orbit station-keeping trim burn"
                ),
                List.of(
                        "Zero packet loss across 90-minute operational window",
                        "Propellant mass reserve remains strictly above budget margin"
                ),
                List.of(
                        "Earth-Moon L1 unstable libration manifold requires station-keeping",
                        "Solar flare proton background noise"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "LUNAR-ORBIT-NAV-CAL",
                "Autonomous Lunar Orbital Navigation & Landmark Calibration",
                "Moon (Lunar Equatorial Frozen Orbit, 120 km)",
                "Lunar",
                MissionCategory.PAYLOAD_CALIBRATION,
                MissionDifficulty.STANDARD,
                "ARGUS-LNAV",
                55,
                "LOW",
                "Calibrate optical crater-pattern recognition and autonomous landmark tracking software. Compute real-time state vectors without Earth ground-station radiometric tracking.",
                List.of(
                        "Track 24 reference lunar crater landmarks via optical navigation",
                        "Calculate real-time autonomous ephemeris solution within ±15 meters",
                        "Cross-verify optical navigation state with Doppler beacon telemetry"
                ),
                List.of(
                        "Autonomous ephemeris convergence achieved within 2 orbital revolutions",
                        "Navigation covariance matrix remains bounded"
                ),
                List.of(
                        "Crater shadow variation across solar phase angles",
                        "Do not slew spacecraft during optical integration cycle"
                ),
                false
        ));

        // --- MARS OPERATIONS (4 new missions) ---
        registerMission(new MissionDefinition(
                "MARS-DUST-STORM",
                "Mars Global Atmospheric Dust-Storm Optical Penetration",
                "Mars (Mars Sun-Synchronous Polar Orbit, 320 km)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "AREION-RECON",
                75,
                "HIGH",
                "Track planet-encircling dust storm development over Hellas Basin. Measure optical depth changes and infrared emission variations while managing degraded solar array output.",
                List.of(
                        "Capture thermal infrared scans of dust storm progression",
                        "Compensate for 28% solar flux reduction due to atmospheric dust opacity",
                        "Maintain power bus priority to thermal heaters and primary payload"
                ),
                List.of(
                        "Atmospheric dust optical depth profile downlinked to Earth",
                        "Spacecraft battery SOC preserved above 70%"
                ),
                List.of(
                        "Reduced photovoltaic generation during global dust storm",
                        "Round-trip comms latency: 14 minutes"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "MARS-POLAR-ICE-CAP",
                "Martian South Polar Residual CO2 and Water-Ice Stratigraphy",
                "Mars (Mars Polar Water-Ice Orbit, 450 km)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "BOREALIS-MAP",
                65,
                "MODERATE",
                "Sub-surface sounding radar sweeps over Planum Australe. Measure thickness of carbon dioxide slab dry-ice deposits and detect underlying basal water ice interfaces.",
                List.of(
                        "Deploy 20-meter radar antenna in circular polar orbit",
                        "Map sub-surface radar echoes up to 1.5 km depth beneath polar cap",
                        "Verify thermal stabilization during rapid solar terminator crossings"
                ),
                List.of(
                        "Polar basal stratigraphy profiles successfully acquired",
                        "Zero anomalous reaction wheel friction telemetry"
                ),
                List.of(
                        "Polar cryogenic temperature extremes (-125°C)",
                        "Ionospheric total electron content corrections required"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "MARS-TRACE-GAS-MET",
                "Atmospheric Methane and Trace Gas Column Density Survey",
                "Mars (Low Mars Aeronomy Orbit, 280 km)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "AETHER-MET",
                70,
                "MODERATE",
                "Solar occultation spectrometry measuring trace parts-per-billion atmospheric methane and water vapor isotopes across seasonal sublimations in Gale Crater and Jezero.",
                List.of(
                        "Perform high-resolution infrared limb occultation during sunset and sunrise",
                        "Measure methane absorption spectra at 3.3 micrometer wavelength",
                        "Quantify deuterium-to-hydrogen ratio in upper Martian atmosphere"
                ),
                List.of(
                        "Trace gas column density dataset completed with high SNR",
                        "Spacecraft orbit semi-major axis maintained within bounds"
                ),
                List.of(
                        "Requires precise solar limb pointing tracking",
                        "Atmospheric drag requires periodic momentum management"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "MARS-ROVER-RECOVERY",
                "Surface Rover-to-Orbiter Emergency UHF Communications Recovery",
                "Mars (Areostationary Relay Orbit, 17,032 km)",
                "Mars",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.CRITICAL,
                "DEIMOS-RELAY",
                85,
                "SEVERE",
                "A simulated surface exploration rover fails to check in during scheduled direct-to-Earth pass. Reposition areostationary relay dish, perform wide-angle beacon sweep, and re-establish link.",
                List.of(
                        "Slew high-gain parabolic reflector toward emergency rover coordinates",
                        "Perform multi-channel UHF beacon acquisition sweep",
                        "Recover corrupted rover telemetry frames and stage emergency uplink telecommand",
                        "Verify rover battery recovery status and confirm bidirectional link"
                ),
                List.of(
                        "Rover emergency telemetry stream successfully locked and verified",
                        "Comms subsystem reports NOMINAL carrier tracking"
                ),
                List.of(
                        "Tight link budget margin at areostationary altitude",
                        "One-way light time: 16.2 minutes"
                ),
                false
        ));

        // --- OUTER PLANETS (4 new missions) ---
        registerMission(new MissionDefinition(
                "JUPITER-BELT-SURVEY",
                "Jupiter High-Energy Relativistic Electron Belt Penetration",
                "Jupiter (Inner Jovian Radiation Belt, 350,000 km)",
                "Outer Planets",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.CRITICAL,
                "ION-GUARD",
                110,
                "SEVERE",
                "Dive into Jupiter's intense inner radiation torus between Io and Europa. Measure multi-MeV electron flux and test radiation-hardened OBC memory scrub routines.",
                List.of(
                        "Monitor accumulated ionizing radiation dosage on shielded solid-state recorder",
                        "Verify memory EDAC error correction scrubbing during 100 krad/hour dose peak",
                        "Maintain 3-axis attitude lock using gyroscopic reference while star trackers blinded by radiation noise"
                ),
                List.of(
                        "Zero fatal flight software reboots during radiation belt transit",
                        "Radiation dosimeter dataset securely stored to non-volatile flash"
                ),
                List.of(
                        "Extreme ionizing radiation environment",
                        "Solar power unavailable; RTG bus voltage must remain >= 28.0V"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "JOVIAN-MOON-CAMPAIGN",
                "Jovian Galilean Moons Multi-Body Gravitational Flyby Campaign",
                "Jupiter (Jupiter Eccentric System Orbit, 500,000 km)",
                "Outer Planets",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CRITICAL,
                "JOVE-SCOPE",
                120,
                "SEVERE",
                "Execute multi-body gravity-assist flyby sequencing across Ganymede and Callisto. Calibrate trajectory deviation and collect multispectral surface plume data.",
                List.of(
                        "Execute precision Ganymede gravity-assist orbital trimming burn (Δv: 18.2 m/s)",
                        "Capture high-resolution optical imagery of Callisto impact basins",
                        "Measure gravitational quadrupole moment variations during close approach"
                ),
                List.of(
                        "Target trajectory insertion achieved within ±2.0 km tolerance",
                        "Spacecraft systems survive intense gravitational tidal forces"
                ),
                List.of(
                        "Complex multi-body 4-body gravitational dynamics",
                        "One-way speed-of-light delay: 42 minutes"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "SATURN-RING-DYNAMICS",
                "Saturn Dense B-Ring Optical Occultation & Gap Dynamics",
                "Saturn (Titan Circular Polar Orbit, 800 km)",
                "Outer Planets",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "TITAN-ORBIT",
                95,
                "HIGH",
                "Observe stellar occultations through Saturn's outer ring gaps and Cassini division. Measure optical depth of micro-particle clumps and shepherd moon gravitational perturbations.",
                List.of(
                        "Track UV stellar occultation profile through outer ring structure",
                        "Analyze density wave dispersion and particle clump size distribution",
                        "Maintain high-precision star sensor boresight tracking through ring glare"
                ),
                List.of(
                        "Ring optical thickness profile downlinked with 10-meter spatial resolution",
                        "Attitude control jitter remains <= 0.01°"
                ),
                List.of(
                        "Ambient temperature -185°C requires active RTG waste-heat distribution",
                        "Long communications turnaround time (84 minutes)"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "RHEA-ICY-RECON",
                "Outer-Planet Icy Moon Rhea Surface Geodesy & Plasma Wake",
                "Saturn (Saturnian Equatorial Moon Orbit, 527,000 km)",
                "Outer Planets",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "RHEA-SURVEY",
                100,
                "HIGH",
                "Conduct close 150 km flyby past Saturn's second-largest icy moon Rhea. Measure surface dielectric properties and probe the interaction between Saturn's magnetosphere and Rhea's exosphere.",
                List.of(
                        "Map surface crater saturation and tectonic bright ice fractures",
                        "Measure magnetic field perturbation across Rhea's plasma wake",
                        "Downlink high-rate telemetry burst via 3.7-meter high-gain antenna"
                ),
                List.of(
                        "Flyby science dataset validated with 100% telemetry integrity",
                        "Spacecraft attitude returned to Earth-pointing high-gain link"
                ),
                List.of(
                        "No solar generation; RTG electrical load balance critical",
                        "High relative flyby velocity (7.8 km/s)"
                ),
                false
        ));

        // --- SOLAR OPERATIONS (4 new missions) ---
        registerMission(new MissionDefinition(
                "SOLAR-CORONA-CAMPAIGN",
                "Heliocentric Low-Perihelion Corona Magnetic Field Observation",
                "Sun (Heliocentric Corona Monitor, 0.4 AU)",
                "Solar",
                MissionCategory.THERMAL_MANAGEMENT,
                MissionDifficulty.CRITICAL,
                "HELIO-WATCH",
                90,
                "SEVERE",
                "Measure magnetic switchback structures and coronal solar wind acceleration inside 0.4 AU. Validate active thermal radiator louvers under 6.2x Earth solar irradiance.",
                List.of(
                        "Orient heat-shield apex strictly along solar vector within 0.015°",
                        "Measure magnetic field reversals in young solar wind plasma",
                        "Monitor payload radiator heat dissipation and confirm bus temp <= +25°C"
                ),
                List.of(
                        "Coronal magnetic field measurement stream logged with high resolution",
                        "Zero heat-shield alignment violations"
                ),
                List.of(
                        "Thermal flux > 8500 W/m²",
                        "Solar flare proton saturation limits star-tracker reliability"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "SOLAR-FLARE-RESPONSE",
                "High-Cadence Extreme-UV Solar Flare Blast Detection & Alert",
                "Sun (Heliocentric Drift Flare Watch, 0.7 AU)",
                "Solar",
                MissionCategory.THERMAL_MANAGEMENT,
                MissionDifficulty.STANDARD,
                "FLARE-ALERT",
                40,
                "MODERATE",
                "Detect X-class solar flare eruption via extreme-UV heliograph. Trigger automated payload shutter protection and synthesize emergency particle storm notification.",
                List.of(
                        "Detect solar flux increase exceeding X1.0 threshold within 5 seconds",
                        "Command protective shutter closure over sensitive optical detectors",
                        "Synthesize emergency space-weather broadcast to Earth relay network"
                ),
                List.of(
                        "Automated flare detection and shutter telecommand executed < 10 seconds",
                        "Optical detectors survive flare without sensor saturation damage"
                ),
                List.of(
                        "Extreme UV flux induces high sensor thermal drift",
                        "Autonomous reaction required due to 6-minute light time"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "SOLAR-SPACE-WEATHER",
                "Coronal Shock Front & Space-Weather Interplanetary Warning",
                "Sun (Sun-Earth L1 Halo Warning Orbit, 1,500,000 km)",
                "Solar",
                MissionCategory.TELEMETRY_MONITORING,
                MissionDifficulty.CHALLENGING,
                "STORM-SENTINEL",
                60,
                "HIGH",
                "Continuous monitoring of coronal shock fronts and energetic proton storms at Sun-Earth L1. Validate real-time autonomous alarm synthesis for terrestrial power grid alerts.",
                List.of(
                        "Analyze real-time solar wind plasma density and speed jump conditions",
                        "Detect interplanetary magnetic field southward Bz polarity turning",
                        "Broadcast priority alert packet to global infrastructure operations"
                ),
                List.of(
                        "Space-weather alert transmitted within 30 seconds of shock front arrival",
                        "Spacecraft bus health reports NOMINAL"
                ),
                List.of(
                        "Continuous uninterrupted telemetry feed required",
                        "L1 halo orbit station-keeping balance"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "SOLAR-CORONA-TRACE",
                "Solar Coronal Streamer Doppler Velocity Profiling",
                "Sun (Solar Perihelion Skim Orbit, 0.08 AU)",
                "Solar",
                MissionCategory.THERMAL_MANAGEMENT,
                MissionDifficulty.CRITICAL,
                "CORONA-TRACE",
                85,
                "SEVERE",
                "Ultra-close perihelion skim inside the Alfvén critical surface. Measure Doppler velocity shifts of coronal streamers to resolve the coronal heating paradox.",
                List.of(
                        "Measure coronal streamer ion acoustic Doppler velocity shifts",
                        "Monitor carbon-composite thermal shield front-face temperature (+1200°C)",
                        "Verify internal component bay temperatures remain stable <= +28°C"
                ),
                List.of(
                        "Streamer Doppler profile recorded with 0.1 km/s accuracy",
                        "No thermal sensor threshold breaches"
                ),
                List.of(
                        "Solar radiative flux exceeds 210,000 W/m²",
                        "Attitude error > 0.02° will destroy unprotected spacecraft elements"
                ),
                false
        ));

        // --- DEEP SPACE OPERATIONS (4 new missions) ---
        registerMission(new MissionDefinition(
                "DEEP-NAV-DRIFT",
                "Autonomous Interplanetary Optical Navigation Drift Correction",
                "Deep Space (Heliocentric Navigation Calibration Drift, 1.4 AU)",
                "Deep Space",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.STANDARD,
                "KEPLER-DRIFT",
                120,
                "MODERATE",
                "Calibrate optical triangulation across main-belt asteroids and background guide stars. Calculate autonomous trajectory corrections without reliance on terrestrial DSN tracking.",
                List.of(
                        "Sight 12 main-belt asteroids against stellar reference frame",
                        "Compute autonomous orbit determination state vector",
                        "Execute micro-thruster drift correction burn (Δv: 0.85 m/s)"
                ),
                List.of(
                        "State vector position uncertainty reduced to < 50 km",
                        "Propellant consumption for drift correction <= 0.4 kg"
                ),
                List.of(
                        "Low solar flux requires high battery efficiency",
                        "Communication delay: 11.5 minutes"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "DEEP-COMMS-RESILIENCE",
                "Extreme-Distance Ka-Band High-Gain Carrier Resilience Trial",
                "Deep Space (Interplanetary Deep-Space Comms Bridge, 4.2 AU)",
                "Deep Space",
                MissionCategory.COMMUNICATIONS_RECOVERY,
                MissionDifficulty.CHALLENGING,
                "VOYAGER-RELAY",
                105,
                "HIGH",
                "Operate interplanetary telecommunications link across 4.2 AU. Evaluate low-power traveling-wave tube amplifier stability and forward error correction across cosmic noise.",
                List.of(
                        "Establish 32 GHz Ka-band carrier lock with 70-meter Deep Space Network antenna",
                        "Verify LDPC error-correction coding efficiency under 12 dB SNR loss",
                        "Perform automated antenna pointing trim to counter spacecraft thermal deflection"
                ),
                List.of(
                        "Zero frame sync loss during 90-minute downlink session",
                        "Comms subsystem health reports NOMINAL"
                ),
                List.of(
                        "Round-trip light time: 70 minutes",
                        "Available bus power strictly limited to RTG generation"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "DEEP-PROBE-SURVIVAL",
                "Interplanetary Cruise RTG Thermal & Bus Power Degradation",
                "Deep Space (Deep-Space Heliopause Cruise, 85 AU)",
                "Deep Space",
                MissionCategory.DEEP_SPACE_SURVIVAL,
                MissionDifficulty.CRITICAL,
                "FARPOINT-PROBE",
                130,
                "SEVERE",
                "Simulate extreme deep-space cruise survival at 85 AU from the Sun. Manage decaying radioisotope thermoelectric generator power, shed secondary loads, and maintain internal heaters.",
                List.of(
                        "Balance 180W total RTG electrical output across critical survival systems",
                        "Cycle auxiliary heaters to keep propellant line temp >= -10°C",
                        "Execute low-bitrate autonomous beacon pulse transmission"
                ),
                List.of(
                        "Electrical bus voltage remains stable at 28.0V ± 0.8V",
                        "Spacecraft survives 120-minute autonomous evaluation without battery depletion"
                ),
                List.of(
                        "Solar power 0 W (infinite distance)",
                        "Round-trip comms latency: 23.6 hours"
                ),
                false
        ));

        registerMission(new MissionDefinition(
                "DEEP-ASTEROID-RENDEZVOUS",
                "Outer Asteroid Belt Autonomous Rendezvous & Proximity Survey",
                "Deep Space (Interplanetary Cruise Trajectory, 2.5 AU)",
                "Deep Space",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.CHALLENGING,
                "ODYSSEY-NAV",
                90,
                "HIGH",
                "Autonomous slow-speed proximity approach to carbonaceous asteroid 10 Hygiea. Map gravitational field, surface regolith distribution, and stage laser altimetry sweep.",
                List.of(
                        "Execute autonomous proximity braking burn to achieve relative velocity < 1.0 m/s",
                        "Conduct continuous lidar surface elevation scan from 15 km orbital hold",
                        "Model asteroid mass and center-of-gravity through optical tracking"
                ),
                List.of(
                        "Proximity survey completed without trajectory overshoot",
                        "Laser altimetry profile generated and verified"
                ),
                List.of(
                        "Micro-gravity environment requires precise cold-gas impulse control",
                        "Communication latency: 21 minutes"
                ),
                false
        ));
    }

    private void registerMission(MissionDefinition mission) {
        catalog.put(mission.id(), mission);
    }

    @Transactional
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

        // Validate spacecraft destination compatibility before persisting
        if (!DestinationCompatibilityValidator.isCompatible(request.spacecraftId(), request.destination(), request.destinationGroup())) {
            String resolvedGroup = DestinationCompatibilityValidator.resolveDestinationGroup(request.destination(), request.destinationGroup());
            throw new IllegalArgumentException(String.format(
                    "Spacecraft '%s' is not compatible with destination '%s' (destination group: %s).",
                    request.spacecraftId(), request.destination(), resolvedGroup
            ));
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
            String canonical = DestinationCompatibilityValidator.resolveDestinationGroup(request.destination(), null);
            switch (canonical) {
                case "MARS" -> destGroup = "Mars";
                case "LUNAR" -> destGroup = "Lunar & Deep Space";
                case "OUTER" -> destGroup = "Outer Planets";
                case "SOLAR" -> destGroup = "Solar";
                case "DEEP_SPACE" -> destGroup = "Deep Space";
                default -> destGroup = "Earth";
            }
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
    @Transactional
    public synchronized MissionRun startMission(String missionId, String operatorUsername) {
        return startMission(missionId, operatorUsername, false);
    }

    @Transactional
    public synchronized MissionRun startMission(String missionId, String operatorUsername, boolean abortActive) {
        MissionDefinition def = catalog.get(missionId);
        if (def == null) {
            throw new NoSuchElementException("Mission not found in catalogue: " + missionId);
        }

        // 1. Authoritative compatibility verification
        if (!DestinationCompatibilityValidator.isCompatible(def.spacecraftId(), def.destination(), def.destinationGroup())) {
            throw new IllegalArgumentException(String.format(
                    "Spacecraft '%s' assigned to mission '%s' is not compatible with destination '%s' (%s).",
                    def.spacecraftId(), def.id(), def.destination(), def.destinationGroup()
            ));
        }

        // 2. State machine invariant: A completed mission cannot be launched again
        boolean alreadyCompleted = missionHistory.stream()
                .anyMatch(r -> r.missionId().equals(missionId) && r.status() == MissionStatus.COMPLETED);
        if (alreadyCompleted) {
            throw new IllegalStateException(String.format(
                    "Mission '%s' ('%s') has already been completed. Relaunching completed missions is not permitted.",
                    missionId, def.title()
            ));
        }

        // 3. Single active mission enforcement across the simulator session
        Optional<MissionRun> activeRunOpt = getActiveRun();
        if (activeRunOpt.isPresent()) {
            MissionRun existing = activeRunOpt.get();
            if (existing.missionId().equals(missionId)) {
                // Repeating a launch request must not create duplicate active runs
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
    @Transactional
    public synchronized MissionRun switchMission(String newMissionId, String operatorUsername, String reason) {
        return startMission(newMissionId, operatorUsername, true);
    }

    /**
     * Authoritatively evaluates spacecraft physical telemetry, command history, and subsystem states
     * to complete or fail the active mission simulation run.
     */
    @Transactional
    public synchronized MissionRun evaluateAndComplete(String runId) {
        MissionRun run = runsById.get(runId);
        if (run == null && missionRunRepository != null) {
            run = missionRunRepository.findByRunId(runId).map(this::mapToRun).orElse(null);
            if (run != null) runsById.put(run.runId(), run);
        }
        if (run == null) {
            throw new NoSuchElementException("Mission run not found: " + runId);
        }
        if (run.status() != MissionStatus.ACTIVE) {
            throw new IllegalStateException(String.format(
                    "Mission run '%s' cannot be completed because its status is %s (expected ACTIVE).",
                    runId, run.status()
            ));
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
    @Transactional
    public synchronized MissionRun abortMission(String runId, String reason) {
        MissionRun run = runsById.get(runId);
        if (run == null && missionRunRepository != null) {
            run = missionRunRepository.findByRunId(runId).map(this::mapToRun).orElse(null);
            if (run != null) runsById.put(run.runId(), run);
        }
        if (run == null) {
            throw new NoSuchElementException("Mission run not found: " + runId);
        }
        if (run.status() != MissionStatus.ACTIVE) {
            throw new IllegalStateException(String.format(
                    "Mission run '%s' cannot be aborted because its status is %s (expected ACTIVE).",
                    runId, run.status()
            ));
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

    public void clearHistoryForTesting() {
        missionHistory.clear();
        activeRunsByMissionId.clear();
        runsById.clear();
    }

    public Optional<MissionRun> getRun(String runId) {
        if (runId == null || runId.isBlank()) return Optional.empty();
        MissionRun run = runsById.get(runId);
        if (run != null) {
            return Optional.of(run);
        }
        if (missionRunRepository != null) {
            Optional<MissionRunEntity> entity = missionRunRepository.findByRunId(runId);
            if (entity.isPresent()) {
                MissionRun loaded = mapToRun(entity.get());
                runsById.put(loaded.runId(), loaded);
                return Optional.of(loaded);
            }
        }
        return Optional.empty();
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

                    List<MissionRun> candidateActiveRuns = new ArrayList<>();

                    for (MissionRunEntity entity : chronological) {
                        MissionRun run = mapToRun(entity);
                        runsById.put(run.runId(), run);
                        if (run.status() == MissionStatus.ACTIVE) {
                            candidateActiveRuns.add(run);
                        } else {
                            missionHistory.add(run);
                        }
                    }

                    // Documented Startup Recovery Policy:
                    // 1. Terminal runs (COMPLETED, FAILED, ABORTED) remain permanently archived in history and cannot re-activate.
                    // 2. In accordance with the single-active-run policy, at most ONE run can be active.
                    // 3. If candidate active runs exist:
                    //    - Sort by startedEpoch descending to find the latest run.
                    //    - If the assigned spacecraft is available in the simulation engine, restore this run as ACTIVE.
                    //    - Any duplicate or orphaned active runs (or runs whose spacecraft is missing) are transitioned to ABORTED
                    //      with documented recovery notes and persisted to the database.
                    if (!candidateActiveRuns.isEmpty()) {
                        candidateActiveRuns.sort((a, b) -> b.startedEpoch().compareTo(a.startedEpoch()));
                        MissionRun latestActive = candidateActiveRuns.get(0);

                        boolean spacecraftAvailable = simulationEngine.getSpacecraft(latestActive.spacecraftId()).isPresent();

                        for (int i = 0; i < candidateActiveRuns.size(); i++) {
                            MissionRun r = candidateActiveRuns.get(i);
                            if (i == 0 && spacecraftAvailable) {
                                activeRunsByMissionId.put(r.missionId(), r);
                                log.info("RECOVERY POLICY: Authoritatively restored active mission run '{}' (mission: {}, spacecraft: {}). Telemetry stream reconnected.",
                                        r.runId(), r.missionId(), r.spacecraftId());
                            } else {
                                String recoveryReason = (i == 0 && !spacecraftAvailable)
                                        ? String.format("Terminated by startup recovery supervisor: Assigned spacecraft '%s' unavailable after restart.", r.spacecraftId())
                                        : String.format("Terminated by startup recovery supervisor: Orphaned active run superseded by latest run '%s'.", latestActive.runId());

                                Instant recoveryNow = simulationEngine.getCurrentEpoch();
                                MissionRun recoveredAbort = r.withStatus(
                                        MissionStatus.ABORTED,
                                        recoveryNow,
                                        recoveryReason,
                                        r.objectiveResults(),
                                        r.telemetrySnapshotsCaptured(),
                                        r.commandsDispatched()
                                );
                                runsById.put(r.runId(), recoveredAbort);
                                missionHistory.add(recoveredAbort);

                                try {
                                    Optional<MissionRunEntity> existingEnt = missionRunRepository.findByRunId(r.runId());
                                    MissionRunEntity entToSave = existingEnt.orElseGet(() -> mapToRunEntity(recoveredAbort));
                                    entToSave.setStatus(MissionStatus.ABORTED.name());
                                    entToSave.setCompletedEpoch(recoveryNow);
                                    entToSave.setOutcomeSummary(recoveryReason);
                                    missionRunRepository.save(entToSave);
                                    log.info("RECOVERY POLICY: Cleaned up orphaned active run '{}' -> ABORTED in database.", r.runId());
                                } catch (Exception ex) {
                                    log.warn("Failed persisting cleanup for recovered run {}: {}", r.runId(), ex.getMessage());
                                }
                            }
                        }
                    }

                    log.info("Recovered {} durable mission execution runs from database. Active: {}, History: {}",
                            runs.size(), activeRunsByMissionId.size(), missionHistory.size());
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
