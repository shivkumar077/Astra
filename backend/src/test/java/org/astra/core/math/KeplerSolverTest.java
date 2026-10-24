package org.astra.core.math;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

@DisplayName("KeplerSolver Numerical Convergence & Anomaly Invariants")
class KeplerSolverTest {

    @Test
    @DisplayName("Circular orbit (e=0) yields eccentric anomaly identical to mean anomaly")
    void testCircularOrbit() {
        double[] testAngles = {0.0, Math.PI / 4.0, Math.PI / 2.0, Math.PI, 3.0 * Math.PI / 2.0};
        for (double m : testAngles) {
            double e = KeplerSolver.solveEccentricAnomaly(m, 0.0);
            assertThat(e).isCloseTo(m, within(1.0e-12));
        }
    }

    @ParameterizedTest(name = "Eccentricity e={0} satisfies Kepler equation across mean anomaly sweep")
    @ValueSource(doubles = {0.001, 0.05, 0.15, 0.50, 0.72, 0.92})
    void testKeplerEquationSatisfaction(double eccentricity) {
        // Sweep mean anomaly from 0 to 2*pi in 15-degree steps
        for (int deg = 0; deg < 360; deg += 15) {
            double m = Math.toRadians(deg);
            double eAnomaly = KeplerSolver.solveEccentricAnomaly(m, eccentricity);

            // Invariant: M = E - e * sin(E)
            double reconstructedM = KeplerSolver.normalizeAngle(eAnomaly - eccentricity * Math.sin(eAnomaly));
            assertThat(reconstructedM).isCloseTo(KeplerSolver.normalizeAngle(m), within(1.0e-10));
        }
    }

    @ParameterizedTest(name = "Bi-directional conversion between True and Eccentric anomaly (e={0}, nu={1} deg)")
    @CsvSource({
            "0.0, 45.0",
            "0.1, 90.0",
            "0.5, 180.0",
            "0.72, 270.0",
            "0.85, 330.0"
    })
    void testAnomalyConversionRoundTrip(double e, double nuDeg) {
        double nuRad = Math.toRadians(nuDeg);
        double eAnomalyRad = KeplerSolver.trueToEccentricAnomaly(nuRad, e);
        double roundTripNuRad = KeplerSolver.eccentricToTrueAnomaly(eAnomalyRad, e);

        assertThat(roundTripNuRad).isCloseTo(KeplerSolver.normalizeAngle(nuRad), within(1.0e-11));
    }

    @Test
    @DisplayName("Periapsis (nu=0) and Apoapsis (nu=pi) have identical True and Eccentric anomalies")
    void testPeriapsisAndApoapsisInvariants() {
        double e = 0.6;

        // At periapsis, E = 0, nu = 0
        assertThat(KeplerSolver.eccentricToTrueAnomaly(0.0, e)).isCloseTo(0.0, within(1.0e-12));
        assertThat(KeplerSolver.trueToEccentricAnomaly(0.0, e)).isCloseTo(0.0, within(1.0e-12));

        // At apoapsis, E = pi, nu = pi
        assertThat(KeplerSolver.eccentricToTrueAnomaly(Math.PI, e)).isCloseTo(Math.PI, within(1.0e-12));
        assertThat(KeplerSolver.trueToEccentricAnomaly(Math.PI, e)).isCloseTo(Math.PI, within(1.0e-12));
    }

    @Test
    @DisplayName("Rejects negative or parabolic/hyperbolic eccentricities")
    void testInvalidEccentricity() {
        assertThatThrownBy(() -> KeplerSolver.solveEccentricAnomaly(1.0, -0.1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> KeplerSolver.solveEccentricAnomaly(1.0, 1.0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> KeplerSolver.solveEccentricAnomaly(1.0, 1.5))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
