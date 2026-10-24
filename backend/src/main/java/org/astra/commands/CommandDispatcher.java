package org.astra.commands;

import org.astra.anomalies.AnomalyManager;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.astra.simulation.engine.SimulationEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Validates, executes, audits, and broadcasts authoritative telecommands on the simulation engine.
 */
@Service
public class CommandDispatcher {

    private final SimulationEngine simulationEngine;
    private final CommandHistoryService commandHistoryService;
    private final AnomalyManager anomalyManager;
    private final SimulationEventPublisher eventPublisher;

    @Autowired
    public CommandDispatcher(
            SimulationEngine simulationEngine,
            CommandHistoryService commandHistoryService,
            AnomalyManager anomalyManager,
            SimulationEventPublisher eventPublisher
    ) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
        this.commandHistoryService = Objects.requireNonNull(commandHistoryService, "commandHistoryService must not be null");
        this.anomalyManager = Objects.requireNonNull(anomalyManager, "anomalyManager must not be null");
        this.eventPublisher = Objects.requireNonNull(eventPublisher, "eventPublisher must not be null");
    }

    /**
     * Backward-compatible convenience constructor for unit tests that test simulation engine commands in isolation.
     */
    public CommandDispatcher(SimulationEngine simulationEngine) {
        this(
                simulationEngine,
                new CommandHistoryService(),
                new AnomalyManager(event -> {}),
                event -> {}
        );
    }

    /**
     * Dispatches and executes a command request against authoritative state with idempotency checking.
     *
     * @param request Validated command request
     * @return Deterministic CommandResult indicating outcome and resulting state
     */
    public CommandResult dispatch(CommandRequest request) {
        Objects.requireNonNull(request, "request must not be null");
        Instant currentEpoch = simulationEngine.getCurrentEpoch();

        // 1. Idempotency check: verify if command has already been executed
        String idempotencyKey = request.parameters().get("clientCommandId");
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            idempotencyKey = request.commandId();
        }

        Optional<CommandResult> cachedResult = commandHistoryService.findCachedResult(idempotencyKey);
        if (cachedResult.isPresent()) {
            return CommandResult.asIdempotentReplay(cachedResult.get());
        }

        // 2. Failure Lab extension check: communications blackout or processor restart lockout prevents uplink
        if (request.spacecraftId() != null) {
            if (anomalyManager.isCommandBlocked(request.spacecraftId())) {
                CommandResult rejected = CommandResult.rejected(
                        request.commandId(),
                        request.spacecraftId(),
                        request.type(),
                        "Uplink rejected: Spacecraft " + request.spacecraftId() + " has an active COMMS blackout anomaly",
                        currentEpoch
                );
                recordAndPublish(request, rejected);
                return rejected;
            }
            if (simulationEngine.getFailureLabService() != null && simulationEngine.getFailureLabService().isCommandBlocked(request.spacecraftId())) {
                CommandResult rejected = CommandResult.rejected(
                        request.commandId(),
                        request.spacecraftId(),
                        request.type(),
                        "Uplink rejected: Spacecraft " + request.spacecraftId() + " has an active Failure Lab COMMS blackout or OBC restart lockout",
                        currentEpoch
                );
                recordAndPublish(request, rejected);
                return rejected;
            }
        }

        // 3. Staging and execution
        CommandResult result;
        try {
            result = switch (request.type()) {
                case SET_OPERATIONAL_MODE -> executeSetOperationalMode(request, currentEpoch);
                case TRIGGER_SAFE_MODE -> executeTriggerSafeMode(request, currentEpoch);
                case ADVANCE_TIME -> executeAdvanceTime(request, currentEpoch);
                case PAUSE_SIMULATION -> executePauseSimulation(request, currentEpoch);
                case RESUME_SIMULATION -> executeResumeSimulation(request, currentEpoch);
                case REQUEST_OPTICAL_CAPTURE -> executeOpticalCapture(request, currentEpoch);
                case EXECUTE_FAULT_RECOVERY -> executeFaultRecovery(request, currentEpoch);
            };
        } catch (Exception e) {
            result = CommandResult.failed(
                    request.commandId(),
                    request.spacecraftId(),
                    request.type(),
                    "Unexpected command execution failure: " + e.getMessage(),
                    currentEpoch
            );
        }

        recordAndPublish(request, result);
        return result;
    }

    private void recordAndPublish(CommandRequest request, CommandResult result) {
        commandHistoryService.record(request, result);

        SimulationEventType eventType = switch (result.status()) {
            case EXECUTED -> SimulationEventType.COMMAND_EXECUTED;
            case REJECTED -> SimulationEventType.COMMAND_REJECTED;
            case FAILED -> SimulationEventType.COMMAND_FAILED;
            case ACCEPTED -> SimulationEventType.COMMAND_ACCEPTED;
        };

        eventPublisher.publish(
                eventType,
                result.executionEpoch(),
                result.spacecraftId(),
                "Command " + result.type() + " " + result.status() + ": " + result.message(),
                Map.of(
                        "commandId", result.commandId(),
                        "type", result.type().name(),
                        "status", result.status().name(),
                        "idempotentReplay", result.idempotentReplay(),
                        "details", result.outputData()
                )
        );
    }

    private CommandResult executeSetOperationalMode(CommandRequest request, Instant epoch) {
        if (request.spacecraftId() == null || request.spacecraftId().isBlank()) {
            return CommandResult.rejected(request.commandId(), null, request.type(), "Missing target spacecraftId", epoch);
        }

        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(request.spacecraftId());
        if (scOpt.isEmpty()) {
            return CommandResult.rejected(
                    request.commandId(), request.spacecraftId(), request.type(),
                    "Target spacecraft not found in fleet: " + request.spacecraftId(), epoch
            );
        }

        String modeStr = request.parameters().get("mode");
        if (modeStr == null || modeStr.isBlank()) {
            return CommandResult.rejected(request.commandId(), request.spacecraftId(), request.type(), "Missing required parameter: 'mode'", epoch);
        }

        OperationalMode targetMode;
        try {
            targetMode = OperationalMode.valueOf(modeStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return CommandResult.rejected(
                    request.commandId(), request.spacecraftId(), request.type(),
                    "Invalid operational mode '" + modeStr + "'. Valid options: " + java.util.Arrays.toString(OperationalMode.values()), epoch
            );
        }

        Spacecraft sc = scOpt.get();
        if (sc.getOperationalMode() == OperationalMode.DECOMMISSIONED) {
            return CommandResult.rejected(
                    request.commandId(), request.spacecraftId(), request.type(),
                    "Cannot reconfigure operational mode on a DECOMMISSIONED spacecraft", epoch
            );
        }

        OperationalMode previousMode = sc.getOperationalMode();
        sc.setOperationalMode(targetMode);

        if (targetMode == OperationalMode.SAFE_MODE) {
            sc.setOperationalStatus(SpacecraftStatus.DEGRADED);
        } else if (targetMode == OperationalMode.NOMINAL && sc.getOperationalStatus() == SpacecraftStatus.DEGRADED) {
            sc.setOperationalStatus(SpacecraftStatus.NOMINAL);
        }

        return CommandResult.executed(
                request.commandId(),
                sc.getId(),
                request.type(),
                "Operational mode transitioned from " + previousMode + " to " + targetMode,
                epoch,
                Map.of("previousMode", previousMode.name(), "currentMode", targetMode.name())
        );
    }

    private CommandResult executeTriggerSafeMode(CommandRequest request, Instant epoch) {
        if (request.spacecraftId() == null || request.spacecraftId().isBlank()) {
            return CommandResult.rejected(request.commandId(), null, request.type(), "Missing target spacecraftId", epoch);
        }

        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(request.spacecraftId());
        if (scOpt.isEmpty()) {
            return CommandResult.rejected(
                    request.commandId(), request.spacecraftId(), request.type(),
                    "Target spacecraft not found in fleet: " + request.spacecraftId(), epoch
            );
        }

        Spacecraft sc = scOpt.get();
        sc.setOperationalMode(OperationalMode.SAFE_MODE);
        sc.setOperationalStatus(SpacecraftStatus.DEGRADED);

        String reason = request.parameters().getOrDefault("reason", "Operator contingency command");

        return CommandResult.executed(
                request.commandId(),
                sc.getId(),
                request.type(),
                "Safe mode commanded: " + reason,
                epoch,
                Map.of("operationalMode", OperationalMode.SAFE_MODE.name(), "status", SpacecraftStatus.DEGRADED.name())
        );
    }

    private CommandResult executeAdvanceTime(CommandRequest request, Instant epoch) {
        String secondsStr = request.parameters().get("seconds");
        if (secondsStr == null || secondsStr.isBlank()) {
            return CommandResult.rejected(request.commandId(), null, request.type(), "Missing required parameter: 'seconds'", epoch);
        }

        double seconds;
        try {
            seconds = Double.parseDouble(secondsStr.trim());
        } catch (NumberFormatException e) {
            return CommandResult.rejected(request.commandId(), null, request.type(), "Parameter 'seconds' must be a valid number, got: " + secondsStr, epoch);
        }

        if (seconds <= 0.0) {
            return CommandResult.rejected(request.commandId(), null, request.type(), "Time advancement must be strictly positive, got: " + seconds, epoch);
        }

        Duration stepDuration = Duration.ofNanos((long) (seconds * 1.0e9));
        Instant newEpoch = simulationEngine.step(stepDuration);

        return CommandResult.executed(
                request.commandId(),
                request.spacecraftId(),
                request.type(),
                "Advanced simulation clock by " + seconds + " seconds to " + newEpoch,
                newEpoch,
                Map.of("advancedSeconds", seconds, "newEpoch", newEpoch.toString())
        );
    }

    private CommandResult executePauseSimulation(CommandRequest request, Instant epoch) {
        simulationEngine.pause();
        return CommandResult.executed(
                request.commandId(),
                null,
                request.type(),
                "Simulation advancement suspended (PAUSED)",
                epoch,
                Map.of("lifecycle", simulationEngine.getLifecycle().name())
        );
    }

    private CommandResult executeResumeSimulation(CommandRequest request, Instant epoch) {
        simulationEngine.resume();
        return CommandResult.executed(
                request.commandId(),
                null,
                request.type(),
                "Simulation advancement resumed (RUNNING)",
                epoch,
                Map.of("lifecycle", simulationEngine.getLifecycle().name())
        );
    }

    private CommandResult executeOpticalCapture(CommandRequest request, Instant epoch) {
        if (request.spacecraftId() == null || request.spacecraftId().isBlank()) {
            return CommandResult.rejected(request.commandId(), null, request.type(), "Missing target spacecraftId", epoch);
        }

        Optional<Spacecraft> scOpt = simulationEngine.getSpacecraft(request.spacecraftId());
        if (scOpt.isEmpty()) {
            return CommandResult.rejected(
                    request.commandId(), request.spacecraftId(), request.type(),
                    "Target spacecraft not found in fleet: " + request.spacecraftId(), epoch
            );
        }

        Spacecraft sc = scOpt.get();

        // 1. Vehicle operational mode checks
        if (sc.getOperationalMode() == OperationalMode.SAFE_MODE || sc.getOperationalMode() == OperationalMode.LOW_POWER) {
            return CommandResult.rejected(
                    request.commandId(), sc.getId(), request.type(),
                    "Optical capture rejected: Spacecraft is in " + sc.getOperationalMode() + " mode; cannot perform optical capture.",
                    epoch
            );
        }
        if (sc.getOperationalMode() == OperationalMode.DECOMMISSIONED) {
            return CommandResult.rejected(
                    request.commandId(), sc.getId(), request.type(),
                    "Optical capture rejected: Spacecraft is DECOMMISSIONED.",
                    epoch
            );
        }

        // 2. Operational health status checks
        if (sc.getOperationalStatus() == SpacecraftStatus.CRITICAL || sc.getOperationalStatus() == SpacecraftStatus.DEGRADED) {
            return CommandResult.rejected(
                    request.commandId(), sc.getId(), request.type(),
                    "Optical capture rejected: Spacecraft health status is " + sc.getOperationalStatus() + "; payload lockout enforced.",
                    epoch
            );
        }

        // 3. Physical illumination constraint: optical capture requires solar illumination (not eclipse)
        if (sc.getCurrentOrbitState().inEclipse()) {
            return CommandResult.rejected(
                    request.commandId(), sc.getId(), request.type(),
                    "Optical capture rejected: Spacecraft is currently in Earth shadow / eclipse; solar illumination required for optical imaging.",
                    epoch
            );
        }

        // 4. Power reserve constraint: minimum 30% battery SoC required for camera and readout
        if (sc.getBatterySocPercent() < 30.0) {
            return CommandResult.rejected(
                    request.commandId(), sc.getId(), request.type(),
                    "Optical capture rejected: insufficient battery charge (" + String.format("%.1f", sc.getBatterySocPercent()) + "% < 30.0% threshold).",
                    epoch
            );
        }

        // 5. ADCS pointing stability constraint: pointing error must not exceed 1.0 deg and attitude must be locked
        if (sc.getSubsystems() != null && sc.getSubsystems().adcs() != null) {
            var adcs = sc.getSubsystems().adcs();
            if (adcs.pointingErrorDegrees() > 1.0 || "LOST".equalsIgnoreCase(adcs.attitudeLockStatus()) || "DEGRADED".equalsIgnoreCase(adcs.attitudeLockStatus())) {
                return CommandResult.rejected(
                        request.commandId(), sc.getId(), request.type(),
                        "Optical capture rejected: ADCS pointing error (" + String.format("%.2f", adcs.pointingErrorDegrees())
                                + " deg > 1.0 deg limit) or attitude lock degraded (" + adcs.attitudeLockStatus() + ").",
                        epoch
                );
            }
        }

        // Perform synthetic capture: deduct 0.3% battery charge
        sc.updatePowerMetrics(Math.max(10.0, sc.getBatterySocPercent() - 0.3), sc.getSolarArrayWatts());

        String target = request.parameters().getOrDefault("target", "Surface Region Alpha");
        String captureId = "CAP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        double altitudeKm = sc.getCurrentOrbitState().altitudeKm();
        double gsdMeters = Math.round((altitudeKm * 0.0012) * 100.0) / 100.0;

        Map<String, Object> captureMetadata = Map.of(
                "captureId", captureId,
                "target", target,
                "altitudeKm", altitudeKm,
                "groundSampleDistanceMeters", gsdMeters,
                "sensorType", "HIGH_RES_MULTISPECTRAL_OPTICAL",
                "illuminationCondition", "DIRECT_SUNLIGHT",
                "syntheticClassification", "SIMULATED_TEST_CAPTURE_LEDGER",
                "batterySocRemaining", sc.getBatterySocPercent()
        );

        eventPublisher.publish(
                SimulationEventType.IMAGING_CAPTURE_COMPLETED,
                epoch,
                sc.getId(),
                "Optical capture " + captureId + " completed for target '" + target + "' at altitude " + String.format("%.1f", altitudeKm) + " km",
                captureMetadata
        );

        return CommandResult.executed(
                request.commandId(),
                sc.getId(),
                request.type(),
                "Optical payload capture synthetic sequence initiated: synthetic capture " + captureId + " (Target: " + target + ")",
                epoch,
                captureMetadata
        );
    }

    private CommandResult executeFaultRecovery(CommandRequest request, Instant epoch) {
        String faultId = request.parameters().get("faultId");
        if (faultId == null || faultId.isBlank()) {
            return CommandResult.rejected(request.commandId(), request.spacecraftId(), request.type(), "Missing required parameter: 'faultId'", epoch);
        }
        String actionStr = request.parameters().get("recoveryAction");
        if (actionStr == null || actionStr.isBlank()) {
            return CommandResult.rejected(request.commandId(), request.spacecraftId(), request.type(), "Missing required parameter: 'recoveryAction'", epoch);
        }

        org.astra.anomalies.RecoveryActionType action;
        try {
            action = org.astra.anomalies.RecoveryActionType.valueOf(actionStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return CommandResult.rejected(request.commandId(), request.spacecraftId(), request.type(), "Invalid recovery action: " + actionStr, epoch);
        }

        if (simulationEngine.getFailureLabService() == null) {
            return CommandResult.failed(request.commandId(), request.spacecraftId(), request.type(), "Failure Lab service unavailable", epoch);
        }

        var faultOpt = simulationEngine.getFailureLabService().getFault(faultId);
        if (faultOpt.isEmpty()) {
            return CommandResult.rejected(request.commandId(), request.spacecraftId(), request.type(), "Fault not found: " + faultId, epoch);
        }

        var fault = faultOpt.get();
        var scOpt = simulationEngine.getSpacecraft(fault.spacecraftId());
        if (scOpt.isEmpty()) {
            return CommandResult.rejected(request.commandId(), fault.spacecraftId(), request.type(), "Target spacecraft not found: " + fault.spacecraftId(), epoch);
        }

        try {
            var recovered = simulationEngine.getFailureLabService().recoverFault(
                    faultId,
                    new org.astra.anomalies.dto.RecoverFaultRequest(action, request.parameters().get("operatorNote")),
                    epoch,
                    scOpt.get()
            );
            return CommandResult.executed(
                    request.commandId(),
                    recovered.spacecraftId(),
                    request.type(),
                    "Fault recovery successfully executed: " + action + " on " + recovered.scenarioCode(),
                    epoch,
                    Map.of(
                            "faultId", recovered.faultId(),
                            "scenarioCode", recovered.scenarioCode().name(),
                            "lifecycleState", recovered.lifecycleState().name()
                    )
            );
        } catch (IllegalArgumentException e) {
            return CommandResult.rejected(request.commandId(), fault.spacecraftId(), request.type(), e.getMessage(), epoch);
        } catch (Exception e) {
            return CommandResult.failed(request.commandId(), fault.spacecraftId(), request.type(), e.getMessage(), epoch);
        }
    }
}
