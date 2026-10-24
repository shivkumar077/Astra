package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing a simulated subsystem fault, its lifecycle transitions, and recovery history.
 */
@Entity
@Table(name = "fault_records")
public class FaultRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fault_id", length = 64, nullable = false, unique = true)
    private String faultId;

    @Column(name = "spacecraft_id", length = 64, nullable = false)
    private String spacecraftId;

    @Column(name = "subsystem", length = 32, nullable = false)
    private String subsystem;

    @Column(name = "scenario_code", length = 64, nullable = false)
    private String scenarioCode;

    @Column(name = "severity", length = 32, nullable = false)
    private String severity;

    @Column(name = "lifecycle_state", length = 32, nullable = false)
    private String lifecycleState;

    @Column(name = "injected_epoch", nullable = false)
    private Instant injectedEpoch;

    @Column(name = "detected_epoch")
    private Instant detectedEpoch;

    @Column(name = "recovered_epoch")
    private Instant recoveredEpoch;

    @Column(name = "cleared_epoch")
    private Instant clearedEpoch;

    @Column(name = "operator_username", length = 128)
    private String operatorUsername;

    @Column(name = "recovery_action_required", length = 64)
    private String recoveryActionRequired;

    @Column(name = "auto_recoverable", nullable = false)
    private boolean autoRecoverable;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "operator_explanation", columnDefinition = "TEXT")
    private String operatorExplanation;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public FaultRecordEntity() {
    }

    public FaultRecordEntity(
            String faultId,
            String spacecraftId,
            String subsystem,
            String scenarioCode,
            String severity,
            String lifecycleState,
            Instant injectedEpoch,
            Instant detectedEpoch,
            Instant recoveredEpoch,
            Instant clearedEpoch,
            String operatorUsername,
            String recoveryActionRequired,
            boolean autoRecoverable,
            String description,
            String operatorExplanation,
            String parametersJson
    ) {
        this.faultId = faultId;
        this.spacecraftId = spacecraftId;
        this.subsystem = subsystem;
        this.scenarioCode = scenarioCode;
        this.severity = severity;
        this.lifecycleState = lifecycleState;
        this.injectedEpoch = injectedEpoch;
        this.detectedEpoch = detectedEpoch;
        this.recoveredEpoch = recoveredEpoch;
        this.clearedEpoch = clearedEpoch;
        this.operatorUsername = operatorUsername;
        this.recoveryActionRequired = recoveryActionRequired;
        this.autoRecoverable = autoRecoverable;
        this.description = description;
        this.operatorExplanation = operatorExplanation;
        this.parametersJson = parametersJson;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFaultId() { return faultId; }
    public void setFaultId(String faultId) { this.faultId = faultId; }

    public String getSpacecraftId() { return spacecraftId; }
    public void setSpacecraftId(String spacecraftId) { this.spacecraftId = spacecraftId; }

    public String getSubsystem() { return subsystem; }
    public void setSubsystem(String subsystem) { this.subsystem = subsystem; }

    public String getScenarioCode() { return scenarioCode; }
    public void setScenarioCode(String scenarioCode) { this.scenarioCode = scenarioCode; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getLifecycleState() { return lifecycleState; }
    public void setLifecycleState(String lifecycleState) { this.lifecycleState = lifecycleState; }

    public Instant getInjectedEpoch() { return injectedEpoch; }
    public void setInjectedEpoch(Instant injectedEpoch) { this.injectedEpoch = injectedEpoch; }

    public Instant getDetectedEpoch() { return detectedEpoch; }
    public void setDetectedEpoch(Instant detectedEpoch) { this.detectedEpoch = detectedEpoch; }

    public Instant getRecoveredEpoch() { return recoveredEpoch; }
    public void setRecoveredEpoch(Instant recoveredEpoch) { this.recoveredEpoch = recoveredEpoch; }

    public Instant getClearedEpoch() { return clearedEpoch; }
    public void setClearedEpoch(Instant clearedEpoch) { this.clearedEpoch = clearedEpoch; }

    public String getOperatorUsername() { return operatorUsername; }
    public void setOperatorUsername(String operatorUsername) { this.operatorUsername = operatorUsername; }

    public String getRecoveryActionRequired() { return recoveryActionRequired; }
    public void setRecoveryActionRequired(String recoveryActionRequired) { this.recoveryActionRequired = recoveryActionRequired; }

    public boolean isAutoRecoverable() { return autoRecoverable; }
    public void setAutoRecoverable(boolean autoRecoverable) { this.autoRecoverable = autoRecoverable; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getOperatorExplanation() { return operatorExplanation; }
    public void setOperatorExplanation(String operatorExplanation) { this.operatorExplanation = operatorExplanation; }

    public String getParametersJson() { return parametersJson; }
    public void setParametersJson(String parametersJson) { this.parametersJson = parametersJson; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
