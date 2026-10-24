package org.astra.simulation.orbital;

import org.astra.core.domain.CoordinateFrame;
import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OrbitState;
import org.astra.core.math.AstroConstants;
import org.astra.core.math.KeplerSolver;
import org.astra.core.math.Vector3D;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Deterministic Keplerian two-body analytical orbital propagator.
 * <p>
 * Physical Model &amp; Documented Assumptions:
 * <ul>
 *   <li>Point-mass central Earth gravitational potential: &mu; = 398600.4418 km^3/s^2 (WGS 84 / EGM96).</li>
 *   <li>Standard coordinate frame: Earth-Centered Inertial (ECI J2000).</li>
 *   <li>Closed, unperturbed two-body Keplerian motion (e &lt; 1.0).</li>
 *   <li>Cylindrical Earth shadow model for umbral eclipse tracking.</li>
 *   <li>Scope boundary: Geopotential harmonics (J2, J3), third-body perturbations (Sun/Moon),
 *       and atmospheric drag are excluded from this baseline Phase 2 implementation.</li>
 * </ul>
 */
public class KeplerianPropagator implements OrbitalPropagator {

    private final double gravitationalParameterKm3S2;

    public KeplerianPropagator() {
        this(AstroConstants.EARTH_MU_KM3_S2);
    }

    public KeplerianPropagator(double gravitationalParameterKm3S2) {
        if (gravitationalParameterKm3S2 <= 0.0) {
            throw new IllegalArgumentException("Gravitational parameter must be strictly positive, got: " + gravitationalParameterKm3S2);
        }
        this.gravitationalParameterKm3S2 = gravitationalParameterKm3S2;
    }

    @Override
    public OrbitState propagate(KeplerianElements initialElements, Instant initialEpoch, Instant targetEpoch) {
        Objects.requireNonNull(initialElements, "initialElements must not be null");
        Objects.requireNonNull(initialEpoch, "initialEpoch must not be null");
        Objects.requireNonNull(targetEpoch, "targetEpoch must not be null");

        // 1. Calculate elapsed simulation duration in seconds (supports both forward and backward propagation)
        double deltaSeconds = Duration.between(initialEpoch, targetEpoch).toNanos() / 1.0e9;

        // If delta is 0, return instantaneous state
        if (deltaSeconds == 0.0) {
            return elementsToState(initialElements, targetEpoch);
        }

        double a = initialElements.semiMajorAxisKm();
        double e = initialElements.eccentricity();
        double n = Math.sqrt(gravitationalParameterKm3S2 / Math.pow(a, 3.0)); // Mean motion [rad/s]

        // 2. Initial true anomaly -> initial eccentric anomaly -> initial mean anomaly
        double nu0Rad = Math.toRadians(initialElements.trueAnomalyDeg());
        double e0Rad = KeplerSolver.trueToEccentricAnomaly(nu0Rad, e);
        double m0Rad = e0Rad - e * Math.sin(e0Rad);

        // 3. Propagate mean anomaly forward by n * dt
        double mTargetRad = m0Rad + n * deltaSeconds;

        // 4. Solve Kepler's equation for target eccentric anomaly
        double eTargetRad = KeplerSolver.solveEccentricAnomaly(mTargetRad, e);

        // 5. Convert back to target true anomaly
        double nuTargetRad = KeplerSolver.eccentricToTrueAnomaly(eTargetRad, e);
        double nuTargetDeg = Math.toDegrees(nuTargetRad);

        // 6. Updated osculating elements (in pure Keplerian motion, a, e, i, RAAN, argPeriapsis are invariant)
        KeplerianElements targetElements = initialElements.withTrueAnomalyDeg(nuTargetDeg);

        return elementsToState(targetElements, targetEpoch);
    }

    @Override
    public OrbitState elementsToState(KeplerianElements elements, Instant epoch) {
        Objects.requireNonNull(elements, "elements must not be null");
        Objects.requireNonNull(epoch, "epoch must not be null");

        double a = elements.semiMajorAxisKm();
        double e = elements.eccentricity();
        double iRad = Math.toRadians(elements.inclinationDeg());
        double raanRad = Math.toRadians(elements.raanDeg());
        double argPeriRad = Math.toRadians(elements.argOfPeriapsisDeg());
        double nuRad = Math.toRadians(elements.trueAnomalyDeg());

        // 1. Perifocal coordinate system (P, Q, W)
        // Semi-latus rectum: p = a * (1 - e^2)
        double p = a * (1.0 - e * e);
        double r = p / (1.0 + e * Math.cos(nuRad));

        // Position in perifocal plane [km]
        double rP = r * Math.cos(nuRad);
        double rQ = r * Math.sin(nuRad);

        // Velocity in perifocal plane [km/s]
        double sqrtMuOverP = Math.sqrt(gravitationalParameterKm3S2 / p);
        double vP = -sqrtMuOverP * Math.sin(nuRad);
        double vQ = sqrtMuOverP * (e + Math.cos(nuRad));

        // 2. Direction cosine matrix from PQW to ECI J2000:
        // R = Rz(-raan) * Rx(-i) * Rz(-argPeri)
        double cosRaan = Math.cos(raanRad);
        double sinRaan = Math.sin(raanRad);
        double cosI = Math.cos(iRad);
        double sinI = Math.sin(iRad);
        double cosArg = Math.cos(argPeriRad);
        double sinArg = Math.sin(argPeriRad);

        // P unit vector components in ECI
        double px = cosRaan * cosArg - sinRaan * sinArg * cosI;
        double py = sinRaan * cosArg + cosRaan * sinArg * cosI;
        double pz = sinArg * sinI;

        // Q unit vector components in ECI
        double qx = -cosRaan * sinArg - sinRaan * cosArg * cosI;
        double qy = -sinRaan * sinArg + cosRaan * cosArg * cosI;
        double qz = cosArg * sinI;

        // 3. Transform to ECI Cartesian coordinates
        Vector3D positionEci = new Vector3D(
                rP * px + rQ * qx,
                rP * py + rQ * qy,
                rP * pz + rQ * qz
        );

        Vector3D velocityEci = new Vector3D(
                vP * px + vQ * qx,
                vP * py + vQ * qy,
                vP * pz + vQ * qz
        );

        // 4. Cylindrical shadow check for eclipse
        boolean inEclipse = calculateCylindricalEclipse(positionEci);

        return OrbitState.of(
                epoch,
                CoordinateFrame.ECI_J2000,
                positionEci,
                velocityEci,
                elements,
                inEclipse
        );
    }

