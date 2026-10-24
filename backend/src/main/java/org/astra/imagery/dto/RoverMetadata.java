package org.astra.imagery.dto;

import java.util.List;

/**
 * Verified surface rover metadata for planetary missions (e.g. Mars exploration).
 */
public record RoverMetadata(
        String roverName,
        String landingSite,
        int landingYear,
        String operationalStatus,
        List<String> instruments,
        String primarySearchQuery
) {}
