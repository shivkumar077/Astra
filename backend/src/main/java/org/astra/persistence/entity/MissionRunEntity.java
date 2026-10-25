package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing a durable mission run record and outcome audit.
 */
@Entity
@Table(name = "mission_runs")
public class MissionRunEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", length = 64, nullable = false, unique = true)
    private String runId;

    @Column(name = "mission_id", length = 64, nullable = false)
    private String missionId;

    @Column(name = "spacecraft_id", length = 64, nullable = false)
    private String spacecraftId;

    @Column(name = "destination", length = 255)
    private String destination;

    @Column(name = "destination_group", length = 64)
    private String destinationGroup;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @Column(name = "started_epoch", nullable = false)
    private Instant startedEpoch;

    @Column(name = "completed_epoch")
    private Instant completedEpoch;

    @Column(name = "telemetry_snapshots_captured", nullable = false)
    private int telemetrySnapshotsCaptured;

    @Column(name = "commands_dispatched", nullable = false)
    private int commandsDispatched;

    @Column(name = "outcome_summary", columnDefinition = "TEXT")
    private String outcomeSummary;

    @Column(name = "objective_results_json", columnDefinition = "TEXT")
    private String objectiveResultsJson;

    @Column(name = "operator_username", length = 128)
    private String operatorUsername;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public MissionRunEntity() {
    }

    public MissionRunEntity(
            String runId,
            String missionId,
            String spacecraftId,
            String destination,
            String destinationGroup,
            String status,
            Instant startedEpoch,
            Instant completedEpoch,
            int telemetrySnapshotsCaptured,
            int commandsDispatched,
            String outcomeSummary,
            String objectiveResultsJson,
            String operatorUsername
    ) {
        this.runId = runId;
        this.missionId = missionId;
        this.spacecraftId = spacecraftId;
        this.destination = destination;
        this.destinationGroup = destinationGroup;
        this.status = status;
        this.startedEpoch = startedEpoch;
        this.completedEpoch = completedEpoch;
        this.telemetrySnapshotsCaptured = telemetrySnapshotsCaptured;
        this.commandsDispatched = commandsDispatched;
        this.outcomeSummary = outcomeSummary;
        this.objectiveResultsJson = objectiveResultsJson;
        this.operatorUsername = operatorUsername;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public String getMissionId() {
        return missionId;
    }

    public void setMissionId(String missionId) {
        this.missionId = missionId;
    }

    public String getSpacecraftId() {
        return spacecraftId;
    }

    public void setSpacecraftId(String spacecraftId) {
        this.spacecraftId = spacecraftId;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getDestinationGroup() {
        return destinationGroup;
    }

    public void setDestinationGroup(String destinationGroup) {
        this.destinationGroup = destinationGroup;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getStartedEpoch() {
        return startedEpoch;
    }

    public void setStartedEpoch(Instant startedEpoch) {
        this.startedEpoch = startedEpoch;
    }

    public Instant getCompletedEpoch() {
        return completedEpoch;
    }

    public void setCompletedEpoch(Instant completedEpoch) {
        this.completedEpoch = completedEpoch;
    }

    public int getTelemetrySnapshotsCaptured() {
        return telemetrySnapshotsCaptured;
    }

    public void setTelemetrySnapshotsCaptured(int telemetrySnapshotsCaptured) {
        this.telemetrySnapshotsCaptured = telemetrySnapshotsCaptured;
    }

    public int getCommandsDispatched() {
        return commandsDispatched;
    }

    public void setCommandsDispatched(int commandsDispatched) {
        this.commandsDispatched = commandsDispatched;
    }

    public String getOutcomeSummary() {
        return outcomeSummary;
    }

    public void setOutcomeSummary(String outcomeSummary) {
        this.outcomeSummary = outcomeSummary;
    }

    public String getObjectiveResultsJson() {
        return objectiveResultsJson;
    }

    public void setObjectiveResultsJson(String objectiveResultsJson) {
        this.objectiveResultsJson = objectiveResultsJson;
    }

    public String getOperatorUsername() {
        return operatorUsername;
    }

    public void setOperatorUsername(String operatorUsername) {
        this.operatorUsername = operatorUsername;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
