package org.astra.commands;

/**
 * Enumeration of authoritative telecommands supported by the ASTRA platform.
 */
public enum CommandType {
    /**
     * Reconfigures the operational mode of the spacecraft (e.g. NOMINAL, SCIENCE_OPERATION, LOW_POWER).
     */
    SET_OPERATIONAL_MODE,

    /**
     * Commands the spacecraft bus into contingency SAFE_MODE.
     */
    TRIGGER_SAFE_MODE,

    /**
     * Advances simulation time forward by a validated duration.
     */
    ADVANCE_TIME,

    /**
     * Pauses simulation clock and vehicle propagation.
     */
    PAUSE_SIMULATION,

    /**
     * Resumes simulation clock and vehicle propagation.
     */
    RESUME_SIMULATION,

    /**
     * Requests a simulated optical payload image capture when physical & operational conditions allow.
     */
    REQUEST_OPTICAL_CAPTURE
}
