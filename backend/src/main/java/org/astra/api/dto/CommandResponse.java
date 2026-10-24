package org.astra.api.dto;

import org.astra.commands.CommandResult;
import org.astra.commands.CommandStatus;
import org.astra.commands.CommandType;

import java.time.Instant;
import java.util.Map;

public record CommandResponse(
        String commandId,
        String spacecraftId,
        CommandType type,
        CommandStatus status,
        String message,
        Instant executionEpoch,
        Map<String, Object> outputData
) {

    public static CommandResponse fromResult(CommandResult result) {
        return new CommandResponse(
                result.commandId(),
                result.spacecraftId(),
                result.type(),
                result.status(),
                result.message(),
                result.executionEpoch(),
                result.outputData()
        );
    }
}
