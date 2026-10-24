package org.astra.core.domain;

/**
 * Health classification of the spacecraft vehicle.
 */
public enum SpacecraftStatus {
    /**
     * All monitored telemetry within nominal engineering limits.
     */
    NOMINAL,

    /**
     * Non-critical subsystem anomaly or degraded redundancy present.
     */
    DEGRADED,

    /**
     * Active out-of-limits anomaly undergoing diagnostic isolation.
     */
    ANOMALOUS,

    /**
     * Mission-critical subsystem failure requiring immediate ground intervention.
     */
    CRITICAL,

    /**
     * Pre-launch or dormant standby state.
     */
    STANDBY
}
