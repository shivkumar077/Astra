package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing a spacecraft catalog record and baseline configuration.
 */
@Entity
@Table(name = "spacecraft_records")
public class SpacecraftRecordEntity {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "call_sign", length = 64, nullable = false)
    private String callSign;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "model_type", length = 128, nullable = false)
    private String modelType;

    @Column(name = "dry_mass_kg", nullable = false)
    private double dryMassKg;

    @Column(name = "propellant_mass_kg", nullable = false)
    private double propellantMassKg;

    @Column(name = "operational_mode", length = 64, nullable = false)
    private String operationalMode;

    @Column(name = "operational_status", length = 64, nullable = false)
    private String operationalStatus;

    @Column(name = "battery_soc_percent", nullable = false)
    private double batterySocPercent;

    @Column(name = "solar_array_watts", nullable = false)
    private double solarArrayWatts;

    @Column(name = "semi_major_axis_km", nullable = false)
    private double semiMajorAxisKm;

    @Column(name = "eccentricity", nullable = false)
    private double eccentricity;

    @Column(name = "inclination_deg", nullable = false)
    private double inclinationDeg;

    @Column(name = "raan_deg", nullable = false)
    private double raanDeg;

    @Column(name = "arg_of_perigee_deg", nullable = false)
    private double argOfPerigeeDeg;

    @Column(name = "true_anomaly_deg", nullable = false)
    private double trueAnomalyDeg;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public SpacecraftRecordEntity() {
    }

    public SpacecraftRecordEntity(
            String id,
            String callSign,
            String name,
            String modelType,
            double dryMassKg,
            double propellantMassKg,
            String operationalMode,
            String operationalStatus,
            double batterySocPercent,
            double solarArrayWatts,
            double semiMajorAxisKm,
            double eccentricity,
            double inclinationDeg,
            double raanDeg,
            double argOfPerigeeDeg,
            double trueAnomalyDeg
    ) {
        this.id = id;
        this.callSign = callSign;
        this.name = name;
        this.modelType = modelType;
        this.dryMassKg = dryMassKg;
        this.propellantMassKg = propellantMassKg;
        this.operationalMode = operationalMode;
        this.operationalStatus = operationalStatus;
        this.batterySocPercent = batterySocPercent;
        this.solarArrayWatts = solarArrayWatts;
        this.semiMajorAxisKm = semiMajorAxisKm;
        this.eccentricity = eccentricity;
        this.inclinationDeg = inclinationDeg;
        this.raanDeg = raanDeg;
        this.argOfPerigeeDeg = argOfPerigeeDeg;
        this.trueAnomalyDeg = trueAnomalyDeg;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCallSign() { return callSign; }
    public void setCallSign(String callSign) { this.callSign = callSign; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getModelType() { return modelType; }
    public void setModelType(String modelType) { this.modelType = modelType; }

    public double getDryMassKg() { return dryMassKg; }
    public void setDryMassKg(double dryMassKg) { this.dryMassKg = dryMassKg; }

    public double getPropellantMassKg() { return propellantMassKg; }
    public void setPropellantMassKg(double propellantMassKg) { this.propellantMassKg = propellantMassKg; }

    public String getOperationalMode() { return operationalMode; }
    public void setOperationalMode(String operationalMode) { this.operationalMode = operationalMode; }

    public String getOperationalStatus() { return operationalStatus; }
    public void setOperationalStatus(String operationalStatus) { this.operationalStatus = operationalStatus; }

    public double getBatterySocPercent() { return batterySocPercent; }
    public void setBatterySocPercent(double batterySocPercent) { this.batterySocPercent = batterySocPercent; }

    public double getSolarArrayWatts() { return solarArrayWatts; }
    public void setSolarArrayWatts(double solarArrayWatts) { this.solarArrayWatts = solarArrayWatts; }

    public double getSemiMajorAxisKm() { return semiMajorAxisKm; }
    public void setSemiMajorAxisKm(double semiMajorAxisKm) { this.semiMajorAxisKm = semiMajorAxisKm; }

    public double getEccentricity() { return eccentricity; }
    public void setEccentricity(double eccentricity) { this.eccentricity = eccentricity; }

    public double getInclinationDeg() { return inclinationDeg; }
    public void setInclinationDeg(double inclinationDeg) { this.inclinationDeg = inclinationDeg; }

    public double getRaanDeg() { return raanDeg; }
    public void setRaanDeg(double raanDeg) { this.raanDeg = raanDeg; }

    public double getArgOfPerigeeDeg() { return argOfPerigeeDeg; }
    public void setArgOfPerigeeDeg(double argOfPerigeeDeg) { this.argOfPerigeeDeg = argOfPerigeeDeg; }

    public double getTrueAnomalyDeg() { return trueAnomalyDeg; }
    public void setTrueAnomalyDeg(double trueAnomalyDeg) { this.trueAnomalyDeg = trueAnomalyDeg; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
