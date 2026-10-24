package org.astra.core.domain.subsystems;

/**
 * Authoritative physical and operational state of the On-Board Computer (OBC).
 */
public record ObcSubsystemState(
        double cpuUtilizationPercent,
        double memoryUtilizationPercent,
        String flightSoftwareState,
        int rebootCount,
        double rebootRemainingSeconds
) {

    public static ObcSubsystemState nominal() {
        return new ObcSubsystemState(
                32.5,
                44.0,
                "NOMINAL",
                0,
                0.0
        );
    }
}
