package org.astra.websocket;

import org.astra.api.dto.SimulationStatusResponse;
import org.astra.simulation.engine.SimulationLifecycle;
import org.astra.telemetry.TelemetrySnapshot;
import org.astra.websocket.dto.FleetTelemetryFrame;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service responsible for streaming server-authoritative fleet telemetry and lifecycle frames over STOMP topics.
 */
@Service
public class TelemetryStreamBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public TelemetryStreamBroadcaster(Optional<SimpMessagingTemplate> messagingTemplate) {
        this.messagingTemplate = messagingTemplate.orElse(null);
    }

    /**
     * Broadcasts a synchronized fleet telemetry frame to /topic/telemetry and per-spacecraft topics.
     */
    public void broadcastFleetTelemetry(
            Instant epoch,
            double elapsedSeconds,
            SimulationLifecycle lifecycle,
            List<TelemetrySnapshot> snapshots
    ) {
        if (messagingTemplate == null) {
            return;
        }

        Objects.requireNonNull(epoch, "epoch must not be null");
        Objects.requireNonNull(lifecycle, "lifecycle must not be null");
        Objects.requireNonNull(snapshots, "snapshots must not be null");

        FleetTelemetryFrame frame = new FleetTelemetryFrame(epoch, elapsedSeconds, lifecycle, snapshots);

        try {
            // 1. Broadcast synchronized fleet frame
            messagingTemplate.convertAndSend("/topic/telemetry", frame);

            // 2. Broadcast individual spacecraft frames to craft-specific topics
            for (TelemetrySnapshot snapshot : snapshots) {
                messagingTemplate.convertAndSend("/topic/telemetry/" + snapshot.spacecraftId(), snapshot);
            }
        } catch (Exception e) {
            // Safe fallback: slow or disconnected consumers do not crash simulation engine
        }
    }

    /**
     * Broadcasts a simulation lifecycle/clock update to /topic/simulation.
     */
    public void broadcastSimulationStatus(SimulationStatusResponse status) {
        if (messagingTemplate == null || status == null) {
            return;
        }

        try {
            messagingTemplate.convertAndSend("/topic/simulation", status);
        } catch (Exception e) {
            // Absorb transport exception
        }
    }
}
