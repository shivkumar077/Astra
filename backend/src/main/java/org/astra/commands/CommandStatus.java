package org.astra.commands;

/**
 * Execution outcome classification of a submitted telecommand.
 */
public enum CommandStatus {
    /**
     * Telecommand passed validation and was executed successfully on authoritative state.
     */
    EXECUTED,

    /**
     * Telecommand rejected prior to execution due to invalid parameters or target constraints.
     */
    REJECTED,

    /**
     * Telecommand accepted but failed during execution due to vehicle operational state.
     */
    FAILED
}
