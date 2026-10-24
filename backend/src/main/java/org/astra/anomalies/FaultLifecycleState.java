package org.astra.anomalies;

/**
 * Deterministic lifecycle states for Failure Lab anomalies and detections.
 */
public enum FaultLifecycleState {
    /**
     * Fault has been scheduled or introduced into the environment.
     */
    INJECTED,

    /**
     * Fault is physically active and actively perturbing simulated subsystem physics.
     */
    ACTIVE,

    /**
     * Telemetry detection engine has recognized the symptoms and issued an operational alert.
     */
    DETECTED,

    /**
     * Operator or autonomous recovery workflow is actively executing.
     */
    RECOVERING,

    /**
     * Subsystem has been successfully restored to nominal or degraded operational status.
     */
    RECOVERED,

    /**
     * Recovery procedure failed or was rejected due to unmet preconditions.
     */
    FAILED,

    /**
     * Alert acknowledged or cleared from operator active board without repairing the physical state.
     */
    CLEARED
}
