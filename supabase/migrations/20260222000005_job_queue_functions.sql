-- Additional Job Queue Helper Functions
-- Note: claim_next_job() already exists in initial schema

-- =============================================================================
-- Function: reset_stale_jobs()
-- Resets jobs stuck in 'processing' for more than 10 minutes back to 'pending'
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_stale_jobs()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    -- Update stale jobs back to pending
    WITH updated AS (
        UPDATE job_queue
        SET
            status = 'pending',
            started_at = NULL,
            error = 'Job reset due to timeout',
            updated_at = NOW()
        WHERE status = 'processing'
          AND started_at < NOW() - INTERVAL '10 minutes'
        RETURNING id
    )
    SELECT COUNT(*) INTO reset_count FROM updated;

    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Function: complete_job()
-- Marks a job as completed
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_result JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE job_queue
    SET
        status = 'completed',
        completed_at = NOW(),
        result = p_result,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Function: fail_job()
-- Marks a job as failed (after max retries)
-- =============================================================================

CREATE OR REPLACE FUNCTION fail_job(
    p_job_id UUID,
    p_error TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE job_queue
    SET
        status = 'failed',
        completed_at = NOW(),
        error = p_error,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;
