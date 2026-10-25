package org.astra.missions.domain;

/**
 * Operational difficulty rating for mission simulation scenarios.
 */
public enum MissionDifficulty {
    STANDARD("Standard / Nominal Operations"),
    CHALLENGING("Challenging / Active Anomaly"),
    CRITICAL("Critical / Extreme Contingency");

    private final String label;

    MissionDifficulty(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
