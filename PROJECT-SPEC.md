# PROJECT-SPEC.md — AudiaPro Call Recording & Analytics Platform

Version: 1.0
Last Updated: 2026-02-22

---

## Executive Summary

AudiaPro is a multi-tenant SaaS platform that connects to PBX systems (primarily Grandstream UCM), automatically downloads call recordings, transcribes them using Deepgram, and analyzes them using Claude AI to extract insights like sentiment, action items, keywords, and compliance flags.

**Key Value Propositions:**
- Automatic call recording ingestion from PBX systems
- AI-powered transcription and analysis
- Multi-tenant with strict data isolation
- Role-based access control (Super Admin, Client Admin)
- Real-time analytics dashboards
- Scheduled email reports

**Business Model:**
- $349/month base fee per tenant
- $0.10 per call processed
- Usage-based billing for transcription and AI analysis

---

## System Architecture

```
┌─────────────────┐
│  Grandstream    │
│  UCM PBX        │
│  (Customer)     │
└────────┬────────┘
         │
         │ Webhook: New call completed
         │ POST /api/webhook/grandstream/[connectionId]
         ↓
┌─────────────────────────────────────────────────────────┐
│  Next.js Application (Vercel)                           │
│                                                          │
│  Webhook Handler                                         │
│  1. Validate webhook secret                              │
│  2. Parse CDR data                                       │
│  3. Create cdr_records entry                             │
│  4. Create job_queue entry                               │
│                                                          │
│  API Routes                                              │
│  - /api/tenants                                          │
│  - /api/connections                                      │
│  - /api/calls                                            │
│  - /api/analytics                                        │
│  - /api/admin/*                                          │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                     │
│  Tables: tenants, users, pbx_connections,                │
│          cdr_records, call_analyses, job_queue            │
│  + Supabase Auth (session management)                    │
│  + Supabase Storage (recordings, transcripts)            │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Background Worker (Render)                              │
│  Poll loop every 5 seconds                               │
│  For each pending job:                                   │
│  1. Download recording from Grandstream UCM              │
│  2. Upload to Supabase Storage                           │
│  3. Send to Deepgram for transcription                   │
│  4. Send transcript to Claude for analysis               │
│  5. Store results in call_analyses                       │
│  6. Update billing counters                              │
│  7. Mark job completed                                   │
└──────────┬──────────────┬──────────────┬────────────────┘
           ↓              ↓              ↓
    Grandstream      Deepgram       Anthropic
    UCM API          API            Claude API
    (HTTPS/REST)     (WebSocket)    (REST)
```

### Data Flow: New Call Recording

1. Call completes on Grandstream UCM → UCM triggers webhook
2. Webhook handler validates, parses CDR, creates `cdr_records` + `job_queue` entry
3. Worker claims job atomically (`FOR UPDATE SKIP LOCKED`)
4. Worker downloads recording from UCM (cookie-based auth, handles self-signed SSL)
5. Worker uploads to Supabase Storage (`call-recordings/{tenant_id}/{year}/{month}/{uniqueid}.wav`)
6. Worker sends audio to Deepgram (Nova-2, diarization enabled) → receives transcript
7. Worker sends transcript to Claude → receives structured analysis JSON
8. Worker saves analysis to `call_analyses`, updates `cdr_records`, increments tenant usage
9. Job marked complete

---

## Tech Stack

```json
{
  "next": "15.x",
  "react": "19.x",
  "typescript": "5.x",
  "node": ">=20.0.0",
  "@supabase/supabase-js": "^2.95.3",
  "@supabase/ssr": "latest",
  "drizzle-orm": "latest",
  "@anthropic-ai/sdk": "latest",
  "@deepgram/sdk": "^3.5.1",
  "resend": "^4.0.0",
  "tailwindcss": "latest",
  "shadcn/ui": "latest",
  "recharts": "latest",
  "lucide-react": "latest",
  "zod": "latest",
  "vitest": "latest",
  "playwright": "latest"
}
```

