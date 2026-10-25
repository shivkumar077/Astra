package org.astra.api.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("prod")
class MissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/v1/missions returns populated catalogue across solar system destinations")
    void testGetMissions() throws Exception {
        mockMvc.perform(get("/api/v1/missions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(10))))
                .andExpect(jsonPath("$[?(@.id == 'EARTH-OBS-AURA')].destinationGroup", contains("Earth")))
                .andExpect(jsonPath("$[?(@.id == 'MARS-RECON-01')].destinationGroup", contains("Mars")))
                .andExpect(jsonPath("$[?(@.id == 'LUNAR-SURVEY-01')].destinationGroup", contains("Lunar & Deep Space")));
    }

    @Test
    @DisplayName("GET /api/v1/missions with destination filter returns matching missions")
    void testGetMissionsFiltered() throws Exception {
        mockMvc.perform(get("/api/v1/missions?destination=Mars"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$[0].destinationGroup", is("Mars")));
    }

    @Test
    @DisplayName("GET /api/v1/missions/{id} returns full pre-flight briefing")
    void testGetMissionBriefing() throws Exception {
        mockMvc.perform(get("/api/v1/missions/EARTH-OBS-AURA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is("EARTH-OBS-AURA")))
                .andExpect(jsonPath("$.spacecraftId", is("AURA-1")))
                .andExpect(jsonPath("$.objectives", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$.completionCriteria", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$.operationalConstraints", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("POST /api/v1/missions/{id}/start starts live mission and complete/abort lifecycle works")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testMissionLifecycle() throws Exception {
        // 1. Start mission run
        String response = mockMvc.perform(post("/api/v1/missions/EARTH-OBS-AURA/start")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.missionId", is("EARTH-OBS-AURA")))
                .andExpect(jsonPath("$.spacecraftId", is("AURA-1")))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andReturn().getResponse().getContentAsString();

        // Extract runId
        com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response);
        String runId = node.get("runId").asText();

        // 2. Authoritatively complete the mission
        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId", is(runId)))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.outcomeSummary", containsString("Mission completed successfully")));

        // 3. Verify in history
        mockMvc.perform(get("/api/v1/missions/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.runId == '" + runId + "')].status", contains("COMPLETED")));
    }

    @Test
    @DisplayName("POST /api/v1/missions as OPERATOR creates and registers custom mission scenario")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testCreateMission_Success() throws Exception {
        String payload = """
                {
                    "title": "Titan Atmospheric Methane Probe",
                    "destination": "Titan (Polar Descent, 1200 km)",
                    "destinationGroup": "Outer Planets",
                    "category": "PLANETARY_RECONNAISSANCE",
                    "difficulty": "CRITICAL",
                    "spacecraftId": "AURA-1",
                    "durationMinutes": 60,
                    "riskLevel": "SEVERE",
                    "synopsis": "Descent probe measuring cryovolcanic methane lakes on Titan.",
                    "objectives": ["Measure atmospheric pressure", "Sample methane cloud layer"],
                    "completionCriteria": ["Telemetry link maintained", "Data downlink confirmed"],
                    "operationalConstraints": ["Cryogenic temperature threshold -180C"],
                    "isSimulated": true
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Titan Atmospheric Methane Probe")))
                .andExpect(jsonPath("$.destinationGroup", is("Outer Planets")))
                .andExpect(jsonPath("$.spacecraftId", is("AURA-1")))
                .andExpect(jsonPath("$.status", is("AVAILABLE")));
    }

    @Test
    @DisplayName("POST /api/v1/missions with invalid payload returns 400 Bad Request")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testCreateMission_ValidationError() throws Exception {
        String invalidPayload = """
                {
                    "title": "",
                    "destination": "",
                    "spacecraftId": ""
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/missions unauthenticated returns 401 Unauthorized")
    void testCreateMission_Unauthenticated() throws Exception {
        String payload = """
                {
                    "title": "Unauthorized Mission",
                    "destination": "Mars",
                    "category": "PLANETARY_RECONNAISSANCE",
                    "difficulty": "STANDARD",
                    "spacecraftId": "AURA-1",
                    "synopsis": "Test synopsis"
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }
}
