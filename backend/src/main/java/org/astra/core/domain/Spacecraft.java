package org.astra.core.domain;

import org.astra.core.domain.subsystems.EpsSubsystemState;
import org.astra.core.domain.subsystems.PropSubsystemState;
import org.astra.core.domain.subsystems.SpacecraftSubsystems;

import java.util.Objects;

/**
 * Authoritative domain entity representing an individual satellite vehicle in the ASTRA fleet.
 */
public class Spacecraft {

    private final String id;
    private final String callSign;
    private final String name;
    private final String modelType;
    private final double dryMassKg;
    private double propellantMassKg;

    private final String destination;
    private final String destinationGroup;

    private volatile OrbitState currentOrbitState;
    private volatile OperationalMode operationalMode;
    private volatile SpacecraftStatus operationalStatus;
    private volatile double batterySocPercent;
    private volatile double solarArrayWatts;
    private volatile SpacecraftSubsystems subsystems;

    public Spacecraft(
            String id,
            String callSign,
            String name,
            String modelType,
            double dryMassKg,
            double propellantMassKg,
            OrbitState initialOrbitState,
            OperationalMode operationalMode,
            SpacecraftStatus operationalStatus,
            double batterySocPercent,
            double solarArrayWatts
    ) {
        this(
                id, callSign, name, modelType, dryMassKg, propellantMassKg,
                initialOrbitState, operationalMode, operationalStatus,
                batterySocPercent, solarArrayWatts, null, null
        );
    }

    public Spacecraft(
            String id,
            String callSign,
            String name,
            String modelType,
            double dryMassKg,
            double propellantMassKg,
            OrbitState initialOrbitState,
            OperationalMode operationalMode,
            SpacecraftStatus operationalStatus,
            double batterySocPercent,
            double solarArrayWatts,
            String destination,
            String destinationGroup
    ) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.callSign = Objects.requireNonNull(callSign, "callSign must not be null");
        this.name = Objects.requireNonNull(name, "name must not be null");
        this.modelType = Objects.requireNonNull(modelType, "modelType must not be null");

        if (dryMassKg <= 0.0) {
            throw new IllegalArgumentException("Dry mass must be strictly positive, got: " + dryMassKg);
        }
        if (propellantMassKg < 0.0) {
            throw new IllegalArgumentException("Propellant mass cannot be negative, got: " + propellantMassKg);
        }

