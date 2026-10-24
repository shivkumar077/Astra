package org.astra.commands;

import jakarta.annotation.PostConstruct;
import org.astra.persistence.JsonUtils;
import org.astra.persistence.entity.CommandRecordEntity;
import org.astra.persistence.repository.CommandRecordRepository;
import org.astra.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Thread-safe in-memory and persistent audit store and idempotency cache for spacecraft telecommands.
 * Backed by CommandRecordRepository for restart survivability.
 */
@Service
public class CommandHistoryService {

    private static final Logger log = LoggerFactory.getLogger(CommandHistoryService.class);

    private final int capacity;
    private final Deque<CommandRecord> historyQueue = new ConcurrentLinkedDeque<>();
    private final Map<String, CommandRecord> byCommandId = new ConcurrentHashMap<>();
    private final Map<String, CommandRecord> byIdempotencyKey = new ConcurrentHashMap<>();
    private final CommandRecordRepository commandRepository;

    public CommandHistoryService() {
        this(1000, null);
    }

    public CommandHistoryService(int capacity) {
        this(capacity, null);
    }

    @Autowired
    public CommandHistoryService(Optional<CommandRecordRepository> commandRepository) {
        this(1000, commandRepository.orElse(null));
    }

    public CommandHistoryService(int capacity, CommandRecordRepository commandRepository) {
        this.capacity = Math.max(1, capacity);
        this.commandRepository = commandRepository;
    }

    @PostConstruct
    public void initFromDatabase() {
        if (commandRepository == null) {
            return;
        }
        try {
            List<CommandRecordEntity> persisted = commandRepository.findTop1000ByOrderBySubmittedAtDesc();
            if (persisted != null && !persisted.isEmpty()) {
                List<CommandRecordEntity> chronological = new ArrayList<>(persisted);
                Collections.reverse(chronological);
                for (CommandRecordEntity entity : chronological) {
                    CommandRecord rec = mapToRecord(entity);
                    historyQueue.addFirst(rec);
                    byCommandId.put(rec.commandId(), rec);
                    if (rec.clientCommandId() != null && !rec.clientCommandId().isBlank()) {
                        byIdempotencyKey.put(rec.clientCommandId(), rec);
                    }
                }
                log.info("Recovered {} durable command records from database into in-memory idempotency cache.", persisted.size());
            }
        } catch (Exception e) {
            log.warn("Could not hydrate command history from database: {}", e.getMessage());
        }
    }

    /**
     * Records a command request and execution result in the audit ledger and idempotency index.
     */
    public synchronized CommandRecord record(CommandRequest request, CommandResult result) {
        Objects.requireNonNull(request, "request must not be null");
        Objects.requireNonNull(result, "result must not be null");
        String operator = SecurityUtils.getCurrentOperatorUsername().orElse(null);
        return record(CommandRecord.from(request, result, operator));
    }

    @Transactional
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

        // Persist to relational database
        if (commandRepository != null) {
            try {
                CommandRecordEntity entity = new CommandRecordEntity(
                        record.commandId(),
                        record.clientCommandId(),
                        record.spacecraftId(),
                        record.type().name(),
                        record.status().name(),
                        record.submittedAt(),
                        record.executionEpoch(),
                        record.operatorUsername(),
                        record.message(),
                        JsonUtils.toJson(record.parameters()),
                        JsonUtils.toJson(record.outputData()),
                        record.idempotentReplay()
                );
                commandRepository.save(entity);
            } catch (Exception e) {
                log.error("Failed to persist command record {}: {}", record.commandId(), e.getMessage());
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

        // Check database if not present in memory cache
        if (record == null && commandRepository != null) {
            try {
                Optional<CommandRecordEntity> byClient = commandRepository.findByClientCommandId(commandIdOrKey);
                if (byClient.isEmpty()) {
                    byClient = commandRepository.findByCommandId(commandIdOrKey);
                }
                if (byClient.isPresent()) {
                    record = mapToRecord(byClient.get());
                    byCommandId.put(record.commandId(), record);
                    if (record.clientCommandId() != null) {
                        byIdempotencyKey.put(record.clientCommandId(), record);
                    }
                }
            } catch (Exception e) {
                log.warn("Database lookup failed during idempotency check: {}", e.getMessage());
            }
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
        CommandRecord cached = byCommandId.get(commandId);
        if (cached != null) {
            return Optional.of(cached);
        }
        if (commandRepository != null) {
            try {
                return commandRepository.findByCommandId(commandId).map(this::mapToRecord);
            } catch (Exception e) {
                log.warn("Error reading command {} from database: {}", commandId, e.getMessage());
            }
        }
        return Optional.empty();
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

    private CommandRecord mapToRecord(CommandRecordEntity entity) {
        return new CommandRecord(
                entity.getCommandId(),
                entity.getClientCommandId(),
                entity.getSpacecraftId(),
                CommandType.valueOf(entity.getCommandType()),
                JsonUtils.fromJsonToStringMap(entity.getParametersJson()),
                CommandStatus.valueOf(entity.getStatus()),
                entity.getSubmittedAt(),
                entity.getExecutionEpoch(),
                entity.getMessage(),
                JsonUtils.fromJson(entity.getOutputDataJson()),
                entity.isIdempotentReplay(),
                entity.getOperatorUsername()
        );
    }
}
