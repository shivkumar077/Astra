package org.astra.anomalies;

import org.astra.events.SimulationEvent;
import org.astra.events.SimulationEventType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("AnomalyManager Failure Lab Extension Points Tests")
class AnomalyManagerTest {

    private AnomalyManager anomalyManager;
    private List<SimulationEvent> emittedEvents;
    private final Instant baseEpoch = Instant.parse("2026-10-24T00:00:00Z");

    @BeforeEach
    void setUp() {
        emittedEvents = new ArrayList<>();
        anomalyManager = new AnomalyManager(emittedEvents::add);
    }

    @Test
    @DisplayName("Injecting and clearing anomalies updates active state and emits events")
    void testInjectAndClearAnomaly() {
        AnomalyModifier modifier = new AnomalyModifier(
                "ANOM-EPS-1",
                "AURA-1",
                SubsystemType.EPS,
                "Solar array cell micro-meteoroid degradation",
                0.35,
                false,
                baseEpoch
        );

        anomalyManager.injectAnomaly(modifier);

        assertEquals(1, anomalyManager.getActiveModifiers().size());
        assertEquals(modifier, anomalyManager.getModifier("ANOM-EPS-1").orElseThrow());

        // Verify ANOMALY_TRIGGERED event emitted
        assertEquals(1, emittedEvents.size());
        SimulationEvent trigEvent = emittedEvents.get(0);
        assertEquals(SimulationEventType.ANOMALY_TRIGGERED, trigEvent.type());
        assertEquals("AURA-1", trigEvent.spacecraftId());
        assertEquals("ANOM-EPS-1", trigEvent.details().get("anomalyId"));

        // Clear anomaly
        boolean cleared = anomalyManager.clearAnomaly("ANOM-EPS-1");
        assertTrue(cleared);
        assertEquals(0, anomalyManager.getActiveModifiers().size());

        // Verify ANOMALY_CLEARED event emitted
        assertEquals(2, emittedEvents.size());
        SimulationEvent clearEvent = emittedEvents.get(1);
        assertEquals(SimulationEventType.ANOMALY_CLEARED, clearEvent.type());
        assertEquals("ANOM-EPS-1", clearEvent.details().get("anomalyId"));
    }

    @Test
    @DisplayName("isCommandBlocked correctly accounts for targeted and fleet-wide COMMS outages")
    void testCommandBlackoutLogic() {
        assertFalse(anomalyManager.isCommandBlocked("AURA-1"));
        assertFalse(anomalyManager.isCommandBlocked("TERRA-OBS"));

        // Target AURA-1 only
        anomalyManager.injectAnomaly(new AnomalyModifier(
                "ANOM-RF-1",
                "AURA-1",
                SubsystemType.COMMS,
                "Antenna gimbal motor lockup",
                1.0,
                true,
                baseEpoch
        ));

        assertTrue(anomalyManager.isCommandBlocked("AURA-1"));
        assertFalse(anomalyManager.isCommandBlocked("TERRA-OBS"));

        // Inject fleet-wide comms blackout (spacecraftId == null)
        anomalyManager.injectAnomaly(new AnomalyModifier(
                "ANOM-SOLAR-STORM",
                null,
                SubsystemType.COMMS,
                "Extreme geomagnetic solar storm coronal mass ejection",
                1.0,
                true,
                baseEpoch
        ));

        assertTrue(anomalyManager.isCommandBlocked("AURA-1"));
        assertTrue(anomalyManager.isCommandBlocked("TERRA-OBS"));

        // Clear fleet-wide
        anomalyManager.clearAnomaly("ANOM-SOLAR-STORM");
        assertTrue(anomalyManager.isCommandBlocked("AURA-1"));
        assertFalse(anomalyManager.isCommandBlocked("TERRA-OBS"));

        // Clear AURA-1
        anomalyManager.clearAnomaly("ANOM-RF-1");
        assertFalse(anomalyManager.isCommandBlocked("AURA-1"));
    }

    @Test
    @DisplayName("calculateEffectivePowerMultiplier reduces power based on active EPS anomalies")
    void testPowerMultiplierCalculation() {
        assertEquals(1.0, anomalyManager.calculateEffectivePowerMultiplier("AURA-1"), 1e-6);

        // 30% degradation (factor = 0.3) -> multiplier should be 0.7
        anomalyManager.injectAnomaly(new AnomalyModifier(
                "ANOM-PWR-1",
                "AURA-1",
                SubsystemType.EPS,
                "String 2 shunt regulator failure",
                0.3,
                false,
                baseEpoch
        ));

        assertEquals(0.7, anomalyManager.calculateEffectivePowerMultiplier("AURA-1"), 1e-6);

        // Unaffected spacecraft has 1.0
        assertEquals(1.0, anomalyManager.calculateEffectivePowerMultiplier("TERRA-OBS"), 1e-6);

        // Clear anomaly restores 1.0
        anomalyManager.clearAnomaly("ANOM-PWR-1");
        assertEquals(1.0, anomalyManager.calculateEffectivePowerMultiplier("AURA-1"), 1e-6);
    }
}
