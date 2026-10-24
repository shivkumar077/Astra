package org.astra.api.dto;

import org.astra.simulation.engine.SimulationLifecycle;

import java.time.Instant;

public record SimulationStatusResponse(
        SimulationLifecycle lifecycle,
        Instant currentEpoch,
        Instant baseEpoch,
        double elapsedSeconds,
        int spacecraftCount
) {}
