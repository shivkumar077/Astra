package org.astra.api.controller;

import org.astra.events.EventBroadcaster;
import org.astra.events.SimulationEvent;
import org.astra.events.SimulationEventType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * REST controller for querying the authoritative simulation event log.
 */
@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventBroadcaster eventBroadcaster;

    @Autowired
    public EventController(EventBroadcaster eventBroadcaster) {
        this.eventBroadcaster = eventBroadcaster;
    }

    @GetMapping
    public ResponseEntity<List<SimulationEvent>> getEvents(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String spacecraftId,
            @RequestParam(required = false) SimulationEventType type
    ) {
        List<SimulationEvent> events = eventBroadcaster.getRecentEvents(
                limit,
                Optional.ofNullable(spacecraftId),
                Optional.ofNullable(type)
        );
        return ResponseEntity.ok(events);
    }
}
