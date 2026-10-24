package org.astra.websocket.dto;

import org.astra.api.dto.SpacecraftDetailResponse;
import org.astra.simulation.engine.SimulationLifecycle;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Initial state snapshot message sent to newly connected or subscribing WebSocket clients.
 */
public record SimulationSnapshotMessage(
        SimulationLifecycle lifecycle,
        Instant currentEpoch,
        Instant baseEpoch,
        double elapsedSeconds,
        List<SpacecraftDetailResponse> fleet
) {

    public SimulationSnapshotMessage {
        Objects.requireNonNull(lifecycle, "lifecycle must not be null");
        Objects.requireNonNull(currentEpoch, "currentEpoch must not be null");
        Objects.requireNonNull(baseEpoch, "baseEpoch must not be null");
        fleet = fleet == null ? Collections.emptyList() : Collections.unmodifiableList(fleet);
    }

    public int spacecraftCount() {
        return fleet != null ? fleet.size() : 0;
    }
}
