# UX Testing Guidelines - Dashboard Agent

## Pre-Test Setup

### Environment Check
```bash
# Ensure app is running
curl http://localhost:3000

# Check backend/agent is accessible
# (adjust port if your ADK agent runs elsewhere)
curl http://localhost:8080/health || echo "ADK agent may be on different port"
```

### Browser Setup
1. Open Chrome/Firefox in private/incognito mode (clean state)
2. Open DevTools (F12)
3. Enable Network tab to monitor API calls
4. Enable Console to catch JS errors

---

## UX Evaluation Criteria

### 1. **Clarity** - Can the user understand what's happening?
- [ ] Agent responses are in plain English
- [ ] Loading states show progress (not just spinning)
- [ ] Error messages explain what went wrong AND how to fix it
- [ ] Chart labels/axes are readable and meaningful

### 2. **Discoverability** - Can the user find what they need?
- [ ] SQL is accessible from visualization context (< 2 clicks)
- [ ] Data preview is obvious when chart is shown
- [ ] Pin/Save buttons are visible without scrolling
- [ ] Tab labels clearly indicate content

### 3. **Feedback** - Does the system respond to user actions?
- [ ] Buttons show hover/active states
- [ ] Submit triggers immediate loading indicator
- [ ] Pin action shows confirmation (toast/badge)
- [ ] Clear board requires confirmation (prevent accidents)

### 4. **Storytelling** - Do boards tell a cohesive story?
- [ ] Auto-generated titles are descriptive, not generic
  - BAD: "Chart 1", "Visualization"
  - GOOD: "Top 10 Products by Revenue (Q4 2025)"
- [ ] Board layout supports narrative flow
- [ ] User can add context/notes to pinned items

### 5. **Error Recovery** - Can users fix mistakes?
- [ ] Retry button pre-fills last prompt
- [ ] Undo available for destructive actions
- [ ] Error state doesn't lose user's work
- [ ] Suggested fixes are actionable

---

## Detailed Testing Notes

### Scenario 1: Narrative-Only
**Why this matters:** Users may start with exploration before knowing what to ask.

**Good UX:**
- Agent acknowledges greeting and offers guidance
- Suggests example queries
- Doesn't show empty visualization tabs

**Bad UX:**
- Agent tries to generate SQL from "hello there"
- Shows error or confusion
- Tabs switch to empty states

**Look for:**
- Does the agent have a "conversational fallback" mode?
- Are example prompts discoverable?

---

### Scenario 2: SQL-Only Request
**Why this matters:** Power users may want raw queries without visualizations.

**Good UX:**
- SQL displayed prominently in chat or SQL tab
- Syntax highlighting applied
- Copy button available
- Option to "Execute & Visualize" offered

**Bad UX:**
- SQL buried in prose explanation
- User must manually copy from plain text
- No way to run the SQL from UI

**Look for:**
- Is there a "code block" treatment for SQL?
- Can user switch from SQL mode to chart mode?

---

### Scenario 3: Chart-Ready Prompt
**Why this matters:** This is the core happy path.

**Good UX:**
- Chart appears within 3-5 seconds
- Type is appropriate for data (bar for categories, line for time series)
- SQL and Data tabs auto-populate
- User can toggle between views seamlessly

**Bad UX:**
- Long wait with no progress indicator
- Chart type mismatch (pie chart for 50 categories)
- SQL not accessible without re-prompting
- Data tab shows raw JSON instead of table

**Look for:**
- Does the agent explain its chart choice?
- Can user request a different chart type in follow-up?

---

### Scenario 4: Pin-to-Board
**Why this matters:** Boards are the "output artifact" users share.

**Good UX:**
- Pin button is visible in Active Insight card
- Title is auto-generated from prompt context
- User can edit title before/after pinning
- Board updates immediately (no refresh needed)

**Bad UX:**
- Pin button only appears on hover (mobile fail)
- Generic title: "Chart 1"
- No confirmation that pin succeeded
- Board doesn't update until page refresh

**Look for:**
- Does pinned item preserve all context (SQL, data, chart)?
- Can user rearrange board items?

---

