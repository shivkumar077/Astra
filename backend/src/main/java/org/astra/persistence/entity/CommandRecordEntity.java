package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing an auditable command submission, execution, and idempotency outcome.
 */
@Entity
@Table(name = "command_records")
public class CommandRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "command_id", length = 64, nullable = false, unique = true)
    private String commandId;

    @Column(name = "client_command_id", length = 128)
    private String clientCommandId;

    @Column(name = "spacecraft_id", length = 64, nullable = false)
    private String spacecraftId;

    @Column(name = "command_type", length = 64, nullable = false)
    private String commandType;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "execution_epoch", nullable = false)
    private Instant executionEpoch;

    @Column(name = "operator_username", length = 128)
    private String operatorUsername;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJson;

    @Column(name = "output_data_json", columnDefinition = "TEXT")
    private String outputDataJson;

    @Column(name = "idempotent_replay", nullable = false)
    private boolean idempotentReplay;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public CommandRecordEntity() {
    }

    public CommandRecordEntity(
            String commandId,
            String clientCommandId,
            String spacecraftId,
            String commandType,
            String status,
            Instant submittedAt,
            Instant executionEpoch,
            String operatorUsername,
            String message,
            String parametersJson,
            String outputDataJson,
            boolean idempotentReplay
    ) {
        this.commandId = commandId;
        this.clientCommandId = clientCommandId;
        this.spacecraftId = spacecraftId;
        this.commandType = commandType;
        this.status = status;
        this.submittedAt = submittedAt;
        this.executionEpoch = executionEpoch;
        this.operatorUsername = operatorUsername;
        this.message = message;
        this.parametersJson = parametersJson;
        this.outputDataJson = outputDataJson;
        this.idempotentReplay = idempotentReplay;
        this.createdAt = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCommandId() { return commandId; }
    public void setCommandId(String commandId) { this.commandId = commandId; }

    public String getClientCommandId() { return clientCommandId; }
    public void setClientCommandId(String clientCommandId) { this.clientCommandId = clientCommandId; }

    public String getSpacecraftId() { return spacecraftId; }
    public void setSpacecraftId(String spacecraftId) { this.spacecraftId = spacecraftId; }

    public String getCommandType() { return commandType; }
    public void setCommandType(String commandType) { this.commandType = commandType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public Instant getExecutionEpoch() { return executionEpoch; }
    public void setExecutionEpoch(Instant executionEpoch) { this.executionEpoch = executionEpoch; }

    public String getOperatorUsername() { return operatorUsername; }
    public void setOperatorUsername(String operatorUsername) { this.operatorUsername = operatorUsername; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getParametersJson() { return parametersJson; }
    public void setParametersJson(String parametersJson) { this.parametersJson = parametersJson; }

    public String getOutputDataJson() { return outputDataJson; }
    public void setOutputDataJson(String outputDataJson) { this.outputDataJson = outputDataJson; }

    public boolean isIdempotentReplay() { return idempotentReplay; }
    public void setIdempotentReplay(boolean idempotentReplay) { this.idempotentReplay = idempotentReplay; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
