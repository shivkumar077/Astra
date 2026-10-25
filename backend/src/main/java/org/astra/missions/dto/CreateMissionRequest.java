package org.astra.missions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.astra.missions.domain.MissionCategory;
import org.astra.missions.domain.MissionDifficulty;

import java.util.List;

/**
 * Payload for creating and registering an authoritative mission scenario in the Mission Universe.
 */
public record CreateMissionRequest(
        String id,
        @NotBlank(message = "Title is required") String title,
        @NotBlank(message = "Destination is required") String destination,
        String destinationGroup,
        @NotNull(message = "Category is required") MissionCategory category,
        @NotNull(message = "Difficulty is required") MissionDifficulty difficulty,
        @NotBlank(message = "Spacecraft ID is required") String spacecraftId,
        int durationMinutes,
        String riskLevel,
        @NotBlank(message = "Synopsis is required") String synopsis,
        List<String> objectives,
        List<String> completionCriteria,
        List<String> operationalConstraints,
        Boolean isSimulated
) {}
