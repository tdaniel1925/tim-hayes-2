-- AudiaPro Initial Schema
-- Version: 1.0
-- Date: 2026-02-22

-- =============================================================================
-- TABLE 1: tenants
-- =============================================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'cancelled')),
    billing_email TEXT,
    billing_plan TEXT DEFAULT 'free'
        CHECK (billing_plan IN ('free', 'starter', 'professional', 'enterprise')),
    calls_processed_total INTEGER DEFAULT 0,
    audio_minutes_total INTEGER DEFAULT 0,
    storage_bytes_total BIGINT DEFAULT 0,
    recording_retention_days INTEGER DEFAULT 90,
    ai_custom_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- =============================================================================
-- TABLE 2: users
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('super_admin', 'tenant_admin', 'manager', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    timezone TEXT DEFAULT 'UTC',
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =============================================================================
-- TABLE 3: pbx_connections
-- =============================================================================

CREATE TABLE pbx_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    connection_type TEXT NOT NULL DEFAULT 'grandstream'
        CHECK (connection_type IN ('grandstream', 'generic')),
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 8089,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted
    verify_ssl BOOLEAN DEFAULT FALSE,
    webhook_secret TEXT NOT NULL,      -- 32-byte random hex
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'error')),
    last_connected_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_pbx_connections_tenant_id ON pbx_connections(tenant_id);
CREATE INDEX idx_pbx_connections_status ON pbx_connections(status);

-- =============================================================================
-- TABLE 4: cdr_records
-- =============================================================================

CREATE TABLE cdr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pbx_connection_id UUID NOT NULL REFERENCES pbx_connections(id) ON DELETE CASCADE,

    -- Call identifiers
    uniqueid TEXT NOT NULL,
    linkedid TEXT,
    session TEXT,
    callid TEXT,

    -- Call details
    src TEXT NOT NULL,
    dst TEXT NOT NULL,
    call_direction TEXT NOT NULL
        CHECK (call_direction IN ('inbound', 'outbound', 'internal')),
    dcontext TEXT,
    channel TEXT,
    dstchannel TEXT,

    -- Timing
    start_time TIMESTAMPTZ,
    answer_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    billsec_seconds INTEGER,

    -- Status
    disposition TEXT NOT NULL
        CHECK (disposition IN ('ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CONGESTION')),
    amaflags TEXT,

    -- Recording
    recording_filename TEXT,
    recording_storage_path TEXT,
    recording_size_bytes INTEGER,

    -- Transcription
    transcript_storage_path TEXT,
    transcript_text_storage_path TEXT,
    transcript_word_count INTEGER,
    transcript_confidence REAL,
    speaker_count INTEGER,

    -- AI Analysis
    analysis_storage_path TEXT,

    -- Grandstream-specific CDR fields
    lastapp TEXT,
    lastdata TEXT,
    accountcode TEXT,
    userfield TEXT,
    did TEXT,
    outbound_cnum TEXT,
    outbound_cnam TEXT,
    dst_cnam TEXT,
    peeraccount TEXT,
    sequence TEXT,
    src_trunk_name TEXT,
    dst_trunk_name TEXT,
    clid TEXT,

    -- Processing
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    completed_at TIMESTAMPTZ,
    raw_webhook_payload JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_cdr_records_tenant_id ON cdr_records(tenant_id);
CREATE INDEX idx_cdr_records_pbx_connection_id ON cdr_records(pbx_connection_id);
CREATE INDEX idx_cdr_records_uniqueid ON cdr_records(uniqueid);
CREATE INDEX idx_cdr_records_src ON cdr_records(src);
CREATE INDEX idx_cdr_records_dst ON cdr_records(dst);
CREATE INDEX idx_cdr_records_call_direction ON cdr_records(call_direction);
CREATE INDEX idx_cdr_records_disposition ON cdr_records(disposition);
CREATE INDEX idx_cdr_records_start_time ON cdr_records(start_time DESC);
CREATE INDEX idx_cdr_records_processing_status ON cdr_records(processing_status);

-- =============================================================================
-- TABLE 5: call_analyses
-- =============================================================================

