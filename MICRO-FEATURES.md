# MICRO-FEATURES.md — AudiaPro Interaction Details

> Every checkbox is a feature. Priority markers tell Claude Code what to build now vs later.
> **P0** = Must have (build in this step) · **P1** = Should have (build if time) · **P2** = Nice to have (defer to polish)
> Claude Code: implement ALL P0 items in the step. Add P1 if the step is clean. Skip P2 until Agent 6.

---

## 1. Login Page

### Form
- [ ] Email field: type="email", autocomplete="email"
- [ ] Password field: type="password", autocomplete="current-password", show/hide toggle (eye icon)
- [ ] Submit button: shows loading spinner inside button during auth, disabled during submit
- [ ] Enter key submits form
- [ ] Tab order: email → password → submit
- [ ] "Remember me" checkbox (sets longer session expiry)

### Errors
- [ ] Wrong password: "Invalid email or password" (never reveal which is wrong)
- [ ] Account suspended: "Your account has been deactivated. Contact your administrator."
- [ ] Network error: "Unable to connect. Please check your internet connection."
- [ ] Rate limit: "Too many login attempts. Please try again in 60 seconds."
- [ ] Errors clear when user starts typing

### States
- [ ] Empty: just the form, centered vertically, AudiaPro logo above
- [ ] Loading: button shows spinner, inputs disabled
- [ ] Error: red border on relevant field + error message below form
- [ ] Success: redirect (no flash of login page)

---

## 2. App Shell / Layout

### Sidebar
- [ ] Fixed 240px width on desktop
- [ ] Collapses to 48px icon-only on ≤1024px
- [ ] Manual collapse toggle (hamburger icon in top bar)
- [ ] Smooth width transition (200ms ease)
- [ ] Active nav item: coral left border + coral icon + bg-surface-hover
- [ ] Hover: bg-surface-hover
- [ ] Section headers: uppercase, 10px, text-tertiary, letter-spacing
- [ ] Scrollable if nav overflows vertically
- [ ] Bottom section: user avatar circle (initials) + name + role badge + logout icon

### Top Bar
- [ ] Height: 48px, bg-surface, border-bottom
- [ ] Left: hamburger (sidebar toggle) + breadcrumb (page title)
- [ ] Right: notification bell (with badge count dot) + user avatar
- [ ] Breadcrumb updates on every page navigation

### Main Content
- [ ] Fills remaining space (flex: 1)
- [ ] Scrollable independently from sidebar
- [ ] Max-width: none (fill available space)
- [ ] Padding: 24px

---

## 3. DataTable (Shared Component)

