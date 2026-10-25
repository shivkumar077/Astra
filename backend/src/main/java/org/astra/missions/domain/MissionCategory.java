package org.astra.missions.domain;

/**
 * Categorical mission domain classifications for ASTRA Mission Universe.
 */
public enum MissionCategory {
    EARTH_OBSERVATION("Earth Observation & Imaging"),
    TELEMETRY_MONITORING("Satellite Health & Telemetry"),
    ORBITAL_SAFETY("Orbital Debris Avoidance"),
    COMMUNICATIONS_RECOVERY("Communications Satellite Recovery"),
    PAYLOAD_CALIBRATION("Earth Observation Payload Calibration"),
    PLANETARY_RECONNAISSANCE("Planetary Surface & Reconnaissance"),
    DEEP_SPACE_SURVIVAL("Deep-Space Probe Health & Survival"),
    THERMAL_MANAGEMENT("Solar Observation & Thermal Management");

    private final String displayName;

    MissionCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
