package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing a sampled historical telemetry snapshot.
 */
@Entity
@Table(name = "telemetry_snapshots")
public class TelemetrySnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spacecraft_id", length = 64, nullable = false)
    private String spacecraftId;

    @Column(name = "simulation_epoch", nullable = false)
    private Instant simulationEpoch;

    @Column(name = "position_x", nullable = false)
    private double positionX;

    @Column(name = "position_y", nullable = false)
    private double positionY;

    @Column(name = "position_z", nullable = false)
    private double positionZ;

    @Column(name = "velocity_x", nullable = false)
    private double velocityX;

    @Column(name = "velocity_y", nullable = false)
    private double velocityY;

    @Column(name = "velocity_z", nullable = false)
    private double velocityZ;

    @Column(name = "altitude_km", nullable = false)
    private double altitudeKm;

    @Column(name = "speed_km_s", nullable = false)
    private double speedKmS;

    @Column(name = "in_eclipse", nullable = false)
    private boolean inEclipse;

    @Column(name = "battery_soc_percent", nullable = false)
    private double batterySocPercent;

    @Column(name = "solar_array_watts", nullable = false)
    private double solarArrayWatts;

    @Column(name = "operational_mode", length = 64, nullable = false)
    private String operationalMode;

    @Column(name = "operational_status", length = 64, nullable = false)
    private String operationalStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public TelemetrySnapshotEntity() {
    }

    public TelemetrySnapshotEntity(
            String spacecraftId,
            Instant simulationEpoch,
            double positionX,
            double positionY,
            double positionZ,
            double velocityX,
            double velocityY,
            double velocityZ,
            double altitudeKm,
            double speedKmS,
            boolean inEclipse,
            double batterySocPercent,
            double solarArrayWatts,
            String operationalMode,
            String operationalStatus
    ) {
        this.spacecraftId = spacecraftId;
        this.simulationEpoch = simulationEpoch;
        this.positionX = positionX;
        this.positionY = positionY;
        this.positionZ = positionZ;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.velocityZ = velocityZ;
        this.altitudeKm = altitudeKm;
        this.speedKmS = speedKmS;
        this.inEclipse = inEclipse;
        this.batterySocPercent = batterySocPercent;
        this.solarArrayWatts = solarArrayWatts;
        this.operationalMode = operationalMode;
        this.operationalStatus = operationalStatus;
        this.createdAt = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSpacecraftId() { return spacecraftId; }
    public void setSpacecraftId(String spacecraftId) { this.spacecraftId = spacecraftId; }

    public Instant getSimulationEpoch() { return simulationEpoch; }
    public void setSimulationEpoch(Instant simulationEpoch) { this.simulationEpoch = simulationEpoch; }

    public double getPositionX() { return positionX; }
    public void setPositionX(double positionX) { this.positionX = positionX; }

    public double getPositionY() { return positionY; }
    public void setPositionY(double positionY) { this.positionY = positionY; }

    public double getPositionZ() { return positionZ; }
    public void setPositionZ(double positionZ) { this.positionZ = positionZ; }

    public double getVelocityX() { return velocityX; }
    public void setVelocityX(double velocityX) { this.velocityX = velocityX; }

    public double getVelocityY() { return velocityY; }
    public void setVelocityY(double velocityY) { this.velocityY = velocityY; }

    public double getVelocityZ() { return velocityZ; }
    public void setVelocityZ(double velocityZ) { this.velocityZ = velocityZ; }

    public double getAltitudeKm() { return altitudeKm; }
    public void setAltitudeKm(double altitudeKm) { this.altitudeKm = altitudeKm; }

    public double getSpeedKmS() { return speedKmS; }
    public void setSpeedKmS(double speedKmS) { this.speedKmS = speedKmS; }

    public boolean isInEclipse() { return inEclipse; }
    public void setInEclipse(boolean inEclipse) { this.inEclipse = inEclipse; }

    public double getBatterySocPercent() { return batterySocPercent; }
    public void setBatterySocPercent(double batterySocPercent) { this.batterySocPercent = batterySocPercent; }

    public double getSolarArrayWatts() { return solarArrayWatts; }
    public void setSolarArrayWatts(double solarArrayWatts) { this.solarArrayWatts = solarArrayWatts; }

    public String getOperationalMode() { return operationalMode; }
    public void setOperationalMode(String operationalMode) { this.operationalMode = operationalMode; }

    public String getOperationalStatus() { return operationalStatus; }
    public void setOperationalStatus(String operationalStatus) { this.operationalStatus = operationalStatus; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