---

## Database Schema

### Core Principles
1. **Multi-tenancy**: Every table (except `tenants` and `users`) has `tenant_id` FK
2. **Row Level Security (RLS)**: Enabled on ALL tables
3. **Soft Deletes**: Use status fields (not DELETE)
4. **Timestamps**: All tables have `created_at` and `updated_at` (auto-trigger)
5. **UUIDs**: All PKs use `gen_random_uuid()` (NOT `uuid_generate_v4()`)
6. **ORM Strategy**: Drizzle is used for type-safe queries only. All schema management (CREATE TABLE, ALTER TABLE, indexes, triggers, RLS policies) is done via Supabase SQL migrations in `supabase/migrations/`. Drizzle schema files (`src/lib/db/schema.ts`) mirror the SQL schema for TypeScript type inference.

### Table 1: tenants

```sql
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
```

### Table 2: users

```sql
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
```

### Table 3: pbx_connections

```sql
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
```

### Table 4: cdr_records

```sql
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
```

### Table 5: call_analyses

```sql
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
```

### Table 6: job_queue

```sql
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
```

### Database Functions

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pbx_connections_updated_at BEFORE UPDATE ON pbx_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cdr_records_updated_at BEFORE UPDATE ON cdr_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_analyses_updated_at BEFORE UPDATE ON call_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_queue_updated_at BEFORE UPDATE ON job_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Atomic job claiming
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
```

### RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbx_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SUPER ADMIN POLICIES (full access to all tables)
-- ============================================================

CREATE POLICY "super_admin_all_tenants" ON tenants FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_pbx_connections" ON pbx_connections FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_cdr_records" ON cdr_records FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_call_analyses" ON call_analyses FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

CREATE POLICY "super_admin_all_job_queue" ON job_queue FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true)
);

-- ============================================================
-- TENANT-SCOPED POLICIES (client admins, managers, viewers)
-- ============================================================

-- Tenants: users can view their own tenant
CREATE POLICY "tenants_view_own" ON tenants FOR SELECT USING (
    id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- Users: users can view their own profile
CREATE POLICY "users_view_self" ON users FOR SELECT USING (
    id = auth.uid() AND is_active = true
);

-- PBX Connections: tenant users can view their tenant's connections
CREATE POLICY "pbx_connections_tenant_select" ON pbx_connections FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- CDR Records: tenant users can view their tenant's calls
CREATE POLICY "cdr_records_tenant_select" ON cdr_records FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- Call Analyses: tenant users can view their tenant's analyses
CREATE POLICY "call_analyses_tenant_select" ON call_analyses FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- Job Queue: tenant admins can view their tenant's jobs
CREATE POLICY "job_queue_tenant_select" ON job_queue FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE users.id = auth.uid() AND users.is_active = true)
);

-- ============================================================
-- NOTES
-- ============================================================
-- Service role (worker) bypasses RLS automatically
-- Webhook handler uses service role to create CDR records
-- All tenant-scoped policies check is_active to prevent suspended users from accessing data
```

---

## Grandstream Integration (Critical Section)

### UCM API
- **Base URL**: `https://{host}:{port}/cgi-bin/api.cgi`
- **Default Port**: 8089 (HTTPS)
- **Auth**: Cookie-based session (recommended) or Basic Auth
- **SSL**: Usually self-signed → always set `rejectUnauthorized: false`

### Authentication (Cookie Session — Recommended)

```typescript
// Login
const response = await fetch(`https://${host}:${port}/cgi-bin/api.cgi`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'login', username, password, secure: 1 }),
  agent: new https.Agent({ rejectUnauthorized: !verifySsl })
});
const sessionCookie = response.headers.get('set-cookie')?.split(';')[0];

