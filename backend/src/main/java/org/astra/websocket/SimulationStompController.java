package org.astra.websocket;

import org.astra.api.dto.AdvanceSimulationRequest;
import org.astra.api.dto.CommandResponse;
import org.astra.api.dto.SpacecraftDetailResponse;
import org.astra.api.dto.SubmitCommandRequest;
import org.astra.commands.CommandDispatcher;
import org.astra.commands.CommandRequest;
import org.astra.commands.CommandResult;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetryService;
import org.astra.telemetry.TelemetrySnapshot;
import org.astra.websocket.dto.FleetTelemetryFrame;
import org.astra.websocket.dto.SimulationSnapshotMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * STOMP controller handling subscription handshakes, initial snapshot delivery, and inbound WebSocket messages.
 */
@Controller
public class SimulationStompController {

    private final SimulationEngine simulationEngine;
    private final CommandDispatcher commandDispatcher;
    private final TelemetryService telemetryService;

    @Autowired
    public SimulationStompController(
            SimulationEngine simulationEngine,
            CommandDispatcher commandDispatcher,
            TelemetryService telemetryService
    ) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
        this.commandDispatcher = Objects.requireNonNull(commandDispatcher, "commandDispatcher must not be null");
        this.telemetryService = Objects.requireNonNull(telemetryService, "telemetryService must not be null");
    }

    /**
     * Initial snapshot delivered immediately to a client subscribing to /topic/simulation.
     */
    @SubscribeMapping("/topic/simulation")
    public SimulationSnapshotMessage getInitialSimulationSnapshot() {
        List<SpacecraftDetailResponse> fleetDetails = simulationEngine.getAllSpacecraft().stream()
                .map(SpacecraftDetailResponse::fromSpacecraft)
                .toList();

        return new SimulationSnapshotMessage(
                simulationEngine.getLifecycle(),
                simulationEngine.getCurrentEpoch(),
                simulationEngine.getBaseEpoch(),
                simulationEngine.getElapsedSeconds(),
                fleetDetails
        );
    }

    /**
     * Initial fleet telemetry delivered immediately to a client subscribing to /topic/telemetry.
     */
    @SubscribeMapping("/topic/telemetry")
    public FleetTelemetryFrame getInitialFleetTelemetry() {
        List<TelemetrySnapshot> snapshots = simulationEngine.getAllSpacecraft().stream()
                .map(TelemetrySnapshot::fromSpacecraft)
                .toList();

        return new FleetTelemetryFrame(
                simulationEngine.getCurrentEpoch(),
                simulationEngine.getElapsedSeconds(),
                simulationEngine.getLifecycle(),
                snapshots
        );
    }

    /**
     * Inbound message to retrieve current snapshot on-demand: /app/simulation/snapshot
     */
    @MessageMapping("/simulation/snapshot")
    public SimulationSnapshotMessage requestSnapshot() {
        return getInitialSimulationSnapshot();
    }

    /**
     * Inbound message to advance simulation time: /app/simulation/advance
     */
    @MessageMapping("/simulation/advance")
    public SimulationSnapshotMessage advanceSimulation(@Payload AdvanceSimulationRequest request) {
        long nanos = (long) (request.durationSeconds() * 1.0e9);
        simulationEngine.step(Duration.ofNanos(nanos));
        return getInitialSimulationSnapshot();
    }

    /**
     * Inbound message to dispatch telecommand over WebSocket: /app/spacecraft/{id}/command
     */
    @MessageMapping("/spacecraft/{id}/command")
    public CommandResponse submitCommandViaWebSocket(
            @DestinationVariable String id,
            @Payload SubmitCommandRequest request
    ) {
        CommandRequest cmdReq = new CommandRequest(
                null,
                id,
                request.type(),
                request.parameters(),
                Instant.now()
        );

        CommandResult result = commandDispatcher.dispatch(cmdReq);
        return CommandResponse.fromResult(result);
    }
}
