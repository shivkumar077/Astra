package org.astra.simulation.orbital;

import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OrbitState;
import org.astra.core.math.Vector3D;

import java.time.Instant;

/**
 * Interface defining orbital state propagation and orbital element conversion.
 */
public interface OrbitalPropagator {

    /**
     * Propagates orbital state from initial Keplerian elements at t0 to a target simulation epoch.
     *
     * @param initialElements Orbital elements defined at initialEpoch
     * @param initialEpoch    The epoch of initialElements
     * @param targetEpoch     The target epoch to propagate to
     * @return New authoritative OrbitState at targetEpoch
     */
    OrbitState propagate(KeplerianElements initialElements, Instant initialEpoch, Instant targetEpoch);

    /**
     * Converts instantaneous Keplerian elements into a Cartesian OrbitState at the specified epoch.
     */
    OrbitState elementsToState(KeplerianElements elements, Instant epoch);

    /**
     * Converts a Cartesian state vector (r, v) into osculating Keplerian orbital elements.
     */
    KeplerianElements stateToElements(Vector3D positionKm, Vector3D velocityKmS);
}
