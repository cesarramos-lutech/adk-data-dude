# UX Testing Walkthrough - Code-Aware Guide

## Application Architecture Overview

### Layout
- **Left Sidebar (400px):** ChatPane - conversation history + input
- **Right Canvas:** CanvasPane with two modes:
  - **Active Insight** tab (Lightbulb icon)
  - **My Board** tab (Grid icon)

### Active Insight Tabs
When an insight is available, four sub-tabs appear:
1. **Insight** (FileText icon) - Narrative card
2. **Visualization** (BarChart3 icon) - Chart rendering
3. **Data Table** (Table icon) - Raw query results
4. **SQL Code** (Code icon) - Query with syntax highlighting

### Status Indicators (top-right)
- **Phase badges:** Understanding, Querying, Visualizing, Finalizing
- **Response type:** Message only, Partial insight, Insight ready, Error
- **Confidence level:** If provided by agent
- **Elapsed time:** Query execution duration

---

## Detailed Test Scenarios with Expected UI Behavior

### Scenario 1: Narrative-Only Prompt
**Input:** `hello there`

**Expected Flow:**
1. **Chat:** User message appears in left sidebar
2. **Status:** Phase badge shows "Understanding" → "Finalizing"
3. **Response type:** Badge shows "Message only"
4. **Canvas:** Shows empty state message:
   > "The latest response is narrative-only. Ask for a chart/table/SQL breakdown or click a prior insight card."
5. **Chat:** Agent responds with friendly message (e.g., greeting + guidance)

**What to Test:**
- [ ] Does agent provide helpful guidance on what to ask?
- [ ] Are example queries suggested?
- [ ] Does empty state message make sense to first-time users?
- [ ] Is there a way to discover sample prompts without reading docs?

**UX Issues to Watch:**
- ❌ Agent tries to execute query from "hello there"
- ❌ Error message appears instead of friendly response
- ❌ Canvas shows empty tabs instead of instructive message
- ❌ No guidance on what types of questions work

---

### Scenario 2: SQL-Only Request
**Input:** `only provide SQL query for top products by revenue`

**Expected Flow:**
1. **Chat:** Message appears, agent processes
2. **Status:** Phases show progress
3. **Response type:** Could be "Partial insight" or "Insight ready"
4. **Active Insight:**
   - Auto-switches to "SQL Code" tab OR
   - Shows insight with SQL available
5. **SQL Tab:** Query appears with:
   - Syntax highlighting
   - Copy button (check `InsightSql.tsx`)
   - Formatted/indented SQL

**What to Test:**
- [ ] Is SQL the prominent output?
- [ ] Can user copy SQL in one click?
- [ ] Is SQL syntax highlighted properly?
- [ ] Is there a "Run this query" or "Visualize" option?
- [ ] Does agent explain what the SQL does?

**UX Issues to Watch:**
- ❌ SQL buried in narrative text without code formatting
- ❌ No copy button (user must manually select)
- ❌ SQL shown as plain text in chat instead of code block
- ❌ No way to execute the SQL from the UI

---

### Scenario 3: Chart-Ready Prompt
**Input:** `show top products by revenue`

**Expected Flow:**
1. **Chat:** Message sent
2. **Status:** 
   - "Understanding" → "Querying" → "Visualizing" → "Finalizing"
   - Response type: "Insight ready"
   - Elapsed time appears (e.g., "3s")
3. **Active Insight:**
   - Auto-switches to "Visualization" tab
   - Chart renders (bar chart expected for products × revenue)
4. **All tabs populated:**
   - **Insight:** Narrative summary
   - **Visualization:** Chart with proper labels
   - **Data Table:** Tabular query results
   - **SQL Code:** The query that powered the viz
5. **Pin button:** Shows "Pin to Board" (blue, enabled)
6. **SQL discoverability:** Button below chart says "View SQL for this visualization"