// Use cookie for subsequent requests
const data = await fetch(`https://${host}:${port}/cgi-bin/api.cgi?action=...`, {
  headers: { 'Cookie': sessionCookie },
  agent: new https.Agent({ rejectUnauthorized: !verifySsl })
});
```

### Key Endpoints
- **Test connection**: `GET /cgi-bin/api.cgi?action=listPbx`
- **Download recording**: `GET /cgi-bin/api.cgi?action=getRecording&recordingFile={filename}`
- **Query CDR**: `GET /cgi-bin/api.cgi?action=queryCDR&startTime={}&endTime={}`

### Webhook Payload (Grandstream sends on call completion)

```json
{
  "event": "cdr",
  "uniqueid": "1705320600.123",
  "src": "1001",
  "dst": "18005551234",
  "clid": "\"John Doe\" <1001>",
  "start": "2024-01-15 10:30:00",
  "answer": "2024-01-15 10:30:05",
  "end": "2024-01-15 10:35:00",
  "duration": "300",
  "billsec": "295",
  "disposition": "ANSWERED",
  "recording_filename": "/var/spool/asterisk/monitor/2024/01/15/recording.wav"
}
```

**Critical fields**: `uniqueid` (dedup key), `recording_filename` (for download), `src`/`dst`, `disposition`, `billsec`

### Known Grandstream Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Self-signed SSL | `Error: self signed certificate` | `rejectUnauthorized: false` in HTTPS agent |
| Recording not ready | 404 on download | Retry with exponential backoff (5s, 10s, 20s) |
| Large recordings | Memory overflow/timeout | Stream to buffer, upload directly to Supabase Storage |
| Duplicate webhooks | Same call processed twice | Check `uniqueid` before creating CDR record |
| Session timeout | 401 on subsequent requests | Re-authenticate on 401, retry request |

---

## API Specifications

### Auth Check Pattern

```typescript
export async function verifyAuth(request, allowedRoles) {
  const session = await getSession();
  if (!session) throw createError(AUTH_ERRORS.SESSION_EXPIRED);       // THROW, don't return
  
  const user = await getUser(session.user.id);
  if (!user?.is_active) throw createError(AUTH_ERRORS.ACCOUNT_SUSPENDED);
  if (!allowedRoles.includes(user.role)) throw createError(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS);
  
  return { user, session };
}
```

### Super Admin Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/stats` | System-wide statistics |
| GET | `/api/tenants` | List all tenants (paginated) |
| POST | `/api/tenants` | Create tenant |
| GET | `/api/tenants/[id]` | Tenant detail |
| PATCH | `/api/tenants/[id]` | Update tenant |
| GET | `/api/connections` | List all connections |
| POST | `/api/connections` | Create connection (encrypts password) |
| POST | `/api/connections/[id]/test` | Test PBX connection |
| GET | `/api/jobs` | List background jobs |
| POST | `/api/jobs/[id]/retry` | Retry failed job |
| POST | `/api/admin/users` | Create client admin user |

### Client Admin Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/dashboard/stats` | Tenant-scoped stats |
| GET | `/api/dashboard/calls` | List calls (paginated, filterable) |
| GET | `/api/dashboard/calls/[id]` | Call detail with analysis + signed URLs |

### Webhook Route

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/webhook/grandstream/[connectionId]` | Receive CDR webhook |

---

## AI Analysis Pipeline

### Deepgram Transcription
- Model: `nova-2`
- Options: `punctuate: true, paragraphs: true, utterances: true, diarize: true, smart_format: true`
- Returns: transcript text, word-level timestamps, speaker-labeled utterances

### Claude Analysis
- Model: `claude-3-5-sonnet-20241022`
- Input: transcript text + call metadata (src, dst, duration, direction)
- Output: structured JSON with summary, sentiment, keywords, topics, action items, compliance flags, escalation risk, satisfaction prediction

### Claude Analysis Prompt Template

```
You are an expert call analyst. Analyze the following call transcript and provide structured insights.

