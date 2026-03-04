# UX Testing Flow - Visual Guide

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     UX TESTING SUITE - COMPLETE WORKFLOW                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: SETUP & PREPARATION                                     [5 minutes] │
└─────────────────────────────────────────────────────────────────────────────┘

    1. Read DELIVERY_SUMMARY.md
       └─→ Understand what's been created
       
    2. Run ./run_ux_test.sh
       ├─→ ✓ Checks frontend (localhost:3000)
       ├─→ ✓ Checks backend (localhost:8081)
       └─→ Opens UX_TEST_REPORT.md in editor
       
    3. Open Browser
       ├─→ Incognito/Private mode
       ├─→ Navigate to http://localhost:3000
       └─→ DevTools (F12) → Console + Network tabs
       
    4. Position Windows
       ├─→ Browser (left half)
       └─→ UX_QUICK_REFERENCE.md (right half)


┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ACTIVE TESTING                                        [20 minutes]  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────┐
    │ SCENARIO 1: Narrative-Only        [2 min]  │
    └────────────────────────────────────────────┘
         Input: "hello there"
         ├─→ Observe: Agent response in chat
         ├─→ Check: Canvas shows helpful message
         ├─→ Verify: No empty viz tabs
         └─→ LOG in UX_TEST_REPORT.md: Pass/Fail + notes
         
    ┌────────────────────────────────────────────┐
    │ SCENARIO 2: SQL-Only              [3 min]  │
    └────────────────────────────────────────────┘
         Input: "only provide SQL query for top products by revenue"
         ├─→ Observe: SQL displayed in chat or SQL tab
         ├─→ Check: Syntax highlighting applied
         ├─→ Look for: Copy button (test it)
         └─→ LOG: SQL discoverability score + notes
         
    ┌────────────────────────────────────────────┐
    │ SCENARIO 3: Chart-Ready           [5 min]  │
    └────────────────────────────────────────────┘
         Input: "show top products by revenue"
         ├─→ Watch: Phase badges (Understanding → Querying → Visualizing)
         ├─→ Wait: Chart appears (note elapsed time)
         ├─→ Explore ALL tabs:
         │   ├─→ Insight: Narrative summary
         │   ├─→ Visualization: Chart (check labels, hover)
         │   ├─→ Data Table: Query results (formatted?)
         │   └─→ SQL Code: Query (copyable?)
         ├─→ Test: "View SQL for this visualization" button
         ├─→ SCREENSHOT: Visualization tab
         └─→ LOG: Chart quality + SQL discoverability
         
    ┌────────────────────────────────────────────┐
    │ SCENARIO 4: Pin-to-Board          [3 min]  │
    └────────────────────────────────────────────┘
         Action: Click "Pin to Board" button
         ├─→ Observe: Button changes to green "Pinned"
         ├─→ Check: Toast notification appears
         ├─→ Switch to: My Board tab
         ├─→ Verify: New card appears
         ├─→ Evaluate: Board title quality
         │   ├─→ Good: "Top 10 Products by Revenue (Q4)"
         │   └─→ Bad: "Chart 1" or "Visualization"
         ├─→ SCREENSHOT: My Board with pinned item
         └─→ LOG: Title quality + pin UX
         
    ┌────────────────────────────────────────────┐
    │ SCENARIO 5: Clear Board           [2 min]  │
    └────────────────────────────────────────────┘
         Action: Click "Clear Board" button
         ├─→ Check: Confirmation modal appears
         ├─→ Verify: Warning about "cannot be undone"
         ├─→ Test: Cancel button (keeps items)
         ├─→ Test: Confirm button (clears items)
         ├─→ Check: Empty state message appears
         ├─→ SCREENSHOT: Confirmation modal
         └─→ LOG: Confirmation quality + empty state
         
    ┌────────────────────────────────────────────┐
    │ SCENARIO 6: Error Handling        [5 min]  │
    └────────────────────────────────────────────┘
         Test 6a: Empty Input
         ├─→ Leave textarea empty, click Send
         └─→ Check: Button disabled OR friendly error
         
         Test 6b: Malformed Query
         ├─→ Input: "show me @@@ invalid query ###"
         ├─→ Observe: Error message quality
         ├─→ Check: Plain English (not stack trace)
         ├─→ Look for: Suggested fixes
         └─→ Verify: Retry button available
         
         Test 6c: Fake Table
         ├─→ Input: "show data from fake_table_xyz"
         ├─→ Check: "Table not found" message
         ├─→ Look for: List of available tables
         └─→ Verify: Retry pre-fills last prompt
         
         SCREENSHOT: Error state
         LOG: Error quality + recovery UX


┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: DOCUMENTATION                                         [10 minutes]  │
└─────────────────────────────────────────────────────────────────────────────┘

    Fill out UX_TEST_REPORT.md:
    
    ├─→ Section 1: Scenario Checklists
    │   └─→ Mark all pass/fail checkboxes
    │
    ├─→ Section 2: Issue Tables
    │   ├─→ P0 Critical: Data loss, blocked workflows
    │   ├─→ P1 High: Major usability gaps
    │   └─→ P2 Medium: Polish issues
    │
    ├─→ Section 3: Cross-Cutting Observations
    │   ├─→ SQL Discoverability: Rate Excellent/Good/Poor
    │   ├─→ Board Title Quality: Rate + notes
    │   ├─→ Latency Communication: Rate + notes
    │   └─→ State Transitions: Rate + notes
    │
    ├─→ Section 4: Recommendations (3-5 quick wins)
    │   ├─→ Title
    │   ├─→ Impact/Effort scoring
    │   └─→ Implementation sketch
    │
    └─→ Section 5: Overall Assessment
        └─→ Choose: Production Ready / Needs Work / Major Issues


┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: ANALYSIS & SHARING                                     [5 minutes]  │
└─────────────────────────────────────────────────────────────────────────────┘

    1. Run: python3 analyze_ux_report.py
       ├─→ Generates: UX_TEST_SUMMARY.txt
       ├─→ Shows: Scenario pass/fail count
       ├─→ Shows: Issue tally (P0/P1/P2)
       ├─→ Shows: Overall assessment
       └─→ Lists: Next steps
       
    2. Review Summary
       └─→ Verify all issues captured
       
    3. Share with Team
       ├─→ Email: UX_TEST_REPORT.md + UX_TEST_SUMMARY.txt
       ├─→ Attach: Screenshots
       └─→ Schedule: Review meeting
       
    4. Create Tickets
       ├─→ P0 issues → URGENT sprint
       ├─→ P1 issues → Next sprint
       └─→ P2 issues → Backlog


╔══════════════════════════════════════════════════════════════════════════════╗
║                            EVALUATION MATRIX                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Dimension               │ ⭐⭐⭐   │ ⭐⭐     │ ⭐       │ ❌       │
│                         │ Excellent│ Good     │ Poor     │ Broken   │
├─────────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ SQL Discoverability     │ 1 click  │ 2 clicks │ Ask agent│ Hidden   │
│ Board Title Quality     │ Descrip- │ Generic  │ "Chart 1"│ No title │
│                         │ tive + Δ │ but OK   │          │          │
│ Latency Communication   │ Phases + │ Phases   │ Spinner  │ Frozen   │
│                         │ timer    │ only     │ only     │          │
│ Error Recovery          │ Clear +  │ Clear +  │ Generic  │ No retry │
│                         │ retry +  │ retry    │ error    │          │
│                         │ hints    │          │          │          │
│ Destructive Safety      │ Confirm +│ Confirm  │ One-click│ Instant  │
│                         │ undo     │ only     │          │ delete   │
└─────────────────────────┴──────────┴──────────┴──────────┴──────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                            SEVERITY GUIDE                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

    🔴 P0 - CRITICAL
    ├─→ Definition: Blocks core workflow, data loss, security issue
    ├─→ Examples:
    │   • Clear board deletes without confirmation
    │   • Long query freezes UI indefinitely
    │   • Error state loses chat history
    └─→ Action: STOP - Fix immediately

    🟠 P1 - HIGH
    ├─→ Definition: Major usability gap, all users affected
    ├─→ Examples:
    │   • SQL not discoverable from chart
    │   • Generic board titles make board unreadable
    │   • Raw BigQuery errors shown to users
    └─→ Action: Schedule for next sprint (1-2 weeks)

    🟡 P2 - MEDIUM
    ├─→ Definition: Polish issue, minor inconvenience
    ├─→ Examples:
    │   • No copy button on SQL (can select manually)
    │   • Tab highlight is subtle
    │   • No example prompts on empty state
    └─→ Action: Add to backlog, fix when convenient

    🔵 P3 - LOW
    ├─→ Definition: Nice-to-have enhancement
    ├─→ Examples:
    │   • Chart colors could be prettier
    │   • Add keyboard shortcuts
    │   • More metadata on board cards
    └─→ Action: Consider for future polish sprint


