package org.astra.core.domain;

import org.astra.core.math.AstroConstants;

/**
 * Immutable Keplerian classical orbital elements for a satellite in an elliptical orbit.
 * <p>
 * Units and Definitions:
 * <ul>
 *   <li>{@code semiMajorAxisKm}: Semi-major axis ($a$) in kilometers [km]. Must exceed Earth's radius (6378.137 km).</li>
 *   <li>{@code eccentricity}: Orbital eccentricity ($e$). Dimensionless. Must satisfy 0.0 &le; e &lt; 1.0 (elliptic/closed).</li>
 *   <li>{@code inclinationDeg}: Orbital inclination ($i$) relative to equatorial plane in degrees [0.0&deg;, 180.0&deg;].</li>
 *   <li>{@code raanDeg}: Right Ascension of the Ascending Node (&Omega;) in degrees [0.0&deg;, 360.0&deg;).</li>
 *   <li>{@code argOfPeriapsisDeg}: Argument of Periapsis (&omega;) in degrees [0.0&deg;, 360.0&deg;).</li>
 *   <li>{@code trueAnomalyDeg}: True Anomaly (&nu;) in degrees [0.0&deg;, 360.0&deg;).</li>
 * </ul>
 */
public record KeplerianElements(
        double semiMajorAxisKm,
        double eccentricity,
        double inclinationDeg,
        double raanDeg,
        double argOfPeriapsisDeg,
        double trueAnomalyDeg
) {

    public KeplerianElements {
        if (Double.isNaN(semiMajorAxisKm) || semiMajorAxisKm <= AstroConstants.EARTH_EQUATORIAL_RADIUS_KM) {
            throw new IllegalArgumentException(
                    "Semi-major axis must exceed Earth equatorial radius (" +
                    AstroConstants.EARTH_EQUATORIAL_RADIUS_KM + " km), got: " + semiMajorAxisKm
            );
        }

        if (Double.isNaN(eccentricity) || eccentricity < 0.0 || eccentricity >= 1.0) {
            throw new IllegalArgumentException(
                    "Eccentricity must be in range [0.0, 1.0) for closed Keplerian orbits, got: " + eccentricity
            );
        }

        if (Double.isNaN(inclinationDeg) || inclinationDeg < 0.0 || inclinationDeg > 180.0) {
            throw new IllegalArgumentException(
                    "Inclination must be in range [0.0, 180.0] degrees, got: " + inclinationDeg
            );
        }

        // Normalize angular elements to standard primary interval [0, 360)
        raanDeg = normalizeDegrees(raanDeg);
        argOfPeriapsisDeg = normalizeDegrees(argOfPeriapsisDeg);
        trueAnomalyDeg = normalizeDegrees(trueAnomalyDeg);
    }

    public static double normalizeDegrees(double deg) {
        if (Double.isNaN(deg) || Double.isInfinite(deg)) {
            throw new IllegalArgumentException("Angle cannot be NaN or infinite: " + deg);
        }
        double normalized = deg % 360.0;
        if (normalized < 0.0) {
            normalized += 360.0;
        }
        return normalized;
    }

    /**
     * Radial distance from Earth center to periapsis (closest approach) in km: r_p = a * (1 - e)
     */
    public double periapsisRadiusKm() {
        return semiMajorAxisKm * (1.0 - eccentricity);
    }

    /**
     * Radial distance from Earth center to apoapsis (furthest point) in km: r_a = a * (1 + e)
     */
    public double apoapsisRadiusKm() {
        return semiMajorAxisKm * (1.0 + eccentricity);
    }

    /**
     * Altitude of periapsis above Earth mean sea level in kilometers [km].
     */
    public double periapsisAltitudeKm() {
        return periapsisRadiusKm() - AstroConstants.EARTH_EQUATORIAL_RADIUS_KM;
    }

    /**
     * Altitude of apoapsis above Earth mean sea level in kilometers [km].
     */
    public double apoapsisAltitudeKm() {
        return apoapsisRadiusKm() - AstroConstants.EARTH_EQUATORIAL_RADIUS_KM;
    }

    /**
     * Orbital period (T) in seconds: T = 2 * &pi; * sqrt(a^3 / &mu;)
     */
    public double orbitalPeriodSeconds() {
        return 2.0 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3.0) / AstroConstants.EARTH_MU_KM3_S2);
    }

    /**
     * Mean motion (n) in radians per second [rad/s]: n = sqrt(&mu; / a^3)
     */
    public double meanMotionRadPerSec() {
        return Math.sqrt(AstroConstants.EARTH_MU_KM3_S2 / Math.pow(semiMajorAxisKm, 3.0));
    }

    /**
     * Semi-latus rectum (p) in km: p = a * (1 - e^2)
     */
    public double semiLatusRectumKm() {
        return semiMajorAxisKm * (1.0 - eccentricity * eccentricity);
    }

    /**
     * Returns a copy of these orbital elements with an updated true anomaly in degrees.
     */
    public KeplerianElements withTrueAnomalyDeg(double newTrueAnomalyDeg) {
        return new KeplerianElements(
                this.semiMajorAxisKm,
                this.eccentricity,
                this.inclinationDeg,
                this.raanDeg,
                this.argOfPeriapsisDeg,
                newTrueAnomalyDeg
        );
    }
}
