package org.astra.imagery.dto;

/**
 * Verified spacecraft mission metadata associated with a celestial destination.
 */
public record MissionMetadata(
        String missionCode,
        String missionName,
        String operatorAgency,
        int launchYear,
        String operationalStatus,
        String targetBody,
        String description,
        String primarySearchQuery
) {}
