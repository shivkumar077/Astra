package org.astra.telemetry;

import org.astra.core.domain.KeplerianElements;
import org.astra.core.domain.OperationalMode;
import org.astra.core.domain.Spacecraft;
import org.astra.core.domain.SpacecraftStatus;
import org.astra.core.math.Vector3D;

import org.astra.core.domain.subsystems.SpacecraftSubsystems;

import java.time.Instant;
import java.util.Objects;

/**
 * Immutable telemetry frame capturing the authoritative state of a spacecraft at a simulation epoch.
 */
public record TelemetrySnapshot(
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
        KeplerianElements elements,
        SpacecraftSubsystems subsystems
) {

    public TelemetrySnapshot {
        Objects.requireNonNull(spacecraftId, "spacecraftId must not be null");
        Objects.requireNonNull(callSign, "callSign must not be null");
        Objects.requireNonNull(timestamp, "timestamp must not be null");
        Objects.requireNonNull(positionKm, "positionKm must not be null");
        Objects.requireNonNull(velocityKmS, "velocityKmS must not be null");
        Objects.requireNonNull(operationalStatus, "operationalStatus must not be null");
        Objects.requireNonNull(operationalMode, "operationalMode must not be null");
        Objects.requireNonNull(elements, "elements must not be null");
    }

    public TelemetrySnapshot(
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
        this(
                spacecraftId, callSign, timestamp, positionKm, velocityKmS,
                altitudeKm, speedKmS, inEclipse, operationalStatus, operationalMode,
                batterySocPercent, solarArrayWatts, elements, null
        );
    }

    /**
     * Synthesizes a telemetry snapshot directly from the current authoritative state of a Spacecraft.
     */
    public static TelemetrySnapshot fromSpacecraft(Spacecraft spacecraft) {
        Objects.requireNonNull(spacecraft, "spacecraft must not be null");
        var orbit = spacecraft.getCurrentOrbitState();
        return new TelemetrySnapshot(
                spacecraft.getId(),
                spacecraft.getCallSign(),
                orbit.epoch(),
                orbit.positionKm(),
                orbit.velocityKmS(),
                orbit.altitudeKm(),
                orbit.speedKmS(),
                orbit.inEclipse(),
                spacecraft.getOperationalStatus(),
                spacecraft.getOperationalMode(),
                spacecraft.getBatterySocPercent(),
                spacecraft.getSolarArrayWatts(),
                orbit.elements(),
                spacecraft.getSubsystems()
        );
    }
}
