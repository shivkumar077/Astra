package org.astra.core.domain.subsystems;

/**
 * Authoritative physical and operational state of the Thermal Control Subsystem (TCS).
 */
public record TcsSubsystemState(
        double temperatureCelsius,
        boolean heaterActive,
        boolean heaterOperational,
        double radiatorEfficiency,
        boolean thermalSafingActive
) {

    public static TcsSubsystemState nominal() {
        return new TcsSubsystemState(
                18.5,
                false,
                true,
                1.0,
                false
        );
    }
}
