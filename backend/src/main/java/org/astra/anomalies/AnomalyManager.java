package org.astra.anomalies;

import org.astra.events.SimulationEventPublisher;
import org.astra.events.SimulationEventType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing active subsystem anomaly modifiers and extension points for future Failure Lab scenarios.
 */
@Service
public class AnomalyManager {

    private final Map<String, AnomalyModifier> activeAnomalies = new ConcurrentHashMap<>();
    private final SimulationEventPublisher eventPublisher;

    public AnomalyManager() {
        this(event -> {});
    }

    @Autowired
    public AnomalyManager(SimulationEventPublisher eventPublisher) {
        this.eventPublisher = Objects.requireNonNull(eventPublisher, "eventPublisher must not be null");
    }

    /**
     * Injects an anomaly modifier onto a spacecraft subsystem.
     */
    public AnomalyModifier inject(AnomalyModifier modifier) {
        Objects.requireNonNull(modifier, "modifier must not be null");
        activeAnomalies.put(modifier.id(), modifier);

        eventPublisher.publish(
                SimulationEventType.ANOMALY_TRIGGERED,
                modifier.triggeredEpoch(),
                modifier.spacecraftId(),
                "Subsystem anomaly injected: " + modifier.anomalyCode() + " on " + modifier.subsystem(),
                Map.of(
                        "anomalyId", modifier.id(),
                        "subsystem", modifier.subsystem().name(),
                        "anomalyCode", modifier.anomalyCode(),
                        "severityFactor", modifier.severityFactor(),
                        "blocksCommands", modifier.blocksCommands(),
                        "description", modifier.description()
                )
        );

        return modifier;
    }

    public AnomalyModifier injectAnomaly(AnomalyModifier modifier) {
        return inject(modifier);
    }

    /**
     * Clears an active anomaly modifier.
     */
    public boolean clear(String anomalyId, Instant currentEpoch) {
        AnomalyModifier removed = activeAnomalies.remove(anomalyId);
        if (removed != null) {
            eventPublisher.publish(
                    SimulationEventType.ANOMALY_CLEARED,
                    currentEpoch != null ? currentEpoch : Instant.now(),
                    removed.spacecraftId(),
                    "Subsystem anomaly cleared: " + removed.anomalyCode() + " on " + removed.subsystem(),
                    Map.of(
                            "anomalyId", removed.id(),
                            "subsystem", removed.subsystem().name(),
                            "anomalyCode", removed.anomalyCode()
                    )
            );
            return true;
        }
        return false;
    }

    public boolean clear(String anomalyId) {
        return clear(anomalyId, Instant.now());
    }

    public boolean clearAnomaly(String anomalyId) {
        return clear(anomalyId);
    }

    /**
     * Checks if a spacecraft is in an active communication blackout preventing command uplink.
     */
    public boolean isCommandBlocked(String spacecraftId) {
        return activeAnomalies.values().stream()
                .filter(AnomalyModifier::blocksCommands)
                .anyMatch(a -> a.spacecraftId() == null || Objects.equals(a.spacecraftId(), spacecraftId));
    }

    /**
     * Computes the current effective power generation multiplier for a spacecraft EPS.
     */
    public double getEffectivePowerMultiplier(String spacecraftId) {
        if (spacecraftId == null) return 1.0;
        return activeAnomalies.values().stream()
                .filter(a -> a.spacecraftId() == null || Objects.equals(a.spacecraftId(), spacecraftId))
                .filter(a -> a.subsystem() == SubsystemType.EPS)
                .mapToDouble(a -> 1.0 - a.severityFactor())
                .reduce(1.0, (a, b) -> a * b);
    }

    public double calculateEffectivePowerMultiplier(String spacecraftId) {
        return getEffectivePowerMultiplier(spacecraftId);
    }

    public Map<String, AnomalyModifier> getActiveModifiers() {
        return Collections.unmodifiableMap(activeAnomalies);
    }

    public Optional<AnomalyModifier> getModifier(String id) {
        return getAnomaly(id);
    }

    public List<AnomalyModifier> getActiveAnomalies(Optional<String> spacecraftId) {
        return activeAnomalies.values().stream()
                .filter(a -> spacecraftId.isEmpty() || Objects.equals(a.spacecraftId(), spacecraftId.get()))
                .toList();
    }

    public Optional<AnomalyModifier> getAnomaly(String id) {
        return Optional.ofNullable(activeAnomalies.get(id));
    }

    public void clearAll() {
        activeAnomalies.clear();
    }
}
