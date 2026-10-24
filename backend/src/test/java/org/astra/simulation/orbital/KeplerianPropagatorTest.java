package org.astra.simulation.orbital;

import org.astra.core.domain.CoordinateFrame;
import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OrbitState;
import org.astra.core.math.AstroConstants;
import org.astra.core.math.Vector3D;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.*;

@DisplayName("KeplerianPropagator Physical Dynamics & Conservation Laws")
class KeplerianPropagatorTest {

    private KeplerianPropagator propagator;
    private Instant initialEpoch;

    @BeforeEach
    void setUp() {
        propagator = new KeplerianPropagator();
        initialEpoch = Instant.parse("2026-10-24T00:00:00Z");
    }

    @Test
    @DisplayName("Deterministic state reproducibility: identical inputs yield identical outputs")
    void testDeterministicPropagation() {
        KeplerianElements el = new KeplerianElements(7100.0, 0.02, 45.0, 30.0, 60.0, 10.0);
        Instant target = initialEpoch.plusSeconds(3600);

        OrbitState state1 = propagator.propagate(el, initialEpoch, target);
        OrbitState state2 = propagator.propagate(el, initialEpoch, target);

        assertThat(state1.positionKm().x()).isEqualTo(state2.positionKm().x());
        assertThat(state1.positionKm().y()).isEqualTo(state2.positionKm().y());
        assertThat(state1.positionKm().z()).isEqualTo(state2.positionKm().z());
        assertThat(state1.velocityKmS().norm()).isEqualTo(state2.velocityKmS().norm());
        assertThat(state1.elements().trueAnomalyDeg()).isEqualTo(state2.elements().trueAnomalyDeg());
    }

    @Test
    @DisplayName("Conservation of Specific Mechanical Energy across orbital trajectory")
    void testConservationOfEnergy() {
        // High eccentricity test orbit: a = 12000 km, e = 0.4
        KeplerianElements el = new KeplerianElements(12000.0, 0.4, 28.5, 0.0, 0.0, 0.0);
        double expectedEnergy = -AstroConstants.EARTH_MU_KM3_S2 / (2.0 * el.semiMajorAxisKm());

        double period = el.orbitalPeriodSeconds();
        double[] timeFractions = {0.0, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5};

        for (double frac : timeFractions) {
            Instant t = initialEpoch.plusMillis((long) (frac * period * 1000));
            OrbitState state = propagator.propagate(el, initialEpoch, t);

            double r = state.positionKm().norm();
            double v = state.velocityKmS().norm();
            double specificEnergy = (v * v) / 2.0 - AstroConstants.EARTH_MU_KM3_S2 / r;

            assertThat(specificEnergy)
                    .as("Energy conservation at t = " + frac + " T")
                    .isCloseTo(expectedEnergy, within(1.0e-8));
        }
    }

    @Test
    @DisplayName("Orbital Periodicity: state after one full period (t = T) returns to initial state")
    void testFullPeriodReturn() {
        KeplerianElements el = new KeplerianElements(7200.0, 0.05, 51.6, 80.0, 110.0, 0.0);
        OrbitState initial = propagator.elementsToState(el, initialEpoch);

        double periodSec = el.orbitalPeriodSeconds();
        Instant onePeriodLater = initialEpoch.plusNanos((long) (periodSec * 1.0e9));

        OrbitState returned = propagator.propagate(el, initialEpoch, onePeriodLater);

        // Position difference should be sub-meter (< 0.001 km)
        double posDiffKm = returned.positionKm().distanceTo(initial.positionKm());
        assertThat(posDiffKm).isLessThan(1.0e-3);

        // Velocity difference should be sub-millimeter/sec (< 1.0e-5 km/s)
        double velDiffKmS = returned.velocityKmS().distanceTo(initial.velocityKmS());
        assertThat(velDiffKmS).isLessThan(1.0e-5);
    }

