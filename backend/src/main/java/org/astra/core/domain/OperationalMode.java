package org.astra.core.domain;

/**
 * High-level operational mode of the spacecraft bus and onboard subsystems.
 */
public enum OperationalMode {
    /**
     * Standard on-orbit operations: solar arrays tracking, active payload functioning.
     */
    NOMINAL,

    /**
     * Contingency survival state: minimum power consumption, sun-pointing attitude, payloads off.
     */
    SAFE_MODE,

    /**
     * Power preservation state: payloads disabled, heaters duty-cycled.
     */
    LOW_POWER,

    /**
     * Active scientific data collection and observation regime.
     */
    SCIENCE_OPERATION,

    /**
     * Sensor cross-calibration or star tracker alignment routine.
     */
    CALIBRATION,

    /**
     * End of mission: decommissioned or graveyard orbit.
     */
    DECOMMISSIONED
}
