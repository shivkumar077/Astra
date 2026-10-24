package org.astra.anomalies;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable domain entity representing a simulated subsystem fault in the Failure Lab.
 */
public record FaultRecord(
        String faultId,
        String spacecraftId,
        SubsystemType subsystem,
        FaultScenarioCode scenarioCode,
        FaultSeverity severity,
        FaultLifecycleState lifecycleState,
        Instant injectedEpoch,
        Instant detectedEpoch,
        Instant recoveredEpoch,
        Instant clearedEpoch,
        Map<String, Object> parameters,
        String description,
        String operatorExplanation,
        RecoveryActionType recoveryActionRequired,
        boolean autoRecoverable,
        String operatorUsername
) {

    public FaultRecord {
        Objects.requireNonNull(faultId, "faultId must not be null");
        Objects.requireNonNull(spacecraftId, "spacecraftId must not be null");
        Objects.requireNonNull(subsystem, "subsystem must not be null");
        Objects.requireNonNull(scenarioCode, "scenarioCode must not be null");
        Objects.requireNonNull(severity, "severity must not be null");
        Objects.requireNonNull(lifecycleState, "lifecycleState must not be null");
        Objects.requireNonNull(injectedEpoch, "injectedEpoch must not be null");
        parameters = parameters == null ? Collections.emptyMap() : Collections.unmodifiableMap(parameters);
    }

    public FaultRecord(
            String faultId,
            String spacecraftId,
            SubsystemType subsystem,
            FaultScenarioCode scenarioCode,
            FaultSeverity severity,
            FaultLifecycleState lifecycleState,
            Instant injectedEpoch,
            Instant detectedEpoch,
            Instant recoveredEpoch,
            Instant clearedEpoch,
            Map<String, Object> parameters,
            String description,
            String operatorExplanation,
            RecoveryActionType recoveryActionRequired,
            boolean autoRecoverable
    ) {
        this(
                faultId, spacecraftId, subsystem, scenarioCode, severity,
                lifecycleState, injectedEpoch, detectedEpoch, recoveredEpoch,
                clearedEpoch, parameters, description, operatorExplanation,
                recoveryActionRequired, autoRecoverable, null
        );
    }

    public static FaultRecord of(
            String spacecraftId,
            FaultScenarioCode scenarioCode,
            FaultSeverity severity,
            Instant injectedEpoch,
            Map<String, Object> parameters,
            String description,
            String operatorUsername
    ) {
        return new FaultRecord(
                UUID.randomUUID().toString(),
                spacecraftId,
                scenarioCode.getSubsystem(),
                scenarioCode,
                severity != null ? severity : scenarioCode.getDefaultSeverity(),
                FaultLifecycleState.ACTIVE,
                injectedEpoch,
                null,
                null,
                null,
                parameters,
                description != null ? description : scenarioCode.name() + " fault active",
                "Subsystem " + scenarioCode.getSubsystem() + " experiencing " + scenarioCode.name() + "; operator action required: " + scenarioCode.getExpectedRecoveryAction(),
                scenarioCode.getExpectedRecoveryAction(),
                false,
                operatorUsername
        );
    }

    public static FaultRecord of(
            String spacecraftId,
            FaultScenarioCode scenarioCode,
            FaultSeverity severity,
            Instant injectedEpoch,
            Map<String, Object> parameters,
            String description
    ) {
        return of(spacecraftId, scenarioCode, severity, injectedEpoch, parameters, description, null);
    }

    public FaultRecord withDetected(Instant detectedEpoch, String explanation) {
        return new FaultRecord(
                faultId, spacecraftId, subsystem, scenarioCode, severity,
                FaultLifecycleState.DETECTED,
                injectedEpoch, detectedEpoch, recoveredEpoch, clearedEpoch,
                parameters, description,
                explanation != null ? explanation : operatorExplanation,
                recoveryActionRequired, autoRecoverable, operatorUsername
        );
    }

    public FaultRecord withRecovering(String operatorNote) {
        return withRecovering(operatorNote, operatorUsername);
    }

    public FaultRecord withRecovering(String operatorNote, String newOperator) {
        return new FaultRecord(
                faultId, spacecraftId, subsystem, scenarioCode, severity,
                FaultLifecycleState.RECOVERING,
                injectedEpoch, detectedEpoch, recoveredEpoch, clearedEpoch,
                parameters, description,
                operatorNote != null ? operatorNote : operatorExplanation,
                recoveryActionRequired, autoRecoverable,
                newOperator != null ? newOperator : operatorUsername
        );
    }

    public FaultRecord withRecovered(Instant recoveredEpoch, String operatorNote) {
        return withRecovered(recoveredEpoch, operatorNote, operatorUsername);
    }

    public FaultRecord withRecovered(Instant recoveredEpoch, String operatorNote, String newOperator) {
        return new FaultRecord(
                faultId, spacecraftId, subsystem, scenarioCode, severity,
                FaultLifecycleState.RECOVERED,
                injectedEpoch, detectedEpoch, recoveredEpoch, clearedEpoch,
                parameters, description,
                operatorNote != null ? operatorNote : operatorExplanation,
                recoveryActionRequired, autoRecoverable,
                newOperator != null ? newOperator : operatorUsername
        );
    }

    public FaultRecord withCleared(Instant clearedEpoch) {
        return withCleared(clearedEpoch, operatorUsername);
    }

    public FaultRecord withCleared(Instant clearedEpoch, String newOperator) {
        return new FaultRecord(
                faultId, spacecraftId, subsystem, scenarioCode, severity,
                FaultLifecycleState.CLEARED,
                injectedEpoch, detectedEpoch, recoveredEpoch, clearedEpoch,
                parameters, description, operatorExplanation,
                recoveryActionRequired, autoRecoverable,
                newOperator != null ? newOperator : operatorUsername
        );
    }

    public FaultRecord withSeverity(FaultSeverity newSeverity) {
        return new FaultRecord(
                faultId, spacecraftId, subsystem, scenarioCode, newSeverity,
                lifecycleState,
                injectedEpoch, detectedEpoch, recoveredEpoch, clearedEpoch,
                parameters, description, operatorExplanation,
                recoveryActionRequired, autoRecoverable, operatorUsername
        );
    }
}
