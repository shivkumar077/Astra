package org.astra.observability;

import org.astra.simulation.engine.SimulationEngine;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Spring Boot Actuator Health Indicator for the ASTRA Simulation Engine.
 * Integrates into /actuator/health and /actuator/health/readiness probes.
 */
@Component
public class SimulationEngineHealthIndicator implements HealthIndicator {

    private final SimulationEngine simulationEngine;

    public SimulationEngineHealthIndicator(SimulationEngine simulationEngine) {
        this.simulationEngine = simulationEngine;
    }

    @Override
    public Health health() {
        try {
            var lifecycle = simulationEngine.getLifecycle();
            var epoch = simulationEngine.getCurrentEpoch();
            int craftCount = simulationEngine.getAllSpacecraft().size();

            return Health.up()
                    .withDetail("lifecycle", lifecycle != null ? lifecycle.name() : "INITIALIZING")
                    .withDetail("currentEpoch", epoch != null ? epoch.toString() : "UNKNOWN")
                    .withDetail("activeSpacecraftCount", craftCount)
                    .build();
        } catch (Exception e) {
            return Health.down(e)
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
