package org.astra.simulation.scheduler;

import jakarta.annotation.PreDestroy;
import org.astra.simulation.engine.SimulationEngine;
import org.astra.simulation.engine.SimulationLifecycle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.*;

/**
 * Optional continuous simulation scheduler decoupled from core simulation mathematics.
 * Advances simulation time at a configurable real-time tick frequency without wall-clock sleeps in domain logic.
 */
@Service
public class ContinuousSimulationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ContinuousSimulationScheduler.class);

    private final SimulationEngine simulationEngine;
    private final ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "astra-continuous-sim-worker");
        t.setDaemon(true);
        return t;
    });

    private ScheduledFuture<?> currentTask;
    private volatile boolean running = false;
    private volatile double currentTickRateHz = 1.0;
    private volatile double currentStepSeconds = 1.0;

    @Autowired
    public ContinuousSimulationScheduler(
            SimulationEngine simulationEngine,
            @Value("${astra.simulation.continuous.enabled:false}") boolean autoStart,
            @Value("${astra.simulation.continuous.tick-rate-hz:1.0}") double tickRateHz,
            @Value("${astra.simulation.continuous.step-seconds:1.0}") double stepSeconds
    ) {
        this.simulationEngine = Objects.requireNonNull(simulationEngine, "simulationEngine must not be null");
        this.currentTickRateHz = Math.max(0.1, Math.min(tickRateHz, 20.0));
        this.currentStepSeconds = Math.max(0.01, stepSeconds);

        if (autoStart) {
            start(this.currentTickRateHz, this.currentStepSeconds);
        }
    }

    public synchronized void start(double tickRateHz, double stepSeconds) {
        stop();

        this.currentTickRateHz = Math.max(0.1, Math.min(tickRateHz, 20.0));
        this.currentStepSeconds = Math.max(0.01, stepSeconds);

        long periodMillis = (long) (1000.0 / this.currentTickRateHz);
        Duration stepDuration = Duration.ofNanos((long) (this.currentStepSeconds * 1.0e9));

        currentTask = executorService.scheduleAtFixedRate(() -> {
            try {
                if (simulationEngine.getLifecycle() == SimulationLifecycle.RUNNING) {
                    simulationEngine.step(stepDuration);
                }
            } catch (Exception e) {
                log.warn("Continuous simulation tick encounter error: {}", e.getMessage());
            }
        }, 0, periodMillis, TimeUnit.MILLISECONDS);

        this.running = true;
        log.info("Continuous simulation scheduler started: {} Hz, {}s step per tick", this.currentTickRateHz, this.currentStepSeconds);
    }

    public synchronized void stop() {
        if (currentTask != null && !currentTask.isCancelled()) {
            currentTask.cancel(false);
            currentTask = null;
        }
        this.running = false;
        log.info("Continuous simulation scheduler stopped");
    }

    public boolean isRunning() {
        return running;
    }

    public Map<String, Object> getStatus() {
        return Map.of(
                "running", running,
                "active", running,
                "tickRateHz", currentTickRateHz,
                "stepSeconds", currentStepSeconds,
                "stepSecondsPerTick", currentStepSeconds,
                "timeDilationMultiplier", currentTickRateHz * currentStepSeconds
        );
    }

    @PreDestroy
    public void shutdown() {
        stop();
        executorService.shutdownNow();
    }
}
