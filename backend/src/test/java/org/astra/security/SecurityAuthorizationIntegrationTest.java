package org.astra.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.astra.anomalies.FaultScenarioCode;
import org.astra.anomalies.FaultSeverity;
import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.api.dto.SubmitCommandRequest;
import org.astra.commands.CommandType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Phase 5 Spring Security & RBAC Authorization Tests")
class SecurityAuthorizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Public read-only endpoints allow unauthenticated callers")
    void testPublicReadAccessUnauthenticated() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));

        mockMvc.perform(get("/api/v1/simulation/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spacecraftCount").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/v1/spacecraft"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        mockMvc.perform(get("/api/v1/missions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));

        mockMvc.perform(get("/api/v1/faults/scenarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(13)));

        // HEAD requests on public read-only and health endpoints
        mockMvc.perform(head("/actuator/health"))
                .andExpect(status().isOk());

        mockMvc.perform(head("/api/v1/imagery/destinations"))
                .andExpect(status().isOk());

        mockMvc.perform(head("/api/v1/missions"))
                .andExpect(status().isOk());

        // CORS preflight OPTIONS request
        mockMvc.perform(options("/api/v1/imagery/destinations")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    @DisplayName("Unauthenticated caller rejected with 401 on telecommand dispatch")
    void testUnauthenticatedCommandDispatch() throws Exception {
        SubmitCommandRequest cmd = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                "AURA-1",
                "SEC-UNAUTH-1",
                Map.of()
        );

        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cmd)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message", containsString("Authentication required")));
    }

    @Test
    @DisplayName("Unauthenticated caller rejected with 401 on fault injection")
    void testUnauthenticatedFaultInjection() throws Exception {
        InjectFaultRequest req = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.COMMS_RF_BLACKOUT,
                FaultSeverity.CRITICAL,
                Map.of(),
                "Unauthenticated attempt"
        );

        mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @WithMockUser(username = "viewer_bob", roles = {"VIEWER"})
    @DisplayName("ROLE_VIEWER rejected with 403 Forbidden on telecommand dispatch")
    void testViewerForbiddenOnCommands() throws Exception {
        SubmitCommandRequest cmd = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                "AURA-1",
                "SEC-VIEWER-1",
                Map.of()
        );

        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cmd)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message", containsString("Insufficient privileges")));
    }

    @Test
    @WithMockUser(username = "operator_alice", roles = {"OPERATOR"})
    @DisplayName("ROLE_OPERATOR permitted to execute telecommand, but forbidden from injecting faults")
    void testOperatorPermissions() throws Exception {
        // 1. Permitted command execution
        SubmitCommandRequest cmd = new SubmitCommandRequest(
                CommandType.SET_OPERATIONAL_MODE,
                "AURA-1",
                "SEC-OP-PERMIT-1",
                Map.of("mode", "NOMINAL")
        );

        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cmd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXECUTED"));

        // 2. Forbidden fault injection
        InjectFaultRequest faultReq = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION,
                FaultSeverity.MAJOR,
                Map.of(),
                "Operator attempting fault injection"
        );

        mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(faultReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @WithMockUser(username = "director_charlie", roles = {"FLIGHT_DIRECTOR"})
    @DisplayName("ROLE_FLIGHT_DIRECTOR permitted to inject faults, but forbidden from simulation reset")
    void testFlightDirectorPermissions() throws Exception {
        // 1. Permitted fault injection
        InjectFaultRequest faultReq = new InjectFaultRequest(
                "TERRA-OBS",
                FaultScenarioCode.TCS_HEATER_CIRCUIT_FAILURE,
                FaultSeverity.CRITICAL,
                Map.of(),
                "Director authorized fault injection"
        );

        mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(faultReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.lifecycleState").value("ACTIVE"));

        // 2. Forbidden simulation re-initialization (admin only)
        mockMvc.perform(post("/api/v1/simulation/initialize"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @WithMockUser(username = "admin_dave", roles = {"ADMIN"})
    @DisplayName("ROLE_ADMIN permitted to perform administrative fleet re-initialization")
    void testAdminPermissions() throws Exception {
        mockMvc.perform(post("/api/v1/simulation/initialize"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lifecycle").value("RUNNING"))
                .andExpect(jsonPath("$.spacecraftCount").value(28));
    }

    @Test
    @DisplayName("HTTP Basic Authentication with valid operator credentials succeeds and captures operator identity")
    void testHttpBasicAuthenticationSuccess() throws Exception {
        String authHeader = "Basic " + Base64.getEncoder().encodeToString("operator:operator123".getBytes());

        SubmitCommandRequest cmd = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                "SOLIS-RELAY",
                "SEC-BASIC-AUTH-1",
                Map.of()
        );

        mockMvc.perform(post("/api/v1/commands")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cmd)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXECUTED"));
    }

    @Test
    @DisplayName("HTTP Basic Authentication with invalid password returns 401 Unauthorized")
    void testHttpBasicAuthenticationFailure() throws Exception {
        String badAuthHeader = "Basic " + Base64.getEncoder().encodeToString("operator:wrongpassword".getBytes());

        SubmitCommandRequest cmd = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                "SOLIS-RELAY",
                "SEC-BASIC-AUTH-FAIL",
                Map.of()
        );

        mockMvc.perform(post("/api/v1/commands")
                        .header("Authorization", badAuthHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cmd)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("Unauthenticated caller rejected with 401 on mission creation")
    void testUnauthenticatedMissionCreation() throws Exception {
        String payload = """
                {
                    "title": "Unauthorized Deep Space Mission",
                    "destination": "Jupiter",
                    "category": "PLANETARY_RECONNAISSANCE",
                    "difficulty": "CRITICAL",
                    "spacecraftId": "AURA-1",
                    "synopsis": "Unauthenticated probe creation attempt"
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message", containsString("Authentication required")));
    }

    @Test
    @WithMockUser(username = "viewer_bob", roles = {"VIEWER"})
    @DisplayName("ROLE_VIEWER rejected with 403 Forbidden on mission creation")
    void testViewerForbiddenOnMissionCreation() throws Exception {
        String payload = """
                {
                    "title": "Viewer Deep Space Mission",
                    "destination": "Mars",
                    "category": "PLANETARY_RECONNAISSANCE",
                    "difficulty": "CHALLENGING",
                    "spacecraftId": "AURA-1",
                    "synopsis": "Viewer attempting mission creation"
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message", containsString("Insufficient privileges")));
    }

    @Test
    @WithMockUser(username = "operator_alice", roles = {"OPERATOR"})
    @DisplayName("ROLE_OPERATOR permitted to create mission")
    void testOperatorPermittedMissionCreation() throws Exception {
        String payload = """
                {
                    "title": "Secured Reconnaissance Alpha",
                    "destination": "Lunar Polar Orbit",
                    "destinationGroup": "Lunar & Deep Space",
                    "category": "PLANETARY_RECONNAISSANCE",
                    "difficulty": "STANDARD",
                    "spacecraftId": "AURA-1",
                    "durationMinutes": 45,
                    "riskLevel": "LOW",
                    "synopsis": "Authorized operator reconnaissance mission creation",
                    "objectives": ["Map polar shadows"],
                    "completionCriteria": ["Telemetry lock verified"],
                    "operationalConstraints": ["Thermal bounds nominal"],
                    "isSimulated": true
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Secured Reconnaissance Alpha")))
                .andExpect(jsonPath("$.destinationGroup", is("Lunar & Deep Space")));
    }
}
