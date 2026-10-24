package org.astra.core.domain.subsystems;

import java.util.Objects;

/**
 * Aggregator encapsulating authoritative physical states across all 6 spacecraft subsystems.
 */
public record SpacecraftSubsystems(
        EpsSubsystemState eps,
        TcsSubsystemState tcs,
        AdcsSubsystemState adcs,
        CommsSubsystemState comms,
        PropSubsystemState prop,
        ObcSubsystemState obc
) {

    public SpacecraftSubsystems {
        Objects.requireNonNull(eps, "eps must not be null");
        Objects.requireNonNull(tcs, "tcs must not be null");
        Objects.requireNonNull(adcs, "adcs must not be null");
        Objects.requireNonNull(comms, "comms must not be null");
        Objects.requireNonNull(prop, "prop must not be null");
        Objects.requireNonNull(obc, "obc must not be null");
    }

    public static SpacecraftSubsystems nominal(double initialBatterySoc, double initialSolarWatts, double propellantMassKg) {
        return new SpacecraftSubsystems(
                EpsSubsystemState.nominal(initialBatterySoc, initialSolarWatts),
                TcsSubsystemState.nominal(),
                AdcsSubsystemState.nominal(),
                CommsSubsystemState.nominal(),
                PropSubsystemState.nominal(propellantMassKg),
                ObcSubsystemState.nominal()
        );
    }
}
