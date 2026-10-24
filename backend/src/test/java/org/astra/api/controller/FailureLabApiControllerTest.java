package org.astra.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.astra.anomalies.FaultScenarioCode;
import org.astra.anomalies.FaultSeverity;
import org.astra.anomalies.RecoveryActionType;
import org.astra.anomalies.dto.InjectFaultRequest;
import org.astra.anomalies.dto.RecoverFaultRequest;
import org.astra.api.dto.SubmitCommandRequest;
import org.astra.commands.CommandType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Phase 4 Failure Lab REST API Integration Tests")
class FailureLabApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/v1/faults/scenarios lists all 13 supported failure scenarios")
    void testGetScenariosCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/faults/scenarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(13)))
                .andExpect(jsonPath("$[?(@.scenarioCode == 'EPS_SOLAR_ARRAY_DEGRADATION')].subsystem").value("EPS"))
                .andExpect(jsonPath("$[?(@.scenarioCode == 'COMMS_RF_BLACKOUT')].expectedRecoveryAction").value("RESET_RF_TRANSCEIVER"))
                .andExpect(jsonPath("$[?(@.scenarioCode == 'TCS_HEAT_PIPE_FAILURE')].expectedRecoveryAction").value("PURGE_HEAT_PIPE_LOOP"))
                .andExpect(jsonPath("$[?(@.scenarioCode == 'ADCS_REACTION_WHEEL_DRAG')].expectedRecoveryAction").value("SPIN_DOWN_REACTION_WHEELS"))
                .andExpect(jsonPath("$[?(@.scenarioCode == 'PROP_VALVE_LEAK')].expectedRecoveryAction").value("ISOLATE_PROPULSION_VALVE"))
                .andExpect(jsonPath("$[?(@.scenarioCode == 'OBC_WATCHDOG_RESET')].expectedRecoveryAction").value("REBOOT_OBC_SYSTEM"));
    }

    @Test
    @DisplayName("Fault Injection, Retrieval, Recovery and Clearance REST Lifecycle")
    void testFaultInjectionAndRecoveryRestLifecycle() throws Exception {
        // 1. Inject fault
        InjectFaultRequest injectReq = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.EPS_SOLAR_ARRAY_DEGRADATION,
                FaultSeverity.MAJOR,
                Map.of("solarMultiplier", 0.4),
                "Simulated REST PV string degradation"
        );

        String createJson = mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(injectReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.faultId").isNotEmpty())
                .andExpect(jsonPath("$.spacecraftId").value("AURA-1"))
                .andExpect(jsonPath("$.scenarioCode").value("EPS_SOLAR_ARRAY_DEGRADATION"))
                .andExpect(jsonPath("$.lifecycleState").value("ACTIVE"))
                .andReturn().getResponse().getContentAsString();

        String faultId = objectMapper.readTree(createJson).get("faultId").asText();

        // 2. Retrieve fault details
        mockMvc.perform(get("/api/v1/faults/" + faultId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faultId").value(faultId))
                .andExpect(jsonPath("$.spacecraftId").value("AURA-1"));

        // 3. Attempt invalid recovery action (expected: SWITCH_REDUNDANT_STRING)
        RecoverFaultRequest invalidRecover = new RecoverFaultRequest(
                RecoveryActionType.SWITCH_BACKUP_STAR_TRACKER,
                "Invalid action should fail"
        );
        mockMvc.perform(post("/api/v1/faults/" + faultId + "/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRecover)))
                .andExpect(status().isBadRequest());

        // 4. Execute valid recovery action
        RecoverFaultRequest validRecover = new RecoverFaultRequest(
                RecoveryActionType.SWITCH_REDUNDANT_STRING,
                "Switched to redundant solar string via REST"
        );
        mockMvc.perform(post("/api/v1/faults/" + faultId + "/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRecover)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lifecycleState").value("RECOVERED"))
                .andExpect(jsonPath("$.recoveredEpoch").isNotEmpty());

        // 5. Test clearance endpoint on a newly injected fault
        InjectFaultRequest secondInject = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.COMMS_LINK_DEGRADATION,
                FaultSeverity.WARNING,
                Collections.emptyMap(),
                "Temporary atmospheric attenuation"
        );
        String secondJson = mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secondInject)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String secondFaultId = objectMapper.readTree(secondJson).get("faultId").asText();

        mockMvc.perform(delete("/api/v1/faults/" + secondFaultId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cleared").value(true))
                .andExpect(jsonPath("$.status").value("CLEARED"));
    }

    @Test
    @DisplayName("GET /api/v1/spacecraft/{id}/subsystems returns authoritative physical telemetry across 6 domains")
    void testGetSubsystemsHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/spacecraft/AURA-1/subsystems"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spacecraftId").value("AURA-1"))
                .andExpect(jsonPath("$.subsystems.eps.batteryVoltageVolts").value(28.0))
                .andExpect(jsonPath("$.subsystems.tcs.temperatureCelsius").isNumber())
                .andExpect(jsonPath("$.subsystems.adcs.pointingErrorDegrees").isNumber())
                .andExpect(jsonPath("$.subsystems.comms.linkStatus").value("ONLINE"))
                .andExpect(jsonPath("$.subsystems.prop.tankPressureBar").value(22.0))
                .andExpect(jsonPath("$.subsystems.obc.flightSoftwareState").value("NOMINAL"));
    }

    @Test
    @DisplayName("Command restrictions during Failure Lab faults: COMMS blackout rejects uplink, ADCS drag rejects optical capture")
    void testCommandRestrictionsDuringFaults() throws Exception {
        // 1. Inject COMMS RF blackout
        InjectFaultRequest blackoutReq = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.COMMS_RF_BLACKOUT,
                FaultSeverity.CRITICAL,
                Collections.emptyMap(),
                "Full RF blackout"
        );
        String blackoutJson = mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blackoutReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String blackoutId = objectMapper.readTree(blackoutJson).get("faultId").asText();

        // 2. Attempt command dispatch -> must be REJECTED due to blackout
        SubmitCommandRequest cmdReq = new SubmitCommandRequest(
                CommandType.TRIGGER_SAFE_MODE,
                "AURA-1",
                "CMD-BLACKOUT-TEST-" + System.currentTimeMillis(),
                Collections.emptyMap()
        );
        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cmdReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.message", containsString("active Failure Lab COMMS blackout")));

        // 3. Recover blackout
        RecoverFaultRequest recoverBlackout = new RecoverFaultRequest(
                RecoveryActionType.RESET_RF_TRANSCEIVER,
                "Rebooted transponder"
        );
        mockMvc.perform(post("/api/v1/faults/" + blackoutId + "/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recoverBlackout)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lifecycleState").value("RECOVERED"));

        // 4. Inject ADCS reaction wheel drag
        InjectFaultRequest adcsReq = new InjectFaultRequest(
                "AURA-1",
                FaultScenarioCode.ADCS_REACTION_WHEEL_DRAG,
                FaultSeverity.WARNING,
                Map.of("targetRpm", 5800.0),
                "Bearing friction"
        );
        String adcsJson = mockMvc.perform(post("/api/v1/faults/inject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adcsReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String adcsId = objectMapper.readTree(adcsJson).get("faultId").asText();

        // 5. Attempt optical capture -> must be REJECTED due to pointing error > 1.0 deg
        SubmitCommandRequest captureReq = new SubmitCommandRequest(
                CommandType.REQUEST_OPTICAL_CAPTURE,
                "AURA-1",
                "CMD-CAPTURE-TEST-" + System.currentTimeMillis(),
                Map.of("target", "Surface Crater Omega")
        );
        mockMvc.perform(post("/api/v1/commands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(captureReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.message", containsString("ADCS pointing error")));

        // 6. Recover ADCS
        RecoverFaultRequest recoverAdcs = new RecoverFaultRequest(
                RecoveryActionType.SPIN_DOWN_REACTION_WHEELS,
                "Desaturated reaction wheels"
        );
        mockMvc.perform(post("/api/v1/faults/" + adcsId + "/recover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recoverAdcs)))
                .andExpect(status().isOk());
    }
}
