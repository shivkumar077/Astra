package org.astra.events;

import java.time.Instant;
import java.util.Map;

/**
 * Functional interface for publishing simulation events.
 */
@FunctionalInterface
public interface SimulationEventPublisher {

    /**
     * Publishes a simulation event.
     *
     * @param event The event to publish
     */
    void publish(SimulationEvent event);

    /**
     * Helper to construct and publish an event using default sequence number.
     */
    default SimulationEvent publish(
            SimulationEventType type,
            Instant simulationEpoch,
            String spacecraftId,
            String summary,
            Map<String, Object> details
    ) {
        SimulationEvent event = SimulationEvent.of(0L, type, simulationEpoch, spacecraftId, summary, details);
        publish(event);
        return event;
    }

    /**
     * Helper to construct and publish an event using default empty details map.
     */
    default SimulationEvent publish(
            SimulationEventType type,
            Instant simulationEpoch,
            String spacecraftId,
            String summary
    ) {
        return publish(type, simulationEpoch, spacecraftId, summary, Map.of());
    }
}
