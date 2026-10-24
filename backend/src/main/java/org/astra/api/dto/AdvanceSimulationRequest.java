package org.astra.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AdvanceSimulationRequest(
        @NotNull(message = "durationSeconds cannot be null")
        @Positive(message = "durationSeconds must be strictly positive")
        Double durationSeconds
) {}
