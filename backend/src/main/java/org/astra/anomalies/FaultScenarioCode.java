package org.astra.anomalies;

/**
 * Standard scenario codes for supported failure models across the 6 spacecraft subsystem domains.
 */
public enum FaultScenarioCode {
    // EPS — Electrical Power System
    EPS_SOLAR_ARRAY_DEGRADATION(SubsystemType.EPS, FaultSeverity.MAJOR, RecoveryActionType.SWITCH_REDUNDANT_STRING),
    EPS_BATTERY_CELL_DEGRADATION(SubsystemType.EPS, FaultSeverity.CRITICAL, RecoveryActionType.RESET_BATTERY_CHARGE_CONTROLLER),
    EPS_BUS_OVERLOAD(SubsystemType.EPS, FaultSeverity.MAJOR, RecoveryActionType.RECONFIGURE_POWER_BUS),

    // COMMS — Communications & Telemetry
    COMMS_RF_BLACKOUT(SubsystemType.COMMS, FaultSeverity.CRITICAL, RecoveryActionType.RESET_RF_TRANSCEIVER),
    COMMS_LINK_DEGRADATION(SubsystemType.COMMS, FaultSeverity.WARNING, RecoveryActionType.REALIGN_ANTENNA_GIMBAL),

    // TCS — Thermal Control System
    TCS_HEAT_PIPE_FAILURE(SubsystemType.TCS, FaultSeverity.MAJOR, RecoveryActionType.PURGE_HEAT_PIPE_LOOP),
    TCS_HEATER_CIRCUIT_FAILURE(SubsystemType.TCS, FaultSeverity.MAJOR, RecoveryActionType.SWITCH_REDUNDANT_HEATER_LOOP),

    // ADCS — Attitude Determination & Control System
    ADCS_REACTION_WHEEL_DRAG(SubsystemType.ADCS, FaultSeverity.WARNING, RecoveryActionType.SPIN_DOWN_REACTION_WHEELS),
    ADCS_STAR_TRACKER_BLINDING(SubsystemType.ADCS, FaultSeverity.MAJOR, RecoveryActionType.SWITCH_BACKUP_STAR_TRACKER),

    // PROP — Propulsion System
    PROP_VALVE_LEAK(SubsystemType.PROP, FaultSeverity.MAJOR, RecoveryActionType.ISOLATE_PROPULSION_VALVE),
    PROP_THRUSTER_COLD(SubsystemType.PROP, FaultSeverity.WARNING, RecoveryActionType.REHEAT_THRUSTER_MANIFOLD),

    // OBC — On-Board Computer
    OBC_CPU_THRASHING(SubsystemType.OBC, FaultSeverity.MAJOR, RecoveryActionType.RELOAD_FLIGHT_SOFTWARE_IMAGE),
    OBC_WATCHDOG_RESET(SubsystemType.OBC, FaultSeverity.CRITICAL, RecoveryActionType.REBOOT_OBC_SYSTEM);

    private final SubsystemType subsystem;
    private final FaultSeverity defaultSeverity;
    private final RecoveryActionType expectedRecoveryAction;

    FaultScenarioCode(SubsystemType subsystem, FaultSeverity defaultSeverity, RecoveryActionType expectedRecoveryAction) {
        this.subsystem = subsystem;
        this.defaultSeverity = defaultSeverity;
        this.expectedRecoveryAction = expectedRecoveryAction;
    }

    public SubsystemType getSubsystem() {
        return subsystem;
    }

    public FaultSeverity getDefaultSeverity() {
        return defaultSeverity;
    }

    public RecoveryActionType getExpectedRecoveryAction() {
        return expectedRecoveryAction;
    }
}
