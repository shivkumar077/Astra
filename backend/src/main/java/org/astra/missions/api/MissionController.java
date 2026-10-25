package org.astra.missions.api;

import jakarta.validation.Valid;
import org.astra.missions.domain.MissionCategory;
import org.astra.missions.domain.MissionDifficulty;
import org.astra.missions.domain.MissionRun;
import org.astra.missions.domain.MissionStatus;
import org.astra.missions.dto.CreateMissionRequest;
import org.astra.missions.dto.MissionResponse;
import org.astra.missions.service.MissionService;
import org.astra.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Authoritative REST controller for the ASTRA Mission Universe.
 * Provides mission discovery, pre-flight briefings, interactive simulation starts,
 * authoritative objective evaluation, and historical outcome audits.
 */
@RestController
@RequestMapping("/api/v1/missions")
public class MissionController {

    private final MissionService missionService;

    @Autowired
    public MissionController(MissionService missionService) {
        this.missionService = missionService;
    }

    /**
     * Lists all missions across the Solar System with optional filtering.
     */
    @GetMapping
    public ResponseEntity<List<MissionResponse>> getMissions(
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) MissionCategory category,
            @RequestParam(required = false) MissionDifficulty difficulty,
            @RequestParam(required = false) MissionStatus status
    ) {
        return ResponseEntity.ok(missionService.getMissions(
                Optional.ofNullable(destination),
                Optional.ofNullable(category),
                Optional.ofNullable(difficulty),
                Optional.ofNullable(status)
        ));
    }

    /**
     * Creates and registers a new mission scenario in the Mission Universe.
     */
    @PostMapping
    public ResponseEntity<MissionResponse> createMission(@RequestBody @Valid CreateMissionRequest request) {
        try {
            MissionResponse response = missionService.createMission(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    /**
     * Retrieves detailed pre-flight briefing for a specific mission.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MissionResponse> getMissionBriefing(@PathVariable String id) {
        return missionService.getMission(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found: " + id));
    }

    /**
     * Retrieves the currently active mission and its active run state across the simulator session.
     */
    @GetMapping("/active")
    public ResponseEntity<MissionResponse> getActiveMission() {
        return missionService.getActiveMission()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Starts an interactive mission simulation run on the server-authoritative engine.
     * Enforces single active run policy. If another run is in progress and abortActive is false, returns 409 Conflict.
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<MissionRun> startMission(
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean abortActive
    ) {
        String operator = SecurityUtils.getCurrentUsername().orElse("operator");
        try {
            MissionRun run = missionService.startMission(id, operator, abortActive);
            return ResponseEntity.status(HttpStatus.CREATED).body(run);
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    /**
     * Seamlessly transitions from the currently active mission to a new target scenario.
     * Aborts and archives the current active run, then starts the new scenario.
     */
    @PostMapping("/{id}/switch")
    public ResponseEntity<MissionRun> switchMission(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String operator = SecurityUtils.getCurrentUsername().orElse("operator");
        String reason = body != null ? body.get("reason") : "Switched active mission via Mission Control.";
        try {
            MissionRun run = missionService.switchMission(id, operator, reason);
            return ResponseEntity.status(HttpStatus.OK).body(run);
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    /**
     * Authoritatively verifies live spacecraft telemetry and completes an active mission run.
     */
    @PostMapping("/runs/{runId}/complete")
    public ResponseEntity<MissionRun> completeMission(@PathVariable String runId) {
        try {
            MissionRun completed = missionService.evaluateAndComplete(runId);
            return ResponseEntity.ok(completed);
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    /**
     * Aborts an active mission simulation run.
     */
    @PostMapping("/runs/{runId}/abort")
    public ResponseEntity<MissionRun> abortMission(
            @PathVariable String runId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : "Aborted by operator command.";
        try {
            MissionRun aborted = missionService.abortMission(runId, reason);
            return ResponseEntity.ok(aborted);
        } catch (NoSuchElementException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    /**
     * Retrieves the complete historical audit log of mission runs and verified outcomes.
     */
    @GetMapping("/history")
    public ResponseEntity<List<MissionRun>> getHistory() {
        return ResponseEntity.ok(missionService.getHistory());
    }
}
