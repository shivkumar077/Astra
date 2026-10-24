package org.astra.events;

import jakarta.annotation.PostConstruct;
import org.astra.persistence.JsonUtils;
import org.astra.persistence.entity.SimulationEventEntity;
import org.astra.persistence.repository.SimulationEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe event broadcaster maintaining monotonic sequence ordering and a bounded audit ring.
 * Broadcasts events to subscribed WebSocket clients over /topic/events and persists to SimulationEventRepository.
 */
@Service
public class EventBroadcaster implements SimulationEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(EventBroadcaster.class);

    private final AtomicLong sequenceCounter = new AtomicLong(1);
    private final int bufferCapacity;
    private final Deque<SimulationEvent> eventBuffer = new ConcurrentLinkedDeque<>();
    private final SimpMessagingTemplate messagingTemplate;
    private final SimulationEventRepository eventRepository;

    public EventBroadcaster() {
        this((SimpMessagingTemplate) null, 1000, null);
    }

    public EventBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this(messagingTemplate, 1000, null);
    }

    public EventBroadcaster(SimpMessagingTemplate messagingTemplate, int bufferCapacity) {
        this(messagingTemplate, bufferCapacity, null);
    }

    @Autowired
    public EventBroadcaster(
            Optional<SimpMessagingTemplate> messagingTemplate,
            Optional<SimulationEventRepository> eventRepository
    ) {
        this(messagingTemplate.orElse(null), 1000, eventRepository.orElse(null));
    }

    public EventBroadcaster(
            SimpMessagingTemplate messagingTemplate,
            int bufferCapacity,
            SimulationEventRepository eventRepository
    ) {
        this.messagingTemplate = messagingTemplate;
        this.bufferCapacity = Math.max(50, bufferCapacity);
        this.eventRepository = eventRepository;
    }

    @PostConstruct
    public void initFromDatabase() {
        if (eventRepository == null) {
            return;
        }
        try {
            // Restore monotonic sequence number from highest persisted sequence
            eventRepository.findTopByOrderBySequenceNumberDesc().ifPresent(latest -> {
                sequenceCounter.set(latest.getSequenceNumber() + 1);
                log.info("Restored simulation event sequence counter to {} from database.", sequenceCounter.get());
            });

            // Hydrate in-memory buffer with recent durable events
            List<SimulationEventEntity> persisted = eventRepository.findTop1000ByOrderBySequenceNumberDesc();
            if (persisted != null && !persisted.isEmpty()) {
                List<SimulationEventEntity> chronological = new ArrayList<>(persisted);
                Collections.reverse(chronological);
                for (SimulationEventEntity entity : chronological) {
                    SimulationEvent event = mapToEvent(entity);
                    eventBuffer.addFirst(event);
                }
                while (eventBuffer.size() > bufferCapacity) {
                    eventBuffer.pollLast();
                }
                log.info("Hydrated {} durable simulation events from database into in-memory buffer.", persisted.size());
            }
        } catch (Exception e) {
            log.warn("Could not hydrate simulation events from database: {}", e.getMessage());
        }
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

        // Persist to relational database
        if (eventRepository != null) {
            try {
                SimulationEventEntity entity = new SimulationEventEntity(
                        event.eventId(),
                        event.sequenceNumber(),
                        event.type().name(),
                        event.simulationEpoch(),
                        event.spacecraftId(),
                        event.summary(),
                        JsonUtils.toJson(event.details())
                );
                eventRepository.save(entity);
            } catch (Exception e) {
                log.error("Failed to persist simulation event {}: {}", event.eventId(), e.getMessage());
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

    private SimulationEvent mapToEvent(SimulationEventEntity entity) {
        return new SimulationEvent(
                entity.getEventId(),
                entity.getSequenceNumber(),
                SimulationEventType.valueOf(entity.getEventType()),
                entity.getSimulationEpoch(),
                entity.getCreatedAt(),
                entity.getSpacecraftId(),
                entity.getSummary(),
                JsonUtils.fromJson(entity.getDetailsJson())
        );
    }
}
