package org.astra.telemetry;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory telemetry buffer service maintaining recent historical frames per spacecraft.
 */
@Service
public class TelemetryService {

    private static final int DEFAULT_BUFFER_CAPACITY = 500;
    private final int bufferCapacity;
    private final Map<String, Deque<TelemetrySnapshot>> telemetryBuffers = new ConcurrentHashMap<>();

    public TelemetryService() {
        this(DEFAULT_BUFFER_CAPACITY);
    }

    public TelemetryService(int bufferCapacity) {
        if (bufferCapacity <= 0) {
            throw new IllegalArgumentException("Buffer capacity must be positive, got: " + bufferCapacity);
        }
        this.bufferCapacity = bufferCapacity;
    }

    /**
     * Appends a new telemetry snapshot to the spacecraft's circular buffer.
     */
    public void recordSnapshot(TelemetrySnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot must not be null");
        Deque<TelemetrySnapshot> deque = telemetryBuffers.computeIfAbsent(
                snapshot.spacecraftId(),
                k -> new ConcurrentLinkedDeque<>()
        );

        deque.addFirst(snapshot);

        // Evict oldest frames if capacity exceeded
        while (deque.size() > bufferCapacity) {
            deque.pollLast();
        }
    }

    /**
     * Retrieves the most recent telemetry snapshots for a spacecraft up to the specified limit.
     */
    public List<TelemetrySnapshot> getRecentSnapshots(String spacecraftId, int limit) {
        Deque<TelemetrySnapshot> deque = telemetryBuffers.get(spacecraftId);
        if (deque == null || deque.isEmpty()) {
            return Collections.emptyList();
        }

        int count = Math.min(Math.max(limit, 1), deque.size());
        List<TelemetrySnapshot> result = new ArrayList<>(count);
        int i = 0;
        for (TelemetrySnapshot s : deque) {
            if (i++ >= count) break;
            result.add(s);
        }
        return Collections.unmodifiableList(result);
    }

    /**
     * Retrieves the single latest snapshot for a spacecraft, or empty if none recorded.
     */
    public Optional<TelemetrySnapshot> getLatestSnapshot(String spacecraftId) {
        Deque<TelemetrySnapshot> deque = telemetryBuffers.get(spacecraftId);
        if (deque == null || deque.isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(deque.peekFirst());
    }

    /**
     * Clears all telemetry buffers.
     */
    public void clear() {
        telemetryBuffers.clear();
    }
}
