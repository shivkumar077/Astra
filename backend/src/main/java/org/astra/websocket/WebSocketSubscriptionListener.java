package org.astra.websocket;

import org.astra.api.dto.SpacecraftDetailResponse;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetrySnapshot;
import org.astra.websocket.dto.FleetTelemetryFrame;
import org.astra.websocket.dto.SimulationSnapshotMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.List;
import java.util.Objects;

/**
 * Event listener that immediately pushes an initial authoritative state snapshot
 * when a client subscribes to /topic/simulation or /topic/telemetry.
 */
@Component
public class WebSocketSubscriptionListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final SimulationEngine simulationEngine;

    @Autowired
    public WebSocketSubscriptionListener(SimpMessagingTemplate messagingTemplate, SimulationEngine simulationEngine) {
        this.messagingTemplate = Objects.requireNonNull(messagingTemplate, "messagingTemplate must not be null");
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
    }

    @EventListener
    public void handleSubscription(SessionSubscribeEvent event) {
        StompHeaderAccessor headers = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headers.getDestination();
        if (destination == null) {
            return;
        }

        if ("/topic/simulation".equals(destination)) {
            List<SpacecraftDetailResponse> fleet = simulationEngine.getAllSpacecraft().stream()
                    .map(SpacecraftDetailResponse::fromSpacecraft)
                    .toList();
            SimulationSnapshotMessage snapshot = new SimulationSnapshotMessage(
                    simulationEngine.getLifecycle(),
                    simulationEngine.getCurrentEpoch(),
                    simulationEngine.getBaseEpoch(),
                    simulationEngine.getElapsedSeconds(),
                    fleet
            );
            messagingTemplate.convertAndSend("/topic/simulation", snapshot);
        } else if ("/topic/telemetry".equals(destination)) {
            List<TelemetrySnapshot> snapshots = simulationEngine.getAllSpacecraft().stream()
                    .map(TelemetrySnapshot::fromSpacecraft)
                    .toList();
            FleetTelemetryFrame frame = new FleetTelemetryFrame(
                    simulationEngine.getCurrentEpoch(),
                    simulationEngine.getElapsedSeconds(),
                    simulationEngine.getLifecycle(),
                    snapshots
            );
            messagingTemplate.convertAndSend("/topic/telemetry", frame);
        }
    }
}
