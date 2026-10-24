package org.astra.api.dto;

import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.math.Vector3D;
import org.astra.telemetry.TelemetrySnapshot;

import java.time.Instant;

public record TelemetryResponse(
        String spacecraftId,
        String callSign,
        Instant timestamp,
        Vector3D positionKm,
        Vector3D velocityKmS,
        double altitudeKm,
        double speedKmS,
        boolean inEclipse,
        SpacecraftStatus operationalStatus,
        OperationalMode operationalMode,
        double batterySocPercent,
        double solarArrayWatts,
        KeplerianElements elements
) {

    public static TelemetryResponse fromSnapshot(TelemetrySnapshot s) {
        return new TelemetryResponse(
                s.spacecraftId(),
                s.callSign(),
                s.timestamp(),
                s.positionKm(),
                s.velocityKmS(),
                s.altitudeKm(),
                s.speedKmS(),
                s.inEclipse(),
                s.operationalStatus(),
                s.operationalMode(),
                s.batterySocPercent(),
                s.solarArrayWatts(),
                s.elements()
        );
    }
}
