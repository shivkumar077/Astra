package org.astra.api.controller;

import jakarta.validation.Valid;
import org.astra.anomalies.AnomalyManager;
import org.astra.anomalies.AnomalyModifier;
import org.astra.api.dto.InjectAnomalyRequest;
import org.astra.simulation.engine.SimulationEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST controller for managing Failure Lab extension points and active subsystem anomalies.
 */
@RestController
@RequestMapping("/api/v1/anomalies")
public class AnomalyController {

    private final AnomalyManager anomalyManager;
    private final SimulationEngine simulationEngine;

    @Autowired
    public AnomalyController(AnomalyManager anomalyManager, SimulationEngine simulationEngine) {
        this.anomalyManager = anomalyManager;
        this.simulationEngine = simulationEngine;
    }

    @GetMapping
    public ResponseEntity<List<AnomalyModifier>> getActiveAnomalies(
            @RequestParam(required = false) String spacecraftId
    ) {
        return ResponseEntity.ok(anomalyManager.getActiveAnomalies(Optional.ofNullable(spacecraftId)));
    }

    @PostMapping("/inject")
    public ResponseEntity<AnomalyModifier> injectAnomaly(@Valid @RequestBody InjectAnomalyRequest request) {
        // Validate spacecraft existence
        if (simulationEngine.getSpacecraft(request.spacecraftId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Spacecraft not found: " + request.spacecraftId());
        }

        Instant epoch = simulationEngine.getCurrentEpoch();
        AnomalyModifier modifier = AnomalyModifier.of(
                request.spacecraftId(),
                request.subsystem(),
                request.anomalyCode(),
                request.severityFactor(),
                request.blocksCommands(),
                request.description(),
                epoch
        );

        AnomalyModifier injected = anomalyManager.inject(modifier);
        return ResponseEntity.status(HttpStatus.CREATED).body(injected);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAnomaly(@PathVariable String id) {
        return clearAnomalyInternal(id);
    }

    @PostMapping("/{id}/clear")
    public ResponseEntity<Map<String, Object>> clearAnomaly(@PathVariable String id) {
        return clearAnomalyInternal(id);
    }

    private ResponseEntity<Map<String, Object>> clearAnomalyInternal(String id) {
        boolean cleared = anomalyManager.clear(id, simulationEngine.getCurrentEpoch());
        if (!cleared) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active anomaly modifier not found: " + id);
        }
        return ResponseEntity.ok(Map.of(
                "cleared", true,
                "status", "CLEARED",
                "anomalyId", id
        ));
    }
}
