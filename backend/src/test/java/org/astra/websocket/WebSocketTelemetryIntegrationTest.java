package org.astra.websocket;

import org.astra.events.SimulationEvent;
import org.astra.simulation.engine.SimulationEngine;
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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("WebSocket & STOMP Telemetry Streaming Integration Tests")
class WebSocketTelemetryIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SimulationEngine simulationEngine;

    private WebSocketStompClient stompClient;
    private StompSession session;

    @BeforeEach
    void setUp() throws Exception {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        stompClient.setMessageConverter(converter);

        String wsUrl = "ws://localhost:" + port + "/ws/simulation";
        session = stompClient.connectAsync(wsUrl, new StompSessionHandlerAdapter() {
            @Override
            public void handleException(StompSession s, org.springframework.messaging.simp.stomp.StompCommand c, StompHeaders h, byte[] p, Throwable t) {
                t.printStackTrace();
            }
            @Override
            public void handleTransportError(StompSession s, Throwable t) {
                t.printStackTrace();
            }
        }).get(5, TimeUnit.SECONDS);
        assertTrue(session.isConnected(), "STOMP session should be successfully connected");
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
    @DisplayName("Subscribing to /topic/simulation immediately returns initial SimulationSnapshotMessage")
    void testSubscribeSimulationTopicReturnsInitialSnapshot() throws Exception {
        CompletableFuture<SimulationSnapshotMessage> snapshotFuture = new CompletableFuture<>();

        session.subscribe("/topic/simulation", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return SimulationSnapshotMessage.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                snapshotFuture.complete((SimulationSnapshotMessage) payload);
            }
        });

        SimulationSnapshotMessage snapshot = snapshotFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(snapshot);
        assertNotNull(snapshot.currentEpoch());
        assertEquals(3, snapshot.spacecraftCount());
        assertNotNull(snapshot.fleet());
        assertEquals(3, snapshot.fleet().size());
    }

    @Test
    @DisplayName("Subscribing to /topic/telemetry receives synchronized fleet frames with identical epochs")
    void testTelemetryStreamingSynchronizedFleetFrame() throws Exception {
        CompletableFuture<FleetTelemetryFrame> initialFrameFuture = new CompletableFuture<>();

        session.subscribe("/topic/telemetry", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return FleetTelemetryFrame.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                initialFrameFuture.complete((FleetTelemetryFrame) payload);
            }
        });

        FleetTelemetryFrame initialFrame = initialFrameFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(initialFrame);
        assertEquals(3, initialFrame.spacecraftCount());
        assertNotNull(initialFrame.telemetry());

        // Verify that all telemetry in this frame has the exact same simulation epoch (zero time skew)
        initialFrame.telemetry().forEach(record -> {
            assertEquals(initialFrame.simulationEpoch(), record.timestamp(),
                    "All spacecraft telemetry in fleet frame must share the authoritative simulation epoch");
        });

        // Advance simulation and receive next frame
        CompletableFuture<FleetTelemetryFrame> nextFrameFuture = new CompletableFuture<>();
        session.subscribe("/topic/telemetry", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return FleetTelemetryFrame.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                FleetTelemetryFrame frame = (FleetTelemetryFrame) payload;
                if (!frame.simulationEpoch().equals(initialFrame.simulationEpoch())) {
                    nextFrameFuture.complete(frame);
                }
            }
        });

        simulationEngine.step(Duration.ofSeconds(60));
        FleetTelemetryFrame advancedFrame = nextFrameFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(advancedFrame);
        assertEquals(initialFrame.simulationEpoch().plusSeconds(60), advancedFrame.simulationEpoch());
    }

    @Test
    @DisplayName("Subscribing to /topic/events receives published simulation lifecycle events")
    void testEventsStreamTopic() throws Exception {
        CompletableFuture<SimulationEvent> eventFuture = new CompletableFuture<>();

        session.subscribe("/topic/events", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return SimulationEvent.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                eventFuture.complete((SimulationEvent) payload);
            }
        });

        // Allow broker to register subscription before publishing
        Thread.sleep(200);

        // Trigger pause to produce an event
        simulationEngine.pause();

        SimulationEvent receivedEvent = eventFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(receivedEvent);
        assertEquals("SIMULATION_PAUSED", receivedEvent.type().name());

        // Resume simulation
        simulationEngine.resume();
    }
}