Call Details:
- Caller: {src}
- Destination: {dst}
- Duration: {duration} seconds
- Direction: {direction}

Transcript:
{transcript}

Provide your analysis as a JSON object with EXACTLY this structure (no markdown, no backticks, just raw JSON):
{
  "summary": "Brief 2-3 sentence summary of the call",
  "sentiment": "positive|negative|neutral|mixed",
  "sentimentScore": 0.0 to 1.0,
  "keywords": ["keyword1", "keyword2", ...],
  "topics": ["topic1", "topic2", ...],
  "actionItems": ["action1", "action2", ...],
  "questions": ["question1", "question2", ...],
  "objections": ["objection1", "objection2", ...],
  "escalationRisk": "low|medium|high",
  "escalationReasons": ["reason1", "reason2", ...],
  "satisfactionPrediction": "satisfied|neutral|dissatisfied",
  "complianceFlags": ["flag1", "flag2", ...],
  "callDisposition": "Brief outcome of the call"
}

Rules:
- Return ONLY the JSON object, nothing else
- All arrays can be empty [] if not applicable
- sentimentScore: 0.0 = very negative, 0.5 = neutral, 1.0 = very positive
- complianceFlags: flag if agent made promises without authorization, shared confidential info, used inappropriate language, failed to verify identity, or missed required disclosures
- escalationRisk: "high" if customer expressed intent to cancel, file complaint, or contact legal
```

### Analysis Response Schema

```json
{
  "summary": "2-3 sentence summary",
  "sentiment": "positive|negative|neutral|mixed",
  "sentimentScore": 0.0-1.0,
  "keywords": ["keyword1", "keyword2"],
  "topics": ["topic1", "topic2"],
  "actionItems": ["action1", "action2"],
  "questions": ["question1"],
  "objections": ["objection1"],
  "escalationRisk": "low|medium|high",
  "escalationReasons": ["reason1"],
  "satisfactionPrediction": "satisfied|neutral|dissatisfied",
  "complianceFlags": ["flag1"],
  "callDisposition": "Brief outcome"
}
```

---

## Encryption

AES-256-GCM for PBX credentials:

```typescript
// Format: iv:authTag:encrypted (all hex)
// Key: 32-byte hex from env var ENCRYPTION_KEY
// Generate key: openssl rand -hex 32
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://xxx
NEXT_PUBLIC_APP_URL=http://localhost:5000
DEEPGRAM_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=noreply@audiapro.com
ENCRYPTION_KEY=xxx  # 32-byte hex
```

Worker (Render) additionally needs:
```env
WORKER_POLL_INTERVAL_MS=5000
WORKER_MAX_CONCURRENT_JOBS=3
PORT=3001
```

---

## Deployment

- **Frontend**: Vercel
- **Worker**: Render (Node.js web service, health check at `/health`)
- **Database**: Supabase (hosted PostgreSQL)
- **Storage buckets**: `call-recordings` (private), `call-transcripts` (private), `call-analyses` (private)

---

## Known Issues & Solutions (From Previous Build)

1. **Database query timeouts**: Wrap queries in `Promise.race` with 10s timeout
2. **Turbopack `nul` file error** (Windows): Delete `nul` file, clear `.next`
3. **Missing `is_active` column**: Already included in schema above
4. **verifyAuth returning errors instead of throwing**: Fixed — always THROW errors
5. **Connection pooling conflicts**: Only use `prepare: false` — Supabase handles pooling
6. **Don't use `uuid_generate_v4()`**: Use `gen_random_uuid()` (built-in)

---

## Worker Resilience

### Stale Job Recovery

Jobs can get stuck in "processing" if the worker crashes. The `reset_stale_jobs()` database function (defined in the Database Functions section) handles this by resetting jobs that have been processing for more than 10 minutes.

**Usage:**
- Call at worker startup to recover from previous crashes
- Call every 5 minutes during the poll loop to catch stuck jobs
- Returns the count of jobs that were reset

### Recording Download Retry Strategy

If recording returns 404 after 3 retries (exponential backoff 5s/10s/20s), do NOT fail the job. Instead:
- Set `scheduled_for = NOW() + INTERVAL '5 minutes'`
- Set `status = 'pending'`
- Log: "Recording not yet available, rescheduled"
- Only fail after 3 full reschedule cycles (total ~15 min wait)

---

## Storage Retention Policy

- **Default retention**: 90 days for audio recordings
- **Transcripts and analyses**: kept indefinitely (small JSON files)
- **Configurable per tenant**: `recording_retention_days` column on `tenants` table (already included in schema)
- **Nightly cleanup job**: delete recordings older than tenant's retention period
- **Before deletion**: verify analysis exists (don't delete if processing failed)

**Implementation notes:**
- Consider compress WAV → MP3 on upload (50-70% size reduction) using `ffmpeg` in worker
- Storage costs: ~15GB/month per tenant with 100 calls/day (Supabase Storage: $0.021/GB/month)
- Cleanup can be implemented as a Supabase cron job or separate worker task

---

## Development: Grandstream Mocking

Most devs won't have a real Grandstream UCM. Provide mock tools:

### Mock Webhook Sender (`scripts/send-test-webhook.ts`)

```typescript
// Sends a fake CDR webhook to the local server
const payload = {
  event: "cdr",
  uniqueid: `${Date.now()}.${Math.floor(Math.random() * 1000)}`,
  src: "1001",
  dst: "18005551234",
  clid: '"Test Caller" <1001>',
  start: new Date(Date.now() - 300000).toISOString(),
  answer: new Date(Date.now() - 295000).toISOString(),
  end: new Date().toISOString(),
  duration: "300",
  billsec: "295",
  disposition: "ANSWERED",
  recording_filename: "/var/spool/asterisk/monitor/test-recording.wav"
};

