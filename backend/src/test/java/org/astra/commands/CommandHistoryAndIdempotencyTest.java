package org.astra.commands;

import org.astra.anomalies.AnomalyManager;
import org.astra.anomalies.AnomalyModifier;
import org.astra.anomalies.SubsystemType;
import org.astra.core.domain.CoordinateFrame;
import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.OrbitState;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.math.Vector3D;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.simulation.orbital.KeplerianPropagator;
import org.astra.telemetry.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Command History, Idempotency & Optical Capture Workflow Tests")
class CommandHistoryAndIdempotencyTest {

    private SimulationEngine simulationEngine;
    private CommandHistoryService historyService;
    private AnomalyManager anomalyManager;
    private CommandDispatcher dispatcher;
    private final Instant baseEpoch = Instant.parse("2026-10-24T00:00:00Z");

    @BeforeEach
    void setUp() {
        TelemetryService telemetryService = new TelemetryService(100);
        historyService = new CommandHistoryService(50);
        anomalyManager = new AnomalyManager();
        simulationEngine = new SimulationEngine(new KeplerianPropagator(), telemetryService, baseEpoch);
        dispatcher = new CommandDispatcher(simulationEngine, historyService, anomalyManager, event -> {});
    }

    @Test
    @DisplayName("Idempotency: Re-submitting same clientCommandId returns cached result with idempotentReplay flag")
    void testCommandIdempotencyReplay() {
        String clientCmdId = "CLIENT-UUID-12345";
        CommandRequest req1 = new CommandRequest(
                "CMD-001",
                clientCmdId,
                "AURA-1",
                CommandType.SET_OPERATIONAL_MODE,
                Map.of("mode", "SAFE_MODE"),
                Instant.now()
        );

        CommandResult res1 = dispatcher.dispatch(req1);
        assertEquals(CommandStatus.EXECUTED, res1.status());
        assertFalse(res1.idempotentReplay());

        // Re-submit with same clientCommandId and different internal commandId
        CommandRequest req2 = new CommandRequest(
                "CMD-002",
                clientCmdId,
                "AURA-1",
                CommandType.SET_OPERATIONAL_MODE,
                Map.of("mode", "SAFE_MODE"),
                Instant.now()
        );

        CommandResult res2 = dispatcher.dispatch(req2);
        assertTrue(res2.idempotentReplay(), "Should mark result as idempotent replay");
        assertTrue(res2.message().startsWith("[IDEMPOTENT REPLAY]"));
        assertEquals(res1.status(), res2.status());

        // Ensure history records count is 1 for that clientCommandId
        List<CommandRecord> history = historyService.getHistory(null, null, clientCmdId, 10);
        assertEquals(1, history.size());
    }

