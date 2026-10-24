package org.astra.commands;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Thread-safe in-memory audit store and idempotency cache for spacecraft telecommands.
 */
@Service
public class CommandHistoryService {

    private final int capacity;
    private final Deque<CommandRecord> historyQueue = new ConcurrentLinkedDeque<>();
    private final Map<String, CommandRecord> byCommandId = new ConcurrentHashMap<>();
    private final Map<String, CommandRecord> byIdempotencyKey = new ConcurrentHashMap<>();

    public CommandHistoryService() {
        this(1000);
    }

    public CommandHistoryService(int capacity) {
        this.capacity = Math.max(1, capacity);
    }

    /**
     * Records a command request and execution result in the audit ledger and idempotency index.
     */
    public synchronized CommandRecord record(CommandRequest request, CommandResult result) {
        Objects.requireNonNull(request, "request must not be null");
        Objects.requireNonNull(result, "result must not be null");
        return record(CommandRecord.from(request, result));
    }

    public synchronized CommandRecord record(CommandRecord record) {
        Objects.requireNonNull(record, "record must not be null");

        historyQueue.addFirst(record);
        byCommandId.put(record.commandId(), record);

        if (record.clientCommandId() != null && !record.clientCommandId().isBlank()) {
            byIdempotencyKey.put(record.clientCommandId(), record);
        }

        // Evict oldest if exceeding capacity
        while (historyQueue.size() > capacity) {
            CommandRecord oldest = historyQueue.pollLast();
            if (oldest != null) {
                byCommandId.remove(oldest.commandId());
                if (oldest.clientCommandId() != null) {
                    byIdempotencyKey.remove(oldest.clientCommandId());
                }
            }
        }

        return record;
    }

    /**
     * Checks if a command with the given ID or idempotency key has already been executed.
     */
    public Optional<CommandResult> findCachedResult(String commandIdOrKey) {
        if (commandIdOrKey == null || commandIdOrKey.isBlank()) {
            return Optional.empty();
        }

        CommandRecord record = byIdempotencyKey.get(commandIdOrKey);
        if (record == null) {
            record = byCommandId.get(commandIdOrKey);
        }

        if (record != null && record.status() == CommandStatus.EXECUTED) {
            CommandResult result = new CommandResult(
                    record.commandId(),
                    record.spacecraftId(),
                    record.type(),
                    record.status(),
                    record.message(),
                    record.executionEpoch(),
                    record.outputData(),
                    true
            );
            return Optional.of(result);
        }

        return Optional.empty();
    }

    /**
     * Retrieves recent command history with optional filters.
     */
    public List<CommandRecord> getHistory(
            int limit,
            Optional<String> spacecraftId,
            Optional<CommandStatus> status
    ) {
        int max = Math.max(1, Math.min(limit, capacity));
        return historyQueue.stream()
                .filter(c -> spacecraftId.isEmpty() || Objects.equals(c.spacecraftId(), spacecraftId.get()))
                .filter(c -> status.isEmpty() || c.status() == status.get())
                .limit(max)
                .toList();
    }

    public List<CommandRecord> getHistory(
            String spacecraftId,
            CommandStatus status,
            String clientCommandId,
            int limit
    ) {
        int max = Math.max(1, Math.min(limit, capacity));
        return historyQueue.stream()
                .filter(c -> spacecraftId == null || Objects.equals(c.spacecraftId(), spacecraftId))
                .filter(c -> status == null || c.status() == status)
                .filter(c -> clientCommandId == null || Objects.equals(c.clientCommandId(), clientCommandId))
                .limit(max)
                .toList();
    }

    public Optional<CommandRecord> getById(String commandId) {
        return Optional.ofNullable(byCommandId.get(commandId));
    }

    public Optional<CommandRecord> findById(String commandId) {
        return getById(commandId);
    }

    public synchronized void clear() {
        historyQueue.clear();
        byCommandId.clear();
        byIdempotencyKey.clear();
    }

    public int size() {
        return historyQueue.size();
    }
}
