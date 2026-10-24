package org.astra.simulation.engine;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Authoritative, deterministic simulation clock decoupled from system wall-clock time.
 * <p>
 * Time advances solely via explicit programmatic stepping.
 */
public class SimulationClock {

    private final Instant baseEpoch;
    private Instant currentEpoch;

    public SimulationClock(Instant initialEpoch) {
        this.baseEpoch = Objects.requireNonNull(initialEpoch, "initialEpoch must not be null");
        this.currentEpoch = initialEpoch;
    }

    /**
     * Advances simulation time forward by the specified non-negative duration.
     *
     * @param duration Time duration to advance
     * @return New current simulation instant
     */
    public synchronized Instant advance(Duration duration) {
        Objects.requireNonNull(duration, "duration must not be null");
        if (duration.isNegative()) {
            throw new IllegalArgumentException("Cannot advance simulation clock backwards in time: " + duration);
        }
        this.currentEpoch = this.currentEpoch.plus(duration);
        return this.currentEpoch;
    }

    /**
     * Resets the simulation clock back to its initial base epoch.
     */
    public synchronized void reset() {
        this.currentEpoch = this.baseEpoch;
    }

    public synchronized Instant getCurrentEpoch() {
        return currentEpoch;
    }

    public synchronized Instant getBaseEpoch() {
        return baseEpoch;
    }

    public synchronized Duration getElapsedDuration() {
        return Duration.between(baseEpoch, currentEpoch);
    }

    public synchronized double getElapsedSeconds() {
        return getElapsedDuration().toNanos() / 1.0e9;
    }
}