    @Override
    public KeplerianElements stateToElements(Vector3D positionKm, Vector3D velocityKmS) {
        Objects.requireNonNull(positionKm, "positionKm must not be null");
        Objects.requireNonNull(velocityKmS, "velocityKmS must not be null");

        double r = positionKm.norm();
        double v = velocityKmS.norm();

        if (r <= 0.0 || v <= 0.0) {
            throw new IllegalArgumentException("Position and velocity must have non-zero norms");
        }

        // Specific angular momentum: h = r x v
        Vector3D hVec = positionKm.crossProduct(velocityKmS);
        double h = hVec.norm();
        if (h <= 1.0e-10) {
            throw new IllegalArgumentException("Degenerate rectilinear trajectory: angular momentum is zero");
        }

        // Specific mechanical energy: E = v^2 / 2 - mu / r
        double energy = (v * v) / 2.0 - gravitationalParameterKm3S2 / r;
        if (energy >= 0.0) {
            throw new IllegalArgumentException("Parabolic or hyperbolic escape trajectories are outside closed Keplerian scope");
        }

        // Semi-major axis: a = -mu / (2 * E)
        double a = -gravitationalParameterKm3S2 / (2.0 * energy);

        // Eccentricity vector: e_vec = (1 / mu) * ((v^2 - mu/r)*r - (r . v)*v)
        double rDotV = positionKm.dotProduct(velocityKmS);
        Vector3D eVec = positionKm.multiply(v * v - gravitationalParameterKm3S2 / r)
                .subtract(velocityKmS.multiply(rDotV))
                .divide(gravitationalParameterKm3S2);
        double e = eVec.norm();

        // Node vector: n = k x h = (-h_y, h_x, 0)
        Vector3D nVec = new Vector3D(-hVec.y(), hVec.x(), 0.0);
        double nNorm = nVec.norm();

        // Inclination: i = acos(h_z / h)
        double iRad = Math.acos(Math.clamp(hVec.z() / h, -1.0, 1.0));
        double iDeg = Math.toDegrees(iRad);

        // RAAN: Omega
        double raanDeg = 0.0;
        if (nNorm > 1.0e-11) {
            double raanRad = Math.acos(Math.clamp(nVec.x() / nNorm, -1.0, 1.0));
            if (nVec.y() < 0.0) {
                raanRad = 2.0 * Math.PI - raanRad;
            }
            raanDeg = Math.toDegrees(raanRad);
        }

        // Argument of periapsis: omega
        double argPeriDeg = 0.0;
        if (nNorm > 1.0e-11 && e > 1.0e-11) {
            double argPeriRad = Math.acos(Math.clamp(nVec.dotProduct(eVec) / (nNorm * e), -1.0, 1.0));
            if (eVec.z() < 0.0) {
                argPeriRad = 2.0 * Math.PI - argPeriRad;
            }
            argPeriDeg = Math.toDegrees(argPeriRad);
        }

        // True anomaly: nu
        double nuDeg = 0.0;
        if (e > 1.0e-11) {
            double nuRad = Math.acos(Math.clamp(eVec.dotProduct(positionKm) / (e * r), -1.0, 1.0));
            if (rDotV < 0.0) {
                nuRad = 2.0 * Math.PI - nuRad;
            }
            nuDeg = Math.toDegrees(nuRad);
        } else {
            // For circular orbit, true anomaly from ascending node
            if (nNorm > 1.0e-11) {
                double uRad = Math.acos(Math.clamp(nVec.dotProduct(positionKm) / (nNorm * r), -1.0, 1.0));
                if (positionKm.z() < 0.0) {
                    uRad = 2.0 * Math.PI - uRad;
                }
                nuDeg = Math.toDegrees(uRad);
            }
        }

        return new KeplerianElements(a, e, iDeg, raanDeg, argPeriDeg, nuDeg);
    }

    /**
     * Determines whether the spacecraft position is within Earth's cylindrical umbral shadow.
     * Approximates Sun vector pointing along vernal equinox (+X ECI) with 23.44 deg obliquity.
     */
    private boolean calculateCylindricalEclipse(Vector3D rEci) {
        // Approximate Sun direction unit vector in J2000 ECI
        double obliquityRad = Math.toRadians(23.44);
        Vector3D sunUnit = new Vector3D(Math.cos(obliquityRad), Math.sin(obliquityRad), 0.0).normalize();

        double parallelProj = rEci.dotProduct(sunUnit);
        // If projection along Sun vector is positive, satellite is on the sunlit hemisphere of Earth
        if (parallelProj >= 0.0) {
            return false;
        }

        // Behind Earth: calculate perpendicular distance from shadow axis
        double perpDistSq = rEci.normSq() - (parallelProj * parallelProj);
        double earthRadiusSq = AstroConstants.EARTH_EQUATORIAL_RADIUS_KM * AstroConstants.EARTH_EQUATORIAL_RADIUS_KM;

        return perpDistSq < earthRadiusSq;
    }
}