**What to Test:**
- [ ] Does chart appear within 3-5 seconds?
- [ ] Are loading states clear during each phase?
- [ ] Is chart type appropriate (bar for categorical rankings)?
- [ ] Are axes labeled correctly?
- [ ] Does hover on chart show tooltips?
- [ ] Can user find SQL in 1-2 clicks from visualization?
- [ ] Does "View SQL for this visualization" button work?
- [ ] Is data table readable (not raw JSON)?

**UX Issues to Watch:**
- ❌ Long wait with no progress indicator
- ❌ Chart type mismatch (pie chart for 50 products)
- ❌ SQL hidden with no clear path to find it
- ❌ Data table shows JSON instead of formatted table
- ❌ Chart has no labels or confusing labels
- ❌ Hover doesn't work on chart elements

---

### Scenario 4: Pin-to-Board Flow
**Prerequisites:** Complete Scenario 3 first

**Expected Flow:**
1. **From Active Insight:** Pin button visible at top-right of tabs
2. **Click Pin:**
   - Button changes to green "Pinned" state
   - Toast notification appears: "Pinned to board!" (success)
3. **Switch to My Board tab:**
   - Grid layout (3 columns on large screens)
   - New card appears with:
     - Title (auto-generated from prompt context)
     - Chart preview (mini version)
     - Data snippet or description
4. **Verify pinned state:**
   - Go back to Active Insight
   - Pin button still shows "Pinned" (disabled)

**What to Test:**
- [ ] Is Pin button discoverable without scrolling?
- [ ] Does toast appear confirming action?
- [ ] Is auto-generated title descriptive?
  - GOOD: "Top Products by Revenue (Q4 2025)"
  - BAD: "Chart 1" or "Visualization"
- [ ] Does board update without page refresh?
- [ ] Can user distinguish between multiple pinned items?
- [ ] Is there a way to edit titles after pinning?
- [ ] Can user rearrange board items?

**UX Issues to Watch:**
- ❌ Pin button only visible on hover (breaks mobile)
- ❌ No confirmation that pin succeeded
- ❌ Generic title: "Chart 1" or timestamp
- ❌ Board doesn't update until refresh
- ❌ No way to unpinBOARD items individually
- ❌ Pinned chart loses formatting or data

---

### Scenario 5: Clear-Board Flow
**Prerequisites:** Have at least one pinned item

**Expected Flow:**
1. **My Board tab:** Shows grid of pinned items
2. **Clear Board button:** Red/amber, top-right near "My Board" heading
3. **Click Clear:**
   - Browser confirmation dialog appears:
     > "Clear all pinned insights from the board? This cannot be undone."
4. **Confirm:**
   - Board clears immediately
   - Empty state message appears:
     > "No pinned insights yet. Click 'Pin to Board' on an active insight to add it here."
5. **Cancel:**
   - Nothing happens, board remains intact

**What to Test:**
- [ ] Is Clear button visible but not too prominent?
- [ ] Does confirmation dialog prevent accidental clearing?
- [ ] Is warning message clear about irreversibility?
- [ ] Does empty state provide next-action guidance?
- [ ] Is there an undo mechanism?
- [ ] Can user archive instead of delete?

**UX Issues to Watch:**
- ❌ One-click clear with no confirmation
- ❌ Confirmation wording is confusing
- ❌ No undo/restore option
- ❌ Empty state is just blank screen
- ❌ Clear button too prominent (easy accidental click)

---

### Scenario 6: Error Handling & Retry
**Test Cases:**

#### 6a: Empty Input
**Action:** Click Send button with empty textarea

**Expected:**
- Button is disabled when input is empty, OR
- Friendly message: "Please enter a question"

**Issues:**
- ❌ Empty message sent to backend
- ❌ Generic error from API

#### 6b: Malformed Query
**Input:** `show me @@@ invalid query ###`

**Expected:**
- **Chat:** Agent responds with:
  - Explanation that query is unclear
  - Suggestion for rephrasing
  - Example queries
- **Status:** Response type shows "Error" badge
- **Canvas:** Shows error state with retry option

**Issues:**
- ❌ Stack trace shown to user
- ❌ Generic "Something went wrong"
- ❌ No suggested fixes

