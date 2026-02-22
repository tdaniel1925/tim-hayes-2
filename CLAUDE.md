# CLAUDE.md — AudiaPro Call Recording & Analytics Platform

> **Read this file first. It governs everything you do in this project.**

## What This Project Is

AudiaPro is a multi-tenant SaaS platform that connects to Grandstream UCM PBX systems, downloads call recordings, transcribes them via Deepgram, analyzes them with Claude AI, and presents analytics dashboards. Two user roles: Super Admin (manages all tenants) and Client Admin (sees their tenant's data only).

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Database:** Supabase PostgreSQL with RLS
- **ORM:** Drizzle ORM (queries only, NOT schema management)
- **Migrations:** Supabase migrations (SQL files in `supabase/migrations/`)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (recordings, transcripts, analyses)
- **Background Worker:** Node.js on Render (polls job_queue every 5s)
- **AI:** Anthropic Claude API (analysis), Deepgram Nova-2 (transcription)
- **Email:** Resend
- **UI:** Tailwind CSS, shadcn/ui, Recharts
- **Security:** AES-256-GCM encryption for PBX credentials

## Spec Files — Read Before Building

| File | What It Contains | When to Read |
|------|-----------------|--------------|
| `PROJECT-SPEC.md` | Full architecture, Grandstream integration, API specs, DB schema, worker pipeline, known issues | Always — source of truth |
| `BUILD-STATE.md` | Progress tracker — which steps are done, which is next | Every session start |
| `BUILD-STEPS.md` | Atomic build steps with test gates and manual checkpoints | Before each step |
| `UI-DESIGN-SYSTEM.md` | Colors, typography, spacing, components, anti-patterns | Before ANY UI work |
| `MICRO-FEATURES.md` | Interaction nuance for every component | Before building any UI component |

## Build Rules — Non-Negotiable

### 1. One Step at a Time
- Check `BUILD-STATE.md` for the current step
- Build ONLY that step
- Run the test gate for that step
- Do NOT proceed until the test passes
- Do NOT combine steps

### 2. Test Before Proceeding
Every step has a test gate. Run it. If it fails 3 times: STOP. Output the error. Do not keep guessing.

### 3. Manual Checkpoints Are Mandatory
At `CP` steps in BUILD-STATE.md: STOP. List every checkpoint item. Wait for human sign-off.

### 4. Context Window Rule
**When you reach 25,000 tokens or less of remaining context:**
1. STOP immediately
2. `git commit -m "Step X.Y: {name} — context handoff"`
3. Update BUILD-STATE.md
4. Output a HANDOFF PROMPT with:
   - Which step was completed (or partially completed)
   - Which step is next
   - Files modified this session
   - Known issues for next step
5. Tell user to start fresh Claude Code session

### 5. Follow the Design System
- Read `UI-DESIGN-SYSTEM.md` before writing ANY UI code
- Dark-first design (background: #0F1117)
- Coral accent: #FF7F50
- 13px base font, 4px spacing grid
- Reference the design system for every component

### 6. Read Micro-Features Before Building Components
Before building any UI component, find the relevant section in MICRO-FEATURES.md and implement ALL listed features in that step.

### 7. Update BUILD-STATE.md After Every Step

## Code Standards

### File Organization
```
src/
  app/
    (auth)/login/
    (auth)/register/
    (app)/admin/           # Super admin pages
      tenants/
      connections/
      jobs/
    (app)/dashboard/       # Client admin pages
      calls/
      analytics/
      settings/
    api/
      admin/               # Super admin API routes
      dashboard/           # Client admin API routes
      webhook/grandstream/ # Webhook handler
      connections/
      tenants/
      jobs/
  components/
    ui/                    # shadcn/ui components
    shared/                # DataTable, StatusBadge, etc.
    calls/                 # Call-specific components
    analytics/             # Chart components
    layout/                # Sidebar, TopBar
  lib/
    supabase/              # Client, server client, types
    db/
      schema.ts            # Drizzle schema definitions (for type inference)
      queries.ts           # Drizzle query helpers
    integrations/
      grandstream.ts       # UCM API client
      deepgram.ts          # Transcription
      anthropic.ts         # AI analysis
    encryption.ts          # AES-256-GCM
    errors.ts              # Error types and factory
    utils.ts
  types/
worker/
  src/
    index.ts               # Poll loop + health check
    pipeline.ts            # Full processing pipeline
    steps/
      download.ts          # Download from UCM
      transcribe.ts        # Deepgram transcription
      analyze.ts           # Claude analysis
      finalize.ts          # Update DB, increment usage
supabase/
  migrations/              # Numbered SQL files
```

### Naming Conventions
- Components: PascalCase (`CallDetail.tsx`)
- Utilities: camelCase (`grandstream.ts`)
- API routes: kebab-case (`api/webhook/grandstream/[connectionId]/route.ts`)
- Database: snake_case (`cdr_records`, `call_analyses`)

### Error Handling
- Every API route: try/catch with proper HTTP status codes
- Every external API call (Grandstream, Deepgram, Claude): retry with exponential backoff
- PBX credential errors: surface clearly to user, never expose raw passwords
- Background jobs: max 3 retries, then mark failed with error message

### Critical Integration Notes
- **Drizzle ORM strategy:** Use Drizzle for type-safe queries ONLY. Schema management is done via Supabase SQL migrations. Drizzle schema files (`src/lib/db/schema.ts`) mirror the SQL schema for TypeScript types, but migrations are written as SQL in `supabase/migrations/`.
- **Grandstream SSL:** Always set `rejectUnauthorized: false` — most UCMs use self-signed certs
- **Recording downloads:** Stream to buffer, never to disk on serverless
- **Recording not found:** Retry 3x with backoff, then reschedule job for +5min (don't fail immediately)
- **Job claiming:** Use `claim_next_job()` PostgreSQL function with `FOR UPDATE SKIP LOCKED`
- **Stale jobs:** Call `reset_stale_jobs()` at worker startup and every 5 minutes
- **Claude analysis prompt:** Use the exact prompt template in PROJECT-SPEC.md — do not improvise
- **Don't use `uuid_generate_v4()`** — use `gen_random_uuid()` (built-in)
- **Don't add connection pooling config** — Supabase handles it, just set `prepare: false`
- **verifyAuth must THROW errors** — never return error objects

### Local Development
- Use `scripts/send-test-webhook.ts` to simulate Grandstream webhooks
- Use `scripts/mock-ucm-server.ts` to serve sample recordings locally
- Use `scripts/seed-test-data.ts` to populate the DB with test data
- See PROJECT-SPEC.md "Development Setup Checklist" for full setup

## Git Workflow
- Commit after every step: `git commit -m "Step X.Y: {name} ✅"`
- Branch per agent: `agent-1/foundation`, `agent-2/auth`, etc.
- Merge to main at manual checkpoints only
