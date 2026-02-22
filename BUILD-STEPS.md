# BUILD-STEPS.md — AudiaPro Atomic Build Steps

> 30 steps across 6 agents. Every step has a test gate.
> Every 5-6 steps has a manual checkpoint.

---

## AGENT 1: FOUNDATION (Steps 1.1–1.5)

### Step 1.1 — Project Scaffold
**Create:** Next.js 15 project with TypeScript, Tailwind, shadcn/ui. Install all deps from PROJECT-SPEC.md tech stack. Create folder structure per CLAUDE.md. Add `.env.local.example` with all required vars.
**Test Gate:**
```bash
npm run build # Must succeed with zero errors
```

### Step 1.2 — Database Schema & Migrations
**Create:** All 6 tables in Supabase migrations: `tenants`, `users`, `pbx_connections`, `cdr_records`, `call_analyses`, `job_queue`. Include all indexes, triggers (`update_updated_at_column`), functions (`claim_next_job`, `increment_tenant_usage`, `reset_stale_jobs`). Enable RLS on all tables. Add `recording_retention_days INTEGER DEFAULT 90` to tenants table.
**Test Gate:**
```bash
npx supabase db push # Migrations apply without error
# Verify: SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'; → 6 tables
# Verify: SELECT proname FROM pg_proc WHERE proname IN ('claim_next_job', 'increment_tenant_usage', 'reset_stale_jobs'); → 3 rows
```

### Step 1.3 — RLS Policies
**Create:** All RLS policies per PROJECT-SPEC.md. Super admin sees everything. Client admin sees only their tenant's data. Service role bypasses RLS.
**Test Gate:**
```sql
-- As anon user: SELECT * FROM cdr_records; → 0 rows (not authenticated)
-- As client admin: SELECT * FROM cdr_records; → only their tenant's rows
-- As super admin: SELECT * FROM cdr_records; → all rows
```

### Step 1.4 — Supabase Client Setup
**Create:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server components/API routes), `lib/supabase/admin.ts` (service role for worker). Generate TypeScript types from Supabase schema.
**Test Gate:**
```typescript
// Create a test API route that queries tenants table
// GET /api/test → returns { connected: true, tables: 6 }
```

### Step 1.5 — Encryption & Error Utilities
**Create:** `lib/encryption.ts` (AES-256-GCM encrypt/decrypt per PROJECT-SPEC.md), `lib/errors.ts` (error factory with typed error codes and HTTP status mapping), `lib/utils.ts` (common helpers).
**Test Gate:**
```typescript
// Unit test: encrypt('hello') → decrypt(result) === 'hello'
// Unit test: createError(AUTH_ERRORS.SESSION_EXPIRED) throws with status 401
```

### ✅ CHECKPOINT 1: Foundation
- [ ] `npm run build` succeeds
- [ ] All 6 tables exist in Supabase with correct columns
- [ ] RLS is enabled on all tables
- [ ] Supabase client connects from API route
- [ ] Encryption round-trip works
- [ ] All indexes and triggers exist
- [ ] `claim_next_job()` function exists
- [ ] `.env.local` has all required vars populated

---

## AGENT 2: AUTH (Steps 2.1–2.5)

### Step 2.1 — Supabase Auth Configuration
**Create:** NextAuth-free auth using Supabase Auth directly. Create auth middleware that checks session on protected routes. Create `verifyAuth()` utility that checks session + user role + is_active (THROWS errors, does not return them — see Known Issues).
**Test Gate:**
```typescript
// verifyAuth with no session → throws SESSION_EXPIRED (401)
// verifyAuth with inactive user → throws ACCOUNT_SUSPENDED (403)
// verifyAuth with wrong role → throws INSUFFICIENT_PERMISSIONS (403)
```

### Step 2.2 — Login Page
**Create:** `/login` page with email/password form. Supabase `signInWithPassword`. Redirect to `/admin` for super_admin, `/dashboard` for client_admin. Error handling for wrong credentials, suspended account. Follow UI-DESIGN-SYSTEM.md.
**Test Gate:**
```bash
# Page renders without errors
# Form validates email format
# Submit with wrong password shows error toast
# Submit with correct password redirects appropriately
```

### Step 2.3 — Protected Route Layout
**Create:** `(app)/layout.tsx` that checks auth session. If no session, redirect to `/login`. Load user data (role, tenant_id) into a React context. Create `useUser()` hook.
**Test Gate:**
```bash
# Unauthenticated visit to /dashboard → redirects to /login
# Authenticated visit to /dashboard → renders layout
# useUser() returns { id, role, tenantId, email }
```

