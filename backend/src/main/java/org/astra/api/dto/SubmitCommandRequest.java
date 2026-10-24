package org.astra.api.dto;

import jakarta.validation.constraints.NotNull;
import org.astra.commands.CommandType;

import java.util.Map;

public record SubmitCommandRequest(
        @NotNull(message = "type must not be null")
        CommandType type,
        Map<String, String> parameters
) {}
