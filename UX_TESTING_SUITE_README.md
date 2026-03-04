# UX Testing Suite - Summary & Usage

## 📦 What's Included

This UX testing suite provides comprehensive guidance for evaluating the Dashboard Agent web application. All files are in the `playground/` directory.

### Core Documents

1. **`UX_TEST_REPORT.md`** (Main deliverable)
   - Structured template for recording findings
   - Pass/fail tables for each scenario
   - P0/P1/P2 issue tracker
   - Recommendations section
   - Screenshots appendix

2. **`UX_TESTING_GUIDELINES.md`** (Strategy guide)
   - Evaluation criteria (Clarity, Discoverability, Feedback, Storytelling, Error Recovery)
   - Detailed scenario walkthroughs
   - Anti-pattern warnings
   - Severity guidelines (P0 → P3)
   - Quick win ideas categorized by impact/effort

3. **`UX_CODE_AWARE_GUIDE.md`** (Technical deep-dive)
   - Component-by-component testing notes
   - Expected UI behavior based on actual code
   - Browser DevTools checklist
   - State transition testing
   - SQL discoverability scoring

4. **`UX_QUICK_REFERENCE.md`** (Cheat sheet)
   - One-page printable reference
   - Copy-paste test inputs
   - UI element checklist
   - 20-minute time-boxed flow
   - Common issue table

5. **`run_ux_test.sh`** (Setup script)
   - Verifies services are running
   - Displays testing instructions
   - Opens report in editor

---

## 🚀 Quick Start (30 Minutes)

### Step 1: Verify Setup (2 min)
```bash
cd playground
./run_ux_test.sh
```

This checks:
- ✅ Frontend running on http://localhost:3000
- ✅ Backend running on http://localhost:8081 (or 8080)

### Step 2: Open Browser (1 min)
- Launch **incognito/private window** (clean state)
- Navigate to **http://localhost:3000**
- Open **DevTools** (F12 / Cmd+Option+I)
- Position console and network tabs for monitoring

### Step 3: Run Test Scenarios (20 min)
Follow `UX_QUICK_REFERENCE.md` for rapid testing:

1. **Narrative-only** (2 min): `hello there`
2. **SQL-only** (3 min): `only provide SQL query for top products by revenue`
3. **Chart-ready** (5 min): `show top products by revenue`
4. **Pin-to-board** (3 min): Click Pin button, verify board
5. **Clear-board** (2 min): Clear all, check confirmation
6. **Error handling** (5 min): Empty input, malformed queries, fake tables

### Step 4: Document Findings (10 min)
Fill out `UX_TEST_REPORT.md`:
- Mark pass/fail for each scenario
- Log 3-5 top issues with repro steps
- Provide 3 concrete recommendations
- Attach screenshots

### Step 5: Review & Share
- Review overall pass/fail assessment
- Share report with team
- Prioritize P0/P1 issues for next sprint

---

## 📋 Test Scenarios Overview