### Step 2.4 — Super Admin User Seed Script
**Create:** `scripts/create-super-admin.ts` per PROJECT-SPEC.md Appendix. Creates auth user + application user with role `super_admin` and `tenant_id: null`. Also create `scripts/seed-test-data.ts`: creates test tenant ("Acme Corp"), client admin user, mock PBX connection, and 5 sample CDR records with analysis data so the UI has data immediately.
**Test Gate:**
```bash
npx tsx scripts/create-super-admin.ts
# Verify: user exists in auth.users AND users table with role='super_admin'
# Can login via /login page
npx tsx scripts/seed-test-data.ts
# Verify: tenant "Acme Corp" exists, client admin can login, 5 CDR records visible
```

### Step 2.5 — Role-Based Navigation
**Create:** Sidebar component that shows different nav items based on role. Super admin: Tenants, Connections, Jobs, Stats. Client admin: Dashboard, Calls, Analytics, Settings. Logout button.
**Test Gate:**
```bash
# Super admin sees admin nav items
# Client admin sees dashboard nav items
# Logout clears session and redirects to /login
```

### ✅ CHECKPOINT 2: Auth
- [ ] Login page works with real Supabase credentials
- [ ] Wrong password shows clear error
- [ ] Super admin redirects to /admin
- [ ] Client admin redirects to /dashboard
- [ ] Unauthenticated users are redirected to /login
- [ ] Sidebar shows correct nav for each role
- [ ] Logout works
- [ ] DevTools: no console errors

---

## AGENT 3: CORE API & DATA (Steps 3.1–3.6)

### Step 3.1 — Tenant CRUD API
**Create:** `POST /api/tenants` (create), `GET /api/tenants` (list, paginated, super_admin only), `GET /api/tenants/[id]` (detail), `PATCH /api/tenants/[id]` (update). Zod validation on all inputs.
**Test Gate:**
```bash
# POST creates tenant and returns it
# GET returns paginated list
# PATCH updates and returns updated tenant
# Non-super-admin gets 403
```

### Step 3.2 — PBX Connection CRUD API
**Create:** `POST /api/connections` (create — encrypts password), `GET /api/connections` (list), `GET /api/connections/[id]` (detail — never returns decrypted password), `PATCH /api/connections/[id]` (update), `DELETE /api/connections/[id]` (soft delete — set status=inactive).
**Test Gate:**
```bash
# POST creates connection with encrypted password
# GET never includes password_encrypted in response
# Password stored in DB is not plaintext
```

### Step 3.3 — PBX Connection Test Endpoint
**Create:** `POST /api/connections/[id]/test`. Decrypts stored password, calls `testGrandstreamConnection()` per PROJECT-SPEC.md, returns success/failure.
**Test Gate:**
```bash
# Returns { success: true } or { success: false, error: "..." }
# Handles timeout (10s max)
# Handles self-signed SSL
```

### Step 3.4 — Webhook Handler + Dev Mock Tools
**Create:** `POST /api/webhook/grandstream/[connectionId]`. Full implementation per PROJECT-SPEC.md: validate connectionId, verify webhook secret, parse CDR payload with Zod, check for duplicates, create cdr_record, create job_queue entry. Also create `scripts/send-test-webhook.ts` (sends fake CDR to local server) and `scripts/mock-ucm-server.ts` (serves sample WAV for recording downloads).
**Test Gate:**
```bash
# POST with valid payload → creates CDR and job, returns 200
# POST with invalid connectionId → 404
# POST with wrong webhook secret → 401
# POST with duplicate uniqueid → returns existing CDR id (no duplicate)
# POST with invalid payload → 400 with Zod errors
# npx tsx scripts/send-test-webhook.ts → creates CDR and job in DB
```

### Step 3.5 — Calls API
**Create:** `GET /api/dashboard/calls` (list calls for current tenant, paginated, filterable by date/disposition/direction), `GET /api/dashboard/calls/[id]` (detail with analysis, signed URLs for recording/transcript). Super admin version at `GET /api/admin/calls` (cross-tenant).
**Test Gate:**
```bash
# Client admin: only sees their tenant's calls
# Super admin: sees all calls
# Filters work: disposition, date range, direction
# Detail includes signed storage URLs
```

### Step 3.6 — Dashboard Stats API
**Create:** `GET /api/dashboard/stats` (calls today, this month, avg duration, sentiment breakdown), `GET /api/admin/stats` (system-wide: tenant count, connection count, job queue status).
**Test Gate:**
```bash
# Dashboard stats scoped to authenticated user's tenant
# Admin stats include all tenants
# Returns correct aggregate counts
```

### ✅ CHECKPOINT 3: Core API
- [ ] Create a tenant via API → appears in DB
- [ ] Create a PBX connection → password is encrypted in DB
- [ ] Test connection endpoint returns success/failure
- [ ] Webhook creates CDR record and job
- [ ] Duplicate webhook is idempotent
- [ ] Calls API returns paginated, filtered results
- [ ] Stats API returns correct counts
- [ ] All routes enforce role-based access
- [ ] DevTools Network tab: no 500 errors

