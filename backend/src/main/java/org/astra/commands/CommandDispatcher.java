package org.astra.commands;

import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.simulation.engine.SimulationEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Validates, executes, and audits authoritative telecommands on the simulation engine.
 */
@Service
public class CommandDispatcher {

    private final SimulationEngine simulationEngine;

    @Autowired
    public CommandDispatcher(SimulationEngine simulationEngine) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
    }

    /**
     * Dispatches and executes a command request against authoritative state.
     *
     * @param request Validated command request
     * @return Deterministic CommandResult indicating outcome and resulting state
     */
    public CommandResult dispatch(CommandRequest request) {
        Objects.requireNonNull(request, "request must not be null");
        Instant currentEpoch = simulationEngine.getCurrentEpoch();

        try {
            return switch (request.type()) {
                case SET_OPERATIONAL_MODE -> executeSetOperationalMode(request, currentEpoch);
                case TRIGGER_SAFE_MODE -> executeTriggerSafeMode(request, currentEpoch);
                case ADVANCE_TIME -> executeAdvanceTime(request, currentEpoch);
                case PAUSE_SIMULATION -> executePauseSimulation(request, currentEpoch);
                case RESUME_SIMULATION -> executeResumeSimulation(request, currentEpoch);
            };
        } catch (Exception e) {
            return CommandResult.failed(
                    request.commandId(),
                    request.spacecraftId(),
                    request.type(),
                    "Unexpected command execution failure: " + e.getMessage(),
                    currentEpoch
            );
        }
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
}
