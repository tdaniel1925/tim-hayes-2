# Step 5.1 Verification: App Shell & Layout

## Test Gate Requirements
- [ ] Layout renders for both super admin and client admin
- [ ] Sidebar collapses on mobile
- [ ] No layout shift on page navigation

## Manual Testing Checklist

### 1. Layout Renders for Both Super Admin and Client Admin

**Super Admin Test:**
1. Start the dev server: `PORT=3001 npm run dev`
2. Login as super admin (use seed script credentials)
3. Navigate to http://localhost:3001/admin
4. Verify:
   - [ ] Sidebar shows super admin navigation items (Dashboard, Tenants, Connections, Jobs, Stats)
   - [ ] Top bar shows "Super Admin Dashboard" title
   - [ ] Top bar has hamburger menu button
   - [ ] Top bar has search input (disabled)
   - [ ] Top bar has notification bell icon
   - [ ] Sidebar shows user avatar with first letter
   - [ ] Sidebar shows user name and "Super Admin" role
   - [ ] Main content area has dark background (#0F1117)
   - [ ] No layout breaks or misalignments

**Client Admin Test:**
1. Login as client admin (create one if needed)
2. Navigate to http://localhost:3001/dashboard
3. Verify:
   - [ ] Sidebar shows client admin navigation items (Dashboard, Calls, Analytics, Settings)
   - [ ] Top bar shows "Dashboard" title
   - [ ] Sidebar shows user avatar with first letter
   - [ ] Sidebar shows user name and "Client Admin" role
   - [ ] Sidebar shows tenant name below user info
   - [ ] No layout breaks or misalignments

### 2. Sidebar Collapses on Mobile

**Desktop (≥1280px):**
1. Open browser at 1280px or wider width
2. Verify:
   - [ ] Sidebar is 240px wide (w-60)
   - [ ] Sidebar shows full navigation labels
   - [ ] User info section is visible with name and role
   - [ ] Tenant name (if client admin) is visible

**Tablet (1024px):**
1. Resize browser to 1024px width
2. Verify:
   - [ ] Sidebar automatically collapses to 48px (w-12)
   - [ ] Sidebar shows only icons (no labels)
   - [ ] User info section is hidden, only avatar visible
   - [ ] Transition is smooth (200ms)

**Tablet (<1024px):**
1. Resize browser to less than 1024px width
2. Verify:
   - [ ] Sidebar auto-collapses to icon-only mode
   - [ ] Smooth 200ms transition occurs

**Mobile (<768px):**
1. Resize browser to less than 768px width
2. Verify:
   - [ ] Sidebar is hidden completely (hidden md:flex)
   - [ ] Hamburger menu in top bar is functional

**Manual Toggle:**
1. At desktop width, click hamburger menu button
2. Verify:
   - [ ] Sidebar toggles between expanded and collapsed states
   - [ ] Transition is smooth
   - [ ] Icons remain visible when collapsed
   - [ ] State persists during navigation

### 3. No Layout Shift on Page Navigation

**Navigation Test:**
1. Navigate between pages: /admin → /admin/tenants → /admin/connections
2. Verify:
   - [ ] No horizontal shift
   - [ ] No vertical shift
   - [ ] Sidebar position remains fixed
   - [ ] Top bar remains at same height (48px)
   - [ ] Main content area doesn't jump or resize
   - [ ] Page title in top bar updates instantly

**Role-Specific Navigation:**
1. As super admin: navigate /admin → /admin/stats
2. As client admin: navigate /dashboard → /dashboard/calls
3. Verify:
   - [ ] Active nav item highlights correctly (coral left border + icon)
   - [ ] No layout shift between pages
   - [ ] Sidebar width remains consistent

## Code Structure Verification

**Component Files Created/Updated:**
- [x] src/components/sidebar.tsx - Updated with collapse support
- [x] src/components/layout/top-bar.tsx - Created with hamburger menu
- [x] src/components/layout/app-shell.tsx - Created to wrap content
- [x] src/components/layout/protected-layout-client.tsx - Created for state management
- [x] src/app/(app)/layout.tsx - Updated to use ProtectedLayoutClient
- [x] src/lib/auth.ts - Updated to include tenantName

**TypeScript Compilation:**
```bash
npx tsc --noEmit
# Should pass for all main app files
```

**Design System Compliance:**
- [x] Sidebar width: 240px expanded, 48px collapsed
- [x] Top bar height: 48px
- [x] Background colors: #1A1D27 (surface), #0F1117 (primary)
- [x] Border color: #2E3142
- [x] Accent color: #FF7F50 (coral)
- [x] Font sizes: 16px (titles), 13px (nav), 11px (metadata)
- [x] Transitions: 200ms ease
- [x] Active state: coral left border + coral icon color

## Results

**Test Status:**
- [ ] All manual tests passed
- [ ] Layout renders correctly for both roles
- [ ] Responsive behavior works as expected
- [ ] No layout shift during navigation
- [ ] TypeScript compilation passes

**Notes:**
