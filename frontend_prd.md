Product Requirements Document (PRD): Enterprise Data Copilot (Frontend)

1. Overview

Objective: Build a modern, split-pane "Generative BI" frontend interface. The application acts as an AI Data Copilot where business users can ask natural language questions in a chat interface (left pane) and instantly view generated charts, raw data, and SQL in a dynamic canvas (right pane).
Context: The backend "Text2SQL Data Agent" already exists. This PRD is strictly for the frontend application which will run locally (macOS compatible) and connect to the existing backend via REST APIs. We are applying this to an EXISTING frontend repository.

2. Tech Stack Requirements

Framework: Next.js (React) - App Router preferred.

Styling: Tailwind CSS.

Icons: Lucide React (or FontAwesome).

Charting: Recharts (preferred for React compatibility) or Chart.js.

State Management: React Context or Zustand (to manage the shared state between Chat and Canvas).

Code Highlighting: Prism.js or react-syntax-highlighter (for displaying SQL).

3. Global State Architecture

To ensure the Chat and Canvas stay in sync, the global state must track:

chatHistory: Array of message objects { role: 'user'|'agent', content: string, status: 'loading'|'done', insightData?: Object }.

currentInsight: The currently active data object to display in the Canvas (contains SQL, raw data rows, and chart configuration).

mainMode: Enum ['insight', 'board']. Controls whether the right pane shows the Active Insight or the Pinned Dashboard.

pinnedBoardItems: Array of insights that the user has saved to "My Board".

4. UI/UX Layout

The application is a full-screen, unscrollable layout (h-screen overflow-hidden) divided into two main panes:

Left Pane (Chat): Fixed width (e.g., 400px), contains header, scrollable message history, and bottom input field.

Right Pane (Dynamic Canvas): Fills remaining width. Toggles between two views: "Active Insight" and "My Board".

5. Component Breakdown

5.1 Chat Interface (Left Pane)

Message Bubbles: Distinct styling for User (dark bubble) and Agent (light bubble with icon).

Loading State: A "thinking" animation with text (e.g., "Agent computing...") while waiting for the backend.

Actionable Agent Messages: When the backend returns data, the agent's message should include a clickable "Mini Card" summarizing the result. Clicking this card updates the currentInsight state and sets mainMode to 'insight'.

Input Area: Sticky at the bottom, auto-resizing text area, "Send" button disabled while loading.

5.2 Canvas: Active Insight Mode (Right Pane - Default)

Tabs Navigation: Top bar toggles between three views:

Visualization (Chart): Renders the data using the charting library.

Data Table: Renders a clean HTML table of the raw JSON data.

SQL Code: Renders the SQL query with syntax highlighting and a "Copy" button.

Pin to Board Button: A prominent button. When clicked:

Takes the currentInsight and pushes it to the pinnedBoardItems array.

Shows a temporary toast notification ("Pinned to board!").

Disables/Changes state to "Pinned" to prevent duplicates.

5.3 Canvas: My Board Mode (Right Pane)

Header: Displays "My Board" and action buttons (Share, Refresh All).

Grid Layout: A CSS Grid or Masonry layout displaying cards for every item in pinnedBoardItems.

Insight Cards: Each card displays the title, the generated chart (or a KPI number), and a timestamp ("Asked 2 days ago").

6. API Integration Contract

The frontend expects to communicate with the existing backend via a single main endpoint.

POST /api/chat

Request Payload:

{
  "prompt": "Which ad campaign drove the highest ROAS?",
  "history": [] // Optional context
}


Expected Response Payload:

{
  "status": "success",
  "agent_message": "The 'Back to School 23' campaign was highly efficient...",
  "insight": {
    "title": "Top Campaigns by ROAS",
    "sql_query": "SELECT campaign_name, roas FROM ...",
    "columns": ["campaign_name", "roas"],
    "rows": [
      {"campaign_name": "Back to School 23", "roas": 4.2},
      {"campaign_name": "Summer Clearance", "roas": 3.6}
    ],
    "suggested_chart_type": "bar",
    "x_axis_key": "campaign_name",
    "y_axis_key": "roas"
  }
}


(Note for AI Developer: Build a mock API route or a mock service within the app that returns this payload structure with a 2-second delay to simulate the backend during local development).

7. Migration Strategy for Existing Repository (Instructions for Cursor)

Since we are applying this to an existing repository, follow these precise steps:

Audit & Clean: Analyze the existing codebase (pages, components, layouts). Identify what can be reused (e.g., API utilities, UI components like buttons) and what conflicts with this PRD. Move conflicting or deprecated page files into an _archive folder rather than deleting them immediately.

Dependency Check: Verify if tailwindcss, lucide-react, a charting library (like recharts), and a state manager (zustand) are installed. If not, inform the user to run the necessary npm install commands.

Layout Overhaul: Replace the main app/page.tsx (or pages/index.tsx) with the new h-screen overflow-hidden split-pane layout defined in Section 4.

State Setup: Implement Zustand or React Context with the global state definitions in Section 3. Hook this up to the new layout.

Component Integration: Build out the Chat (Left Pane) and Canvas (Right Pane) components step-by-step.

API Adaptation: Review any existing API calls in the repo. Adapt them to match the new POST /api/chat contract defined in Section 6. If the real backend is not ready, implement the mock delay service.

8. Local Setup Instructions (macOS)

Requires Node.js (v18+).

Package manager: npm or pnpm (use whatever the existing repo uses).

Run via npm run dev and view at http://localhost:3000.