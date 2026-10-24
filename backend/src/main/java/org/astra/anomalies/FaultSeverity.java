package org.astra.anomalies;

/**
 * Severity classifications for spacecraft anomalies and detected threshold violations.
 */
public enum FaultSeverity {
    /**
     * Informational notification; subsystem performance is within acceptable operational tolerance.
     */
    INFO,

    /**
     * Subsystem degradation detected; threshold approached but primary mission remains operable.
     */
    WARNING,

    /**
     * Substantial subsystem malfunction requiring operator intervention or autonomous safing.
     */
    MAJOR,

    /**
     * Severe subsystem failure threatening vehicle survival or causing total mission outage.
     */
    CRITICAL
}
