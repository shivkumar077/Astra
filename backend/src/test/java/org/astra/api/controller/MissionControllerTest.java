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

    @Autowired
    private org.astra.missions.service.MissionService missionService;

    @Autowired
    private java.util.Optional<org.astra.persistence.repository.MissionRunRepository> missionRunRepository;

    @org.junit.jupiter.api.BeforeEach
    void cleanActiveMissions() {
        if (missionRunRepository.isPresent()) {
            missionRunRepository.get().deleteAll();
        }
        if (missionService != null) {
            missionService.clearHistoryForTesting();
        }
    }

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
                    "spacecraftId": "CASSINI-O",
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
                .andExpect(jsonPath("$.spacecraftId", is("CASSINI-O")))
                .andExpect(jsonPath("$.status", is("AVAILABLE")));
    }

    @Test
    @DisplayName("POST /api/v1/missions with incompatible spacecraft returns 400 Bad Request")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testCreateMission_IncompatibleSpacecraft() throws Exception {
        // Attempting to assign Earth-assigned AURA-1 to Mars destination
        String payload = """
                {
                    "title": "Invalid Mars Weather Monitor",
                    "destination": "Mars (Valles Marineris Orbit)",
                    "destinationGroup": "Mars",
                    "category": "PLANETARY_RECONNAISSANCE",
                    "difficulty": "STANDARD",
                    "spacecraftId": "AURA-1",
                    "durationMinutes": 30,
                    "synopsis": "Invalid Mars mission attempting Earth spacecraft assignment."
                }
                """;

        mockMvc.perform(post("/api/v1/missions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("not compatible with destination")));
    }

    @Test
    @DisplayName("POST /api/v1/missions/{id}/start rejects relaunching an already completed mission")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testRelaunchCompletedMission_Rejected() throws Exception {
        // 1. Start and complete EARTH-CAL-AURA
        String startRes = mockMvc.perform(post("/api/v1/missions/EARTH-CAL-AURA/start?abortActive=true")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String runId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(startRes).get("runId").asText();

        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")));

        // 2. Attempting to start the same completed mission must be rejected with 409 Conflict
        mockMvc.perform(post("/api/v1/missions/EARTH-CAL-AURA/start")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("has already been completed")));
    }

    @Test
    @DisplayName("POST /api/v1/missions/runs/{runId}/abort and complete reject non-active runs")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testInvalidRunTransitions_Rejected() throws Exception {
        // 1. Launch a mission
        String startRes = mockMvc.perform(post("/api/v1/missions/EARTH-DEBRIS-TERRA/start?abortActive=true")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String runId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(startRes).get("runId").asText();

        // 2. Abort the mission
        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/abort")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Precautionary test abort\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ABORTED")));

        // 3. Attempting to abort an already aborted run must be rejected with 400 Bad Request
        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/abort")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("cannot be aborted because its status is ABORTED")));

        // 4. Attempting to complete an aborted run must be rejected with 400 Bad Request
        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("cannot be completed because its status is ABORTED")));
    }

    @Test
    @DisplayName("Repeating launch request for same active mission is idempotent and returns existing run")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testIdempotentDuplicateLaunch() throws Exception {
        // 1. First launch
        String res1 = mockMvc.perform(post("/api/v1/missions/EARTH-OBS-AURA/start?abortActive=true")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String runId1 = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res1).get("runId").asText();

        // 2. Second launch for identical mission
        String res2 = mockMvc.perform(post("/api/v1/missions/EARTH-OBS-AURA/start")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String runId2 = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res2).get("runId").asText();

        // 3. Verifies both return the exact same run without duplicate run creation
        org.junit.jupiter.api.Assertions.assertEquals(runId1, runId2);

        // Cleanup
        mockMvc.perform(post("/api/v1/missions/runs/" + runId1 + "/abort")
                        .contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("GET /api/v1/missions/runs/{runId} returns individual run and 404 for unknown run")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testGetRunById() throws Exception {
        // 1. Unknown run returns 404
        mockMvc.perform(get("/api/v1/missions/runs/non-existent-run"))
                .andExpect(status().isNotFound());

        // 2. Launch run and retrieve via GET /runs/{runId}
        String res = mockMvc.perform(post("/api/v1/missions/EARTH-OBS-AURA/start?abortActive=true")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String runId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res).get("runId").asText();

        mockMvc.perform(get("/api/v1/missions/runs/" + runId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runId", is(runId)))
                .andExpect(jsonPath("$.missionId", is("EARTH-OBS-AURA")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));

        // Cleanup
        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/abort")
                        .contentType(MediaType.APPLICATION_JSON));
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

    @Test
    @DisplayName("Regression Test: Starting a Mars mission retains Mars destination in run and history without falling back to Earth")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testMarsMissionDestinationRetention() throws Exception {
        // 1. Launch MARS-RECON-01
        String response = mockMvc.perform(post("/api/v1/missions/MARS-RECON-01/start")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.missionId", is("MARS-RECON-01")))
                .andExpect(jsonPath("$.destination", is("Mars (Areostationary & Polar Elliptical)")))
                .andExpect(jsonPath("$.destinationGroup", is("Mars")))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response);
        String runId = node.get("runId").asText();

        // 2. Authoritatively abort or complete the run
        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/abort")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Completed Mars atmospheric test cycle\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ABORTED")))
                .andExpect(jsonPath("$.destinationGroup", is("Mars")));

        // 3. Verify history record retains Mars destination
        mockMvc.perform(get("/api/v1/missions/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.runId == '" + runId + "')].destinationGroup", contains("Mars")))
                .andExpect(jsonPath("$[?(@.runId == '" + runId + "')].destination", contains("Mars (Areostationary & Polar Elliptical)")));
    }

    @Test
    @DisplayName("Regression Test: Starting a Lunar mission retains Lunar destination in run and history")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testLunarMissionDestinationRetention() throws Exception {
        String response = mockMvc.perform(post("/api/v1/missions/LUNAR-SURVEY-01/start")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.missionId", is("LUNAR-SURVEY-01")))
                .andExpect(jsonPath("$.destinationGroup", is("Lunar & Deep Space")))
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response);
        String runId = node.get("runId").asText();

        mockMvc.perform(post("/api/v1/missions/runs/" + runId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.destinationGroup", is("Lunar & Deep Space")));

        mockMvc.perform(get("/api/v1/missions/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.runId == '" + runId + "')].destinationGroup", contains("Lunar & Deep Space")));
    }

    @Test
    @DisplayName("Enforce single active mission policy: attempting concurrent start returns 409 Conflict, /switch or abortActive=true transitions seamlessly")
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void testSingleActiveMissionPolicyAndSwitch() throws Exception {
        // 1. Start Mission A (EARTH-COMMS-SOLIS) with abortActive=true to clear any previous runs
        String resA = mockMvc.perform(post("/api/v1/missions/EARTH-COMMS-SOLIS/start?abortActive=true")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.missionId", is("EARTH-COMMS-SOLIS")))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andReturn().getResponse().getContentAsString();

        String runIdA = new com.fasterxml.jackson.databind.ObjectMapper().readTree(resA).get("runId").asText();

        // 2. Active mission endpoint returns EARTH-COMMS-SOLIS
        mockMvc.perform(get("/api/v1/missions/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is("EARTH-COMMS-SOLIS")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));

        // 3. Attempting to start Mission B (MARS-ROVER-RELAY) without abortActive returns 409 Conflict
        mockMvc.perform(post("/api/v1/missions/MARS-ROVER-RELAY/start")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());

        // 4. Seamlessly switch to Mission B using /switch
        String resB = mockMvc.perform(post("/api/v1/missions/MARS-ROVER-RELAY/switch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Flight Director switch to Mars surface relay operations\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.missionId", is("MARS-ROVER-RELAY")))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andReturn().getResponse().getContentAsString();

        String runIdB = new com.fasterxml.jackson.databind.ObjectMapper().readTree(resB).get("runId").asText();

        // 5. Verify Mission A was aborted and archived in history
        mockMvc.perform(get("/api/v1/missions/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.runId == '" + runIdA + "')].status", contains("ABORTED")));

        // 6. Clean up: abort Mission B
        mockMvc.perform(post("/api/v1/missions/runs/" + runIdB + "/abort")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Catalogue includes at least 18 curated mission scenarios across Solar System destinations")
    void testExpandedCatalogueSize() throws Exception {
        mockMvc.perform(get("/api/v1/missions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(18))))
                .andExpect(jsonPath("$[?(@.id == 'MARS-ROVER-RELAY')].destinationGroup", contains("Mars")))
                .andExpect(jsonPath("$[?(@.id == 'MARS-POLAR-MAPPING')].destinationGroup", contains("Mars")))
                .andExpect(jsonPath("$[?(@.id == 'LUNAR-RELAY-FARSIDE')].destinationGroup", contains("Lunar & Deep Space")))
                .andExpect(jsonPath("$[?(@.id == 'LUNAR-RESOURCE-PROSPECT')].destinationGroup", contains("Lunar & Deep Space")))
                .andExpect(jsonPath("$[?(@.id == 'JUPITER-RADIATION-02')].destinationGroup", contains("Outer Planets")))
                .andExpect(jsonPath("$[?(@.id == 'SOLAR-STORM-CORONA')].destinationGroup", contains("Solar")));
    }
}