### Scenario 5: Clear Board
**Why this matters:** Destructive actions need safeguards.

**Good UX:**
- Clear action is available but not too prominent
- Confirmation modal: "Are you sure? This cannot be undone."
- Alternative: "Archive board" instead of delete
- Empty state provides next-action guidance

**Bad UX:**
- One-click clear with no confirmation
- No way to recover cleared items
- Empty board shows blank screen with no guidance

**Look for:**
- Is there undo/restore functionality?
- Does empty state encourage starting fresh?

---

### Scenario 6: Error & Retry
**Why this matters:** Errors are part of the user journey.

**Good UX:**
- Error message explains root cause:
  - "Table 'products' not found. Available tables: customers, orders, inventory"
- Retry button pre-fills last prompt for editing
- Agent suggests corrections:
  - "Did you mean 'SELECT * FROM orders'?"

**Bad UX:**
- Generic error: "Something went wrong"
- Stack trace shown to user
- No retry option (user must retype)
- Error state clears chat history

**Look for:**
- Does agent handle malformed SQL gracefully?
- Are BigQuery errors translated to user-friendly language?

---

## Common UX Anti-Patterns to Watch For

### 1. **Modal Confusion**
- Multiple modes (chat vs SQL vs viz) without clear indication of active mode
- User action in one mode doesn't reflect in others

### 2. **Hidden SQL**
- Chart shown but SQL requires drilling into menus
- No indication that SQL even exists

### 3. **Generic Titles**
- "Visualization 1", "Chart 2" instead of descriptive names
- User must manually rename every board item

### 4. **Latency Anxiety**
- Long-running queries with no progress indicator
- User doesn't know if system is hung or working

### 5. **Tab Overload**
- Too many tabs (Insight, Viz, Data, SQL, Logs, Settings...)
- User gets lost switching between them

### 6. **Destructive Defaults**
- Clear/delete actions too easy to trigger
- No confirmation for irreversible actions

---

## Quick Win Ideas (for Report Recommendations)

### High Impact, Low Effort
1. **Add SQL syntax highlighting** - Use Prism.js or similar
2. **Copy button for SQL blocks** - One-click copy
3. **Loading messages** - "Executing query...", "Generating chart..."
4. **Pin confirmation toast** - "Added to My Board ✓"
5. **Example prompts** - Show 3 starter queries on empty state

### Medium Impact, Medium Effort
6. **Editable board titles** - Click to rename
7. **Chart type selector** - Let user override agent's choice
8. **Undo for clear board** - 10-second grace period
9. **Error recovery prompts** - Suggest fixes for common errors
10. **Data preview table** - Formatted table instead of JSON dump

### High Impact, High Effort
11. **Conversational memory** - "Show me the same data as last time"
12. **Multi-chart boards** - Pin multiple insights side-by-side
13. **Export board to PDF** - Share-ready reports
14. **Natural language follow-ups** - "Now break it down by region"
15. **Collaborative boards** - Multi-user editing

---

## Severity Guidelines

### P0 - Critical
- User cannot complete core workflow
- Data loss occurs
- Security vulnerability
- **Example:** Clear board deletes items with no undo

### P1 - High
- Major usability gap affecting all users
- Workaround exists but painful
- **Example:** SQL not discoverable from chart view

### P2 - Medium
- Polish issue affecting some users
- Minor inconvenience
- **Example:** Board titles are generic but user can rename

### P3 - Low
- Nice-to-have improvement
- Cosmetic issue
- **Example:** Chart colors could be prettier

---

## Test Completion Checklist

- [ ] All 6 scenarios attempted
- [ ] Screenshots captured for each scenario
- [ ] UX issues logged with severity
- [ ] At least 3 concrete recommendations provided
- [ ] Blockers documented (if any)
- [ ] Overall pass/fail assessment completed
- [ ] Report reviewed and ready to share

---

## Next Steps After Testing

1. **Review findings with team** - Prioritize issues
2. **Create tickets** - One per P0/P1 issue
3. **Schedule fixes** - Aim for quick wins in next sprint
4. **Re-test after fixes** - Verify improvements
5. **Consider user testing** - Validate with real users

---

**Happy Testing! 🚀**
