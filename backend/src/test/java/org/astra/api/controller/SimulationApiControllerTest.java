package org.astra.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.astra.api.dto.AdvanceSimulationRequest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.security.test.context.support.WithMockUser;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser(username = "admin", roles = {"ADMIN", "FLIGHT_DIRECTOR", "OPERATOR", "VIEWER"})
@DisplayName("Simulation and Spacecraft REST API Integration Tests")
class SimulationApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private org.astra.simulation.engine.SimulationEngine simulationEngine;

    @org.junit.jupiter.api.BeforeEach
    void resetFleet() {
        simulationEngine.initializeDefaultFleet();
    }

    @Test
    @DisplayName("GET /actuator/health returns 200 OK and UP status")
    void testActuatorHealth() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("GET /api/v1/simulation/status returns authoritative simulation state")
    void testGetSimulationStatus() throws Exception {
        mockMvc.perform(get("/api/v1/simulation/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lifecycle").value("RUNNING"))
                .andExpect(jsonPath("$.currentEpoch").isNotEmpty())
                .andExpect(jsonPath("$.baseEpoch").isNotEmpty())
                .andExpect(jsonPath("$.spacecraftCount").value(3));
    }

    @Test
    @DisplayName("POST /api/v1/simulation/advance advances time by requested duration")
    void testAdvanceSimulation() throws Exception {
        var req = new AdvanceSimulationRequest(120.0);

        mockMvc.perform(post("/api/v1/simulation/advance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.elapsedSeconds", greaterThanOrEqualTo(120.0)));
    }

    @Test
    @DisplayName("POST /api/v1/simulation/advance with negative seconds returns 400 Bad Request")
    void testAdvanceSimulationInvalidDuration() throws Exception {
        var req = new AdvanceSimulationRequest(-45.0);

        mockMvc.perform(post("/api/v1/simulation/advance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message", containsString("Validation failed")));
    }

    @Test
    @DisplayName("POST /api/v1/simulation/pause and resume alter lifecycle state")
    void testPauseAndResume() throws Exception {
        mockMvc.perform(post("/api/v1/simulation/pause"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lifecycle").value("PAUSED"));

        mockMvc.perform(post("/api/v1/simulation/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lifecycle").value("RUNNING"));
    }

    @Test
    @DisplayName("GET /api/v1/spacecraft lists all active spacecraft")
    void testListSpacecraft() throws Exception {
        mockMvc.perform(get("/api/v1/spacecraft"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].id", hasItems("AURA-1", "TERRA-OBS", "SOLIS-RELAY")));
    }

    @Test
    @DisplayName("GET /api/v1/spacecraft/{id} returns detailed spacecraft state and orbital elements")
    void testGetSpacecraftDetail() throws Exception {
        mockMvc.perform(get("/api/v1/spacecraft/AURA-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("AURA-1"))
                .andExpect(jsonPath("$.operationalMode").value("NOMINAL"))
                .andExpect(jsonPath("$.positionKm.x").isNumber())
                .andExpect(jsonPath("$.positionKm.y").isNumber())
                .andExpect(jsonPath("$.positionKm.z").isNumber())
                .andExpect(jsonPath("$.velocityKmS.x").isNumber())
                .andExpect(jsonPath("$.elements.semiMajorAxisKm").value(7080.0))
                .andExpect(jsonPath("$.elements.inclinationDeg").value(98.2))
                .andExpect(jsonPath("$.batterySocPercent").isNumber());
    }

    @Test
    @DisplayName("GET /api/v1/spacecraft/{id} returns 404 when spacecraft is not found")
    void testGetSpacecraftNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/spacecraft/NON-EXISTENT"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/v1/spacecraft/{id}/commands dispatches valid telecommand")
    void testSubmitCommand() throws Exception {
        var commandReq = new SubmitCommandRequest(
                CommandType.SET_OPERATIONAL_MODE,
                Map.of("mode", "SAFE_MODE")
        );

        mockMvc.perform(post("/api/v1/spacecraft/AURA-1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(commandReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXECUTED"))
                .andExpect(jsonPath("$.spacecraftId").value("AURA-1"))
                .andExpect(jsonPath("$.type").value("SET_OPERATIONAL_MODE"));
    }

    @Test
    @DisplayName("POST /api/v1/spacecraft/{id}/commands returns 404 for unknown spacecraft")
    void testSubmitCommandToMissingSpacecraft() throws Exception {
        var commandReq = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                Map.of()
        );

        mockMvc.perform(post("/api/v1/spacecraft/UNKNOWN-SAT/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(commandReq)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/spacecraft/{id}/telemetry returns recent telemetry snapshots")
    void testGetRecentTelemetry() throws Exception {
        mockMvc.perform(get("/api/v1/spacecraft/AURA-1/telemetry?limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].spacecraftId").value("AURA-1"))
                .andExpect(jsonPath("$[0].positionKm").exists())
                .andExpect(jsonPath("$[0].altitudeKm", greaterThan(500.0)));
    }
}
