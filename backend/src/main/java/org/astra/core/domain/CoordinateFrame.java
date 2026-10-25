package org.astra.core.domain;

/**
 * Standard spatial and reference coordinate frames utilized in orbital propagation.
 */
public enum CoordinateFrame {
    /**
     * Earth-Centered Inertial reference frame with standard epoch J2000.
     * Fundamental reference frame for Keplerian propagation and ephemeris telemetry.
     */
    ECI_J2000,

    /**
     * Perifocal coordinate system (P, Q, W) centered at Earth, oriented with the orbital ellipse:
     * - P-axis points towards periapsis
     * - Q-axis points in direction of orbital velocity at periapsis
     * - W-axis points in direction of orbital angular momentum vector
     */
    PERIFOCAL_PQW,

    /**
     * Earth-Centered Earth-Fixed rotating terrestrial frame (WGS 84).
     */
    ECEF_WGS84,

    /**
     * Mars-Centered Inertial reference frame with standard epoch J2000 (Areocentric Inertial).
     */
    MCI_J2000,

    /**
     * Lunar-Centered Inertial reference frame (Selenocentric Inertial).
     */
    LCI_J2000,

    /**
     * Heliocentric reference frame with standard epoch J2000.
     */
    HELIOCENTRIC_J2000
}
