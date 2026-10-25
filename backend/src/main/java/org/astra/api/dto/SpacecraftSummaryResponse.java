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
        double batterySocPercent,
        String destination,
        String destinationGroup
) {

    public SpacecraftSummaryResponse(
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
        this(id, callSign, name, modelType, altitudeKm, speedKmS, operationalMode, operationalStatus, inEclipse, batterySocPercent, "Earth Orbit", "Earth");
    }

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
                sc.getBatterySocPercent(),
                sc.getDestination(),
                sc.getDestinationGroup()
        );
    }
}
