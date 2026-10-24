package org.astra.core.domain.subsystems;

/**
 * Authoritative physical and operational state of the Electrical Power Subsystem (EPS).
 */
public record EpsSubsystemState(
        double batterySocPercent,
        double solarArrayWatts,
        double batteryVoltageVolts,
        double busLoadWatts,
        boolean loadSheddingActive,
        double solarDegradationMultiplier,
        boolean busOverloadActive
) {

    public static EpsSubsystemState nominal(double batterySoc, double solarWatts) {
        return new EpsSubsystemState(
                Math.clamp(batterySoc, 0.0, 100.0),
                Math.max(0.0, solarWatts),
                28.0,
                380.0,
                false,
                1.0,
                false
        );
    }
}
