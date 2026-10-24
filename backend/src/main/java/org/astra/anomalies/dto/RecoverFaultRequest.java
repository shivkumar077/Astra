package org.astra.anomalies.dto;

import jakarta.validation.constraints.NotNull;
import org.astra.anomalies.RecoveryActionType;

/**
 * REST request payload for commanding a validated recovery procedure on a fault.
 */
public record RecoverFaultRequest(
        @NotNull(message = "recoveryAction must not be null")
        RecoveryActionType recoveryAction,

        String operatorNote
) {}
