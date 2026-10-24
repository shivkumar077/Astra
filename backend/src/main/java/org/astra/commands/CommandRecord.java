package org.astra.commands;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Auditable record of a telecommand submission, execution, and outcome in the simulation ledger.
 */
public record CommandRecord(
        String commandId,
        String clientCommandId,
        String spacecraftId,
        CommandType type,
        Map<String, String> parameters,
        CommandStatus status,
        Instant submittedAt,
        Instant executionEpoch,
        String message,
        Map<String, Object> outputData,
        boolean idempotentReplay
) {

    public CommandRecord {
        Objects.requireNonNull(commandId, "commandId must not be null");
        Objects.requireNonNull(type, "type must not be null");
        Objects.requireNonNull(status, "status must not be null");
        Objects.requireNonNull(submittedAt, "submittedAt must not be null");
        Objects.requireNonNull(executionEpoch, "executionEpoch must not be null");
        Objects.requireNonNull(message, "message must not be null");
        parameters = parameters == null ? Collections.emptyMap() : Collections.unmodifiableMap(parameters);
        outputData = outputData == null ? Collections.emptyMap() : Collections.unmodifiableMap(outputData);
    }

    public CommandRecord(
            String commandId,
            String clientCommandId,
            String spacecraftId,
            CommandType type,
            Map<String, String> parameters,
            CommandStatus status,
            String message,
            Instant executionEpoch,
            Instant submittedAt
    ) {
        this(commandId, clientCommandId, spacecraftId, type, parameters, status, submittedAt != null ? submittedAt : Instant.now(), executionEpoch != null ? executionEpoch : Instant.now(), message, Collections.emptyMap(), false);
    }

    public static CommandRecord from(CommandRequest request, CommandResult result) {
        String clientKey = request.parameters().get("clientCommandId");
        if (clientKey == null || clientKey.isBlank()) {
            clientKey = request.commandId();
        }
        return new CommandRecord(
                result.commandId(),
                clientKey,
                result.spacecraftId(),
                result.type(),
                request.parameters(),
                result.status(),
                request.submittedAt(),
                result.executionEpoch(),
                result.message(),
                result.outputData(),
                result.idempotentReplay()
        );
    }
}
