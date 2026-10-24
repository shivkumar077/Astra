package org.astra.core.domain;

import org.astra.core.math.AstroConstants;
import org.astra.core.math.Vector3D;

import java.time.Instant;
import java.util.Objects;

/**
 * Immutable snapshot of a satellite's complete kinematic state at an authoritative simulation epoch.
 *
 * @param epoch           Simulation epoch timestamp
 * @param coordinateFrame Coordinate reference frame (typically ECI_J2000)
 * @param positionKm      Cartesian position vector [X, Y, Z] in kilometers [km]
 * @param velocityKmS     Cartesian velocity vector [Vx, Vy, Vz] in kilometers per second [km/s]
 * @param elements        Classical Keplerian orbital elements corresponding to this state
 * @param altitudeKm      Geocentric altitude above Earth's equatorial mean radius [km]
 * @param speedKmS        Scalar orbital velocity norm [km/s]
 * @param inEclipse       True if the satellite is in Earth's cylindrical shadow
 */
public record OrbitState(
        Instant epoch,
        CoordinateFrame coordinateFrame,
        Vector3D positionKm,
        Vector3D velocityKmS,
        KeplerianElements elements,
        double altitudeKm,
        double speedKmS,
        boolean inEclipse
) {

    public OrbitState {
        Objects.requireNonNull(epoch, "epoch must not be null");
        Objects.requireNonNull(coordinateFrame, "coordinateFrame must not be null");
        Objects.requireNonNull(positionKm, "positionKm must not be null");
        Objects.requireNonNull(velocityKmS, "velocityKmS must not be null");
        Objects.requireNonNull(elements, "elements must not be null");
    }

    /**
     * Factory constructor computing derived altitude and speed automatically from position and velocity.
     */
    public static OrbitState of(
            Instant epoch,
            CoordinateFrame frame,
            Vector3D positionKm,
            Vector3D velocityKmS,
            KeplerianElements elements,
            boolean inEclipse
    ) {
        double r = positionKm.norm();
        double altitude = r - AstroConstants.EARTH_EQUATORIAL_RADIUS_KM;
        double speed = velocityKmS.norm();
        return new OrbitState(epoch, frame, positionKm, velocityKmS, elements, altitude, speed, inEclipse);
    }

    public Vector3D velocityKmPerSec() {
        return velocityKmS;
    }

    public double speedKmPerSec() {
        return speedKmS;
    }
}
