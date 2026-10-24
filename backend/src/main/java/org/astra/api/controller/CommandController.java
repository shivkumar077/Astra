package org.astra.api.controller;

import jakarta.validation.Valid;
import org.astra.api.dto.CommandResponse;
import org.astra.api.dto.SubmitCommandRequest;
import org.astra.commands.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST controller for telecommand auditing, history queries, and global command submissions.
 */
@RestController
@RequestMapping("/api/v1/commands")
public class CommandController {

    private final CommandDispatcher commandDispatcher;
    private final CommandHistoryService commandHistoryService;

    @Autowired
    public CommandController(CommandDispatcher commandDispatcher, CommandHistoryService commandHistoryService) {
        this.commandDispatcher = commandDispatcher;
        this.commandHistoryService = commandHistoryService;
    }

    /**
     * Queries recent auditable command history with optional filters.
     */
    @GetMapping
    public ResponseEntity<List<CommandRecord>> getCommandHistory(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String spacecraftId,
            @RequestParam(required = false) CommandStatus status,
            @RequestParam(required = false) String clientCommandId
    ) {
        List<CommandRecord> history = commandHistoryService.getHistory(
                spacecraftId,
                status,
                clientCommandId,
                limit
        );
        return ResponseEntity.ok(history);
    }

    /**
     * Retrieves an individual command execution record by commandId.
     */
    @GetMapping("/{commandId}")
    public ResponseEntity<CommandRecord> getCommandById(@PathVariable String commandId) {
        CommandRecord record = commandHistoryService.getById(commandId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Command record not found: " + commandId));
        return ResponseEntity.ok(record);
    }

    /**
     * Dispatches a command with optional target spacecraft (e.g. ADVANCE_TIME, PAUSE_SIMULATION).
     */
    @PostMapping
    public ResponseEntity<CommandResponse> submitCommand(
            @RequestParam(required = false) String spacecraftId,
            @Valid @RequestBody SubmitCommandRequest request
    ) {
        Map<String, String> params = new HashMap<>(request.parameters());
        if (request.clientCommandId() != null && !request.clientCommandId().isBlank()) {
            params.put("clientCommandId", request.clientCommandId());
        }

        String targetCraft = (spacecraftId != null && !spacecraftId.isBlank()) ? spacecraftId : request.spacecraftId();

        CommandRequest cmdReq = new CommandRequest(
                request.clientCommandId(),
                targetCraft,
                request.type(),
                params,
                Instant.now()
        );

        CommandResult result = commandDispatcher.dispatch(cmdReq);
        return ResponseEntity.ok(CommandResponse.fromResult(result));
    }
}
