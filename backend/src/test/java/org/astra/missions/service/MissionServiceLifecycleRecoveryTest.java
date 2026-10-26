package org.astra.missions.service;

import org.astra.commands.CommandHistoryService;
import org.astra.events.SimulationEventPublisher;
import org.astra.missions.domain.*;
import org.astra.missions.dto.CreateMissionRequest;
import org.astra.persistence.entity.MissionRunEntity;
import org.astra.persistence.repository.MissionDefinitionRepository;
import org.astra.persistence.repository.MissionRunRepository;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("prod")
class MissionServiceLifecycleRecoveryTest {

    @Autowired
    private MissionService missionService;

    @Autowired
    private SimulationEngine simulationEngine;

    @Autowired
    private TelemetryService telemetryService;

    @Autowired
    private CommandHistoryService commandHistoryService;

    @Autowired
    private Optional<SimulationEventPublisher> eventPublisher;

    @Autowired
    private Optional<MissionDefinitionRepository> missionDefinitionRepository;

    @Autowired
    private Optional<MissionRunRepository> missionRunRepository;

    @org.junit.jupiter.api.BeforeEach
    void setupIsolation() {
        if (missionRunRepository.isPresent()) {
            missionRunRepository.get().deleteAll();
        }
        if (missionService != null) {
            missionService.clearHistoryForTesting();
        }
    }

    @Test
    @DisplayName("DestinationCompatibilityValidator authoritatively enforces destination fleets")
    void testDestinationCompatibilityValidator() {
        // Earth fleet
        assertTrue(DestinationCompatibilityValidator.isCompatible("AURA-1", "Earth (LEO)", "Earth"));
        assertTrue(DestinationCompatibilityValidator.isCompatible("TERRA-OBS", "Earth Orbit", "Earth"));
        assertFalse(DestinationCompatibilityValidator.isCompatible("AURA-1", "Mars (Surface)", "Mars"));
        assertFalse(DestinationCompatibilityValidator.isCompatible("AURA-1", "Sun Corona", "Solar"));

        // Mars fleet
        assertTrue(DestinationCompatibilityValidator.isCompatible("MRO-ORBITER", "Mars (Polar)", "Mars"));
        assertTrue(DestinationCompatibilityValidator.isCompatible("PERSEVERANCE-RELAY", "Mars", "Mars"));
        assertFalse(DestinationCompatibilityValidator.isCompatible("MRO-ORBITER", "Earth LEO", "Earth"));

        // Solar fleet
        assertTrue(DestinationCompatibilityValidator.isCompatible("PARKER-SOLAR-01", "Sun", "Solar"));
        assertTrue(DestinationCompatibilityValidator.isCompatible("SOHO-OBSERVER", "Solar Corona", "Solar"));
        assertFalse(DestinationCompatibilityValidator.isCompatible("PARKER-SOLAR-01", "Moon", "Lunar & Deep Space"));

        // Outer Planets fleet
        assertTrue(DestinationCompatibilityValidator.isCompatible("CASSINI-O", "Titan", "Outer Planets"));
        assertTrue(DestinationCompatibilityValidator.isCompatible("EUROPA-CLIPPER", "Europa", "Outer Planets"));
        assertFalse(DestinationCompatibilityValidator.isCompatible("CASSINI-O", "Earth", "Earth"));
    }

    @Test
    @DisplayName("Creating mission with incompatible spacecraft throws IllegalArgumentException")
    void testCreateMissionIncompatibleThrows() {
        CreateMissionRequest request = new CreateMissionRequest(
                "MSN-TEST-FAIL-01",
                "Invalid Mars Satellite",
                "Mars (Areostationary)",
                "Mars",
                MissionCategory.PLANETARY_RECONNAISSANCE,
                MissionDifficulty.STANDARD,
                "AURA-1", // AURA-1 is Earth-assigned!
                30,
                "LOW",
                "Should fail due to incompatible spacecraft.",
                List.of("Test objective"),
                List.of("Test criteria"),
                List.of("Test constraint"),
                true
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                missionService.createMission(request)
        );
        assertTrue(ex.getMessage().contains("not compatible with destination"));
    }

