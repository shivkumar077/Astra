package org.astra.missions.domain;

import java.time.Instant;
import java.util.Map;

/**
 * Audit record of an interactive mission run executed on the simulation platform.
 */
public record MissionRun(
        String runId,
        String missionId,
        String spacecraftId,
        MissionStatus status,
        Instant startedEpoch,
        Instant completedEpoch,
        int telemetrySnapshotsCaptured,
        int commandsDispatched,
        String outcomeSummary,
        Map<String, Boolean> objectiveResults,
        String operatorUsername
) {
    public MissionRun withStatus(
            MissionStatus newStatus,
            Instant completed,
            String summary,
            Map<String, Boolean> objectives,
            int telemetryCount,
            int commandCount
    ) {
        return new MissionRun(
                this.runId,
                this.missionId,
                this.spacecraftId,
                newStatus,
                this.startedEpoch,
                completed,
                telemetryCount,
                commandCount,
                summary,
                objectives,
                this.operatorUsername
        );
    }
}
