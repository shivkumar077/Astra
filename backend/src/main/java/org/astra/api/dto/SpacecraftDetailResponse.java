package org.astra.api.dto;

import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.math.Vector3D;

import java.time.Instant;

public record SpacecraftDetailResponse(
        String id,
        String callSign,
        String name,
        String modelType,
        double dryMassKg,
        double propellantMassKg,
        double totalMassKg,
        Instant epoch,
        Vector3D positionKm,
        Vector3D velocityKmS,
        double altitudeKm,
        double speedKmS,
        boolean inEclipse,
        OperationalMode operationalMode,
        SpacecraftStatus operationalStatus,
        double batterySocPercent,
        double solarArrayWatts,
        KeplerianElements elements
) {

    public static SpacecraftDetailResponse fromSpacecraft(Spacecraft sc) {
        var orbit = sc.getCurrentOrbitState();
        return new SpacecraftDetailResponse(
                sc.getId(),
                sc.getCallSign(),
                sc.getName(),
                sc.getModelType(),
                sc.getDryMassKg(),
                sc.getPropellantMassKg(),
                sc.totalMassKg(),
                orbit.epoch(),
                orbit.positionKm(),
                orbit.velocityKmS(),
                orbit.altitudeKm(),
                orbit.speedKmS(),
                orbit.inEclipse(),
                sc.getOperationalMode(),
                sc.getOperationalStatus(),
                sc.getBatterySocPercent(),
                sc.getSolarArrayWatts(),
                orbit.elements()
        );
    }
}
