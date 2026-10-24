package org.astra.core.domain.subsystems;

/**
 * Authoritative physical and operational state of the Communications and Telemetry Subsystem (COMMS).
 */
public record CommsSubsystemState(
        String linkStatus,
        double linkMarginDb,
        double packetLossPercent,
        boolean carrierLocked,
        boolean blackoutActive
) {

    public static CommsSubsystemState nominal() {
        return new CommsSubsystemState(
                "ONLINE",
                12.4,
                0.0,
                true,
                false
        );
    }
}
