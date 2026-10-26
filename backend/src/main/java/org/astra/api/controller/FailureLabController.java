package org.astra.api.controller;

import jakarta.validation.Valid;
import org.astra.anomalies.FailureLabService;
import org.astra.anomalies.FaultLifecycleState;
import org.astra.anomalies.FaultRecord;
import org.astra.anomalies.SubsystemType;
import org.astra.anomalies.dto.FaultScenarioMetadata;
import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.anomalies.dto.SubsystemsHealthResponse;
import org.astra.core.domain.Spacecraft;
import org.astra.simulation.engine.SimulationEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Authoritative REST controller for the ASTRA Failure Lab & Fault-Recovery Simulation.
 * Exposes scenario catalogs, fault injection, real-time subsystem state evaluation,
 * validated recovery procedures, and audit histories.
 */
@RestController
@RequestMapping("/api/v1")
public class FailureLabController {

    private final FailureLabService failureLabService;
    private final SimulationEngine simulationEngine;

    @Autowired
    public FailureLabController(FailureLabService failureLabService, SimulationEngine simulationEngine) {
        this.failureLabService = failureLabService;
        this.simulationEngine = simulationEngine;
    }

    /**
     * Lists all supported Failure Lab fault scenarios across all 6 subsystem domains.
     */
    @GetMapping("/faults/scenarios")
    public ResponseEntity<List<FaultScenarioMetadata>> getScenarios() {
        return ResponseEntity.ok(failureLabService.getScenarios());
    }

    /**
     * Lists active and historical faults with optional filtering by spacecraft, subsystem domain, or lifecycle state.
     */
    @GetMapping("/faults")
    public ResponseEntity<List<FaultRecord>> listFaults(
            @RequestParam(required = false) String spacecraftId,
            @RequestParam(required = false) SubsystemType subsystem,
            @RequestParam(required = false) FaultLifecycleState state
    ) {
        return ResponseEntity.ok(failureLabService.listFaults(
                Optional.ofNullable(spacecraftId),
                Optional.ofNullable(subsystem),
                Optional.ofNullable(state)
        ));
    }

    /**
     * Retrieves full details and lifecycle state of a specific fault.
     */
    @GetMapping("/faults/{id}")
    public ResponseEntity<FaultRecord> getFault(@PathVariable String id) {
        return failureLabService.getFault(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fault record not found: " + id));
    }

    /**
     * Injects a supported fault scenario onto a target spacecraft in the authoritative fleet.
     */
    @PostMapping("/faults/inject")
    public ResponseEntity<FaultRecord> injectFault(@Valid @RequestBody InjectFaultRequest request) {
        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(request.spacecraftId());
        if (scOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Target spacecraft not found: " + request.spacecraftId());
        }

        Instant epoch = simulationEngine.getCurrentEpoch();
        FaultRecord fault = failureLabService.injectFault(request, epoch, scOpt.get());
        simulationEngine.syncSpacecraftTelemetry(scOpt.get());
        return ResponseEntity.status(HttpStatus.CREATED).body(fault);
    }

    /**
     * Executes a validated recovery procedure on an active or detected fault.
     */
    @PostMapping("/faults/{id}/recover")
    public ResponseEntity<FaultRecord> recoverFault(
            @PathVariable String id,
            @Valid @RequestBody RecoverFaultRequest request
    ) {
        Optional<FaultRecord> faultOpt = failureLabService.getFault(id);
        if (faultOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fault record not found: " + id);
        }

        FaultRecord fault = faultOpt.get();
        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(fault.spacecraftId());
        if (scOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Target spacecraft not found: " + fault.spacecraftId());
        }

        Instant epoch = simulationEngine.getCurrentEpoch();
        try {
            FaultRecord recovered = failureLabService.recoverFault(id, request, epoch, scOpt.get());
            simulationEngine.syncSpacecraftTelemetry(scOpt.get());
            return ResponseEntity.ok(recovered);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    /**
     * Clears a fault alert.
     * Note: In accordance with spacecraft operations safety standards, clearing an alert does NOT
     * automatically repair underlying physical hardware.
     */
    @DeleteMapping("/faults/{id}")
    public ResponseEntity<Map<String, Object>> deleteFaultAlert(@PathVariable String id) {
        return clearFaultAlertInternal(id);
    }

    @PostMapping("/faults/{id}/clear")
    public ResponseEntity<Map<String, Object>> clearFaultAlertPost(@PathVariable String id) {
        return clearFaultAlertInternal(id);
    }

    private ResponseEntity<Map<String, Object>> clearFaultAlertInternal(String id) {
        Instant epoch = simulationEngine.getCurrentEpoch();
        try {
            FaultRecord cleared = failureLabService.clearFaultAlert(id, epoch);
            return ResponseEntity.ok(Map.of(
                    "cleared", true,
                    "status", "CLEARED",
                    "faultId", cleared.faultId(),
                    "clearedEpoch", epoch.toString(),
                    "note", "Alert cleared. Subsystem physical state is preserved and not automatically repaired."
            ));
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fault not found: " + id);
        }
    }

    /**
     * Inspects full 6-subsystem health metrics and telemetry for a specific spacecraft.
     */
    @GetMapping("/spacecraft/{id}/subsystems")
    public ResponseEntity<SubsystemsHealthResponse> getSubsystemsHealth(@PathVariable String id) {
        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(id);
        if (scOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Spacecraft not found: " + id);
        }

        Spacecraft sc = scOpt.get();
        List<FaultRecord> active = failureLabService.getActiveFaultsForSpacecraft(id);
        List<String> activeIds = active.stream().map(FaultRecord::faultId).toList();

        return ResponseEntity.ok(new SubsystemsHealthResponse(
                sc.getId(),
                sc.getCallSign(),
                sc.getCurrentOrbitState().epoch(),
                sc.getOperationalStatus(),
                sc.getSubsystems(),
                activeIds,
                activeIds.size()
        ));
    }
}