╔══════════════════════════════════════════════════════════════════════════════╗
║                        DOCUMENT QUICK REFERENCE                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

    📄 DELIVERY_SUMMARY.md        → Start here! What's been created
    📄 UX_INDEX.md                → Navigation hub for all docs
    📄 UX_QUICK_REFERENCE.md      → One-page testing cheat sheet
    📄 UX_TESTING_GUIDELINES.md   → Detailed strategy & methodology
    📄 UX_CODE_AWARE_GUIDE.md     → Technical component-level guide
    📄 UX_TESTING_SUITE_README.md → Overview & quick wins
    📄 UX_TEST_REPORT.md          → MAIN DELIVERABLE (fill this out)
    🛠️  run_ux_test.sh             → Setup verification script
    🛠️  analyze_ux_report.py       → Report parser & summarizer


╔══════════════════════════════════════════════════════════════════════════════╗
║                           QUICK START (3 STEPS)                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

    1️⃣  SETUP (2 min)
        $ cd playground
        $ ./run_ux_test.sh
        
    2️⃣  TEST (20 min)
        • Follow UX_QUICK_REFERENCE.md
        • Test all 6 scenarios
        • Fill UX_TEST_REPORT.md as you go
        
    3️⃣  ANALYZE (1 min)
        $ python3 analyze_ux_report.py
        • Share UX_TEST_REPORT.md with team


╔══════════════════════════════════════════════════════════════════════════════╗
║                              TIME BUDGET                                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

    QUICK TEST (30 min total):
    ├─→ Setup: 5 min
    ├─→ Testing: 20 min (all scenarios)
    └─→ Documentation: 5 min (fill report)
    
    COMPREHENSIVE TEST (90 min total):
    ├─→ Preparation: 15 min (read guidelines)
    ├─→ Testing: 45 min (thorough exploration)
    ├─→ Documentation: 20 min (detailed notes)
    └─→ Analysis: 10 min (generate summary, create tickets)


╔══════════════════════════════════════════════════════════════════════════════╗
║                         SUCCESS CHECKLIST                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

    BEFORE STARTING:
    ☐ Frontend running (localhost:3000)
    ☐ Backend running (localhost:8081)
    ☐ Browser in incognito mode
    ☐ DevTools open (Console + Network)
    ☐ UX_QUICK_REFERENCE.md visible
    ☐ UX_TEST_REPORT.md open for notes
    
    DURING TESTING:
    ☐ Test all 6 scenarios
    ☐ Capture 12 screenshots
    ☐ Monitor Console for JS errors
    ☐ Monitor Network for API failures
    ☐ Fill report as you go (don't wait until end)
    
    AFTER TESTING:
    ☐ All scenarios marked pass/fail
    ☐ 3-5 issues logged with severity
    ☐ 3+ recommendations provided
    ☐ Overall assessment selected
    ☐ Report analyzed with Python script
    ☐ Summary shared with team
    ☐ Tickets created for P0/P1 issues


╔══════════════════════════════════════════════════════════════════════════════╗
║                    TROUBLESHOOTING QUICK FIXES                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

    Frontend won't load:
    $ cd playground/frontend && npm install && npm run dev
    
    Backend won't respond:
    $ cd playground && source .venv/bin/activate && adk web --port 8081
    
    Port already in use:
    $ lsof -ti:3000 | xargs kill -9   # Frontend
    $ lsof -ti:8081 | xargs kill -9   # Backend
    
    Browser cache issues:
    → Use incognito/private mode
    → Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)


╔══════════════════════════════════════════════════════════════════════════════╗
║                               SUPPORT                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

    Need help?
    
    ├─→ Testing strategy → UX_TESTING_GUIDELINES.md
    ├─→ Technical details → UX_CODE_AWARE_GUIDE.md
    ├─→ Quick answers → UX_QUICK_REFERENCE.md
    ├─→ Navigation → UX_INDEX.md
    └─→ Overview → DELIVERY_SUMMARY.md


═══════════════════════════════════════════════════════════════════════════════

                              READY TO START?

                         $ ./run_ux_test.sh

═══════════════════════════════════════════════════════════════════════════════
```
