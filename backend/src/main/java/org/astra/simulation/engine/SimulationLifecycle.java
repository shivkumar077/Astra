package org.astra.simulation.engine;

/**
 * Authoritative lifecycle states of the ASTRA simulation engine.
 */
public enum SimulationLifecycle {
    /**
     * Simulation instance initialized with fleet configuration, ready to advance.
     */
    CREATED,

    /**
     * Active simulation state advancing through discrete simulation time steps.
     */
    RUNNING,

    /**
     * Simulation advancement suspended; states and clock held static.
     */
    PAUSED,

    /**
     * Simulation terminated; cannot be advanced further without re-initialization.
     */
    STOPPED
}