| # | Scenario | Input | Expected Outcome | Key Validation |
|---|----------|-------|------------------|----------------|
| 1 | Narrative-only | `hello there` | Friendly response, no empty viz | Agent provides guidance |
| 2 | SQL-only | `only provide SQL query...` | SQL code with copy button | SQL is prominent, copyable |
| 3 | Chart-ready | `show top products by revenue` | Chart + SQL + Data tabs | All tabs populated |
| 4 | Pin-to-board | (after #3) Click Pin | Toast + board updates | Title is descriptive |
| 5 | Clear-board | Click Clear Board | Confirmation modal | Prevents accidental loss |
| 6a | Error: Empty | (empty) Click Send | Button disabled or error | Graceful handling |
| 6b | Error: Malformed | `@@@ invalid query` | Clear error + suggestions | Helpful guidance |
| 6c | Error: Fake table | `show data from fake_table_xyz` | Table not found + list of valid | Actionable error |

---

## 🎯 Evaluation Dimensions

### 1. **SQL Discoverability** (Critical)
**Question:** From a visualization, how do you find the underlying SQL?

**Best practice:** 
- Button on chart: "View SQL for this visualization"
- SQL tab always visible
- Agent mentions SQL in narrative

**Test:** 
- Generate a chart (Scenario 3)
- Time how long it takes to locate SQL
- Count number of clicks required

**Score:**
- ⭐⭐⭐ 1 click (direct button)
- ⭐⭐ 2 clicks (tab switch)
- ⭐ Must ask agent

---

### 2. **Board Title Quality** (High)
**Question:** Are auto-generated titles descriptive enough to tell a story?

**Best practice:**
- Include metric: "Top Products by Revenue"
- Include context: "Q4 2025" or "Electronics Category"
- Avoid generic: "Chart 1", "Visualization"

**Test:**
- Pin 3 different insights
- Check if titles are unique and descriptive
- Verify titles make sense when viewing board without chat context

**Score:**
- ⭐⭐⭐ Context-rich, storytelling
- ⭐⭐ Descriptive but generic
- ⭐ Numbered or timestamped

---

### 3. **Latency Communication** (High)
**Question:** Does the user know what's happening during waits?

**Best practice:**
- Phase badges: "Understanding", "Querying", "Visualizing"
- Elapsed time counter
- Progress indication for long queries

**Test:**
- Submit query and watch status indicators
- Note if user can distinguish "thinking" from "executing"
- Trigger a slow query (if possible) and verify UI doesn't freeze

**Score:**
- ⭐⭐⭐ Real-time phases + timer + progress
- ⭐⭐ Phase badges visible
- ⭐ Generic spinner only

---

### 4. **Error Recovery** (Critical)
**Question:** Can users fix mistakes without losing context?

**Best practice:**
- Errors in plain English
- Root cause + suggested fix
- Retry button pre-fills last prompt

**Test:**
- Trigger 3 error types (empty, malformed, invalid table)
- Check if errors are actionable
- Verify retry doesn't lose user's input

**Score:**
- ⭐⭐⭐ Helpful message + retry + suggestions
- ⭐⭐ Clear error + retry
- ⭐ Generic error, no recovery

---

### 5. **Destructive Action Safety** (Critical)
**Question:** Are irreversible actions protected by confirmations?

**Best practice:**
- Clear board requires confirmation
- Confirmation explains consequences
- Undo available (grace period)

**Test:**
- Attempt to clear board with pinned items
- Verify modal appears with clear warning
- Check if cancel works as expected

**Score:**
- ⭐⭐⭐ Confirmation + undo window
- ⭐⭐ Confirmation required
- ⭐ One-click destructive action

---

## 🐛 Common UX Anti-Patterns to Watch For

### 1. **Hidden SQL** (P1)
- **Symptom:** Chart is shown but SQL is nowhere to be found
- **Impact:** Power users can't verify/modify queries
- **Fix:** Add "View SQL" button on visualization tab

### 2. **Generic Board Titles** (P1)
- **Symptom:** All pinned items say "Chart 1", "Chart 2", "Visualization"
- **Impact:** Board becomes unreadable with 5+ items
- **Fix:** Extract title from user prompt or agent summary

### 3. **No Loading Feedback** (P0)
- **Symptom:** User clicks, nothing happens for 5+ seconds
- **Impact:** User thinks UI is broken, clicks again
- **Fix:** Show "Querying..." phase badge immediately

### 4. **Raw Error Messages** (P1)
- **Symptom:** BigQuery stack trace shown to user
- **Impact:** User confused, doesn't know how to fix
- **Fix:** Translate technical errors to plain English

### 5. **Destructive Defaults** (P0)
- **Symptom:** Clear board deletes everything with one click
- **Impact:** User loses work permanently
- **Fix:** Add confirmation modal

### 6. **Tab Confusion** (P2)
- **Symptom:** User doesn't know which tab is active
- **Impact:** Clicks around aimlessly
- **Fix:** Increase contrast on active tab highlight

### 7. **Non-Copyable SQL** (P1)
- **Symptom:** SQL shown as plain text, no copy button
- **Impact:** User must manually select entire query
- **Fix:** Add one-click copy button

### 8. **Empty State Confusion** (P2)
- **Symptom:** Blank canvas with no guidance
- **Impact:** User doesn't know what to do next
- **Fix:** Add example prompts or helpful message

---

## 🎯 Quick Win Recommendations (1-2 Sprints)

### Priority 1: Critical Fixes (Sprint 1)
1. **Add SQL copy button** (2 hrs)
   - Component: `InsightSql.tsx`
   - Use clipboard API or library like `react-copy-to-clipboard`

2. **Improve board title generation** (4 hrs)
   - Extract from `currentInsight.title` or user prompt
   - Fallback to agent-generated summary

3. **Add clear board confirmation** (2 hrs)
   - Already implemented in `MyBoardView.tsx` line 10
   - ✅ Verify it works as expected

4. **Enhance error messages** (6 hrs)
   - Catch common BigQuery errors
   - Map to user-friendly explanations
   - Add suggested fixes

### Priority 2: High-Impact Polish (Sprint 1-2)
5. **SQL discoverability button** (3 hrs)
   - Already exists in `ActiveInsightView.tsx` lines 92-100
   - ✅ Verify it's visible and functional

6. **Pin confirmation toast** (1 hr)
   - Already implemented in `ActiveInsightView.tsx` line 32
   - ✅ Verify toast appears

7. **Disable empty input** (1 hr)
   - Add `disabled={!inputValue.trim()}` to Send button

8. **Example prompts on empty state** (4 hrs)
   - Add to canvas empty state message
   - Suggest 3-4 starter queries

### Priority 3: Nice-to-Have (Sprint 2)
9. **Editable board titles** (8 hrs)
   - Add pencil icon to `BoardCard.tsx`
   - Implement inline editing

10. **Undo clear board** (6 hrs)
    - Store last cleared state for 10 seconds
    - Show toast with "Undo" button

11. **Chart type override** (12 hrs)
    - Let user request bar→line conversion
    - Add dropdown on visualization tab

12. **SQL formatting** (4 hrs)
    - Use library like `sql-formatter`
    - Apply consistent indentation

---

## 📊 Severity Guidelines

### P0 - Critical (Fix immediately)
**Definition:** User cannot complete core workflow or data loss occurs

**Examples:**
- ❌ Clear board deletes items with no confirmation or undo
- ❌ Long query freezes UI with no progress indicator
- ❌ Error state clears chat history

**Action:** Stop other work, fix in current sprint

---

### P1 - High (Fix in 1-2 sprints)
**Definition:** Major usability gap affecting all users, workaround exists but painful

**Examples:**
- ⚠️ SQL not discoverable from visualization (must ask agent)
- ⚠️ Generic board titles make board unreadable
- ⚠️ Raw BigQuery errors shown to users

**Action:** Schedule for next sprint

---

### P2 - Medium (Fix when convenient)
**Definition:** Polish issue affecting some users, minor inconvenience

**Examples:**
- 🔵 No copy button on SQL (user can select manually)
- 🔵 Tab highlight is subtle (user can still tell which is active)
- 🔵 No example prompts on empty state

**Action:** Add to backlog, prioritize based on user feedback

---

### P3 - Low (Nice-to-have)
**Definition:** Enhancement or cosmetic improvement

**Examples:**
- 💡 Chart colors could be prettier
- 💡 Board cards could have more metadata
- 💡 Add keyboard shortcuts

**Action:** Consider for future polish sprint

---

## 📸 Screenshot Checklist

Capture the following states for your report:

1. ✅ **Empty state** - Before any interaction
2. ✅ **Loading state** - Phase badges visible (Understanding, Querying, etc.)
3. ✅ **Narrative-only response** - Agent message in chat, empty canvas
4. ✅ **SQL tab** - Code with syntax highlighting
5. ✅ **Visualization tab** - Chart with labels and "View SQL" button
6. ✅ **Data table tab** - Formatted query results
7. ✅ **Pin button states** - Before (blue "Pin to Board") and after (green "Pinned")
8. ✅ **My Board** - Grid with 2-3 pinned items
9. ✅ **Clear board confirmation** - Modal dialog
10. ✅ **Empty board state** - After clearing
11. ✅ **Error states** - Malformed query, fake table, etc.
12. ✅ **Console errors** - DevTools showing any JS errors

---

## 🔧 Troubleshooting

### Frontend not loading
```bash
cd playground/frontend
npm install
npm run dev
```

### Backend not responding
```bash
cd playground
source .venv/bin/activate
adk web --port 8081
```

### Port conflict
```bash
lsof -ti:3000 | xargs kill -9   # Kill frontend
lsof -ti:8081 | xargs kill -9   # Kill backend
```

### Browser cache issues
- Use incognito/private mode
- Or hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

### DevTools not showing console
- F12 to open DevTools
- Click "Console" tab at top
- Check for filter settings (clear any filters)

---

## 📚 Additional Resources

### For Testers
- `UX_QUICK_REFERENCE.md` - One-page cheat sheet
- `UX_TESTING_GUIDELINES.md` - Detailed strategy guide
- `UX_CODE_AWARE_GUIDE.md` - Component-level technical notes

### For Developers
- `CLAUDE.md` - ADK development lessons learned
- `frontend/src/components/copilot/` - UI component source code
- `dashboard_agent/` - Backend agent implementation

### For Stakeholders
- `UX_TEST_REPORT.md` - Fill this out and share with team
- P0/P1 issues table - Prioritize for sprint planning
- Recommendations section - Quick wins for 1-2 sprints

---

## ✅ Definition of Done

**Testing is complete when:**
- [ ] All 6 scenarios attempted (pass or fail documented)
- [ ] Screenshots captured for each scenario
- [ ] At least 3 UX issues logged with severity (P0/P1/P2)
- [ ] At least 3 concrete recommendations provided
- [ ] Blockers documented (if any scenarios couldn't be tested)
- [ ] Overall pass/fail assessment completed
- [ ] Report reviewed and ready to share with team

**Report is ready when:**
- [ ] Pass/fail table filled out
- [ ] Top 3-5 issues have repro steps
- [ ] Each issue has "Expected" vs "Current" behavior
- [ ] Recommendations include implementation sketches or component names
- [ ] Screenshots attached or referenced
- [ ] Overall assessment: Production Ready / Needs Work / Major Issues

---

## 🎉 Next Steps After Testing

1. **Share findings** with development team
2. **Prioritize P0/P1 issues** for next sprint
3. **Create tickets** (one per issue)
4. **Schedule fixes** based on impact/effort matrix
5. **Re-test after fixes** to verify improvements
6. **Consider user testing** with real users (not just internal QA)
7. **Update docs** if UX patterns change

---

## 📞 Questions?

If you need clarification on:
- **Testing strategy** → Read `UX_TESTING_GUIDELINES.md`
- **Component behavior** → Read `UX_CODE_AWARE_GUIDE.md`
- **Quick reference** → Read `UX_QUICK_REFERENCE.md`
- **Setup issues** → Run `./run_ux_test.sh` and check output

---

**Happy Testing! 🚀**

Generated by Claude Agent (Cursor)  
Date: March 2, 2026
