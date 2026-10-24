package org.astra.core.math;

/**
 * Deterministic numerical solver for Kepler's Equation in closed elliptical orbits:
 * <pre>
 *   M = E - e * sin(E)
 * </pre>
 * where:
 * <ul>
 *   <li>{@code M} is the Mean Anomaly in radians</li>
 *   <li>{@code E} is the Eccentric Anomaly in radians</li>
 *   <li>{@code e} is the orbital eccentricity (0 &le; e &lt; 1)</li>
 * </ul>
 * <p>
 * Algorithm:
 * Newton-Raphson iteration with bounded initial guess and quadratic convergence.
 * Convergence threshold: &epsilon; = 1.0e-12 radians (maximum 30 iterations).
 */
public final class KeplerSolver {

    private static final double TWO_PI = 2.0 * Math.PI;
    private static final double TOLERANCE = 1.0e-12;
    private static final int MAX_ITERATIONS = 30;

    private KeplerSolver() {
        // Utility class
    }

    /**
     * Solves for the Eccentric Anomaly (E) in radians given Mean Anomaly (M) and eccentricity (e).
     *
     * @param meanAnomalyRad Mean Anomaly in radians (any real value; will be normalized to [0, 2&pi;))
     * @param eccentricity   Orbital eccentricity (must satisfy 0 &le; e &lt; 1)
     * @return Eccentric Anomaly in radians in range [0, 2&pi;)
     */
    public static double solveEccentricAnomaly(double meanAnomalyRad, double eccentricity) {
        if (eccentricity < 0.0 || eccentricity >= 1.0) {
            throw new IllegalArgumentException(
                    "Eccentricity must be in range [0.0, 1.0) for closed Keplerian orbits, got: " + eccentricity
            );
        }

        // Circular orbit shortcut
        if (eccentricity == 0.0) {
            return normalizeAngle(meanAnomalyRad);
        }

        double m = normalizeAngle(meanAnomalyRad);

        // Initial guess E0
        double eCurrent;
        if (eccentricity < 0.8) {
            eCurrent = m + eccentricity * Math.sin(m);
        } else {
            // High-eccentricity initial approximation
            eCurrent = m + eccentricity * Math.sin(m) + 0.5 * eccentricity * eccentricity * Math.sin(2.0 * m);
        }

        // Newton-Raphson iteration
        for (int i = 0; i < MAX_ITERATIONS; i++) {
            double f = eCurrent - eccentricity * Math.sin(eCurrent) - m;
            if (Math.abs(f) < TOLERANCE) {
                return normalizeAngle(eCurrent);
            }

            double fPrime = 1.0 - eccentricity * Math.cos(eCurrent);
            if (Math.abs(fPrime) < 1.0e-15) {
                break;
            }

            double delta = f / fPrime;
            eCurrent -= delta;

            if (Math.abs(delta) < TOLERANCE) {
                return normalizeAngle(eCurrent);
            }
        }

        return normalizeAngle(eCurrent);
    }

    /**
     * Converts Eccentric Anomaly (E) to True Anomaly (&nu;) in radians.
     * <pre>
     *   tan(&nu;/2) = sqrt((1 + e) / (1 - e)) * tan(E/2)
     * </pre>
     *
     * @param eccentricAnomalyRad Eccentric Anomaly in radians
     * @param eccentricity        Orbital eccentricity (0 &le; e &lt; 1)
     * @return True Anomaly in radians in range [0, 2&pi;)
     */
    public static double eccentricToTrueAnomaly(double eccentricAnomalyRad, double eccentricity) {
        if (eccentricity == 0.0) {
            return normalizeAngle(eccentricAnomalyRad);
        }

        double beta = Math.sqrt((1.0 + eccentricity) / (1.0 - eccentricity));
        double nuHalf = Math.atan2(beta * Math.sin(eccentricAnomalyRad / 2.0), Math.cos(eccentricAnomalyRad / 2.0));
        return normalizeAngle(2.0 * nuHalf);
    }

    /**
     * Converts True Anomaly (&nu;) to Eccentric Anomaly (E) in radians.
     * <pre>
     *   tan(E/2) = sqrt((1 - e) / (1 + e)) * tan(&nu;/2)
     * </pre>
     *
     * @param trueAnomalyRad True Anomaly in radians
     * @param eccentricity   Orbital eccentricity (0 &le; e &lt; 1)
     * @return Eccentric Anomaly in radians in range [0, 2&pi;)
     */
    public static double trueToEccentricAnomaly(double trueAnomalyRad, double eccentricity) {
        if (eccentricity == 0.0) {
            return normalizeAngle(trueAnomalyRad);
        }

        double beta = Math.sqrt((1.0 - eccentricity) / (1.0 + eccentricity));
        double eHalf = Math.atan2(beta * Math.sin(trueAnomalyRad / 2.0), Math.cos(trueAnomalyRad / 2.0));
        return normalizeAngle(2.0 * eHalf);
    }

    /**
     * Normalizes an angle in radians into the primary interval [0, 2&pi;).
     */
    public static double normalizeAngle(double angleRad) {
        double normalized = angleRad % TWO_PI;
        if (normalized < 0.0) {
            normalized += TWO_PI;
        }
        return normalized;
    }
}
