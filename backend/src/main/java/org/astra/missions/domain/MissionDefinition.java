package org.astra.missions.domain;

import java.util.List;

/**
 * Immutable definition of a simulated or conceptual space mission in the ASTRA Universe.
 */
public record MissionDefinition(
        String id,
        String title,
        String destination,
        String destinationGroup, // "Earth", "Mars", "Lunar & Deep Space", "Outer Planets", "Solar"
        MissionCategory category,
        MissionDifficulty difficulty,
        String spacecraftId,
        int durationMinutes,
        String riskLevel,
        String synopsis,
        List<String> objectives,
        List<String> completionCriteria,
        List<String> operationalConstraints,
        boolean isSimulated
) {}
