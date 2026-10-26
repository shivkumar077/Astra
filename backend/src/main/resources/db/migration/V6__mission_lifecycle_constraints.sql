-- ASTRA Mission Lifecycle Constraints & Concurrency Safety
-- Version: V6 (Single Active Run Guarantee and State Machine Integrity)

-- 1. Finalize any duplicate orphaned active runs prior to indexing
UPDATE mission_runs
SET status = 'ABORTED',
    completed_epoch = CURRENT_TIMESTAMP,
    outcome_summary = 'Cleaned up by migration V6: Concurrency supervisor finalized orphaned active run.'
WHERE status = 'ACTIVE'
  AND id NOT IN (
    SELECT id FROM (
        SELECT id FROM mission_runs
        WHERE status = 'ACTIVE'
        ORDER BY started_epoch DESC
        LIMIT 1
    ) AS latest_active
);

-- 2. Performance indexes for active run checks and chronological history audits
CREATE INDEX IF NOT EXISTS idx_run_status_started ON mission_runs(status, started_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_mission_runs_mission_started ON mission_runs(mission_id, started_epoch DESC);
