package org.astra.websocket.dto;

import org.astra.simulation.engine.SimulationLifecycle;
import org.astra.telemetry.TelemetrySnapshot;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Synchronous fleet telemetry broadcast payload.
 * Guarantees all spacecraft snapshots correspond to the exact same authoritative simulation epoch.
 */
public record FleetTelemetryFrame(
        Instant simulationEpoch,
        double elapsedSeconds,
        SimulationLifecycle lifecycle,
        List<TelemetrySnapshot> fleet
) {

    public FleetTelemetryFrame {
        Objects.requireNonNull(simulationEpoch, "simulationEpoch must not be null");
        Objects.requireNonNull(lifecycle, "lifecycle must not be null");
        fleet = fleet == null ? Collections.emptyList() : Collections.unmodifiableList(fleet);
    }

    public List<TelemetrySnapshot> telemetry() {
        return fleet;
    }

    public int spacecraftCount() {
        return fleet != null ? fleet.size() : 0;
    }
}
