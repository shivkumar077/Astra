package org.astra.api.controller;

import jakarta.validation.Valid;
import org.astra.api.dto.AdvanceSimulationRequest;
import org.astra.api.dto.SimulationStatusResponse;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.simulation.scheduler.ContinuousSimulationScheduler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/simulation")
public class SimulationController {

    private final SimulationEngine simulationEngine;
    private final ContinuousSimulationScheduler scheduler;

    @Autowired
    public SimulationController(
            SimulationEngine simulationEngine,
            Optional<ContinuousSimulationScheduler> scheduler
    ) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
        this.scheduler = scheduler.orElse(null);
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

    @GetMapping("/continuous/status")
    public ResponseEntity<Map<String, Object>> getContinuousStatus() {
        if (scheduler == null) {
            return ResponseEntity.ok(Map.of("supported", false));
        }
        return ResponseEntity.ok(scheduler.getStatus());
    }

    @PostMapping("/continuous/start")
    public ResponseEntity<Map<String, Object>> startContinuous(
            @RequestParam(defaultValue = "1.0") double tickRateHz,
            @RequestParam(defaultValue = "1.0") double stepSeconds
    ) {
        if (scheduler == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Continuous scheduler not enabled"));
        }
        scheduler.start(tickRateHz, stepSeconds);
        return ResponseEntity.ok(scheduler.getStatus());
    }

    @PostMapping("/continuous/stop")
    public ResponseEntity<Map<String, Object>> stopContinuous() {
        if (scheduler == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Continuous scheduler not enabled"));
        }
        scheduler.stop();
        return ResponseEntity.ok(scheduler.getStatus());
    }
}
