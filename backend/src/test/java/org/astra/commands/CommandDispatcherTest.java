package org.astra.commands;

import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.simulation.engine.SimulationLifecycle;
import org.astra.simulation.orbital.KeplerianPropagator;
import org.astra.telemetry.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CommandDispatcher Command Validation & Execution Tests")
class CommandDispatcherTest {

    private SimulationEngine simulationEngine;
    private CommandDispatcher dispatcher;
    private final Instant baseEpoch = Instant.parse("2026-10-24T00:00:00Z");

    @BeforeEach
    void setUp() {
        TelemetryService telemetryService = new TelemetryService(100);
        simulationEngine = new SimulationEngine(new KeplerianPropagator(), telemetryService, baseEpoch);
        dispatcher = new CommandDispatcher(simulationEngine);
    }

    @Test
    @DisplayName("SET_OPERATIONAL_MODE transitions mode and adapts spacecraft status")
    void testSetOperationalModeSuccess() {
        CommandRequest request = new CommandRequest(
                "CMD-001",
                "AURA-1",
                CommandType.SET_OPERATIONAL_MODE,
                Map.of("mode", "SAFE_MODE"),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(request);
        assertEquals(CommandStatus.EXECUTED, result.status());
        assertNotNull(result.executionEpoch());

        Spacecraft aura1 = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
        assertEquals(OperationalMode.SAFE_MODE, aura1.getOperationalMode());
        assertEquals(SpacecraftStatus.DEGRADED, aura1.getOperationalStatus());

        // Transition back to NOMINAL
        CommandRequest reqNominal = new CommandRequest(
                "CMD-002",
                "AURA-1",
                CommandType.SET_OPERATIONAL_MODE,
                Map.of("mode", "NOMINAL"),
                Instant.now()
        );
        CommandResult resultNominal = dispatcher.dispatch(reqNominal);
        assertEquals(CommandStatus.EXECUTED, resultNominal.status());
        assertEquals(OperationalMode.NOMINAL, aura1.getOperationalMode());
        assertEquals(SpacecraftStatus.NOMINAL, aura1.getOperationalStatus());
    }

    @Test
    @DisplayName("SET_OPERATIONAL_MODE rejects invalid operational mode names")
    void testSetOperationalModeInvalidName() {
        CommandRequest request = new CommandRequest(
                "CMD-BAD-MODE",
                "AURA-1",
                CommandType.SET_OPERATIONAL_MODE,
                Map.of("mode", "HYPERSPACE_JUMP"),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(request);
        assertEquals(CommandStatus.REJECTED, result.status());
        assertTrue(result.message().contains("Invalid operational mode"));
    }

    @Test
    @DisplayName("Commands targeting non-existent spacecraft are rejected")
    void testCommandTargetingMissingSpacecraft() {
        CommandRequest request = new CommandRequest(
                "CMD-VOYAGER",
                "VOYAGER-99",
                CommandType.TRIGGER_SAFE_MODE,
                Map.of(),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(request);
        assertEquals(CommandStatus.REJECTED, result.status());
        assertTrue(result.message().contains("Target spacecraft not found"));
    }

    @Test
    @DisplayName("TRIGGER_SAFE_MODE immediately puts spacecraft into safe mode and degraded status")
    void testTriggerSafeMode() {
        CommandRequest request = new CommandRequest(
                "CMD-SAFE-01",
                "TERRA-OBS",
                CommandType.TRIGGER_SAFE_MODE,
                Map.of("reason", "Anomalous star tracker bias detected"),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(request);
        assertEquals(CommandStatus.EXECUTED, result.status());
        assertTrue(result.message().contains("star tracker bias"));

        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        assertEquals(OperationalMode.SAFE_MODE, terra.getOperationalMode());
        assertEquals(SpacecraftStatus.DEGRADED, terra.getOperationalStatus());
    }

    @Test
    @DisplayName("ADVANCE_TIME successfully moves simulation clock and propagates fleet")
    void testAdvanceTimeCommand() {
        CommandRequest request = new CommandRequest(
                "CMD-ADV-1",
                null,
                CommandType.ADVANCE_TIME,
                Map.of("seconds", "300.0"),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(request);
        assertEquals(CommandStatus.EXECUTED, result.status());
        assertEquals(300.0, simulationEngine.getElapsedSeconds());
        assertEquals(baseEpoch.plusSeconds(300), simulationEngine.getCurrentEpoch());
    }

    @Test
    @DisplayName("ADVANCE_TIME rejects non-positive or malformed seconds parameter")
    void testAdvanceTimeRejections() {
        // Negative seconds
        CommandRequest negReq = new CommandRequest("C1", null, CommandType.ADVANCE_TIME, Map.of("seconds", "-10"), Instant.now());
        assertEquals(CommandStatus.REJECTED, dispatcher.dispatch(negReq).status());

        // Zero seconds
        CommandRequest zeroReq = new CommandRequest("C2", null, CommandType.ADVANCE_TIME, Map.of("seconds", "0"), Instant.now());
        assertEquals(CommandStatus.REJECTED, dispatcher.dispatch(zeroReq).status());

        // Non-numeric
        CommandRequest textReq = new CommandRequest("C3", null, CommandType.ADVANCE_TIME, Map.of("seconds", "three_minutes"), Instant.now());
        assertEquals(CommandStatus.REJECTED, dispatcher.dispatch(textReq).status());

        // Missing seconds parameter
        CommandRequest missingReq = new CommandRequest("C4", null, CommandType.ADVANCE_TIME, Map.of(), Instant.now());
        assertEquals(CommandStatus.REJECTED, dispatcher.dispatch(missingReq).status());
    }

    @Test
    @DisplayName("PAUSE_SIMULATION and RESUME_SIMULATION control simulation lifecycle")
    void testPauseAndResumeCommands() {
        CommandRequest pauseReq = new CommandRequest("P1", null, CommandType.PAUSE_SIMULATION, Map.of(), Instant.now());
        CommandResult pauseRes = dispatcher.dispatch(pauseReq);
        assertEquals(CommandStatus.EXECUTED, pauseRes.status());
        assertEquals(SimulationLifecycle.PAUSED, simulationEngine.getLifecycle());

        CommandRequest resumeReq = new CommandRequest("R1", null, CommandType.RESUME_SIMULATION, Map.of(), Instant.now());
        CommandResult resumeRes = dispatcher.dispatch(resumeReq);
        assertEquals(CommandStatus.EXECUTED, resumeRes.status());
        assertEquals(SimulationLifecycle.RUNNING, simulationEngine.getLifecycle());
    }

    @Test
    @DisplayName("SET_OPERATIONAL_MODE rejects modifying DECOMMISSIONED spacecraft")
    void testDecommissionedSpacecraftRejection() {
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        terra.setOperationalMode(OperationalMode.DECOMMISSIONED);

        CommandRequest req = new CommandRequest("D1", "TERRA-OBS", CommandType.SET_OPERATIONAL_MODE, Map.of("mode", "NOMINAL"), Instant.now());
        CommandResult res = dispatcher.dispatch(req);
        assertEquals(CommandStatus.REJECTED, res.status());
        assertTrue(res.message().contains("DECOMMISSIONED"));
    }
}
