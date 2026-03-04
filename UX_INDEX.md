# UX Testing Complete Guide - Table of Contents

Welcome to the comprehensive UX testing suite for the Dashboard Agent web application.

---

## 🎯 Start Here

### For Quick Testing (20-30 minutes)
1. **Run setup:** `./run_ux_test.sh`
2. **Follow:** `UX_QUICK_REFERENCE.md` (one-page cheat sheet)
3. **Fill out:** `UX_TEST_REPORT.md` (deliverable)
4. **Analyze:** `python3 analyze_ux_report.py` (summary generator)

### For Comprehensive Testing (1-2 hours)
1. **Read strategy:** `UX_TESTING_GUIDELINES.md`
2. **Study code:** `UX_CODE_AWARE_GUIDE.md`
3. **Test thoroughly:** All 6 scenarios + edge cases
4. **Document everything:** `UX_TEST_REPORT.md`

---

## 📚 Document Guide

### 1. **UX_TESTING_SUITE_README.md** (This file's companion)
**Purpose:** High-level overview and getting started guide  
**Read if:** You want to understand the full testing approach  
**Time:** 10 min skim, 30 min deep read  
**Contains:**
- Test scenario overview
- Evaluation dimensions (SQL discoverability, board titles, etc.)
- Quick win recommendations
- Severity guidelines
- Screenshots checklist

---

### 2. **UX_QUICK_REFERENCE.md** ⚡
**Purpose:** One-page printable cheat sheet  
**Read if:** You want to test quickly (20 min)  
**Time:** 2 min read, keep visible while testing  
**Contains:**
- Copy-paste test inputs
- UI element checklist
- Scoring rubrics
- Common issues table
- 20-minute time-boxed flow

**💡 Tip:** Print this or keep in a second monitor

---

### 3. **UX_TESTING_GUIDELINES.md** 📖
**Purpose:** Detailed strategy and evaluation criteria  
**Read if:** You're designing a thorough test plan  
**Time:** 30 min read  
**Contains:**
- Clarity, Discoverability, Feedback, Storytelling, Error Recovery criteria
- Detailed scenario walkthroughs (why each matters)
- UX anti-patterns to watch for
- Quick win ideas (by impact/effort)
- Severity definitions (P0 → P3)

**💡 Tip:** Use this to train other testers or explain findings to stakeholders

---

### 4. **UX_CODE_AWARE_GUIDE.md** 🔧
**Purpose:** Technical deep-dive with component-level testing notes  
**Read if:** You're a developer or want to understand implementation details  
**Time:** 45 min read  
**Contains:**
- Application architecture overview
- Expected UI behavior based on actual code
- Component-specific testing notes (ChatPane, InsightChart, etc.)
- Browser DevTools checklist
- State transition testing
- Implementation-aware recommendations

**💡 Tip:** Reference this when logging bugs to include component names

---

### 5. **UX_TEST_REPORT.md** 📝
**Purpose:** Main deliverable - structured findings template  
**Read if:** You need to fill out the testing report  
**Time:** 10 min to understand format, 20 min to fill out  
**Contains:**
- Scenario checklists (1-6)
- Pass/fail tracking
- Issue tables (P0/P1/P2)
- Cross-cutting observations (SQL discoverability, board titles, latency, state)
- Recommendations section
- Blockers section
- Overall assessment

**💡 Tip:** Fill this out AS YOU TEST, not after

---

### 6. **run_ux_test.sh** 🚀
**Purpose:** Setup verification and helper script  
**Read if:** You need to check if services are running  
**Time:** 1 min to run  
**Does:**
- Checks frontend (localhost:3000)
- Checks backend (localhost:8081/8080)
- Displays testing instructions
- Opens report in editor

**Usage:**
```bash
cd playground
./run_ux_test.sh
```

---

### 7. **analyze_ux_report.py** 🔍
**Purpose:** Parse completed report and generate executive summary  
**Read if:** You've filled out the report and want a summary  
**Time:** Instant (script runs in <1 sec)  
**Does:**
- Counts pass/fail scenarios
- Tallies P0/P1/P2 issues
- Extracts overall assessment
- Generates executive summary
- Saves to `UX_TEST_SUMMARY.txt`

**Usage:**
```bash
python3 analyze_ux_report.py
```

**Output Example:**
```
📊 SCENARIOS: 5/6 passed
🐛 ISSUES FOUND: 7 (P0: 1, P1: 3, P2: 3)
📋 OVERALL ASSESSMENT: Needs Work
🚨 CRITICAL ISSUES: Clear board deletes without confirmation
💡 NEXT STEPS: Fix P0, schedule P1 for next sprint
```

---

## 🗺️ Testing Workflow

