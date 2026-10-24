package org.astra.api.controller;

import jakarta.validation.Valid;
import org.astra.api.dto.*;
import org.astra.commands.CommandDispatcher;
import org.astra.commands.CommandRequest;
import org.astra.commands.CommandResult;
import org.astra.core.domain.Spacecraft;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetryService;
import org.astra.telemetry.TelemetrySnapshot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/spacecraft")
public class SpacecraftController {

    private final SimulationEngine simulationEngine;
    private final CommandDispatcher commandDispatcher;
    private final TelemetryService telemetryService;

    @Autowired
    public SpacecraftController(
            SimulationEngine simulationEngine,
            CommandDispatcher commandDispatcher,
            TelemetryService telemetryService
    ) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
        this.commandDispatcher = Objects.requireNonNull(commandDispatcher, "commandDispatcher must not be null");
        this.telemetryService = Objects.requireNonNull(telemetryService, "telemetryService must not be null");
    }

    @GetMapping
    public ResponseEntity<List<SpacecraftSummaryResponse>> listSpacecraft() {
        List<SpacecraftSummaryResponse> summaries = simulationEngine.getAllSpacecraft().stream()
                .map(SpacecraftSummaryResponse::fromSpacecraft)
                .toList();
        return ResponseEntity.ok(summaries);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpacecraftDetailResponse> getSpacecraftDetail(@PathVariable String id) {
        Spacecraft sc = simulationEngine.getSpacecraft(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Spacecraft not found: " + id));
        return ResponseEntity.ok(SpacecraftDetailResponse.fromSpacecraft(sc));
    }

    @PostMapping("/{id}/commands")
    public ResponseEntity<CommandResponse> submitCommand(
            @PathVariable String id,
            @Valid @RequestBody SubmitCommandRequest request
    ) {
        // Confirm spacecraft exists before dispatching
        if (simulationEngine.getSpacecraft(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Spacecraft not found: " + id);
        }

        CommandRequest cmdReq = new CommandRequest(
                null,
                id,
                request.type(),
                request.parameters(),
                Instant.now()
        );

        CommandResult result = commandDispatcher.dispatch(cmdReq);
        return ResponseEntity.ok(CommandResponse.fromResult(result));
    }

    @GetMapping("/{id}/telemetry")
    public ResponseEntity<List<TelemetryResponse>> getRecentTelemetry(
            @PathVariable String id,
            @RequestParam(defaultValue = "20") int limit
    ) {
        if (simulationEngine.getSpacecraft(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Spacecraft not found: " + id);
        }

        List<TelemetryResponse> snapshots = telemetryService.getRecentSnapshots(id, limit).stream()
                .map(TelemetryResponse::fromSnapshot)
                .toList();
        return ResponseEntity.ok(snapshots);
    }
}
