# UX Testing Report - Dashboard Agent
**Test Date:** March 2, 2026  
**Target App:** http://localhost:3000  
**Tester:** _____________________

---

## Test Scenarios Checklist

### Scenario 1: Narrative-Only Prompt
**Test Input:** "hello there"

- [ ] **Step 1:** Navigate to http://localhost:3000
- [ ] **Step 2:** Enter "hello there" in the chat input
- [ ] **Step 3:** Submit the message

**What to observe:**
- [ ] Agent response in chat (friendly? confused? error?)
- [ ] Tab visibility (Active Insight / My Board)
- [ ] Any automatic tab switching
- [ ] Loading states and latency indicators
- [ ] Error messages or guidance for better prompts

**Capture:**
```
Chat response:


Active Insight tab state:


My Board tab state:


Issues observed:


```

---

### Scenario 2: SQL-Only/Partial Prompt
**Test Input:** "only provide SQL query for top products by revenue"

- [ ] **Step 1:** Clear previous conversation or refresh page
- [ ] **Step 2:** Enter SQL-only request
- [ ] **Step 3:** Submit and observe response

**What to observe:**
- [ ] Does agent provide raw SQL?
- [ ] Is SQL displayed in chat vs SQL tab?
- [ ] Can user copy SQL easily?
- [ ] Are there "Run Query" or "Visualize" CTAs?
- [ ] How does Active Insight handle SQL-only mode?

**Capture:**
```
Chat response:


SQL tab content:


Data tab content:


Visualization tab content:


Issues observed:


```

---

### Scenario 3: Chart-Ready Prompt
**Test Input:** "show top products by revenue"

- [ ] **Step 1:** Clear/refresh
- [ ] **Step 2:** Enter chart-ready prompt
- [ ] **Step 3:** Submit and wait for complete response

**What to observe:**
- [ ] Loading indicators during query execution
- [ ] Chart appears automatically?
- [ ] Chart type appropriate? (bar/line/pie)
- [ ] Can user see SQL that generated the chart?
- [ ] Data tab shows raw query results?
- [ ] Chart interactions (hover, zoom, export)?

**Capture:**
```
Chat response:


Visualization rendered:
(describe chart type, axes, labels, colors)


SQL discoverability:
(where is SQL? how many clicks to find it?)


Data preview quality:


Issues observed:


```

---

### Scenario 4: Pin-to-Board Flow
**Test from Active Insight:**

- [ ] **Step 1:** Generate a chart from Scenario 3
- [ ] **Step 2:** Locate "Pin to Board" or "Save" button
- [ ] **Step 3:** Click pin/save
- [ ] **Step 4:** Check if title is auto-generated or editable
- [ ] **Step 5:** Navigate to "My Board" tab
- [ ] **Step 6:** Verify pinned item appears

**What to observe:**
- [ ] Pin button visibility and placement
- [ ] Any confirmation modal or toast?
- [ ] Board title quality (descriptive? generic?)
- [ ] Pinned chart preserves formatting?
- [ ] Can user reorder/edit on board?

**Capture:**
```
Pin button location:


Title generated:


My Board shows:


Issues observed:


```

---

### Scenario 5: Clear-Board Flow
**Test in My Board:**

- [ ] **Step 1:** Navigate to "My Board" tab (should have pinned items)
- [ ] **Step 2:** Locate "Clear Board" or trash icon
- [ ] **Step 3:** Attempt to clear board
- [ ] **Step 4:** Observe confirmation dialog (if any)
- [ ] **Step 5:** Verify board is cleared

**What to observe:**
- [ ] Clear action visibility
- [ ] Confirmation required? (prevents accidental loss)
- [ ] Undo available?
- [ ] Empty state messaging after clear

**Capture:**
```
Clear action location:


Confirmation behavior:


Empty state message:


Issues observed:


```

---

### Scenario 6: Error Handling & Retry UX
**Test Inputs:** 
- Empty submission
- Malformed query: "show me @@@ invalid"
- Unavailable dataset reference

