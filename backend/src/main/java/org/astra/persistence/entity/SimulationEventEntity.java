package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing a monotonically sequenced, auditable operational simulation event.
 */
@Entity
@Table(name = "simulation_event_records")
public class SimulationEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", length = 64, nullable = false, unique = true)
    private String eventId;

    @Column(name = "sequence_number", nullable = false)
    private long sequenceNumber;

    @Column(name = "event_type", length = 64, nullable = false)
    private String eventType;

    @Column(name = "simulation_epoch", nullable = false)
    private Instant simulationEpoch;

    @Column(name = "spacecraft_id", length = 64)
    private String spacecraftId;

    @Column(name = "summary", columnDefinition = "TEXT", nullable = false)
    private String summary;

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public SimulationEventEntity() {
    }

    public SimulationEventEntity(
            String eventId,
            long sequenceNumber,
            String eventType,
            Instant simulationEpoch,
            String spacecraftId,
            String summary,
            String detailsJson
    ) {
        this.eventId = eventId;
        this.sequenceNumber = sequenceNumber;
        this.eventType = eventType;
        this.simulationEpoch = simulationEpoch;
        this.spacecraftId = spacecraftId;
        this.summary = summary;
        this.detailsJson = detailsJson;
        this.createdAt = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public long getSequenceNumber() { return sequenceNumber; }
    public void setSequenceNumber(long sequenceNumber) { this.sequenceNumber = sequenceNumber; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public Instant getSimulationEpoch() { return simulationEpoch; }
    public void setSimulationEpoch(Instant simulationEpoch) { this.simulationEpoch = simulationEpoch; }

    public String getSpacecraftId() { return spacecraftId; }
    public void setSpacecraftId(String spacecraftId) { this.spacecraftId = spacecraftId; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