    @Test
    @DisplayName("Mission state machine enforces terminal run invariants")
    void testStateMachineTerminalInvariants() {
        // 1. Start mission
        MissionRun run = missionService.startMission("EARTH-DEBRIS-TERRA", "operator", true);
        assertNotNull(run);
        assertEquals(MissionStatus.ACTIVE, run.status());

        // 2. Aborting active run succeeds
        MissionRun aborted = missionService.abortMission(run.runId(), "Operational test abort");
        assertEquals(MissionStatus.ABORTED, aborted.status());

        // 3. Cannot abort an already aborted run
        IllegalStateException exAbort = assertThrows(IllegalStateException.class, () ->
                missionService.abortMission(run.runId(), "Second abort")
        );
        assertTrue(exAbort.getMessage().contains("cannot be aborted because its status is ABORTED"));

        // 4. Cannot complete an aborted run
        IllegalStateException exComplete = assertThrows(IllegalStateException.class, () ->
                missionService.evaluateAndComplete(run.runId())
        );
        assertTrue(exComplete.getMessage().contains("cannot be completed because its status is ABORTED"));
    }

    @Test
    @DisplayName("Startup Recovery Policy cleans up multiple active runs and restores at most one")
    void testStartupRecoveryPolicyWithOrphanedRuns() {
        if (missionRunRepository.isEmpty()) return;
        MissionRunRepository repo = missionRunRepository.get();

        // Simulate an ungraceful shutdown where 2 runs were left in ACTIVE state
        Instant t1 = Instant.now().minusSeconds(120);
        Instant t2 = Instant.now().minusSeconds(60);

        String runOld = "recovery-test-old-" + System.currentTimeMillis();
        String runNew = "recovery-test-new-" + System.currentTimeMillis();

        MissionRunEntity entityOld = new MissionRunEntity(
                runOld,
                "EARTH-OBS-AURA",
                "AURA-1",
                "Earth (Sun-Synchronous LEO, 702 km)",
                "Earth",
                "ACTIVE",
                t1,
                null,
                5,
                2,
                "Active before crash 1",
                "{}",
                "operator"
        );

        MissionRunEntity entityNew = new MissionRunEntity(
                runNew,
                "EARTH-DEBRIS-TERRA",
                "TERRA-OBS",
                "Earth (LEO Mid-Inclination, 502 km)",
                "Earth",
                "ACTIVE",
                t2,
                null,
                10,
                3,
                "Active before crash 2",
                "{}",
                "operator"
        );

        repo.save(entityOld);
        repo.save(entityNew);

        // Instantiate a new MissionService to simulate restart hydration
        MissionService restartService = new MissionService(
                simulationEngine,
                telemetryService,
                commandHistoryService,
                eventPublisher,
                missionDefinitionRepository,
                missionRunRepository
        );

        // Verify recovery policy:
        // Exactly ONE run should be active: the latest one (entityNew with t2)
        Optional<MissionRun> activeOpt = restartService.getActiveRun();
        assertTrue(activeOpt.isPresent(), "Expected an active run restored by recovery policy");
        assertEquals(runNew, activeOpt.get().runId(), "Latest active run should be restored as active");

        // The older active run must have been transitioned to ABORTED with recovery reason
        Optional<MissionRun> oldRunRecovered = restartService.getRun(runOld);
        assertTrue(oldRunRecovered.isPresent());
        assertEquals(MissionStatus.ABORTED, oldRunRecovered.get().status());
        assertTrue(oldRunRecovered.get().outcomeSummary().contains("Terminated by startup recovery supervisor"));

        // Clean up
        restartService.abortMission(runNew, "Test recovery cleanup complete");
    }
}
