# Archive — Vite + MUI Original

This folder holds files archived during **Step 1: Audit & Clean** of the PRD migration. These files conflict with the new architecture (Next.js, Tailwind, 2-pane layout) and were moved here rather than deleted so they can be referenced during later migration steps.

## What Was Archived

### Build system
- `vite-mui-original/vite.config.ts` — Replaced by Next.js
- `vite-mui-original/index.html` — Vite HTML entry; Next.js manages this

### Entry & layout
- `vite-mui-original/src/index.tsx` — Next.js has its own entry via `app/layout.tsx`
- `vite-mui-original/src/App.tsx` — 3-column MUI layout conflicts with PRD 2-pane
- `vite-mui-original/src/App.css` — Custom CSS design system; replaced by Tailwind
- `vite-mui-original/src/index.css` — Global body styles; Tailwind globals replace this

### Components (conflicting with PRD)
- `vite-mui-original/components/SidePanel.tsx` — Agent/session sidebar not in PRD
- `vite-mui-original/components/RightPanel.tsx` — Debug Events/Trace panel not in PRD
- `vite-mui-original/components/StoryPanel.tsx` — Replaced by Canvas (Active Insight / My Board)
- `vite-mui-original/components/Pinboard.tsx` — Replaced by "My Board" mode inside Canvas
- `vite-mui-original/components/TopBanner.tsx` — Different header needed for split-pane layout
- `vite-mui-original/components/ThemeSwitcher.tsx` — Theme switching not in PRD
- `vite-mui-original/components/CustomThemeDialog.tsx` — Custom theme dialog not in PRD

### Context
- `vite-mui-original/context/ThemeContext.tsx` — Theme system not in PRD

### Test / boilerplate
- `vite-mui-original/src/App.test.tsx`
- `vite-mui-original/src/setupTests.ts`
- `vite-mui-original/src/reportWebVitals.ts`
- `vite-mui-original/src/react-app-env.d.ts`

---

## Reusable Files (Left in `src/`)

These remain in the main codebase for use in later steps:

| Location | Purpose |
|----------|---------|
| `src/services/clientService.tsx` | HTTP client, streaming SSE handler; will be adapted to POST /api/chat |
| `src/utils/cardParser.ts` | Agent response parsing; will be adapted for PRD insight shape |
| `src/utils/ToastManager.ts` | Singleton toast notification pattern |
| `src/components/GlobalToast.tsx` | Toast UI; will be restyled with Tailwind |
| `src/components/DialogBox.tsx` | Reusable dialog; will be restyled with Tailwind |
| `src/components/ChatPanel.tsx` | Chat message history, input, auto-scroll; patterns for Left Pane |
| `src/context/SessionContext.tsx` | Session/message state patterns; will become Zustand store |
| `src/context/StoryContext.tsx` | Pin/unpin logic; pattern for pinnedBoardItems |
| `src/types/insight.ts` | TypeScript types; will be updated to match PRD schema |
