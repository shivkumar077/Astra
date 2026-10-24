package org.astra.events;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe event broadcaster maintaining monotonic sequence ordering and a bounded in-memory audit ring.
 * Broadcasts events to subscribed WebSocket clients over /topic/events.
 */
@Service
public class EventBroadcaster implements SimulationEventPublisher {

    private final AtomicLong sequenceCounter = new AtomicLong(1);
    private final int bufferCapacity;
    private final Deque<SimulationEvent> eventBuffer = new ConcurrentLinkedDeque<>();
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public EventBroadcaster(Optional<SimpMessagingTemplate> messagingTemplate) {
        this(messagingTemplate.orElse(null), 1000);
    }

    public EventBroadcaster(SimpMessagingTemplate messagingTemplate, int bufferCapacity) {
        this.messagingTemplate = messagingTemplate;
        this.bufferCapacity = Math.max(50, bufferCapacity);
    }

    @Override
    public void publish(SimulationEvent event) {
        Objects.requireNonNull(event, "event must not be null");

        // Append to bounded circular buffer
        eventBuffer.addFirst(event);
        while (eventBuffer.size() > bufferCapacity) {
            eventBuffer.pollLast();
        }

        // Push to WebSocket if messagingTemplate is active
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend("/topic/events", event);
            } catch (Exception e) {
                // Log and absorb to prevent WebSocket dispatch issues from failing simulation state
            }
        }
    }

    @Override
    public SimulationEvent publish(
            SimulationEventType type,
            Instant simulationEpoch,
            String spacecraftId,
            String summary,
            Map<String, Object> details
    ) {
        long seq = sequenceCounter.getAndIncrement();
        SimulationEvent event = SimulationEvent.of(seq, type, simulationEpoch, spacecraftId, summary, details);
        publish(event);
        return event;
    }

    /**
     * Retrieves recent events with optional filtering.
     */
    public List<SimulationEvent> getRecentEvents(
            int limit,
            Optional<String> spacecraftId,
            Optional<SimulationEventType> type
    ) {
        int max = Math.max(1, Math.min(limit, bufferCapacity));
        return eventBuffer.stream()
                .filter(e -> spacecraftId.isEmpty() || Objects.equals(e.spacecraftId(), spacecraftId.get()))
                .filter(e -> type.isEmpty() || e.type() == type.get())
                .limit(max)
                .toList();
    }

    public void clear() {
        eventBuffer.clear();
    }

    public long getCurrentSequence() {
        return sequenceCounter.get();
    }
}
