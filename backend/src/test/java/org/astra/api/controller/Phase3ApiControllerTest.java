package org.astra.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.astra.anomalies.SubsystemType;
import org.astra.api.dto.InjectAnomalyRequest;
import org.astra.api.dto.SubmitCommandRequest;
import org.astra.commands.CommandType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Phase 3 Extended REST API Integration Tests")
class Phase3ApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/v1/commands dispatches command and enforces idempotency replay")
    void testCommandDispatchAndIdempotencyEndpoint() throws Exception {
        String clientCmdId = "CLIENT-REST-TEST-" + System.currentTimeMillis();

        SubmitCommandRequest request = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                "AURA-1",
                clientCmdId,
                Map.of("reason", "Gyro calibration drift detected")
        );

        // First dispatch
        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXECUTED"))
                .andExpect(jsonPath("$.idempotentReplay").value(false))
                .andExpect(jsonPath("$.spacecraftId").value("AURA-1"));

        // Replay with identical clientCommandId
        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXECUTED"))
                .andExpect(jsonPath("$.idempotentReplay").value(true))
                .andExpect(jsonPath("$.message").value(startsWith("[IDEMPOTENT REPLAY]")));

        // Query history endpoint
        mockMvc.perform(get("/api/v1/commands")
                        .param("clientCommandId", clientCmdId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].clientCommandId").value(clientCmdId));
    }

    @Test
    @DisplayName("GET /api/v1/commands/{commandId} returns single recorded command or 404")
    void testGetSingleCommand() throws Exception {
        SubmitCommandRequest request = new SubmitCommandRequest(
                CommandType.SET_OPERATIONAL_MODE,
                "TERRA-OBS",
                null,
                Map.of("mode", "NOMINAL")
        );

        String responseBody = mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> resMap = objectMapper.readValue(responseBody, Map.class);
        String commandId = (String) resMap.get("commandId");

        // Fetch command by ID
        mockMvc.perform(get("/api/v1/commands/" + commandId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commandId").value(commandId))
                .andExpect(jsonPath("$.spacecraftId").value("TERRA-OBS"));

        // Non-existent ID -> 404
        mockMvc.perform(get("/api/v1/commands/NON_EXISTENT_CMD_999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/events returns published simulation and telemetry events")
    void testEventsQueryEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("POST /api/v1/anomalies/inject and DELETE /api/v1/anomalies/{id} manage Failure Lab extension points")
    void testAnomalyLifecycleEndpoints() throws Exception {
        InjectAnomalyRequest req = new InjectAnomalyRequest(
                "AURA-1",
                SubsystemType.TCS,
                "Thermal radiator heat pipe pressure loss",
                0.5,
                false
        );

        String createResp = mockMvc.perform(post("/api/v1/anomalies/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.anomalyId").isNotEmpty())
                .andExpect(jsonPath("$.spacecraftId").value("AURA-1"))
                .andExpect(jsonPath("$.subsystem").value("TCS"))
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> anomMap = objectMapper.readValue(createResp, Map.class);
        String anomalyId = (String) anomMap.get("anomalyId");

        // List active anomalies
        mockMvc.perform(get("/api/v1/anomalies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        // Clear anomaly
        mockMvc.perform(delete("/api/v1/anomalies/" + anomalyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLEARED"));
    }

    @Test
    @DisplayName("Continuous simulation scheduler endpoints start, report status, and stop")
    void testContinuousSchedulerEndpoints() throws Exception {
        // Initial status
        mockMvc.perform(get("/api/v1/simulation/continuous/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // Start scheduler at 2 Hz, 10 seconds step
        mockMvc.perform(post("/api/v1/simulation/continuous/start")
                        .param("stepSeconds", "10.0")
                        .param("tickRateHz", "2.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.stepSeconds").value(10.0))
                .andExpect(jsonPath("$.tickRateHz").value(2.0));

        // Stop scheduler
        mockMvc.perform(post("/api/v1/simulation/continuous/stop"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }
}