    @Test
    @DisplayName("Half-Period Trajectory: satellite starting at periapsis reaches apoapsis at t = T/2")
    void testHalfPeriodApoapsisArrival() {
        double a = 10000.0;
        double e = 0.3;
        KeplerianElements el = new KeplerianElements(a, e, 45.0, 0.0, 0.0, 0.0); // True anomaly = 0 (periapsis)

        double periodSec = el.orbitalPeriodSeconds();
        Instant halfPeriodLater = initialEpoch.plusNanos((long) (periodSec * 0.5 * 1.0e9));

        OrbitState apoapsisState = propagator.propagate(el, initialEpoch, halfPeriodLater);

        // At apoapsis, r = a * (1 + e) = 10000 * 1.3 = 13000 km
        double expectedApoapsisR = a * (1.0 + e);
        assertThat(apoapsisState.positionKm().norm()).isCloseTo(expectedApoapsisR, within(1.0e-4));

        // Theoretical apoapsis velocity: v_a = sqrt(mu/a * (1 - e)/(1 + e))
        double expectedVa = Math.sqrt((AstroConstants.EARTH_MU_KM3_S2 / a) * ((1.0 - e) / (1.0 + e)));
        assertThat(apoapsisState.velocityKmS().norm()).isCloseTo(expectedVa, within(1.0e-4));

        // True anomaly at apoapsis should be 180 degrees
        assertThat(apoapsisState.elements().trueAnomalyDeg()).isCloseTo(180.0, within(1.0e-3));
    }

    @Test
    @DisplayName("Bi-directional stateToElements and elementsToState round-trip consistency")
    void testStateToElementsRoundTrip() {
        KeplerianElements original = new KeplerianElements(7400.0, 0.04, 63.4, 145.0, 270.0, 45.0);
        OrbitState state = propagator.elementsToState(original, initialEpoch);

        KeplerianElements recovered = propagator.stateToElements(state.positionKm(), state.velocityKmS());

        assertThat(recovered.semiMajorAxisKm()).isCloseTo(original.semiMajorAxisKm(), within(1.0e-5));
        assertThat(recovered.eccentricity()).isCloseTo(original.eccentricity(), within(1.0e-7));
        assertThat(recovered.inclinationDeg()).isCloseTo(original.inclinationDeg(), within(1.0e-5));
        assertThat(recovered.raanDeg()).isCloseTo(original.raanDeg(), within(1.0e-5));
        assertThat(recovered.argOfPeriapsisDeg()).isCloseTo(original.argOfPeriapsisDeg(), within(1.0e-5));
        assertThat(recovered.trueAnomalyDeg()).isCloseTo(original.trueAnomalyDeg(), within(1.0e-5));
    }

    @Test
    @DisplayName("Earth cylindrical shadow detects daylight and nocturnal eclipse properly")
    void testEclipseDetection() {
        // Obliquity 23.44 deg: Sun direction is approx (+cos 23.44, +sin 23.44, 0)
        // Position directly on sunlit side (+X): should be in daylight (inEclipse = false)
        Vector3D sunlitPos = new Vector3D(7000.0, 3000.0, 0.0);
        OrbitState sunlit = OrbitState.of(initialEpoch, CoordinateFrame.ECI_J2000, sunlitPos, Vector3D.UNIT_Z,
                new KeplerianElements(7500.0, 0.01, 0.0, 0.0, 0.0, 0.0), false);
        assertThat(sunlit.inEclipse()).isFalse();

        // Propagator generates eclipse boolean: test a point on the dark side within Earth shadow cylinder
        // (-7000, 0, 0) is directly anti-Sun and within Earth radius cylinder
        KeplerianElements darkEl = new KeplerianElements(7000.0, 0.001, 0.0, 0.0, 0.0, 180.0);
        OrbitState darkState = propagator.elementsToState(darkEl, initialEpoch);
        assertThat(darkState.inEclipse()).isTrue();
    }
}