#### 6c: Non-Existent Table
**Input:** `show data from fake_table_xyz`

**Expected:**
- **Chat:** Agent responds with:
  - "Table 'fake_table_xyz' not found"
  - List of available tables
  - Suggested correction
- **Retry:** User can edit and resubmit

**Issues:**
- ❌ Raw BigQuery error message
- ❌ No list of valid tables
- ❌ Chat input doesn't pre-fill for retry

#### 6d: Query Timeout
**Input:** (complex query that takes >30s)

**Expected:**
- **Phase badges:** Show "Querying" for extended time
- **Eventually:** Timeout error with clear message
- **Retry option:** Available with "Try again" button

**Issues:**
- ❌ No indication query is still running
- ❌ UI appears frozen
- ❌ No way to cancel long-running query

**What to Test:**
- [ ] Are error messages in plain English?
- [ ] Do errors explain root cause AND solution?
- [ ] Is there a visible "Retry" or "Try again" button?
- [ ] Does retry pre-fill last prompt for editing?
- [ ] Do errors clear when new message is sent?
- [ ] Are BigQuery errors translated to user-friendly language?

---

## Cross-Cutting UX Dimensions

### 1. SQL Discoverability Score
**From Visualization context, how do you find the SQL?**

**Path 1 (Best):** Click "View SQL for this visualization" button below chart  
**Path 2 (Good):** Click "SQL Code" tab at top  
**Path 3 (Poor):** Ask agent "show me the SQL" in follow-up

**Score:**
- ✅ Excellent: Button + tab both visible, SQL in 1 click
- ⚠️ Good: SQL tab visible but no contextual button
- ❌ Poor: Must ask agent or dig through menus

---

### 2. Board Title Quality
**Evaluate auto-generated titles for pinned items:**

**Examples from code inspection:**
- Title likely comes from `currentInsight.title`
- May be derived from user prompt or agent response

**Scoring:**
- ✅ Excellent: "Top 10 Products by Revenue in Electronics (2025)"
- ⚠️ Good: "Top Products by Revenue"
- ❌ Poor: "Chart 1" or "Untitled Visualization"

**Test by pinning 3 different insights:**
1. Product revenue chart
2. Customer segmentation table
3. Time-series trend

**Check:**
- [ ] Are all three titles unique and descriptive?
- [ ] Do titles tell a story or just describe chart type?
- [ ] Can user edit titles after pinning?

---

### 3. Latency Communication
**How well does UI communicate what's happening during waits?**

**Phase Badges (from code):**
- "Understanding" - agent parsing intent
- "Querying" - BigQuery execution
- "Visualizing" - chart rendering
- "Finalizing" - wrapping up

**Score:**
- ✅ Excellent: Phase badges + elapsed time + progress bar
- ⚠️ Good: Phase badges visible
- ❌ Poor: Generic spinner with no context

**Test:**
- [ ] Are phases visible throughout the workflow?
- [ ] Does elapsed time counter reassure user during long queries?
- [ ] Is there a max wait before timeout/error?

---

### 4. State Transitions
**Do mode switches feel natural or jarring?**

**Transitions to test:**
1. Chat → Active Insight (auto-switch on query completion)
2. Active Insight → My Board (manual tab switch)
3. Insight sub-tabs (Visualization → SQL → Data Table)
4. Board → Active Insight (clicking a pinned card)

**Score:**
- ✅ Excellent: Smooth, expected, breadcrumbs/back button available
- ⚠️ Good: Clear but manual navigation required
- ❌ Poor: Unexpected switches, no way back

**Issues to watch:**
- ❌ Auto-switch happens mid-reading
- ❌ Active tab not highlighted clearly
- ❌ No visual feedback on tab change
- ❌ Clicking pinned item doesn't restore insight

---

## Checklist: Quick UX Audit

### Visual Hierarchy
- [ ] Most important actions are most prominent
- [ ] Pin button is visible but not overwhelming
- [ ] Clear board is styled as cautionary action (red/amber)
- [ ] Tab labels are scannable (icons + text)

