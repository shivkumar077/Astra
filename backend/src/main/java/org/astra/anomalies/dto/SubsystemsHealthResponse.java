package org.astra.anomalies.dto;

import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.domain.subsystems.SpacecraftSubsystems;

import java.time.Instant;
import java.util.List;

/**
 * REST response providing authoritative physical and operational status across all 6 subsystems.
 */
public record SubsystemsHealthResponse(
        String spacecraftId,
        String callSign,
        Instant epoch,
        SpacecraftStatus overallStatus,
        SpacecraftSubsystems subsystems,
        List<String> activeFaultIds,
        int activeFaultCount
) {}
