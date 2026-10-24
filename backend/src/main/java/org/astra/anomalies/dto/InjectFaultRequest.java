package org.astra.anomalies.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.astra.anomalies.FaultScenarioCode;
import org.astra.anomalies.FaultSeverity;

import java.util.Map;

/**
 * REST request payload for injecting a subsystem fault into the Failure Lab.
 */
public record InjectFaultRequest(
        @NotBlank(message = "spacecraftId must not be blank")
        String spacecraftId,

        @NotNull(message = "scenarioCode must not be null")
        FaultScenarioCode scenarioCode,

        FaultSeverity severity,

        Map<String, Object> parameters,

        String description
) {}
