package org.astra.api.controller;

import jakarta.validation.Valid;
import org.astra.api.dto.AdvanceSimulationRequest;
import org.astra.api.dto.SimulationStatusResponse;
import org.astra.simulation.engine.SimulationEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/simulation")
public class SimulationController {

    private final SimulationEngine simulationEngine;

    @Autowired
    public SimulationController(SimulationEngine simulationEngine) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
    }

    @GetMapping("/status")
    public ResponseEntity<SimulationStatusResponse> getStatus() {
        var response = new SimulationStatusResponse(
                simulationEngine.getLifecycle(),
                simulationEngine.getCurrentEpoch(),
                simulationEngine.getBaseEpoch(),
                simulationEngine.getElapsedSeconds(),
                simulationEngine.getAllSpacecraft().size()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/initialize")
    public ResponseEntity<SimulationStatusResponse> initializeDefaultFleet() {
        simulationEngine.initializeDefaultFleet();
        return getStatus();
    }

    @PostMapping("/advance")
    public ResponseEntity<SimulationStatusResponse> advanceTime(@Valid @RequestBody AdvanceSimulationRequest request) {
        long nanos = (long) (request.durationSeconds() * 1.0e9);
        simulationEngine.step(Duration.ofNanos(nanos));
        return getStatus();
    }

    @PostMapping("/pause")
    public ResponseEntity<SimulationStatusResponse> pauseSimulation() {
        simulationEngine.pause();
        return getStatus();
    }

    @PostMapping("/resume")
    public ResponseEntity<SimulationStatusResponse> resumeSimulation() {
        simulationEngine.resume();
        return getStatus();
    }
}
