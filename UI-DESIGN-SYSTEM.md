# UI-DESIGN-SYSTEM.md — AudiaPro Design System

> **Dark-first analytics dashboard. Dense, professional, data-focused.**
> Read this before writing ANY UI code. Follow it exactly.

---

## Design Philosophy

Think **Vercel Dashboard meets Datadog**. Dark background, high-contrast data, coral accent for actions and alerts. Dense enough for power users scanning hundreds of calls, clean enough that a non-technical client admin can navigate without training.

---

## Color System

### Dark Theme (Default)

```css
:root {
  /* Backgrounds */
  --bg-primary: #0F1117;      /* Page background */
  --bg-surface: #1A1D27;      /* Cards, panels */
  --bg-surface-hover: #242736; /* Hover states */
  --bg-elevated: #1E2130;     /* Modals, dropdowns */
  --bg-selected: #2A1F1A;     /* Selected rows (coral tint) */

  /* Text */
  --text-primary: #F5F5F7;    /* Headings, primary content */
  --text-secondary: #9CA3AF;  /* Labels, descriptions */
  --text-tertiary: #5C6370;   /* Placeholders, disabled */

  /* Borders */
  --border-default: #2E3142;  /* Card borders, dividers */
  --border-subtle: #1E2130;   /* Inner dividers */

  /* Accent — Coral (ONLY accent color) */
  --accent: #FF7F50;
  --accent-hover: #E86840;
  --accent-subtle: #2A1F1A;   /* Accent background tint */
  --accent-text: #FFB088;     /* Accent text on dark bg */

  /* Semantic */
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;

  /* Sentiment colors */
  --sentiment-positive: #22C55E;
  --sentiment-neutral: #6B7280;
  --sentiment-negative: #EF4444;
  --sentiment-mixed: #F59E0B;
}
```

### Usage Rules
- Coral (`#FF7F50`) appears ONLY on: primary buttons, active nav indicator, chart accents, status dots for "active", focus rings, CTAs
- Semantic colors (green/yellow/red/blue) ONLY for their purpose: success/warning/error/info
- Everything else is grayscale from the palette above
- NEVER use blue for buttons or links — use coral or white text
- NEVER use colored backgrounds for cards — use `--bg-surface`

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
font-family-mono: 'JetBrains Mono', 'Fira Code', monospace; /* Phone numbers, IDs */
```

### Scale
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `text-xs` | 11px | 400 | Timestamps, badge text, metadata |
| `text-sm` | 12px | 400/500 | Table cells, secondary info |
| `text-base` | 13px | 400 | Default body text |
| `text-md` | 14px | 500 | Table headers, nav items, subjects |
| `text-lg` | 16px | 600 | Section headers |
| `text-xl` | 20px | 600 | Page titles |
| `text-2xl` | 28px | 700 | Stat card numbers |
| `text-3xl` | 36px | 700 | Hero stats (dashboard) |

### Rules
- **13px base font** in all UI (not 16px)
- **Max weight: 600** (semibold). Never use 700/bold in the UI
- Phone numbers and IDs: monospace font
- Line height: 1.4 for body, 1.2 for headings

---

## Spacing

### 4px Grid
Every margin, padding, and gap is a multiple of 4px.

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Inline icon padding |
| `space-2` | 8px | Between icon and label |
| `space-3` | 12px | Card inner padding (compact) |
| `space-4` | 16px | Card inner padding (default) |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Page padding, major gaps |
| `space-8` | 32px | Between major sections |

**Never use arbitrary values like 17px, 23px, 13px for spacing.**

---

## Components

### Stat Cards
```
┌─────────────────────────┐
│ Calls Today       ↑ 12% │  ← text-xs, text-secondary
│ 247                      │  ← text-3xl, text-primary, font-semibold
│ vs 221 yesterday         │  ← text-xs, text-tertiary
└─────────────────────────┘
```
- Background: `bg-surface`
- Border: `1px solid border-default`
- Border-radius: 8px
- Padding: 16px
- Trend indicator: green arrow up / red arrow down

### DataTable
- Header row: `bg-surface`, text-xs, text-secondary, uppercase, letter-spacing 0.05em
- Data rows: 44px height, `border-bottom: 1px solid border-subtle`
- Hover: `bg-surface-hover`
- Selected: `bg-selected` with coral left border (2px)
- Pagination: bottom bar, text-sm, "Showing 1-20 of 347"
- Empty state: centered icon + message, no table headers shown

### Status Badges
| Status | Background | Text |
|--------|-----------|------|
| Active / Completed | `success/10%` | `success` |
| Pending / Processing | `warning/10%` | `warning` |
| Error / Failed | `error/10%` | `error` |
| Inactive / Cancelled | `text-tertiary/10%` | `text-tertiary` |

- Border-radius: 9999px (pill)
- Padding: 2px 8px
- Font: 11px, weight 500

### Sentiment Badges
| Sentiment | Color |
|-----------|-------|
| Positive | `#22C55E` |
| Neutral | `#6B7280` |
| Negative | `#EF4444` |
| Mixed | `#F59E0B` |

