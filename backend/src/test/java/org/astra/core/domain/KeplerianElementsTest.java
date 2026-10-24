package org.astra.core.domain;

import org.astra.core.math.AstroConstants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

@DisplayName("KeplerianElements Classical Orbital Invariants")
class KeplerianElementsTest {

    @Test
    @DisplayName("ISS-like LEO orbit computes valid orbital metrics and period")
    void testIssLikeOrbitMetrics() {
        // a = 6798 km (~420 km altitude), e = 0.0006, i = 51.64 deg
        KeplerianElements iss = new KeplerianElements(
                6798.137, 0.0006, 51.64, 180.0, 90.0, 0.0
        );

        // Orbital period: T = 2 * pi * sqrt(a^3 / mu) ~ 5560 seconds (~92.7 minutes)
        double periodSec = iss.orbitalPeriodSeconds();
        assertThat(periodSec).isBetween(5500.0, 5600.0);

        // Altitudes: approx 416 km periapsis, 424 km apoapsis
        assertThat(iss.periapsisAltitudeKm()).isCloseTo(415.9, within(0.5));
        assertThat(iss.apoapsisAltitudeKm()).isCloseTo(424.1, within(0.5));

        // Mean motion: n ~ 0.00113 rad/s
        assertThat(iss.meanMotionRadPerSec()).isCloseTo(2.0 * Math.PI / periodSec, within(1.0e-10));
    }

    @Test
    @DisplayName("Geostationary transfer orbit (GTO) computes expected perigee and apogee")
    void testGtoMetrics() {
        // GTO: Perigee ~250 km, Apogee ~35786 km -> a ~ 24396 km, e ~ 0.73
        double a = 24396.0;
        double e = 0.73;
        KeplerianElements gto = new KeplerianElements(a, e, 28.5, 0.0, 0.0, 0.0);

        double expectedRp = a * (1.0 - e);
        double expectedRa = a * (1.0 + e);

        assertThat(gto.periapsisRadiusKm()).isCloseTo(expectedRp, within(1.0e-9));
        assertThat(gto.apoapsisRadiusKm()).isCloseTo(expectedRa, within(1.0e-9));
        assertThat(gto.periapsisAltitudeKm()).isCloseTo(expectedRp - AstroConstants.EARTH_EQUATORIAL_RADIUS_KM, within(1.0e-9));
    }

    @Test
    @DisplayName("Angles normalize correctly into primary [0, 360) interval")
    void testAngleNormalization() {
        KeplerianElements el = new KeplerianElements(7000.0, 0.01, 45.0, 400.0, -90.0, 720.0);
        assertThat(el.raanDeg()).isEqualTo(40.0);
        assertThat(el.argOfPeriapsisDeg()).isEqualTo(270.0);
        assertThat(el.trueAnomalyDeg()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Strict validation prevents physical impossibilities")
    void testPhysicalValidation() {
        // Semi-major axis inside Earth
        assertThatThrownBy(() -> new KeplerianElements(6300.0, 0.01, 45.0, 0.0, 0.0, 0.0))
                .isInstanceOf(IllegalArgumentException.class);

        // Eccentricity >= 1.0
        assertThatThrownBy(() -> new KeplerianElements(7000.0, 1.0, 45.0, 0.0, 0.0, 0.0))
                .isInstanceOf(IllegalArgumentException.class);

        // Negative eccentricity
        assertThatThrownBy(() -> new KeplerianElements(7000.0, -0.05, 45.0, 0.0, 0.0, 0.0))
                .isInstanceOf(IllegalArgumentException.class);

        // Negative inclination or > 180 deg
        assertThatThrownBy(() -> new KeplerianElements(7000.0, 0.01, -1.0, 0.0, 0.0, 0.0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new KeplerianElements(7000.0, 0.01, 181.0, 0.0, 0.0, 0.0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