await fetch(`http://localhost:3000/api/webhook/grandstream/${connectionId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': webhookSecret
  },
  body: JSON.stringify(payload)
});
```

### Mock Recording Server (`scripts/mock-ucm-server.ts`)

Simple HTTP server that:
- Accepts login requests and returns a session cookie
- Serves a sample WAV file for any `getRecording` request
- Sample WAV: 30-second silence or speech file in `fixtures/sample-recording.wav`

### Seed Scripts

**`scripts/create-super-admin.ts`** — Creates super admin user (already defined)

**`scripts/seed-test-data.ts`** — Creates:
- Test tenant ("Acme Corp", slug: "acme-corp")
- Client admin user for that tenant
- PBX connection (host: "localhost:8089", mock UCM)
- 5 sample CDR records with mock analysis data
- This gives devs a populated UI to work with immediately

---

## Development Setup Checklist

1. Clone repo and install dependencies: `npm install`
2. Create Supabase project at supabase.com
3. Copy `.env.local.example` → `.env.local`, fill in Supabase URL + keys
4. Run migrations: `npx supabase db push`
5. Create storage buckets: `call-recordings`, `call-transcripts`, `call-analyses` (all private)
6. Run super admin seed: `npx tsx scripts/create-super-admin.ts`
7. Run test data seed: `npx tsx scripts/seed-test-data.ts`
8. Start dev server: `npm run dev`
9. Login at `http://localhost:3000/login` with super admin credentials
10. (Optional) Start mock UCM: `npx tsx scripts/mock-ucm-server.ts`
11. (Optional) Send test webhook: `npx tsx scripts/send-test-webhook.ts`

---

## Supabase Storage Buckets

Create these 3 private buckets:
- `call-recordings` — WAV/MP3 audio files
- `call-transcripts` — JSON transcript files
- `call-analyses` — JSON analysis results

Path pattern: `{tenant_id}/{year}/{month}/{uniqueid}.{ext}`

Signed URLs: 1 hour expiry for playback/download.