```
START
  │
  ├─→ Run ./run_ux_test.sh
  │     └─→ Verify services are running
  │
  ├─→ Open browser in incognito mode
  │     └─→ Navigate to http://localhost:3000
  │     └─→ Open DevTools (F12)
  │
  ├─→ Keep UX_QUICK_REFERENCE.md visible
  │
  ├─→ Test Scenario 1: Narrative-only
  │     ├─→ Input: "hello there"
  │     ├─→ Observe: Agent response, empty state
  │     └─→ Log: Pass/Fail + notes in UX_TEST_REPORT.md
  │
  ├─→ Test Scenario 2: SQL-only
  │     ├─→ Input: "only provide SQL query for top products"
  │     ├─→ Observe: SQL code, copy button
  │     └─→ Log: Pass/Fail + notes
  │
  ├─→ Test Scenario 3: Chart-ready
  │     ├─→ Input: "show top products by revenue"
  │     ├─→ Observe: Chart, tabs, SQL discoverability
  │     ├─→ Take screenshot
  │     └─→ Log: Pass/Fail + notes
  │
  ├─→ Test Scenario 4: Pin-to-board
  │     ├─→ Click: Pin to Board button
  │     ├─→ Observe: Toast, My Board tab
  │     ├─→ Evaluate: Board title quality
  │     └─→ Log: Pass/Fail + notes
  │
  ├─→ Test Scenario 5: Clear board
  │     ├─→ Click: Clear Board button
  │     ├─→ Observe: Confirmation modal
  │     └─→ Log: Pass/Fail + notes
  │
  ├─→ Test Scenario 6: Error handling
  │     ├─→ Test 6a: Empty input
  │     ├─→ Test 6b: Malformed query
  │     ├─→ Test 6c: Fake table
  │     ├─→ Observe: Error messages, retry UX
  │     └─→ Log: Pass/Fail + notes
  │
  ├─→ Fill out UX_TEST_REPORT.md
  │     ├─→ Mark all pass/fail
  │     ├─→ Log 3-5 issues with severity
  │     ├─→ Provide 3 recommendations
  │     └─→ Attach screenshots
  │
  ├─→ Run python3 analyze_ux_report.py
  │     └─→ Generate executive summary
  │
  └─→ DONE
       └─→ Share UX_TEST_REPORT.md with team
```

---

## 🎯 Testing Scenarios Quick Reference