### Core
- [ ] Sortable columns: click header → asc, click again → desc, click again → unsorted
- [ ] Sort indicator: ↑ or ↓ arrow next to active sort column header
- [ ] Row hover: bg-surface-hover
- [ ] Row click: navigates to detail (if onRowClick provided)
- [ ] Selected row: bg-selected with coral left border
- [ ] Column alignment: text left, numbers right, dates right, status center
- [ ] Horizontal scroll on narrow viewports (table doesn't squish)

### Pagination
- [ ] Bottom bar: "Showing 1–20 of 347 results"
- [ ] Page size selector: 20 / 50 / 100
- [ ] Previous / Next buttons, disabled at bounds
- [ ] Page numbers: show first, last, current ± 1 with ellipsis
- [ ] Keyboard: left/right arrows change page when focused

### Loading State
- [ ] Skeleton rows: 5 rows of animated pulse bars matching column widths
- [ ] No table headers flash → skeleton includes header row

### Empty State
- [ ] Centered: relevant icon (muted) + "No {items} found" + description text
- [ ] If filters are active: "No results match your filters" + "Clear filters" button
- [ ] If truly empty: "Get started by {action}" + CTA button

### Filtering
- [ ] Filters render above table in a horizontal bar
- [ ] Active filter count badge on filter bar
- [ ] "Clear all" button when any filter is active
- [ ] Filter changes reset pagination to page 1
- [ ] Filters sync to URL query params (shareable, survives refresh)

---

## 4. Super Admin: Tenants Page

### Table Columns
- [ ] Name: text-md, font-medium, clickable (links to detail)
- [ ] Slug: text-sm, monospace, text-secondary
- [ ] Status: pill badge (active=green, suspended=yellow, cancelled=red)
- [ ] Plan: pill badge (free=gray, starter=blue, professional=coral, enterprise=purple)
- [ ] Calls Processed: right-aligned number with comma formatting
- [ ] Created: relative date ("3 days ago") with full date on hover tooltip

### Create Modal
- [ ] Fields: Name (required), Slug (auto-generated from name, editable), Billing Email, Plan dropdown
- [ ] Slug auto-gen: lowercase, spaces→hyphens, strip special chars, debounce 300ms
- [ ] Slug uniqueness check on blur (async, shows ✓ or "already taken")
- [ ] Validation: name required, slug required + unique, email format if provided
- [ ] Submit: creates tenant, closes modal, adds row to table without full reload

### Tenant Detail
- [ ] Header: tenant name, status badge, created date
- [ ] Edit inline: name, billing email, plan (auto-save on blur with toast)
- [ ] Status actions: Suspend / Activate / Cancel with confirmation dialog
- [ ] Usage stats: calls processed, audio minutes, storage used
- [ ] Connections list: mini table of PBX connections for this tenant
- [ ] Users list: mini table of users for this tenant

---

## 5. Super Admin: Connections Page

### Table Columns
- [ ] Name: text-md
- [ ] Tenant: text-sm, linked to tenant detail
- [ ] Host: monospace, text-sm
- [ ] Status: dot indicator (green=active, red=error, gray=inactive)
- [ ] Last Connected: relative date
- [ ] Last Error: text-sm, text-error, truncated with hover tooltip for full text

### Create Flow (Multi-Step)
- [ ] Step 1: Select tenant (dropdown with search)
- [ ] Step 2: Enter connection details (name, host, port, username, password, verify SSL toggle)
- [ ] Step 3: Test connection (auto-runs on entering step, shows connecting → success/failure)
- [ ] Step 4: Confirm & Save (shows summary, webhook URL to copy, webhook secret)
- [ ] Back button on each step
- [ ] Port defaults to 8089
- [ ] Password field: masked, show/hide toggle
- [ ] Test failure: shows error message, "Try again" button, can still save (warns)

### Webhook URL Display
- [ ] After creation: shows full webhook URL prominently
- [ ] Copy button with "Copied!" feedback
- [ ] Webhook secret shown once with copy button
- [ ] Instructions: "Configure this URL in your Grandstream UCM > PBX Settings > Event Center > CDR Webhook"

### Test Button (Per Row)
- [ ] Inline "Test" button
- [ ] Click: button shows spinner → then ✓ or ✗ with result
- [ ] Success: updates last_connected_at, sets status to active
- [ ] Failure: shows error tooltip, sets status to error

---

## 6. Super Admin: Jobs Page

### Table Columns
- [ ] ID: first 8 chars, monospace, text-sm
- [ ] Tenant: tenant name
- [ ] Type: pill badge (full_pipeline, transcribe_only, analyze_only)
- [ ] Status: pill badge (pending=yellow, processing=blue, completed=green, failed=red)
- [ ] Attempts: "2/3" format
- [ ] Created: relative date
- [ ] Error: text-error, truncated, hover for full text

### Actions
- [ ] Retry button on failed jobs: resets status to pending, clears error
- [ ] Bulk retry: checkbox selection + "Retry Selected" button
- [ ] Auto-refresh toggle: "Auto-refresh" switch, 10s interval when on
- [ ] Processing indicator: animated dot on "processing" status

### Filters
- [ ] Status dropdown: All, Pending, Processing, Completed, Failed
- [ ] Tenant dropdown (searchable)
- [ ] Date range: last 24h, last 7 days, last 30 days, custom

---

## 7. Client Dashboard: Overview

### Stat Cards (4 across)
- [ ] Calls Today: number + trend vs yesterday
- [ ] Calls This Month: number + trend vs last month
- [ ] Avg Call Duration: formatted as "X min Y sec"
- [ ] Sentiment Score: percentage with colored indicator
- [ ] Each card: hover subtle lift (2px translateY)
- [ ] Loading: pulsing skeleton matching card dimensions

### Call Volume Chart
- [ ] Bar chart: last 30 days, one bar per day
- [ ] X-axis: date (show every 5th day label)
- [ ] Y-axis: call count
- [ ] Tooltip: date + exact count
- [ ] Bar color: coral
- [ ] Hover bar: slightly brighter
- [ ] Empty: "No call data yet" with muted chart placeholder

### Sentiment Breakdown
- [ ] Donut chart with 4 segments (positive/neutral/negative/mixed)
- [ ] Center: total calls count
- [ ] Legend: below chart, horizontal, with count per sentiment
- [ ] Colors: green / gray / red / yellow

### Recent Calls
- [ ] Last 10 calls in compact list format
- [ ] Each row: direction icon (↙ inbound, ↗ outbound), caller/destination, duration, sentiment badge, relative time
- [ ] Click: navigates to call detail
- [ ] "View all calls →" link at bottom

---

## 8. Client Dashboard: Calls List

### Table Columns
- [ ] Direction: icon only (↙ green for inbound, ↗ blue for outbound, ↔ gray for internal)
- [ ] From: phone number (monospace) with name if known
- [ ] To: phone number (monospace) with name if known
- [ ] Duration: formatted "M:SS"
- [ ] Disposition: pill badge (ANSWERED=green, NO ANSWER=yellow, BUSY=red, FAILED=red)
- [ ] Sentiment: pill badge (positive/neutral/negative/mixed)
- [ ] Date: relative ("2h ago") with full datetime on hover
- [ ] Status: processing spinner if still analyzing

### Filters
- [ ] Date range: Today, Last 7 days, Last 30 days, Custom (date pickers)
- [ ] Disposition: multi-select dropdown
- [ ] Direction: Inbound / Outbound / Internal / All
- [ ] Sentiment: multi-select dropdown
- [ ] Search: phone number search (debounce 200ms, searches src and dst)
- [ ] All filters in URL params

### Bulk Actions (Future Ready)
- [ ] Checkbox column (disabled for now, structure in place)

---

## 9. Client Dashboard: Call Detail

### Header
- [ ] Back button: "← Back to calls"
- [ ] Direction icon + "Inbound Call" / "Outbound Call"
- [ ] From → To with phone numbers (monospace, large)
- [ ] Date/time, duration, disposition badge, sentiment badge
- [ ] Processing status: if still analyzing, show progress ("Transcribing..." / "Analyzing...")

### Audio Player
- [ ] HTML5 `<audio>` element with custom styled controls
- [ ] Play / Pause toggle button (coral icon)
- [ ] Progress bar: clickable/draggable to seek
- [ ] Current time / Total time (monospace)
- [ ] Playback speed: 0.5x, 1x, 1.5x, 2x toggle
- [ ] Download button: downloads original recording
- [ ] Volume slider (optional — browser default is fine initially)
- [ ] Loading state: skeleton bar while signed URL resolves
- [ ] Error state: "Recording unavailable" with retry button

### Transcript Viewer
- [ ] Speaker-labeled utterances with timestamps
- [ ] Speaker 1: coral label, Speaker 2: blue label
- [ ] Timestamps: monospace, text-tertiary, clickable (seeks audio to that time)
- [ ] Full text: scrollable container, max-height 400px
- [ ] Search within transcript: search bar that highlights matching text
- [ ] Copy button: copies full transcript as plain text
- [ ] Empty state: "No transcript available" (if transcription failed)
- [ ] Loading state: skeleton lines

### AI Analysis Cards

#### Summary Card
- [ ] "Summary" header with Zap icon
- [ ] 2-3 sentence summary text
- [ ] bg-surface card with accent-subtle left border

#### Sentiment Card
- [ ] Overall sentiment: large badge
- [ ] Sentiment score: 0-100 with colored bar
- [ ] Sentiment timeline (if available): mini line chart showing sentiment over call duration

#### Keywords & Topics
- [ ] Keywords: horizontal chip list, bg-surface-hover pills
- [ ] Topics: horizontal chip list, border pills
- [ ] Click keyword/topic: could filter calls list (future)

#### Action Items
- [ ] Numbered list with checkbox-style items
- [ ] Each item: text with no actual checkbox (display only)
- [ ] Empty: "No action items identified"

#### Compliance
- [ ] Compliance score: percentage with colored indicator (>80 green, 50-80 yellow, <50 red)
- [ ] Flags: red pill badges
- [ ] Empty: "No compliance issues detected" (green checkmark)

#### Talk Ratio
- [ ] Donut chart: caller % vs agent %
- [ ] Center: silence percentage
- [ ] Legend: Speaker 1 (coral) / Speaker 2 (blue) / Silence (gray)
- [ ] Below chart: talk time in seconds per speaker

#### Escalation Risk
- [ ] Risk level: large badge (low=green, medium=yellow, high=red)
- [ ] Reasons: bullet list
- [ ] Empty: "Low escalation risk"

### States
- [ ] Processing: show each step's status (downloading, transcribing, analyzing) with spinner
- [ ] Failed: show error message with "Retry Analysis" button
- [ ] Completed: full detail view
- [ ] No recording: hide audio player, show "No recording available"
- [ ] No analysis: hide analysis cards, show "Analysis pending" or "Analysis failed"

---

## 10. Connection Create: Webhook Setup Instructions

After creating a PBX connection, show clear setup instructions:

- [ ] Webhook URL: displayed in monospace with copy button
- [ ] Webhook secret: displayed once with copy button + warning "Save this now"
- [ ] Step-by-step instructions with screenshots (or text descriptions):
  1. Log into your Grandstream UCM admin panel
  2. Navigate to PBX Settings → Event Center → CDR Webhook
  3. Enable CDR webhook
  4. Paste the webhook URL
  5. Set method to POST, content type to JSON
  6. Add header: x-webhook-secret → paste your secret
  7. Select events: Call ended, Recording available
  8. Save and test
- [ ] "Test Connection" button at the bottom
- [ ] "I've completed setup" button to dismiss

---

## 11. Toast Notifications

- [ ] Position: top-right, stacked
- [ ] Types: success (green icon), error (red icon), warning (yellow icon), info (blue icon)
- [ ] Auto-dismiss: 4 seconds (success/info), 8 seconds (error/warning)
- [ ] Manual dismiss: X button
- [ ] Animate in: slide from right
- [ ] Animate out: fade + slide right
- [ ] Max visible: 3 (older ones auto-dismiss)
- [ ] Action button: optional ("Retry", "View", etc.)

---

## 12. Forms (Global Patterns)

- [ ] All inputs: 36px height, bg-surface, border-default border, 6px border-radius
- [ ] Focus: coral ring (2px), no default browser outline
- [ ] Error: red border + error message below in 11px text-error
- [ ] Label: 12px, text-secondary, above input, 4px gap
- [ ] Required indicator: red asterisk after label
- [ ] Disabled: opacity 0.5, cursor not-allowed
- [ ] Placeholder: text-tertiary
- [ ] Select dropdowns: same styling as inputs, custom chevron icon
- [ ] Toggle switches: 36px wide, 20px tall, coral when on, border-default when off

---

## 13. Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| ≥1280px | Full layout, sidebar expanded, right panels visible |
| 1024–1279px | Sidebar collapsed to icons, single column content |
| 768–1023px | No sidebar (hamburger menu), stacked stat cards (2 per row) |
| <768px | Full mobile: hamburger nav, single column, stacked everything |

- [ ] Tables: horizontal scroll on mobile
- [ ] Stat cards: 4→2→1 column responsive
- [ ] Charts: full width on all breakpoints
- [ ] Modals: full-screen on mobile (<768px)
- [ ] Filters: collapse to "Filters" button with slide-out panel on mobile
