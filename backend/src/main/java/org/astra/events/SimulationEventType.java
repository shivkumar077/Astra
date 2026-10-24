package org.astra.events;

/**
 * Classification of authoritative events emitted across the simulation and telemetry pipeline.
 */
public enum SimulationEventType {
    SIMULATION_INITIALIZED,
    SIMULATION_ADVANCED,
    SIMULATION_PAUSED,
    SIMULATION_RESUMED,
    SIMULATION_STOPPED,

    COMMAND_ACCEPTED,
    COMMAND_EXECUTED,
    COMMAND_REJECTED,
    COMMAND_FAILED,

    TELEMETRY_SNAPSHOT,
    FLEET_TELEMETRY_UPDATE,

    IMAGING_CAPTURE_COMPLETED,

    ANOMALY_TRIGGERED,
    ANOMALY_CLEARED
}
