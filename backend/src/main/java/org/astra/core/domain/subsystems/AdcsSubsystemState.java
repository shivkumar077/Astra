package org.astra.core.domain.subsystems;

/**
 * Authoritative physical and operational state of the Attitude Determination and Control Subsystem (ADCS).
 */
public record AdcsSubsystemState(
        double pointingErrorDegrees,
        String attitudeLockStatus,
        double reactionWheelSpeedRpm,
        boolean starTrackerLocked,
        boolean wheelFrictionActive
) {

    public static AdcsSubsystemState nominal() {
        return new AdcsSubsystemState(
                0.04,
                "LOCKED",
                2450.0,
                true,
                false
        );
    }
}
