package org.astra.commands;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable command execution outcome.
 */
public record CommandResult(
        String commandId,
        String spacecraftId,
        CommandType type,
        CommandStatus status,
        String message,
        Instant executionEpoch,
        Map<String, Object> outputData
) {

    public CommandResult {
        Objects.requireNonNull(commandId, "commandId must not be null");
        Objects.requireNonNull(type, "type must not be null");
        Objects.requireNonNull(status, "status must not be null");
        Objects.requireNonNull(message, "message must not be null");
        Objects.requireNonNull(executionEpoch, "executionEpoch must not be null");
        outputData = outputData == null ? Collections.emptyMap() : Collections.unmodifiableMap(outputData);
    }

    public static CommandResult executed(String commandId, String spacecraftId, CommandType type, String message, Instant epoch, Map<String, Object> output) {
        return new CommandResult(commandId, spacecraftId, type, CommandStatus.EXECUTED, message, epoch, output);
    }

    public static CommandResult rejected(String commandId, String spacecraftId, CommandType type, String reason, Instant epoch) {
        return new CommandResult(commandId, spacecraftId, type, CommandStatus.REJECTED, reason, epoch, Collections.emptyMap());
    }

    public static CommandResult failed(String commandId, String spacecraftId, CommandType type, String error, Instant epoch) {
        return new CommandResult(commandId, spacecraftId, type, CommandStatus.FAILED, error, epoch, Collections.emptyMap());
    }
}