| # | Name | Input | Duration | Key Validation |
|---|------|-------|----------|----------------|
| 1 | Narrative-only | `hello there` | 2 min | Friendly response, no errors |
| 2 | SQL-only | `only provide SQL query...` | 3 min | SQL prominent, copyable |
| 3 | Chart-ready | `show top products by revenue` | 5 min | Chart + SQL + Data tabs |
| 4 | Pin-to-board | (after #3) Click Pin | 3 min | Toast + descriptive title |
| 5 | Clear board | Click Clear Board | 2 min | Confirmation required |
| 6a | Error: Empty | (empty input) | 1 min | Disabled or graceful error |
| 6b | Error: Malformed | `@@@ invalid query` | 2 min | Clear error + suggestions |
| 6c | Error: Fake table | `show data from fake_table_xyz` | 2 min | Table not found + valid list |

**Total:** ~20 minutes active testing

---

## 🔍 Evaluation Dimensions (The "Big 5")

### 1. **SQL Discoverability** (Critical)
**Question:** From a chart, how do you find the SQL?  
**Best:** 1 click via "View SQL" button  
**Good:** 2 clicks via SQL tab  
**Poor:** Must ask agent

### 2. **Board Title Quality** (High)
**Question:** Are auto-generated titles descriptive?  
**Best:** "Top 10 Products by Revenue (Q4 2025)"  
**Good:** "Top Products by Revenue"  
**Poor:** "Chart 1"

### 3. **Latency Communication** (High)
**Question:** Does user know what's happening during waits?  
**Best:** Phase badges + timer + progress bar  
**Good:** Phase badges visible  
**Poor:** Generic spinner only

### 4. **Error Recovery** (Critical)
**Question:** Can users fix mistakes easily?  
**Best:** Clear message + retry + suggestions  
**Good:** Clear message + retry  
**Poor:** Generic error, no recovery

### 5. **Destructive Action Safety** (Critical)
**Question:** Are irreversible actions protected?  
**Best:** Confirmation + undo window  
**Good:** Confirmation required  
**Poor:** One-click delete

---

## 🐛 Severity Levels

### P0 - Critical (Stop everything, fix now)
- Blocks core workflow
- Causes data loss
- Security vulnerability

**Example:** Clear board deletes with no confirmation

---

### P1 - High (Fix in 1-2 sprints)
- Major usability gap
- Affects all users
- Workaround exists but painful

**Example:** SQL not discoverable from chart

---

### P2 - Medium (Fix when convenient)
- Polish issue
- Affects some users
- Minor inconvenience

**Example:** No SQL copy button

---

### P3 - Low (Nice-to-have)
- Enhancement
- Cosmetic improvement

**Example:** Prettier chart colors

---

## 🚀 Quick Wins (Prioritized)

### Sprint 1 (Critical + High Impact)
1. ✅ **SQL copy button** (2 hrs) - Already has syntax highlighting, add copy
2. ✅ **Board title improvement** (4 hrs) - Extract from prompt context
3. ✅ **Confirm clear board** (0 hrs) - Already implemented, verify it works
4. 🔨 **Error message enhancement** (6 hrs) - Translate BigQuery errors

### Sprint 2 (Polish + UX Improvements)
5. ✅ **SQL discoverability button** (0 hrs) - Already implemented, verify visibility
6. ✅ **Pin confirmation toast** (0 hrs) - Already implemented, verify appearance
7. 🔨 **Disable empty input** (1 hr) - Add disabled state to Send button
8. 🔨 **Example prompts** (4 hrs) - Show 3-4 starters on empty canvas

✅ = Already implemented (check it works)  
🔨 = Needs implementation

---

## 📸 Screenshots Checklist

Capture these 12 states:

- [ ] 1. Empty state (before any query)
- [ ] 2. Loading state (phase badges visible)
- [ ] 3. Narrative-only response
- [ ] 4. SQL tab (with syntax highlighting)
- [ ] 5. Visualization tab (with "View SQL" button)
- [ ] 6. Data table tab
- [ ] 7. Pin button (before - blue)
- [ ] 8. Pin button (after - green "Pinned")
- [ ] 9. My Board (with 2-3 items)
- [ ] 10. Clear board confirmation modal
- [ ] 11. Empty board state (after clear)
- [ ] 12. Error state (malformed query)

**Bonus:**
- [ ] 13. DevTools console (JS errors if any)
- [ ] 14. Network tab (API calls)

---

## 📊 Success Criteria

### Minimum (Report is complete when):
- [ ] All 6 scenarios tested (pass or fail documented)
- [ ] At least 3 issues logged with severity
- [ ] At least 3 recommendations provided
- [ ] Overall assessment selected

### Ideal (High-quality report includes):
- [ ] All above + screenshots for each scenario
- [ ] Issues have detailed repro steps
- [ ] Recommendations include implementation notes
- [ ] Cross-cutting observations filled out
- [ ] Blockers documented (if any)

---

## 🔧 Troubleshooting

### "Frontend not loading"
```bash
cd playground/frontend
npm install
npm run dev
```

### "Backend not responding"
```bash
cd playground
source .venv/bin/activate
adk web --port 8081
```

### "Port already in use"
```bash
lsof -ti:3000 | xargs kill -9   # Frontend
lsof -ti:8081 | xargs kill -9   # Backend
```

### "DevTools not showing output"
- Open incognito/private window
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
- Clear site data: DevTools → Application → Clear storage

---

## 📞 Need Help?

### Testing Strategy Questions
→ Read `UX_TESTING_GUIDELINES.md`

### Component/Technical Questions
→ Read `UX_CODE_AWARE_GUIDE.md`

### Quick Reference
→ Read `UX_QUICK_REFERENCE.md`

### Report Format
→ Open `UX_TEST_REPORT.md` (template with examples)

### Setup Issues
→ Run `./run_ux_test.sh` and check output

---

## 🎉 After Testing

1. **Share report** with development team
2. **Create tickets** for P0/P1 issues (one per issue)
3. **Schedule fixes** based on priority matrix
4. **Re-test** after fixes are deployed
5. **Consider user testing** with real users (not just internal QA)
6. **Update docs** if UX patterns change significantly

---

## 📅 Maintenance

This testing suite should be updated when:
- New features are added to the dashboard
- UI components change significantly
- User feedback reveals new usability issues
- Testing methodology evolves

**Last updated:** March 2, 2026  
**Version:** 1.0  
**Maintained by:** Development Team

---

## 📄 File Index

All files are in: `/Users/cesarramos/Desktop/Claude_Code_Projects/gcp-data-agents/playground/`

```
UX Testing Suite Files:
├── UX_TESTING_SUITE_README.md     (Overview & strategy)
├── UX_QUICK_REFERENCE.md          (One-page cheat sheet)
├── UX_TESTING_GUIDELINES.md       (Detailed strategy guide)
├── UX_CODE_AWARE_GUIDE.md         (Technical deep-dive)
├── UX_TEST_REPORT.md              (Deliverable template)
├── UX_INDEX.md                    (This file - navigation)
├── run_ux_test.sh                 (Setup verification script)
└── analyze_ux_report.py           (Report parser & summarizer)

Generated After Testing:
└── UX_TEST_SUMMARY.txt            (Executive summary - auto-generated)
```

---

**Ready to begin?**

```bash
cd playground
./run_ux_test.sh
```

**Happy Testing! 🚀**
