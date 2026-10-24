package org.astra.imagery.dto;

import java.util.List;

/**
 * Curated planetary journey destination metadata.
 * Models the Sun and eight planets, including alternating desktop composition rules
 * and verified rover/mission records.
 */
public record PlanetaryDestination(
        String id,
        String name,
        String type,
        int orbitalOrder,
        String layoutComposition,
        String summary,
        List<MissionMetadata> historicalMissions,
        List<RoverMetadata> activeRovers,
        List<String> presetQueries,
        String sourceAttribution,
        String verificationNote
) {}