---

## AGENT 4: BACKGROUND WORKER (Steps 4.1–4.5)

### Step 4.1 — Worker Scaffold
**Create:** `worker/` directory with its own `package.json`, `tsconfig.json`. Main loop per PROJECT-SPEC.md: poll every 5s, claim job atomically via `claim_next_job()`, health check on `/health`. On startup AND every 5 minutes: call `reset_stale_jobs()` to recover any jobs stuck in "processing" for >10 minutes.
**Test Gate:**
```bash
cd worker && npm run build # Compiles without error
# Start worker → GET /health returns { status: "ok", activeJobs: 0 }
# Manually set a job to processing with started_at 15 min ago → worker resets it to pending
```

### Step 4.2 — Recording Download Step
**Create:** `worker/src/steps/download.ts`. Implements Grandstream UCM login (cookie session), recording download, returns Buffer. Handles self-signed SSL, session timeout with re-auth, retry on 404 (recording not ready yet — exponential backoff 5s/10s/20s).
**Test Gate:**
```typescript
// With mock: downloads returns a Buffer
// With mock: retries on 404 up to 3 times
// With mock: re-authenticates on 401
```

### Step 4.3 — Transcription Step
**Create:** `worker/src/steps/transcribe.ts`. Sends audio buffer to Deepgram Nova-2 with diarization enabled. Returns transcript text, utterances with speaker labels, speaker stats.
**Test Gate:**
```typescript
// With mock: returns { text, utterances, speakers }
// Handles Deepgram API errors gracefully
```

### Step 4.4 — AI Analysis Step
**Create:** `worker/src/steps/analyze.ts`. Sends transcript + call metadata to Claude API with the structured analysis prompt from PROJECT-SPEC.md. Parses JSON response. Calculates talk ratios from speaker data.
**Test Gate:**
```typescript
// With mock: returns valid Analysis object
// Handles Claude API errors gracefully
// Parses JSON response correctly
```

### Step 4.5 — Full Pipeline Integration
**Create:** `worker/src/pipeline.ts`. Connects all steps: download → upload to storage → transcribe → analyze → save results → update CDR → increment usage → mark job complete. Error handling: retry up to 3 times, then mark failed.
**Test Gate:**
```typescript
// With mocks: full pipeline completes, job status → 'completed'
// With mocks: failure after 3 retries → job status → 'failed', CDR status → 'failed'
// With mocks: usage counter incremented
```

### ✅ CHECKPOINT 4: Worker
- [ ] Worker starts and polls job_queue
- [ ] Health check responds on /health
- [ ] With a real or mocked Grandstream: download succeeds
- [ ] With Deepgram API key: transcription returns text
- [ ] With Claude API key: analysis returns structured JSON
- [ ] Full pipeline: job goes pending → processing → completed
- [ ] Failed job: retries 3 times then marks failed
- [ ] Tenant usage counters increment

---

## AGENT 5: UI (Steps 5.1–5.8)

> **Read UI-DESIGN-SYSTEM.md and MICRO-FEATURES.md before starting this agent.**

### Step 5.1 — App Shell & Layout
**Create:** Dark-mode app shell with sidebar (240px), top bar (48px), main content area. Sidebar: navigation per role, tenant name, user avatar, logout. Top bar: page title, search (placeholder), notifications bell. Follow UI-DESIGN-SYSTEM.md exactly.
**Test Gate:**
```bash
# Layout renders for both super admin and client admin
# Sidebar collapses on mobile
# No layout shift on page navigation
```

### Step 5.2 — Super Admin: Tenants Page
**Create:** `/admin/tenants` — DataTable with columns: name, slug, status, plan, calls processed, created date. Status badge (green/yellow/red). "New Tenant" button → modal form. Click row → tenant detail.
**Test Gate:**
```bash
# Table renders with real data from API
# Pagination works
# Create tenant modal validates and submits
# Status badges show correct colors
```

### Step 5.3 — Super Admin: Connections Page
**Create:** `/admin/connections` — DataTable with: name, tenant, host, status, last connected. "New Connection" button → multi-step form (select tenant → enter credentials → test connection → save). "Test" button per row.
**Test Gate:**
```bash
# Table renders with connections
# Create flow: can select tenant, enter host/port/user/pass, test returns result, save works
# Test button shows success/failure inline
# Password field is masked, never shown after save
```

### Step 5.4 — Super Admin: Jobs Page
**Create:** `/admin/jobs` — DataTable with: ID (truncated), tenant, type, status, attempts, created, error. Filter by status. "Retry" button on failed jobs. Auto-refresh every 10s.
**Test Gate:**
```bash
# Table renders with jobs
# Status filter works
# Retry button resets job to pending
# Table auto-refreshes
```

