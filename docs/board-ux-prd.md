# Data Dude — Board UX Polish PRD (Investor Demo Readiness)

**Version:** 2.0  
**Date:** 2026-03-11  
**Scope:** 25 UX findings from audit; grouped into 3 milestones

---

## 1. Overview

**Problem:** Data Dude has a working core loop (chat -> insight -> board) but a UX audit surfaced 25 issues -- 3 critical, 10 major, 9 minor -- that collectively make the product feel unfinished. Chart cards clip outside the viewport, titles are truncated, axis labels show raw database column names, and the board lacks visual polish.

**Goal:** Ship a visually polished, demo-ready experience within 2 focused implementation sessions.

**Preserve (confirmed working well):**
- Skeleton loading states
- Undo pattern for board clear (10s toast + restore)
- Chat suggestion prompts in empty state
- Expand modal on card click

---

## 2. Milestone Structure

| Milestone | Theme | Issues | Est. Effort |
|-----------|-------|--------|-------------|
| **P0** | Demo Blockers | #1, #2, #3, #5, #7, #9 | ~3-4 hours |
| **P1** | Major Polish | #4, #6, #8, #10, #11, #12, #13 | ~3-4 hours |
| **P2** | Nice-to-haves | #14-#21 | ~1-2 hours |

---

## 3. P0 -- Demo Blockers

### P0-1: Chart cards overflow/clip beyond card boundaries

**Files:** `DashboardGrid.tsx`, `globals.css`  
**Fix:** Add `overflow-hidden` to the grid item wrapper. Add `.react-grid-item { overflow: hidden; }` in CSS.  
**AC:** No chart content extends beyond the card border at any grid size.

### P0-2: Card titles need 2-line wrap + tooltip

**File:** `DashboardPanel.tsx`  
**Fix:** Replace `truncate` with `line-clamp-2`, add `title={item.title}`, increase padding to `py-2.5`.  
**AC:** Titles up to ~80 chars wrap to 2 lines before ellipsis. Full title on hover.

### P0-3: Humanize chart axis labels

**Files:** New `formatLabel.ts`, `ChartPanel.tsx`, `chart.py`  
**Fix:** Create `humanizeLabel` (snake_case -> Title Case). Apply in Recharts and Vega-Lite specs.  
**AC:** `sales_month` displays as "Sales Month" on all chart axes.

### P0-5: Replace emoji icons with Lucide + type-color accents

**File:** `DashboardPanel.tsx`  
**Fix:** Replace emoji map with Lucide icons (BarChart3, FileText, Table2, Code2) each with accent color. Add colored `border-t-2` per panel type.  
**AC:** No emoji in card headers. Each panel type visually distinct.

### P0-7: Clear button confirmation

**File:** `MyBoardView.tsx`  
**Fix:** 2-click confirmation: first click changes to "Tap again to clear" (red), resets after 3s.  
**AC:** Single accidental click does NOT clear the board.

### P0-9: Card elevation and shadow

**File:** `DashboardPanel.tsx`, `globals.css`  
**Fix:** Add `shadow-lg shadow-black/20`, lighter card bg, brighter border. Add CSS variables.  
**AC:** Cards visually distinct from canvas. Shadow provides depth.

---

## 4. P1 -- Major Polish

### P1-4: Drag affordance
Add GripVertical icon at left edge of title bar.

### P1-6: "New session" button clipping
Add `shrink-0` to button container, responsive collapse at narrow viewports.

### P1-8: Bar chart x-axis labels
Increase height, -45deg angle, truncate long labels at 15 chars, skip alternate ticks when crowded.

### P1-10: Board toolbar structure
Add board title, move panel count to badge, consistent button styling.

### P1-11: Present mode hides edit controls
Add `presenting` prop to DashboardPanel/Grid, hide action buttons and disable drag/resize.

### P1-12: Resize handle
Replace border-based handle with proper grip pattern, visible only on hover.

### P1-13: Panel type distinction
Addressed jointly with P0-5 via colored top-border accents.

---

## 5. P2 -- Quick Wins

| # | Issue | Fix |
|---|-------|-----|
| 14 | Badge count too small | `text-[11px]`, `font-medium` |
| 15 | Preview tab icon | Lightbulb -> Eye |
| 16 | No "add panel" hint | Dashed placeholder card |
| 17 | Cramped gutters | margin [16,16], containerPadding [16,16] |
| 18 | Present mode header | Panel count + navigation |
| 19 | Keyboard shortcut hints | title attributes on buttons |
| 20 | Clear toast color | warning -> info |
| 21 | Generic font | Import Inter or DM Sans |

---

## 6. Verification Checklist

1. Empty state: Board shows "Build your story" message
2. Pin a chart: Card has Lucide icon, colored top-border, shadow, 2-line title
3. Chart readability: Axis labels show "Sales Month" not "sales_month"
4. Resize: Handle fades in on hover, chart scales
5. Multiple panels: Each type has distinct icon color and border accent
6. Clear: Confirmation required, undo toast appears
7. Present mode: Clean cards, no action buttons
