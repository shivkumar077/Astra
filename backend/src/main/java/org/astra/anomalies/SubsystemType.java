package org.astra.anomalies;

/**
 * Standard spacecraft functional subsystem classifications in the ASTRA platform.
 */
public enum SubsystemType {
    /**
     * Electrical Power Subsystem (Solar arrays, batteries, power conditioning).
     */
    EPS,

    /**
     * Thermal Control Subsystem (Heat pipes, radiators, multi-layer insulation).
     */
    TCS,

    /**
     * Attitude Determination & Control Subsystem (Star trackers, reaction wheels, gyros).
     */
    ADCS,

    /**
     * Communications & Telemetry Subsystem (S-band/X-band transponders, antennas).
     */
    COMMS,

    /**
     * Propulsion Subsystem (Hydrazine/monopropellant thrusters, pressurant).
     */
    PROP,

    /**
     * On-Board Computer (Command decoders, flight software, watchdog timers).
     */
    OBC,

    /**
     * Optical / Science Payload (High-resolution imager, sensors).
     */
    PAYLOAD
}
