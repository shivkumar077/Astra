package org.astra.anomalies;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable modifier representing an active physical or operational perturbation on a subsystem.
 */
public record AnomalyModifier(
        String id,
        String spacecraftId,
        SubsystemType subsystem,
        String anomalyCode,
        double severityFactor,
        boolean blocksCommands,
        String description,
        Instant triggeredEpoch
) {

    public AnomalyModifier {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(subsystem, "subsystem must not be null");
        Objects.requireNonNull(anomalyCode, "anomalyCode must not be null");
        Objects.requireNonNull(description, "description must not be null");
        Objects.requireNonNull(triggeredEpoch, "triggeredEpoch must not be null");
    }

    public AnomalyModifier(
            String id,
            String spacecraftId,
            SubsystemType subsystem,
            String description,
            double severityFactor,
            boolean blocksCommands,
            Instant triggeredEpoch
    ) {
        this(id, spacecraftId, subsystem, subsystem.name() + "_FAULT", severityFactor, blocksCommands, description, triggeredEpoch);
    }

    public static AnomalyModifier of(
            String spacecraftId,
            SubsystemType subsystem,
            String anomalyCode,
            double severityFactor,
            boolean blocksCommands,
            String description,
            Instant triggeredEpoch
    ) {
        return new AnomalyModifier(
                UUID.randomUUID().toString(),
                spacecraftId,
                subsystem,
                anomalyCode,
                severityFactor,
                blocksCommands,
                description,
                triggeredEpoch
        );
    }

    @com.fasterxml.jackson.annotation.JsonProperty("anomalyId")
    public String anomalyId() {
        return id;
    }
}