        this.dryMassKg = dryMassKg;
        this.propellantMassKg = propellantMassKg;
        this.currentOrbitState = Objects.requireNonNull(initialOrbitState, "initialOrbitState must not be null");
        this.operationalMode = Objects.requireNonNull(operationalMode, "operationalMode must not be null");
        this.operationalStatus = Objects.requireNonNull(operationalStatus, "operationalStatus must not be null");
        this.batterySocPercent = Math.clamp(batterySocPercent, 0.0, 100.0);
        this.solarArrayWatts = Math.max(0.0, solarArrayWatts);
        this.destination = (destination != null && !destination.isBlank()) ? destination : inferDestination(id, modelType);
        this.destinationGroup = (destinationGroup != null && !destinationGroup.isBlank()) ? destinationGroup : inferDestinationGroup(this.destination);
        this.subsystems = SpacecraftSubsystems.nominal(this.batterySocPercent, this.solarArrayWatts, this.propellantMassKg);
    }

    public synchronized void updateOrbitState(OrbitState newState) {
        this.currentOrbitState = Objects.requireNonNull(newState, "newState must not be null");
    }

    public synchronized void setOperationalMode(OperationalMode operationalMode) {
        this.operationalMode = Objects.requireNonNull(operationalMode, "operationalMode must not be null");
    }

    public synchronized void setOperationalStatus(SpacecraftStatus operationalStatus) {
        this.operationalStatus = Objects.requireNonNull(operationalStatus, "operationalStatus must not be null");
    }

    public synchronized void updatePowerMetrics(double batterySocPercent, double solarArrayWatts) {
        this.batterySocPercent = Math.clamp(batterySocPercent, 0.0, 100.0);
        this.solarArrayWatts = Math.max(0.0, solarArrayWatts);
        if (this.subsystems != null) {
            EpsSubsystemState currentEps = this.subsystems.eps();
            EpsSubsystemState updatedEps = new EpsSubsystemState(
                    this.batterySocPercent,
                    this.solarArrayWatts,
                    currentEps.batteryVoltageVolts(),
                    currentEps.busLoadWatts(),
                    currentEps.loadSheddingActive(),
                    currentEps.solarDegradationMultiplier(),
                    currentEps.busOverloadActive()
            );
            this.subsystems = new SpacecraftSubsystems(
                    updatedEps,
                    this.subsystems.tcs(),
                    this.subsystems.adcs(),
                    this.subsystems.comms(),
                    this.subsystems.prop(),
                    this.subsystems.obc()
            );
        }
    }

    public synchronized void consumePropellant(double kgConsumed) {
        if (kgConsumed < 0.0) {
            throw new IllegalArgumentException("Propellant consumption cannot be negative: " + kgConsumed);
        }
        this.propellantMassKg = Math.max(0.0, this.propellantMassKg - kgConsumed);
        if (this.subsystems != null) {
            PropSubsystemState currentProp = this.subsystems.prop();
            PropSubsystemState updatedProp = new PropSubsystemState(
                    this.propellantMassKg,
                    currentProp.tankPressureBar(),
                    currentProp.valveHealth(),
                    currentProp.thrustMultiplier(),
                    currentProp.leakActive()
            );
            this.subsystems = new SpacecraftSubsystems(
                    this.subsystems.eps(),
                    this.subsystems.tcs(),
                    this.subsystems.adcs(),
                    this.subsystems.comms(),
                    updatedProp,
                    this.subsystems.obc()
            );
        }
    }

    public synchronized void updateSubsystems(SpacecraftSubsystems subsystems) {
        this.subsystems = Objects.requireNonNull(subsystems, "subsystems must not be null");
        this.batterySocPercent = subsystems.eps().batterySocPercent();
        this.solarArrayWatts = subsystems.eps().solarArrayWatts();
        this.propellantMassKg = subsystems.prop().propellantMassKg();
    }

    public SpacecraftSubsystems getSubsystems() {
        return subsystems;
    }

    public double totalMassKg() {
        return dryMassKg + propellantMassKg;
    }

    public String getId() {
        return id;
    }

    public String getCallSign() {
        return callSign;
    }

    public String getName() {
        return name;
    }

    public String getModelType() {
        return modelType;
    }

    public double getDryMassKg() {
        return dryMassKg;
    }

    public double getPropellantMassKg() {
        return propellantMassKg;
    }

    public OrbitState getCurrentOrbitState() {
        return currentOrbitState;
    }

    public OrbitState getOrbitState() {
        return currentOrbitState;
    }

    public OperationalMode getOperationalMode() {
        return operationalMode;
    }

    public SpacecraftStatus getOperationalStatus() {
        return operationalStatus;
    }

    public double getBatterySocPercent() {
        return batterySocPercent;
    }

    public double getSolarArrayWatts() {
        return solarArrayWatts;
    }

    public double getSolarArrayGenerationWatts() {
        return solarArrayWatts;
    }

    public String getDestination() {
        return destination;
    }

    public String getDestinationGroup() {
        return destinationGroup;
    }

    private static String inferDestination(String id, String modelType) {
        String uId = (id != null) ? id.toUpperCase() : "";
        String mType = (modelType != null) ? modelType.toLowerCase() : "";

        // Earth fleet (including new assets: HELIOS-OBS, MERIDIAN-RELAY, VIGIL-TRACK, STRATUS-MET)
        if (uId.startsWith("HELIOS-OBS")) return "Earth (Sun-Synchronous LEO, 690 km)";
        if (uId.startsWith("MERIDIAN-RELAY")) return "Earth (Medium Earth Orbit, 20,200 km)";
        if (uId.startsWith("VIGIL-TRACK")) return "Earth (Polar LEO Lidar Tracking, 750 km)";
        if (uId.startsWith("STRATUS-MET")) return "Earth (Atmospheric Weather LEO, 550 km)";
        if (uId.startsWith("AURA")) return "Earth (Sun-Synchronous LEO, 702 km)";
        if (uId.startsWith("TERRA")) return "Earth (Low Earth Orbit, 502 km)";
        if (uId.startsWith("SOLIS")) return "Earth (Highly Elliptical Orbit, 36,000 km)";
        if (uId.startsWith("GEO-COM")) return "Earth (Geostationary Equatorial, 35,786 km)";
        if (uId.startsWith("NAV-STAR")) return "Earth (Medium Earth Orbit, 20,200 km)";
        if (uId.startsWith("DEBRIS-TRAC")) return "Earth (Polar LEO Lidar, 770 km)";

        // Lunar fleet (including new assets: SELENE-MAP, POLARIS-LR, LUNA-LINK, ARGUS-LNAV)
        if (uId.startsWith("SELENE-MAP")) return "Low Lunar Orbit (60 km Circular)";
        if (uId.startsWith("POLARIS-LR")) return "Lunar South Pole Orbit (100 km)";
        if (uId.startsWith("LUNA-LINK")) return "Earth-Moon L1 Halo Orbit (58,000 km)";
        if (uId.startsWith("ARGUS-LNAV")) return "Lunar Equatorial Frozen Orbit (120 km)";
        if (uId.startsWith("CHANDRA")) return "Lunar Polar Insertion (100 km orbit)";
        if (uId.startsWith("LUNAR-HALO")) return "Earth-Moon L2 Halo Orbit";
        if (uId.startsWith("SELENA")) return "Low Lunar Orbit (50 km Circular)";
        if (uId.startsWith("ARTEMIS")) return "Near-Rectilinear Halo Orbit (NRHO)";
        if (uId.startsWith("LUNAR-RECON")) return "Lunar Equatorial Frozen Orbit";
        if (uId.startsWith("MOON-NAV")) return "Cislunar Resonant Orbit (12-hour)";

        // Mars fleet (including new assets: AREION-RECON, AETHER-MET, DEIMOS-RELAY, BOREALIS-MAP)
        if (uId.startsWith("AREION-RECON")) return "Mars Sun-Synchronous Polar Orbit (320 km)";
        if (uId.startsWith("AETHER-MET")) return "Low Mars Aeronomy Orbit (280 km)";
        if (uId.startsWith("DEIMOS-RELAY")) return "Areostationary Relay Orbit (17,032 km)";
        if (uId.startsWith("BOREALIS-MAP")) return "Mars Polar Water-Ice Orbit (450 km)";
        if (uId.startsWith("ARES")) return "Mars (Areostationary & Polar Elliptical)";
        if (uId.startsWith("MARS-RELAY")) return "Areostationary Equatorial Orbit";
        if (uId.startsWith("PHOBOS")) return "Phobos Co-orbital Insertion (200 km)";
        if (uId.startsWith("DEIMOS")) return "Deimos Reconnaissance Orbit";
        if (uId.startsWith("MARS-ATMOS")) return "Mars Polar Aeronomy Orbit";
        if (uId.startsWith("AERO-MAP")) return "Mars Sun-Synchronous Polar LMO";

        // Outer Planets fleet (including new assets: JOVE-SCOPE, ION-GUARD, TITAN-ORBIT, RHEA-SURVEY)
        if (uId.startsWith("JOVE-SCOPE")) return "Jupiter Eccentric System Orbit (500,000 km)";
        if (uId.startsWith("ION-GUARD")) return "Inner Jovian Radiation Belt (350,000 km)";
        if (uId.startsWith("TITAN-ORBIT")) return "Titan Circular Polar Orbit (800 km)";
        if (uId.startsWith("RHEA-SURVEY")) return "Saturnian Equatorial Moon Orbit (527,000 km)";
        if (uId.startsWith("JOVIAN")) return "Jupiter (Radiation Belt Orbit)";
        if (uId.startsWith("EUROPA")) return "Europa Surface Reconnaissance (100 km orbit)";
        if (uId.startsWith("CALLISTO")) return "Callisto Polar Orbit";
        if (uId.startsWith("CHRONOS")) return "Saturn (Equatorial Ring Plane)";
        if (uId.startsWith("TITAN")) return "Titan Polar Circular Orbit";

        // Solar fleet (including new assets: HELIO-WATCH, CORONA-TRACE, STORM-SENTINEL, FLARE-ALERT)
        if (uId.startsWith("HELIO-WATCH")) return "Heliocentric Corona Monitor (0.4 AU)";
        if (uId.startsWith("CORONA-TRACE")) return "Solar Perihelion Skim Orbit (0.08 AU)";
        if (uId.startsWith("STORM-SENTINEL")) return "Sun-Earth L1 Halo Warning Orbit (1,500,000 km)";
        if (uId.startsWith("FLARE-ALERT")) return "Heliocentric Drift Flare Watch (0.7 AU)";
        if (uId.startsWith("HELIOS")) return "Heliospheric Orbit (0.3 AU perihelion)";
        if (uId.startsWith("SOLAR-STORM")) return "Sun-Earth L1 Lagrange Orbit";

        // Deep Space fleet (including new assets: ODYSSEY-NAV, VOYAGER-RELAY, KEPLER-DRIFT, FARPOINT-PROBE)
        if (uId.startsWith("ODYSSEY-NAV")) return "Interplanetary Cruise Trajectory (2.5 AU)";
        if (uId.startsWith("VOYAGER-RELAY")) return "Interplanetary Deep-Space Comms Bridge (4.2 AU)";
        if (uId.startsWith("KEPLER-DRIFT")) return "Heliocentric Navigation Calibration Drift (1.4 AU)";
        if (uId.startsWith("FARPOINT-PROBE")) return "Deep-Space Heliopause Cruise (85 AU)";
        if (uId.startsWith("ASTEROID")) return "Main Asteroid Belt (2.7 AU)";
        if (uId.startsWith("DEEP-NAV")) return "Interplanetary Transfer Trajectory";
        if (uId.startsWith("VOYAGER")) return "Interstellar Heliopause Boundary";

        if (mType.contains("mars") || mType.contains("areo")) return "Mars Orbit";
        if (mType.contains("lunar") || mType.contains("moon") || mType.contains("seleno")) return "Lunar Orbit";
        if (mType.contains("jupiter") || mType.contains("saturn")) return "Outer Solar System";
        if (mType.contains("deep-space") || mType.contains("interplanetary") || mType.contains("interstellar") || mType.contains("asteroid")) return "Deep Space";
        if (mType.contains("solar") || mType.contains("corona")) return "Heliocentric Orbit";

        return "Earth Orbit (Standard)";
    }

    private static String inferDestinationGroup(String destination) {
        if (destination == null) return "Earth";
        String d = destination.toLowerCase();
        if (d.contains("deep space") || d.contains("interplanetary") || d.contains("interstellar") || d.contains("heliopause") || d.contains("asteroid") || d.contains("kuiper")) return "Deep Space";
        if (d.contains("lunar") || d.contains("moon") || d.contains("selena") || d.contains("selene") || d.contains("cislunar") || d.contains("artemis")) return "Lunar";
        if (d.contains("mars") || d.contains("phobos") || d.contains("deimos") || d.contains("areo")) return "Mars";
        if (d.contains("jupiter") || d.contains("europa") || d.contains("callisto") || d.contains("saturn") || d.contains("titan") || d.contains("rhea") || d.contains("outer")) return "Outer Planets";
        if (d.contains("helios") || d.contains("corona") || d.contains("flare") || d.contains("sun-earth l1") || (d.contains("solar") && !d.contains("earth"))) return "Solar";
        return "Earth";
    }
}
