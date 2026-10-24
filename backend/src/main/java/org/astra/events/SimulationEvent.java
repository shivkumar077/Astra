package org.astra.events;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable domain event representing an authoritative change in simulation, vehicle, command, or telemetry state.
 */
public record SimulationEvent(
        String eventId,
        long sequenceNumber,
        SimulationEventType type,
        Instant simulationEpoch,
        Instant wallClockTimestamp,
        String spacecraftId,
        String summary,
        Map<String, Object> details
) {

    public SimulationEvent {
        Objects.requireNonNull(eventId, "eventId must not be null");
        Objects.requireNonNull(type, "type must not be null");
        Objects.requireNonNull(simulationEpoch, "simulationEpoch must not be null");
        Objects.requireNonNull(wallClockTimestamp, "wallClockTimestamp must not be null");
        Objects.requireNonNull(summary, "summary must not be null");
        details = details == null ? Collections.emptyMap() : Collections.unmodifiableMap(details);
    }

    public static SimulationEvent of(
            long sequenceNumber,
            SimulationEventType type,
            Instant simulationEpoch,
            String spacecraftId,
            String summary,
            Map<String, Object> details
    ) {
        return new SimulationEvent(
                UUID.randomUUID().toString(),
                sequenceNumber,
                type,
                simulationEpoch,
                Instant.now(),
                spacecraftId,
                summary,
                details
        );
    }
}