### Feedback & Confirmation
- [ ] Button hover states work
- [ ] Pin action shows toast confirmation
- [ ] Clear board requires modal confirmation
- [ ] Pinned button shows green "success" state

### Error Prevention
- [ ] Empty input is disabled or caught early
- [ ] Destructive actions require confirmation
- [ ] SQL execution doesn't happen without user intent

### Learnability
- [ ] First-time users see helpful empty states
- [ ] Example prompts discoverable
- [ ] Error messages teach correct patterns
- [ ] UI labels are self-explanatory

### Performance Perception
- [ ] Loading states appear within 100ms
- [ ] Phase badges update in real-time
- [ ] Elapsed time counter runs during queries
- [ ] No frozen UI states

---

## Component-Specific Testing Notes

### ChatPane Component
**File:** `frontend/src/components/copilot/ChatPane.tsx`

**What to check:**
- [ ] Textarea expands for long input (max-h-32)
- [ ] Send button disabled during processing
- [ ] Message history scrolls properly
- [ ] Timestamps or message grouping for context

### InsightChart Component
**File:** `frontend/src/components/copilot/InsightChart.tsx`

**What to check:**
- [ ] Chart library renders correctly (Recharts suspected)
- [ ] Hover tooltips work
- [ ] Chart is responsive to container size
- [ ] Color scheme is accessible (sufficient contrast)

### InsightSql Component
**File:** `frontend/src/components/copilot/InsightSql.tsx`

**What to check:**
- [ ] Syntax highlighting applied (Prism.js or similar)
- [ ] Copy button present and functional
- [ ] SQL is formatted/indented
- [ ] Long queries scroll horizontally

### BoardCard Component
**File:** `frontend/src/components/copilot/BoardCard.tsx`

**What to check:**
- [ ] Card shows mini preview of chart
- [ ] Title is prominent
- [ ] Clicking card navigates to Active Insight
- [ ] Delete/unpin option per card (if exists)

---

## Browser DevTools Checklist

### Console Tab
**Watch for:**
- ❌ JavaScript errors
- ❌ React warnings (e.g., key prop missing)
- ❌ Failed API calls (4xx/5xx)
- ⚠️ Deprecation warnings

### Network Tab
**Monitor:**
- `/api/chat` endpoint calls
- Response times (should match elapsed_ms badges)
- WebSocket connections (if streaming enabled)
- Failed requests (retry logic triggered?)

### Elements/Inspector
**Check:**
- CSS variables (`--chat-bg`, `--text`, `--border`) render correctly
- Dark mode toggle (if exists)
- Responsive breakpoints (sm:, lg: grid columns)

---

## Quick Win Opportunities (Based on Code Review)

### High Impact, Low Effort
1. **Add SQL copy button** (if missing in `InsightSql.tsx`)
2. **Improve board titles** - More context from user prompt
3. **Loading messages** - Already have phase badges, enhance with descriptions
4. **Pin toast** - Already exists in `ActiveInsightView.tsx` line 32
5. **Empty state examples** - Add 3 starter queries to canvas empty state

### Medium Effort
6. **Editable board titles** - Add pencil icon to `BoardCard.tsx`
7. **Chart type override** - Let user request bar→line conversion
8. **Undo clear board** - Store last cleared state for 10s
9. **SQL formatting** - Add Prettier/sql-formatter library
10. **Data table pagination** - If large result sets overwhelm UI

### High Effort
11. **Search pinned items** - Filter board by keywords
12. **Export board to PDF** - Generate shareable report
13. **Collaborative boards** - Multi-user editing with conflict resolution
14. **Natural language follow-ups** - "Now group by region"
15. **Query history** - Sidebar showing past 10 queries

---

## Testing Completion Summary

After testing all scenarios, fill out:

1. **Pass/Fail table** in `UX_TEST_REPORT.md`
2. **P0/P1/P2 issues** with repro steps
3. **3-5 concrete recommendations** from quick wins
4. **Screenshots** for each scenario
5. **Overall readiness assessment**

---

**Ready to test? Run:** `./run_ux_test.sh`
