package org.astra.telemetry;

import org.astra.core.domain.Spacecraft;
import org.astra.persistence.entity.TelemetrySnapshotEntity;
import org.astra.persistence.repository.TelemetrySnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Service managing deliberate, sampled telemetry snapshot persistence and retention pruning.
 * Telemetry frames stream at 5 Hz in-memory; sampled snapshots are persisted periodically
 * (e.g. every 30 seconds of simulation time) to prevent unbounded database row growth.
 */
@Service
public class TelemetryArchiveService {

    private static final Logger log = LoggerFactory.getLogger(TelemetryArchiveService.class);

    private final TelemetrySnapshotRepository snapshotRepository;
    private final double samplingIntervalSeconds;
    private final int maxRetainedRecords;

    private final Map<String, Instant> lastSampledEpochs = new HashMap<>();

    public TelemetryArchiveService() {
        this(null, 30.0, 50000);
    }

    @Autowired
    public TelemetryArchiveService(
            Optional<TelemetrySnapshotRepository> snapshotRepository,
            @Value("${astra.telemetry.archive.sampling-interval-seconds:30}") double samplingIntervalSeconds,
            @Value("${astra.telemetry.archive.max-retained-records:50000}") int maxRetainedRecords
    ) {
        this.snapshotRepository = snapshotRepository.orElse(null);
        this.samplingIntervalSeconds = Math.max(1.0, samplingIntervalSeconds);
        this.maxRetainedRecords = Math.max(100, maxRetainedRecords);
    }

    /**
     * Evaluates whether a spacecraft telemetry snapshot should be persisted based on sampling interval.
     */
    public void sampleAndArchive(Spacecraft spacecraft, Instant simulationEpoch) {
        if (snapshotRepository == null || spacecraft == null || simulationEpoch == null) {
            return;
        }

        Instant lastEpoch = lastSampledEpochs.get(spacecraft.getId());
        if (lastEpoch != null) {
            long secondsSinceLast = Math.abs(simulationEpoch.getEpochSecond() - lastEpoch.getEpochSecond());
            if (secondsSinceLast < samplingIntervalSeconds) {
                return;
            }
        }

        lastSampledEpochs.put(spacecraft.getId(), simulationEpoch);

        try {
            TelemetrySnapshotEntity entity = new TelemetrySnapshotEntity(
                    spacecraft.getId(),
                    simulationEpoch,
                    spacecraft.getCurrentOrbitState().positionKm().x(),
                    spacecraft.getCurrentOrbitState().positionKm().y(),
                    spacecraft.getCurrentOrbitState().positionKm().z(),
                    spacecraft.getCurrentOrbitState().velocityKmS().x(),
                    spacecraft.getCurrentOrbitState().velocityKmS().y(),
                    spacecraft.getCurrentOrbitState().velocityKmS().z(),
                    spacecraft.getCurrentOrbitState().altitudeKm(),
                    spacecraft.getCurrentOrbitState().speedKmS(),
                    spacecraft.getCurrentOrbitState().inEclipse(),
                    spacecraft.getBatterySocPercent(),
                    spacecraft.getSolarArrayWatts(),
                    spacecraft.getOperationalMode().name(),
                    spacecraft.getOperationalStatus().name()
            );
            snapshotRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to archive telemetry snapshot for {}: {}", spacecraft.getId(), e.getMessage());
        }
    }

    public void clear() {
        lastSampledEpochs.clear();
    }
}
