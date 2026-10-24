package org.astra.persistence;

import org.astra.anomalies.*;
import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.commands.*;
import org.astra.core.domain.Spacecraft;
import org.astra.events.EventBroadcaster;
import org.astra.events.SimulationEvent;
import org.astra.events.SimulationEventType;
import org.astra.persistence.entity.CommandRecordEntity;
import org.astra.persistence.entity.FaultRecordEntity;
import org.astra.persistence.entity.SpacecraftRecordEntity;
import org.astra.persistence.repository.*;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetryArchiveService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@DisplayName("Phase 5 Persistence, Migrations & Operational Reliability Integration Tests")
class PersistenceAndReliabilityIntegrationTest {

    @Autowired
    private SpacecraftRecordRepository spacecraftRepository;

    @Autowired
    private CommandRecordRepository commandRepository;

    @Autowired
    private FaultRecordRepository faultRepository;

    @Autowired
    private SimulationEventRepository eventRepository;

    @Autowired
    private TelemetrySnapshotRepository telemetrySnapshotRepository;

    @Autowired
    private SimulationEngine simulationEngine;

    @Autowired
    private FailureLabService failureLabService;

    @Autowired
    private CommandHistoryService commandHistoryService;

    @Autowired
    private EventBroadcaster eventBroadcaster;

    @Test
    @DisplayName("Spacecraft baseline fleet is synchronized and persisted in database")
    void testSpacecraftPersistence() {
        List<SpacecraftRecordEntity> fleetEntities = spacecraftRepository.findAllByOrderByCreatedAtAsc();
        assertFalse(fleetEntities.isEmpty(), "Spacecraft table must contain initialized fleet");
        assertTrue(fleetEntities.stream().anyMatch(s -> "AURA-1".equals(s.getId())));
        assertTrue(fleetEntities.stream().anyMatch(s -> "TERRA-OBS".equals(s.getId())));
        assertTrue(fleetEntities.stream().anyMatch(s -> "SOLIS-RELAY".equals(s.getId())));

        SpacecraftRecordEntity aura = spacecraftRepository.findById("AURA-1").orElseThrow();
        assertEquals("AURA-1", aura.getCallSign());
        assertEquals(7080.0, aura.getSemiMajorAxisKm(), 1e-4);
        assertEquals(98.2, aura.getInclinationDeg(), 1e-4);
    }

    @Test
    @DisplayName("Command idempotency survives application restart via database cache hydration")
    void testCommandIdempotencyAcrossRestart() {
        String clientKey = "RESTART-IDEMP-" + UUID.randomUUID();
        String commandId = UUID.randomUUID().toString();
        Instant now = Instant.now();

        CommandRecord record = new CommandRecord(
                commandId,
                clientKey,
                "AURA-1",
                CommandType.TRIGGER_SAFE_MODE,
                Map.of("reason", "Persistence test verification"),
                CommandStatus.EXECUTED,
                now,
                now,
                "Executed successfully",
                Map.of("telemetryValid", true),
                false,
                "flight_controller_1"
        );

        // Record in active service
        commandHistoryService.record(record);

        // Verify entity persisted in repository
        Optional<CommandRecordEntity> persisted = commandRepository.findByClientCommandId(clientKey);
        assertTrue(persisted.isPresent(), "Command must be persisted in database");
        assertEquals("flight_controller_1", persisted.get().getOperatorUsername());

        // Simulate application restart: instantiate a fresh CommandHistoryService
        CommandHistoryService restartedService = new CommandHistoryService(1000, commandRepository);
        restartedService.initFromDatabase();

        // Query the restarted service with the same clientCommandId
        Optional<CommandResult> cachedResult = restartedService.findCachedResult(clientKey);
        assertTrue(cachedResult.isPresent(), "Restarted service must identify cached command");
        assertTrue(cachedResult.get().idempotentReplay(), "Must flag as idempotent replay");
        assertEquals(commandId, cachedResult.get().commandId());
        assertEquals("AURA-1", cachedResult.get().spacecraftId());
    }

    @Test
    @DisplayName("Fault lifecycle history persists through injection, detection, recovery and restart")
    void testFaultLifecyclePersistenceAcrossRestart() {
        Spacecraft aura = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
        Instant now = Instant.now();

        // 1. Inject fault
        InjectFaultRequest injectReq = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.COMMS_LINK_DEGRADATION,
                FaultSeverity.WARNING,
                Map.of("linkMarginDb", 1.5),
                "Simulated margin degradation test"
        );
        FaultRecord fault = failureLabService.injectFault(injectReq, now, aura);