- [ ] **Step 1:** Submit empty message
- [ ] **Step 2:** Submit malformed prompt
- [ ] **Step 3:** Submit query for non-existent table

**What to observe:**
- [ ] Error messages clear and actionable?
- [ ] Retry button available?
- [ ] Does retry pre-fill last prompt?
- [ ] Error styling (inline? modal? toast?)
- [ ] Suggested fixes or examples?

**Capture:**
```
Empty input behavior:


Malformed query response:


Non-existent table response:


Retry UX quality:


Issues observed:


```

---

## UX Issues Summary

### P0 - Critical (Blocks Core Workflow)
| Issue | Repro Steps | Expected Behavior | Current Behavior | Suggested Fix |
|-------|-------------|-------------------|------------------|---------------|
| 1.    |             |                   |                  |               |
| 2.    |             |                   |                  |               |

### P1 - High (Major Usability Gap)
| Issue | Repro Steps | Expected Behavior | Current Behavior | Suggested Fix |
|-------|-------------|-------------------|------------------|---------------|
| 1.    |             |                   |                  |               |
| 2.    |             |                   |                  |               |

### P2 - Medium (Polish & Improvements)
| Issue | Repro Steps | Expected Behavior | Current Behavior | Suggested Fix |
|-------|-------------|-------------------|------------------|---------------|
| 1.    |             |                   |                  |               |
| 2.    |             |                   |                  |               |

---

## Cross-Cutting Observations

### SQL Discoverability
**Rating:** ☐ Excellent  ☐ Good  ☐ Needs Work  ☐ Poor

**Notes:**
```
From visualization context, how many clicks/tabs to see SQL?
Is it obvious where to find the query?
```

### Board Title Quality
**Rating:** ☐ Excellent  ☐ Good  ☐ Needs Work  ☐ Poor

**Notes:**
```
Are auto-generated titles descriptive?
Do they tell a story or just repeat chart type?
```

### Latency Communication
**Rating:** ☐ Excellent  ☐ Good  ☐ Needs Work  ☐ Poor

**Notes:**
```
Are loading states clear?
Does user know if agent is thinking vs executing query?
Spinners, progress bars, status messages?
```

### State Transitions
**Rating:** ☐ Excellent  ☐ Good  ☐ Needs Work  ☐ Poor

**Notes:**
```
Do tabs switch automatically (confusing)?
Is active tab highlighted clearly?
Can user return to previous state easily?
```

---

## Recommendations for 1-2 Sprint Quick Wins

### Recommendation 1: [Title]
**Impact:** High | Medium | Low  
**Effort:** Small | Medium | Large

**Description:**


**Implementation sketch:**
```
(pseudo-code or component changes)
```

### Recommendation 2: [Title]
**Impact:** High | Medium | Low  
**Effort:** Small | Medium | Large

**Description:**


**Implementation sketch:**
```
(pseudo-code or component changes)
```

### Recommendation 3: [Title]
**Impact:** High | Medium | Low  
**Effort:** Small | Medium | Large

**Description:**


**Implementation sketch:**
```
(pseudo-code or component changes)
```

---

## Blockers Encountered
**List any scenarios that couldn't be tested and why:**

1. ☐ Scenario blocked:  
   **Reason:**

2. ☐ Scenario blocked:  
   **Reason:**

---

## Overall Pass/Fail Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Narrative-only | ☐ Pass ☐ Fail | |
| 2. SQL-only | ☐ Pass ☐ Fail | |
| 3. Chart-ready | ☐ Pass ☐ Fail | |
| 4. Pin-to-board | ☐ Pass ☐ Fail | |
| 5. Clear-board | ☐ Pass ☐ Fail | |
| 6. Error/retry | ☐ Pass ☐ Fail | |

**Overall Assessment:** ☐ Production Ready  ☐ Needs Work  ☐ Major Issues

---

## Appendix: Screenshots
*Attach screenshots for each scenario showing:*
- Chat state
- Active Insight tabs (Visualization, Data, SQL)
- My Board view
- Error states