CREATE TABLE call_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cdr_record_id UUID NOT NULL REFERENCES cdr_records(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    summary TEXT,
    sentiment_overall TEXT
        CHECK (sentiment_overall IN ('positive', 'negative', 'neutral', 'mixed')),
    sentiment_score REAL,
    sentiment_timeline JSONB,

    talk_ratio_caller REAL,
    talk_ratio_agent REAL,
    talk_time_caller_seconds INTEGER,
    talk_time_agent_seconds INTEGER,
    silence_seconds INTEGER,

    keywords JSONB,
    topics JSONB,
    action_items JSONB,

    call_disposition_ai TEXT,
    compliance_score REAL,
    compliance_flags JSONB,

    escalation_risk TEXT
        CHECK (escalation_risk IN ('low', 'medium', 'high')),
    escalation_reasons TEXT[],

    satisfaction_prediction TEXT
        CHECK (satisfaction_prediction IN ('satisfied', 'neutral', 'dissatisfied')),
    satisfaction_score REAL,

    questions_asked JSONB,
    objections JSONB,
    custom_keyword_matches JSONB,
    analysis_storage_path TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_call_analyses_cdr_record_id ON call_analyses(cdr_record_id);
CREATE INDEX idx_call_analyses_tenant_id ON call_analyses(tenant_id);
CREATE INDEX idx_call_analyses_sentiment_overall ON call_analyses(sentiment_overall);
CREATE INDEX idx_call_analyses_escalation_risk ON call_analyses(escalation_risk);

-- =============================================================================
-- TABLE 6: job_queue
-- =============================================================================

CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cdr_record_id UUID NOT NULL REFERENCES cdr_records(id) ON DELETE CASCADE,

    job_type TEXT NOT NULL DEFAULT 'full_pipeline'
        CHECK (job_type IN ('full_pipeline', 'transcribe_only', 'analyze_only')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,

    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),

    error TEXT,
    result JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_queue_tenant_id ON job_queue(tenant_id);
CREATE INDEX idx_job_queue_cdr_record_id ON job_queue(cdr_record_id);
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_scheduled_for ON job_queue(scheduled_for);
CREATE INDEX idx_job_queue_created_at ON job_queue(created_at DESC);
CREATE INDEX idx_job_queue_claimable ON job_queue(priority DESC, created_at ASC)
    WHERE status = 'pending';
CREATE INDEX idx_job_queue_stale ON job_queue(status, started_at)
    WHERE status = 'processing';

-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atomic job claiming with FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION claim_next_job()
RETURNS SETOF job_queue AS $$
DECLARE
    claimed_job job_queue;
BEGIN
    UPDATE job_queue
    SET status = 'processing', started_at = NOW(), attempts = attempts + 1, updated_at = NOW()
    WHERE id = (
        SELECT id FROM job_queue
        WHERE status = 'pending' AND scheduled_for <= NOW()
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO claimed_job;

    IF claimed_job.id IS NOT NULL THEN
        RETURN NEXT claimed_job;
    END IF;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Increment tenant usage atomically
CREATE OR REPLACE FUNCTION increment_tenant_usage(
    p_tenant_id UUID,
    p_calls_processed INTEGER DEFAULT 0,
    p_audio_minutes INTEGER DEFAULT 0,
    p_storage_bytes BIGINT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    UPDATE tenants
    SET calls_processed_total = calls_processed_total + p_calls_processed,
        audio_minutes_total = audio_minutes_total + p_audio_minutes,
        storage_bytes_total = storage_bytes_total + p_storage_bytes,
        updated_at = NOW()
    WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Reset stale jobs (processing for more than 10 minutes)
CREATE OR REPLACE FUNCTION reset_stale_jobs()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE job_queue
  SET status = 'pending',
      error = 'Reset: exceeded 10 minute processing timeout',
      updated_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '10 minutes';
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pbx_connections_updated_at
    BEFORE UPDATE ON pbx_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cdr_records_updated_at
    BEFORE UPDATE ON cdr_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_analyses_updated_at
    BEFORE UPDATE ON call_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_queue_updated_at
    BEFORE UPDATE ON job_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
