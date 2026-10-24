package org.astra.anomalies.dto;

import org.astra.anomalies.FaultScenarioCode;
import org.astra.anomalies.FaultSeverity;
import org.astra.anomalies.RecoveryActionType;
import org.astra.anomalies.SubsystemType;

import java.util.Map;

/**
 * Metadata descriptor describing a supported fault scenario in the Failure Lab catalog.
 */
public record FaultScenarioMetadata(
        FaultScenarioCode scenarioCode,
        SubsystemType subsystem,
        String title,
        String description,
        FaultSeverity defaultSeverity,
        RecoveryActionType expectedRecoveryAction,
        Map<String, Object> supportedParameters
) {}
