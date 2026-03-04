# UX Testing Quick Reference Card

Print or keep this visible while testing → http://localhost:3000

---

## ⚡ Test Inputs (Copy-Paste Ready)

```
1. hello there
2. only provide SQL query for top products by revenue
3. show top products by revenue
4. (after #3) → Click Pin button
5. (in My Board) → Click Clear Board
6a. (empty input) → Click Send
6b. show me @@@ invalid query ###
6c. show data from fake_table_xyz
```

---

## 🎯 UI Elements Checklist

### Left Sidebar (Chat)
- [ ] Textarea expands for long input
- [ ] Send button (blue, paper plane icon)
- [ ] Message history scrolls
- [ ] Agent messages vs user messages distinguishable

### Top Tabs (Canvas Header)
- [ ] **Active Insight** (lightbulb) - highlighted when active
- [ ] **My Board** (grid) - highlighted when active
- [ ] Status badges (top-right):
  - Phase: Understanding/Querying/Visualizing/Finalizing
  - Response type: Message only / Insight ready
  - Elapsed time: e.g. "3s"

### Active Insight Sub-Tabs
- [ ] **Insight** (document icon) - narrative
- [ ] **Visualization** (chart icon) - graph
- [ ] **Data Table** (table icon) - rows
- [ ] **SQL Code** (code icon) - query
- [ ] **Pin to Board** button (blue) → turns green "Pinned"

### Visualization Tab Extras
- [ ] "View SQL for this visualization" link (below chart)
- [ ] Chart has labels, axes, legend
- [ ] Hover tooltips work

### My Board Tab
- [ ] Grid layout (3 columns)
- [ ] "Clear Board" button (red, top-right)
- [ ] Each card shows title + mini preview
- [ ] Empty state: "No pinned insights yet..."

---

## 🔍 What to Look For

### ✅ Good UX
- Phase badges update in real-time
- Toast appears when pinning
- SQL has syntax highlighting + copy button
- Confirmation modal before clearing board
- Error messages suggest fixes
- Titles are descriptive, not generic

### ❌ Bad UX
- Long wait with no feedback
- SQL buried in prose
- Generic titles: "Chart 1"
- One-click destructive actions
- Stack traces shown to user
- Empty tabs without explanation

---

## 📊 Scoring Guide

**SQL Discoverability:**
- ⭐⭐⭐ Excellent: "View SQL" button + tab (1 click)
- ⭐⭐ Good: SQL tab visible (2 clicks)
- ⭐ Poor: Must ask agent for SQL

**Board Titles:**
- ⭐⭐⭐ "Top 10 Products by Revenue (Q4 2025)"
- ⭐⭐ "Top Products by Revenue"
- ⭐ "Chart 1" or "Visualization"

**Latency Communication:**
- ⭐⭐⭐ Phase badges + elapsed time + progress bar
- ⭐⭐ Phase badges visible
- ⭐ Generic spinner, no context

**Error Recovery:**
- ⭐⭐⭐ Clear message + suggested fixes + retry button
- ⭐⭐ Clear message + retry
- ⭐ Generic error, no guidance

---

## 🎬 Scenario Flow (1-minute version)

1. **Type:** `hello there` → **Expect:** Friendly agent response, no empty tabs
2. **Type:** `only provide SQL query for top products by revenue` → **Expect:** SQL code with copy button
3. **Type:** `show top products by revenue` → **Expect:** Chart appears, SQL/Data tabs filled
4. **Click:** Pin to Board → **Expect:** Toast + green "Pinned" button
5. **Switch to:** My Board tab → **Expect:** Pinned card with descriptive title
6. **Click:** Clear Board → **Expect:** Confirmation modal → Empty state
7. **Type:** `@@@` → **Expect:** Error with helpful message + retry option

---

## 🐛 Common Issues (screenshot if found)

| Issue | Severity | Repro |
|-------|----------|-------|
| Empty input sends request | P1 | Click Send with empty textarea |
| SQL not copyable | P1 | Go to SQL tab, no copy button |
| Generic board titles | P1 | Pin 2 charts, both say "Chart 1" |
| No pin confirmation | P2 | Click Pin, no toast appears |
| Long query freezes UI | P0 | Complex query, no progress shown |
| Clear board has no confirm | P0 | One-click clears all data |
| Chart has no labels | P1 | Visualization shows unlabeled axes |
| Error shows stack trace | P1 | Trigger error, see technical details |

---

## 📸 Screenshots to Capture

1. **Empty state** (before any query)
2. **Loading state** (phase badges visible)
3. **Chart view** (with "View SQL" button)
4. **SQL tab** (with syntax highlighting)
5. **Pin button** (before and after pinning)
6. **My Board** (with 2-3 pinned items)
7. **Empty board state** (after clearing)
8. **Error state** (malformed query)

---

## ⏱️ Time Budget

- Scenario 1: 2 min
- Scenario 2: 3 min
- Scenario 3: 5 min (includes exploring tabs)
- Scenario 4: 3 min (pin + verify)
- Scenario 5: 2 min (clear + verify)
- Scenario 6: 5 min (3 error cases)
- **Total:** ~20 min active testing + 10 min note-taking = **30 min**

---

## 📝 Report Location

Fill out: `UX_TEST_REPORT.md`  
Read details: `UX_CODE_AWARE_GUIDE.md`  
Guidelines: `UX_TESTING_GUIDELINES.md`

---

## 💡 Quick Notes Template

```
SCENARIO X: [name]
✅ Works as expected
❌ Issue: [brief description]
📷 Screenshot: [filename]
---
```

---

**Happy Testing!** 🚀  
Questions? Check `UX_CODE_AWARE_GUIDE.md` for component-level details.
