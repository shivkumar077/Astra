package org.astra.core.domain.subsystems;

/**
 * Authoritative physical and operational state of the Propulsion Subsystem (PROP).
 */
public record PropSubsystemState(
        double propellantMassKg,
        double tankPressureBar,
        String valveHealth,
        double thrustMultiplier,
        boolean leakActive
) {

    public static PropSubsystemState nominal(double propellantMassKg) {
        return new PropSubsystemState(
                Math.max(0.0, propellantMassKg),
                22.0,
                "NOMINAL",
                1.0,
                false
        );
    }
}
