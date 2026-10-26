package org.astra.simulation;

import org.astra.anomalies.FailureLabService;
import org.astra.anomalies.FaultRecord;
import org.astra.anomalies.FaultScenarioCode;
import org.astra.anomalies.RecoveryActionType;
import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.commands.CommandDispatcher;
import org.astra.commands.CommandRequest;
import org.astra.commands.CommandResult;
import org.astra.commands.CommandStatus;
import org.astra.commands.CommandType;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.missions.domain.MissionRun;
import org.astra.missions.domain.MissionStatus;
import org.astra.missions.service.MissionService;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.telemetry.TelemetryService;
import org.astra.telemetry.TelemetrySnapshot;
import org.astra.websocket.dto.FleetTelemetryFrame;
import org.astra.websocket.dto.SimulationSnapshotMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("ASTRA Live Telemetry, Simulation Integrity & Failure Propagation Verification")
class LiveTelemetryIntegrityTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SimulationEngine simulationEngine;

    @Autowired
    private TelemetryService telemetryService;

    @Autowired
    private FailureLabService failureLabService;

    @Autowired
    private CommandDispatcher commandDispatcher;

    @Autowired
    private MissionService missionService;

    private WebSocketStompClient stompClient;
    private StompSession session;

    @BeforeEach
    void setUp() throws Exception {
        simulationEngine.initializeDefaultFleet();

        jakarta.websocket.WebSocketContainer container = jakarta.websocket.ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxTextMessageBufferSize(1024 * 1024);
        container.setDefaultMaxBinaryMessageBufferSize(1024 * 1024);
        StandardWebSocketClient wsClient = new StandardWebSocketClient(container);
        stompClient = new WebSocketStompClient(wsClient);
        stompClient.setInboundMessageSizeLimit(1024 * 1024);

        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        stompClient.setMessageConverter(converter);

        String wsUrl = "ws://localhost:" + port + "/ws/simulation";
        session = stompClient.connectAsync(wsUrl, new StompSessionHandlerAdapter() {}).get(5, TimeUnit.SECONDS);
        assertTrue(session.isConnected(), "STOMP connection should be active");
    }

    @AfterEach
    void tearDown() {
        if (session != null && session.isConnected()) {
            session.disconnect();
        }
        if (stompClient != null) {
            stompClient.stop();
        }
    }

    @Test
    @DisplayName("Verification 1 & 5: Telemetry snapshots carry correct craft identity and craft updates do not alter other crafts")
    void testTelemetryIdentityAndIsolation() {
        Optional<Spacecraft> auraOpt = simulationEngine.getSpacecraft("AURA-1");
        Optional<Spacecraft> terraOpt = simulationEngine.getSpacecraft("TERRA-OBS");
        assertTrue(auraOpt.isPresent());
        assertTrue(terraOpt.isPresent());

        Spacecraft aura = auraOpt.get();
        Spacecraft terra = terraOpt.get();

        double originalTerraBattery = terra.getBatterySocPercent();
        OperationalMode originalTerraMode = terra.getOperationalMode();

        // Mutate AURA-1
        aura.setOperationalMode(OperationalMode.SAFE_MODE);
        aura.setOperationalStatus(SpacecraftStatus.DEGRADED);
        simulationEngine.syncSpacecraftTelemetry(aura);

        Optional<TelemetrySnapshot> latestAura = telemetryService.getLatestSnapshot("AURA-1");
        Optional<TelemetrySnapshot> latestTerra = telemetryService.getLatestSnapshot("TERRA-OBS");

        assertTrue(latestAura.isPresent());
        assertEquals("AURA-1", latestAura.get().spacecraftId());
        assertEquals(OperationalMode.SAFE_MODE, latestAura.get().operationalMode());
        assertEquals(SpacecraftStatus.DEGRADED, latestAura.get().operationalStatus());

        assertTrue(latestTerra.isPresent());
        assertEquals("TERRA-OBS", latestTerra.get().spacecraftId());
        assertEquals(originalTerraBattery, latestTerra.get().batterySocPercent(), 0.001);
        assertEquals(originalTerraMode, latestTerra.get().operationalMode());
    }

    @Test
    @DisplayName("Verification 8, 9 & 10: Supported Failure Lab events affect authoritative state, publish telemetry, and obey recovery rules")
    void testFailureLabStatePropagationAndRecovery() throws Exception {
        CompletableFuture<FleetTelemetryFrame> frameFuture = new CompletableFuture<>();

        session.subscribe("/topic/telemetry", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return FleetTelemetryFrame.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                FleetTelemetryFrame frame = (FleetTelemetryFrame) payload;
                if (frame.fleet().stream().anyMatch(s -> s.spacecraftId().equals("AURA-1")
                        && s.subsystems() != null
                        && s.subsystems().eps().solarDegradationMultiplier() < 0.5)) {
                    frameFuture.complete(frame);
                }
            }
        });

        Spacecraft aura = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
        Instant currentEpoch = simulationEngine.getCurrentEpoch();

        // 1. Inject solar degradation fault
        InjectFaultRequest req = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION,
                null,
                Map.of("solarMultiplier", 0.25),
                "Test solar degradation"
        );
        FaultRecord fault = failureLabService.injectFault(req, currentEpoch, aura);
        simulationEngine.syncSpacecraftTelemetry(aura);

        // Verify authoritative state changed
        assertNotNull(fault);
        assertEquals(0.25, aura.getSubsystems().eps().solarDegradationMultiplier(), 0.01);

        // Verify telemetry frame received via STOMP
        FleetTelemetryFrame frame = frameFuture.get(5, TimeUnit.SECONDS);
        TelemetrySnapshot snap = frame.fleet().stream().filter(s -> s.spacecraftId().equals("AURA-1")).findFirst().orElseThrow();
        assertNotNull(snap.subsystems());
        assertEquals(0.25, snap.subsystems().eps().solarDegradationMultiplier(), 0.01);

        // 2. Incompatible recovery procedure is rejected
        RecoverFaultRequest badRec = new RecoverFaultRequest(RecoveryActionType.RESET_RF_TRANSCEIVER, "Wrong action");
        assertThrows(IllegalArgumentException.class, () ->
                failureLabService.recoverFault(fault.faultId(), badRec, currentEpoch, aura)
        );

        // 3. Valid recovery procedure succeeds and restores nominal physics
        RecoverFaultRequest goodRec = new RecoverFaultRequest(RecoveryActionType.SWITCH_REDUNDANT_STRING, "Switched string");
        FaultRecord recovered = failureLabService.recoverFault(fault.faultId(), goodRec, currentEpoch, aura);
        simulationEngine.syncSpacecraftTelemetry(aura);

        assertEquals(1.0, aura.getSubsystems().eps().solarDegradationMultiplier(), 0.01);
        assertEquals(org.astra.anomalies.FaultLifecycleState.RECOVERED, recovered.lifecycleState());
    }

    @Test
    @DisplayName("Verification 11: Terminal mission runs reject telecommands to protect historical integrity")
    void testTerminalMissionRejectsCommands() {
        // Start and then abort or complete a mission run
        String validMissionId = missionService.getMissions(Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty()).get(0).id();
        MissionRun run = missionService.startMission(validMissionId, "operator", true);
        assertNotNull(run);
        assertEquals(MissionStatus.ACTIVE, run.status());

        // Abort the mission to make it terminal
        MissionRun aborted = missionService.abortMission(run.runId(), "Simulated operator test termination");
        assertEquals(MissionStatus.ABORTED, aborted.status());

        // Attempt telecommand mutation referencing the terminated runId
        CommandRequest cmd = new CommandRequest(
                "CMD-TERM-001",
                run.spacecraftId(),
                CommandType.TRIGGER_SAFE_MODE,
                Map.of("runId", run.runId(), "reason", "Unauthorized terminal mutation"),
                simulationEngine.getCurrentEpoch()
        );

        CommandResult res = commandDispatcher.dispatch(cmd);
        assertEquals(CommandStatus.REJECTED, res.status());
        assertTrue(res.message().contains("terminal state"), "Message must explain terminal state rejection: " + res.message());
    }

    @Test
    @DisplayName("Verification 2: Newer snapshots replace older snapshots and advancing time increments sequence")
    void testAdvancingSimulationAdvancesSnapshots() {
        Spacecraft aura = simulationEngine.getSpacecraft("AURA-1").orElseThrow();
        Instant t0 = simulationEngine.getCurrentEpoch();
        TelemetrySnapshot snap0 = telemetryService.getLatestSnapshot("AURA-1").orElseThrow();
        assertEquals(t0, snap0.timestamp());

        // Step simulation by 120 seconds
        Instant t1 = simulationEngine.step(Duration.ofSeconds(120));
        assertTrue(t1.isAfter(t0));

        TelemetrySnapshot snap1 = telemetryService.getLatestSnapshot("AURA-1").orElseThrow();
        assertEquals(t1, snap1.timestamp());
        assertTrue(snap1.timestamp().isAfter(snap0.timestamp()));
    }
}
