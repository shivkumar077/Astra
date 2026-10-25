package org.astra.missions.dto;

import org.astra.missions.domain.MissionCategory;
import org.astra.missions.domain.MissionDefinition;
import org.astra.missions.domain.MissionDifficulty;
import org.astra.missions.domain.MissionRun;
import org.astra.missions.domain.MissionStatus;

import java.util.List;

/**
 * REST response representing a mission with its current operational state and latest run outcome.
 */
public record MissionResponse(
        String id,
        String title,
        String destination,
        String destinationGroup,
        MissionCategory category,
        String categoryLabel,
        MissionDifficulty difficulty,
        String difficultyLabel,
        String spacecraftId,
        int durationMinutes,
        String riskLevel,
        String synopsis,
        List<String> objectives,
        List<String> completionCriteria,
        List<String> operationalConstraints,
        boolean isSimulated,
        MissionStatus status,
        MissionRun activeRun,
        MissionRun lastCompletedRun
) {
    public static MissionResponse fromDefinition(
            MissionDefinition def,
            MissionRun activeRun,
            MissionRun lastCompletedRun
    ) {
        MissionStatus status = MissionStatus.AVAILABLE;
        if (activeRun != null && activeRun.status() == MissionStatus.ACTIVE) {
            status = MissionStatus.ACTIVE;
        } else if (lastCompletedRun != null) {
            status = lastCompletedRun.status();
        }

        return new MissionResponse(
                def.id(),
                def.title(),
                def.destination(),
                def.destinationGroup(),
                def.category(),
                def.category().getDisplayName(),
                def.difficulty(),
                def.difficulty().getLabel(),
                def.spacecraftId(),
                def.durationMinutes(),
                def.riskLevel(),
                def.synopsis(),
                def.objectives(),
                def.completionCriteria(),
                def.operationalConstraints(),
                def.isSimulated(),
                status,
                activeRun,
                lastCompletedRun
        );
    }
}
