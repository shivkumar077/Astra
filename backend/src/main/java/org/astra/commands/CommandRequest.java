package org.astra.commands;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable command submission request.
 */
public record CommandRequest(
        String commandId,
        String spacecraftId,
        CommandType type,
        Map<String, String> parameters,
        Instant submittedAt
) {

    public CommandRequest {
        commandId = (commandId == null || commandId.isBlank()) ? UUID.randomUUID().toString() : commandId;
        Objects.requireNonNull(type, "type must not be null");
        parameters = parameters == null ? Collections.emptyMap() : Collections.unmodifiableMap(parameters);
        submittedAt = submittedAt == null ? Instant.now() : submittedAt;
    }

    public static CommandRequest of(String spacecraftId, CommandType type, Map<String, String> parameters) {
        return new CommandRequest(UUID.randomUUID().toString(), spacecraftId, type, parameters, Instant.now());
    }
}
