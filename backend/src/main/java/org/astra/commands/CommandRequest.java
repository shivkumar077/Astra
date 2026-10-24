package org.astra.commands;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
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

    public CommandRequest(
            String commandId,
            String clientCommandId,
            String spacecraftId,
            CommandType type,
            Map<String, String> parameters,
            Instant submittedAt
    ) {
        this(
                commandId,
                spacecraftId,
                type,
                withClientKey(parameters, clientCommandId),
                submittedAt
        );
    }

    private static Map<String, String> withClientKey(Map<String, String> params, String clientCommandId) {
        Map<String, String> map = new HashMap<>(params == null ? Collections.emptyMap() : params);
        if (clientCommandId != null && !clientCommandId.isBlank()) {
            map.put("clientCommandId", clientCommandId);
        }
        return map;
    }

    public static CommandRequest of(String spacecraftId, CommandType type, Map<String, String> parameters) {
        return new CommandRequest(UUID.randomUUID().toString(), spacecraftId, type, parameters, Instant.now());
    }
}
