package org.astra.api.dto;

import jakarta.validation.constraints.NotNull;
import org.astra.commands.CommandType;

import java.util.Collections;
import java.util.Map;

/**
 * Request payload for telecommand submission.
 */
public record SubmitCommandRequest(
        @NotNull(message = "type must not be null")
        CommandType type,
        String spacecraftId,
        String clientCommandId,
        Map<String, String> parameters
) {

    public SubmitCommandRequest(CommandType type, Map<String, String> parameters) {
        this(type, null, null, parameters);
    }

    public SubmitCommandRequest(CommandType type, Map<String, String> parameters, String clientCommandId) {
        this(type, null, clientCommandId, parameters);
    }

    public SubmitCommandRequest {
        parameters = parameters == null ? Collections.emptyMap() : Collections.unmodifiableMap(parameters);
    }
}