### Step 5.5 — Client Dashboard: Overview
**Create:** `/dashboard` — stat cards (calls today, this month, avg duration, top sentiment), call volume bar chart (last 30 days), sentiment donut chart, recent calls list (last 10). All scoped to authenticated tenant.
**Test Gate:**
```bash
# Stat cards show correct numbers from API
# Bar chart renders with Recharts
# Donut chart renders sentiment breakdown
# Recent calls list links to call detail
```

### Step 5.6 — Client Dashboard: Calls List
**Create:** `/dashboard/calls` — DataTable with: direction icon, caller, destination, duration, disposition, sentiment badge, date. Filters: date range picker, disposition dropdown, direction dropdown, search by phone number. Click row → call detail.
**Test Gate:**
```bash
# Table renders with calls
# Filters work independently and combined
# Search by phone number works
# Pagination works
# Click opens call detail
```

### Step 5.7 — Client Dashboard: Call Detail
**Create:** `/dashboard/calls/[id]` — Full call detail page. Recording audio player (HTML5 `<audio>` with controls), call metadata card, transcript viewer with speaker labels and timestamps, AI analysis cards (summary, sentiment, keywords, action items, compliance flags), sentiment timeline chart, talk ratio donut chart.
**Test Gate:**
```bash
# Audio player loads and plays signed URL
# Transcript displays with speaker labels
# All AI analysis sections render
# Charts render with data
# Graceful display when analysis is pending or failed
```

### Step 5.8 — Admin Stats Dashboard
**Create:** `/admin` landing page — system-wide stat cards (total tenants, active connections, calls today, pending/failed jobs), recent activity feed, system health indicators.
**Test Gate:**
```bash
# All stat cards render with API data
# Job queue status shows pending/processing/failed counts
# Page loads in < 1s
```

### ✅ CHECKPOINT 5: UI
- [ ] App shell renders correctly for both roles
- [ ] Sidebar navigation works, highlights active page
- [ ] Super admin: tenants CRUD works end-to-end
- [ ] Super admin: connections CRUD + test works
- [ ] Super admin: jobs list with retry works
- [ ] Client dashboard: stats and charts render
- [ ] Client dashboard: calls list with filters
- [ ] Client dashboard: call detail with player and analysis
- [ ] All empty states look intentional (not broken)
- [ ] All loading states use skeleton screens (not spinners)
- [ ] Responsive: works at 1024px, 768px widths
- [ ] DevTools: no console errors, no failed network requests

---

## AGENT 6: POLISH & DEPLOY (Steps 6.1–6.4)

### Step 6.1 — Error Pages & Edge Cases
**Create:** 404, 500 error pages. Connection error state (PBX unreachable). Empty states for all tables/lists. Loading skeletons for all data-dependent components. Toast notifications for all user actions (success/error).
**Test Gate:**
```bash
# /nonexistent → 404 page
# API error → toast notification
# Empty tenant list → "No tenants yet" state
# Empty calls list → "No calls recorded" state
```

### Step 6.2 — Client User Management
**Create:** Super admin can create client admin users: `POST /api/admin/users` (creates auth user + app user with tenant_id). User list on tenant detail page. Activate/deactivate users.
**Test Gate:**
```bash
# Create user → can login with those credentials
# Deactivate user → login fails with clear error
# User list shows on tenant detail page
```

### Step 6.3 — Scheduled Email Reports
**Create:** Weekly email report via Resend: calls processed, sentiment breakdown, top action items. Use Supabase cron (pg_cron) or Render cron job. Template renders correctly.
**Test Gate:**
```bash
# Trigger report manually → email received via Resend
# Email contains correct data for the tenant
# Unsubscribe link works
```

### Step 6.4 — Deployment
**Create:** Vercel deployment config for frontend. Render config for worker (render.yaml per PROJECT-SPEC.md). Supabase production project. Verify all env vars. Smoke test full flow: webhook → download → transcribe → analyze → view in dashboard.
**Test Gate:**
```bash
# Frontend deploys to Vercel without error
# Worker deploys to Render, /health returns OK
# Full pipeline: send test webhook → call appears in dashboard with analysis
```

### ✅ CHECKPOINT 6: Final
- [ ] Full end-to-end flow works (webhook → analysis → dashboard)
- [ ] Error pages render correctly
- [ ] All empty states look polished
- [ ] Email report sends and looks good
- [ ] Vercel deployment live
- [ ] Render worker live and processing
- [ ] Super admin can manage tenants, connections, users
- [ ] Client admin can view calls and analytics
- [ ] Performance: pages load in < 2s
- [ ] Security: no passwords exposed, RLS enforced, encrypted credentials
