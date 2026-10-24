package org.astra.api.dto;

import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;

public record SpacecraftSummaryResponse(
        String id,
        String callSign,
        String name,
        String modelType,
        double altitudeKm,
        double speedKmS,
        OperationalMode operationalMode,
        SpacecraftStatus operationalStatus,
        boolean inEclipse,
        double batterySocPercent
) {

    public static SpacecraftSummaryResponse fromSpacecraft(Spacecraft sc) {
        var orbit = sc.getCurrentOrbitState();
        return new SpacecraftSummaryResponse(
                sc.getId(),
                sc.getCallSign(),
                sc.getName(),
                sc.getModelType(),
                orbit.altitudeKm(),
                orbit.speedKmS(),
                sc.getOperationalMode(),
                sc.getOperationalStatus(),
                orbit.inEclipse(),
                sc.getBatterySocPercent()
        );
    }
}