    @Test
    @DisplayName("REQUEST_OPTICAL_CAPTURE succeeds when conditions are nominal (sunlight, battery >= 30%, nominal mode)")
    void testOpticalCaptureSuccess() {
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        terra.setOperationalMode(OperationalMode.SCIENCE_OPERATION);
        terra.updatePowerMetrics(85.0, 420.0);

        // Ensure daylight (not in eclipse)
        OrbitState daylightState = OrbitState.of(
                baseEpoch,
                CoordinateFrame.ECI_J2000,
                new Vector3D(7000.0, 0.0, 0.0),
                new Vector3D(0.0, 7.5, 0.0),
                terra.getCurrentOrbitState().elements(),
                false // not in eclipse
        );
        terra.updateOrbitState(daylightState);

        CommandRequest req = new CommandRequest(
                "IMG-001",
                "TERRA-OBS",
                CommandType.REQUEST_OPTICAL_CAPTURE,
                Map.of("sensor", "MULTISPECTRAL_HR", "targetLatitude", "34.05", "targetLongitude", "-118.25"),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(req);
        assertEquals(CommandStatus.EXECUTED, result.status());
        assertTrue(result.message().contains("Optical payload capture synthetic sequence initiated"));

        // Verify auditable record in history
        CommandRecord record = historyService.findById("IMG-001").orElseThrow();
        assertEquals(CommandStatus.EXECUTED, record.status());
        assertEquals("TERRA-OBS", record.spacecraftId());
    }

    @Test
    @DisplayName("REQUEST_OPTICAL_CAPTURE is rejected when spacecraft is in Earth shadow / eclipse")
    void testOpticalCaptureRejectedInEclipse() {
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        terra.updatePowerMetrics(80.0, 0.0);

        // Force inEclipse = true
        OrbitState eclipseState = OrbitState.of(
                baseEpoch,
                CoordinateFrame.ECI_J2000,
                new Vector3D(-7000.0, 0.0, 0.0),
                new Vector3D(0.0, -7.5, 0.0),
                terra.getCurrentOrbitState().elements(),
                true // IN ECLIPSE
        );
        terra.updateOrbitState(eclipseState);

        CommandRequest req = new CommandRequest(
                "IMG-002",
                "TERRA-OBS",
                CommandType.REQUEST_OPTICAL_CAPTURE,
                Map.of(),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(req);
        assertEquals(CommandStatus.REJECTED, result.status());
        assertTrue(result.message().contains("Earth shadow / eclipse"));
    }

    @Test
    @DisplayName("REQUEST_OPTICAL_CAPTURE is rejected when battery is below 30% threshold")
    void testOpticalCaptureRejectedLowBattery() {
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        terra.updatePowerMetrics(24.5, 100.0);

        OrbitState daylightState = OrbitState.of(
                baseEpoch,
                CoordinateFrame.ECI_J2000,
                new Vector3D(7000.0, 0.0, 0.0),
                new Vector3D(0.0, 7.5, 0.0),
                terra.getCurrentOrbitState().elements(),
                false
        );
        terra.updateOrbitState(daylightState);

        CommandRequest req = new CommandRequest(
                "IMG-003",
                "TERRA-OBS",
                CommandType.REQUEST_OPTICAL_CAPTURE,
                Map.of(),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(req);
        assertEquals(CommandStatus.REJECTED, result.status());
        assertTrue(result.message().contains("insufficient battery charge"));
    }

    @Test
    @DisplayName("REQUEST_OPTICAL_CAPTURE is rejected when spacecraft is in SAFE_MODE")
    void testOpticalCaptureRejectedInSafeMode() {
        Spacecraft terra = simulationEngine.getSpacecraft("TERRA-OBS").orElseThrow();
        terra.setOperationalMode(OperationalMode.SAFE_MODE);
        terra.updatePowerMetrics(90.0, 400.0);

        OrbitState daylightState = OrbitState.of(
                baseEpoch,
                CoordinateFrame.ECI_J2000,
                new Vector3D(7000.0, 0.0, 0.0),
                new Vector3D(0.0, 7.5, 0.0),
                terra.getCurrentOrbitState().elements(),
                false
        );
        terra.updateOrbitState(daylightState);

        CommandRequest req = new CommandRequest(
                "IMG-004",
                "TERRA-OBS",
                CommandType.REQUEST_OPTICAL_CAPTURE,
                Map.of(),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(req);
        assertEquals(CommandStatus.REJECTED, result.status());
        assertTrue(result.message().contains("SAFE_MODE mode; cannot perform optical capture"));
    }

    @Test
    @DisplayName("COMMS blackout anomaly blocks all command dispatch to targeted spacecraft")
    void testCommsBlackoutAnomalyRejection() {
        // Inject COMMS blackout for AURA-1
        anomalyManager.injectAnomaly(new AnomalyModifier(
                "ANOM-COMMS-1",
                "AURA-1",
                SubsystemType.COMMS,
                "Deep space ground station RF occultation",
                1.0,
                true,
                baseEpoch
        ));

        CommandRequest req = new CommandRequest(
                "CMD-BLOCKED",
                "AURA-1",
                CommandType.TRIGGER_SAFE_MODE,
                Map.of(),
                Instant.now()
        );

        CommandResult result = dispatcher.dispatch(req);
        assertEquals(CommandStatus.REJECTED, result.status());
        assertTrue(result.message().contains("COMMS blackout"));

        // Commands to other spacecraft succeed
        CommandRequest reqTerra = new CommandRequest(
                "CMD-TERRA-OK",
                "TERRA-OBS",
                CommandType.TRIGGER_SAFE_MODE,
                Map.of(),
                Instant.now()
        );
        assertEquals(CommandStatus.EXECUTED, dispatcher.dispatch(reqTerra).status());

        // Clearing anomaly unblocks command uplink
        anomalyManager.clearAnomaly("ANOM-COMMS-1");
        CommandResult resultAfterClear = dispatcher.dispatch(req);
        assertEquals(CommandStatus.EXECUTED, resultAfterClear.status());
    }

    @Test
    @DisplayName("CommandHistoryService enforces ring buffer bound and provides filtering")
    void testCommandHistoryBoundsAndFiltering() {
        CommandHistoryService boundedHistory = new CommandHistoryService(5);

        for (int i = 1; i <= 10; i++) {
            CommandRecord rec = new CommandRecord(
                    "CMD-" + i,
                    null,
                    "CRAFT-" + (i % 2),
                    CommandType.SET_OPERATIONAL_MODE,
                    Map.of(),
                    CommandStatus.EXECUTED,
                    "Executed " + i,
                    baseEpoch,
                    Instant.now()
            );
            boundedHistory.record(rec);
        }

        // Bounded size should be 5
        assertEquals(5, boundedHistory.size());

        // Oldest records (CMD-1 through CMD-5) evicted, CMD-6 through CMD-10 retained
        assertTrue(boundedHistory.findById("CMD-10").isPresent());
        assertTrue(boundedHistory.findById("CMD-6").isPresent());
        assertFalse(boundedHistory.findById("CMD-1").isPresent());

        // Filter by spacecraft CRAFT-0 (even numbers: 6, 8, 10 -> 3 records)
        List<CommandRecord> craft0History = boundedHistory.getHistory("CRAFT-0", null, null, 10);
        assertEquals(3, craft0History.size());
    }
}