Same pill style as status badges.

### Buttons
| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `accent` | white | none |
| Secondary | transparent | `text-secondary` | `1px solid border-default` |
| Danger | transparent | `error` | `1px solid error/30%` |
| Ghost | transparent | `text-secondary` | none |

- Height: 32px (compact) or 36px (default)
- Border-radius: 6px
- Font: 13px, weight 500
- Primary hover: `accent-hover`

### Sidebar
- Width: 240px fixed
- Background: `bg-surface`
- Nav items: 32px height, 8px padding, 6px border-radius
- Active: coral left border (2px) + `bg-surface-hover` + coral icon
- Hover: `bg-surface-hover`
- Section headers: 10px, uppercase, `text-tertiary`, letter-spacing

### Modal / Dialog
- Backdrop: `rgba(0, 0, 0, 0.6)`
- Background: `bg-elevated`
- Border: `1px solid border-default`
- Border-radius: 12px
- Max-width: 480px (form modals), 640px (detail modals)
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.3)`

### Charts (Recharts)
- Background: transparent (no chart background)
- Grid lines: `border-subtle`
- Axis text: 11px, `text-tertiary`
- Bar fill: `accent` (coral)
- Donut colors: use sentiment colors for sentiment chart, `accent` + `text-tertiary` for talk ratio
- Tooltip: `bg-elevated`, border, 12px text

---

## Audio Player
```
┌──────────────────────────────────────────────────────┐
│  ▶  ──────────●────────────────────  02:34 / 05:12   │
│      ▁▃▅▇▅▃▁▃▅▇█▇▅▃▁▃▅▇▅▃▁  (waveform optional)   │
└──────────────────────────────────────────────────────┘
```
- Background: `bg-surface`
- Play button: coral
- Progress bar: coral fill, `border-default` track
- Time: monospace, 12px, `text-secondary`
- Border-radius: 8px

---

## Transcript Viewer
```
┌──────────────────────────────────────┐
│  Speaker 1  10:30:05                 │  ← text-xs, accent for speaker 1, info for speaker 2
│  "Hello, thank you for calling       │
│  Acme Corp, how can I help you?"     │  ← text-base, text-primary
│                                      │
│  Speaker 2  10:30:12                 │
│  "Hi, I'm calling about my          │
│  recent order number 45721."         │
└──────────────────────────────────────┘
```
- Alternate speaker colors: Speaker 1 = coral text label, Speaker 2 = info (blue) text label
- Utterance text: `text-primary`, 13px
- Timestamp: `text-tertiary`, monospace, 11px
- Gap between utterances: 12px

---

## Anti-Patterns — NEVER Do These

| ❌ Never | ✅ Instead |
|----------|-----------|
| White/light backgrounds | Dark backgrounds (`bg-primary`, `bg-surface`) |
| Blue buttons or links | Coral primary, white text secondary |
| Loading spinners | Skeleton screens (animated pulse) |
| Bold (700 weight) | Semibold (600) maximum |
| 16px body text | 13px base font |
| Colored card backgrounds | `bg-surface` with border |
| Multiple accent colors | Coral only + semantic colors for status |
| Card-based list items | Table rows |
| Arbitrary spacing (17px, 23px) | 4px grid only |
| Inline error messages | Toast notifications |
| Full-page loading screens | Component-level skeletons |
