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
}