        // Verify persisted in database
        Optional<FaultRecordEntity> persistedInject = faultRepository.findByFaultId(fault.faultId());
        assertTrue(persistedInject.isPresent(), "Injected fault must be in database");
        assertEquals("ACTIVE", persistedInject.get().getLifecycleState());

        // 2. Recover fault
        RecoverFaultRequest recoverReq = new RecoverFaultRequest(
                RecoveryActionType.REALIGN_ANTENNA_GIMBAL,
                "Realigned gimbal back to nominal tracking"
        );
        FaultRecord recovered = failureLabService.recoverFault(fault.faultId(), recoverReq, now.plusSeconds(30), aura);
        assertEquals(FaultLifecycleState.RECOVERED, recovered.lifecycleState());

        // Verify recovered in database
        Optional<FaultRecordEntity> persistedRecover = faultRepository.findByFaultId(fault.faultId());
        assertTrue(persistedRecover.isPresent());
        assertEquals("RECOVERED", persistedRecover.get().getLifecycleState());
        assertNotNull(persistedRecover.get().getRecoveredEpoch());

        // 3. Simulate application restart: instantiate fresh FailureLabService
        FailureLabService restartedLab = new FailureLabService(
                new FaultDetectionEngine(),
                event -> {},
                Optional.of(faultRepository)
        );
        restartedLab.initFromDatabase();

        // Verify recovered fault history survived restart
        Optional<FaultRecord> retrieved = restartedLab.getFault(fault.faultId());
        assertTrue(retrieved.isPresent(), "Recovered fault record must survive restart in history");
        assertEquals(FaultLifecycleState.RECOVERED, retrieved.get().lifecycleState());
        // Verify active faults remain clean on restart (no stale perturbations)
        assertTrue(restartedLab.getActiveFaultsForSpacecraft("AURA-1").isEmpty(), "Active faults must remain isolated on restart");
    }

    @Test
    @DisplayName("Simulation event sequence recovers monotonically across restarts")
    void testSimulationEventSequenceAcrossRestart() {
        long seqBefore = eventBroadcaster.getCurrentSequence();

        // Publish events
        eventBroadcaster.publish(
                SimulationEventType.COMMAND_EXECUTED,
                Instant.now(),
                "AURA-1",
                "Persistence verification event",
                Map.of("testRun", true)
        );

        assertTrue(eventBroadcaster.getCurrentSequence() > seqBefore);

        // Simulate restart
        EventBroadcaster restartedBroadcaster = new EventBroadcaster(
                Optional.empty(),
                Optional.of(eventRepository)
        );
        restartedBroadcaster.initFromDatabase();

        // Sequence must resume from greater than or equal to the previous sequence
        assertTrue(
                restartedBroadcaster.getCurrentSequence() >= eventBroadcaster.getCurrentSequence(),
                "Sequence counter must resume monotonically without duplicate numbers"
        );
    }

    @Test
    @DisplayName("Sampled telemetry archiver captures periodic snapshots without tick saturation")
    void testTelemetryArchiveSamplingPolicy() {
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        Instant t0 = Instant.parse("2026-10-24T00:00:00Z");

        TelemetryArchiveService archiver = new TelemetryArchiveService(
                Optional.of(telemetrySnapshotRepository),
                30.0,
                50000
        );

        long countBefore = telemetrySnapshotRepository.countBySpacecraftId("TERRA-OBS");

        // 1. First sample at t0: should be persisted
        archiver.sampleAndArchive(terra, t0);
        long count1 = telemetrySnapshotRepository.countBySpacecraftId("TERRA-OBS");
        assertEquals(countBefore + 1, count1);

        // 2. High-frequency call 5 seconds later: should be skipped by sampling policy
        archiver.sampleAndArchive(terra, t0.plusSeconds(5));
        long count2 = telemetrySnapshotRepository.countBySpacecraftId("TERRA-OBS");
        assertEquals(count1, count2, "High-frequency telemetry within sampling interval must not insert new DB row");

        // 3. Call 31 seconds later: should be persisted
        archiver.sampleAndArchive(terra, t0.plusSeconds(31));
        long count3 = telemetrySnapshotRepository.countBySpacecraftId("TERRA-OBS");
        assertEquals(count2 + 1, count3, "Sample beyond sampling interval must be persisted");
    }
}
