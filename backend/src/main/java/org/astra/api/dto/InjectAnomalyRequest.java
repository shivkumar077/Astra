package org.astra.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.astra.anomalies.SubsystemType;

/**
 * Request payload for injecting a subsystem anomaly extension point.
 */
public record InjectAnomalyRequest(
        @NotBlank(message = "spacecraftId must not be blank")
        String spacecraftId,
        @NotNull(message = "subsystem must not be null")
        SubsystemType subsystem,
        @NotBlank(message = "anomalyCode must not be blank")
        String anomalyCode,
        double severityFactor,
        boolean blocksCommands,
        @NotBlank(message = "description must not be blank")
        String description
) {

    public InjectAnomalyRequest(
            String spacecraftId,
            SubsystemType subsystem,
            String description,
            double severityFactor,
            boolean blocksCommands
    ) {
        this(spacecraftId, subsystem, subsystem != null ? subsystem.name() + "_FAULT" : "GENERIC_FAULT", severityFactor, blocksCommands, description);
    }
}
